/**
 * Platform bridge for health data.
 *  - Android: Health Connect (Samsung Health, Google/Fitbit, Garmin, Xiaomi,
 *    Zepp, Polar, Oura… all sync into it). Reads use aggregates, which
 *    de-duplicate phone and watch data by the user's source priority.
 *  - iOS: Apple Health, see ./healthKit.
 * VibeGym never writes steps or calories, so its own data can't inflate the
 * daily burn it reads back.
 */
import { Platform } from 'react-native';
import type * as HC from 'react-native-health-connect';
import { HealthDay } from '../nutrition/energy';
import { BodyEntry, Session } from '../core/types';
import { dayStart, DAY_MS } from '../core/dates';
import * as kit from './healthKit';

export const healthPlatformName =
  Platform.OS === 'ios' ? 'Salute' : 'Health Connect';

export type Availability = 'available' | 'needs-install' | 'unsupported';

const IOS = Platform.OS === 'ios';
const ANDROID = Platform.OS === 'android';

let hc: typeof HC | null = null;
const lib = (): typeof HC => {
  if (!hc) hc = require('react-native-health-connect') as typeof HC;
  return hc;
};

let ready: Promise<boolean> | null = null;
const init = (): Promise<boolean> => {
  if (!ready)
    ready = lib()
      .initialize()
      .catch(() => {
        ready = null;
        return false;
      });
  return ready;
};

const READ = ['Steps', 'ActiveCaloriesBurned', 'TotalCaloriesBurned'] as const;
const WRITE = ['ExerciseSession', 'Weight', 'BodyFat'] as const;

export const isAvailable = async (): Promise<Availability> => {
  if (IOS) return kit.isAvailable();
  if (!ANDROID) return 'unsupported';
  try {
    const st = await lib().getSdkStatus();
    if (st === 3) return 'available';
    // 2: provider update required; 1: not installed (Android 9–13).
    return Number(Platform.Version) >= 28 ? 'needs-install' : 'unsupported';
  } catch {
    return 'unsupported';
  }
};

export const requestAccess = async (): Promise<boolean> => {
  if (IOS) return kit.requestAccess();
  if (!ANDROID || (await isAvailable()) !== 'available') return false;
  try {
    if (!(await init())) return false;
    const granted = await lib().requestPermission([
      ...READ.map(recordType => ({ accessType: 'read' as const, recordType })),
      ...WRITE.map(recordType => ({
        accessType: 'write' as const,
        recordType,
      })),
    ]);
    return granted.some(
      (p: any) => p.accessType === 'read' && p.recordType === 'Steps',
    );
  } catch {
    return false;
  }
};

export const openSettings = async (): Promise<void> => {
  if (IOS) return kit.openSettings();
  try {
    lib().openHealthConnectSettings();
  } catch {
    /* not installed */
  }
};

const range = (day: string) => {
  const start = dayStart(day);
  const end = Math.min(start + DAY_MS, Date.now());
  return {
    operator: 'between' as const,
    startTime: new Date(start).toISOString(),
    endTime: new Date(Math.max(end, start + 60_000)).toISOString(),
  };
};

export const readDay = async (day: string): Promise<HealthDay | null> => {
  if (IOS) return kit.readDay(day);
  if (!ANDROID || !(await init())) return null;
  const timeRangeFilter = range(day);
  const safe = async <T>(p: Promise<T>): Promise<T | undefined> => {
    try {
      return await p;
    } catch {
      return undefined; // permission not granted for this type
    }
  };
  const [steps, active, total] = await Promise.all([
    safe(lib().aggregateRecord({ recordType: 'Steps', timeRangeFilter })),
    safe(
      lib().aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter,
      }),
    ),
    safe(
      lib().aggregateRecord({
        recordType: 'TotalCaloriesBurned',
        timeRangeFilter,
      }),
    ),
  ]);
  const out: HealthDay = {
    steps: steps?.dataOrigins?.length ? steps.COUNT_TOTAL : undefined,
    activeKcal: active?.dataOrigins?.length
      ? active.ACTIVE_CALORIES_TOTAL.inKilocalories
      : undefined,
    totalKcal: total?.dataOrigins?.length
      ? total.ENERGY_TOTAL.inKilocalories
      : undefined,
  };
  return out.steps == null && out.activeKcal == null && out.totalKcal == null
    ? { steps: steps ? 0 : undefined }
    : out;
};

export const writeWorkout = async (s: Session): Promise<void> => {
  if (IOS) return kit.writeWorkout(s);
  if (!ANDROID || !(await init())) return;
  try {
    await lib().insertRecords([
      {
        recordType: 'ExerciseSession',
        exerciseType: lib().ExerciseType.STRENGTH_TRAINING,
        startTime: s.startedAt,
        endTime: s.endedAt,
        title: s.dayName,
        notes: s.notes,
      } as any,
    ]);
  } catch {
    /* permission not granted */
  }
};

export const writeWeight = async (e: BodyEntry): Promise<void> => {
  if (IOS) return kit.writeWeight(e);
  if (!ANDROID || !(await init())) return;
  const records: any[] = [
    {
      recordType: 'Weight',
      time: e.date,
      weight: { unit: 'kilograms', value: e.weightKg },
    },
  ];
  if (e.fatPct != null)
    records.push({ recordType: 'BodyFat', time: e.date, percentage: e.fatPct });
  try {
    await lib().insertRecords(records);
  } catch {
    /* permission not granted */
  }
};
