import { RepUnit, Reps, Weight, WeightUnit } from './types';

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
  // 0 (any unit) is interpreted as bodyweight — the front-end renders it so.
  if (!w.value) return 'corpo libero';
  if (w.unit === 'bw') return `BW +${stripTrailingZero(w.value)} kg`;
  return `${stripTrailingZero(w.value)} ${UNIT_LABEL[w.unit]}`;
};

/** Suffix shown after a rep value, by unit ('times' has none). */
export const REP_UNIT_SUFFIX: Record<RepUnit, string> = {
  times: '',
  seconds: 's',
  minutes: 'min',
};

/** True when a rep target means "as many as possible". */
export const isAmrap = (r: Reps | null | undefined): boolean =>
  !!r && (r.value == null || r.value === 0);

/** Render just the numeric part of a rep value with its unit ("12", "30s"). */
export const formatRepValue = (value: number | null, unit: RepUnit): string => {
  if (value == null || value === 0) return 'AMRAP';
  return `${value}${REP_UNIT_SUFFIX[unit]}`;
};

export const formatReps = (r: Reps | undefined): string => {
  if (!r) return '';
  return formatRepValue(r.value, r.unit);
};

export const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
};

/* ------------------------------------------------------------------ */
/* Date formatting — done manually (NOT via Intl / toLocaleDateString) */
/* because Hermes' Intl support for `it-IT` + options is unreliable on  */
/* device and left dates looking raw/unformatted.                      */
/* ------------------------------------------------------------------ */

const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const WEEKDAYS_NARROW = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

const toDate = (d: Date | string): Date | null => {
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** e.g. "12 lug 2026" (omit year with { year: false }). */
export const formatDate = (d: Date | string, opts?: { year?: boolean }): string => {
  const date = toDate(d);
  if (!date) return '';
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  return opts?.year === false ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
};

/** e.g. "14:30". */
export const formatTime = (d: Date | string): string => {
  const date = toDate(d);
  if (!date) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

/** e.g. "12 lug 2026, 14:30". */
export const formatDateTime = (d: Date | string): string => {
  const date = toDate(d);
  if (!date) return '';
  return `${formatDate(date)}, ${formatTime(date)}`;
};

/** Single-letter Italian weekday (D L M M G V S). */
export const weekdayNarrow = (d: Date | string): string => {
  const date = toDate(d);
  if (!date) return '';
  return WEEKDAYS_NARROW[date.getDay()];
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

const isRepUnit = (u: unknown): u is RepUnit =>
  u === 'times' || u === 'seconds' || u === 'minutes';

/**
 * Coerce any legacy or loose rep representation into the typed {value, unit}
 * shape. Handles:
 *   - the new object shape { value, unit }
 *   - the legacy v2 tagged union { kind: 'fixed'|'range'|'amrap'|'time', ... }
 *   - plain numbers and strings ("12", "8-10", "AMRAP", "30s", "2min")
 *   - a legacy `durata_sec` (seconds) that wins when present
 * Ranges collapse to their MAX (the number you aim for). Anything unrecognised
 * returns undefined. `value` is always rounded to an integer or null (AMRAP).
 */
export const coerceReps = (raw: unknown, durataSec?: number): Reps | undefined => {
  if (typeof durataSec === 'number' && durataSec > 0) {
    return { value: Math.round(durataSec), unit: 'seconds' };
  }
  if (raw == null) return undefined;

  // New shape { value, unit }
  if (typeof raw === 'object' && 'unit' in (raw as Record<string, unknown>)) {
    const r = raw as { value?: unknown; unit?: unknown };
    const unit: RepUnit = isRepUnit(r.unit) ? r.unit : 'times';
    if (r.value == null) return { value: null, unit };
    const v = Math.round(Number(r.value));
    return Number.isFinite(v) && v > 0 ? { value: v, unit } : { value: null, unit };
  }

  // Legacy v2 tagged union { kind: ... }
  if (typeof raw === 'object' && 'kind' in (raw as Record<string, unknown>)) {
    const r = raw as { kind: string; value?: number; min?: number; max?: number; sec?: number };
    switch (r.kind) {
      case 'fixed':
        return { value: Math.round(r.value ?? 0) || null, unit: 'times' };
      case 'range':
        return { value: Math.round(r.max ?? r.min ?? 0) || null, unit: 'times' };
      case 'amrap':
        return { value: null, unit: 'times' };
      case 'time':
        return { value: Math.round(r.sec ?? 0) || null, unit: 'seconds' };
      default:
        return undefined;
    }
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: Math.round(raw), unit: 'times' };
  }

  const s = String(raw).trim().toLowerCase();
  if (!s) return undefined;
  if (/amrap|max/.test(s)) return { value: null, unit: 'times' };
  const min = s.match(/^(\d+)\s*(?:m|min|minuti|minutes)$/);
  if (min) return { value: parseInt(min[1], 10), unit: 'minutes' };
  const sec = s.match(/^(\d+)\s*(?:s|sec|secondi|seconds)$/);
  if (sec) return { value: parseInt(sec[1], 10), unit: 'seconds' };
  const range = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) return { value: parseInt(range[2], 10), unit: 'times' };
  const fixed = s.match(/^(\d+)$/);
  if (fixed) return { value: parseInt(fixed[1], 10), unit: 'times' };
  return undefined;
};

/** Target rep count for charts / volume (0 for AMRAP / time-based). */
export const repsTarget = (r: Reps | undefined): number => {
  if (!r || r.value == null) return 0;
  return r.unit === 'times' ? r.value : 0;
};

/** True for time-based targets (plank, holds…). */
export const isTimedReps = (r: Reps | undefined): boolean =>
  !!r && (r.unit === 'seconds' || r.unit === 'minutes');

/** Convert a time-based rep target to seconds (0 otherwise). */
export const repsToSeconds = (r: Reps | undefined): number => {
  if (!r || r.value == null) return 0;
  if (r.unit === 'minutes') return r.value * 60;
  if (r.unit === 'seconds') return r.value;
  return 0;
};

/** Convert a Weight to kg for cross-unit comparisons / charts. */
export const weightInKg = (w: Weight | null | undefined): number | null => {
  if (!w) return null;
  if (w.unit === 'kg') return w.value;
  if (w.unit === 'lb') return w.value * 0.45359237;
  // Bodyweight is unknowable without user data; treat the added load as kg
  return w.value;
};
