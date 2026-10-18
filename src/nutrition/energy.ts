/**
 * Daily energy: basal metabolism + activity, and the calorie / macro targets
 * that follow from the user's goal.
 *
 *  - Basal: Mifflin-St Jeor (or the scale's BMR when recent).
 *  - Steps: net walking cost ≈ 0.5 kcal per kg per km, stride from height.
 *  - Workouts: net MET (3.5 − 1) × kg × hours, Compendium 2024 (02054).
 *  - A wearable's active energy, when higher, replaces the estimate: it
 *    already contains steps and workouts, so nothing is counted twice.
 */
import { NutritionGoals, Profile, Session, Sex } from '../core/types';
import { ageFrom } from '../core/dates';

export const bmrMifflin = (
  kg: number,
  cm: number | undefined,
  age: number | undefined,
  sex: Sex | undefined,
): number => {
  const h = cm ?? (sex === 'female' ? 163 : 176);
  const a = age ?? 35;
  const s = sex === 'female' ? -161 : sex === 'male' ? 5 : -78;
  return Math.round(10 * kg + 6.25 * h - 5 * a + s);
};

export const kcalPerStep = (kg: number, cm?: number, sex?: Sex): number => {
  const stride = ((cm ?? 172) / 100) * (sex === 'female' ? 0.413 : 0.415);
  return 0.0005 * kg * stride;
};

const STRENGTH_MET = 3.5;

export const workoutKcal = (durationSec: number, kg: number): number =>
  Math.round((STRENGTH_MET - 1) * kg * (durationSec / 3600));

export interface HealthDay {
  steps?: number;
  /** Active (non-basal) energy from the platform, kcal. */
  activeKcal?: number;
  /** Basal energy reported by the platform, kcal. */
  basalKcal?: number;
  /** Where the numbers come from, e.g. "Health Connect". */
  source?: string;
}

export interface DayEnergy {
  basal: number;
  steps?: number;
  stepsKcal: number;
  workoutKcal: number;
  workouts: number;
  /** Activity counted in the total (estimate or wearable). */
  active: number;
  total: number;
  /** Active energy taken from Health rather than estimated. */
  fromHealth: boolean;
  /** No step data at all: a light everyday activity is assumed. */
  assumed: boolean;
}

export const dayEnergy = (opts: {
  profile: Profile;
  weightKg?: number;
  scaleBmr?: number;
  sessions: Session[];
  health?: HealthDay;
}): DayEnergy => {
  const { profile, sessions, health } = opts;
  const kg = opts.weightKg ?? profile.goalWeightKg ?? 70;
  const basal = Math.round(
    health?.basalKcal && health.basalKcal > 800
      ? health.basalKcal
      : opts.scaleBmr ??
          bmrMifflin(
            kg,
            profile.heightCm,
            ageFrom(profile.birthDate) ?? undefined,
            profile.sex,
          ),
  );
  const steps = health?.steps;
  const stepsKcal =
    steps != null
      ? Math.round(steps * kcalPerStep(kg, profile.heightCm, profile.sex))
      : 0;
  const wk = sessions.reduce((a, s) => a + workoutKcal(s.durationSec, kg), 0);
  const assumed = steps == null && health?.activeKcal == null;
  // Without any step data assume a light everyday activity (PAL ≈ 1.2).
  const estimate = (assumed ? Math.round(basal * 0.2) : stepsKcal) + wk;
  const fromHealth = (health?.activeKcal ?? 0) > estimate;
  const active = fromHealth ? Math.round(health!.activeKcal!) : estimate;
  return {
    basal,
    steps,
    stepsKcal,
    workoutKcal: wk,
    workouts: sessions.length,
    active,
    total: basal + active,
    fromHealth,
    assumed,
  };
};

/** kcal per day to lose / gain `rate` kg per week (7700 kcal ≈ 1 kg). */
export const goalOffset = (g: Pick<NutritionGoals, 'goal' | 'rate'>) =>
  g.goal === 'maintain'
    ? 0
    : Math.round(((g.goal === 'lose' ? -1 : 1) * g.rate * 7700) / 7);

const FLOOR = 1200;

/**
 * Calorie target for a day. `burn` is the day's expenditure (adaptive) and
 * `typical` the usual one (non adaptive): both include basal metabolism.
 */
export const kcalTarget = (
  g: NutritionGoals,
  burn: { day: number; typical: number },
): number => {
  if (g.macroMode === 'g')
    return Math.round(
      4 * g.grams.protein + 4 * g.grams.carbs + 9 * g.grams.fat,
    );
  if (g.mode === 'manual') return Math.round(g.kcal);
  const base = g.adaptive ? burn.day : burn.typical;
  return Math.max(FLOOR, Math.round((base + goalOffset(g)) / 10) * 10);
};

export const macroTargets = (g: NutritionGoals, kcal: number) =>
  g.macroMode === 'g'
    ? { ...g.grams }
    : {
        protein: Math.round((kcal * g.pct.protein) / 100 / 4),
        carbs: Math.round((kcal * g.pct.carbs) / 100 / 4),
        fat: Math.round((kcal * g.pct.fat) / 100 / 9),
      };

export const MACRO_PRESETS: {
  key: string;
  label: string;
  pct: NutritionGoals['pct'];
}[] = [
  {
    key: 'balanced',
    label: 'Bilanciata',
    pct: { protein: 25, carbs: 50, fat: 25 },
  },
  { key: 'sport', label: 'Sportiva', pct: { protein: 30, carbs: 40, fat: 30 } },
  {
    key: 'high-protein',
    label: 'Iperproteica',
    pct: { protein: 40, carbs: 30, fat: 30 },
  },
  {
    key: 'low-carb',
    label: 'Low carb',
    pct: { protein: 35, carbs: 20, fat: 45 },
  },
];
