import {
  asleepMinutes,
  newWeighIns,
  profileGaps,
  sleepHint,
  weighInKey,
} from '../src/stats/health';
import type { BodyEntry } from '../src/core/types';

const at = (iso: string) => new Date(iso).toISOString();

describe('health import', () => {
  const body: BodyEntry[] = [
    {
      id: 'b1',
      date: at('2026-10-10T07:30:00Z'),
      weightKg: 80.2,
      source: 'scale',
    },
  ];

  it('skips weigh-ins already in the diary and keeps the others', () => {
    const out = newWeighIns(body, [
      // Same weigh-in seen by Zepp Life, 3 minutes later.
      { date: at('2026-10-10T07:33:00Z'), weightKg: 80.25, source: 'Zepp' },
      {
        date: at('2026-10-12T07:30:00Z'),
        weightKg: 79.8,
        fatPct: 18.4,
        source: 'Withings',
      },
    ]);
    expect(out).toEqual([
      {
        date: at('2026-10-12T07:30:00Z'),
        weightKg: 79.8,
        fatPct: 18.4,
        source: 'health',
        sourceApp: 'Withings',
      },
    ]);
  });

  it('does not bring back a deleted import or duplicates within a batch', () => {
    const w = { date: at('2026-10-14T07:00:00Z'), weightKg: 79.5 };
    expect(newWeighIns([], [w], [weighInKey(w)])).toEqual([]);
    expect(newWeighIns([], [w, { ...w }])).toHaveLength(1);
  });

  it('fills only the empty profile fields', () => {
    expect(
      profileGaps(
        { heightCm: 180 },
        { heightCm: 178, birthDate: '1995-03-02', sex: 'male' },
      ),
    ).toEqual({ birthDate: '1995-03-02', sex: 'male' });
    expect(profileGaps({}, { heightCm: 40 })).toEqual({});
  });

  it('counts overlapping sleep once', () => {
    const h = 3600_000;
    const night = Date.UTC(2026, 9, 17, 23);
    expect(
      asleepMinutes(
        [
          [night, night + 7 * h],
          [night + h, night + 7.5 * h], // watch and phone overlap
          [night - 30 * h, night - 24 * h], // the night before
        ],
        night - 5 * h,
      ),
    ).toBe(450);
  });

  it('suggests lighter loads after a short night', () => {
    expect(sleepHint(4 * 60)).toMatch(/leggeri/);
    expect(sleepHint(8 * 60)).toBeUndefined();
    expect(sleepHint(undefined)).toBeUndefined();
  });
});

describe('heart rate', () => {
  const {
    parseHeartRate,
    summarizeHeartRate,
    hrZone,
    maxHeartRate,
    keytelKcalPerMin,
    isUuid,
  } = require('../src/hr/heartRate');

  it('parses 8 and 16 bit measurements', () => {
    expect(parseHeartRate([0x00, 72])).toBe(72);
    expect(parseHeartRate([0x01, 0x8c, 0x00])).toBe(140);
    expect(parseHeartRate([0x16, 0])).toBeNull(); // no contact, 0 bpm
    expect(parseHeartRate([0x01, 5])).toBeNull();
  });

  it('matches short and full UUIDs', () => {
    expect(isUuid('2a37', '2A37')).toBe(true);
    expect(isUuid('00002a37-0000-1000-8000-00805f9b34fb', '2A37')).toBe(true);
    expect(isUuid('2a38', '2A37')).toBe(false);
  });

  it('summarizes a session with energy for the person', () => {
    const t0 = 1_700_000_000_000;
    const samples: [number, number][] = Array.from({ length: 600 }, (_, i) => [
      t0 + i * 1000,
      i < 300 ? 100 : 140,
    ]);
    const s = summarizeHeartRate(samples, { kg: 80, age: 30, sex: 'male' });
    expect(s.avg).toBe(120);
    expect(s.max).toBe(140);
    expect(s.series).toHaveLength(20);
    // 10 minutes around 120 bpm: roughly 100 kcal.
    expect(s.kcal).toBeGreaterThan(80);
    expect(s.kcal).toBeLessThan(130);
    expect(summarizeHeartRate(samples.slice(0, 5))).toBeUndefined();
  });

  it('computes zones from the age', () => {
    const max = maxHeartRate(30); // 187
    expect(max).toBe(187);
    expect(hrZone(100, max)).toBe(1);
    expect(hrZone(170, max)).toBe(5);
    expect(keytelKcalPerMin(60, 70, 30, 'female')).toBeGreaterThanOrEqual(0);
  });
});

describe('imported weigh-ins in the store', () => {
  const { useStore } = require('../src/data/store');
  const { emptyState } = require('../src/data/storage');

  it('enriches imports and remembers a deleted one', () => {
    useStore.setState({
      ...emptyState(),
      hydrated: true,
      profile: { heightCm: 180 },
    });
    const w = {
      date: '2026-10-12T07:30:00.000Z',
      weightKg: 81,
      source: 'health' as const,
      sourceApp: 'Withings',
    };
    useStore.getState().importBodyEntries([w]);
    const [e] = useStore.getState().body;
    expect(e.bmi).toBe(25);
    useStore.getState().deleteBodyEntry(e.id);
    expect(useStore.getState().body).toHaveLength(0);
    const ignored = useStore.getState().settings.health.ignored;
    expect(newWeighIns([], [w], ignored)).toEqual([]);
  });
});
