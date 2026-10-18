import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Empty } from '../ui/Empty';
import { ExerciseThumb } from '../ui/ExerciseMedia';
import {
  capitalize,
  fmtClock,
  fmtNum,
  fmtTime,
  fmtWeekdayDate,
} from '../core/format';
import { fmtLoadValue } from '../core/units';
import { sessionSetsDone, sessionVolume } from '../stats/metrics';
import { recordText } from './components/recordText';
import { ScreenProps } from '../navigation/types';
import { Tap } from '../ui/Pressable';

export function SessionScreen({ route, navigation }: ScreenProps<'Session'>) {
  const { c } = useTheme();
  const session = useStore(s => s.sessions.find(x => x.id === route.params.id));
  const unit = useStore(s => s.settings.unit);
  const deleteSession = useStore(s => s.deleteSession);

  if (!session) {
    return (
      <Screen title="Allenamento" back>
        <Empty icon="calendar" title="Allenamento non trovato" />
      </Screen>
    );
  }

  const remove = () =>
    Alert.alert(
      'Eliminare questo allenamento?',
      'Sparirà anche dai grafici dei progressi.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
            deleteSession(session.id);
          },
        },
      ],
    );

  const volume = sessionVolume(session);
  const exercises = session.exercises.filter(e => e.sets.some(s => s.done));

  return (
    <Screen
      title={session.dayName}
      eyebrow={`${capitalize(fmtWeekdayDate(session.startedAt))} · ${fmtTime(
        session.startedAt,
      )}`}
      back
      right={
        <IconButton
          icon="trash"
          onPress={remove}
          accessibilityLabel="Elimina allenamento"
        />
      }
    >
      <View style={styles.stats}>
        <Stat label="Durata" value={fmtClock(session.durationSec)} />
        <Stat label="Serie" value={String(sessionSetsDone(session))} />
        <Stat
          label="Volume"
          value={volume ? `${fmtNum(volume / 1000, 1)} t` : '–'}
        />
      </View>

      {session.records?.length ? (
        <Card style={styles.block}>
          <View style={styles.recHead}>
            <Icon name="trophy" size={22} color={c.accent} />
            <T v="headline">
              {session.records.length === 1
                ? 'Nuovo record'
                : `${session.records.length} nuovi record`}
            </T>
          </View>
          {session.records.map(r => (
            <T
              key={r.key + r.kind}
              v="subhead"
              color="secondary"
              style={styles.recLine}
            >
              {r.name} — {recordText(r, unit)}
            </T>
          ))}
        </Card>
      ) : null}

      {session.notes ? (
        <Card style={styles.block}>
          <T v="footnoteStrong" color="secondary">
            NOTE
          </T>
          <T v="body" style={styles.recLine}>
            {session.notes}
          </T>
        </Card>
      ) : null}

      {exercises.map(ex => (
        <Tap
          key={`${ex.exerciseId}-${ex.key}`}
          onPress={() =>
            navigation.navigate('ExerciseTrend', { key: ex.key, name: ex.name })
          }
          scaleTo={0.98}
        >
          <Card style={styles.block}>
            <View style={styles.exHead}>
              <ExerciseThumb
                catalogId={ex.catalogId}
                kind={ex.kind}
                size={40}
              />
              <T v="headline" style={styles.flex} numberOfLines={2}>
                {ex.name}
              </T>
              <Icon name="chart" size={18} color={c.tertiary} />
            </View>
            {ex.sets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <T v="subhead" color="secondary" style={styles.setNum}>
                  {i + 1}
                </T>
                <T
                  v="subhead"
                  color={s.done ? 'label' : 'tertiary'}
                  style={styles.flex}
                >
                  {ex.kind === 'reps'
                    ? `${s.kg ? `${fmtLoadValue(s.kg, unit)} ${unit} × ` : ''}${
                        s.reps ?? 0
                      } rip.`
                    : ex.kind === 'time'
                    ? `${s.sec ?? 0} s${
                        s.kg ? ` · +${fmtLoadValue(s.kg, unit)} ${unit}` : ''
                      }`
                    : `${fmtClock(s.sec ?? 0)}${
                        s.km ? ` · ${fmtNum(s.km, 2)} km` : ''
                      }`}
                </T>
                {s.done ? (
                  <Icon name="check" size={16} color={c.green} weight={2.6} />
                ) : (
                  <T v="footnote" color="tertiary">
                    saltata
                  </T>
                )}
              </View>
            ))}
          </Card>
        </Tap>
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
  stats: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  stat: { flex: 1, borderRadius: 20, padding: 14 },
  block: { marginTop: 12 },
  recHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recLine: { marginTop: 6 },
  exHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  flex: { flex: 1, minWidth: 0 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  setNum: { width: 22, textAlign: 'center' },
});
