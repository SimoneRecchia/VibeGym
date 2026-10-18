import {
  parsePlanText,
  planToJson,
  PlanImportError,
} from '../src/plan/aiFormat';
import { extractJson } from '../src/plan/jsonText';
import {
  buildConvertPrompt,
  buildCreatePrompt,
  buildModifyPrompt,
  EXAMPLE_JSON,
} from '../src/plan/prompts';

describe('AI plan format', () => {
  it('parses the documented example without warnings', () => {
    const { plan, warnings, unmatched } = parsePlanText(EXAMPLE_JSON);
    expect(warnings).toEqual([]);
    expect(unmatched).toBe(0);
    expect(plan.name).toBe('Full body 3 giorni');
    const day = plan.days[0];
    expect(day.blocks).toHaveLength(6);

    const squat = day.blocks[0].exercises[0];
    expect(squat.kind).toBe('reps');
    expect(squat.catalogId).toBe('Barbell_Squat');
    expect(squat.sets).toEqual(Array(4).fill({ reps: 6, kg: 70 }));
    expect(squat.restSec).toBe(150);

    const pyramid = day.blocks[1].exercises[0];
    expect(pyramid.sets.map(s => s.reps)).toEqual([12, 10, 8]);
    expect(pyramid.sets.map(s => s.kg)).toEqual([20, 22, 24]);

    const superset = day.blocks[3];
    expect(superset.exercises).toHaveLength(2);
    expect(superset.exercises[0].restSec).toBe(0);
    expect(superset.exercises[1].restSec).toBe(75);
    expect(superset.exercises.every(e => e.sets.length === 3)).toBe(true);

    const plank = day.blocks[4].exercises[0];
    expect(plank.kind).toBe('time');
    expect(plank.sets[0].sec).toBe(45);

    const cardio = day.blocks[5].exercises[0];
    expect(cardio.kind).toBe('cardio');
    expect(cardio.sets).toEqual([{ sec: 720 }]);
  });

  it('extracts JSON from chat prose, fences, comments and trailing commas', () => {
    const text = `Ecco la tua scheda!\n\`\`\`json\n{\n  // commento\n  "nome": "Test",\n  "giorni": [{"nome": "A", "esercizi": [{"nome": "Squat", "serie": 3, "ripetizioni": 5, "carico_kg": 80, "recupero_sec": 120,},],},],\n}\n\`\`\`\nBuon allenamento.`;
    const { plan } = parsePlanText(text);
    expect(plan.days[0].blocks[0].exercises[0].sets).toHaveLength(3);
    expect(extractJson('prima {"a": 1} dopo')).toEqual({ a: 1 });
  });

  it('coerces sloppy values and reports warnings', () => {
    const { plan, warnings } = parsePlanText(
      JSON.stringify({
        nome: 'Sloppy',
        giorni: [
          {
            nome: 'A',
            esercizi: [
              { nome: 'Panca piana', ripetizioni: '8-10', carico_kg: '60 kg' },
            ],
          },
        ],
      }),
    );
    const ex = plan.days[0].blocks[0].exercises[0];
    expect(ex.catalogId).toBe('Barbell_Bench_Press_-_Medium_Grip'); // matched from the Italian name
    expect(ex.sets).toEqual(Array(3).fill({ reps: 10, kg: 60 }));
    expect(ex.restSec).toBe(90);
    expect(warnings.join(' ')).toMatch(/serie mancanti/);
    expect(warnings.join(' ')).toMatch(/intervallo/);
    expect(warnings.join(' ')).toMatch(/recupero mancante/);
  });

  it('rejects text without days', () => {
    expect(() => parsePlanText('{"nome": "x"}')).toThrow(PlanImportError);
    expect(() => parsePlanText('niente json qui')).toThrow();
  });

  it('round-trips through the serializer', () => {
    const first = parsePlanText(EXAMPLE_JSON).plan;
    const again = parsePlanText(planToJson(first)).plan;
    const strip = (p: typeof first) =>
      p.days.map(d =>
        d.blocks.map(b =>
          b.exercises.map(e => ({
            n: e.name,
            c: e.catalogId,
            k: e.kind,
            s: e.sets,
            r: e.restSec,
          })),
        ),
      );
    expect(strip(again)).toEqual(strip(first));
  });

  it('builds prompts that embed schema, example and exercise list', () => {
    const create = buildCreatePrompt({
      sex: 'male',
      experience: 'beginner',
      equipment: ['dumbbell'],
      daysPerWeek: 3,
    });
    expect(create).toContain('"formato": "vibegym"');
    expect(create).toContain('LISTA ESERCIZI');
    expect(create).toContain('Dumbbell_Bench_Press');
    const chestLine =
      create.split('\n').find(l => l.startsWith('chest:')) ?? '';
    expect(chestLine).toContain('Dumbbell_Bench_Press');
    expect(chestLine).not.toContain('Barbell_Bench_Press_-_Medium_Grip'); // no barbell available
    expect(buildConvertPrompt({ improve: false })).toContain('ESATTAMENTE');
    const plan = parsePlanText(EXAMPLE_JSON).plan;
    expect(buildModifyPrompt(plan, [], 'Più braccia')).toContain('Più braccia');
  });
});
