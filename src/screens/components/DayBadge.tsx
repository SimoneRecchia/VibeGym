import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../../ui/Text';
import { dayLetter } from '../../plan/planUtils';

/** Rounded letter tile identifying a plan day (A, B, C…). */
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
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: filled ? c.accent : c.accentSoft,
        },
      ]}
    >
      <T
        v={size > 40 ? 'title3' : 'headline'}
        color={filled ? 'onAccent' : 'accent'}
      >
        {dayLetter(index)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
