/**
 * Apple Health (iOS): steps and active energy for a day; workouts and
 * weigh-ins written back. The library is loaded lazily so other platforms
 * (and tests) never touch it. Requires the HealthKit capability in Xcode.
 */
import { Linking } from 'react-native';
import type { HealthDay } from '../nutrition/energy';
import type { BodyEntry, Session } from '../core/types';
import { dayKey, dayStart, DAY_MS } from '../core/dates';
import { asleepMinutes } from '../stats/health';
import type {
  HealthProfile,
  HealthRecovery,
  HealthWeighIn,
} from './healthNative';

type Kit = typeof import('@kingstinct/react-native-healthkit');
let kit: Kit | null = null;
const lib = (): Kit => {
  if (!kit) kit = require('@kingstinct/react-native-healthkit') as Kit;
  return kit;
};

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const ACTIVE = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const MASS = 'HKQuantityTypeIdentifierBodyMass' as const;
const FAT = 'HKQuantityTypeIdentifierBodyFatPercentage' as const;
const HEIGHT = 'HKQuantityTypeIdentifierHeight' as const;
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate' as const;
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const SEX = 'HKCharacteristicTypeIdentifierBiologicalSex' as const;
const BIRTH = 'HKCharacteristicTypeIdentifierDateOfBirth' as const;
const WORKOUT = 'HKWorkoutTypeIdentifier' as const;
const OWN = 'VibeGym';

export const isAvailable = async (): Promise<
  'available' | 'needs-install' | 'unsupported'
> => {
  try {
    return (await lib().isHealthDataAvailableAsync())
      ? 'available'
      : 'unsupported';
  } catch {
    return 'unsupported';
  }
};

export const requestAccess = async (): Promise<boolean> => {
  try {
    return await lib().requestAuthorization({
      toRead: [STEPS, ACTIVE, HEIGHT, MASS, FAT, RESTING_HR, SLEEP, SEX, BIRTH],
      toShare: [WORKOUT, MASS, FAT],
    });
  } catch {
    return false;
  }
};

export const openSettings = async (): Promise<void> => {
  // Health permissions live in Settings › Health › Data Access.
  Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
};

export const readDay = async (day: string): Promise<HealthDay | null> => {
  const startDate = new Date(dayStart(day));
  const endDate = new Date(Math.min(startDate.getTime() + DAY_MS, Date.now()));
  const filter = { date: { startDate, endDate } };
  const total = async (q: Promise<{ sumQuantity?: { quantity: number } }>) => {
    try {
      return (await q).sumQuantity?.quantity;
    } catch {
      return undefined;
    }
  };
  // Statistics queries de-duplicate iPhone and Apple Watch samples.
  const [steps, active] = await Promise.all([
    total(
      lib().queryStatisticsForQuantity(STEPS, ['cumulativeSum'], {
        filter,
        unit: 'count',
      }),
    ),
    total(
      lib().queryStatisticsForQuantity(ACTIVE, ['cumulativeSum'], {
        filter,
        unit: 'kcal',
      }),
    ),
  ]);
  return { steps, activeKcal: active };
};

export const writeWorkout = async (s: Session): Promise<void> => {
  try {
    await lib().saveWorkoutSample(
      lib().WorkoutActivityType.traditionalStrengthTraining,
      [],
      new Date(s.startedAt),
      new Date(s.endedAt),
    );
  } catch {
    /* not authorized */
  }
};

export const writeWeight = async (e: BodyEntry): Promise<void> => {
  const t = new Date(e.date);
  try {
    await lib().saveQuantitySample(MASS, 'kg', e.weightKg, t, t);
    if (e.fatPct != null)
      await lib().saveQuantitySample(FAT, '%', e.fatPct / 100, t, t);
  } catch {
    /* not authorized */
  }
};

const since = (days: number) => ({
  date: {
    startDate: new Date(Date.now() - days * DAY_MS),
    endDate: new Date(),
  },
});

const samples = async (
  id: typeof HEIGHT | typeof MASS | typeof FAT | typeof RESTING_HR,
  unit: string,
  days: number,
  limit = 0,
) => {
  try {
    const r = await lib().queryQuantitySamples(id, {
      filter: since(days),
      limit,
      ascending: false,
      unit: unit as any,
    });
    return r.filter(x => x.sourceRevision?.source.name !== OWN);
  } catch {
    return []; // not authorized
  }
};

const safe = async <T>(p: Promise<T>): Promise<T | undefined> => {
  try {
    return await p;
  } catch {
    return undefined;
  }
};

export const readProfile = async (): Promise<HealthProfile> => {
  const [height, weight, birth, sex] = await Promise.all([
    samples(HEIGHT, 'cm', 5 * 365, 1),
    samples(MASS, 'kg', 365, 1),
    safe(lib().getDateOfBirthAsync()),
    safe(lib().getBiologicalSexAsync()),
  ]);
  const h = height[0]?.quantity;
  const w = weight[0]?.quantity;
  return {
    heightCm: h ? Math.round(h) : undefined,
    weightKg: w ? Math.round(w * 100) / 100 : undefined,
    birthDate: birth ? dayKey(birth.getTime()) : undefined,
    // BiologicalSex: 1 female, 2 male.
    sex: sex === 1 ? 'female' : sex === 2 ? 'male' : undefined,
  };
};

export const readWeighIns = async (days: number): Promise<HealthWeighIn[]> => {
  const [weight, fat] = await Promise.all([
    samples(MASS, 'kg', days),
    samples(FAT, '%', days),
  ]);
  return weight
    .filter(r => r.quantity > 0)
    .map(r => {
      const t = r.startDate.getTime();
      const f = fat.find(x => Math.abs(x.startDate.getTime() - t) < 5 * 60_000);
      return {
        date: new Date(t).toISOString(),
        weightKg: Math.round(r.quantity * 100) / 100,
        // HealthKit stores the fraction (0.18 = 18 %).
        fatPct: f ? Math.round(f.quantity * 1000) / 10 : undefined,
        source: r.sourceRevision?.source.name,
      };
    });
};

export const readRecovery = async (): Promise<HealthRecovery> => {
  const [hr, sleep] = await Promise.all([
    samples(RESTING_HR, 'count/min', 7, 1),
    safe(
      lib().queryCategorySamples(SLEEP, {
        filter: since(2),
        limit: 0,
        ascending: false,
      }),
    ),
  ]);
  // Last night: asleep stages ending after 6 pm yesterday. Apple Watch
  // writes stages (core, deep, REM); other apps a single "asleep".
  const from = dayStart(dayKey()) - 6 * 3600_000;
  const asleep = asleepMinutes(
    (sleep ?? [])
      .filter(x => Number(x.value) !== 0 && Number(x.value) !== 2)
      .map(x => [x.startDate.getTime(), x.endDate.getTime()]),
    from,
  );
  const bpm = hr[0]?.quantity;
  return {
    restingHr: bpm ? Math.round(bpm) : undefined,
    sleepMin: asleep > 0 ? Math.round(asleep) : undefined,
  };
};
