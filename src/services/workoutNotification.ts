/**
 * Android: the workout in progress lives in the notification shade like a
 * music player. During a rest it counts down by itself (the system
 * chronometer keeps going with the phone locked) with −15 s, +15 s and
 * skip; between sets it stays there dimmed, with the elapsed time; when the
 * rest runs out it says "Tocca a te". Tapping it opens the workout.
 */
import { AppState, Platform } from 'react-native';
import notifee, { Event, EventType } from 'react-native-notify-kit';
import { useStore } from '../data/store';
import { adjustTimer, finishNow, useTimer } from '../workout/timer';
import { useRestAlarm } from '../workout/alarm';
import { workoutProgress } from '../workout/engine';
import { ACCENTS } from '../theme/colors';
import { CH_LIVE, LIVE_ID, ensureChannels } from './notifications';

const ANDROID = Platform.OS === 'android';
const OFF = '#8E8E93';

const ACT = {
  minus: 'rest-minus',
  plus: 'rest-plus',
  skip: 'rest-skip',
  done: 'work-done',
} as const;

let openWorkout: (() => void) | null = null;
let openPending = false;

/** How to open the workout screen (set by the app once navigation exists). */
export const setOpenWorkout = (fn: (() => void) | null) => {
  openWorkout = fn;
  if (fn && openPending) {
    openPending = false;
    fn();
  }
};

/** Foreground and background events of the workout notification. */
export const handleWorkoutNotificationEvent = async ({
  type,
  detail,
}: Event): Promise<void> => {
  if (detail.notification?.id !== LIVE_ID) return;
  if (type === EventType.ACTION_PRESS) {
    const id = detail.pressAction?.id;
    if (id === ACT.minus) adjustTimer(-15);
    else if (id === ACT.plus) adjustTimer(15);
    else if (id === ACT.skip || id === ACT.done) finishNow();
    return;
  }
  if (type === EventType.PRESS) {
    if (openWorkout && AppState.currentState === 'active') openWorkout();
    else openPending = true;
  }
};

/** Opens the workout if the app was brought up by the notification. */
export const consumeOpenRequest = (): boolean => {
  const r = openPending;
  openPending = false;
  return r;
};

let shown = '';
let timer: ReturnType<typeof setTimeout> | null = null;

const render = async () => {
  const { workout: w, settings } = useStore.getState();
  if (!w) {
    if (shown) {
      shown = '';
      notifee.cancelNotification(LIVE_ID).catch(() => {});
    }
    return;
  }
  const t = useTimer.getState();
  const alarm = useRestAlarm.getState();
  const p = workoutProgress(w);
  const accent = ACCENTS[settings.accent]?.light ?? ACCENTS.blue.light;
  // Rang and nothing done since: still "your turn".
  const ringing =
    t.phase === 'idle' &&
    alarm.at > 0 &&
    alarm.at >= (lastTimerStart || 0) &&
    p.done === doneAtTimerStart;

  let content: {
    title: string;
    body: string;
    color: string;
    chrono?: { at: number; down: boolean };
    actions?: { title: string; id: string }[];
  };
  if (t.phase === 'rest')
    content = {
      title: 'Recupero',
      body: t.nextLabel ? `Poi: ${t.nextLabel}` : w.dayName,
      color: ACCENTS.cyan.light,
      chrono: { at: t.endAt, down: true },
      actions: [
        { title: '−15 s', id: ACT.minus },
        { title: '+15 s', id: ACT.plus },
        { title: 'Salta', id: ACT.skip },
      ],
    };
  else if (t.phase === 'work')
    content = {
      title: t.label || 'Esercizio',
      body: w.dayName,
      color: ACCENTS.green.light,
      chrono: { at: t.endAt, down: true },
      actions: [{ title: 'Fatto', id: ACT.done }],
    };
  else if (ringing)
    content = {
      title: 'Tocca a te',
      body: alarm.next || w.dayName,
      color: accent,
    };
  else
    content = {
      title: w.dayName,
      body: `${p.done}/${p.total} serie`,
      color: OFF,
      chrono: { at: w.startedAt, down: false },
    };

  const key = JSON.stringify(content);
  if (key === shown) return;
  shown = key;
  try {
    await ensureChannels();
    await notifee.displayNotification({
      id: LIVE_ID,
      title: content.title,
      body: content.body,
      android: {
        channelId: CH_LIVE,
        smallIcon: 'ic_stat_notify',
        color: content.color,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        pressAction: { id: 'default', launchActivity: 'default' },
        ...(content.chrono
          ? {
              showChronometer: true,
              chronometerDirection: content.chrono.down ? 'down' : 'up',
              timestamp: content.chrono.at,
            }
          : { showTimestamp: true, timestamp: Date.now() }),
        actions: content.actions?.map(a => ({
          title: a.title,
          pressAction: { id: a.id },
        })),
      },
    });
  } catch {
    shown = ''; // notifications off: try again on the next change
  }
};

let lastTimerStart = 0;
let doneAtTimerStart = -1;

const schedule = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    render();
  }, 80);
};

/** Keeps the notification in sync with the workout; returns the cleanup. */
export const installWorkoutNotification = (): (() => void) => {
  if (!ANDROID) return () => {};
  const unsubs = [
    useStore.subscribe((s, prev) => {
      if (
        s.workout !== prev.workout ||
        s.settings.accent !== prev.settings.accent
      )
        schedule();
    }),
    useTimer.subscribe((t, prev) => {
      if (
        t.phase !== 'idle' &&
        (prev.phase === 'idle' || t.startedAt !== prev.startedAt)
      ) {
        lastTimerStart = Date.now();
        const w = useStore.getState().workout;
        doneAtTimerStart = w ? workoutProgress(w).done : -1;
      }
      if (
        t.phase !== prev.phase ||
        t.endAt !== prev.endAt ||
        t.label !== prev.label ||
        t.nextLabel !== prev.nextLabel
      )
        schedule();
    }),
    useRestAlarm.subscribe(schedule),
    notifee.onForegroundEvent(e => {
      handleWorkoutNotificationEvent(e);
    }),
  ];
  const app = AppState.addEventListener('change', st => {
    if (st === 'active') {
      shown = ''; // the rest-end alert may have replaced it
      schedule();
    }
  });
  schedule();
  return () => {
    unsubs.forEach(u => u());
    app.remove();
  };
};
