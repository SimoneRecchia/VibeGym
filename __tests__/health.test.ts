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
