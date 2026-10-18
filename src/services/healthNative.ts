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
import { BodyEntry, Session, Sex } from '../core/types';
import { dayKey, dayStart, DAY_MS } from '../core/dates';
import { asleepMinutes } from '../stats/health';
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

const READ = [
  'Steps',
  'ActiveCaloriesBurned',
  'TotalCaloriesBurned',
  // Profile and weigh-ins from any scale or app.
  'Height',
  'Weight',
  'BodyFat',
  // Recovery.
  'RestingHeartRate',
  'SleepSession',
] as const;

/** Profile data the health platform knows. */
export interface HealthProfile {
  heightCm?: number;
  weightKg?: number;
  /** yyyy-mm-dd (Apple Health only). */
  birthDate?: string;
  sex?: Sex;
}

/** A weigh-in made with another scale or app. */
export interface HealthWeighIn {
  date: string;
  weightKg: number;
  fatPct?: number;
  /** App that recorded it (e.g. "Withings"). */
  source?: string;
}

export interface HealthRecovery {
  restingHr?: number;
  /** Minutes asleep last night. */
  sleepMin?: number;
}

const OWN = 'com.vibegym';
const ORIGIN_NAMES: Record<string, string> = {
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.fitness': 'Fit',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.withings.wiscale2': 'Withings',
  'com.huami.watch.hmwatchmanager': 'Zepp Life',
  'com.huami.midong': 'Zepp',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.mi.health': 'Mi Fitness',
  'com.huawei.health': 'Huawei Salute',
  'com.qingniu.renpho': 'Renpho',
  'com.renpho.health': 'Renpho',
  'com.eufylife.smarthome': 'EufyLife',
  'com.oudmon.heybeauty': 'Arboleaf',
  'com.ouraring.oura': 'Oura',
  'fi.polar.polarflow': 'Polar Flow',
  'com.yunmai.scale': 'Yunmai',
};
export const originName = (pkg?: string): string | undefined =>
  pkg ? ORIGIN_NAMES[pkg] ?? pkg.split('.').slice(-1)[0] : undefined;

const since = (days: number) => ({
  operator: 'between' as const,
  startTime: new Date(Date.now() - days * DAY_MS).toISOString(),
  endTime: new Date().toISOString(),
});

const records = async (type: string, days: number): Promise<any[]> => {
  try {
    const r: any = await lib().readRecords(type as any, {
      timeRangeFilter: since(days),
      ascendingOrder: false,
      pageSize: 1000,
    });
    return (r.records ?? []).filter((x: any) => x.metadata?.dataOrigin !== OWN);
  } catch {
    return []; // permission not granted for this type
  }
};

export const readProfile = async (): Promise<HealthProfile> => {
  if (IOS) return kit.readProfile();
  if (!ANDROID || !(await init())) return {};
  const [height, weight] = await Promise.all([
    records('Height', 5 * 365),
    records('Weight', 365),
  ]);
  const h = height[0]?.height?.inMeters;
  const w = weight[0]?.weight?.inKilograms;
  return {
    heightCm: h ? Math.round(h * 100) : undefined,
    weightKg: w ? Math.round(w * 100) / 100 : undefined,
  };
};

export const readWeighIns = async (days: number): Promise<HealthWeighIn[]> => {
  if (IOS) return kit.readWeighIns(days);
  if (!ANDROID || !(await init())) return [];
  const [weight, fat] = await Promise.all([
    records('Weight', days),
    records('BodyFat', days),
  ]);
  return weight
    .filter((r: any) => r.weight?.inKilograms > 0)
    .map((r: any) => {
      const t = Date.parse(r.time);
      // Smart scales write the body fat with the same timestamp.
      const f = fat.find(
        (x: any) => Math.abs(Date.parse(x.time) - t) < 5 * 60_000,
      );
      return {
        date: new Date(t).toISOString(),
        weightKg: Math.round(r.weight.inKilograms * 100) / 100,
        fatPct: f ? Math.round(f.percentage * 10) / 10 : undefined,
        source: originName(r.metadata?.dataOrigin),
      };
    });
};

export const readRecovery = async (): Promise<HealthRecovery> => {
  if (IOS) return kit.readRecovery();
  if (!ANDROID || !(await init())) return {};
  const [hr, sleep] = await Promise.all([
    records('RestingHeartRate', 7),
    records('SleepSession', 2),
  ]);
  // Last night: sleep ending after 6 pm yesterday. Stages, when the app
  // writes them, leave out the time awake.
  const from = dayStart(dayKey()) - 6 * 3600_000;
  const AWAKE = [1, 3, 7]; // awake, out of bed, awake in bed
  const intervals: [number, number][] = sleep.flatMap((x: any) => {
    const stages: any[] = x.stages ?? [];
    const parts = stages.length
      ? stages.filter(st => !AWAKE.includes(st.stage))
      : [x];
    return parts.map(
      (p: any) =>
        [Date.parse(p.startTime), Date.parse(p.endTime)] as [number, number],
    );
  });
  const asleep = asleepMinutes(intervals, from);
  return {
    restingHr: hr[0]?.beatsPerMinute
      ? Math.round(hr[0].beatsPerMinute)
      : undefined,
    sleepMin: asleep > 0 ? Math.round(asleep) : undefined,
  };
};

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
  const list: any[] = [
    {
      recordType: 'Weight',
      time: e.date,
      weight: { unit: 'kilograms', value: e.weightKg },
    },
  ];
  if (e.fatPct != null)
    list.push({ recordType: 'BodyFat', time: e.date, percentage: e.fatPct });
  try {
    await lib().insertRecords(list);
  } catch {
    /* permission not granted */
  }
};
