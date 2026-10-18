/* eslint-disable no-bitwise */
import {
  parseAdvertisement,
  parseBodyComposition,
  parseWeightScale,
} from '../src/scale/miScale';
import { computeComposition } from '../src/body/composition';
import { movingAverage, weeklyRate, bmi } from '../src/stats/body';

const le = (n: number) => [n & 0xff, (n >> 8) & 0xff];

describe('Mi scale advertisement parsing', () => {
  it('reads a stabilized kg reading from a Mi Smart Scale 2 (0x181D)', () => {
    // ctrl 0x22 = kg + stabilized; 78.40 kg → 15680 raw
    const bytes = [0x22, ...le(15680), ...le(2026), 10, 18, 7, 30, 5];
    expect(parseWeightScale(bytes)).toEqual({
      model: 'mi-scale',
      weightKg: 78.4,
      stable: true,
      removed: false,
      timestamp: '2026-10-18T07:30:05',
    });
    const removed = parseWeightScale([
      0xa2,
      ...le(15680),
      ...le(2026),
      10,
      18,
      7,
      30,
      5,
    ])!;
    expect(removed.removed).toBe(true);
    // Live (not yet stable) value
    expect(parseWeightScale([0x02, ...le(15000)])!.stable).toBe(false);
  });

  it('converts lb readings', () => {
    // 172.80 lb → 17280 raw with lb flag
    const r = parseWeightScale([0x23, ...le(17280)])!;
    expect(r.weightKg).toBeCloseTo(78.38, 1);
  });

  it('reads weight and impedance from a Body Composition Scale 2 (0x181B)', () => {
    // ctrl0 0x02 (kg), ctrl1 0x26 (stable + impedance)
    const bytes = [
      0x02,
      0x26,
      ...le(2026),
      10,
      18,
      7,
      31,
      0,
      ...le(480),
      ...le(15680),
    ];
    expect(parseBodyComposition(bytes)).toMatchObject({
      model: 'mi-body-composition',
      weightKg: 78.4,
      stable: true,
      impedance: 480,
    });
    // impedance flag off → no impedance
    const noImp = parseBodyComposition([
      0x02,
      0x24,
      ...le(2026),
      10,
      18,
      7,
      31,
      0,
      ...le(65534),
      ...le(15680),
    ])!;
    expect(noImp.impedance).toBeUndefined();
  });

  it('dispatches by service UUID in both short and long form', () => {
    const bytes = [0x22, ...le(15680)];
    expect(
      parseAdvertisement({ '0000181d-0000-1000-8000-00805f9b34fb': { bytes } })
        ?.weightKg,
    ).toBe(78.4);
    expect(parseAdvertisement({ '181D': { bytes } })?.weightKg).toBe(78.4);
    expect(parseAdvertisement({ '180F': { bytes } })).toBeNull();
  });
});

describe('body stats', () => {
  it('estimates a plausible body composition', () => {
    const c = computeComposition({
      weightKg: 78,
      heightCm: 180,
      age: 30,
      sex: 'male',
      impedance: 480,
    });
    expect(c.fatPct).toBeGreaterThan(8);
    expect(c.fatPct).toBeLessThan(30);
    expect(c.muscleKg).toBeGreaterThan(50);
    expect(c.bmrKcal).toBeGreaterThan(1500);
    expect(c.visceralFat).toBeGreaterThanOrEqual(1);
  });

  it('smooths weight and computes the weekly rate', () => {
    const day = 86400000;
    const pts = [0, 1, 2, 3].map(i => ({ t: i * day, v: 80 - i * 0.1 }));
    expect(movingAverage(pts).map(p => Math.round(p.v * 100) / 100)).toEqual([
      80, 79.95, 79.9, 79.85,
    ]);
    const body = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      date: new Date(i * day * 2).toISOString(),
      weightKg: 80 - i * 0.1,
      source: 'manual' as const,
    }));
    expect(weeklyRate(body, 28, 28 * day)!).toBeCloseTo(-0.35, 2);
    expect(bmi(81, 180)).toBeCloseTo(25, 1);
  });
});
