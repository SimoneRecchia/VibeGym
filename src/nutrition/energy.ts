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
  /** Active (non-basal) energy, kcal: wearables that track all day. */
  activeKcal?: number;
  /**
   * Total energy, kcal. All-day for some sources (Fitbit, Google), only
   * the exercise sessions for others (Samsung Health): told apart by size.
   */
  totalKcal?: number;
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
  /** Share of the day already elapsed (1 for past days). */
  elapsed?: number;
}): DayEnergy => {
  const { profile, sessions, health } = opts;
  const elapsed = Math.min(1, Math.max(0.01, opts.elapsed ?? 1));
  const kg = opts.weightKg ?? profile.goalWeightKg ?? 70;
  const basal = Math.round(
    opts.scaleBmr ??
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

  // A total close to the basal burn so far is an all-day figure (it already
  // contains basal energy); a smaller one only covers exercise sessions.
  const total = health?.totalKcal ?? 0;
  const basalSoFar = basal * elapsed;
  const allDayTotal = total > basalSoFar * 0.8 ? total - basalSoFar : 0;
  const exerciseTotal = total && !allDayTotal ? total : 0;

  const assumed =
    steps == null && health?.activeKcal == null && !health?.totalKcal;
  // Without any step data assume a light everyday activity (PAL ≈ 1.2).
  const estimate =
    (assumed ? Math.round(basal * 0.2) : stepsKcal) +
    Math.max(wk, exerciseTotal);
  const measured = Math.max(health?.activeKcal ?? 0, allDayTotal);
  const fromHealth = measured > estimate;
  const active = Math.round(fromHealth ? measured : estimate);
  return {
    basal,
    steps,
    stepsKcal,
    workoutKcal: Math.max(wk, Math.round(exerciseTotal)),
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
