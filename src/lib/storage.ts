import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, Plan, Settings } from './types';
import { normalizePlan } from './migrate';

const PLAN_KEY = 'vibegym_plan_v2';
const PLAN_LEGACY_KEY = 'vibegym_plan_v1';
const SETTINGS_KEY = 'vibegym_settings';

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
