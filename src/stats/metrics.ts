import {
  ExerciseKind,
  LoggedSet,
  PersonalRecord,
  RecordKind,
  Session,
  SessionExercise,
} from '../core/types';

/** Epley estimated one-rep max; reps capped at 12 where the formula holds. */
export const e1rm = (kg: number, reps: number): number => {
  if (kg <= 0 || reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + Math.min(reps, 12) / 30);
};

export interface ExerciseMetrics {
  e1rm: number;
  maxKg: number;
  volume: number;
  totalReps: number;
  maxReps: number;
  maxSec: number;
  totalSec: number;
  km: number;
  setsDone: number;
}

export const doneSets = (ex: SessionExercise): LoggedSet[] =>
  ex.sets.filter(s => s.done);

export const metricsOf = (ex: SessionExercise): ExerciseMetrics => {
  const m: ExerciseMetrics = {
    e1rm: 0,
    maxKg: 0,
    volume: 0,
    totalReps: 0,
    maxReps: 0,
    maxSec: 0,
    totalSec: 0,
    km: 0,
    setsDone: 0,
  };
  for (const s of doneSets(ex)) {
    m.setsDone++;
    const kg = s.kg ?? 0;
    const reps = s.reps ?? 0;
    if (kg > m.maxKg) m.maxKg = kg;
    if (ex.kind === 'reps') {
      m.totalReps += reps;
      if (reps > m.maxReps) m.maxReps = reps;
      m.volume += kg * reps;
      const est = e1rm(kg, reps);
      if (est > m.e1rm) m.e1rm = est;
    } else {
      const sec = s.sec ?? 0;
      m.totalSec += sec;
      if (sec > m.maxSec) m.maxSec = sec;
      m.km += s.km ?? 0;
    }
  }
  return m;
};

export type MetricKey =
  | 'e1rm'
  | 'maxKg'
  | 'volume'
  | 'maxReps'
  | 'totalReps'
  | 'maxSec'
  | 'totalSec'
  | 'km';

export const METRIC_LABEL: Record<MetricKey, string> = {
  e1rm: '1RM stimato',
  maxKg: 'Carico massimo',
  volume: 'Volume',
  maxReps: 'Ripetizioni max',
  totalReps: 'Ripetizioni totali',
  maxSec: 'Durata max',
  totalSec: 'Durata totale',
  km: 'Distanza',
};

/** Metrics that make sense for an exercise, best first. */
export const metricsFor = (
  kind: ExerciseKind,
  weighted: boolean,
): MetricKey[] => {
  if (kind === 'reps')
    return weighted
      ? ['e1rm', 'maxKg', 'volume', 'maxReps']
      : ['maxReps', 'totalReps'];
  if (kind === 'time')
    return weighted ? ['maxSec', 'maxKg', 'totalSec'] : ['maxSec', 'totalSec'];
  return ['totalSec', 'km'];
};

/* ------------------------------------------------------------------ */
/*  Personal records                                                   */
/* ------------------------------------------------------------------ */

const RECORD_METRICS: {
  kind: RecordKind;
  pick: (m: ExerciseMetrics, ex: SessionExercise) => number;
}[] = [
  { kind: 'e1rm', pick: m => m.e1rm },
  { kind: 'kg', pick: m => m.maxKg },
  {
    kind: 'reps',
    pick: (m, ex) => (ex.kind === 'reps' && m.maxKg === 0 ? m.maxReps : 0),
  },
  { kind: 'sec', pick: (m, ex) => (ex.kind === 'time' ? m.maxSec : 0) },
  { kind: 'km', pick: m => m.km },
];

/**
 * Records beaten by `session` compared with all `previous` sessions. An
 * exercise needs prior history to set a record (the first time doesn't count).
 */
export const findRecords = (
  session: Session,
  previous: Session[],
): PersonalRecord[] => {
  const out: PersonalRecord[] = [];
  for (const ex of session.exercises) {
    const now = metricsOf(ex);
    if (!now.setsDone) continue;
    const prevBest: Partial<Record<RecordKind, number>> = {};
    let seen = false;
    for (const s of previous) {
      for (const pe of s.exercises) {
        if (pe.key !== ex.key) continue;
        const pm = metricsOf(pe);
        if (!pm.setsDone) continue;
        seen = true;
        for (const r of RECORD_METRICS) {
          const v = r.pick(pm, pe);
          if (v > (prevBest[r.kind] ?? 0)) prevBest[r.kind] = v;
        }
      }
    }
    if (!seen) continue;
    // One record per exercise: the most meaningful one beaten.
    for (const r of RECORD_METRICS) {
      const v = r.pick(now, ex);
      const p = prevBest[r.kind] ?? 0;
      if (v > 0 && p > 0 && v > p + 1e-9) {
        out.push({
          key: ex.key,
          name: ex.name,
          kind: r.kind,
          value: v,
          previous: p,
        });
        break;
      }
    }
  }
  return out;
};

export const sessionVolume = (s: Session): number =>
  s.exercises.reduce((sum, e) => sum + metricsOf(e).volume, 0);
export const sessionSetsDone = (s: Session): number =>
  s.exercises.reduce((sum, e) => sum + doneSets(e).length, 0);
