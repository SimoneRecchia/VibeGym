/**
 * Workout actions shared by the workout screen and the background runtime:
 * completing a set starts the right rest and moves the cursor on.
 */
import { useStore } from '../data/store';
import { SetRef, isBlockDone, nextPending, restAfter } from './engine';
import { onTimerEnd, startRest, startWork, stopTimer, useTimer } from './timer';
import { haptic } from '../services/haptics';
import { ActiveWorkout } from '../core/types';
import { fmtLoadValue } from '../core/units';

/** "Panca piana · serie 3" for the next pending set. */
export const describeRef = (w: ActiveWorkout, ref: SetRef | null): string => {
  if (!ref) return 'Fine allenamento';
  const ex = w.blocks[ref.bi]?.exercises[ref.ei];
  if (!ex) return '';
  const s = ex.sets[ref.si];
  const unit = useStore.getState().settings.unit;
  const detail =
    ex.kind === 'reps'
      ? `${s.kg ? `${fmtLoadValue(s.kg, unit)} ${unit} × ` : ''}${s.reps ?? ''}`
      : ex.kind === 'time'
      ? `${s.sec ?? 0} s`
      : '';
  return `${ex.name} · serie ${ref.si + 1}${detail ? ` · ${detail}` : ''}`;
};

/** Mark a set done, then start the rest and advance to what comes next. */
export const completeSet = (ref: SetRef, sec?: number) => {
  const store = useStore.getState();
  const w0 = store.workout;
  if (!w0) return;
  store.updateSet(
    ref.bi,
    ref.ei,
    ref.si,
    sec != null ? { done: true, sec } : { done: true },
  );
  const w = useStore.getState().workout!;
  const next = nextPending(w, ref);
  const rest = restAfter(w0, ref);
  const blockDone = isBlockDone(w, ref.bi);
  haptic(blockDone ? 'success' : 'medium');
  if (
    store.settings.autoRest &&
    rest > 0 &&
    useTimer.getState().phase !== 'work'
  ) {
    startRest(rest, describeRef(w, next), ref);
  }
  if (blockDone && next && next.bi !== ref.bi) {
    store.updateWorkout(x => {
      x.cursor = next.bi;
    });
  }
};

/** Start the countdown of a timed set; the set is logged when it ends. */
export const startTimedSet = (ref: SetRef) => {
  const w = useStore.getState().workout;
  if (!w) return;
  const ex = w.blocks[ref.bi].exercises[ref.ei];
  const sec = ex.sets[ref.si].sec ?? 30;
  const after = useStore.getState().settings.autoRest ? restAfter(w, ref) : 0;
  // What follows this set, assuming it gets completed.
  const probe = JSON.parse(JSON.stringify(w)) as ActiveWorkout;
  probe.blocks[ref.bi].exercises[ref.ei].sets[ref.si].done = true;
  startWork(
    sec,
    ref,
    ex.name,
    after,
    describeRef(probe, nextPending(probe, ref)),
  );
  haptic('medium');
};

export const undoSet = (ref: SetRef) => {
  const store = useStore.getState();
  store.updateSet(ref.bi, ref.ei, ref.si, { done: false });
  const t = useTimer.getState();
  if (
    t.ref &&
    t.ref.bi === ref.bi &&
    t.ref.ei === ref.ei &&
    t.ref.si === ref.si
  )
    stopTimer();
  haptic('light');
};

/** Logs timed sets when their countdown ends, even if the screen is closed. */
export const installWorkoutRuntime = () =>
  onTimerEnd((s, elapsed) => {
    if (s.phase !== 'work' || !s.ref) return;
    const w = useStore.getState().workout;
    if (!w) return;
    const ref = s.ref;
    useStore
      .getState()
      .updateSet(ref.bi, ref.ei, ref.si, { done: true, sec: elapsed });
    const after = useStore.getState().workout!;
    const next = nextPending(after, ref);
    if (isBlockDone(after, ref.bi) && next && next.bi !== ref.bi) {
      useStore.getState().updateWorkout(x => {
        x.cursor = next.bi;
      });
    }
  });
