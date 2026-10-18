/**
 * Apple Health (iOS): steps and active energy for a day; workouts and
 * weigh-ins written back. The library is loaded lazily so other platforms
 * (and tests) never touch it. Requires the HealthKit capability in Xcode.
 */
import { Linking } from 'react-native';
import type { HealthDay } from '../nutrition/energy';
import type { BodyEntry, Session } from '../core/types';
import { dayStart, DAY_MS } from '../core/dates';

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
const WORKOUT = 'HKWorkoutTypeIdentifier' as const;

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
      toRead: [STEPS, ACTIVE],
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
