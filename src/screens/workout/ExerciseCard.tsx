/**
 * One exercise (or superset) of the live workout, as a card in the list:
 * what to do, the sets as rows (tap the row = done, tap a value = edit) and
 * one button for the next set, which also starts the rest.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActiveWorkout,
  DisplayUnit,
  LoggedSet,
  Session,
  SessionExercise,
} from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { mix, withAlpha } from '../../theme/colors';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { Chip } from '../../ui/Chip';
import { IconButton } from '../../ui/Button';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import { radius } from '../../theme/metrics';
import {
  SetRef,
  lastPerformance,
  nextInBlock,
  progressionHint,
  restAfter,
} from '../../workout/engine';
import { fmtClock, fmtDuration, fmtNum } from '../../core/format';
import { fmtLoad, fmtLoadValue } from '../../core/units';

export type EditField = 'kg' | 'reps' | 'sec' | 'km';

interface Props {
  workout: ActiveWorkout;
  bi: number;
  color: string;
  sessions: Session[];
  unit: DisplayUnit;
  stepKg: number;
  /** Ref of the set being timed (timed sets), if any. */
  timing: SetRef | null;
  onToggle: (ref: SetRef) => void;
  onEdit: (ref: SetRef, field: EditField) => void;
  onAction: (bi: number) => void;
  onInfo: (bi: number, ei: number) => void;
  onMenu: (bi: number, ei: number) => void;
  onApplyHint: (bi: number, ei: number, kg: number) => void;
}

const CLEAR = 'transparent';

const targetText = (ex: SessionExercise): string => {
  const t = ex.target[0];
  const n = ex.sets.length;
  if (ex.kind === 'reps')
    return t?.reps
      ? `${n} × ${t.reps}${ex.toFailure ? '+' : ''}`
      : `${n} serie`;
  if (ex.kind === 'time') return t?.sec ? `${n} × ${t.sec} s` : `${n} serie`;
  return t?.sec ? fmtClock(t.sec) : 'Cardio';
};

function ExerciseCardImpl({
  workout,
  bi,
  color,
  sessions,
  unit,
  stepKg,
  timing,
  onToggle,
  onEdit,
  onAction,
  onInfo,
  onMenu,
  onApplyHint,
}: Props) {
  const { c, dark } = useTheme();
  const block = workout.blocks[bi];
  const superset = block.exercises.length > 1;
  const pending = nextInBlock(workout, bi);
  const done = !pending;
  const first = block.exercises[0];
  const restSec = first.restSec ?? 0;

  // Primary action of the card: the next set of this exercise.
  let action = 'Completato';
  let icon: 'check' | 'play' | 'check-circle' = 'check-circle';
  if (pending) {
    const ex = block.exercises[pending.ei];
    const set = ex.sets[pending.si];
    const prefix = superset
      ? `${String.fromCharCode(65 + bi)}${pending.ei + 1} · `
      : '';
    const timed =
      timing &&
      timing.bi === pending.bi &&
      timing.ei === pending.ei &&
      timing.si === pending.si;
    if (ex.kind === 'time') {
      action = timed
        ? 'In corso…'
        : `${prefix}Avvia serie ${pending.si + 1} · ${set.sec ?? 30} s`;
      icon = 'play';
    } else {
      const rest = restAfter(workout, pending);
      action = `${prefix}${
        ex.kind === 'cardio' ? 'Fatto' : `Serie ${pending.si + 1} fatta`
      }${rest ? ` · ${fmtDuration(rest)}` : ''}`;
      icon = 'check';
    }
  }
  const actionDisabled =
    done ||
    !!(
      timing &&
      pending &&
      timing.bi === pending.bi &&
      timing.ei === pending.ei &&
      timing.si === pending.si
    );

  const cardBg = done ? c.card : mix(c.card, color, dark ? 0.1 : 0.05);
  const border = done ? CLEAR : withAlpha(color, 0.45);

  return (
    <View
      style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
    >
      {superset ? (
        <View style={[styles.tag, { backgroundColor: withAlpha(color, 0.18) }]}>
          <Icon name="layers" size={12} color={color} weight={2.4} />
          <T v="caption2" color={color} weight="700">
            {block.exercises.length > 2 ? 'CIRCUITO' : 'SUPERSET'}
          </T>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.head}>
        <View
          style={[
            styles.num,
            { backgroundColor: done ? c.green : withAlpha(color, 0.2) },
          ]}
        >
          {done ? (
            <Icon name="check" size={16} color="#FFFFFF" weight={3} />
          ) : (
            <T v="headline" color={color}>
              {bi + 1}
            </T>
          )}
        </View>
        <View style={styles.flex}>
          <T v="headline" numberOfLines={2}>
            {block.exercises.map(e => e.name).join(' + ')}
          </T>
          <T v="footnote" color="secondary" numberOfLines={1}>
            {targetText(first)}
            {restSec ? ` · Rec ${fmtDuration(restSec)}` : ''}
          </T>
        </View>
        {!superset ? (
          <Tap
            onPress={() => onInfo(bi, 0)}
            scaleTo={0.94}
            accessibilityLabel="Come si fa"
          >
            <ExerciseThumb
              catalogId={first.catalogId}
              kind={first.kind}
              size={48}
            />
          </Tap>
        ) : null}
        <IconButton
          plain
          icon="ellipsis"
          size={34}
          onPress={() => onMenu(bi, 0)}
          accessibilityLabel="Opzioni esercizio"
        />
      </View>

      {block.exercises.map((ex, ei) => {
        const prev = lastPerformance(sessions, ex.key)?.ex.sets;
        const hint = !done ? progressionHint(ex, sessions, stepKg) : null;
        return (
          <View key={`${ex.exerciseId}-${ei}`} style={styles.exercise}>
            {superset ? (
              <View style={styles.subHead}>
                <T v="footnoteStrong" color={color}>
                  {String.fromCharCode(65 + bi)}
                  {ei + 1}
                </T>
                <T v="subheadStrong" numberOfLines={1} style={styles.flex}>
                  {ex.name}
                </T>
                <IconButton
                  plain
                  icon="info"
                  size={30}
                  onPress={() => onInfo(bi, ei)}
                  accessibilityLabel={`Come si fa ${ex.name}`}
                />
              </View>
            ) : null}

            {ex.notes ? (
              <View
                style={[
                  styles.note,
                  { backgroundColor: withAlpha(c.orange, 0.14) },
                ]}
              >
                <Icon name="bulb" size={15} color={c.orange} />
                <T v="footnote" style={styles.flex}>
                  {ex.notes}
                </T>
              </View>
            ) : null}

            {hint ? (
              <View style={styles.hint}>
                <Chip
                  tinted
                  icon="arrow-up"
                  label={`Prova ${fmtLoad(hint, unit)}`}
                  onPress={() => onApplyHint(bi, ei, hint)}
                />
                <T v="footnote" color="secondary" style={styles.flex}>
                  L'ultima volta hai fatto tutto
                </T>
              </View>
            ) : null}

            {ex.sets.map((s, si) => (
              <SetRow
                key={si}
                ex={ex}
                set={s}
                si={si}
                prev={prev?.[si]}
                active={!!pending && pending.ei === ei && pending.si === si}
                color={color}
                unit={unit}
                onToggle={() => onToggle({ bi, ei, si })}
                onEdit={f => onEdit({ bi, ei, si }, f)}
              />
            ))}
          </View>
        );
      })}

      <Tap
        onPress={() => onAction(bi)}
        disabled={actionDisabled}
        feedback={null}
        accessibilityRole="button"
        accessibilityLabel={action}
      >
        <View
          style={[
            styles.action,
            { backgroundColor: done ? withAlpha(c.green, 0.16) : color },
          ]}
        >
          <Icon
            name={icon}
            size={18}
            color={done ? c.green : '#FFFFFF'}
            weight={2.6}
          />
          <T v="headline" color={done ? c.green : '#FFFFFF'} numberOfLines={1}>
            {action}
          </T>
        </View>
      </Tap>
    </View>
  );
}

export const ExerciseCard = memo(ExerciseCardImpl);

/** One set: status circle, then its values as pills. */
function SetRow({
  ex,
  set,
  si,
  prev,
  active,
  color,
  unit,
  onToggle,
  onEdit,
}: {
  ex: SessionExercise;
  set: LoggedSet;
  si: number;
  prev?: LoggedSet;
  active: boolean;
  color: string;
  unit: DisplayUnit;
  onToggle: () => void;
  onEdit: (f: EditField) => void;
}) {
  const { c } = useTheme();
  const pills: {
    field: EditField;
    icon: 'refresh' | 'dumbbell' | 'timer' | 'ruler';
    text: string;
  }[] =
    ex.kind === 'reps'
      ? [
          { field: 'reps', icon: 'refresh', text: `${set.reps ?? '–'} rip.` },
          {
            field: 'kg',
            icon: 'dumbbell',
            text: set.kg
              ? `${fmtLoadValue(set.kg, unit)} ${unit}`
              : 'Corpo libero',
          },
        ]
      : ex.kind === 'time'
      ? [
          { field: 'sec', icon: 'timer', text: `${set.sec ?? 0} s` },
          ...(set.kg
            ? [
                {
                  field: 'kg' as const,
                  icon: 'dumbbell' as const,
                  text: `${fmtLoadValue(set.kg, unit)} ${unit}`,
                },
              ]
            : []),
        ]
      : [
          { field: 'sec', icon: 'timer', text: fmtClock(set.sec ?? 0) },
          {
            field: 'km',
            icon: 'ruler',
            text: set.km ? `${fmtNum(set.km, 2)} km` : '– km',
          },
        ];
  const prevText =
    prev?.done && ex.kind === 'reps'
      ? `prima ${prev.kg ? `${fmtLoadValue(prev.kg, unit)}×` : ''}${
          prev.reps ?? 0
        }`
      : null;

  return (
    <Tap
      onPress={onToggle}
      feedback={null}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: set.done }}
      accessibilityLabel={`Serie ${si + 1} completata`}
      // Background and border from the start: on Android a background added
      // later loses the rounded corners.
      style={[
        styles.row,
        {
          backgroundColor: set.done ? withAlpha(color, 0.18) : c.fill4,
          borderColor: active ? color : CLEAR,
        },
      ]}
    >
      <View
        style={[
          styles.status,
          {
            backgroundColor: set.done ? color : CLEAR,
            borderColor: set.done ? color : c.tertiary,
          },
        ]}
      >
        {set.done ? (
          <Icon name="check" size={15} color="#FFFFFF" weight={3} />
        ) : (
          <T v="footnoteStrong" color="secondary">
            {si + 1}
          </T>
        )}
      </View>
      <View style={styles.pills}>
        {pills.map(p => (
          <Tap
            key={p.field}
            onPress={() => onEdit(p.field)}
            scaleTo={0.94}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Modifica ${
              p.field === 'kg'
                ? 'peso'
                : p.field === 'reps'
                ? 'ripetizioni'
                : 'valore'
            } serie ${si + 1}`}
          >
            <View style={[styles.pill, { backgroundColor: c.card }]}>
              <Icon name={p.icon} size={13} color={c.secondary} weight={2.2} />
              <T v="subheadStrong" numberOfLines={1}>
                {p.text}
              </T>
            </View>
          </Tap>
        ))}
      </View>
      {prevText ? (
        <T v="caption" color="tertiary" numberOfLines={1}>
          {prevText}
        </T>
      ) : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  flex: { flex: 1, minWidth: 0 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  num: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercise: { marginBottom: 4 },
  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  note: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  status: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { flex: 1, flexDirection: 'row', gap: 8, minWidth: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  action: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 12,
  },
});
