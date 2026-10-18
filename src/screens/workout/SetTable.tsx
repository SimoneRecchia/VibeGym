/**
 * Sets of one exercise as a compact list: what you did (or will do) and last
 * time's numbers, with a big check to log or undo. Tapping a row opens the
 * editor to correct it; the set in progress is edited in SetFocus.
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

const CLEAR = 'transparent';

export type EditField = 'kg' | 'reps' | 'sec' | 'km';

interface Props {
  ex: SessionExercise;
  previous?: LoggedSet[];
  unit: DisplayUnit;
  /** Index of the set the primary button will log. */
  activeSet: number | null;
  onEdit: (si: number, field: EditField) => void;
  onToggle: (si: number) => void;
}

/** "60 kg × 8", "45 s", "20:00 · 3,5 km". */
export const setText = (
  ex: SessionExercise,
  s: LoggedSet,
  unit: DisplayUnit,
): string => {
  if (ex.kind === 'reps')
    return `${s.kg ? `${fmtLoadValue(s.kg, unit)} ${unit} × ` : ''}${
      s.reps ?? '–'
    }${s.kg ? '' : ' rip.'}`;
  if (ex.kind === 'time')
    return `${s.sec ?? 0} s${
      s.kg ? ` · ${fmtLoadValue(s.kg, unit)} ${unit}` : ''
    }`;
  return `${fmtClock(s.sec ?? 0)}${s.km ? ` · ${fmtNum(s.km, 2)} km` : ''}`;
};

export function SetTable({
  ex,
  previous,
  unit,
  activeSet,
  onEdit,
  onToggle,
}: Props) {
  const { c } = useTheme();
  const field: EditField =
    ex.kind === 'reps' ? 'kg' : ex.kind === 'time' ? 'sec' : 'sec';

  return (
    <View>
      {ex.sets.map((s, si) => {
        const active = activeSet === si;
        const prev = previous?.[si];
        return (
          <Tap
            key={si}
            onPress={() => onEdit(si, field)}
            feedback={null}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`Modifica serie ${si + 1}`}
            // Background and border exist from the start: on Android a
            // background added later loses the rounded corners.
            style={[
              styles.row,
              {
                backgroundColor: s.done
                  ? withAlpha(c.green, 0.12)
                  : active
                  ? c.accentSoft
                  : c.fill4,
              },
            ]}
          >
            <View
              style={[
                styles.num,
                {
                  backgroundColor: s.done
                    ? withAlpha(c.green, 0.18)
                    : active
                    ? c.accent
                    : c.fill3,
                },
              ]}
            >
              <T
                v="footnoteStrong"
                color={s.done ? 'green' : active ? 'onAccent' : 'secondary'}
              >
                {si + 1}
              </T>
            </View>
            <View style={styles.texts}>
              <T
                v="headline"
                color={s.done || active ? 'label' : 'secondary'}
                numberOfLines={1}
              >
                {setText(ex, s, unit)}
              </T>
              {prev?.done ? (
                <T v="caption" color="tertiary" numberOfLines={1}>
                  Ultima volta {setText(ex, prev, unit)}
                </T>
              ) : null}
            </View>
            <Tap
              onPress={() => onToggle(si)}
              scaleTo={0.88}
              feedback={null}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={`Serie ${si + 1} completata`}
            >
              <View
                style={[
                  styles.check,
                  {
                    backgroundColor: s.done ? c.green : CLEAR,
                    borderColor: s.done ? c.green : c.tertiary,
                  },
                ]}
              >
                <Icon
                  name="check"
                  size={20}
                  color={s.done ? '#FFFFFF' : c.tertiary}
                  weight={3}
                />
              </View>
            </Tap>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 6,
  },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0 },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
