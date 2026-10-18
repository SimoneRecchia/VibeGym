/**
 * Ambient glow behind the content: the theme color and its two companion
 * hues fade in from the corners, so even the dark theme isn't flat black.
 * Static and light (one SVG), drawn once per screen.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export function Backdrop({ tint }: { tint?: string }) {
  const { c, dark } = useTheme();
  const main = tint ?? c.accent;
  const k = dark ? 1 : 0.6;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow1" cx="15%" cy="0%" rx="85%" ry="45%">
            <Stop offset="0" stopColor={main} stopOpacity={0.34 * k} />
            <Stop offset="1" stopColor={main} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow2" cx="105%" cy="45%" rx="70%" ry="40%">
            <Stop offset="0" stopColor={c.accent2} stopOpacity={0.16 * k} />
            <Stop offset="1" stopColor={c.accent2} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow3" cx="0%" cy="100%" rx="80%" ry="40%">
            <Stop offset="0" stopColor={c.accent3} stopOpacity={0.12 * k} />
            <Stop offset="1" stopColor={c.accent3} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow1)" />
        <Rect width="100%" height="100%" fill="url(#glow2)" />
        <Rect width="100%" height="100%" fill="url(#glow3)" />
      </Svg>
    </View>
  );
}
