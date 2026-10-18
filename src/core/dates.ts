export const DAY_MS = 86400000;

/** Monday 00:00 of the week containing `t` (local time). */
export const startOfWeek = (t: number | Date): number => {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
};

export const startOfDay = (t: number | Date): number => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const addDays = (t: number, n: number): number => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
};

/** Age in whole years from a yyyy-mm-dd birth date. */
export const ageFrom = (
  birthDate: string | undefined,
  now = new Date(),
): number | undefined => {
  if (!birthDate) return undefined;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return undefined;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : undefined;
};

export type RangeKey = '1M' | '3M' | '6M' | '1A' | 'Tutto';
export const RANGE_KEYS: RangeKey[] = ['1M', '3M', '6M', '1A', 'Tutto'];

/** Start timestamp of a time range ending now. */
export const rangeStart = (r: RangeKey, now = Date.now()): number => {
  const d = new Date(now);
  switch (r) {
    case '1M':
      return new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()).getTime();
    case '3M':
      return new Date(d.getFullYear(), d.getMonth() - 3, d.getDate()).getTime();
    case '6M':
      return new Date(d.getFullYear(), d.getMonth() - 6, d.getDate()).getTime();
    case '1A':
      return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()).getTime();
    default:
      return 0;
  }
};

/** Parse "HH:MM" → { h, m }. */
export const parseHM = (s: string): { h: number; m: number } => {
  const [h, m] = s.split(':').map(x => parseInt(x, 10));
  return { h: Number.isFinite(h) ? h : 8, m: Number.isFinite(m) ? m : 0 };
};

/** Local calendar day as 'yyyy-mm-dd' (food diary key). */
export const dayKey = (t: number | Date = Date.now()): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 'yyyy-mm-dd' → local midnight timestamp. */
export const dayStart = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
