/**
 * Weigh-in schedule: "every N days / weeks / months", counted in calendar
 * days from the last weigh-in.
 */
import { IntervalUnit, WeighSchedule } from '../core/types';
import { parseHM, startOfDay } from '../core/dates';

export const addInterval = (
  t: number,
  every: number,
  unit: IntervalUnit,
): number => {
  const d = new Date(t);
  const n = Math.max(1, Math.round(every));
  if (unit === 'day') d.setDate(d.getDate() + n);
  else if (unit === 'week') d.setDate(d.getDate() + 7 * n);
  else {
    // Keep the day of month when possible (31 Jan + 1 month → 28/29 Feb).
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return d.getTime();
};

/** Start of the day the next weigh-in is due; null = never weighed (due now). */
export const nextWeighDue = (
  lastIso: string | undefined,
  s: Pick<WeighSchedule, 'every' | 'unit'>,
): number | null =>
  lastIso ? addInterval(startOfDay(new Date(lastIso)), s.every, s.unit) : null;

export const isWeighDue = (
  lastIso: string | undefined,
  s: Pick<WeighSchedule, 'every' | 'unit'>,
  now = Date.now(),
): boolean => {
  const due = nextWeighDue(lastIso, s);
  return due == null || startOfDay(now) >= due;
};

/** When to send the push reminder: due day at `hm`, never in the past. */
export const weighReminderAt = (
  lastIso: string | undefined,
  s: Pick<WeighSchedule, 'every' | 'unit'>,
  hm: string,
  now = Date.now(),
): number => {
  const { h, m } = parseHM(hm);
  const at = (day: number) => {
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const due = nextWeighDue(lastIso, s) ?? startOfDay(now);
  let t = at(Math.max(due, startOfDay(now)));
  if (t <= now) t = at(addInterval(startOfDay(now), 1, 'day'));
  return t;
};

const UNIT_ONE: Record<IntervalUnit, string> = {
  day: 'Ogni giorno',
  week: 'Ogni settimana',
  month: 'Ogni mese',
};
const UNIT_MANY: Record<IntervalUnit, string> = {
  day: 'giorni',
  week: 'settimane',
  month: 'mesi',
};

export const fmtInterval = (s: Pick<WeighSchedule, 'every' | 'unit'>) =>
  s.every <= 1 ? UNIT_ONE[s.unit] : `Ogni ${s.every} ${UNIT_MANY[s.unit]}`;

export const UNIT_LABEL = UNIT_MANY;
