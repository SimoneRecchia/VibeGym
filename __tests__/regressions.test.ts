/**
 * Regression tests for issues found in review: one test per bug.
 */
import { useStore } from '../src/data/store';
import { emptyState } from '../src/data/storage';
import { isLegacyPlan } from '../src/data/legacy';
import { parsePlanText } from '../src/plan/aiFormat';
import { extractJson } from '../src/plan/jsonText';
import { carryDayIds, newDay } from '../src/plan/planUtils';
import {
  buildWorkout,
  nextOutsideBlock,
  restAfter,
  toSession,
} from '../src/workout/engine';
import {
  adjustTimer,
  onTimerEnd,
  startWork,
  stopTimer,
} from '../src/workout/timer';
import { Plan } from '../src/core/types';

const planFrom = (json: object): Plan =>
  parsePlanText(JSON.stringify(json)).plan;

describe('review regressions', () => {
  it('"apply to next sets" carries only the changed value (pyramids survive)', () => {
    const plan = planFrom({
      nome: 'P',
      giorni: [
        {
          nome: 'A',
          esercizi: [
            {
              nome: 'Panca',
              serie: 3,
              ripetizioni: 10,
              carico_kg: [60, 70, 80],
              recupero_sec: 90,
            },
          ],
        },
      ],
    });
    useStore.setState({
      ...emptyState(),
      hydrated: true,
      plans: [plan],
      activePlanId: plan.id,
    });
    useStore.getState().startWorkout(plan.id, plan.days[0].id);
    useStore.getState().updateSet(0, 0, 0, { reps: 9 }, true);
    const sets = useStore.getState().workout!.blocks[0].exercises[0].sets;
    expect(sets.map(s => s.kg)).toEqual([60, 70, 80]);
    expect(sets.map(s => s.reps)).toEqual([9, 9, 9]);
    useStore.getState().updateSet(0, 0, 1, { kg: 72.5 }, true);
    expect(
      useStore.getState().workout!.blocks[0].exercises[0].sets.map(s => s.kg),
    ).toEqual([60, 72.5, 72.5]);
  });

  it('empty state is a fresh object every time', () => {
    const a = emptyState();
    a.plans.push({} as Plan);
    expect(emptyState().plans).toEqual([]);
  });

  it('starting a day without exercises is refused', () => {
    const plan: Plan = {
      id: 'p',
      name: 'x',
      createdAt: '',
      updatedAt: '',
      days: [newDay(0)],
    };
    useStore.setState({ ...emptyState(), hydrated: true, plans: [plan] });
    expect(useStore.getState().startWorkout('p', plan.days[0].id)).toBeNull();
  });

  it('replacing a plan never produces duplicate day ids', () => {
    const old: Plan = {
      id: 'old',
      name: 'Old',
      createdAt: 'c',
      updatedAt: 'u',
      days: [
        { id: 'd1', name: 'Push', blocks: [] },
        { id: 'd2', name: 'Pull', blocks: [] },
      ],
    };
    const next: Plan = {
      ...old,
      id: 'new',
      days: [
        { id: 'n1', name: 'Upper', blocks: [] },
        { id: 'n2', name: 'Push', blocks: [] },
      ],
    };
    const { plan, dayMap } = carryDayIds(next, old);
    expect(plan.id).toBe('old');
    // Push keeps its id; Upper is new (its position is taken by Push's old id).
    expect(plan.days.map(d => d.id)).toEqual(['n1', 'd1']);
    expect(new Set(plan.days.map(d => d.id)).size).toBe(2);
    expect(dayMap).toEqual({ n1: 'n1', n2: 'd1' });
  });

  it('valid JSON with typographic quotes inside strings is accepted', () => {
    expect(extractJson('{"name": "Il “Toro”", "x": "l’ultimo"}')).toEqual({
      name: 'Il “Toro”',
      x: 'l’ultimo',
    });
    // ...while a chat that turned every quote typographic is still repaired.
    expect(extractJson('{“a”: “b”}')).toEqual({ a: 'b' });
  });

  it('new-format files without "formato" are not mistaken for old ones', () => {
    const doc = {
      nome: 'Mia',
      giorni: [
        {
          nome: 'A',
          esercizi: [
            { nome: 'Plank', durata_sec: 45 },
            { nome: 'Panca', reps: 8, carico_kg: 60 },
          ],
        },
      ],
    };
    expect(isLegacyPlan(doc)).toBe(false);
    const { plan } = parsePlanText(JSON.stringify(doc));
    expect(plan.name).toBe('Mia');
    expect(plan.days[0].blocks[1].exercises[0].sets[0]).toEqual({
      reps: 8,
      kg: 60,
    });
  });

  it('comma lists of reps are lists; a comma in a load is a decimal', () => {
    const plan = planFrom({
      giorni: [
        {
          nome: 'A',
          esercizi: [
            { nome: 'Panca', ripetizioni: '12,10,8', carico_kg: '62,5' },
          ],
        },
      ],
    });
    const sets = plan.days[0].blocks[0].exercises[0].sets;
    expect(sets.map(s => s.reps)).toEqual([12, 10, 8]);
    expect(sets.every(s => s.kg === 62.5)).toBe(true);
  });

  it('prefill keeps what you lifted after unrelated plan edits, but follows a changed target', () => {
    const plan = planFrom({
      giorni: [
        {
          nome: 'A',
          esercizi: [
            {
              nome: 'Panca',
              catalogo: 'Barbell_Bench_Press_-_Medium_Grip',
              serie: 1,
              ripetizioni: 8,
              carico_kg: 60,
            },
          ],
        },
      ],
    });
    const w = buildWorkout(plan, plan.days[0], []);
    w.blocks[0].exercises[0].sets[0] = { done: true, kg: 80, reps: 8 };
    const session = toSession(w, [], Date.parse('2026-01-01'));
    const edited = { ...plan, updatedAt: '2030-01-01T00:00:00.000Z' };
    expect(
      buildWorkout(edited, edited.days[0], [session]).blocks[0].exercises[0]
        .sets[0].kg,
    ).toBe(80);
    const retargeted = JSON.parse(JSON.stringify(edited)) as Plan;
    retargeted.days[0].blocks[0].exercises[0].sets[0].kg = 65;
    expect(
      buildWorkout(retargeted, retargeted.days[0], [session]).blocks[0]
        .exercises[0].sets[0].kg,
    ).toBe(65);
  });

  it('a superset round closed by the longer exercise still rests; skip goes forward', () => {
    const plan = planFrom({
      giorni: [
        {
          nome: 'A',
          esercizi: [
            { nome: 'Squat', serie: 1, ripetizioni: 5, recupero_sec: 120 },
            {
              superset: [
                { nome: 'A1', serie: 3, ripetizioni: 10 },
                { nome: 'A2', serie: 2, ripetizioni: 10 },
              ],
              recupero_sec: 90,
            },
            { nome: 'Curl', serie: 2, ripetizioni: 10, recupero_sec: 60 },
          ],
        },
      ],
    });
    const w = buildWorkout(plan, plan.days[0], []);
    expect(restAfter(w, { bi: 1, ei: 0, si: 0 })).toBe(0);
    expect(restAfter(w, { bi: 1, ei: 0, si: 2 })).toBe(90);
    expect(nextOutsideBlock(w, 1)).toEqual({ bi: 2, ei: 0, si: 0 });
    expect(nextOutsideBlock(w, 2)).toEqual({ bi: 0, ei: 0, si: 0 });
  });

  it('timed sets log the real elapsed time after adjusting the timer', () => {
    jest.useFakeTimers();
    const logged: number[] = [];
    const off = onTimerEnd((_, sec) => logged.push(sec));
    startWork(30, { bi: 0, ei: 0, si: 0 }, 'Plank', 0, '');
    jest.advanceTimersByTime(25_000);
    adjustTimer(-15);
    jest.advanceTimersByTime(2_000);
    expect(logged).toEqual([26]);
    off();
    stopTimer();
    jest.useRealTimers();
  });
});
