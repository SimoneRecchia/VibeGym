/**
 * Pure workout logic: building a session from a plan day, the order in which
 * sets are performed (supersets interleave), and turning the finished
 * workout into an immutable history entry.
 */
import {
  ActiveWorkout,
  Day,
  LoggedSet,
  Plan,
  Session,
  SessionExercise,
} from '../core/types';
import { uid } from '../core/ids';
import { keyOf } from '../plan/planUtils';
import { findRecords } from '../stats/metrics';
import { isCompound } from '../catalog';

export interface SetRef {
  bi: number;
  ei: number;
  si: number;
}

/** Most recent logged performance of an exercise (with at least one done set). */
export const lastPerformance = (
  sessions: Session[],
  key: string,
): { ex: SessionExercise; session: Session } | undefined => {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ex = sessions[i].exercises.find(
      e => e.key === key && e.sets.some(s => s.done),
    );
    if (ex) return { ex, session: sessions[i] };
  }
  return undefined;
};

export const buildWorkout = (
  plan: Plan,
  day: Day,
  sessions: Session[],
): ActiveWorkout => ({
  id: uid('w'),
  planId: plan.id,
  planName: plan.name,
  dayId: day.id,
  dayName: day.name,
  startedAt: Date.now(),
  cursor: 0,
  blocks: day.blocks.map(b => ({
    id: b.id,
    exercises: b.exercises.map(ex => {
      const key = keyOf(ex);
      const last = lastPerformance(sessions, key);
      // If the plan was edited after the last session, trust the new targets.
      const planNewer = last
        ? new Date(plan.updatedAt).getTime() >
          new Date(last.session.endedAt).getTime()
        : true;
      const lastDone = last?.ex.sets.filter(s => s.done) ?? [];
      const sets: LoggedSet[] = ex.sets.map((t, i) => {
        const prev = last?.ex.sets[i]?.done
          ? last.ex.sets[i]
          : lastDone[lastDone.length - 1];
        const s: LoggedSet = { done: false };
        if (ex.kind === 'reps') {
          s.reps = t.reps ?? prev?.reps ?? 10;
          s.kg =
            !planNewer && prev?.kg != null ? prev.kg : t.kg ?? prev?.kg ?? 0;
        } else if (ex.kind === 'time') {
          s.sec = t.sec ?? prev?.sec ?? 30;
          s.kg = !planNewer && prev?.kg != null ? prev.kg : t.kg ?? 0;
        } else {
          s.sec = t.sec ?? prev?.sec;
          s.km = t.km ?? prev?.km;
        }
        return s;
      });
      return {
        exerciseId: ex.id,
        key,
        name: ex.name,
        catalogId: ex.catalogId,
        kind: ex.kind,
        blockId: b.id,
        restSec: ex.restSec,
        toFailure: ex.toFailure,
        target: ex.sets.map(s => ({ ...s })),
        sets,
        notes: ex.notes,
      };
    }),
  })),
});

/** All sets in execution order: block by block, rounds interleaved. */
export const orderedRefs = (w: ActiveWorkout): SetRef[] => {
  const out: SetRef[] = [];
  w.blocks.forEach((b, bi) => {
    const rounds = Math.max(0, ...b.exercises.map(e => e.sets.length));
    for (let si = 0; si < rounds; si++) {
      b.exercises.forEach((e, ei) => {
        if (e.sets[si]) out.push({ bi, ei, si });
      });
    }
  });
  return out;
};

const isDone = (w: ActiveWorkout, r: SetRef) =>
  !!w.blocks[r.bi]?.exercises[r.ei]?.sets[r.si]?.done;

/** First pending set of a block (in round order). */
export const nextInBlock = (w: ActiveWorkout, bi: number): SetRef | null =>
  orderedRefs(w).find(r => r.bi === bi && !isDone(w, r)) ?? null;

/** First pending set after `from` in execution order, wrapping to earlier skipped ones. */
export const nextPending = (w: ActiveWorkout, from?: SetRef): SetRef | null => {
  const refs = orderedRefs(w);
  const start = from
    ? refs.findIndex(
        r => r.bi === from.bi && r.ei === from.ei && r.si === from.si,
      ) + 1
    : 0;
  for (let i = start; i < refs.length; i++)
    if (!isDone(w, refs[i])) return refs[i];
  for (let i = 0; i < start; i++) if (!isDone(w, refs[i])) return refs[i];
  return null;
};

export const isBlockDone = (w: ActiveWorkout, bi: number): boolean =>
  nextInBlock(w, bi) === null;

export const workoutProgress = (
  w: ActiveWorkout,
): { done: number; total: number } => {
  const refs = orderedRefs(w);
  return { done: refs.filter(r => isDone(w, r)).length, total: refs.length };
};

/**
 * Seconds of rest after completing `ref`: none inside a superset round (until
 * the exercise that closes it) and none after the very last set.
 */
export const restAfter = (w: ActiveWorkout, ref: SetRef): number => {
  const ex = w.blocks[ref.bi].exercises[ref.ei];
  const others = orderedRefs(w).some(
    r =>
      !(r.bi === ref.bi && r.ei === ref.ei && r.si === ref.si) && !isDone(w, r),
  );
  return others ? ex.restSec : 0;
};

/** Deep-ish clone sufficient for immutable updates of the workout. */
export const cloneWorkout = (w: ActiveWorkout): ActiveWorkout => ({
  ...w,
  blocks: w.blocks.map(b => ({
    ...b,
    exercises: b.exercises.map(e => ({
      ...e,
      sets: e.sets.map(s => ({ ...s })),
      target: e.target,
    })),
  })),
});

/* ------------------------------------------------------------------ */
/*  Progression hint                                                   */
/* ------------------------------------------------------------------ */

/**
 * Double progression: if last time every set reached the target reps at the
 * same load, suggest adding one increment (half for isolation lifts).
 */
export const progressionHint = (
  ex: SessionExercise,
  sessions: Session[],
  stepKg: number,
): number | null => {
  if (ex.kind !== 'reps' || ex.toFailure) return null;
  const last = lastPerformance(sessions, ex.key);
  if (!last) return null;
  const done = last.ex.sets.filter(s => s.done);
  if (!done.length || done.length < last.ex.sets.length) return null;
  const kgs = done.map(s => s.kg ?? 0);
  if (kgs[0] <= 0 || !kgs.every(k => k === kgs[0])) return null;
  const targets = ex.target.map(t => t.reps ?? 0);
  const hitAll = done.every(
    (s, i) => (s.reps ?? 0) >= (targets[i] ?? targets[targets.length - 1] ?? 0),
  );
  if (!hitAll) return null;
  const inc = isCompound(ex.catalogId) ? stepKg : Math.max(1, stepKg / 2);
  const suggested = kgs[0] + inc;
  // Already applied?
  if (ex.sets.every(s => s.done || (s.kg ?? 0) >= suggested)) return null;
  return suggested;
};

/* ------------------------------------------------------------------ */
/*  Finish                                                             */
/* ------------------------------------------------------------------ */

export const toSession = (
  w: ActiveWorkout,
  previous: Session[],
  now = Date.now(),
): Session => {
  const exercises = w.blocks
    .flatMap(b => b.exercises)
    .map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }));
  const session: Session = {
    id: w.id,
    planId: w.planId,
    planName: w.planName,
    dayId: w.dayId,
    dayName: w.dayName,
    startedAt: new Date(w.startedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
    durationSec: Math.max(0, Math.round((now - w.startedAt) / 1000)),
    exercises,
    notes: w.notes,
  };
  const records = findRecords(session, previous);
  if (records.length) session.records = records;
  return session;
};
