/**
 * Health Connect (Android) / Apple Health (iOS): steps and energy for a day,
 * profile and weigh-ins from other apps, last night's sleep and resting
 * heart rate; workouts and weigh-ins written back. Platform code lives in
 * ./healthNative; this module syncs into the store and caches for the UI.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useStore } from '../data/store';
import { HealthDay } from '../nutrition/energy';
import { dayKey } from '../core/dates';
import { Profile } from '../core/types';
import { newWeighIns, profileGaps } from '../stats/health';
import * as native from './healthNative';
import type { HealthRecovery } from './healthNative';

export { healthPlatformName } from './healthNative';

interface HealthCache {
  days: Record<string, { at: number; data: HealthDay }>;
}

const useHealthCache = create<HealthCache>(() => ({ days: {} }));

const inflight = new Map<string, Promise<void>>();
const TTL_TODAY = 5 * 60_000;

const refresh = (day: string, force = false): Promise<void> => {
  if (!useStore.getState().settings.health.enabled) return Promise.resolve();
  const cached = useHealthCache.getState().days[day];
  const isToday = day === dayKey();
  if (!force && cached && (!isToday || Date.now() - cached.at < TTL_TODAY))
    return Promise.resolve();
  const running = inflight.get(day);
  if (running) return running;
  const p = native
    .readDay(day)
    .then(data => {
      if (data)
        useHealthCache.setState(s => ({
          days: { ...s.days, [day]: { at: Date.now(), data } },
        }));
    })
    .catch(() => {})
    .finally(() => inflight.delete(day));
  inflight.set(day, p);
  return p;
};

/** Steps / energy of a day from the platform, when the user enabled it. */
export const useHealthDay = (day: string): HealthDay | undefined => {
  const enabled = useStore(s => s.settings.health.enabled);
  const data = useHealthCache(s => (enabled ? s.days[day]?.data : undefined));
  useEffect(() => {
    if (!enabled) return;
    refresh(day);
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') refresh(day, day === dayKey());
    });
    return () => sub.remove();
  }, [day, enabled]);
  return data;
};

export interface SyncResult {
  /** Profile fields filled in. */
  profile: (keyof Profile)[];
  /** Weigh-ins imported. */
  weighIns: number;
}

const SYNC_EVERY = 30 * 60_000;
let syncing: Promise<SyncResult | null> | null = null;

/**
 * Fills the empty profile fields (height, birth date, sex) and imports the
 * weigh-ins made with other scales. Throttled unless forced.
 */
export const syncHealth = (force = false): Promise<SyncResult | null> => {
  const h = useStore.getState().settings.health;
  if (!h.enabled) return Promise.resolve(null);
  if (!force && h.lastSync && Date.now() - h.lastSync < SYNC_EVERY)
    return Promise.resolve(null);
  if (syncing) return syncing;
  syncing = (async () => {
    const [profile, weighIns] = await Promise.all([
      native.readProfile().catch(() => ({})),
      h.importWeight
        ? native.readWeighIns(h.lastSync ? 30 : 365).catch(() => [])
        : Promise.resolve([]),
    ]);
    const st = useStore.getState();
    // Profile first: the imported weigh-ins get their BMI from the height.
    const gaps = profileGaps(st.profile, profile);
    if (Object.keys(gaps).length) st.setProfile(gaps);
    const fresh = newWeighIns(
      useStore.getState().body,
      weighIns,
      st.settings.health.ignored,
    );
    if (fresh.length) st.importBodyEntries(fresh);
    st.updateSettings(x => ({
      ...x,
      health: { ...x.health, lastSync: Date.now() },
    }));
    return {
      profile: Object.keys(gaps) as (keyof Profile)[],
      weighIns: fresh.length,
    };
  })()
    .catch(() => null)
    .finally(() => {
      syncing = null;
    });
  return syncing;
};

/** Syncs at launch and whenever the app comes back to the foreground. */
export const useHealthSync = () => {
  const hydrated = useStore(s => s.hydrated);
  const enabled = useStore(s => s.settings.health.enabled);
  useEffect(() => {
    if (!hydrated || !enabled) return;
    syncHealth();
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') syncHealth();
    });
    return () => sub.remove();
  }, [hydrated, enabled]);
};

const useRecoveryCache = create<{ at: number; data?: HealthRecovery }>(() => ({
  at: 0,
}));
const TTL_RECOVERY = 30 * 60_000;

const refreshRecovery = (force = false) => {
  if (!force && Date.now() - useRecoveryCache.getState().at < TTL_RECOVERY)
    return;
  useRecoveryCache.setState({ at: Date.now() });
  native
    .readRecovery()
    .then(data => useRecoveryCache.setState({ at: Date.now(), data }))
    .catch(() => useRecoveryCache.setState({ at: 0 }));
};

/** Last night's sleep and the resting heart rate, when available. */
export const useHealthRecovery = (): HealthRecovery | undefined => {
  const enabled = useStore(s => s.settings.health.enabled);
  const data = useRecoveryCache(s => (enabled ? s.data : undefined));
  useEffect(() => {
    if (!enabled) return;
    refreshRecovery();
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') refreshRecovery();
    });
    return () => sub.remove();
  }, [enabled]);
  return data;
};

export const clearHealthCache = () => {
  useHealthCache.setState({ days: {} });
  useRecoveryCache.setState({ at: 0, data: undefined });
};

export const healthAvailable = native.isAvailable;
export const requestHealthAccess = native.requestAccess;
export const openHealthSettings = native.openSettings;
export const writeWorkoutToHealth = native.writeWorkout;
export const writeWeightToHealth = native.writeWeight;
