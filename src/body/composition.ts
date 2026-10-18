/**
 * Body composition estimate from weight + bio-impedance, using the formulas
 * reverse-engineered from the Mi Body Composition Scale and documented by the
 * openScale community. Results are estimates, like the ones of the official app.
 */
import { Sex } from '../core/types';

export interface CompositionInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  impedance: number;
}

export interface Composition {
  fatPct: number;
  muscleKg: number;
  waterPct: number;
  boneKg: number;
  visceralFat: number;
  bmrKcal: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Lean body mass coefficient. */
const lbmCoefficient = ({
  heightCm: h,
  weightKg: w,
  impedance: imp,
  age,
}: CompositionInput): number =>
  ((h * 9.058) / 100) * (h / 100) +
  w * 0.32 +
  12.226 -
  imp * 0.0068 -
  age * 0.0542;

export const fatPercentage = (i: CompositionInput): number => {
  const female = i.sex === 'female';
  const constant = female ? (i.age <= 49 ? 9.25 : 7.25) : 0.8;
  let coefficient = 1;
  if (!female && i.weightKg < 61) coefficient = 0.98;
  else if (female && i.weightKg > 60)
    coefficient = i.heightCm > 160 ? 0.96 * 1.03 : 0.96;
  else if (female && i.weightKg < 50)
    coefficient = i.heightCm > 160 ? 1.02 * 1.03 : 1.02;
  const fat =
    (1 - ((lbmCoefficient(i) - constant) * coefficient) / i.weightKg) * 100;
  return clamp(fat, 5, 75);
};

export const boneMass = (i: CompositionInput): number => {
  const base = i.sex === 'female' ? 0.245691014 : 0.18016894;
  let bone = (base - lbmCoefficient(i) * 0.05158) * -1;
  bone = bone > 2.2 ? bone + 0.1 : bone - 0.1;
  return clamp(bone, 0.5, 8);
};

export const waterPercentage = (fatPct: number): number => {
  const water = (100 - fatPct) * 0.7;
  return clamp(water * (water <= 50 ? 1.02 : 0.98), 35, 75);
};

export const bmr = ({
  sex,
  weightKg: w,
  heightCm: h,
  age,
}: CompositionInput): number => {
  const v =
    sex === 'female'
      ? 864.6 + w * 10.2036 - h * 0.39336 - age * 6.204
      : 877.8 + w * 14.916 - h * 0.726 - age * 8.976;
  return clamp(v, 500, 5000);
};

export const visceralFat = ({
  sex,
  weightKg: w,
  heightCm: h,
  age,
}: CompositionInput): number => {
  let v: number;
  if (sex === 'female') {
    if (w > (13 - h * 0.5) * -1) {
      const sub = h * 1.45 + h * 0.1158 * h - 120;
      v = (w * 500) / sub - 6 + age * 0.07;
    } else {
      const sub = 0.691 + h * -0.0024 + h * -0.0024;
      v = (h * 0.027 - sub * w) * -1 + age * 0.07 - age;
    }
  } else if (h < w * 1.6) {
    const sub = (h * 0.4 - h * (h * 0.0826)) * -1;
    v = (w * 305) / (sub + 48) - 2.9 + age * 0.15;
  } else {
    const sub = 0.765 + h * -0.0015;
    v = (h * 0.143 - w * sub) * -1 + age * 0.15 - 5;
  }
  return clamp(v, 1, 50);
};

export const computeComposition = (i: CompositionInput): Composition => {
  const fat = fatPercentage(i);
  const bone = boneMass(i);
  return {
    fatPct: r1(fat),
    muscleKg: r1(clamp(i.weightKg - (fat / 100) * i.weightKg - bone, 10, 120)),
    waterPct: r1(waterPercentage(fat)),
    boneKg: r1(bone),
    visceralFat: Math.round(visceralFat(i)),
    bmrKcal: Math.round(bmr(i)),
  };
};
