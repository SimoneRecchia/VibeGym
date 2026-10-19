/**
 * Week of the food diary: seven days, each a date in a circle with a thin
 * ring of what was eaten. The selected day is a full circle in the theme
 * color. Circles are drawn in SVG: always round, on Android too.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../../ui/Text';
import { Tap } from '../../ui/Pressable';
import { IconButton } from '../../ui/Button';
import { Ring } from '../../ui/charts/Ring';
import {
  WEEKDAYS_NARROW,
  fmtDate,
  fmtDateShort,
  fmtWeekdayDate,
} from '../../core/format';
import { dayStart } from '../../core/dates';

const D = 40;

export function DayStrip({
  days,
  selected,
  today,
  kcalByDay,
  goal,
  onSelect,
  onWeek,
}: {
  days: string[];
  selected: string;
  today: string;
  kcalByDay: Record<string, number>;
  goal: number;
  onSelect: (d: string) => void;
  onWeek: (dir: -1 | 1) => void;
}) {
  const { c } = useTheme();
  const first = new Date(dayStart(days[0]));
  const last = new Date(dayStart(days[6]));
  return (
    <View>
      {/* Week and arrows on their own line: the days get the full width */}
      <View style={styles.head}>
        <T v="footnoteStrong" color="secondary" style={styles.flex}>
          {first.getMonth() === last.getMonth()
            ? `${first.getDate()} – ${fmtDate(last, { year: false })}`
            : `${fmtDateShort(first)} – ${fmtDateShort(last)}`}
        </T>
        <View style={styles.arrows}>
          <IconButton
            icon="chevron-left"
            plain
            size={34}
            color={c.secondary}
            onPress={() => onWeek(-1)}
            accessibilityLabel="Settimana precedente"
          />
          <IconButton
            icon="chevron-right"
            plain
            size={34}
            color={c.secondary}
            onPress={() => onWeek(1)}
            accessibilityLabel="Settimana successiva"
          />
        </View>
      </View>
      <View style={styles.week}>
        {days.map((d, i) => {
          const on = d === selected;
          const isToday = d === today;
          const eaten = kcalByDay[d] ?? 0;
          return (
            <Tap
              key={d}
              onPress={() => onSelect(d)}
              scaleTo={0.9}
              style={styles.day}
              accessibilityLabel={fmtWeekdayDate(dayStart(d))}
              accessibilityState={{ selected: on }}
            >
              <T
                v="caption"
                color={isToday ? c.accent : 'secondary'}
                weight={isToday ? '700' : '500'}
              >
                {WEEKDAYS_NARROW[(i + 1) % 7]}
              </T>
              <View style={styles.dateBox}>
                {on ? (
                  <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
                    <Circle cx={D / 2} cy={D / 2} r={D / 2} fill={c.accent} />
                  </Svg>
                ) : (
                  <Ring
                    progress={goal ? eaten / goal : 0}
                    size={D}
                    stroke={3}
                    gradient={eaten > goal * 1.05 ? c.gold : c.energy}
                    track={c.fill4}
                  />
                )}
                <T
                  v="subheadStrong"
                  color={on ? '#FFFFFF' : isToday ? c.accent : 'label'}
                  style={styles.date}
                >
                  {new Date(dayStart(d)).getDate()}
                </T>
              </View>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 4,
  },
  flex: { flex: 1 },
  // Well apart, so they are easy to hit.
  arrows: { flexDirection: 'row', gap: 14 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  dateBox: {
    width: D,
    height: D,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: { position: 'absolute' },
});
