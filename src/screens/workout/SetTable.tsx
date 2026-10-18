/**
 * Sets of one exercise: previous performance, editable values and a big
 * check target. Values open the editor sheet; the check logs the set.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoggedSet, SessionExercise } from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { DisplayUnit } from '../../core/types';
import { fmtLoadValue } from '../../core/units';
import { fmtClock, fmtNum } from '../../core/format';
import { withAlpha } from '../../theme/colors';

export type EditField = 'kg' | 'reps' | 'sec' | 'km';

interface Props {
  ex: SessionExercise;
  previous?: LoggedSet[];
  unit: DisplayUnit;
  /** Index of the set the primary button will log. */
  activeSet: number | null;
  onEdit: (si: number, field: EditField) => void;
  onToggle: (si: number) => void;
  onLongPress?: (si: number) => void;
}

const prevText = (
  ex: SessionExercise,
  s: LoggedSet | undefined,
  unit: DisplayUnit,
): string => {
  if (!s || !s.done) return '–';
  if (ex.kind === 'reps')
    return `${s.kg ? fmtLoadValue(s.kg, unit) : '0'} × ${s.reps ?? 0}`;
  if (ex.kind === 'time')
    return `${s.sec ?? 0}s${s.kg ? ` +${fmtLoadValue(s.kg, unit)}` : ''}`;
  return `${fmtClock(s.sec ?? 0)}${s.km ? ` · ${fmtNum(s.km, 2)}km` : ''}`;
};

export function SetTable({
  ex,
  previous,
  unit,
  activeSet,
  onEdit,
  onToggle,
  onLongPress,
}: Props) {
  const { c } = useTheme();
  const weighted =
    ex.kind !== 'cardio' &&
    (ex.kind === 'reps' ||
      ex.sets.some(s => (s.kg ?? 0) > 0) ||
      ex.target.some(t => (t.kg ?? 0) > 0));
  const cols: { key: EditField; label: string }[] =
    ex.kind === 'reps'
      ? [
          { key: 'kg', label: unit },
          { key: 'reps', label: 'rip.' },
        ]
      : ex.kind === 'time'
      ? [
          ...(weighted ? [{ key: 'kg' as const, label: unit }] : []),
          { key: 'sec' as const, label: 'sec' },
        ]
      : [
          { key: 'sec', label: 'durata' },
          { key: 'km', label: 'km' },
        ];

  const cell = (s: LoggedSet, key: EditField): string => {
    if (key === 'kg') return fmtLoadValue(s.kg, unit);
    if (key === 'reps') return s.reps != null ? String(s.reps) : '–';
    if (key === 'sec')
      return ex.kind === 'cardio' ? fmtClock(s.sec ?? 0) : String(s.sec ?? 0);
    return s.km != null ? fmtNum(s.km, 2) : '–';
  };

  return (
    <View>
      <View style={styles.head}>
        <T v="caption" color="secondary" style={styles.colSet}>
          SERIE
        </T>
        <T v="caption" color="secondary" style={styles.colPrev}>
          PRECEDENTE
        </T>
        {cols.map(col => (
          <T
            key={col.key}
            v="caption"
            color="secondary"
            align="center"
            style={styles.colVal}
          >
            {col.label.toUpperCase()}
          </T>
        ))}
        <View style={styles.colCheck} />
      </View>
      {ex.sets.map((s, si) => {
        const active = activeSet === si;
        return (
          <Tap
            key={si}
            onLongPress={onLongPress ? () => onLongPress(si) : undefined}
            feedback={null}
            scaleTo={1}
            style={[
              styles.row,
              {
                backgroundColor: s.done
                  ? withAlpha(c.green, 0.12)
                  : active
                  ? c.fill4
                  : 'transparent',
              },
            ]}
          >
            <View style={styles.colSet}>
              <View
                style={[
                  styles.num,
                  { backgroundColor: active ? c.accent : c.fill3 },
                ]}
              >
                <T v="footnoteStrong" color={active ? 'onAccent' : 'label'}>
                  {si + 1}
                </T>
              </View>
            </View>
            <T
              v="footnote"
              color="secondary"
              numberOfLines={1}
              style={styles.colPrev}
            >
              {prevText(ex, previous?.[si], unit)}
            </T>
            {cols.map(col => (
              <Tap
                key={col.key}
                onPress={() => onEdit(si, col.key)}
                style={styles.colVal}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={`Modifica ${col.label} serie ${si + 1}`}
              >
                <View style={[styles.valBox, { backgroundColor: c.fill3 }]}>
                  <T v="headline" numberOfLines={1} adjustsFontSizeToFit>
                    {cell(s, col.key)}
                  </T>
                </View>
              </Tap>
            ))}
            <Tap
              onPress={() => onToggle(si)}
              style={styles.colCheck}
              scaleTo={0.88}
              feedback={null}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={`Serie ${si + 1} completata`}
            >
              <View
                style={[
                  styles.check,
                  s.done
                    ? { backgroundColor: c.green }
                    : [styles.ring, { borderColor: c.tertiary }],
                ]}
              >
                {s.done ? (
                  <Icon name="check" size={18} color="#FFFFFF" weight={3} />
                ) : null}
              </View>
            </Tap>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 2,
  },
  colSet: { width: 44 },
  colPrev: { flex: 1, minWidth: 0, paddingRight: 4 },
  colVal: { width: 72, paddingHorizontal: 4 },
  colCheck: { width: 48, alignItems: 'flex-end' },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valBox: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { borderWidth: 2 },
});
