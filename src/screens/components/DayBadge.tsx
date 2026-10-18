import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { dayColor, withAlpha } from '../../theme/colors';
import { T } from '../../ui/Text';
import { dayLetter } from '../../plan/planUtils';

/** Rounded letter tile identifying a plan day (A, B, C…), in the day's color. */
export function DayBadge({
  index,
  size = 44,
  filled,
}: {
  index: number;
  size?: number;
  filled?: boolean;
}) {
  const { c } = useTheme();
  const color = dayColor(index, c);
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: filled ? color : withAlpha(color, 0.2),
        },
      ]}
    >
      <T v={size > 40 ? 'title3' : 'headline'} color={filled ? '#FFFFFF' : color}>
        {dayLetter(index)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
