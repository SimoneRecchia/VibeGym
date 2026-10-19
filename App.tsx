import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useStore } from './src/data/store';
import { AppNavigator, navigationRef } from './src/navigation/AppNavigator';
import { ToastHost } from './src/ui/Toast';
import { MenuHost } from './src/ui/Menu';
import { installWorkoutRuntime } from './src/workout/actions';
import {
  consumeOpenRequest,
  installWorkoutNotification,
  setOpenWorkout,
} from './src/services/workoutNotification';
import notifee from 'react-native-notify-kit';
import { setRestNotifications } from './src/workout/timer';
import { setHapticsEnabled } from './src/services/haptics';
import { setSoundEnabled } from './src/services/sound';
import { syncReminders } from './src/services/notifications';
import {
  connectHr,
  disconnectHr,
  startHrRecording,
  stopHrRecording,
} from './src/hr/hrRuntime';
import {
  useHealthSync,
  writeWeightToHealth,
  writeWorkoutToHealth,
} from './src/services/health';

/** Keeps native services in sync with the settings. */
function Runtime() {
  const hydrated = useStore(s => s.hydrated);
  const settings = useStore(s => s.settings);

  useEffect(() => installWorkoutRuntime(), []);

  // Workout notification (Android): in sync with the workout; a tap on it
  // opens the workout, also when it launched the app.
  useEffect(() => {
    if (!hydrated) return;
    const open = (tries = 10) => {
      if (!useStore.getState().workout) return;
      if (navigationRef.isReady()) navigationRef.navigate('Workout');
      else if (tries > 0) setTimeout(() => open(tries - 1), 300);
    };
    setOpenWorkout(() => open());
    if (consumeOpenRequest()) open();
    notifee
      .getInitialNotification()
      .then(n => {
        if (n?.notification.id === 'workout-live') open();
      })
      .catch(() => {});
    const stop = installWorkoutNotification();
    return () => {
      stop();
      setOpenWorkout(null);
    };
  }, [hydrated]);

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
    setSoundEnabled(settings.sound);
    setRestNotifications(settings.notifications.restEnd);
  }, [settings.haptics, settings.sound, settings.notifications.restEnd]);

  // Reminders are re-armed at each launch (timestamps move forward) and after
  // each weigh-in, since the weigh-in reminder counts from the last one.
  const lastWeigh = useStore(s => s.body[s.body.length - 1]?.date);
  useEffect(() => {
    if (hydrated) syncReminders(useStore.getState().settings, lastWeigh);
  }, [hydrated, lastWeigh]);

  // The heart-rate sensor is connected for the length of a workout (also
  // after a restart with a workout in progress).
  const inWorkout = useStore(s => !!s.workout);
  const hrId = useStore(s => s.settings.hr.deviceId);
  useEffect(() => {
    if (!hydrated || !inWorkout || !hrId) return;
    connectHr(hrId);
    startHrRecording();
    return () => {
      stopHrRecording();
      disconnectHr();
    };
  }, [hydrated, inWorkout, hrId]);

  // Profile gaps and other scales' weigh-ins come from Health Connect /
  // Salute; finished workouts and new weigh-ins go to it.
  useHealthSync();
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (!s.hydrated || !prev.hydrated) return;
        const h = s.settings.health;
        if (!h.enabled) return;
        if (h.writeWorkouts && s.sessions.length > prev.sessions.length) {
          const last = s.sessions[s.sessions.length - 1];
          if (!prev.sessions.some(x => x.id === last.id))
            writeWorkoutToHealth(last);
        }
        if (h.writeWeight && s.body !== prev.body) {
          const known = new Set(prev.body.map(b => b.id));
          s.body
            .filter(b => !known.has(b.id) && b.source !== 'health')
            .forEach(b => writeWeightToHealth(b));
        }
      }),
    [],
  );

  return null;
}

function Root() {
  const { c, dark } = useTheme();
  const hydrated = useStore(s => s.hydrated);
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {hydrated ? (
        <>
          <AppNavigator />
          <MenuHost />
          <ToastHost />
          <Runtime />
        </>
      ) : (
        <View style={styles.splash}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
    </View>
  );
}

export default function App() {
  useEffect(() => {
    useStore.getState().hydrate();
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
