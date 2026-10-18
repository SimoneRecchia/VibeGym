import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { haptic, Haptic } from '../services/haptics';

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (iOS-like squish). */
  scaleTo?: number;
  feedback?: Haptic | null;
  children?: React.ReactNode;
}

/** Pressable with a spring scale on touch and an optional haptic tick. */
export function Tap({
  style,
  scaleTo = 0.97,
  feedback = 'selection',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: v === 1 ? 6 : 0,
    }).start();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={e => {
        if (feedback) haptic(feedback);
        onPress?.(e);
      }}
      hitSlop={rest.hitSlop ?? 4}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale }] },
          disabled ? styles.disabled : null,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
});
