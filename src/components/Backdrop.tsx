import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Dimensions } from 'react-native';

/**
 * Ambient backdrop. Two soft "auras" sit behind the scrolling content, giving
 * a sense of depth without a heavy bitmap. Stays subtle in light mode.
 */
export function Backdrop() {
  const { palette, mode } = useTheme();
  const w = Dimensions.get('window').width;
  const h = Dimensions.get('window').height;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg }]} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="g1" cx="20%" cy="0%" rx="80%" ry="60%">
            <Stop offset="0%" stopColor={palette.accent} stopOpacity={mode === 'dark' ? 0.28 : 0.18} />
            <Stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="100%" cy="50%" rx="70%" ry="50%">
            <Stop
              offset="0%"
              stopColor={mode === 'dark' ? '#B45AE5' : '#FFB7B7'}
              stopOpacity={mode === 'dark' ? 0.22 : 0.18}
            />
            <Stop offset="100%" stopColor="#B45AE5" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g3" cx="50%" cy="100%" rx="80%" ry="60%">
            <Stop
              offset="0%"
              stopColor={mode === 'dark' ? '#16D7B5' : '#A4E5FF'}
              stopOpacity={mode === 'dark' ? 0.16 : 0.18}
            />
            <Stop offset="100%" stopColor="#16D7B5" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#g1)" />
        <Rect x="0" y="0" width={w} height={h} fill="url(#g2)" />
        <Rect x="0" y="0" width={w} height={h} fill="url(#g3)" />
      </Svg>
    </View>
  );
}
