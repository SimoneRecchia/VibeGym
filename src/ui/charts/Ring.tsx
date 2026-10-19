import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { withAlpha } from '../../theme/colors';

/**
 * Progress ring in the style of the Activity rings: a gradient stroke with
 * round caps on a soft track of the same hue.
 */
export function Ring({
  progress,
  size = 44,
  stroke = 5,
  color,
  gradient,
  track,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Two colors along the stroke (overrides color). */
  gradient?: [string, string];
  /** Track color (default: the hue at low opacity). */
  track?: string;
  children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const g = gradient ?? [color ?? c.accent, color ?? c.accent];
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={g[1]} />
            <Stop offset="1" stopColor={g[0]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track ?? withAlpha(g[0], 0.18)}
          strokeWidth={stroke}
          fill="none"
        />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${len} ${len}`}
            strokeDashoffset={len * (1 - p)}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
});
