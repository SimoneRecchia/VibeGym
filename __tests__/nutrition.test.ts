/**
 * Nutrition, energy and weigh-in schedule logic.
 */
import {
  addInterval,
  isWeighDue,
  nextWeighDue,
  weighReminderAt,
} from '../src/body/schedule';
import { mergeSettings } from '../src/data/storage';
import {
  GENERIC,
  nutrientsFor,
  portionsOf,
  searchFoods,
} from '../src/nutrition/foods';
import { offToFood } from '../src/nutrition/off';
import {
  bmrMifflin,
  dayEnergy,
  goalOffset,
  kcalTarget,
  macroTargets,
} from '../src/nutrition/energy';
import { DEFAULT_SETTINGS, Session } from '../src/core/types';

const at = (y: number, m: number, d: number, h = 9) =>
  new Date(y, m - 1, d, h).getTime();

describe('weigh-in schedule', () => {
  it('adds days, weeks and months (keeping month ends valid)', () => {
    expect(new Date(addInterval(at(2026, 1, 31), 1, 'month')).getDate()).toBe(
      28,
    );
    expect(new Date(addInterval(at(2026, 3, 10), 3, 'week')).getDate()).toBe(
      31,
    );
    expect(new Date(addInterval(at(2026, 3, 10), 2, 'day')).getDate()).toBe(12);
  });

  it('is due from the scheduled day on, counting calendar days', () => {
    const s = { every: 2, unit: 'day' as const };
    const last = new Date(at(2026, 5, 1, 22)).toISOString();
    expect(isWeighDue(last, s, at(2026, 5, 2, 23))).toBe(false);
    expect(isWeighDue(last, s, at(2026, 5, 3, 1))).toBe(true);
    expect(isWeighDue(undefined, s)).toBe(true);
    expect(new Date(nextWeighDue(last, s)!).getDate()).toBe(3);
  });

  it('reminds at the chosen time, never in the past', () => {
    const s = { every: 1, unit: 'week' as const };
    const last = new Date(at(2026, 5, 1)).toISOString();
    const t = weighReminderAt(last, s, '07:30', at(2026, 5, 3));
    expect(new Date(t).getDate()).toBe(8);
    expect(new Date(t).getHours()).toBe(7);
    // Overdue: tomorrow if today's time is gone.
    const late = weighReminderAt(last, s, '07:30', at(2026, 5, 20, 12));
    expect(new Date(late).getDate()).toBe(21);
  });

  it('migrates the old daily/weekly weigh-in reminder', () => {
    const old = mergeSettings({
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        weighIn: {
          enabled: true,
          time: '07:00',
          frequency: 'daily',
          weekday: 1,
        },
      },
    } as any);
    expect(old.weigh).toMatchObject({ every: 1, unit: 'day', enabled: true });
    expect(old.notifications.weighIn.enabled).toBe(true);
    expect(mergeSettings(undefined).nutrition.pct.protein).toBe(30);
  });
});

describe('foods', () => {
  it('finds everyday foods by Italian name, accents ignored', () => {
    expect(searchFoods('yogurt greco', GENERIC)[0].name).toMatch(
      /Yogurt greco/,
    );
    expect(searchFoods('caffe', GENERIC)[0].id).toBe('g:caffe');
    expect(searchFoods('petto pollo', GENERIC).map(f => f.id)).toContain(
      'g:pollo-petto',
    );
  });

  it('computes nutrients for a quantity and offers portions', () => {
    const egg = GENERIC.find(f => f.id === 'g:uovo')!;
    const n = nutrientsFor(egg, 110);
    expect(n.kcal).toBeCloseTo(egg.kcal * 1.1, 5);
    expect(portionsOf({ ...egg, packageG: 360 }).at(-1)).toEqual({
      label: 'confezione',
      g: 360,
    });
  });

  it('maps Open Food Facts products and rejects ones without values', () => {
    const f = offToFood({
      code: '8001505005707',
      product_name_it: 'Panna da cucina',
      brands: 'Parmalat, Chef',
      product_quantity: '200',
      product_quantity_unit: 'ml',
      serving_quantity: 30,
      nutriments: {
        'energy-kcal_100g': 195,
        proteins_100g: 2.8,
        carbohydrates_100g: 3.8,
        fat_100g: 19,
      },
    })!;
    expect(f).toMatchObject({
      id: 'off:8001505005707',
      brand: 'Parmalat',
      unit: 'ml',
      packageG: 200,
      kcal: 195,
    });
    expect(f.portions).toEqual([{ label: 'porzione', g: 30 }]);
    expect(
      offToFood({ code: '1', product_name: 'X', nutriments: {} }),
    ).toBeNull();
    // Energy only in kJ.
    expect(
      offToFood({
        code: '2',
        product_name: 'Y',
        nutriments: { energy_100g: 418.4, proteins_100g: 1 },
      })!.kcal,
    ).toBe(100);
  });
});

describe('energy and targets', () => {
  const profile = {
    sex: 'male' as const,
    birthDate: '1990-01-01',
    heightCm: 180,
  };
  const session = { durationSec: 3600, startedAt: '' } as Session;

  it('estimates basal metabolism (Mifflin-St Jeor)', () => {
    expect(bmrMifflin(80, 180, 30, 'male')).toBe(1780);
    expect(bmrMifflin(60, 165, 30, 'female')).toBe(1320);
  });

  it('adds steps and workouts, or the wearable when it knows more', () => {
    const e = dayEnergy({
      profile,
      weightKg: 80,
      sessions: [session],
      health: { steps: 10000 },
    });
    expect(e.stepsKcal).toBeGreaterThan(250);
    expect(e.stepsKcal).toBeLessThan(330);
    expect(e.workoutKcal).toBe(200);
    expect(e.total).toBe(e.basal + e.stepsKcal + e.workoutKcal);
    const watch = dayEnergy({
      profile,
      weightKg: 80,
      sessions: [session],
      health: { steps: 10000, activeKcal: 900 },
    });
    expect(watch.fromHealth).toBe(true);
    expect(watch.total).toBe(watch.basal + 900);
    // No data at all: light everyday activity is assumed.
    const none = dayEnergy({ profile, weightKg: 80, sessions: [] });
    expect(none.assumed).toBe(true);
    expect(none.active).toBe(Math.round(none.basal * 0.2));
  });

  it('turns the goal into calories and macros', () => {
    const g = {
      ...DEFAULT_SETTINGS.nutrition,
      goal: 'lose' as const,
      rate: 0.5,
    };
    expect(goalOffset(g)).toBe(-550);
    expect(kcalTarget(g, { day: 2600, typical: 2300 })).toBe(2050);
    expect(
      kcalTarget({ ...g, adaptive: false }, { day: 2600, typical: 2300 }),
    ).toBe(1750);
    expect(
      kcalTarget({ ...g, mode: 'manual', kcal: 1900 }, { day: 0, typical: 0 }),
    ).toBe(1900);
    const grams = {
      ...g,
      macroMode: 'g' as const,
      grams: { protein: 150, carbs: 200, fat: 60 },
    };
    expect(kcalTarget(grams, { day: 0, typical: 0 })).toBe(1940);
    expect(macroTargets(g, 2000)).toEqual({
      protein: 150,
      carbs: 200,
      fat: 67,
    });
    // Never below a safe floor.
    expect(kcalTarget(g, { day: 1300, typical: 1300 })).toBe(1200);
  });
});
