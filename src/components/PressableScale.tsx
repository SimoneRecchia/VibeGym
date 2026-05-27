import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface Props extends Omit<PressableProps, 'style'> {
  scale?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A Pressable that springs slightly down on press — the iOS-2026 micro-interaction.
 */
export function PressableScale({ scale = 0.97, style, onPressIn, onPressOut, children, ...rest }: Props) {
  const v = useRef(new Animated.Value(1)).current;

  const handleIn = (e: GestureResponderEvent) => {
    Animated.spring(v, {
      toValue: scale,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    Animated.spring(v, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: v }] }, style]}>
      <Pressable onPressIn={handleIn} onPressOut={handleOut} {...rest}>
        {children as React.ReactNode}
      </Pressable>
    </Animated.View>
  );
}
