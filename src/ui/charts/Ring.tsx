import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { withAlpha } from '../../theme/colors';

/** Progress ring (Activity-style): track is a light step of the same hue. */
export function Ring({
  progress,
  size = 44,
  stroke = 5,
  color,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const col = color ?? c.accent;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={withAlpha(col, 0.2)}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={col}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${len} ${len}`}
          strokeDashoffset={len * (1 - p)}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
});
