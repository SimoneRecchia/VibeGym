import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  Backend,
  BodyEntry,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  Exercise,
  HistoryExercise,
  HistoryExerciseSub,
  Plan,
  Profile,
  Session,
  Settings,
  Weight,
} from './types';
import {
  ensureSessionFields,
  findExercise,
  firstUncheckedIdx,
  getSerieFatte,
  getSerieTotali,
  isCompletato,
  isTimedReps,
  newSessionId,
  resolveFinalWeights,
} from './helpers';
import { haptic, setHapticsEnabled } from './haptics';
import {
  loadBackend,
  loadLocalMode,
  loadPlans,
  loadActiveScheda,
  loadProfile,
  loadSettings,
  loadBodyLog,
  loadLastWeightPrompt,
  savePlans,
  saveActiveScheda,
  saveBackend,
  saveLocalMode,
  saveProfile,
  saveSettings,
  saveBodyLog,
  saveLastWeightPrompt,
} from './storage';
import { normalizePlan } from './migrate';
import {
  clearTokenInfo,
  loadTokenInfo,
  saveTokenInfo,
  TokenInfo,
} from './github/auth';
import { getUser } from './github/api';
import {
  ensureRepo,
  pullAthlete,
  pullLibrary,
  pushAthlete,
  pushPlanAndSessions,
  setActiveScheda as setActiveSchedaRemote,
  RepoInfo,
} from './github/sync';

/** Insert or replace a plan in the library, matched by its stable id. */
const upsertPlan = (list: Plan[], p: Plan): Plan[] => {
  const i = list.findIndex(x => x.id === p.id);
  if (i === -1) return [...list, p];
  const copy = list.slice();
  copy[i] = p;
  return copy;
};

/**
 * Ensure an imported scheda gets an id that doesn't clash with an existing one.
 * The id is derived from the (mutable) name, so two schede named the same would
 * otherwise collide and overwrite each other — importing must never destroy an
 * existing scheda, so we suffix a fresh number on collision.
 */
const uniqueSchedaId = (base: string, list: Plan[]): string => {
  const ids = new Set(list.map(p => p.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

/** ms in a day, for the weight-reminder cadence. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether the periodic weight reminder should fire, given cadence + last time. */
const isWeightPromptDue = (days: number, lastIso: string | null): boolean => {
  if (!days || days <= 0) return false;
  if (!lastIso) return true;
  const last = new Date(lastIso).getTime();
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= days * DAY_MS;
};

export type TimerPhase = 'rest' | 'work';

export interface TimerState {
  active: boolean;
  finished: boolean;
  remaining: number;
  total: number;
  phase: TimerPhase;
  label: string;
  exId: string | null;
  exName: string;
  subText: string;
  next: null | {
    sec: number;
    label: string;
    exName: string;
    subText: string;
    exId: string;
  };
  markExId: string | null;
  markSetIdx: number | null;
  expanded: boolean;
}

const initialTimer: TimerState = {
  active: false,
  finished: false,
  remaining: 0,
  total: 0,
  phase: 'rest',
  label: 'Recupero',
  exId: null,
  exName: '',
  subText: '',
  next: null,
  markExId: null,
  markSetIdx: null,
  expanded: false,
};

export interface GitHubStatus {
  token: TokenInfo | null;
  repo: RepoInfo | null;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

interface StoreCtx {
  plan: Plan | null;
  /** Commit a plan as the active scheda; returns the stored plan (id may be
   *  reassigned to stay unique in the library), or null when clearing. */
  setPlan: (plan: Plan | null, persist?: boolean) => Plan | null;
  /** All saved schede (the active one included). Importing adds, never replaces. */
  plans: Plan[];
  /** Slug of the active scheda, or null if none chosen. */
  activeSchedaId: string | null;
  /** Make an existing scheda the active one. */
  setActiveScheda: (id: string) => void;
  /** Remove a scheda from the library (locally). */
  deleteScheda: (id: string) => void;
  hydrating: boolean;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;

  /* Profile + persistence mode */
  profile: Profile;
  setProfile: (patch: Partial<Profile>) => void;
  /** Canonical backend choice: 'local' | 'cloud' | null (not chosen yet). */
  backend: Backend;
  /** Convenience: true when backend === 'local'. */
  localMode: boolean;
  /** Commit to local-only saving (this device). */
  enableLocalMode: () => void;

  /* Body metrics (independent of any scheda) */
  bodyLog: BodyEntry[];
  /** Append a weigh-in (also marks the reminder as satisfied). */
  logWeight: (weightKg: number) => void;
  /** True when the periodic weight reminder is due to be shown. */
  weightPromptDue: boolean;
  /** Snooze the weight reminder without logging (resets the cadence). */
  dismissWeightPrompt: () => void;

  currentDayId: string | null;
  setCurrentDayId: (id: string | null) => void;
  startDay: (id: string) => void;
  toggleSet: (exId: string, idx: number) => void;
  setNote: (exId: string, val: string) => void;
  setWeightForSet: (exId: string, subId: string | null, idx: number, value: Weight | null) => void;
  startExerciseTimer: (exId: string) => void;
  timer: TimerState;
  expandTimer: () => void;
  collapseTimer: () => void;
  addTimerSeconds: (delta: number) => void;
  stopTimer: () => void;
  finishWorkout: () => Session | null;
  resetProgress: () => void;
  disconnectPlan: () => void;
  importPlan: (raw: string) => { ok: boolean; error?: string };
  exportPlanJSON: () => string | null;
  toast: string | null;
  showToast: (m: string) => void;

  /* GitHub sync */
  github: GitHubStatus;
  connectWithPAT: (token: string) => Promise<{ ok: boolean; error?: string }>;
  saveDeviceFlowToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Connect the cloud and upload the existing local plan + ALL its history in
   * one go (guest → cloud upgrade). Only flips backend to 'cloud' if the upload
   * succeeds, so a failed sync never leaves the user believing they're backed up.
   */
  migrateLocalToCloud: (
    token: string,
    kind?: 'oauth' | 'pat'
  ) => Promise<{ ok: boolean; error?: string }>;
  disconnectGitHub: () => Promise<void>;
  syncNow: (opts?: {
    silent?: boolean;
    markActive?: boolean;
    message?: string;
    /** Push this exact plan instead of the active one (avoids stale closures). */
    plan?: Plan;
  }) => Promise<{ ok: boolean; error?: string }>;
  pullFromGitHub: () => Promise<{ ok: boolean; error?: string }>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<Plan | null>(null);
  // Scheda library: `plan` is the active one; `plans` holds them all and is what
  // gets persisted. The active plan is mirrored into `plans` whenever it changes.
  const [plans, setPlansState] = useState<Plan[]>([]);
  const [activeSchedaId, setActiveSchedaIdState] = useState<string | null>(null);
  const plansRef = useRef<Plan[]>(plans);
  plansRef.current = plans;
  const activeSchedaIdRef = useRef<string | null>(activeSchedaId);
  activeSchedaIdRef.current = activeSchedaId;
  // Body metrics (weight over time), independent of any scheda.
  const [bodyLog, setBodyLogState] = useState<BodyEntry[]>([]);
  const [weightPromptDue, setWeightPromptDue] = useState(false);
  const lastWeightPromptRef = useRef<string | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [settings, setSettingsState] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [profile, setProfileState] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [backend, setBackendState] = useState<Backend>(null);
  // localMode is derived — kept in the public surface for existing callers.
  const localMode = backend === 'local';
  // Synchronous mirror so finishWorkout / the auto-push effect read a fresh
  // value without stale-closure bugs (same pattern as githubRef below).
  const backendRef = useRef<Backend>(backend);
  backendRef.current = backend;
  const [currentDayId, setCurrentDayId] = useState<string | null>(null);
  const [timer, setTimer] = useState<TimerState>(initialTimer);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [github, setGithub] = useState<GitHubStatus>({
    token: null,
    repo: null,
    syncing: false,
    lastSyncAt: null,
    error: null,
  });
  const githubRef = useRef(github);
  githubRef.current = github;

  // Tracks the last session id we auto-pushed, so the effect below doesn't
  // re-push it. migrateLocalToCloud primes this after its bulk upload.
  const lastSyncedSessionRef = useRef<string | null>(null);

  // The timer uses wall-clock time, not setInterval ticks, so it stays correct
  // even if JS is paused (e.g. when the app is backgrounded). When the user
  // returns we re-render based on the absolute end time stored here.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef<number | null>(null);
  const totalRef = useRef<number>(0);
  const lastTickWarnRef = useRef<number>(-1);

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      const [libRaw, s, t, prof, storedBackend, legacyLocalMode, storedActive, body, lastWeightPrompt] =
        await Promise.all([
          loadPlans(),
          loadSettings(),
          loadTokenInfo(),
          loadProfile(),
          loadBackend(),
          loadLocalMode(),
          loadActiveScheda(),
          loadBodyLog(),
          loadLastWeightPrompt(),
        ]);
      const library = libRaw ?? [];
      const active = library.find(pl => pl.id === storedActive) ?? library[0] ?? null;
      setPlansState(library);
      setActiveSchedaIdState(active?.id ?? null);
      if (active) setPlanState(active);
      setBodyLogState(body);
      lastWeightPromptRef.current = lastWeightPrompt;
      setWeightPromptDue(isWeightPromptDue(s.weightReminderDays, lastWeightPrompt));
      setSettingsState(s);
      setProfileState(prof);
      // Derive the backend. A live token is authoritative (token ⇒ cloud);
      // then the explicit stored choice; then the legacy local-mode flag.
      let resolvedBackend: Backend;
      if (t) resolvedBackend = 'cloud';
      else if (storedBackend) resolvedBackend = storedBackend;
      else if (legacyLocalMode) resolvedBackend = 'local';
      else resolvedBackend = null;
      setBackendState(resolvedBackend);
      // Forward-migrate the flag so future loads read the canonical key.
      if (!storedBackend && resolvedBackend) saveBackend(resolvedBackend);
      setHapticsEnabled(s.haptic);
      if (t) {
        setGithub(prev => ({
          ...prev,
          token: t,
          repo:
            t.repo && t.login
              ? {
                  owner: t.login,
                  repo: t.repo.split('/')[1] ?? t.repo,
                  branch: 'main', // refreshed on next sync
                  htmlUrl: `https://github.com/${t.repo}`,
                }
              : null,
        }));
      }
      setHydrating(false);
    })();
  }, []);

  // Mirror the active plan into the library so its progress/history stays fresh
  // in the persisted set. All the existing actions mutate `plan`; this keeps the
  // library entry for the active id in sync without rewriting those actions.
  useEffect(() => {
    if (hydrating || !plan) return;
    setPlansState(prev => upsertPlan(prev, plan));
  }, [plan, hydrating]);

  // Persist the library and the active-scheda pointer.
  useEffect(() => {
    if (hydrating) return;
    savePlans(plans);
  }, [plans, hydrating]);

  useEffect(() => {
    if (hydrating) return;
    saveActiveScheda(activeSchedaId);
  }, [activeSchedaId, hydrating]);

  // Persist body metrics.
  useEffect(() => {
    if (hydrating) return;
    saveBodyLog(bodyLog);
  }, [bodyLog, hydrating]);

  // Persist settings
  useEffect(() => {
    if (hydrating) return;
    saveSettings(settings);
    setHapticsEnabled(settings.haptic);
  }, [settings, hydrating]);

  // Persist profile
  useEffect(() => {
    if (hydrating) return;
    saveProfile(profile);
  }, [profile, hydrating]);

  // Recompute the weight reminder when its cadence changes.
  useEffect(() => {
    if (hydrating) return;
    setWeightPromptDue(isWeightPromptDue(settings.weightReminderDays, lastWeightPromptRef.current));
  }, [settings.weightReminderDays, hydrating]);

  // Re-check the reminder when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st: AppStateStatus) => {
      if (st === 'active') {
        setWeightPromptDue(
          isWeightPromptDue(settings.weightReminderDays, lastWeightPromptRef.current)
        );
      }
    });
    return () => sub.remove();
  }, [settings.weightReminderDays]);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setProfileState(prev => ({ ...prev, ...patch }));
  }, []);

  const enableLocalMode = useCallback(() => {
    setBackendState('local');
    saveBackend('local');
    saveLocalMode(true); // keep the legacy flag in sync for older reads
  }, []);

  const setPlan = useCallback((p: Plan | null, _persist = true): Plan | null => {
    if (!p) {
      setPlanState(null);
      return null;
    }
    // Importing adds to the library and never overwrites a *different* scheda:
    // if this id already belongs to another plan, give the import a fresh id.
    const clash = plansRef.current.some(x => x.id === p.id);
    const plan = clash ? { ...p, id: uniqueSchedaId(p.id, plansRef.current) } : p;
    setPlanState(plan);
    // Makes it the active scheda; the mirror effect upserts it into the library.
    setActiveSchedaIdState(plan.id);
    return plan;
  }, []);

  const setSetting = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettingsState(prev => ({ ...prev, [k]: v }));
  }, []);

  const updatePlan = useCallback((mutator: (p: Plan) => void) => {
    setPlanState(prev => {
      if (!prev) return prev;
      const next: Plan = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });
  }, []);

  const startDay = useCallback(
    (id: string) => {
      setPlanState(prev => {
        if (!prev) return prev;
        const next: Plan = JSON.parse(JSON.stringify(prev));
        ensureSessionFields(next, id);
        return next;
      });
      setCurrentDayId(id);
      haptic('light');
    },
    []
  );

  const toggleSet = useCallback(
    (exId: string, idx: number) => {
      updatePlan(p => {
        const ex = findExercise(p, exId);
        if (!ex) return;
        const n = getSerieTotali(ex);
        if (!Array.isArray(ex._serie_stato)) ex._serie_stato = new Array(n).fill(false);
        ex._serie_stato[idx] = !ex._serie_stato[idx];
        if (ex._serie_stato[idx]) {
          haptic('light');
          if (isCompletato(ex)) haptic('success');
        }
      });
    },
    [updatePlan]
  );

  const setNote = useCallback(
    (exId: string, val: string) => {
      updatePlan(p => {
        const ex = findExercise(p, exId);
        if (ex) ex._note_utente = val;
      });
    },
    [updatePlan]
  );

  const setWeightForSet = useCallback(
    (exId: string, subId: string | null, idx: number, value: Weight | null) => {
      updatePlan(p => {
        const ex = findExercise(p, exId);
        if (!ex) return;
        const target: Exercise | import('./types').ExerciseSub | undefined = subId
          ? ex.esercizi?.find(s => s.id === subId)
          : ex;
        if (!target) return;
        const n = (target as Exercise).serie ?? getSerieTotali(ex);
        if (!Array.isArray(target._pesi_serie)) {
          target._pesi_serie = new Array(n).fill(null);
        }
        target._pesi_serie[idx] = value;
      });
      haptic('light');
    },
    [updatePlan]
  );

  /* ------------------------------------------------------------------ */
  /*  TIMER                                                             */
  /* ------------------------------------------------------------------ */

  const clearTickInterval = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const tick = useCallback(() => {
    if (endAtRef.current == null) return;
    const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
    setTimer(t => {
      if (!t.active) return t;
      // Countdown warning beep/haptic for last 3s — fire once per second
      if (
        settings.countdownWarn &&
        remaining > 0 &&
        remaining <= 3 &&
        lastTickWarnRef.current !== remaining
      ) {
        lastTickWarnRef.current = remaining;
        haptic('light');
      }
      if (remaining <= 0) {
        // End of phase — defer to avoid setState-within-setState
        Promise.resolve().then(() => onTimerEndRef.current?.());
      }
      return { ...t, remaining };
    });
  }, [settings.countdownWarn]);

  const onTimerEndRef = useRef<(() => void) | null>(null);

  const stopTimer = useCallback(() => {
    clearTickInterval();
    endAtRef.current = null;
    lastTickWarnRef.current = -1;
    setTimer(initialTimer);
  }, []);

  const startTimerInternal = useCallback(
    (
      seconds: number,
      exName: string,
      subText: string,
      exId: string | null,
      opts?: {
        phase?: TimerPhase;
        label?: string;
        next?: TimerState['next'];
        markExId?: string | null;
        markSetIdx?: number | null;
      }
    ) => {
      clearTickInterval();
      const total = seconds;
      const endAt = Date.now() + seconds * 1000;
      endAtRef.current = endAt;
      totalRef.current = total;
      lastTickWarnRef.current = -1;

      setTimer({
        active: true,
        finished: false,
        remaining: total,
        total,
        phase: opts?.phase ?? 'rest',
        label: opts?.label ?? 'Recupero',
        exId,
        exName,
        subText,
        next: opts?.next ?? null,
        markExId: opts?.markExId ?? null,
        markSetIdx: opts?.markSetIdx ?? null,
        expanded: settings.autoExpandTimer,
      });

      tickRef.current = setInterval(tick, 250);
    },
    [tick, settings.autoExpandTimer]
  );

  const onTimerEnd = useCallback(() => {
    setTimer(t => {
      // Mark a set done if this was a "work" phase tied to a set index
      if (t.markExId && t.markSetIdx !== null && t.markSetIdx !== undefined) {
        const exId = t.markExId;
        const idx = t.markSetIdx;
        updatePlan(p => {
          const ex = findExercise(p, exId);
          if (!ex) return;
          const n = getSerieTotali(ex);
          if (!Array.isArray(ex._serie_stato)) ex._serie_stato = new Array(n).fill(false);
          ex._serie_stato[idx] = true;
        });
      }

      if (t.phase === 'work' && t.next) {
        // Chain into the rest phase
        const n = t.next;
        haptic('done');
        // Defer to avoid setState inside setState
        setTimeout(() => {
          startTimerInternal(n.sec, n.exName, n.subText, n.exId, {
            phase: 'rest',
            label: n.label,
          });
        }, 0);
        return t;
      }

      // Rest finished → mark finished, auto-close after a beat
      haptic('done');
      clearTickInterval();
      endAtRef.current = null;
      const finished: TimerState = {
        ...t,
        active: true,
        finished: true,
        remaining: 0,
      };
      setTimeout(() => {
        setTimer(curr => (curr.finished ? initialTimer : curr));
      }, 4000);
      return finished;
    });
  }, [startTimerInternal, updatePlan]);

  onTimerEndRef.current = onTimerEnd;

  // Re-sync timer when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && endAtRef.current) {
        tick();
      }
    });
    return () => sub.remove();
  }, [tick]);

  useEffect(() => () => clearTickInterval(), []);

  const startExerciseTimer = useCallback(
    (exId: string) => {
      setPlanState(prev => {
        if (!prev) return prev;
        const next: Plan = JSON.parse(JSON.stringify(prev));
        const ex = findExercise(next, exId);
        if (!ex) return prev;
        const total = getSerieTotali(ex);
        if (!Array.isArray(ex._serie_stato)) ex._serie_stato = new Array(total).fill(false);
        const first = firstUncheckedIdx(ex);
        if (first === -1) return prev;
        haptic('medium');
        const subText = `Serie ${first + 1} di ${total}`;
        const isLast = first === total - 1;
        const skipRest = isLast && settings.skipLastRest;

        if (isTimedReps(ex.reps)) {
          const workSec = ex.reps.sec;
          // timed exercise: work then rest
          const nextOpt = skipRest
            ? null
            : {
                sec: ex.recupero_sec,
                label: 'Recupero',
                exName: ex.nome,
                subText,
                exId,
              };
          setTimeout(() => {
            startTimerInternal(workSec, ex.nome, subText, exId, {
              phase: 'work',
              label: 'Esercizio',
              next: nextOpt,
              markExId: exId,
              markSetIdx: first,
            });
          }, 0);
        } else {
          // Mark set immediately, start rest (or skip if configured)
          ex._serie_stato[first] = true;
          if (skipRest) {
            haptic('success');
          } else {
            setTimeout(() => {
              startTimerInternal(ex.recupero_sec, ex.nome, subText, exId);
            }, 0);
          }
        }
        return next;
      });
    },
    [settings.skipLastRest, startTimerInternal]
  );

  const expandTimer = useCallback(() => setTimer(t => ({ ...t, expanded: true })), []);
  const collapseTimer = useCallback(() => setTimer(t => ({ ...t, expanded: false })), []);

  const addTimerSeconds = useCallback(
    (delta: number) => {
      if (endAtRef.current == null) return;
      endAtRef.current = endAtRef.current + delta * 1000;
      const remaining = Math.max(1, Math.round((endAtRef.current - Date.now()) / 1000));
      totalRef.current = Math.max(totalRef.current, remaining);
      setTimer(t => ({ ...t, remaining, total: Math.max(t.total, remaining) }));
      haptic('light');
    },
    []
  );

  /* ------------------------------------------------------------------ */
  /*  WORKOUT LIFECYCLE                                                 */
  /* ------------------------------------------------------------------ */

  const finishWorkout = useCallback((): Session | null => {
    if (!plan || !currentDayId) return null;
    const day = plan.giorni.find(g => g.id === currentDayId);
    if (!day) return null;

    const nowIso = new Date().toISOString();
    const snapshot: Session = {
      id: newSessionId(),
      data: nowIso,
      giorno_id: day.id,
      giorno_nome: day.nome,
      giorno_colore: day.colore,
      esercizi: day.esercizi.map(ex => {
        const tot = getSerieTotali(ex);
        const base: HistoryExercise = {
          id: ex.id,
          nome: ex.nome,
          serie_totali: tot,
          serie_fatte: getSerieFatte(ex),
          serie_stato: (ex._serie_stato ?? []).slice(),
          completato: isCompletato(ex),
          reps: ex.tipo === 'superset' ? undefined : ex.reps,
          peso_scheda: ex.peso_suggerito,
          pesi_serie: ex.tipo === 'superset' ? [] : resolveFinalWeights(ex, tot),
          ripetizioni_serie: ex._ripetizioni_serie?.slice(),
          note: ex._note_utente ?? '',
        };
        if (ex.tipo === 'superset' && ex.esercizi) {
          base.tipo = 'superset';
          base.sub_esercizi = ex.esercizi.map<HistoryExerciseSub>(sub => ({
            id: sub.id,
            nome: sub.nome,
            serie: sub.serie,
            reps: sub.reps,
            peso_scheda: sub.peso_suggerito,
            pesi_serie: resolveFinalWeights(sub, sub.serie),
          }));
        }
        return base;
      }),
    };

    // Both backends keep the full immutable history now: every completed
    // session is appended to `storico`, so trends/charts/tracking work the same
    // whether the user saves locally or in the cloud. The live day is then
    // reset for its next run (no destructive in-place weight folding — "what did
    // I lift last time" comes from history, identically in both modes).
    setPlanState(prev => {
      if (!prev) return prev;
      const next: Plan = JSON.parse(JSON.stringify(prev));
      if (!next.storico) next.storico = [];
      next.storico.push(snapshot);
      const targetDay = next.giorni.find(g => g.id === day.id);
      if (targetDay) {
        for (const ex of targetDay.esercizi) {
          const n = getSerieTotali(ex);
          ex._serie_stato = new Array(n).fill(false);
          ex._note_utente = '';
          ex._pesi_serie = new Array(n).fill(null);
          if (ex.tipo === 'superset' && ex.esercizi) {
            for (const sub of ex.esercizi) sub._pesi_serie = new Array(sub.serie).fill(null);
          }
        }
      }
      return next;
    });
    haptic('done');
    // Caller is responsible for navigating home and clearing currentDayId once
    // any celebration UI dismisses — that avoids the workout screen briefly
    // showing its empty fallback behind the modal.
    return snapshot;
  }, [plan, currentDayId]);

  const resetProgress = useCallback(() => {
    updatePlan(p => {
      for (const g of p.giorni) {
        for (const ex of g.esercizi) {
          const n = getSerieTotali(ex);
          ex._serie_stato = new Array(n).fill(false);
          ex._note_utente = '';
          ex._pesi_serie = new Array(n).fill(null);
          if (ex.tipo === 'superset' && ex.esercizi) {
            for (const sub of ex.esercizi) sub._pesi_serie = new Array(sub.serie).fill(null);
          }
        }
      }
    });
    showToast('Progressi azzerati');
    haptic('light');
  }, [updatePlan]);

  /* ------------------------------------------------------------------ */
  /*  SCHEDA LIBRARY                                                    */
  /* ------------------------------------------------------------------ */

  const setActiveScheda = useCallback((id: string) => {
    const target = plansRef.current.find(p => p.id === id);
    if (!target) return;
    setPlanState(target);
    setActiveSchedaIdState(id);
    setCurrentDayId(null);
    haptic('light');
    // Cloud: repoint active.json so other devices pick up the switch.
    const gh = githubRef.current;
    if (backendRef.current === 'cloud' && gh.token && gh.repo) {
      setActiveSchedaRemote(gh.token, gh.repo, id).catch(() => {});
    }
  }, []);

  const deleteScheda = useCallback((id: string) => {
    const remaining = plansRef.current.filter(p => p.id !== id);
    setPlansState(remaining);
    if (activeSchedaIdRef.current === id) {
      const nextActive = remaining[0] ?? null;
      setPlanState(nextActive);
      setActiveSchedaIdState(nextActive?.id ?? null);
      setCurrentDayId(null);
      // Cloud: repoint active.json (the folder itself is left on the remote).
      const gh = githubRef.current;
      if (backendRef.current === 'cloud' && gh.token && gh.repo && nextActive) {
        setActiveSchedaRemote(gh.token, gh.repo, nextActive.id).catch(() => {});
      }
    }
    showToast('Scheda rimossa');
  }, []);

  /* ------------------------------------------------------------------ */
  /*  BODY METRICS                                                      */
  /* ------------------------------------------------------------------ */

  const logWeight = useCallback((weightKg: number) => {
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    const nowIso = new Date().toISOString();
    setBodyLogState(prev => [...prev, { date: nowIso, weightKg }]);
    // Keep the profile's "current" weight in step with the latest weigh-in.
    setProfileState(prev => ({ ...prev, weightKg }));
    lastWeightPromptRef.current = nowIso;
    saveLastWeightPrompt(nowIso);
    setWeightPromptDue(false);
    haptic('success');
  }, []);

  const dismissWeightPrompt = useCallback(() => {
    const nowIso = new Date().toISOString();
    lastWeightPromptRef.current = nowIso;
    saveLastWeightPrompt(nowIso);
    setWeightPromptDue(false);
  }, []);

  const disconnectPlan = useCallback(() => {
    const id = activeSchedaIdRef.current;
    if (id) deleteScheda(id);
    else setPlanState(null);
  }, [deleteScheda]);

  const importPlan = useCallback((raw: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizePlan(parsed);
      if (!normalized.giorni.length) {
        return { ok: false, error: 'Formato non valido: nessun giorno trovato' };
      }
      setPlanState(normalized);
      showToast('Scheda importata');
      haptic('success');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const exportPlanJSON = useCallback((): string | null => {
    if (!plan) return null;
    return JSON.stringify(plan, null, 2);
  }, [plan]);

  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  GITHUB                                                            */
  /* ------------------------------------------------------------------ */

  const persistGitHub = useCallback(async (next: GitHubStatus) => {
    if (next.token) {
      await saveTokenInfo({
        ...next.token,
        repo: next.repo ? `${next.repo.owner}/${next.repo.repo}` : next.token.repo,
        login: next.repo?.owner ?? next.token.login,
      });
    }
  }, []);

  const adoptToken = useCallback(
    async (
      raw: string,
      kind: 'oauth' | 'pat'
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        setGithub(g => ({ ...g, syncing: true, error: null }));
        const user = await getUser(raw);
        const tok: TokenInfo = {
          token: raw,
          kind,
          login: user.login,
          name: user.name,
          avatarUrl: user.avatar_url,
        };
        const repo = await ensureRepo(tok);
        const next: GitHubStatus = {
          token: { ...tok, repo: `${repo.owner}/${repo.repo}` },
          repo,
          syncing: false,
          lastSyncAt: null,
          error: null,
        };
        setGithub(next);
        // Update the ref synchronously too: callers that chain a syncNow right
        // after (e.g. migrateLocalToCloud) read githubRef.current before React
        // has a chance to re-render, and would otherwise see stale null state.
        githubRef.current = next;
        await persistGitHub(next);
        showToast(`Collegato come @${user.login}`);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setGithub(g => ({ ...g, syncing: false, error: msg }));
        return { ok: false, error: msg };
      }
    },
    [persistGitHub, showToast]
  );

  const disconnectGitHub = useCallback(async () => {
    await clearTokenInfo();
    setGithub({
      token: null,
      repo: null,
      syncing: false,
      lastSyncAt: null,
      error: null,
    });
    // Fall back to local saving — the plan + full history stay on the device
    // (untouched in vibegym_plan_v2). Not null, so the user keeps a working app.
    setBackendState('local');
    saveBackend('local');
    saveLocalMode(true);
    showToast('Cloud scollegato — dati salvati su questo telefono');
  }, [showToast]);

  const syncNow = useCallback(
    async (
      opts?: { silent?: boolean; markActive?: boolean; message?: string; plan?: Plan }
    ): Promise<{ ok: boolean; error?: string }> => {
      const state = githubRef.current;
      const target = opts?.plan ?? plan;
      if (!state.token || !state.repo || !target) {
        return { ok: false, error: 'GitHub non collegato' };
      }
      try {
        setGithub(g => ({ ...g, syncing: true, error: null }));
        const count = await pushPlanAndSessions(state.token, state.repo, target, {
          markActive: opts?.markActive,
          message: opts?.message,
        });
        const lastSyncAt = new Date().toISOString();
        setGithub(g => ({ ...g, syncing: false, lastSyncAt }));
        if (!opts?.silent) showToast(`Sincronizzato (${count} file)`);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setGithub(g => ({ ...g, syncing: false, error: msg }));
        if (!opts?.silent) showToast(`Sync fallita: ${msg}`);
        return { ok: false, error: msg };
      }
    },
    [plan, showToast]
  );

  const pullFromGitHub = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const state = githubRef.current;
    if (!state.token || !state.repo) {
      return { ok: false, error: 'GitHub non collegato' };
    }
    try {
      setGithub(g => ({ ...g, syncing: true, error: null }));
      const [{ plans: remotePlans, activeId }, athlete] = await Promise.all([
        pullLibrary(state.token, state.repo),
        pullAthlete(state.token, state.repo),
      ]);
      if (!remotePlans.length) {
        setGithub(g => ({ ...g, syncing: false }));
        return { ok: false, error: 'Nessuna scheda remota trovata' };
      }
      // Merge by id: remote wins for shared ids, but local-only schede are kept
      // (a pull must not wipe a scheda that hasn't been uploaded yet).
      setPlansState(prev => {
        const merged = prev.slice();
        for (const rp of remotePlans) {
          const i = merged.findIndex(x => x.id === rp.id);
          if (i === -1) merged.push(rp);
          else merged[i] = rp;
        }
        return merged;
      });
      const active = remotePlans.find(p => p.id === activeId) ?? remotePlans[0];
      setActiveSchedaIdState(active.id);
      setPlanState(active);
      if (athlete.profile) setProfileState(athlete.profile);
      if (athlete.bodyLog.length) setBodyLogState(athlete.bodyLog);
      const lastSyncAt = new Date().toISOString();
      setGithub(g => ({ ...g, syncing: false, lastSyncAt }));
      showToast('Dati scaricati da GitHub');
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setGithub(g => ({ ...g, syncing: false, error: msg }));
      return { ok: false, error: msg };
    }
  }, [showToast]);

  const migrateLocalToCloud = useCallback(
    async (
      token: string,
      kind: 'oauth' | 'pat' = 'pat'
    ): Promise<{ ok: boolean; error?: string }> => {
      // 1. Connect + ensure the data repo exists (sets github.token/repo).
      const adopt = await adoptToken(token.trim(), kind);
      if (!adopt.ok) return adopt;

      // 2. Upload the existing local plan + ALL its sessions in one commit.
      //    On a fresh repo every session is "new", so pushPlanAndSessions
      //    uploads the whole history; markActive writes active.json too.
      if (plan) {
        const hist = plan.storico ?? [];
        const res = await syncNow({
          markActive: true,
          message: `import: ${plan.nome_scheda ?? plan.id} + ${hist.length} sessioni (da locale)`,
        });
        if (!res.ok) {
          // Connected but upload failed — stay 'local' so we never claim the
          // data is safely in the cloud when it isn't. The token stays adopted
          // so a retry is one tap away.
          return { ok: false, error: res.error ?? 'Upload fallito' };
        }
        // Prevent the auto-push effect from re-pushing the same last session.
        const last = hist[hist.length - 1];
        if (last) lastSyncedSessionRef.current = last.id;
      }

      // 2b. Push any OTHER local schede + the athlete data (profile + body log),
      //     so a first cloud connect uploads the whole library, not just the
      //     active scheda. Best-effort: the active plan + backend flip already
      //     succeeded above.
      const gh = githubRef.current;
      if (gh.token && gh.repo) {
        for (const pl of plansRef.current) {
          if (pl.id === activeSchedaIdRef.current) continue;
          try {
            await pushPlanAndSessions(gh.token, gh.repo, pl, {
              message: `import: ${pl.nome_scheda ?? pl.id} (da locale)`,
            });
          } catch {
            /* best-effort */
          }
        }
        try {
          await pushAthlete(gh.token, gh.repo, profile, bodyLog);
        } catch {
          /* best-effort */
        }
      }

      // 3. Only now commit to the cloud backend.
      setBackendState('cloud');
      saveBackend('cloud');
      return { ok: true };
    },
    [adoptToken, plan, syncNow, profile, bodyLog]
  );

  // The plain "connect" paths route through migrateLocalToCloud so connecting
  // always (a) uploads any existing local history and (b) flips backend to
  // 'cloud' — enabling auto-push in the same session. With no local plan it just
  // adopts the token and switches to cloud.
  const connectWithPAT = useCallback(
    (token: string) => migrateLocalToCloud(token.trim(), 'pat'),
    [migrateLocalToCloud]
  );

  const saveDeviceFlowToken = useCallback(
    (token: string) => migrateLocalToCloud(token, 'oauth'),
    [migrateLocalToCloud]
  );

  // Auto-push after a successful workout finish — single, descriptive commit.
  useEffect(() => {
    if (hydrating) return;
    if (backendRef.current !== 'cloud') return; // local mode never auto-pushes
    if (!github.token || !github.repo || !plan) return;
    const hist = plan.storico ?? [];
    const last = hist[hist.length - 1];
    if (!last) return;
    if (lastSyncedSessionRef.current === last.id) return;
    lastSyncedSessionRef.current = last.id;
    const fatti = last.esercizi.filter(e => e.completato).length;
    const tot = last.esercizi.length;
    syncNow({
      silent: true,
      message: `session: ${last.giorno_nome} — ${fatti}/${tot} ✓`,
    }).catch(() => {});
  }, [plan, github.token, github.repo, hydrating, syncNow, backend]);

  // Push profile + body metrics to the cloud (debounced so rapid profile edits
  // coalesce into one commit). Independent of any scheda.
  useEffect(() => {
    if (hydrating) return;
    if (backendRef.current !== 'cloud') return;
    const gh = githubRef.current;
    if (!gh.token || !gh.repo) return;
    const h = setTimeout(() => {
      const g = githubRef.current;
      if (g.token && g.repo) pushAthlete(g.token, g.repo, profile, bodyLog).catch(() => {});
    }, 3000);
    return () => clearTimeout(h);
  }, [profile, bodyLog, hydrating, backend]);

  const value = useMemo<StoreCtx>(
    () => ({
      plan,
      setPlan,
      plans,
      activeSchedaId,
      setActiveScheda,
      deleteScheda,
      hydrating,
      settings,
      setSetting,
      profile,
      setProfile,
      backend,
      localMode,
      enableLocalMode,
      bodyLog,
      logWeight,
      weightPromptDue,
      dismissWeightPrompt,
      currentDayId,
      setCurrentDayId,
      startDay,
      toggleSet,
      setNote,
      setWeightForSet,
      startExerciseTimer,
      timer,
      expandTimer,
      collapseTimer,
      addTimerSeconds,
      stopTimer,
      finishWorkout,
      resetProgress,
      disconnectPlan,
      importPlan,
      exportPlanJSON,
      toast,
      showToast,
      github,
      connectWithPAT,
      saveDeviceFlowToken,
      migrateLocalToCloud,
      disconnectGitHub,
      syncNow,
      pullFromGitHub,
    }),
    [
      plan,
      setPlan,
      plans,
      activeSchedaId,
      setActiveScheda,
      deleteScheda,
      hydrating,
      settings,
      setSetting,
      profile,
      setProfile,
      backend,
      localMode,
      enableLocalMode,
      bodyLog,
      logWeight,
      weightPromptDue,
      dismissWeightPrompt,
      currentDayId,
      startDay,
      toggleSet,
      setNote,
      setWeightForSet,
      startExerciseTimer,
      timer,
      expandTimer,
      collapseTimer,
      addTimerSeconds,
      stopTimer,
      finishWorkout,
      resetProgress,
      disconnectPlan,
      importPlan,
      exportPlanJSON,
      toast,
      showToast,
      github,
      connectWithPAT,
      saveDeviceFlowToken,
      migrateLocalToCloud,
      disconnectGitHub,
      syncNow,
      pullFromGitHub,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
