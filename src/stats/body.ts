import { BodyEntry, MeasureEntry, MeasureKey, Profile } from '../core/types';
import { DAY_MS, ageFrom } from '../core/dates';
import { Composition, computeComposition } from '../body/composition';
import { Point } from './progress';

/** Trailing moving average over `days` (time-based, robust to gaps). */
export const movingAverage = (points: Point[], days = 7): Point[] => {
  const win = days * DAY_MS;
  const out: Point[] = [];
  let start = 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += points[i].v;
    while (points[i].t - points[start].t > win) {
      sum -= points[start].v;
      start++;
    }
    out.push({ t: points[i].t, v: sum / (i - start + 1) });
  }
  return out;
};

export const weightPoints = (body: BodyEntry[]): Point[] =>
  body
    .map(e => ({ t: Date.parse(e.date), v: e.weightKg }))
    .filter(p => Number.isFinite(p.t));

/** Value of the series at (or just before) time t. */
const valueAt = (pts: Point[], t: number): number | undefined => {
  let v: number | undefined;
  for (const p of pts) {
    if (p.t <= t) v = p.v;
    else break;
  }
  return v;
};

/** Change of the smoothed weight over the last `days`. */
export const weightChange = (
  body: BodyEntry[],
  days: number,
  now = Date.now(),
): number | null => {
  const avg = movingAverage(weightPoints(body));
  if (avg.length < 2) return null;
  const from = valueAt(avg, now - days * DAY_MS);
  const to = avg[avg.length - 1].v;
  return from == null ? null : to - from;
};

/** Least-squares slope over the last `days`, expressed as kg per week. */
export const weeklyRate = (
  body: BodyEntry[],
  days = 28,
  now = Date.now(),
): number | null => {
  const pts = weightPoints(body).filter(p => p.t >= now - days * DAY_MS);
  if (pts.length < 3 || pts[pts.length - 1].t - pts[0].t < 7 * DAY_MS)
    return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.t, 0) / n;
  const my = pts.reduce((s, p) => s + p.v, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.t - mx) * (p.v - my);
    den += (p.t - mx) ** 2;
  }
  return den ? (num / den) * 7 * DAY_MS : null;
};

export const bmi = (
  weightKg: number,
  heightCm: number | undefined,
): number | null =>
  heightCm && heightCm > 0 ? weightKg / (heightCm / 100) ** 2 : null;

/**
 * Completes a weigh-in with everything derivable from it: BMI from the
 * height and, when the scale sent the impedance, the full composition (with
 * the age on the day of the weigh-in). Values already saved are kept.
 */
export const enrichBodyEntry = <E extends Omit<BodyEntry, 'id'>>(
  e: E,
  profile: Profile,
): E => {
  const out: E = { ...e };
  const { heightCm, sex } = profile;
  if (out.bmi == null && heightCm)
    out.bmi = Math.round(bmi(e.weightKg, heightCm)! * 10) / 10;
  const age = ageFrom(profile.birthDate, new Date(e.date));
  if (e.impedance && sex && heightCm && age != null) {
    const comp = computeComposition({
      weightKg: e.weightKg,
      heightCm,
      age,
      sex,
      impedance: e.impedance,
    });
    for (const k of Object.keys(comp) as (keyof Composition)[])
      if (out[k] == null) out[k] = comp[k];
  }
  return out;
};

export const bmiCategory = (v: number): string => {
  if (v < 18.5) return 'Sottopeso';
  if (v < 25) return 'Normopeso';
  if (v < 30) return 'Sovrappeso';
  return 'Obesità';
};

export const MEASURE_LABEL: Record<MeasureKey, string> = {
  waist: 'Vita',
  chest: 'Petto',
  hips: 'Fianchi',
  arm: 'Braccio',
  thigh: 'Coscia',
  calf: 'Polpaccio',
  neck: 'Collo',
};

export const MEASURE_KEYS: MeasureKey[] = [
  'waist',
  'chest',
  'hips',
  'arm',
  'thigh',
  'calf',
  'neck',
];

/** Latest value and change vs the previous entry, per measure. */
export const latestMeasures = (entries: MeasureEntry[]) =>
  MEASURE_KEYS.map(k => {
    const vals = entries
      .filter(e => e.values[k] != null)
      .map(e => ({ t: Date.parse(e.date), v: e.values[k]! }));
    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    return {
      key: k,
      label: MEASURE_LABEL[k],
      last,
      delta: last && prev ? last.v - prev.v : null,
      series: vals,
    };
  }).filter(m => m.last);

export type CompositionKey =
  | 'fatPct'
  | 'fatMassKg'
  | 'leanMassKg'
  | 'muscleKg'
  | 'waterPct'
  | 'proteinPct'
  | 'boneKg'
  | 'visceralFat'
  | 'bmrKcal'
  | 'metabolicAge'
  | 'bmi';

export const COMPOSITION: {
  key: CompositionKey;
  label: string;
  unit: string;
  decimals: number;
}[] = [
  { key: 'fatPct', label: 'Massa grassa', unit: '%', decimals: 1 },
  { key: 'fatMassKg', label: 'Grasso', unit: 'kg', decimals: 1 },
  { key: 'muscleKg', label: 'Massa muscolare', unit: 'kg', decimals: 1 },
  { key: 'leanMassKg', label: 'Massa magra', unit: 'kg', decimals: 1 },
  { key: 'waterPct', label: 'Acqua', unit: '%', decimals: 1 },
  { key: 'proteinPct', label: 'Proteine', unit: '%', decimals: 1 },
  { key: 'boneKg', label: 'Massa ossea', unit: 'kg', decimals: 1 },
  { key: 'visceralFat', label: 'Grasso viscerale', unit: '', decimals: 0 },
  { key: 'bmrKcal', label: 'Metabolismo basale', unit: 'kcal', decimals: 0 },
  { key: 'metabolicAge', label: 'Età metabolica', unit: 'anni', decimals: 0 },
];

/** Every metric a weigh-in can hold, BMI included (charts, details). */
export const BODY_METRICS: typeof COMPOSITION = [
  ...COMPOSITION,
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1 },
];

export const compositionPoints = (
  body: BodyEntry[],
  key: CompositionKey,
): Point[] =>
  body
    .filter(e => e[key] != null)
    .map(e => ({ t: Date.parse(e.date), v: e[key] as number }));
