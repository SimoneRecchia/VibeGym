import {
  buildWorkout,
  nextPending,
  orderedRefs,
  progressionHint,
  restAfter,
  toSession,
} from '../src/workout/engine';
import { parsePlanText } from '../src/plan/aiFormat';
import { e1rm, findRecords, metricsOf } from '../src/stats/metrics';
import { Session } from '../src/core/types';

const plan = parsePlanText(
  JSON.stringify({
    nome: 'T',
    giorni: [
      {
        nome: 'A',
        esercizi: [
          {
            nome: 'Squat',
            catalogo: 'Barbell_Squat',
            serie: 2,
            ripetizioni: 5,
            carico_kg: 100,
            recupero_sec: 120,
          },
          {
            superset: [
              {
                nome: 'Curl',
                catalogo: 'Barbell_Curl',
                ripetizioni: 10,
                carico_kg: 30,
              },
              {
                nome: 'Push down',
                catalogo: 'Triceps_Pushdown',
                ripetizioni: 12,
                carico_kg: 25,
              },
            ],
            serie: 2,
            recupero_sec: 60,
          },
        ],
      },
    ],
  }),
).plan;
// Pretend the plan was created long ago so history wins over targets.
plan.updatedAt = '2020-01-01T00:00:00.000Z';
const day = plan.days[0];

const finish = (
  sessions: Session[],
  mutate: (w: ReturnType<typeof buildWorkout>) => void,
  at: number,
): Session => {
  const w = buildWorkout(plan, day, sessions);
  mutate(w);
  return toSession(w, sessions, at);
};

describe('workout engine', () => {
  it('interleaves supersets and rests only after the round', () => {
    const w = buildWorkout(plan, day, []);
    expect(orderedRefs(w).map(r => `${r.bi}${r.ei}${r.si}`)).toEqual([
      '000',
      '001',
      '100',
      '110',
      '101',
      '111',
    ]);
    expect(restAfter(w, { bi: 1, ei: 0, si: 0 })).toBe(0);
    expect(restAfter(w, { bi: 1, ei: 1, si: 0 })).toBe(60);
    w.blocks.forEach(b =>
      b.exercises.forEach(e => e.sets.forEach(s => (s.done = true))),
    );
    w.blocks[1].exercises[1].sets[1].done = false;
    expect(nextPending(w)).toEqual({ bi: 1, ei: 1, si: 1 });
    expect(restAfter(w, { bi: 1, ei: 1, si: 1 })).toBe(0); // last set of the workout
  });

  it('prefills loads from the last session and suggests progression', () => {
    const s1 = finish(
      [],
      w =>
        w.blocks.forEach(b =>
          b.exercises.forEach(e => e.sets.forEach(s => (s.done = true))),
        ),
      Date.parse('2026-01-01'),
    );
    const w2 = buildWorkout(plan, day, [s1]);
    expect(w2.blocks[0].exercises[0].sets[0].kg).toBe(100);
    expect(progressionHint(w2.blocks[0].exercises[0], [s1], 2.5)).toBe(102.5);
    // Isolation lifts progress by half a step (min 1 kg).
    expect(progressionHint(w2.blocks[1].exercises[0], [s1], 2.5)).toBe(31.25);
  });

  it('detects personal records against previous sessions only', () => {
    const s1 = finish(
      [],
      w => (w.blocks[0].exercises[0].sets[0].done = true),
      Date.parse('2026-01-01'),
    );
    expect(s1.records).toBeUndefined();
    const s2 = finish(
      [s1],
      w => {
        const sq = w.blocks[0].exercises[0];
        sq.sets[0].done = true;
        sq.sets[0].kg = 110;
      },
      Date.parse('2026-01-08'),
    );
    expect(findRecords(s2, [s1])).toEqual([
      {
        key: 'Barbell_Squat',
        name: 'Squat',
        kind: 'e1rm',
        value: e1rm(110, 5),
        previous: e1rm(100, 5),
      },
    ]);
    expect(s2.records).toHaveLength(1);
  });

  it('computes metrics', () => {
    const m = metricsOf({
      exerciseId: 'x',
      key: 'k',
      name: 'x',
      kind: 'reps',
      blockId: 'b',
      restSec: 0,
      target: [],
      sets: [
        { done: true, kg: 50, reps: 10 },
        { done: true, kg: 60, reps: 5 },
        { done: false, kg: 70, reps: 5 },
      ],
    });
    expect(m.volume).toBe(800);
    expect(m.maxKg).toBe(60);
    expect(m.e1rm).toBeCloseTo(70, 1); // 60×5 beats 50×10
  });
});
