import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  progress: number; // 0..1
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 44,
  thickness = 4,
  color,
  trackColor,
  children,
}: Props) {
  const { palette } = useTheme();
  const c = color ?? palette.accent;
  const t = trackColor ?? palette.dividerStrong;
  const r = (size - thickness) / 2;
  const cir = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = cir * (1 - clamped);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${cir}, ${cir}`}
          strokeDashoffset={dash}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {children !== undefined && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
