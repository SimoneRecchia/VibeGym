import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { dayColor, mix, withAlpha } from '../../theme/colors';
import { T } from '../../ui/Text';
import { dayLetter } from '../../plan/planUtils';

/**
 * Round letter badge of a plan day (A, B, C…) in the day's color: a soft
 * tint, or a full gradient when it is the day to train.
 */
export function DayBadge({
  index,
  size = 42,
  filled,
}: {
  index: number;
  size?: number;
  filled?: boolean;
}) {
  const { c } = useTheme();
  const color = dayColor(index, c);
  const id = `db${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.badge, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={mix(color, '#FFFFFF', 0.18)} />
            <Stop offset="1" stopColor={mix(color, '#000000', 0.12)} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill={filled ? `url(#${id})` : withAlpha(color, 0.16)}
        />
      </Svg>
      <T
        v={size > 40 ? 'headline' : 'subheadStrong'}
        color={filled ? '#FFFFFF' : color}
      >
        {dayLetter(index)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
