/**
 * Pure helpers for the data read from Health Connect / Apple Health:
 * which weigh-ins to import, which profile fields to fill, minutes asleep.
 */
import type { BodyEntry, Profile } from '../core/types';
import type { HealthProfile, HealthWeighIn } from '../services/healthNative';

/** Identifies an imported weigh-in, so a deleted one isn't imported again. */
export const weighInKey = (w: { date: string; weightKg: number }): string =>
  `${w.date.slice(0, 16)}|${w.weightKg.toFixed(1)}`;

const NEAR_MS = 10 * 60_000;

/** Weigh-ins from other apps that aren't in the diary yet. */
export const newWeighIns = (
  body: BodyEntry[],
  incoming: HealthWeighIn[],
  ignored: string[] = [],
): Omit<BodyEntry, 'id'>[] => {
  const skip = new Set(ignored);
  const known = body.map(b => ({ t: Date.parse(b.date), w: b.weightKg }));
  const out: Omit<BodyEntry, 'id'>[] = [];
  for (const w of incoming) {
    const t = Date.parse(w.date);
    if (!Number.isFinite(t) || !(w.weightKg > 0) || skip.has(weighInKey(w)))
      continue;
    // Already there: imported before, or the same weigh-in seen by two apps
    // (the Mi Scale read here and by Zepp Life).
    if (
      known.some(
        k => Math.abs(k.t - t) < NEAR_MS && Math.abs(k.w - w.weightKg) < 0.5,
      )
    )
      continue;
    known.push({ t, w: w.weightKg });
    out.push({
      date: w.date,
      weightKg: w.weightKg,
      source: 'health',
      ...(w.source ? { sourceApp: w.source } : {}),
      ...(w.fatPct != null ? { fatPct: w.fatPct } : {}),
    });
  }
  return out;
};

/** Profile fields the user left empty that the health app knows. */
export const profileGaps = (p: Profile, h: HealthProfile): Partial<Profile> => {
  const out: Partial<Profile> = {};
  if (!p.heightCm && h.heightCm && h.heightCm >= 100 && h.heightCm <= 250)
    out.heightCm = h.heightCm;
  if (!p.birthDate && h.birthDate) out.birthDate = h.birthDate;
  if (!p.sex && h.sex) out.sex = h.sex;
  return out;
};

/**
 * Minutes asleep in the intervals ending after `from`. Overlaps (phone and
 * watch both tracking the night) count once.
 */
export const asleepMinutes = (
  intervals: [number, number][],
  from: number,
): number => {
  const list = intervals
    .filter(([s, e]) => e > from && e > s)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let end = -Infinity;
  for (const [s, e] of list) {
    if (e <= end) continue;
    total += e - Math.max(s, end);
    end = e;
  }
  return Math.round(total / 60_000);
};

/** Short advice for the day from last night's sleep. */
export const sleepHint = (min?: number): string | undefined => {
  if (min == null) return undefined;
  if (min < 5 * 60) return 'Hai dormito poco: oggi meglio carichi leggeri.';
  if (min < 6.5 * 60) return 'Sonno un po’ corto: ascolta le sensazioni.';
  return undefined;
};
