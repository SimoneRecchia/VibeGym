import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore, selectActivePlan } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { Button, IconButton } from '../ui/Button';
import { Empty } from '../ui/Empty';
import { ExerciseRow } from './components/ExerciseRow';
import {
  allExercises,
  countSets,
  dayMuscles,
  estimateDayMinutes,
  isSuperset,
} from '../plan/planUtils';
import { fmtDuration, fmtMinutes, plural } from '../core/format';
import { ScreenProps } from '../navigation/types';
import { useDraft } from '../data/draft';

export function DayScreen({ route, navigation }: ScreenProps<'Day'>) {
  const { c } = useTheme();
  const plan = useStore(selectActivePlan);
  const workout = useStore(s => s.workout);
  const startWorkout = useStore(s => s.startWorkout);
  const day = plan?.days.find(d => d.id === route.params.dayId);

  if (!plan || !day) {
    return (
      <Screen title="Giorno" back>
        <Empty icon="calendar" title="Giorno non trovato" />
      </Screen>
    );
  }

  const start = () => {
    if (workout) {
      navigation.navigate('Workout');
      return;
    }
    if (startWorkout(plan.id, day.id)) navigation.navigate('Workout');
  };

  const edit = () => {
    useDraft.setState({ editing: JSON.parse(JSON.stringify(plan)) });
    navigation.navigate('PlanEditor');
  };

  const sameDayInProgress = workout?.dayId === day.id;

  return (
    <Screen
      title={day.name}
      eyebrow={plan.name}
      back
      right={
        <IconButton
          icon="pencil"
          onPress={edit}
          accessibilityLabel="Modifica scheda"
        />
      }
      footer={
        <Button
          title={
            sameDayInProgress
              ? 'Riprendi allenamento'
              : workout
              ? 'Allenamento in corso'
              : 'Inizia allenamento'
          }
          icon="play"
          onPress={start}
          disabled={!allExercises(day).length}
        />
      }
    >
      <View style={styles.meta}>
        <Stat label="Esercizi" value={String(allExercises(day).length)} />
        <Stat label="Serie" value={String(countSets(day))} />
        <Stat
          label="Durata"
          value={`~${fmtMinutes(estimateDayMinutes(day))}`}
        />
      </View>
      {dayMuscles(day, 4).length ? (
        <T v="subhead" color="secondary" style={styles.muscles}>
          {dayMuscles(day, 4).join(' · ')}
        </T>
      ) : null}

      {!day.blocks.length ? (
        <Empty
          icon="dumbbell"
          title="Nessun esercizio"
          text="Aggiungili dall'editor della scheda."
        />
      ) : null}

      {day.blocks.map(b => (
        <Card key={b.id} style={styles.card}>
          {isSuperset(b) ? (
            <View style={styles.ssHead}>
              <View style={[styles.ssPill, { backgroundColor: c.accentSoft }]}>
                <T v="caption2" color="accent" weight="700">
                  {b.exercises.length > 2 ? 'Circuito' : 'Superset'}
                </T>
              </View>
              <T v="footnote" color="secondary">
                {plural(
                  Math.max(...b.exercises.map(e => e.sets.length)),
                  'giro',
                  'giri',
                )}{' '}
                · recupero{' '}
                {fmtDuration(b.exercises[b.exercises.length - 1].restSec)} dopo
                il giro
              </T>
            </View>
          ) : null}
          {b.exercises.map((ex, ei) => (
            <View key={ex.id}>
              {ei > 0 ? (
                <View style={[styles.sep, { backgroundColor: c.separator }]} />
              ) : null}
              <ExerciseRow
                ex={ex}
                showRest={!isSuperset(b)}
                onPress={() =>
                  navigation.navigate('ExerciseInfo', {
                    catalogId: ex.catalogId,
                    name: ex.name,
                  })
                }
              />
              {ex.notes ? (
                <T v="footnote" color="secondary" style={styles.notes}>
                  {ex.notes}
                </T>
              ) : null}
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.card }]}>
      <T v="title3">{value}</T>
      <T v="footnote" color="secondary">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  muscles: { marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  card: { marginTop: 12, paddingVertical: 6 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  ssHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  ssPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  notes: { marginLeft: 64, marginTop: -4, marginBottom: 8 },
});
