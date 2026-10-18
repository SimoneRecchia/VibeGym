import { DisplayUnit } from './types';
import { fmtNum } from './format';

export const LB_PER_KG = 2.2046226218;

/** kg → display unit value. */
export const toDisplay = (kg: number, unit: DisplayUnit): number =>
  unit === 'lb' ? kg * LB_PER_KG : kg;

/** display unit value → kg. */
export const fromDisplay = (v: number, unit: DisplayUnit): number =>
  unit === 'lb' ? v / LB_PER_KG : v;

/** Round to the nearest step (2.5 kg plates, 0.5 lb…). */
export const roundTo = (v: number, step: number): number =>
  step > 0 ? Math.round(v / step) * step : v;

/** "62,5 kg" / "137,5 lb" / "Corpo libero". */
export const fmtLoad = (
  kg: number | undefined,
  unit: DisplayUnit,
  opts?: { bodyweightLabel?: string },
): string => {
  if (!kg) return opts?.bodyweightLabel ?? 'Corpo libero';
  return `${fmtNum(toDisplay(kg, unit), 1)} ${unit}`;
};

/** Load number only (no unit), for tight table cells. */
export const fmtLoadValue = (
  kg: number | undefined,
  unit: DisplayUnit,
): string => (kg ? fmtNum(toDisplay(kg, unit), 1) : '0');

export const fmtBodyWeight = (kg: number, unit: DisplayUnit): string =>
  `${fmtNum(toDisplay(kg, unit), 1)} ${unit}`;

/** Parse user input like "62,5" or "62.5". Returns null when not a number. */
export const parseDecimal = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
};
