/**
 * The whole workout at a glance: time, sets and volume so far, and every
 * exercise with its progress. Tap one to jump to it.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActiveWorkout, DisplayUnit } from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import { fmtClock, fmtNum } from '../../core/format';
import { toDisplay } from '../../core/units';
import { numeric } from '../../theme/typography';
import { withAlpha } from '../../theme/colors';
import { workoutProgress } from '../../workout/engine';
import { useNow } from '../../ui/useNow';

interface Props {
  visible: boolean;
  workout: ActiveWorkout;
  page: number;
  unit: DisplayUnit;
  onClose: () => void;
  onGo: (bi: number) => void;
}


export function WorkoutOverview({
  visible,
  workout,
  page,
  unit,
  onClose,
  onGo,
}: Props) {
  const { c } = useTheme();
  const now = useNow(1000, visible);
  const progress = workoutProgress(workout);
  const volumeKg = workout.blocks.reduce(
    (sum, b) =>
      sum +
      b.exercises.reduce(
        (s, e) =>
          s +
          (e.kind === 'reps'
            ? e.sets
                .filter(x => x.done)
                .reduce((v, x) => v + (x.kg ?? 0) * (x.reps ?? 0), 0)
            : 0),
        0,
      ),
    0,
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Panoramica" scroll>
      <View style={[styles.stats, { backgroundColor: c.fill4 }]}>
        <Stat
          label="Tempo"
          value={fmtClock((now - workout.startedAt) / 1000)}
        />
        <Stat label="Serie" value={`${progress.done}/${progress.total}`} />
        <Stat
          label={`Volume (${unit})`}
          value={fmtNum(Math.round(toDisplay(volumeKg, unit)), 0)}
        />
      </View>

      {workout.blocks.map((b, bi) => {
        const sets = b.exercises.flatMap(e => e.sets);
        const done = sets.filter(s => s.done).length;
        const complete = done === sets.length;
        const here = bi === page;
        return (
          <Tap
            key={b.id}
            onPress={() => onGo(bi)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`Vai a ${b.exercises
              .map(e => e.name)
              .join(' e ')}`}
            style={[
              styles.row,
              {
                backgroundColor: here ? c.accentSoft : c.card,
              },
            ]}
          >
            <ExerciseThumb
              catalogId={b.exercises[0].catalogId}
              kind={b.exercises[0].kind}
              size={44}
            />
            <View style={styles.texts}>
              <T v="headline" numberOfLines={1}>
                {b.exercises.map(e => e.name).join(' + ')}
              </T>
              <T v="footnote" color="secondary">
                {b.exercises.length > 1
                  ? `${b.exercises.length > 2 ? 'Circuito' : 'Superset'} · `
                  : ''}
                {done}/{sets.length} serie
              </T>
            </View>
            <View
              style={[
                styles.status,
                {
                  backgroundColor: complete
                    ? c.green
                    : done
                    ? withAlpha(c.accent, 0.16)
                    : c.fill3,
                },
              ]}
            >
              {complete ? (
                <Icon name="check" size={16} color="#FFFFFF" weight={3} />
              ) : (
                <T
                  v="caption2"
                  color={done ? 'accent' : 'secondary'}
                  weight="700"
                >
                  {bi + 1}
                </T>
              )}
            </View>
          </Tap>
        );
      })}
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat}>
      <T style={[numeric(24), { color: c.label }]}>{value}</T>
      <T v="caption" color="secondary">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 12,
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  texts: { flex: 1, minWidth: 0 },
  status: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
