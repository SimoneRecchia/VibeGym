import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { Icon } from '../../ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { selectLatestWeight, useStore } from '../../data/store';
import { workoutHeartRate } from '../../hr/hrRuntime';
import { ageFrom } from '../../core/dates';
import { toSession, workoutProgress } from '../../workout/engine';
import { sessionVolume } from '../../stats/metrics';
import { fmtClock, fmtNum } from '../../core/format';
import { recordText } from '../components/recordText';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (sessionId: string) => void;
  onDiscarded: () => void;
}

export function FinishSheet({ visible, onClose, onSaved, onDiscarded }: Props) {
  const { c } = useTheme();
  const workout = useStore(s => s.workout);
  const sessions = useStore(s => s.sessions);
  const unit = useStore(s => s.settings.unit);
  const [notes, setNotes] = useState('');

  const preview = useMemo(
    () => (workout && visible ? toSession(workout, sessions) : null),
    [workout, sessions, visible],
  );
  if (!workout || !preview) return null;
  const p = workoutProgress(workout);
  const volume = sessionVolume(preview);

  const save = () => {
    useStore.getState().updateWorkout(w => {
      w.notes = notes.trim() || undefined;
    });
    const st = useStore.getState();
    const hr = workoutHeartRate({
      kg: selectLatestWeight(st)?.weightKg,
      age: ageFrom(st.profile.birthDate),
      sex: st.profile.sex,
    });
    const s = st.finishWorkout(hr ? { hr } : undefined);
    if (s) onSaved(s.id);
  };

  const discard = () =>
    Alert.alert(
      'Scartare l’allenamento?',
      'Le serie registrate in questa sessione andranno perse.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Scarta', style: 'destructive', onPress: onDiscarded },
      ],
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Fine allenamento"
      subtitle={workout.dayName}
      scroll
    >
      <View style={styles.stats}>
        <Stat label="Durata" value={fmtClock(preview.durationSec)} />
        <Stat label="Serie" value={`${p.done}/${p.total}`} />
        <Stat
          label="Volume"
          value={volume ? `${fmtNum(volume / 1000, 1)} t` : '–'}
        />
      </View>

      {preview.records?.length ? (
        <View style={[styles.records, { backgroundColor: c.accentSoft }]}>
          <View style={styles.recHead}>
            <Icon name="trophy" size={20} color={c.accent} />
            <T v="headline">
              {preview.records.length === 1
                ? 'Nuovo record!'
                : `${preview.records.length} nuovi record!`}
            </T>
          </View>
          {preview.records.map(r => (
            <T key={r.key + r.kind} v="subhead" color="secondary">
              {r.name}: {recordText(r, unit)}
            </T>
          ))}
        </View>
      ) : null}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Note sull'allenamento (facoltative)"
        placeholderTextColor={c.tertiary}
        multiline
        style={[styles.notes, { backgroundColor: c.fill4, color: c.label }]}
      />

      {p.done < p.total ? (
        <T v="footnote" color="secondary" align="center" style={styles.warn}>
          {p.total - p.done} serie non completate: verranno salvate come
          saltate.
        </T>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Salva allenamento"
          icon="check"
          onPress={save}
          disabled={p.done === 0}
        />
        <Button
          title="Continua ad allenarti"
          variant="glass"
          onPress={onClose}
        />
        <Button title="Scarta" variant="plain" tint={c.red} onPress={discard} />
      </View>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.fill4 }]}>
      <T v="title3">{value}</T>
      <T v="footnote" color="secondary">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 18, padding: 12 },
  records: { borderRadius: 20, padding: 14, marginTop: 12, gap: 4 },
  recHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notes: {
    minHeight: 70,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  warn: { marginTop: 10 },
  actions: { gap: 8, marginTop: 16 },
});
