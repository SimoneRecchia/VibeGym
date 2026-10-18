/**
 * AsyncStorage persistence. Each slice of the state lives under its own key
 * so a set ticked during a workout rewrites only the small workout slice,
 * never the whole history.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActiveWorkout,
  BodyEntry,
  DEFAULT_SETTINGS,
  FoodLibrary,
  FoodLog,
  MeasureEntry,
  Plan,
  Profile,
  Session,
  Settings,
} from '../core/types';
import { legacyPlanToV3 } from './legacy';
import { uid } from '../core/ids';

export interface PersistedState {
  onboarded: boolean;
  plans: Plan[];
  activePlanId: string | null;
  sessions: Session[];
  body: BodyEntry[];
  measures: MeasureEntry[];
  foodLog: FoodLog[];
  foodLib: FoodLibrary;
  profile: Profile;
  settings: Settings;
  workout: ActiveWorkout | null;
}

export type SliceKey = keyof PersistedState;

export const SLICE_KEYS: SliceKey[] = [
  'onboarded',
  'plans',
  'activePlanId',
  'sessions',
  'body',
  'measures',
  'foodLog',
  'foodLib',
  'profile',
  'settings',
  'workout',
];

const storageKey = (k: SliceKey) => `vg3:${k}`;
const META_KEY = 'vg3:meta';

/** Fresh empty state (new arrays every time: callers may mutate them). */
export const emptyState = (): PersistedState => ({
  onboarded: false,
  plans: [],
  activePlanId: null,
  sessions: [],
  body: [],
  measures: [],
  foodLog: [],
  foodLib: { custom: [], favorites: [], recents: [], cache: [] },
  profile: {},
  settings: DEFAULT_SETTINGS,
  workout: null,
});

/** v2.0 stored the weigh-in rhythm inside the notification. */
const legacyWeigh = (s: Partial<Settings> | undefined) =>
  s?.notifications?.weighIn?.frequency === 'daily'
    ? { every: 1, unit: 'day' as const }
    : s?.notifications?.weighIn?.frequency === 'weekly'
    ? { every: 1, unit: 'week' as const }
    : {};

/** Merge stored settings over defaults (new settings get their default). */
export const mergeSettings = (s: Partial<Settings> | undefined): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(s ?? {}),
  weigh: {
    ...DEFAULT_SETTINGS.weigh,
    ...(s?.weigh ? {} : legacyWeigh(s)),
    ...(s?.weigh ?? {}),
  },
  nutrition: {
    ...DEFAULT_SETTINGS.nutrition,
    ...(s?.nutrition ?? {}),
    pct: { ...DEFAULT_SETTINGS.nutrition.pct, ...(s?.nutrition?.pct ?? {}) },
    grams: {
      ...DEFAULT_SETTINGS.nutrition.grams,
      ...(s?.nutrition?.grams ?? {}),
    },
  },
  health: { ...DEFAULT_SETTINGS.health, ...(s?.health ?? {}) },
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(s?.notifications ?? {}),
    workout: {
      ...DEFAULT_SETTINGS.notifications.workout,
      ...(s?.notifications?.workout ?? {}),
    },
    weighIn: {
      ...DEFAULT_SETTINGS.notifications.weighIn,
      ...(s?.notifications?.weighIn ?? {}),
    },
    measures: {
      ...DEFAULT_SETTINGS.notifications.measures,
      ...(s?.notifications?.measures ?? {}),
    },
  },
  scale: { ...DEFAULT_SETTINGS.scale, ...(s?.scale ?? {}) },
});

export const loadState = async (): Promise<PersistedState> => {
  const meta = await AsyncStorage.getItem(META_KEY).catch(() => null);
  if (!meta) {
    const migrated = await migrateLegacyStorage();
    await saveAll(migrated);
    await AsyncStorage.setItem(
      META_KEY,
      JSON.stringify({ version: 3, at: new Date().toISOString() }),
    ).catch(() => {});
    return migrated;
  }
  const pairs = await AsyncStorage.multiGet(SLICE_KEYS.map(storageKey)).catch(
    () => [] as readonly [string, string | null][],
  );
  const state: PersistedState = emptyState();
  pairs.forEach(([k, v]) => {
    if (v == null) return;
    const slice = k.slice(4) as SliceKey;
    try {
      (state as any)[slice] = JSON.parse(v);
    } catch {
      /* corrupted slice: keep default */
    }
  });
  state.settings = mergeSettings(state.settings);
  return state;
};

export const saveSlice = async <K extends SliceKey>(
  k: K,
  value: PersistedState[K],
): Promise<void> => {
  try {
    await AsyncStorage.setItem(storageKey(k), JSON.stringify(value));
  } catch {
    /* storage full / unavailable: nothing sensible to do here */
  }
};

export const saveAll = async (s: PersistedState): Promise<void> => {
  try {
    await AsyncStorage.multiSet(
      SLICE_KEYS.map(
        k => [storageKey(k), JSON.stringify(s[k])] as [string, string],
      ),
    );
  } catch {
    /* ignore */
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([...SLICE_KEYS.map(storageKey)]);
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ */
/*  Legacy (app v1/v2) storage migration                               */
/* ------------------------------------------------------------------ */

const readJson = async (key: string): Promise<any> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** "12/03/1990" or "1990-03-12" → "1990-03-12". */
export const normalizeBirthDate = (s: unknown): string | undefined => {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return undefined;
};

const migrateLegacyStorage = async (): Promise<PersistedState> => {
  const [
    plansRaw,
    singleV2,
    singleV1,
    activeId,
    settingsRaw,
    profileRaw,
    bodyRaw,
    theme,
  ] = await Promise.all([
    readJson('vibegym_plans'),
    readJson('vibegym_plan_v2'),
    readJson('vibegym_plan_v1'),
    AsyncStorage.getItem('vibegym_active_scheda').catch(() => null),
    readJson('vibegym_settings'),
    readJson('vibegym_profile'),
    readJson('vibegym_body_log'),
    AsyncStorage.getItem('vibegym_theme').catch(() => null),
  ]);

  const state: PersistedState = {
    ...emptyState(),
    settings: mergeSettings(undefined),
  };
  const legacyPlans: any[] = Array.isArray(plansRaw)
    ? plansRaw
    : singleV2
    ? [singleV2]
    : singleV1
    ? [singleV1]
    : [];
  for (const lp of legacyPlans) {
    try {
      const { plan, sessions } = legacyPlanToV3(lp);
      if (!plan.days.length) continue;
      state.plans.push(plan);
      state.sessions.push(...sessions);
    } catch {
      /* skip unreadable plan */
    }
  }
  state.sessions.sort((a, b) => a.endedAt.localeCompare(b.endedAt));
  state.activePlanId =
    state.plans.find(p => p.id === activeId)?.id ?? state.plans[0]?.id ?? null;

  if (profileRaw && typeof profileRaw === 'object') {
    const p = profileRaw as any;
    state.profile = {
      name: p.name || undefined,
      sex: p.sex === 'male' || p.sex === 'female' ? p.sex : undefined,
      birthDate: normalizeBirthDate(p.birthDate),
      heightCm: typeof p.heightCm === 'number' ? p.heightCm : undefined,
      experience: ['beginner', 'intermediate', 'advanced'].includes(
        p.experience,
      )
        ? p.experience
        : undefined,
      daysPerWeek:
        typeof p.sessionsPerWeek === 'number' ? p.sessionsPerWeek : undefined,
      sessionMin:
        typeof p.sessionLengthMin === 'number' ? p.sessionLengthMin : undefined,
      goals: Array.isArray(p.goals) ? p.goals : undefined,
      injuries: p.injuries || undefined,
      exclusions: p.exclusions || undefined,
    };
  }

  if (Array.isArray(bodyRaw)) {
    state.body = bodyRaw
      .filter(
        (e: any) =>
          e &&
          typeof e.weightKg === 'number' &&
          e.weightKg > 0 &&
          typeof e.date === 'string',
      )
      .map((e: any) => ({
        id: uid('w'),
        date: e.date,
        weightKg: e.weightKg,
        source: 'manual' as const,
      }));
  }

  if (settingsRaw && typeof settingsRaw === 'object') {
    const s = settingsRaw as any;
    state.settings = mergeSettings({
      unit: s.defaultUnit === 'lb' ? 'lb' : 'kg',
      sound: s.sound !== false,
      haptics: s.haptic !== false,
      keepAwake: s.keepScreenOn !== false,
    });
  }
  if (theme === 'light' || theme === 'dark')
    state.settings = { ...state.settings, theme };

  state.onboarded = state.plans.length > 0 || !!state.profile.name;
  return state;
};
