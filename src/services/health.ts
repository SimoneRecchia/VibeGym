/**
 * Health Connect (Android) / Apple Health (iOS): steps and energy for a day,
 * written workouts and weigh-ins. Platform code lives in ./healthNative;
 * this module keeps a small per-day cache for the UI.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useStore } from '../data/store';
import { HealthDay } from '../nutrition/energy';
import { dayKey } from '../core/dates';
import * as native from './healthNative';

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

export const clearHealthCache = () => useHealthCache.setState({ days: {} });

export const healthAvailable = native.isAvailable;
export const requestHealthAccess = native.requestAccess;
export const openHealthSettings = native.openSettings;
export const writeWorkoutToHealth = native.writeWorkout;
export const writeWeightToHealth = native.writeWeight;
