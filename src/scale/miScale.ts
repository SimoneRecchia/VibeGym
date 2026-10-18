/* eslint-disable no-bitwise */
/**
 * Xiaomi Mi scales broadcast every reading inside their BLE advertisement, so
 * no pairing, account or official app is needed: we just listen.
 *
 *  - Mi Smart Scale / Mi Smart Scale 2 (XMTZC01HM, XMTZC04HM)
 *      service data 0x181D (Weight Scale), 10 bytes:
 *      [ctrl, weightLo, weightHi, yearLo, yearHi, month, day, h, m, s]
 *  - Mi Body Composition Scale / 2 (XMTZC02HM, XMTZC05HM)
 *      service data 0x181B (Body Composition), 13 bytes:
 *      [ctrl0, ctrl1, yearLo, yearHi, month, day, h, m, s, impLo, impHi, weightLo, weightHi]
 *
 * Weight is little endian: /200 for kg, /100 for lb and jin (1 jin = 0.5 kg).
 */
import { ScaleModel } from '../core/types';
import { LB_PER_KG } from '../core/units';

export interface ScaleReading {
  model: ScaleModel;
  weightKg: number;
  /** Final value: the scale settled on it. */
  stable: boolean;
  /** The person stepped off (the final reading is repeated with this flag). */
  removed: boolean;
  impedance?: number;
  /** Measurement time reported by the scale, used to de-duplicate. */
  timestamp?: string;
}

const u16 = (b: number[], i: number) => (b[i] | (b[i + 1] << 8)) >>> 0;

const toKg = (raw: number, lb: boolean, jin: boolean): number => {
  if (lb) return raw / 100 / LB_PER_KG;
  if (jin) return raw / 100 / 2;
  return raw / 200;
};

const stamp = (b: number[], at: number): string | undefined => {
  const year = u16(b, at);
  if (year < 2000 || year > 2100) return undefined;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${year}-${p(b[at + 2])}-${p(b[at + 3])}T${p(b[at + 4])}:${p(
    b[at + 5],
  )}:${p(b[at + 6])}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Parse the 0x181D payload (Mi Smart Scale 1/2). */
export const parseWeightScale = (b: number[]): ScaleReading | null => {
  if (b.length < 3) return null;
  const ctrl = b[0];
  const lb = (ctrl & 0x01) !== 0;
  const jin = (ctrl & 0x10) !== 0;
  const kg = toKg(u16(b, 1), lb, jin);
  if (!(kg > 0 && kg < 300)) return null;
  return {
    model: 'mi-scale',
    weightKg: round2(kg),
    stable: (ctrl & 0x20) !== 0,
    removed: (ctrl & 0x80) !== 0,
    timestamp: b.length >= 10 ? stamp(b, 3) : undefined,
  };
};

/** Parse the 0x181B payload (Mi Body Composition Scale 1/2). */
export const parseBodyComposition = (b: number[]): ScaleReading | null => {
  if (b.length < 13) return null;
  const ctrl0 = b[0];
  const ctrl1 = b[1];
  const lb = (ctrl0 & 0x01) !== 0;
  const jin = (ctrl0 & 0x10) !== 0 && !lb;
  const kg = toKg(u16(b, 11), lb, jin);
  if (!(kg > 0 && kg < 300)) return null;
  const hasImpedance = (ctrl1 & 0x02) !== 0;
  const imp = u16(b, 9);
  return {
    model: 'mi-body-composition',
    weightKg: round2(kg),
    stable: (ctrl1 & 0x20) !== 0,
    removed: (ctrl1 & 0x80) !== 0,
    impedance: hasImpedance && imp > 0 && imp < 3000 ? imp : undefined,
    timestamp: stamp(b, 2),
  };
};

/** Matches both the short ("181B") and long 128-bit forms of a service UUID. */
const isUuid = (uuid: string, short: string) => {
  const u = uuid.toLowerCase();
  return (
    u === short ||
    u === `0000${short}-0000-1000-8000-00805f9b34fb` ||
    u.endsWith(`${short}`)
  );
};

/** Service data map from a BLE advertisement → reading, if it comes from a Mi scale. */
export const parseAdvertisement = (
  serviceData: Record<string, { bytes: number[] }> | undefined,
): ScaleReading | null => {
  if (!serviceData) return null;
  for (const [uuid, data] of Object.entries(serviceData)) {
    const bytes = data?.bytes ?? [];
    if (isUuid(uuid, '181b')) return parseBodyComposition(bytes);
    if (isUuid(uuid, '181d')) return parseWeightScale(bytes);
  }
  return null;
};

export const SCALE_SERVICE_UUIDS = ['181B', '181D'];

export const SCALE_MODEL_LABEL: Record<ScaleModel, string> = {
  'mi-scale': 'Mi Smart Scale 2',
  'mi-body-composition': 'Mi Body Composition Scale 2',
};
