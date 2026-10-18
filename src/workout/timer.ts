/**
 * Rest / work timer. Wall-clock based (absolute end time), so it stays exact
 * when JS is paused in background. Lives in its own tiny store so only the
 * timer UI re-renders on each tick.
 */
import { create } from 'zustand';
import { AppState } from 'react-native';
import { SetRef } from './engine';
import { haptic } from '../services/haptics';
import { playEnd, playTick } from '../services/sound';
import { cancelRestEnd, scheduleRestEnd } from '../services/notifications';

export type TimerPhase = 'idle' | 'rest' | 'work';

export interface TimerState {
  phase: TimerPhase;
  /** epoch ms when the phase started (elapsed time = wall clock). */
  startedAt: number;
  endAt: number;
  total: number;
  remaining: number;
  /** Set being timed (work phase) or just completed (rest phase). */
  ref: SetRef | null;
  label: string;
  /** What comes next, shown during rest and in the notification. */
  nextLabel: string;
  /** Rest to run automatically after a work phase. */
  restAfter: number;
}

const IDLE: TimerState = {
  phase: 'idle',
  startedAt: 0,
  endAt: 0,
  total: 0,
  remaining: 0,
  ref: null,
  label: '',
  nextLabel: '',
  restAfter: 0,
};

export const useTimer = create<TimerState>()(() => ({ ...IDLE }));

/** Listener receives the finished phase and the seconds actually elapsed. */
type EndListener = (s: TimerState, elapsedSec: number) => void;
const listeners = new Set<EndListener>();
/** Subscribe to phase completions (used by the workout screen to log timed sets). */
export const onTimerEnd = (fn: EndListener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

let interval: ReturnType<typeof setInterval> | null = null;
let lastBeep = -1;
let notifyInBackground = true;

export const setRestNotifications = (on: boolean) => {
  notifyInBackground = on;
};

const stopTicking = () => {
  if (interval) clearInterval(interval);
  interval = null;
};

const tick = () => {
  const s = useTimer.getState();
  if (s.phase === 'idle') return stopTicking();
  const remaining = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
  if (remaining !== s.remaining) useTimer.setState({ remaining });
  if (
    remaining > 0 &&
    remaining <= 3 &&
    lastBeep !== remaining &&
    AppState.currentState === 'active'
  ) {
    lastBeep = remaining;
    playTick();
    haptic('light');
  }
  if (remaining === 0) end();
};

const end = (elapsedOverride?: number) => {
  const s = useTimer.getState();
  stopTicking();
  lastBeep = -1;
  const foreground = AppState.currentState === 'active';
  if (foreground) {
    playEnd();
    haptic('success');
  }
  // Wall-clock duration: stays right after −15 s / +15 s adjustments.
  const elapsed =
    elapsedOverride ?? Math.max(1, Math.round((s.endAt - s.startedAt) / 1000));
  listeners.forEach(l => l(s, elapsed));
  if (s.phase === 'work' && s.restAfter > 0) {
    // Chain the rest; if we were in background, account for the time already spent.
    const startAt = s.endAt;
    begin(
      'rest',
      s.restAfter,
      { ref: s.ref, label: 'Recupero', nextLabel: s.nextLabel },
      startAt,
    );
    return;
  }
  useTimer.setState({ ...IDLE });
};

const begin = (
  phase: Exclude<TimerPhase, 'idle'>,
  sec: number,
  info: {
    ref?: SetRef | null;
    label: string;
    nextLabel?: string;
    restAfter?: number;
  },
  from = Date.now(),
) => {
  stopTicking();
  lastBeep = -1;
  const endAt = from + sec * 1000;
  useTimer.setState({
    phase,
    startedAt: from,
    endAt,
    total: sec,
    remaining: Math.max(0, Math.ceil((endAt - Date.now()) / 1000)),
    ref: info.ref ?? null,
    label: info.label,
    nextLabel: info.nextLabel ?? '',
    restAfter: info.restAfter ?? 0,
  });
  interval = setInterval(tick, 250);
  tick();
};

export const startRest = (
  sec: number,
  nextLabel: string,
  ref: SetRef | null = null,
) => sec > 0 && begin('rest', sec, { ref, label: 'Recupero', nextLabel });

export const startWork = (
  sec: number,
  ref: SetRef,
  label: string,
  restAfter: number,
  nextLabel: string,
) => begin('work', sec, { ref, label, restAfter, nextLabel });

export const adjustTimer = (deltaSec: number) => {
  const s = useTimer.getState();
  if (s.phase === 'idle') return;
  const endAt = Math.max(Date.now() + 1000, s.endAt + deltaSec * 1000);
  const remaining = Math.ceil((endAt - Date.now()) / 1000);
  useTimer.setState({
    endAt,
    remaining,
    total: Math.max(s.total + deltaSec, remaining),
  });
  haptic('selection');
};

/** Skip the rest, or finish a timed set right now (logging the elapsed time). */
export const finishNow = () => {
  const s = useTimer.getState();
  if (s.phase === 'idle') return;
  if (s.phase === 'rest') {
    stopTicking();
    useTimer.setState({ ...IDLE });
    return;
  }
  const elapsed = Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
  useTimer.setState({ endAt: Date.now(), restAfter: s.restAfter });
  end(elapsed);
};

export const stopTimer = () => {
  stopTicking();
  useTimer.setState({ ...IDLE });
  cancelRestEnd();
};

AppState.addEventListener('change', st => {
  const s = useTimer.getState();
  if (st === 'active') {
    cancelRestEnd();
    if (s.phase !== 'idle') {
      if (!interval) interval = setInterval(tick, 250);
      tick();
    }
  } else if (st === 'background' && s.phase !== 'idle' && notifyInBackground) {
    const endAt = s.phase === 'work' ? s.endAt + s.restAfter * 1000 : s.endAt;
    scheduleRestEnd(endAt, s.nextLabel);
  }
});
