import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useStore } from './src/data/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ToastHost } from './src/ui/Toast';
import { MenuHost } from './src/ui/Menu';
import { installWorkoutRuntime } from './src/workout/actions';
import { setRestNotifications } from './src/workout/timer';
import { setHapticsEnabled } from './src/services/haptics';
import { setSoundEnabled } from './src/services/sound';
import { syncReminders } from './src/services/notifications';
import {
  writeWeightToHealth,
  writeWorkoutToHealth,
} from './src/services/health';

/** Keeps native services in sync with the settings. */
function Runtime() {
  const hydrated = useStore(s => s.hydrated);
  const settings = useStore(s => s.settings);

  useEffect(() => installWorkoutRuntime(), []);

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

  // Finished workouts and new weigh-ins go to Health Connect / Salute.
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
            .filter(b => !known.has(b.id))
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
