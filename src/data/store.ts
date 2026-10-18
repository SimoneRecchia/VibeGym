import { create } from 'zustand';
import { AppState } from 'react-native';
import {
  ActiveWorkout,
  BodyEntry,
  Food,
  FoodLibrary,
  FoodLog,
  LoggedSet,
  MeasureEntry,
  Plan,
  Profile,
  Session,
  SessionExercise,
  Settings,
} from '../core/types';
import {
  emptyState,
  PersistedState,
  SLICE_KEYS,
  SliceKey,
  clearAll,
  loadState,
  mergeSettings,
  saveSlice,
} from './storage';
import { buildWorkout, cloneWorkout, toSession } from '../workout/engine';
import { duplicatePlan as dupPlan } from '../plan/planUtils';
import { uid } from '../core/ids';
import { enrichBodyEntry } from '../stats/body';
import { weighInKey } from '../stats/health';

export interface AppStore extends PersistedState {
  hydrated: boolean;

  hydrate: () => Promise<void>;
  completeOnboarding: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  updateSettings: (fn: (s: Settings) => Settings) => void;

  /* Plans */
  addPlan: (plan: Plan, opts?: { activate?: boolean }) => void;
  savePlan: (plan: Plan) => void;
  deletePlan: (id: string) => void;
  setActivePlan: (id: string) => void;
  duplicatePlan: (id: string) => void;

  /* Workout */
  startWorkout: (planId: string, dayId: string) => ActiveWorkout | null;
  updateWorkout: (fn: (w: ActiveWorkout) => void) => void;
  updateSet: (
    bi: number,
    ei: number,
    si: number,
    patch: Partial<LoggedSet>,
    propagate?: boolean,
  ) => void;
  finishWorkout: () => Session | null;
  discardWorkout: () => void;

  /* History */
  importSessions: (sessions: Session[]) => void;
  deleteSession: (id: string) => void;

  /* Body */
  addBodyEntry: (e: Omit<BodyEntry, 'id'>) => BodyEntry;
  /** Weigh-ins read from Health Connect / Apple Health. */
  importBodyEntries: (list: Omit<BodyEntry, 'id'>[]) => void;
  deleteBodyEntry: (id: string) => void;
  addMeasure: (values: MeasureEntry['values'], date?: string) => void;
  deleteMeasure: (id: string) => void;

  /* Nutrition */
  logFood: (e: Omit<FoodLog, 'id' | 'at'>) => FoodLog;
  updateFoodLog: (id: string, patch: Partial<FoodLog>) => void;
  deleteFoodLog: (id: string) => void;
  /** Re-adds a deleted entry (undo). */
  restoreFoodLog: (e: FoodLog) => void;
  saveCustomFood: (f: Food) => void;
  deleteCustomFood: (id: string) => void;
  toggleFavorite: (id: string) => void;
  cacheFood: (f: Food) => void;

  /* Data */
  replaceAll: (s: Partial<PersistedState>) => void;
  resetAll: () => Promise<void>;
}

const sortByDate = <T extends { date: string }>(a: T[]): T[] =>
  a.slice().sort((x, y) => x.date.localeCompare(y.date));

const MAX_RECENTS = 60;
const MAX_CACHE = 400;

/** Products from Open Food Facts stay available offline. */
const cacheInto = (lib: FoodLibrary, f: Food): FoodLibrary =>
  f.source === 'off'
    ? {
        ...lib,
        cache: [f, ...lib.cache.filter(x => x.id !== f.id)].slice(0, MAX_CACHE),
      }
    : lib;

const rememberFood = (lib: FoodLibrary, f: Food): FoodLibrary => ({
  ...cacheInto(lib, f),
  recents: [f.id, ...lib.recents.filter(x => x !== f.id)].slice(0, MAX_RECENTS),
});

export const useStore = create<AppStore>()((set, get) => ({
  ...emptyState(),
  hydrated: false,

  hydrate: async () => {
    const s = await loadState();
    set({ ...s, hydrated: true });
  },

  completeOnboarding: () => set({ onboarded: true }),
  setProfile: patch =>
    set(s => {
      const profile = { ...s.profile, ...patch };
      // Weigh-ins waiting for sex, height or age get their composition now.
      return { profile, body: s.body.map(e => enrichBodyEntry(e, profile)) };
    }),
  updateSettings: fn => set(s => ({ settings: mergeSettings(fn(s.settings)) })),

  addPlan: (plan, opts) =>
    set(s => ({
      plans: [...s.plans.filter(p => p.id !== plan.id), plan],
      activePlanId:
        opts?.activate === false && s.activePlanId ? s.activePlanId : plan.id,
    })),
  savePlan: plan =>
    set(s => ({
      plans: s.plans.map(p =>
        p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p,
      ),
    })),
  deletePlan: id =>
    set(s => {
      const plans = s.plans.filter(p => p.id !== id);
      return {
        plans,
        activePlanId:
          s.activePlanId === id ? plans[0]?.id ?? null : s.activePlanId,
      };
    }),
  setActivePlan: id => set({ activePlanId: id }),
  duplicatePlan: id => {
    const p = get().plans.find(x => x.id === id);
    if (p) set(s => ({ plans: [...s.plans, dupPlan(p)] }));
  },

  startWorkout: (planId, dayId) => {
    const { plans, sessions } = get();
    const plan = plans.find(p => p.id === planId);
    const day = plan?.days.find(d => d.id === dayId);
    if (!plan || !day || !day.blocks.some(b => b.exercises.length)) return null;
    const workout = buildWorkout(plan, day, sessions);
    set({ workout });
    return workout;
  },
  updateWorkout: fn =>
    set(s => {
      if (!s.workout) return {};
      const w = cloneWorkout(s.workout);
      fn(w);
      return { workout: w };
    }),
  updateSet: (bi, ei, si, patch, propagate) =>
    get().updateWorkout(w => {
      const ex: SessionExercise | undefined = w.blocks[bi]?.exercises[ei];
      if (!ex?.sets[si]) return;
      Object.assign(ex.sets[si], patch);
      if (propagate) {
        // Carry the changed values to the following sets not yet done.
        for (let i = si + 1; i < ex.sets.length; i++) {
          if (ex.sets[i].done) continue;
          for (const k of ['kg', 'reps', 'sec', 'km'] as const) {
            if (k in patch) ex.sets[i][k] = patch[k];
          }
        }
      }
    }),
  finishWorkout: () => {
    const { workout, sessions } = get();
    if (!workout) return null;
    const session = toSession(workout, sessions);
    set({ sessions: [...sessions, session], workout: null });
    // Write history and the cleared workout together, right away.
    flushPersistence();
    return session;
  },
  discardWorkout: () => set({ workout: null }),

  importSessions: incoming =>
    set(s => {
      const ids = new Set(s.sessions.map(x => x.id));
      const merged = [...s.sessions, ...incoming.filter(x => !ids.has(x.id))];
      merged.sort((a, b) => a.endedAt.localeCompare(b.endedAt));
      return { sessions: merged };
    }),
  deleteSession: id =>
    set(s => ({ sessions: s.sessions.filter(x => x.id !== id) })),

  addBodyEntry: e => {
    const entry: BodyEntry = {
      ...enrichBodyEntry(e, get().profile),
      id: uid('b'),
    };
    set(s => ({ body: sortByDate([...s.body, entry]) }));
    return entry;
  },
  importBodyEntries: list =>
    set(s => ({
      body: sortByDate([
        ...s.body,
        ...list.map(e => ({ ...enrichBodyEntry(e, s.profile), id: uid('b') })),
      ]),
    })),
  deleteBodyEntry: id =>
    set(s => {
      const e = s.body.find(x => x.id === id);
      const body = s.body.filter(x => x.id !== id);
      if (e?.source !== 'health') return { body };
      // Remember it, or the next import would bring it back.
      const ignored = [...(s.settings.health.ignored ?? []), weighInKey(e)];
      return {
        body,
        settings: {
          ...s.settings,
          health: { ...s.settings.health, ignored: ignored.slice(-200) },
        },
      };
    }),
  addMeasure: (values, date) =>
    set(s => ({
      measures: sortByDate([
        ...s.measures,
        { id: uid('m'), date: date ?? new Date().toISOString(), values },
      ]),
    })),
  deleteMeasure: id =>
    set(s => ({ measures: s.measures.filter(x => x.id !== id) })),

  logFood: e => {
    const entry: FoodLog = { ...e, id: uid('f'), at: new Date().toISOString() };
    set(s => ({
      foodLog: [...s.foodLog, entry],
      foodLib: rememberFood(s.foodLib, e.food),
    }));
    return entry;
  },
  updateFoodLog: (id, patch) =>
    set(s => ({
      foodLog: s.foodLog.map(x => (x.id === id ? { ...x, ...patch } : x)),
    })),
  deleteFoodLog: id =>
    set(s => ({ foodLog: s.foodLog.filter(x => x.id !== id) })),
  restoreFoodLog: e =>
    set(s => ({
      foodLog: s.foodLog.some(x => x.id === e.id)
        ? s.foodLog
        : [...s.foodLog, e],
    })),
  saveCustomFood: f =>
    set(s => ({
      foodLib: {
        ...s.foodLib,
        custom: [...s.foodLib.custom.filter(x => x.id !== f.id), f],
      },
    })),
  deleteCustomFood: id =>
    set(s => ({
      foodLib: {
        ...s.foodLib,
        custom: s.foodLib.custom.filter(x => x.id !== id),
        favorites: s.foodLib.favorites.filter(x => x !== id),
        recents: s.foodLib.recents.filter(x => x !== id),
      },
    })),
  toggleFavorite: id =>
    set(s => ({
      foodLib: {
        ...s.foodLib,
        favorites: s.foodLib.favorites.includes(id)
          ? s.foodLib.favorites.filter(x => x !== id)
          : [id, ...s.foodLib.favorites],
      },
    })),
  cacheFood: f => set(s => ({ foodLib: cacheInto(s.foodLib, f) })),

  replaceAll: incoming =>
    set(() => ({
      ...emptyState(),
      ...incoming,
      settings: mergeSettings(incoming.settings),
      onboarded: true,
    })),
  resetAll: async () => {
    await clearAll();
    set({ ...emptyState(), hydrated: true });
  },
}));

/* ------------------------------------------------------------------ */
/*  Persistence: write changed slices, debounced                       */
/* ------------------------------------------------------------------ */

const timers: Partial<Record<SliceKey, ReturnType<typeof setTimeout>>> = {};
const pending = new Set<SliceKey>();

const flushKey = (k: SliceKey) => {
  pending.delete(k);
  const t = timers[k];
  if (t) clearTimeout(t);
  timers[k] = undefined;
  saveSlice(k, useStore.getState()[k]);
};

export const flushPersistence = () => {
  [...pending].forEach(flushKey);
};

useStore.subscribe((state, prev) => {
  if (!state.hydrated || !prev.hydrated) return;
  for (const k of SLICE_KEYS) {
    if (state[k] === prev[k]) continue;
    pending.add(k);
    const t = timers[k];
    if (t) clearTimeout(t);
    timers[k] = setTimeout(() => flushKey(k), k === 'workout' ? 250 : 500);
  }
});

AppState.addEventListener('change', st => {
  if (st !== 'active') flushPersistence();
});

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

export const selectActivePlan = (s: AppStore): Plan | undefined =>
  s.plans.find(p => p.id === s.activePlanId);

/** Latest body weight entry. */
export const selectLatestWeight = (s: AppStore): BodyEntry | undefined =>
  s.body[s.body.length - 1];
