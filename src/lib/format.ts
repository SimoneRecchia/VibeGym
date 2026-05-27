import { Reps, Weight, WeightUnit } from './types';

const UNIT_LABEL: Record<WeightUnit, string> = {
  kg: 'kg',
  lb: 'lb',
  bw: 'BW',
};

/**
 * Pretty-print a weight. Bodyweight with no added load shows as
 * "corpo libero"; bodyweight + extra renders as "BW +10 kg".
 */
export const formatWeight = (w: Weight | null | undefined): string => {
  if (!w) return '';
  if (w.unit === 'bw') {
    if (!w.value) return 'corpo libero';
    return `BW +${stripTrailingZero(w.value)} kg`;
  }
  return `${stripTrailingZero(w.value)} ${UNIT_LABEL[w.unit]}`;
};

export const formatReps = (r: Reps | undefined): string => {
  if (!r) return '';
  switch (r.kind) {
    case 'fixed':
      return String(r.value);
    case 'range':
      return `${r.min}-${r.max}`;
    case 'amrap':
      return 'AMRAP';
    case 'time':
      return formatDuration(r.sec);
  }
};

export const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
};

const stripTrailingZero = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
};

/* ------------------------------------------------------------------ */
/* Parsing — used by the legacy v1 → v2 migrator and by free-form     */
/* user input in the weight editor.                                    */
/* ------------------------------------------------------------------ */

const WEIGHT_RE = /(-?\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilogrammi|lb|lbs|pound|pounds)?/i;

export const parseWeightString = (raw: string | undefined, fallbackUnit: WeightUnit = 'kg'): Weight | null => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (
    /corpo\s*libero|body\s*weight|^bw$|peso\s*corporeo/.test(lower) &&
    !WEIGHT_RE.test(s)
  ) {
    return { value: 0, unit: 'bw' };
  }
  if (/^bw\s*\+/.test(lower)) {
    const m = lower.match(/bw\s*\+\s*(-?\d+(?:[.,]\d+)?)/);
    if (m) return { value: parseFloat(m[1].replace(',', '.')), unit: 'bw' };
  }
  const m = s.match(WEIGHT_RE);
  if (!m) return null;
  const value = parseFloat(m[1].replace(',', '.'));
  const unitWord = m[2]?.toLowerCase();
  let unit: WeightUnit = fallbackUnit;
  if (unitWord && /lb|pound/.test(unitWord)) unit = 'lb';
  else if (unitWord && /kg|kilo/.test(unitWord)) unit = 'kg';
  return Number.isFinite(value) ? { value, unit } : null;
};

export const parseRepsString = (raw: string | number | undefined, durataSec?: number): Reps | undefined => {
  if (typeof durataSec === 'number' && durataSec > 0) {
    return { kind: 'time', sec: durataSec };
  }
  if (raw == null) return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { kind: 'fixed', value: raw };
  }
  const s = String(raw).trim();
  if (!s) return undefined;
  if (/^amrap$/i.test(s) || /max/i.test(s)) return { kind: 'amrap' };
  const range = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    return { kind: 'range', min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }
  const fixed = s.match(/^(\d+)$/);
  if (fixed) {
    return { kind: 'fixed', value: parseInt(fixed[1], 10) };
  }
  const time = s.match(/^(\d+)\s*s$/i);
  if (time) return { kind: 'time', sec: parseInt(time[1], 10) };
  // Fallback: ignore unrecognized formats
  return undefined;
};

/** Convert any Reps to its target rep count (for charts / volume calc). */
export const repsTarget = (r: Reps | undefined): number => {
  if (!r) return 0;
  switch (r.kind) {
    case 'fixed':
      return r.value;
    case 'range':
      return Math.round((r.min + r.max) / 2);
    case 'amrap':
      return 0; // unknown — treat as 0 for planned volume
    case 'time':
      return 0;
  }
};

/** Convert a Weight to kg for cross-unit comparisons / charts. */
export const weightInKg = (w: Weight | null | undefined): number | null => {
  if (!w) return null;
  if (w.unit === 'kg') return w.value;
  if (w.unit === 'lb') return w.value * 0.45359237;
  // Bodyweight is unknowable without user data; treat the added load as kg
  return w.value;
};
