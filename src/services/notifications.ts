/**
 * Local notifications (react-native-notify-kit, the maintained Notifee fork).
 *
 *  - Rest end: scheduled only while the app is in background, so a locked
 *    phone in your pocket still tells you when to start the next set.
 *  - Reminders: weekly workout days, daily/weekly weigh-in, monthly measures.
 */
import { Platform } from 'react-native';
import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from 'react-native-notify-kit';
import { Settings } from '../core/types';
import { parseHM } from '../core/dates';

const CH_TIMER = 'timer';
const CH_REMINDERS = 'reminders';
const REST_ID = 'rest-end';

let channelsReady: Promise<void> | null = null;
const ensureChannels = () => {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelsReady) {
    channelsReady = notifee
      .createChannels([
        {
          id: CH_TIMER,
          name: 'Timer di recupero',
          importance: AndroidImportance.HIGH,
          vibration: true,
        },
        {
          id: CH_REMINDERS,
          name: 'Promemoria',
          importance: AndroidImportance.DEFAULT,
        },
      ])
      .catch(() => {
        channelsReady = null;
      });
  }
  return channelsReady;
};

/**
 * Android 12+: exact alarms ("Sveglie e promemoria") can be off. Without them
 * the rest-end notification may arrive late. Returns false only when off.
 */
export const exactAlarmsAllowed = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const s = await notifee.getNotificationSettings();
    return s.android.alarm !== AndroidNotificationSetting.DISABLED;
  } catch {
    return true;
  }
};

export const openExactAlarmSettings = () =>
  notifee.openAlarmPermissionSettings().catch(() => {});

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const s = await notifee.requestPermission({
      alert: true,
      sound: true,
      badge: false,
    });
    return s.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  } catch {
    return false;
  }
};

const trigger = (
  timestamp: number,
  repeat?: RepeatFrequency,
  exact = false,
): TimestampTrigger => ({
  type: TriggerType.TIMESTAMP,
  timestamp,
  repeatFrequency: repeat,
  alarmManager: {
    type: exact
      ? AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE
      : AlarmType.SET_AND_ALLOW_WHILE_IDLE,
  },
});

/* ------------------------------------------------------------------ */
/*  Rest timer                                                         */
/* ------------------------------------------------------------------ */

export const scheduleRestEnd = async (endAt: number, nextLabel: string) => {
  if (endAt - Date.now() < 2000) return;
  try {
    await ensureChannels();
    await notifee.createTriggerNotification(
      {
        id: REST_ID,
        title: 'Recupero finito',
        body: nextLabel
          ? `Tocca a te: ${nextLabel}`
          : 'Pronto per la prossima serie',
        android: {
          channelId: CH_TIMER,
          smallIcon: 'ic_stat_notify',
          pressAction: { id: 'default' },
          timestamp: endAt,
          showTimestamp: true,
        },
        ios: { sound: 'default', interruptionLevel: 'timeSensitive' },
      },
      // Exact alarm: a rest timer late by minutes is useless. notify-kit falls
      // back to an inexact alarm if the user didn't allow exact ones.
      trigger(endAt, undefined, true),
    );
  } catch {
    /* permission missing or module unavailable */
  }
};

export const cancelRestEnd = async () => {
  try {
    await notifee.cancelNotification(REST_ID);
  } catch {
    /* no-op */
  }
};

/* ------------------------------------------------------------------ */
/*  Reminders                                                          */
/* ------------------------------------------------------------------ */

/** Next occurrence of weekday (0=Sun) at HH:MM, strictly in the future. */
const nextWeekday = (weekday: number, hm: string, now = new Date()): number => {
  const { h, m } = parseHM(hm);
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0,
  );
  let add = (weekday - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() <= now.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d.getTime();
};

const nextDaily = (hm: string, now = new Date()): number => {
  const { h, m } = parseHM(hm);
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0,
  );
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
};

const reminder = (
  id: string,
  title: string,
  body: string,
  when: number,
  repeat: RepeatFrequency,
) =>
  notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: CH_REMINDERS,
        smallIcon: 'ic_stat_notify',
        pressAction: { id: 'default' },
      },
    },
    trigger(when, repeat),
  );

/** Re-create all reminder notifications from the current settings. */
export const syncReminders = async (s: Settings['notifications']) => {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const ours = ids.filter(id => id.startsWith('rem-'));
    if (ours.length) await notifee.cancelTriggerNotifications(ours);
    const any = s.workout.enabled || s.weighIn.enabled || s.measures.enabled;
    if (!any) return;
    await ensureChannels();
    if (s.workout.enabled) {
      for (const wd of s.workout.weekdays) {
        await reminder(
          `rem-workout-${wd}`,
          'È ora di allenarti 💪',
          'La tua scheda ti aspetta.',
          nextWeekday(wd, s.workout.time),
          RepeatFrequency.WEEKLY,
        );
      }
    }
    if (s.weighIn.enabled) {
      const when =
        s.weighIn.frequency === 'daily'
          ? nextDaily(s.weighIn.time)
          : nextWeekday(s.weighIn.weekday, s.weighIn.time);
      await reminder(
        'rem-weigh',
        'Pesata',
        'Sali sulla bilancia: bastano pochi secondi.',
        when,
        s.weighIn.frequency === 'daily'
          ? RepeatFrequency.DAILY
          : RepeatFrequency.WEEKLY,
      );
    }
    if (s.measures.enabled) {
      const { h, m } = parseHM(s.measures.time);
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth(), 1, h, m);
      if (d.getTime() <= now.getTime()) d.setMonth(d.getMonth() + 1);
      await reminder(
        'rem-measures',
        'Misure del mese',
        'Prendi le misure: vita, petto, braccia…',
        d.getTime(),
        RepeatFrequency.MONTHLY,
      );
    }
  } catch {
    /* permission missing or module unavailable */
  }
};
