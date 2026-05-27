import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Exercise } from '../lib/types';
import {
  firstUncheckedIdx,
  formatRepsForDisplay,
  formatSec,
  getSerieTotali,
  isCompletato,
  isTimedReps,
} from '../lib/helpers';
import { formatWeight } from '../lib/format';
import { SetChip } from './SetChip';
import { Icon } from './Icon';
import { GlassButton } from './GlassButton';
import { PressableScale } from './PressableScale';
import { TimerState } from '../lib/store';

interface Props {
  exercise: Exercise;
  num: number;
  tint?: string;
  timer: TimerState;
  onToggleSet: (idx: number) => void;
  onEditWeight: (subId: string | null, setIdx: number) => void;
  onChangeNote: (val: string) => void;
  onStartTimer: () => void;
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
  onEditWeight,
  onChangeNote,
  onStartTimer,
}: Props) {
  const { palette, mode } = useTheme();
  const [notesOpen, setNotesOpen] = useState(false);
  const isSuper = exercise.tipo === 'superset';
  const serie = getSerieTotali(exercise);
  const stato = exercise._serie_stato ?? [];
  const done = isCompletato(exercise);
  const timed = !isSuper && isTimedReps(exercise.reps);

  const accent = tint ?? palette.accent;

  const timerActiveHere = timer.active && timer.exId === exercise.id;
  const inWorkPhase = timerActiveHere && timer.phase === 'work';
  const inRestPhase = timerActiveHere && timer.phase === 'rest';

  const repsLabel = formatRepsForDisplay(exercise.reps);
  const metaParts: string[] = [];
  if (!isSuper && exercise.serie) {
    metaParts.push(`${exercise.serie}×${repsLabel}`);
  }
  metaParts.push(`Recupero ${formatSec(exercise.recupero_sec)}`);

  let actionLabel = '';
  let actionDisabled = false;
  let actionVariant: 'primary' | 'tonal' | 'secondary' = 'primary';
  if (done) {
    actionLabel = 'Completato';
    actionDisabled = true;
    actionVariant = 'secondary';
  } else if (inWorkPhase) {
    actionLabel = 'Esercizio in corso…';
    actionDisabled = true;
    actionVariant = 'tonal';
  } else if (inRestPhase) {
    actionLabel = 'Recupero in corso…';
    actionDisabled = true;
    actionVariant = 'tonal';
  } else if (timer.active) {
    actionLabel = 'Timer occupato';
    actionDisabled = true;
    actionVariant = 'secondary';
  } else if (timed && isTimedReps(exercise.reps)) {
    actionLabel = `Inizia serie · ${formatSec(exercise.reps.sec)}`;
  } else {
    actionLabel = `Serie fatta · ${formatSec(exercise.recupero_sec)}`;
  }

  const cardBg =
    mode === 'dark'
      ? hexToRgba(stripHash(accent), done ? 0.04 : 0.08)
      : hexToRgba(stripHash(accent), done ? 0.04 : 0.06);

  const borderCol = done ? palette.glassBorder : hexToRgba(stripHash(accent), 0.32);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderCol,
        },
      ]}
    >
      {/* glass highlight at top */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
          },
        ]}
      />

      {isSuper && (
        <View
          style={[
            styles.supTag,
            { backgroundColor: hexToRgba(stripHash(accent), 0.18), borderColor: hexToRgba(stripHash(accent), 0.45) },
          ]}
        >
          <Icon name="layers" color={accent} size={11} />
          <Text style={[styles.supText, { color: accent }]}>SUPERSET</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.head}>
        <View style={[styles.numBubble, { backgroundColor: palette.surface, borderColor: palette.glassBorder }]}>
          <Text style={[styles.numText, { color: palette.textDim }]}>{num}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
            {exercise.nome}
          </Text>
          <Text style={[styles.meta, { color: palette.textDim }]} numberOfLines={1}>
            {metaParts.join('  ·  ')}
          </Text>
        </View>
        {!isSuper && (
          <Pressable
            onPress={() =>
              onEditWeight(null, firstUncheckedIdx(exercise) === -1 ? serie - 1 : firstUncheckedIdx(exercise))
            }
            hitSlop={8}
            style={({ pressed }) => [
              styles.weightTag,
              { backgroundColor: palette.surface, borderColor: palette.glassBorder, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.weightTagText, { color: palette.text }]} numberOfLines={1}>
              {exercise.peso_suggerito ? formatWeight(exercise.peso_suggerito) : 'Peso'}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setNotesOpen(o => !o)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: (exercise._note_utente?.length ?? 0) > 0 ? palette.warnSoft : palette.surface,
              borderColor: palette.glassBorder,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Icon name="pencil" color={(exercise._note_utente?.length ?? 0) > 0 ? palette.warn : palette.text} size={14} />
        </Pressable>
      </View>

      {exercise.note_coach && (
        <View
          style={[
            styles.coach,
            { backgroundColor: palette.warnSoft, borderColor: hexToRgba('#FBBF24', 0.4) },
          ]}
        >
          <Icon name="bulb" color={palette.warn} size={14} />
          <Text style={[styles.coachText, { color: palette.text }]}>{exercise.note_coach}</Text>
        </View>
      )}

      {/* Superset sub-rows with their own weight editors */}
      {isSuper && exercise.esercizi && (
        <View style={styles.subs}>
          {exercise.esercizi.map(sub => {
            const hasOverride = (sub._pesi_serie ?? []).some(Boolean);
            return (
              <View
                key={sub.id}
                style={[
                  styles.sub,
                  { backgroundColor: palette.surface, borderColor: palette.glassBorder },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.subName, { color: palette.text }]} numberOfLines={1}>
                    {sub.nome}
                  </Text>
                  <Text style={[styles.subMeta, { color: palette.textDim }]} numberOfLines={1}>
                    {sub.serie}×{formatRepsForDisplay(sub.reps)}  ·  {sub.peso_suggerito ? formatWeight(sub.peso_suggerito) : '—'}
                    {hasOverride ? '  ●' : ''}
                  </Text>
                </View>
                <PressableScale
                  scale={0.92}
                  onPress={() => {
                    const idx = firstUncheckedIdx(exercise) === -1 ? serie - 1 : firstUncheckedIdx(exercise);
                    onEditWeight(sub.id, idx);
                  }}
                  style={styles.subEdit}
                >
                  <View
                    style={[
                      styles.subEditInner,
                      {
                        borderColor: hexToRgba(stripHash(accent), 0.55),
                        backgroundColor: hexToRgba(stripHash(accent), 0.18),
                      },
                    ]}
                  >
                    <Icon name="pencil" color={accent} size={12} />
                    <Text style={[styles.subEditText, { color: accent }]}>Peso</Text>
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </View>
      )}

      {/* Sets grid */}
      <View style={styles.sets}>
        {Array.from({ length: serie }).map((_, i) => {
          const checked = !!stato[i];
          const label = isSuper
            ? `Set ${i + 1} entrambi`
            : (() => {
                const override = (exercise._pesi_serie ?? [])[i];
                const peso = override ?? exercise.peso_suggerito;
                const reps = formatRepsForDisplay(exercise.reps);
                const pesoStr = peso ? formatWeight(peso) : '';
                if (!pesoStr) return reps;
                return `${reps}  ·  ${pesoStr}${override ? '*' : ''}`;
              })();
          return (
            <SetChip
              key={i}
              index={i}
              done={checked}
              label={label}
              tint={accent}
              onPress={() => onToggleSet(i)}
              onLongPress={() => onEditWeight(null, i)}
            />
          );
        })}
      </View>

      {/* Action */}
      <View style={{ marginTop: space.sm }}>
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
      </View>

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
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.55,
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
    marginBottom: -4,
  },
  supText: {
    ...typography.caption2,
    letterSpacing: 0.6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  numBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginTop: 2,
  },
  numText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  title: {
    ...typography.headline,
    letterSpacing: -0.2,
  },
  meta: {
    ...typography.footnote,
    marginTop: 2,
  },
  weightTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    maxWidth: 110,
  },
  weightTagText: {
    ...typography.footnote,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  coach: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    alignItems: 'flex-start',
  },
  coachText: {
    ...typography.footnote,
    flex: 1,
  },
  subs: {
    gap: 8,
  },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    gap: 8,
  },
  subName: {
    ...typography.callout,
  },
  subMeta: {
    ...typography.caption1,
    marginTop: 2,
  },
  subEdit: {
    alignSelf: 'stretch',
  },
  subEditInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  subEditText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noteBox: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    ...typography.body,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
