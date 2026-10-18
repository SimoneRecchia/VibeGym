/**
 * Smoke tests: the app boots, shows onboarding on a fresh install and the
 * main tabs once a plan exists (including data migrated from the old app).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { useStore } from '../src/data/store';

const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => Promise.resolve());
};

const text = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.props.children === 'string')
    .map(n => n.props.children as string)
    .join(' | ');

beforeEach(async () => {
  await AsyncStorage.clear();
  useStore.setState({ hydrated: false });
});

test('fresh install shows onboarding', async () => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    r = ReactTestRenderer.create(<App />);
  });
  await flush();
  expect(text(r)).toContain('Benvenuto in VibeGym');
  await act(async () => r.unmount());
});

test('migrates the old app data and lands on the plan tab', async () => {
  await AsyncStorage.setItem(
    'vibegym_plans',
    JSON.stringify([
      {
        schema_version: 2,
        id: 'old',
        nome_scheda: 'Vecchia scheda',
        giorni: [
          {
            id: 'g1',
            nome: 'Giorno A — Petto',
            esercizi: [
              {
                id: 'e1',
                nome: 'Panca piana',
                serie: 3,
                reps: { value: 8, unit: 'times' },
                peso_suggerito: { value: 60, unit: 'kg' },
                recupero_sec: 90,
              },
            ],
          },
        ],
        storico: [],
      },
    ]),
  );
  await AsyncStorage.setItem(
    'vibegym_profile',
    JSON.stringify({ name: 'Simone' }),
  );
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    r = ReactTestRenderer.create(<App />);
  });
  await flush();
  const t = text(r);
  expect(t).toContain('Simone');
  expect(t).toContain('Vecchia scheda');
  expect(t).toContain('PROSSIMO ALLENAMENTO');
  expect(
    useStore.getState().plans[0].days[0].blocks[0].exercises[0].catalogId,
  ).toBe('Barbell_Bench_Press_-_Medium_Grip');
  await act(async () => r.unmount());
});
