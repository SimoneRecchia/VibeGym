/**
 * One exercise (or superset) of the live workout, as a card in the list:
 * what to do, the sets as rows (tap the row = done, tap a value = edit) and
 * one button for the next set, which also starts the rest.
 */
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActiveWorkout,
  DisplayUnit,
  LoggedSet,
  Session,
  SessionExercise,
} from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { withAlpha } from '../../theme/colors';
import { numeric } from '../../theme/typography';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { Chip } from '../../ui/Chip';
import { IconButton } from '../../ui/Button';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import { BLOCK, CARD_PAD, radius } from '../../theme/metrics';
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
  /** The exercise to do now: it shows the button for the next set. */
  current: boolean;
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
  current,
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
  const { c } = useTheme();
  const block = workout.blocks[bi];
  const superset = block.exercises.length > 1;
  const pending = nextInBlock(workout, bi);
  const done = !pending;
  // Finished exercises fold into one line, so the list stays light.
  const [open, setOpen] = useState(false);
  const showSets = !done || open;
  const first = block.exercises[0];
  const restSec = first.restSec ?? 0;
  const setsDone = block.exercises.reduce(
    (n, e) => n + e.sets.filter(x => x.done).length,
    0,
  );

  // Primary action of the card: the next set of this exercise.
  let action = '';
  let icon: 'check' | 'play' = 'check';
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
    }
  }
  const actionDisabled = !!(
    timing &&
    pending &&
    timing.bi === pending.bi &&
    timing.ei === pending.ei &&
    timing.si === pending.si
  );

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      {/* Header (a finished exercise opens / closes on tap) */}
      {done ? (
        <Tap
          onPress={() => setOpen(o => !o)}
          feedback={null}
          scaleTo={1}
          accessibilityLabel={`${first.name}, completato`}
        >
          <View style={styles.head}>
            <View
              style={[
                styles.num,
                {
                  backgroundColor: done ? c.done[0] : current ? color : c.fill3,
                },
              ]}
            >
              {done ? (
                <Icon name="check" size={16} color="#FFFFFF" weight={3} />
              ) : (
                <T v="headline" color={current ? '#FFFFFF' : 'secondary'}>
                  {bi + 1}
                </T>
              )}
            </View>
            <View style={styles.flex}>
              {superset ? (
                <T v="caption" color={color} weight="700">
                  {block.exercises.length > 2 ? 'Circuito' : 'Superset'}
                </T>
              ) : null}
              <T v="headline" numberOfLines={2}>
                {block.exercises.map(e => e.name).join(' + ')}
              </T>
              <T v="footnote" color="secondary" numberOfLines={1}>
                {done
                  ? `${setsDone} ${
                      setsDone === 1 ? 'serie fatta' : 'serie fatte'
                    }`
                  : `${targetText(first)}${
                      restSec ? ` · rec ${fmtDuration(restSec)}` : ''
                    }`}
              </T>
            </View>
            {done ? (
              <Icon
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={c.tertiary}
              />
            ) : (
              <>
                {!superset ? (
                  <Tap
                    onPress={() => onInfo(bi, 0)}
                    scaleTo={0.94}
                    accessibilityLabel="Come si fa"
                  >
                    <ExerciseThumb
                      catalogId={first.catalogId}
                      kind={first.kind}
                      size={44}
                    />
                  </Tap>
                ) : null}
                <IconButton
                  plain
                  icon="ellipsis"
                  size={36}
                  color={c.secondary}
                  onPress={() => onMenu(bi, 0)}
                  accessibilityLabel="Opzioni esercizio"
                />
              </>
            )}
          </View>
        </Tap>
      ) : (
        <View style={styles.head}>
          <View
            style={[
              styles.num,
              {
                backgroundColor: done ? c.done[0] : current ? color : c.fill3,
              },
            ]}
          >
            {done ? (
              <Icon name="check" size={16} color="#FFFFFF" weight={3} />
            ) : (
              <T v="headline" color={current ? '#FFFFFF' : 'secondary'}>
                {bi + 1}
              </T>
            )}
          </View>
          <View style={styles.flex}>
            {superset ? (
              <T v="caption" color={color} weight="700">
                {block.exercises.length > 2 ? 'Circuito' : 'Superset'}
              </T>
            ) : null}
            <T v="headline" numberOfLines={2}>
              {block.exercises.map(e => e.name).join(' + ')}
            </T>
            <T v="footnote" color="secondary" numberOfLines={1}>
              {done
                ? `${setsDone} ${
                    setsDone === 1 ? 'serie fatta' : 'serie fatte'
                  }`
                : `${targetText(first)}${
                    restSec ? ` · rec ${fmtDuration(restSec)}` : ''
                  }`}
            </T>
          </View>
          {done ? (
            <Icon
              name={open ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={c.tertiary}
            />
          ) : (
            <>
              {!superset ? (
                <Tap
                  onPress={() => onInfo(bi, 0)}
                  scaleTo={0.94}
                  accessibilityLabel="Come si fa"
                >
                  <ExerciseThumb
                    catalogId={first.catalogId}
                    kind={first.kind}
                    size={44}
                  />
                </Tap>
              ) : null}
              <IconButton
                plain
                icon="ellipsis"
                size={36}
                color={c.secondary}
                onPress={() => onMenu(bi, 0)}
                accessibilityLabel="Opzioni esercizio"
              />
            </>
          )}
        </View>
      )}

      {showSets
        ? block.exercises.map((ex, ei) => {
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
                      color={c.secondary}
                      onPress={() => onInfo(bi, ei)}
                      accessibilityLabel={`Come si fa ${ex.name}`}
                    />
                  </View>
                ) : null}

                {ex.notes ? (
                  <View style={styles.note}>
                    <Icon name="bulb" size={15} color={c.orange} />
                    <T v="footnote" color="secondary" style={styles.flex}>
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
                  </View>
                ) : null}

                {ex.sets.map((s, si) => (
                  <SetRow
                    key={si}
                    ex={ex}
                    set={s}
                    si={si}
                    prev={prev?.[si]}
                    active={
                      current &&
                      !!pending &&
                      pending.ei === ei &&
                      pending.si === si
                    }
                    color={color}
                    unit={unit}
                    onToggle={() => onToggle({ bi, ei, si })}
                    onEdit={f => onEdit({ bi, ei, si }, f)}
                  />
                ))}
              </View>
            );
          })
        : null}

      {current && pending ? (
        <Tap
          onPress={() => onAction(bi)}
          disabled={actionDisabled}
          feedback={null}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          <View style={[styles.action, { backgroundColor: color }]}>
            <Icon name={icon} size={18} color="#FFFFFF" weight={2.6} />
            <T v="headline" color="#FFFFFF" numberOfLines={1}>
              {action}
            </T>
          </View>
        </Tap>
      ) : null}
    </View>
  );
}

export const ExerciseCard = memo(ExerciseCardImpl);

/** One set: status, then its values as plain tappable numbers. */
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
  const values: { field: EditField; value: string; unit: string }[] =
    ex.kind === 'reps'
      ? [
          { field: 'reps', value: `${set.reps ?? '–'}`, unit: 'rip' },
          set.kg
            ? { field: 'kg', value: fmtLoadValue(set.kg, unit), unit }
            : { field: 'kg', value: 'Corpo libero', unit: '' },
        ]
      : ex.kind === 'time'
      ? [
          { field: 'sec', value: `${set.sec ?? 0}`, unit: 's' },
          ...(set.kg
            ? [
                {
                  field: 'kg' as const,
                  value: fmtLoadValue(set.kg, unit),
                  unit,
                },
              ]
            : []),
        ]
      : [
          { field: 'sec', value: fmtClock(set.sec ?? 0), unit: '' },
          {
            field: 'km',
            value: set.km ? fmtNum(set.km, 2) : '–',
            unit: 'km',
          },
        ];
  const prevText =
    prev?.done && ex.kind === 'reps'
      ? `${prev.kg ? `${fmtLoadValue(prev.kg, unit)} × ` : ''}${prev.reps ?? 0}`
      : null;
  const valueColor = set.done ? c.secondary : active ? color : c.label;

  return (
    <Tap
      onPress={onToggle}
      feedback={null}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: set.done }}
      accessibilityLabel={`Serie ${si + 1} completata`}
      // The background is always there (only its color changes): on
      // Android a background added later loses the rounded corners.
      style={[
        styles.row,
        { backgroundColor: withAlpha(color, active ? 0.14 : 0.001) },
      ]}
    >
      <View
        style={[
          styles.status,
          {
            backgroundColor: set.done ? c.done[0] : withAlpha(c.done[0], 0.001),
            borderColor: set.done ? c.done[0] : active ? color : c.quaternary,
          },
        ]}
      >
        {set.done ? (
          <Icon name="check" size={15} color="#FFFFFF" weight={3} />
        ) : (
          <T v="footnoteStrong" color={active ? color : 'tertiary'}>
            {si + 1}
          </T>
        )}
      </View>
      <View style={styles.values}>
        {values.map(v => (
          <Tap
            key={v.field}
            onPress={() => onEdit(v.field)}
            scaleTo={0.92}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Modifica ${
              v.field === 'kg'
                ? 'peso'
                : v.field === 'reps'
                ? 'ripetizioni'
                : 'valore'
            } serie ${si + 1}`}
            style={styles.value}
          >
            <T style={[numeric(20, '600'), { color: valueColor }]}>
              {v.value}
              {v.unit ? (
                <T v="footnote" color="secondary">{` ${v.unit}`}</T>
              ) : null}
            </T>
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
    padding: CARD_PAD,
    marginBottom: BLOCK,
  },
  flex: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  num: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercise: { marginTop: 14 },
  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  note: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  hint: { flexDirection: 'row', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 54,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 2,
  },
  status: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  values: { flex: 1, flexDirection: 'row', gap: 22, minWidth: 0 },
  value: { minHeight: 44, justifyContent: 'center' },
  action: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
  },
});
