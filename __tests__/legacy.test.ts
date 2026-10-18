import { legacyPlanToV3, legacyKg, legacyReps } from '../src/data/legacy';
import { parsePlanText } from '../src/plan/aiFormat';
import { normalizeBirthDate } from '../src/data/storage';

const V2 = {
  schema_version: 2,
  id: 'push-pull',
  nome_scheda: 'Push pull',
  giorni: [
    {
      id: 'g1',
      nome: 'Giorno A',
      esercizi: [
        {
          id: 'a1',
          nome: 'Panca piana',
          serie: 3,
          reps: { value: 8, unit: 'times' },
          peso_suggerito: { value: 60, unit: 'kg' },
          pesi_default: [
            { value: 60, unit: 'kg' },
            { value: 62.5, unit: 'kg' },
            null,
          ],
          recupero_sec: 120,
        },
        {
          id: 'a2',
          nome: 'Plank',
          serie: 2,
          reps: { value: 1, unit: 'minutes' },
          recupero_sec: 60,
        },
        {
          id: 'a3',
          tipo: 'superset',
          nome: 'SS',
          recupero_sec: 75,
          esercizi: [
            {
              id: 'a3a',
              nome: 'Curl manubri',
              serie: 3,
              reps: { value: 12, unit: 'times' },
              peso_suggerito: { value: 20, unit: 'lb' },
            },
            {
              id: 'a3b',
              nome: 'Push down',
              serie: 3,
              reps: { value: null, unit: 'times' },
            },
          ],
        },
      ],
      cardio: { tipo: 'Tapis roulant', durata_min: 15, modalita: 'pendenza' },
    },
  ],
  storico: [
    {
      id: 's1',
      data: '2026-09-01T18:00:00.000Z',
      giorno_id: 'g1',
      giorno_nome: 'Giorno A',
      durata_sec: 3600,
      esercizi: [
        {
          id: 'a1',
          nome: 'Panca piana',
          serie_totali: 3,
          serie_fatte: 2,
          serie_stato: [true, true, false],
          completato: false,
          reps: { value: 8, unit: 'times' },
          pesi_serie: [
            { value: 60, unit: 'kg' },
            { value: 60, unit: 'kg' },
            null,
          ],
          ripetizioni_serie: [8, 7, null],
          note: '',
        },
      ],
    },
  ],
};

describe('legacy migration', () => {
  it('converts a v2 plan with per-set weights, time, superset and cardio', () => {
    const { plan, sessions } = legacyPlanToV3(V2);
    expect(plan.id).toBe('push-pull');
    const blocks = plan.days[0].blocks;
    expect(blocks).toHaveLength(4);

    const bench = blocks[0].exercises[0];
    expect(bench.catalogId).toBe('Barbell_Bench_Press_-_Medium_Grip');
    expect(bench.sets.map(s => s.kg)).toEqual([60, 62.5, 60]);
    expect(bench.sets.every(s => s.reps === 8)).toBe(true);

    expect(blocks[1].exercises[0]).toMatchObject({
      kind: 'time',
      sets: [{ sec: 60 }, { sec: 60 }],
    });

    const [curl, push] = blocks[2].exercises;
    expect(curl.restSec).toBe(0);
    expect(push.restSec).toBe(75);
    expect(curl.sets[0].kg).toBeCloseTo(9.1, 1);
    expect(push.toFailure).toBe(true);

    expect(blocks[3].exercises[0]).toMatchObject({
      kind: 'cardio',
      sets: [{ sec: 900 }],
      notes: 'pendenza',
    });

    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.durationSec).toBe(3600);
    expect(s.exercises[0].key).toBe('Barbell_Bench_Press_-_Medium_Grip');
    expect(s.exercises[0].sets).toEqual([
      { done: true, kg: 60, reps: 8 },
      { done: true, kg: 60, reps: 7 },
      { done: false, reps: 8 },
    ]);
  });

  it('is detected by the AI importer', () => {
    const parsed = parsePlanText(JSON.stringify(V2));
    expect(parsed.plan.name).toBe('Push pull');
    expect(parsed.sessions).toHaveLength(1);
  });

  it('parses old weight and reps strings', () => {
    expect(legacyKg('corpo libero')).toBe(0);
    expect(legacyKg('BW +10 kg')).toBe(10);
    expect(legacyKg('40 kg')).toBe(40);
    expect(legacyReps('8-10')).toEqual({ kind: 'reps', reps: 10 });
    expect(legacyReps('30s')).toEqual({ kind: 'time', sec: 30 });
    expect(legacyReps('AMRAP')).toEqual({ kind: 'reps', toFailure: true });
  });

  it('normalizes birth dates', () => {
    expect(normalizeBirthDate('12/03/1990')).toBe('1990-03-12');
    expect(normalizeBirthDate('1990-3-2')).toBe('1990-03-02');
    expect(normalizeBirthDate('boh')).toBeUndefined();
  });
});
