import { Exercise, ExerciseSub, Plan, Reps, Session, Weight } from './types';
import { formatReps, formatWeight, weightInKg } from './format';

// Re-export the time-based rep helpers so existing importers keep working.
export { isTimedReps, repsToSeconds } from './format';

export const getSerieTotali = (ex: Exercise): number => {
  if (ex.tipo === 'superset') return ex.esercizi?.[0]?.serie ?? 3;
  return ex.serie ?? 0;
};

/**
 * Progression: fold the weights actually logged this session back into the
 * card's per-set defaults, so next time the card suggests what you *last
 * lifted* — per set — instead of the original plan weight.
 *
 * Only sets that were actually logged this session overwrite their default;
 * untouched sets keep their previous default (made a change → it sticks; made
 * none → stays the same). Runs in both GitHub and local mode.
 */
export const carrySessionWeights = (ex: Exercise): void => {
  const apply = (t: Exercise | ExerciseSub, n: number) => {
    const overrides = t._pesi_serie ?? [];
    if (!overrides.some(w => w != null)) return; // nothing logged → keep defaults
    const next = Array.from({ length: n }, (_, i) => overrides[i] ?? t.pesi_default?.[i] ?? null);
    t.pesi_default = next;
    // Keep peso_suggerito pointing at the last logged weight for charts/back-compat.
    const lastLogged = overrides.filter((w): w is Weight => w != null).pop();
    if (lastLogged) t.peso_suggerito = lastLogged;
  };
  if (ex.tipo === 'superset' && ex.esercizi) ex.esercizi.forEach(s => apply(s, s.serie));
  else apply(ex, getSerieTotali(ex));
};

export const getSerieFatte = (ex: Exercise): number =>
  (ex._serie_stato ?? []).filter(Boolean).length;

export const isCompletato = (ex: Exercise): boolean => {
  const tot = getSerieTotali(ex);
  return tot > 0 && getSerieFatte(ex) >= tot;
};

export const firstUncheckedIdx = (ex: Exercise): number => {
  const s = ex._serie_stato ?? [];
  for (let i = 0; i < s.length; i++) if (!s[i]) return i;
  return -1;
};

export const formatSec = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r === 0 ? `${m}m` : `${m}m${r}s`;
};

export const formatMMSS = (sec: number): string => {
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1) + '…' : s;

export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'Buonanotte';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
};

export const estimateDurationMin = (day: { esercizi: Exercise[]; cardio?: { durata_min: number } }): number => {
  let sec = 0;
  for (const ex of day.esercizi) {
    const s = getSerieTotali(ex);
    sec += s * ((ex.recupero_sec ?? 90) + 45);
  }
  if (day.cardio) sec += (day.cardio.durata_min ?? 10) * 60;
  return Math.round(sec / 60);
};

export const formatTimeAgo = (d: Date): string => {
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffH < 24) return `${diffH} ore fa`;
  if (diffD < 7) return `${diffD} ${diffD === 1 ? 'giorno' : 'giorni'} fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

export const ensureSessionFields = (plan: Plan, dayId: string) => {
  const day = plan.giorni.find(g => g.id === dayId);
  if (!day) return;
  for (const ex of day.esercizi) {
    const n = getSerieTotali(ex);
    if (!Array.isArray(ex._serie_stato)) ex._serie_stato = new Array(n).fill(false);
    while (ex._serie_stato.length < n) ex._serie_stato.push(false);
    if (ex._serie_stato.length > n) ex._serie_stato.length = n;
    if (typeof ex._note_utente !== 'string') ex._note_utente = '';
    if (!Array.isArray(ex._pesi_serie)) ex._pesi_serie = new Array(n).fill(null);
    if (!Array.isArray(ex._ripetizioni_serie)) ex._ripetizioni_serie = new Array(n).fill(null);
    if (ex.tipo === 'superset' && ex.esercizi) {
      for (const sub of ex.esercizi) {
        if (!Array.isArray(sub._pesi_serie)) sub._pesi_serie = new Array(sub.serie).fill(null);
        if (!Array.isArray(sub._ripetizioni_serie)) sub._ripetizioni_serie = new Array(sub.serie).fill(null);
      }
    }
  }
};

export const dayLetter = (idx: number): string => String.fromCharCode(65 + idx);

export type DayProgress = { done: number; total: number; inProgress: boolean };

export const getDailyProgress = (plan: Plan | null): Record<string, DayProgress> => {
  const out: Record<string, DayProgress> = {};
  if (!plan) return out;
  for (const g of plan.giorni) {
    let done = 0;
    let total = 0;
    let any = false;
    for (const e of g.esercizi) {
      total++;
      const st = e._serie_stato ?? [];
      if (isCompletato(e)) {
        done++;
        any = true;
      }
      if (st.some(Boolean)) any = true;
    }
    out[g.id] = { done, total, inProgress: any && done < total };
  }
  return out;
};

export const findExercise = (plan: Plan, exId: string): Exercise | null => {
  for (const g of plan.giorni) for (const e of g.esercizi) if (e.id === exId) return e;
  return null;
};

export const stripDayLetterPrefix = (name: string): string =>
  name.replace(/^Giorno\s+[A-Z]\s*[—·-]\s*/i, '');

/**
 * Effective weight for a single set: this session's override, else the per-set
 * default learned last session, else the plan's suggested weight.
 */
export const effectiveSetWeight = (
  target: Exercise | ExerciseSub,
  i: number
): Weight | null =>
  target._pesi_serie?.[i] ?? target.pesi_default?.[i] ?? target.peso_suggerito ?? null;

/** Resolve all n sets to their effective weights (for history snapshots). */
export const resolveFinalWeights = (
  target: Exercise | ExerciseSub,
  n: number
): (Weight | null)[] =>
  Array.from({ length: n }, (_, i) => effectiveSetWeight(target, i));

/**
 * Find the previous personal record for an exercise across history, comparing
 * weight in kg. Returns the previous max (or null if no comparable history).
 */
export const previousMaxKg = (history: Session[], exId: string): number | null => {
  let max = -Infinity;
  for (const s of history) {
    for (const e of s.esercizi) {
      if (e.id !== exId) continue;
      const arr = e.pesi_serie ?? [];
      for (let i = 0; i < arr.length; i++) {
        if (!e.serie_stato?.[i]) continue;
        const kg = weightInKg(arr[i]);
        if (kg !== null && kg > max) max = kg;
      }
    }
  }
  return Number.isFinite(max) ? max : null;
};

/** Get the legacy display string for a weight or reps (used in tags / chips). */
export const displayWeight = formatWeight;
export const displayReps = formatReps;

/** Generate a session id usable as a GitHub filename slug. */
export const newSessionId = (): string => {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${iso}-${rand}`;
};

export const formatRepsForDisplay = (r: Reps | undefined): string => formatReps(r);

/**
 * Effective actual reps for a set: the logged override, else the target value.
 * `null` target (AMRAP) stays null.
 */
export const effectiveSetReps = (
  reps: Reps | undefined,
  actual: number | null | undefined
): number | null => {
  if (actual != null) return actual;
  return reps?.value ?? null;
};
