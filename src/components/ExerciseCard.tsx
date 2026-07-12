import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Exercise, ExerciseSub, Reps } from '../lib/types';
import {
  effectiveSetWeight,
  formatSec,
  getSerieTotali,
  isCompletato,
  isTimedReps,
  repsToSeconds,
} from '../lib/helpers';
import { REP_UNIT_SUFFIX, formatReps, formatWeight } from '../lib/format';
import { Icon } from './Icon';
import { GlassButton } from './GlassButton';
import { TimerState } from '../lib/store';

interface Props {
  exercise: Exercise;
  num: number;
  tint?: string;
  timer: TimerState;
  /** Tap a set (not a pill): toggle done, NO timer. */
  onToggleSet: (idx: number) => void;
  /** Primary button: mark the next set + start its rest/work timer. */
  onStartTimer: () => void;
  /** Tap a reps/weight pill: open the set detail sheet, focusing that field. */
  onEditSet: (subId: string | null, setIdx: number, focus: 'weight' | 'reps') => void;
  onChangeNote: (val: string) => void;
}

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function ExerciseCard({
  exercise,
  num,
  tint,
  timer,
  onToggleSet,
  onStartTimer,
  onEditSet,
  onChangeNote,
}: Props) {
  const { palette, mode } = useTheme();
  const [notesOpen, setNotesOpen] = useState(false);
  const isSuper = exercise.tipo === 'superset';
  const serie = getSerieTotali(exercise);
  const stato = exercise._serie_stato ?? [];
  const done = isCompletato(exercise);
  const accent = tint ?? palette.accent;
  const hasNote = (exercise._note_utente?.length ?? 0) > 0;
  const timed = !isSuper && isTimedReps(exercise.reps) && repsToSeconds(exercise.reps) > 0;

  const timerActiveHere = timer.active && timer.exId === exercise.id;
  const inWork = timerActiveHere && timer.phase === 'work';
  const inRest = timerActiveHere && timer.phase === 'rest';

  const metaParts: string[] = [];
  if (isSuper) metaParts.push(`${serie} serie`);
  else if (exercise.reps) metaParts.push(`${serie} × ${formatReps(exercise.reps)}`);
  metaParts.push(`Rec ${formatSec(exercise.recupero_sec)}`);

  let actionLabel = '';
  let actionDisabled = false;
  let actionVariant: 'primary' | 'tonal' | 'secondary' = 'primary';
  if (done) {
    actionLabel = 'Completato';
    actionDisabled = true;
    actionVariant = 'secondary';
  } else if (inWork) {
    actionLabel = 'Serie in corso…';
    actionDisabled = true;
    actionVariant = 'tonal';
  } else if (inRest) {
    actionLabel = 'Recupero in corso…';
    actionDisabled = true;
    actionVariant = 'tonal';
  } else if (timer.active) {
    actionLabel = 'Timer occupato';
    actionDisabled = true;
    actionVariant = 'secondary';
  } else if (timed) {
    actionLabel = `Inizia serie · ${formatSec(repsToSeconds(exercise.reps))}`;
  } else {
    actionLabel = `Serie fatta · ${formatSec(exercise.recupero_sec)}`;
  }

  const cardBg =
    mode === 'dark'
      ? hexToRgba(stripHash(accent), done ? 0.05 : 0.09)
      : hexToRgba(stripHash(accent), done ? 0.04 : 0.06);
  const borderCol = done ? palette.glassBorder : hexToRgba(stripHash(accent), 0.3);

  const pillStyle = (override: boolean) => ({
    backgroundColor: override ? hexToRgba(stripHash(accent), 0.16) : palette.surface,
    borderColor: override ? hexToRgba(stripHash(accent), 0.5) : palette.glassBorderStrong,
  });

  // Reps pill — target, or actual/target coloured when they differ. Tappable → edit.
  const repsPill = (
    reps: Reps | undefined,
    actual: number | null | undefined,
    subId: string | null,
    setIdx: number
  ) => {
    const target = reps?.value ?? null;
    const sfx = REP_UNIT_SUFFIX[reps?.unit ?? 'times'];
    const override = actual != null;
    let content: React.ReactNode;
    if (target == null || target === 0) {
      content = (
        <Text style={[styles.pillText, { color: palette.text }]}>
          {actual != null ? `${actual}${sfx}` : 'AMRAP'}
        </Text>
      );
    } else if (actual == null || actual === target) {
      content = <Text style={[styles.pillText, { color: palette.text }]}>{`${target}${sfx}`}</Text>;
    } else {
      const tone = actual >= target ? palette.success : palette.danger;
      content = (
        <Text style={styles.pillText}>
          <Text style={{ color: tone, fontWeight: '800' }}>{`${actual}${sfx}`}</Text>
          <Text style={{ color: palette.textFaint }}>{` / ${target}${sfx}`}</Text>
        </Text>
      );
    }
    return (
      <Pressable
        onPress={() => onEditSet(subId, setIdx, 'reps')}
        hitSlop={4}
        style={({ pressed }) => [styles.pill, pillStyle(override), { opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="repeat" color={palette.textDim} size={13} />
        {content}
      </Pressable>
    );
  };

  // Weight pill — tappable → edit.
  const weightPill = (target: Exercise | ExerciseSub, subId: string | null, setIdx: number) => {
    const w = effectiveSetWeight(target, setIdx);
    const override = (target._pesi_serie ?? [])[setIdx] != null;
    return (
      <Pressable
        onPress={() => onEditSet(subId, setIdx, 'weight')}
        hitSlop={4}
        style={({ pressed }) => [styles.pill, pillStyle(override), { opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="dumbbell" color={palette.textDim} size={13} />
        <Text style={[styles.pillText, { color: w ? palette.text : palette.textFaint }]} numberOfLines={1}>
          {w ? formatWeight(w) : 'Peso'}
        </Text>
      </Pressable>
    );
  };

  const statusCircle = (checked: boolean, label: string) => (
    <View
      style={[
        styles.status,
        { backgroundColor: checked ? accent : palette.surface, borderColor: checked ? accent : palette.glassBorderStrong },
      ]}
    >
      {checked ? <Icon name="check" color="#fff" size={13} /> : <Text style={[styles.statusNum, { color: palette.textDim }]}>{label}</Text>}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {isSuper && (
        <View style={[styles.supTag, { backgroundColor: hexToRgba(stripHash(accent), 0.18), borderColor: hexToRgba(stripHash(accent), 0.45) }]}>
          <Icon name="layers" color={accent} size={11} />
          <Text style={[styles.supText, { color: accent }]}>SUPERSET</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.head}>
        <View style={[styles.numBubble, { backgroundColor: palette.surface, borderColor: palette.glassBorder }]}>
          <Text style={[styles.numText, { color: palette.textDim }]}>{num}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {exercise.nome}
          </Text>
          <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
            {metaParts.join('  ·  ')}
          </Text>
        </View>
        <Pressable
          onPress={() => setNotesOpen(o => !o)}
          hitSlop={8}
          style={({ pressed }) => [styles.noteBtn, { backgroundColor: hasNote ? palette.warnSoft : 'transparent', opacity: pressed ? 0.5 : 1 }]}
        >
          <Icon name="pencil" color={hasNote ? palette.warn : palette.textFaint} size={15} />
        </Pressable>
      </View>

      {exercise.note_coach && (
        <View style={[styles.coach, { backgroundColor: palette.warnSoft, borderColor: hexToRgba('#FBBF24', 0.4) }]}>
          <Icon name="bulb" color={palette.warn} size={14} />
          <Text style={[styles.coachText, { color: palette.text }]}>{exercise.note_coach}</Text>
        </View>
      )}

      {/* Sets. Tap the row = toggle done. Tap a pill = edit. */}
      <View style={styles.sets}>
        {Array.from({ length: serie }).map((_, i) => {
          const checked = !!stato[i];
          const rowBg = checked ? hexToRgba(stripHash(accent), mode === 'dark' ? 0.16 : 0.1) : palette.surface;
          const rowBorder = checked ? hexToRgba(stripHash(accent), 0.5) : palette.glassBorder;

          if (isSuper && exercise.esercizi) {
            return (
              <Pressable
                key={i}
                onPress={() => onToggleSet(i)}
                style={({ pressed }) => [styles.supSet, { backgroundColor: rowBg, borderColor: rowBorder, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.supSetHead}>
                  {statusCircle(checked, String(i + 1))}
                  <Text style={[styles.supSetTitle, { color: palette.text }]}>Serie {i + 1}</Text>
                </View>
                {exercise.esercizi.map(sub => {
                  const actual = (sub._ripetizioni_serie ?? [])[i];
                  return (
                    <View key={sub.id} style={styles.supSubRow}>
                      <Text style={[styles.supSubName, { color: palette.textDim }]} numberOfLines={1}>
                        {sub.nome}
                      </Text>
                      {repsPill(sub.reps, actual, sub.id, i)}
                      {weightPill(sub, sub.id, i)}
                    </View>
                  );
                })}
              </Pressable>
            );
          }

          const actual = (exercise._ripetizioni_serie ?? [])[i];
          return (
            <Pressable
              key={i}
              onPress={() => onToggleSet(i)}
              style={({ pressed }) => [styles.setRow, { backgroundColor: rowBg, borderColor: rowBorder, opacity: pressed ? 0.9 : 1 }]}
            >
              {statusCircle(checked, String(i + 1))}
              <View style={styles.setPills}>
                {repsPill(exercise.reps, actual, null, i)}
                {weightPill(exercise, null, i)}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Primary action */}
      <GlassButton
        title={actionLabel}
        icon={done ? 'check' : timed ? 'timer' : 'check'}
        onPress={onStartTimer}
        variant={actionVariant}
        disabled={actionDisabled}
        block
        size="md"
        tint={done ? undefined : actionVariant === 'primary' ? accent : undefined}
      />

      {/* Note input */}
      {notesOpen && (
        <View style={[styles.noteBox, { borderColor: palette.glassBorder, backgroundColor: palette.surface }]}>
          <TextInput
            placeholder="Note libere (sensazioni, variazioni…)"
            placeholderTextColor={palette.textFaint}
            value={exercise._note_utente ?? ''}
            onChangeText={onChangeNote}
            multiline
            style={[styles.noteInput, { color: palette.text }]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.sm,
    marginBottom: space.sm,
    overflow: 'hidden',
  },
  supTag: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: -2,
  },
  supText: { ...typography.caption2, letterSpacing: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  numBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  numText: { ...typography.caption1, fontWeight: '700' },
  title: { ...typography.headline, letterSpacing: -0.2 },
  meta: { ...typography.footnote, marginTop: 2 },
  noteBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  coach: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    alignItems: 'flex-start',
  },
  coachText: { ...typography.footnote, flex: 1 },
  sets: { gap: 8 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  setPills: { flex: 1, flexDirection: 'row', gap: 8 },
  status: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  statusNum: { ...typography.caption1, fontWeight: '700' },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  pillText: { ...typography.callout, fontWeight: '700' },
  supSet: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  supSetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supSetTitle: { ...typography.subhead, fontWeight: '700' },
  supSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supSubName: { ...typography.footnote, width: 92 },
  noteBox: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: { ...typography.body, minHeight: 60, textAlignVertical: 'top' },
});
