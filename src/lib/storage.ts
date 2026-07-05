import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backend, BodyEntry, DEFAULT_PROFILE, DEFAULT_SETTINGS, Plan, Profile, Settings } from './types';
import { normalizePlan } from './migrate';

const PLAN_KEY = 'vibegym_plan_v2';
const PLAN_LEGACY_KEY = 'vibegym_plan_v1';
const PLANS_KEY = 'vibegym_plans';
const ACTIVE_SCHEDA_KEY = 'vibegym_active_scheda';
const SETTINGS_KEY = 'vibegym_settings';
const PROFILE_KEY = 'vibegym_profile';
const LOCAL_MODE_KEY = 'vibegym_local_mode';
const BACKEND_KEY = 'vibegym_backend';
const BODY_LOG_KEY = 'vibegym_body_log';
const LAST_WEIGHT_PROMPT_KEY = 'vibegym_last_weight_prompt';

export const loadPlan = async (): Promise<Plan | null> => {
  try {
    let raw = await AsyncStorage.getItem(PLAN_KEY);
    if (!raw) raw = await AsyncStorage.getItem(PLAN_LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizePlan(parsed);
    // Persist back in the v2 slot so next loads are cheap
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(normalized));
    await AsyncStorage.removeItem(PLAN_LEGACY_KEY);
    return normalized;
  } catch {
    return null;
  }
};

export const savePlan = async (plan: Plan): Promise<void> => {
  try {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
};

export const clearPlan = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PLAN_KEY);
  } catch {
    /* ignore */
  }
};

export const loadSettings = async (): Promise<Settings> => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (s: Settings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

export const loadProfile = async (): Promise<Profile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

export const saveProfile = async (p: Profile): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
};

export const loadLocalMode = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(LOCAL_MODE_KEY)) === '1';
  } catch {
    return false;
  }
};

export const saveLocalMode = async (on: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCAL_MODE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};

/**
 * Canonical persistence-backend flag. Supersedes the legacy `vibegym_local_mode`
 * boolean (still read at hydration for backward compatibility). Stores only the
 * committed choices — a fresh install returns null (→ onboarding).
 */
export const loadBackend = async (): Promise<Backend> => {
  try {
    const raw = await AsyncStorage.getItem(BACKEND_KEY);
    return raw === 'local' || raw === 'cloud' ? raw : null;
  } catch {
    return null;
  }
};

export const saveBackend = async (b: Exclude<Backend, null>): Promise<void> => {
  try {
    await AsyncStorage.setItem(BACKEND_KEY, b);
  } catch {
    /* ignore */
  }
};

/* ------------------------------ Scheda library ----------------------- */

/**
 * Load the whole scheda library. Migrates the legacy single-plan storage
 * (vibegym_plan_v2) into a one-element library on first run. Returns null when
 * there is nothing stored yet.
 */
export const loadPlans = async (): Promise<Plan[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(PLANS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(p => normalizePlan(p));
      return null;
    }
    // Migrate the old single-plan slot into a library.
    const single = await loadPlan();
    return single ? [single] : null;
  } catch {
    return null;
  }
};

export const savePlans = async (plans: Plan[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch {
    /* ignore */
  }
};

export const loadActiveScheda = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_SCHEDA_KEY);
  } catch {
    return null;
  }
};

export const saveActiveScheda = async (id: string | null): Promise<void> => {
  try {
    if (id) await AsyncStorage.setItem(ACTIVE_SCHEDA_KEY, id);
    else await AsyncStorage.removeItem(ACTIVE_SCHEDA_KEY);
  } catch {
    /* ignore */
  }
};

/* ------------------------------ Body metrics ------------------------- */

export const loadBodyLog = async (): Promise<BodyEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(BODY_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as BodyEntry[]) : [];
  } catch {
    return [];
  }
};

export const saveBodyLog = async (log: BodyEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(BODY_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
};

export const loadLastWeightPrompt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_WEIGHT_PROMPT_KEY);
  } catch {
    return null;
  }
};

export const saveLastWeightPrompt = async (iso: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_WEIGHT_PROMPT_KEY, iso);
  } catch {
    /* ignore */
  }
};
