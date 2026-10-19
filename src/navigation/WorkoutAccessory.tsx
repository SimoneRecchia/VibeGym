/**
 * "Now playing"-style bar for the workout in progress: the native tab bar
 * bottom accessory on iOS 26. (Android uses the notification and the
 * animated center tab instead.)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../data/store';
import { useTimer } from '../workout/timer';
import { workoutProgress } from '../workout/engine';
import { useTheme } from '../theme/ThemeProvider';
import { Tap } from '../ui/Pressable';
import { T } from '../ui/Text';
import { Icon } from '../ui/Icon';
import { Ring } from '../ui/charts/Ring';
import { useNow } from '../ui/useNow';
import { fmtClock } from '../core/format';
import { Nav } from './types';

function AccessoryContent({ compact }: { compact?: boolean }) {
  const { c } = useTheme();
  const workout = useStore(s => s.workout);
  const phase = useTimer(s => s.phase);
  const remaining = useTimer(s => s.remaining);
  const total = useTimer(s => s.total);
  const now = useNow(1000, !!workout);
  if (!workout) return null;
  const p = workoutProgress(workout);
  const timing = phase !== 'idle';
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Ring
        progress={
          timing
            ? 1 - remaining / Math.max(1, total)
            : p.done / Math.max(1, p.total)
        }
        size={30}
        stroke={3.5}
        color={phase === 'work' ? c.green : c.accent}
      >
        <Icon name={timing ? 'timer' : 'dumbbell'} size={14} color={c.label} />
      </Ring>
      <View style={styles.texts}>
        <T v="subheadStrong" numberOfLines={1}>
          {timing
            ? `${phase === 'rest' ? 'Recupero' : 'Esercizio'} ${fmtClock(
                remaining,
              )}`
            : workout.dayName}
        </T>
        {!compact ? (
          <T v="caption" color="secondary" numberOfLines={1}>
            {fmtClock((now - workout.startedAt) / 1000)} · {p.done}/{p.total}{' '}
            serie
          </T>
        ) : null}
      </View>
      <Icon name="chevron-up" size={18} color={c.secondary} />
    </View>
  );
}

/** Content of the native iOS 26 accessory (the system draws the glass). */
export function NativeWorkoutAccessory({
  placement,
}: {
  placement: 'inline' | 'expanded' | 'none';
}) {
  const nav = useNavigation<Nav>();
  return (
    <Tap
      onPress={() => nav.navigate('Workout')}
      style={styles.fill}
      accessibilityRole="button"
      accessibilityLabel="Riprendi allenamento"
    >
      <AccessoryContent compact={placement === 'inline'} />
    </Tap>
  );
}


const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rowCompact: { paddingVertical: 4, gap: 8 },
  texts: { flex: 1, minWidth: 0 },
});
