/**
 * Soft aurora at the top of the screen in the theme color: the screen has a
 * mood without colored clutter behind the content. One static SVG.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export function Backdrop({ tint }: { tint?: string }) {
  const { c, dark } = useTheme();
  const main = tint ?? c.accent;
  const k = dark ? 1 : 0.55;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="aurora1" cx="20%" cy="-4%" rx="90%" ry="34%">
            <Stop offset="0" stopColor={main} stopOpacity={0.3 * k} />
            <Stop offset="0.55" stopColor={main} stopOpacity={0.08 * k} />
            <Stop offset="1" stopColor={main} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="aurora2" cx="92%" cy="2%" rx="60%" ry="24%">
            <Stop offset="0" stopColor={c.accent2} stopOpacity={0.14 * k} />
            <Stop offset="1" stopColor={c.accent2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#aurora1)" />
        <Rect width="100%" height="100%" fill="url(#aurora2)" />
      </Svg>
    </View>
  );
}
