import React, { useId, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { withAlpha } from '../../theme/colors';

/** Horizontal progress bar with a gradient fill and round ends. */
export function Bar({
  progress,
  gradient,
  height = 8,
  style,
}: {
  progress: number;
  gradient: [string, string];
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  const id = `bar${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = Math.max(0, Math.min(1, progress));
  const fill = p > 0 ? Math.max(height, w * p) : 0;
  return (
    <View
      style={[{ height }, style]}
      onLayout={e => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
          <Rect
            width={w}
            height={height}
            rx={height / 2}
            fill={withAlpha(gradient[0], 0.16)}
          />
          {fill > 0 ? (
            <Rect
              width={fill}
              height={height}
              rx={height / 2}
              fill={`url(#${id})`}
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
