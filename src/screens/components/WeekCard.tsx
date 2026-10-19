/**
 * This week at a glance, like the Activity summary: one ring per day (full
 * when you trained), today highlighted, the streak in gold.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../../ui/Card';
import { Ring } from '../../ui/charts/Ring';
import { Icon } from '../../ui/Icon';
import { T } from '../../ui/Text';
import { WEEKDAYS_NARROW } from '../../core/format';

export function WeekCard({
  trained,
  streak,
  target,
  style,
}: {
  /** Mon..Sun. */
  trained: boolean[];
  streak: number;
  /** Workouts planned per week, if known. */
  target?: number;
  style?: object;
}) {
  const { c } = useTheme();
  const today = (new Date().getDay() + 6) % 7;
  const count = trained.filter(Boolean).length;
  return (
    <Card style={style}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <T v="footnoteStrong" color="secondary">
            Questa settimana
          </T>
          <T v="title2">
            {count}
            {target ? (
              <T v="headline" color="secondary">{` / ${target}`}</T>
            ) : null}
            <T v="headline" color="secondary">
              {count === 1 ? ' allenamento' : ' allenamenti'}
            </T>
          </T>
        </View>
        {streak > 0 ? (
          <View style={[styles.streak, { backgroundColor: c.fill4 }]}>
            <Icon name="flame" size={15} color={c.gold[1]} weight={2.3} />
            <T v="footnoteStrong" color={c.gold[0]}>
              {streak} {streak === 1 ? 'settimana' : 'settimane'}
            </T>
          </View>
        ) : null}
      </View>
      <View style={styles.days}>
        {trained.map((on, i) => (
          <View key={i} style={styles.day}>
            <Ring
              progress={on ? 1 : 0}
              size={34}
              stroke={5}
              gradient={c.accentGrad}
              track={i > today ? c.fill4 : undefined}
            >
              {on ? (
                <Icon name="check" size={13} color={c.accent} weight={3} />
              ) : null}
            </Ring>
            <T
              v="caption"
              weight={i === today ? '700' : '500'}
              color={i === today ? c.accent : 'secondary'}
            >
              {WEEKDAYS_NARROW[(i + 1) % 7]}
            </T>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  day: { alignItems: 'center', gap: 6 },
});
