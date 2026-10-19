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
import { weighReminderAt } from '../body/schedule';

const CH_TIMER = 'timer';
const CH_REMINDERS = 'reminders';
/** Silent, always-there notification of the workout in progress (Android). */
export const CH_LIVE = 'workout-live';
/**
 * On Android the rest end replaces the workout notification (same id), so
 * the player-like notification itself rings; iOS has a separate one.
 */
export const LIVE_ID = 'workout-live';
const REST_ID = Platform.OS === 'android' ? LIVE_ID : 'rest-end';

let channelsReady: Promise<void> | null = null;
export const ensureChannels = () => {
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
        {
          id: CH_LIVE,
          name: 'Allenamento in corso',
          importance: AndroidImportance.LOW,
          vibration: false,
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
        title: 'Tocca a te',
        body: nextLabel || 'Pronto per la prossima serie',
        android: {
          channelId: CH_TIMER,
          smallIcon: 'ic_stat_notify',
          pressAction: { id: 'default', launchActivity: 'default' },
          timestamp: endAt,
          showTimestamp: true,
          // It takes the place of the workout notification: keep it there.
          ongoing: true,
          autoCancel: false,
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
    // Android: only the scheduled alert; the workout notification stays.
    if (Platform.OS === 'android')
      await notifee.cancelTriggerNotification(REST_ID);
    else await notifee.cancelNotification(REST_ID);
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

/**
 * Re-create all reminder notifications from the current settings. Called at
 * launch, when reminders change and after each weigh-in (the weigh-in reminder
 * is relative to the last one).
 */
export const syncReminders = async (
  settings: Settings,
  lastWeighIso?: string,
) => {
  const s = settings.notifications;
  const weigh = settings.weigh.enabled && s.weighIn.enabled;
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const ours = ids.filter(id => id.startsWith('rem-'));
    if (ours.length) await notifee.cancelTriggerNotifications(ours);
    const any = s.workout.enabled || weigh || s.measures.enabled;
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
    if (weigh) {
      // From the due day, every day until the next weigh-in re-syncs it.
      await reminder(
        'rem-weigh',
        'È ora di pesarti',
        'Sali sulla bilancia: bastano pochi secondi.',
        weighReminderAt(lastWeighIso, settings.weigh, s.weighIn.time),
        RepeatFrequency.DAILY,
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
