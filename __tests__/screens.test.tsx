/**
 * Walks through every screen with realistic data to catch runtime errors:
 * plan → day → live workout (sets, timed set, finish) → session → trends,
 * body (weigh-ins, composition, measures), plan flows and settings.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { useStore } from '../src/data/store';
import { useDraft } from '../src/data/draft';
import { navigationRef } from '../src/navigation/AppNavigator';
import { buildDemoPlan } from '../src/plan/demoPlan';
import { parsePlanText } from '../src/plan/aiFormat';
import { EXAMPLE_JSON } from '../src/plan/prompts';
import { completeSet } from '../src/workout/actions';
import { stopTimer } from '../src/workout/timer';
import { RootStackParams } from '../src/navigation/types';

jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });
  }
};

const allText = (r: ReactTestRenderer.ReactTestRenderer): string =>
  r.root
    .findAll(
      n =>
        n.props &&
        (typeof n.props.children === 'string' ||
          typeof n.props.children === 'number' ||
          Array.isArray(n.props.children)),
    )
    .flatMap(n =>
      Array.isArray(n.props.children) ? n.props.children : [n.props.children],
    )
    .filter(x => typeof x === 'string' || typeof x === 'number')
    .join(' ');

const go = async <K extends keyof RootStackParams>(
  name: K,
  params?: RootStackParams[K],
) => {
  await act(async () => {
    (navigationRef.navigate as (n: string, p?: object) => void)(name, params);
  });
  await flush();
};

let r: ReactTestRenderer.ReactTestRenderer;

beforeAll(async () => {
  await AsyncStorage.clear();
  const plan = buildDemoPlan();
  const now = Date.now();
  useStore.setState({ hydrated: false });
  await act(async () => {
    r = ReactTestRenderer.create(<App />);
  });
  await flush();
  await act(async () => {
    const s = useStore.getState();
    s.completeOnboarding();
    s.setProfile({
      name: 'Simone Rossi',
      sex: 'male',
      birthDate: '1992-05-10',
      heightCm: 180,
      goalWeightKg: 76,
    });
    s.addPlan(plan);
    for (let i = 0; i < 20; i++) {
      s.addBodyEntry({
        date: new Date(now - (20 - i) * 2 * 86400000).toISOString(),
        weightKg: 80 - i * 0.15,
        source: i % 2 ? 'scale' : 'manual',
        // Scale weigh-ins: the composition is derived from the impedance.
        ...(i % 2
          ? { impedance: 480 + i, scaleModel: 'mi-body-composition' as const }
          : { fatPct: 18 - i * 0.05, muscleKg: 60, waterPct: 56 }),
      });
    }
    s.addMeasure(
      { waist: 84, chest: 100, arm: 36 },
      new Date(now - 40 * 86400000).toISOString(),
    );
    s.addMeasure({ waist: 82.5, chest: 101, arm: 36.5 });
  });
  await flush();
});

afterAll(async () => {
  await act(async () => {
    stopTimer();
    r.unmount();
  });
});

test('plan tab with greeting and next workout', () => {
  const t = allText(r);
  expect(t).toContain('Simone');
  expect(t).toContain('PROSSIMO');
  expect(t).toContain('I TUOI GIORNI');
  expect(t).toContain('Full body A');
});

test('progress and nutrition tabs render with data', () => {
  const t = allText(r);
  expect(t).toContain('I tuoi progressi appariranno qui');
  // Weight trend on top of Progressi (weigh-ins are scheduled by default).
  expect(t).toContain('Prossima pesata');
  expect(t).toContain('Consumo stimato');
  expect(t).toContain('Colazione');
});

test('body screen lives in the profile', async () => {
  await go('Settings', { screen: 'Body' });
  const t = allText(r);
  expect(t).toContain('Composizione');
  expect(t).toContain('Misure');
});

test('food diary: search, add, edit totals, custom food, scanner', async () => {
  const { dayKey } = require('../src/core/dates');
  const day = dayKey();
  await go('FoodAdd', { day, meal: 'lunch' });
  expect(allText(r)).toContain('Recenti');
  const { GENERIC, searchFoods } = require('../src/nutrition/foods');
  const pasta = searchFoods('pasta', GENERIC)[0];
  expect(pasta.name).toContain('Pasta');
  await act(async () => {
    useStore.getState().logFood({ day, meal: 'lunch', food: pasta, qty: 80 });
  });
  await flush();
  expect(useStore.getState().foodLib.recents[0]).toBe(pasta.id);
  await go('CustomFood', { barcode: '8000000000001', day, meal: 'lunch' });
  expect(allText(r)).toContain('Nuovo alimento');
  await go('Scanner', { day, meal: 'lunch' });
  expect(allText(r)).toContain('codice a barre');
  await go('Main');
  expect(allText(r)).toContain(pasta.name);
});

test('day screen', async () => {
  const day = useStore.getState().plans[0].days[0];
  await go('Day', { dayId: day.id });
  expect(allText(r)).toContain('Inizia allenamento');
});

test('full workout: log sets, timed set, finish and session summary', async () => {
  const { plans } = useStore.getState();
  const plan = plans[0];
  await act(async () => {
    useStore.getState().startWorkout(plan.id, plan.days[0].id);
  });
  await go('Workout');
  expect(allText(r)).toContain('Squat');

  // Log every set through the same path as the big button.
  await act(async () => {
    const w = useStore.getState().workout!;
    w.blocks.forEach((b, bi) =>
      b.exercises.forEach((e, ei) =>
        e.sets.forEach((_, si) => {
          if (e.kind !== 'time') completeSet({ bi, ei, si });
        }),
      ),
    );
  });
  await flush();
  // Timed sets (plank) are logged when their countdown ends.
  const w = useStore.getState().workout!;
  const plankBlock = w.blocks.findIndex(b => b.exercises[0].kind === 'time');
  await act(async () => {
    const { startTimedSet } = require('../src/workout/actions');
    startTimedSet({ bi: plankBlock, ei: 0, si: 0 });
  });
  await act(async () => {
    jest.advanceTimersByTime(45_000);
  });
  await flush();
  expect(
    useStore.getState().workout!.blocks[plankBlock].exercises[0].sets[0].done,
  ).toBe(true);
  await act(async () => stopTimer());

  let id = '';
  await act(async () => {
    id = useStore.getState().finishWorkout()!.id;
  });
  await go('Session', { id });
  expect(allText(r)).toContain('Full body A');
});

test('a second, heavier workout sets records and fills the trend screens', async () => {
  const plan = useStore.getState().plans[0];
  await act(async () => {
    useStore.getState().startWorkout(plan.id, plan.days[0].id);
    useStore.getState().updateSet(0, 0, 0, { kg: 60 }, true);
    completeSet({ bi: 0, ei: 0, si: 0 });
    useStore.getState().finishWorkout();
    stopTimer();
  });
  const last = useStore.getState().sessions.at(-1)!;
  expect(last.records?.[0]?.name).toBe('Squat');
  await go('ExerciseTrend', { key: 'Barbell_Squat', name: 'Squat' });
  expect(allText(r)).toContain('1RM stimato');
  await go('ExerciseInfo', { catalogId: 'Barbell_Squat', name: 'Squat' });
  expect(allText(r)).toContain('MUSCOLI PRINCIPALI');
  await go('History');
  expect(allText(r)).toContain('Storico');
});

test('body metric screens', async () => {
  await go('Settings', { screen: 'BodyMetric', params: { metric: 'weight' } });
  expect(allText(r)).toContain('Peso');
  // The latest weigh-in (from the scale) opens with every saved value.
  const rows = r.root.findAll(
    n => typeof n.props.onLongPress === 'function' && n.props.onPress,
  );
  await act(async () => rows[0].props.onPress());
  await flush();
  const detail = allText(r);
  expect(detail).toContain('Tipo di corpo');
  expect(detail).toContain('Età metabolica');
  expect(detail).toContain('Mi Body Composition Scale 2');
  await go('Settings', {
    screen: 'BodyMetric',
    params: { metric: 'metabolicAge' },
  });
  expect(allText(r)).toContain('Età metabolica');
  await go('Settings', { screen: 'BodyMetric', params: { metric: 'fatPct' } });
  expect(allText(r)).toContain('Massa grassa');
  await go('Settings', {
    screen: 'BodyMetric',
    params: { metric: 'measure:waist' },
  });
  expect(allText(r)).toContain('Vita');
});

test('plan flows: setup, AI prompts, import review, editor, picker, library', async () => {
  await go('PlanSetup');
  expect(allText(r)).toContain("Creala con l'AI");
  await go('AiFlow', { mode: 'create' });
  expect(allText(r)).toContain('Genera il prompt');
  await go('AiFlow', { mode: 'convert' });
  expect(allText(r)).toContain("Migliorala con l'AI");
  await go('AiFlow', { mode: 'modify' });
  expect(allText(r)).toContain('SCHEDA ATTUALE');

  await act(async () => {
    useDraft.setState({
      parsed: parsePlanText(EXAMPLE_JSON),
      replacesPlanId: null,
    });
  });
  await go('ImportReview');
  expect(allText(r)).toContain('Controlla la scheda');

  const plan = useStore.getState().plans[0];
  await act(async () => {
    useDraft.setState({ editing: JSON.parse(JSON.stringify(plan)) });
  });
  await go('PlanEditor');
  expect(allText(r)).toContain('Aggiungi esercizio');
  const d = plan.days[0];
  await go('ExerciseEditor', {
    dayId: d.id,
    blockId: d.blocks[0].id,
    exerciseId: d.blocks[0].exercises[0].id,
  });
  expect(allText(r)).toContain('RECUPERO TRA LE SERIE');
  await go('ExercisePicker', { title: 'Scegli' });
  expect(allText(r)).toContain('Panca piana');
  await go('Plans');
  expect(allText(r)).toContain('Le mie schede');
});

test('settings and submenus', async () => {
  for (const screen of [
    'SettingsHome',
    'ProfileEdit',
    'WorkoutSettings',
    'NotificationSettings',
    'ScaleSettings',
    'AppearanceSettings',
    'DataSettings',
    'WeighSettings',
    'NutritionSettings',
    'HealthSettings',
    'IntegrationsSettings',
    'HeartRateSettings',
  ] as const) {
    await go('Settings', { screen });
  }
  expect(allText(r)).toContain('Dati e backup');
});

test('app icon color picker', async () => {
  const icons = jest.requireMock('vibe-app-icon');
  await go('Settings', { screen: 'AppearanceSettings' });
  expect(allText(r)).toContain("ICONA DELL'APP");
  expect(allText(r)).toContain('Viola');
  const [viola] = r.root.findAll(
    n => n.props.accessibilityLabel === 'Icona Viola' && n.props.onPress,
  );
  await act(async () => viola.props.onPress());
  expect(icons.setAppIcon).toHaveBeenCalledWith('viola', 'blu');
});
