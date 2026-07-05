import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backend, DEFAULT_PROFILE, DEFAULT_SETTINGS, Plan, Profile, Settings } from './types';
import { normalizePlan } from './migrate';

const PLAN_KEY = 'vibegym_plan_v2';
const PLAN_LEGACY_KEY = 'vibegym_plan_v1';
const SETTINGS_KEY = 'vibegym_settings';
const PROFILE_KEY = 'vibegym_profile';
const LOCAL_MODE_KEY = 'vibegym_local_mode';
const BACKEND_KEY = 'vibegym_backend';

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
