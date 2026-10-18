/* eslint-disable no-bitwise */
/**
 * Bluetooth heart-rate sensors: chest straps (Polar, Garmin, Wahoo, Coospo,
 * Decathlon…) and watches broadcasting the heart rate all expose the
 * standard Heart Rate service (0x180D). Its measurement characteristic
 * (0x2A37) notifies [flags, bpm (uint8 or uint16 LE), …].
 */
import type { Sex } from '../core/types';

export const HR_SERVICE = '180D';
export const HR_MEASUREMENT = '2A37';

/** Matches a short UUID against its short or full 128-bit form. */
export const isUuid = (uuid: string, short: string): boolean => {
  const u = uuid.toLowerCase();
  const s = short.toLowerCase();
  return u === s || u.startsWith(`0000${s}-`);
};

/** bpm from a Heart Rate Measurement value, or null if implausible. */
export const parseHeartRate = (b: number[]): number | null => {
  if (b.length < 2) return null;
  const wide = (b[0] & 0x01) !== 0;
  if (wide && b.length < 3) return null;
  const bpm = wide ? b[1] | (b[2] << 8) : b[1];
  return bpm >= 25 && bpm <= 240 ? bpm : null;
};

/** Maximum heart rate (Tanaka: 208 − 0.7 × age). */
export const maxHeartRate = (age?: number): number =>
  Math.round(208 - 0.7 * (age ?? 35));

/** Zone 0–5 by percentage of the maximum (50, 60, 70, 80, 90 %). */
export const hrZone = (bpm: number, max: number): number => {
  const p = bpm / max;
  if (p >= 0.9) return 5;
  if (p >= 0.8) return 4;
  if (p >= 0.7) return 3;
  if (p >= 0.6) return 2;
  if (p >= 0.5) return 1;
  return 0;
};

export interface HeartRateSummary {
  avg: number;
  max: number;
  /** Energy from the heart rate (Keytel 2005), kcal. */
  kcal?: number;
  /** Average bpm every 30 s, for the chart. */
  series?: number[];
}

/**
 * kcal per minute at a heart rate (Keytel et al. 2005), for adults
 * exercising between ~90 and ~180 bpm.
 */
export const keytelKcalPerMin = (
  bpm: number,
  kg: number,
  age: number,
  sex: Sex,
): number => {
  const kj =
    sex === 'female'
      ? -20.4022 + 0.4472 * bpm - 0.1263 * kg + 0.074 * age
      : -55.0969 + 0.6309 * bpm + 0.1988 * kg + 0.2017 * age;
  return Math.max(0, kj / 4.184);
};

const BUCKET_MS = 30_000;

/** Samples [time ms, bpm] → average, maximum, energy and a 30 s series. */
export const summarizeHeartRate = (
  samples: [number, number][],
  who?: { kg?: number; age?: number; sex?: Sex },
): HeartRateSummary | undefined => {
  if (samples.length < 10) return undefined;
  let weighted = 0;
  let span = 0;
  let kcal = 0;
  let max = 0;
  const canKcal = !!(who?.kg && who.age != null && who.sex);
  for (let i = 0; i < samples.length; i++) {
    const [t, bpm] = samples[i];
    max = Math.max(max, bpm);
    // Each sample holds until the next one (gaps over 10 s don't count:
    // strap off or out of range).
    const next = samples[i + 1]?.[0] ?? t + 1000;
    const dt = Math.min(next - t, 10_000);
    if (dt <= 0) continue;
    weighted += bpm * dt;
    span += dt;
    if (canKcal)
      kcal +=
        (keytelKcalPerMin(bpm, who!.kg!, who!.age!, who!.sex!) * dt) / 60_000;
  }
  if (!span) return undefined;
  const t0 = samples[0][0];
  const buckets: { sum: number; n: number }[] = [];
  for (const [t, bpm] of samples) {
    const i = Math.floor((t - t0) / BUCKET_MS);
    if (!buckets[i]) buckets[i] = { sum: 0, n: 0 };
    buckets[i].sum += bpm;
    buckets[i].n++;
  }
  const series: number[] = [];
  for (const b of buckets) if (b) series.push(Math.round(b.sum / b.n));
  return {
    avg: Math.round(weighted / span),
    max,
    ...(canKcal ? { kcal: Math.round(kcal) } : {}),
    series,
  };
};
