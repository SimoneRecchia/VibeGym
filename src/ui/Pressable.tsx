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

/**
 * Layout props that position the touch target among its siblings: they go on
 * the Pressable, everything else on the animated content. Without this a
 * `flex: 1` or `width: '50%'` lands on the inner view and the Pressable
 * shrinks to its content.
 */
const OUTER = new Set<string>([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'start',
  'end',
  'zIndex',
]);

const splitStyle = (style: StyleProp<ViewStyle>) => {
  const flat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
  if (!flat) return { outer: undefined, inner: undefined };
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const k in flat) (OUTER.has(k) ? outer : inner)[k] = flat[k];
  // A stretched target keeps its content filling it.
  if (outer.flex != null || outer.flexGrow != null) inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
};

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
  const { outer, inner } = splitStyle(style);
  return (
    <Pressable
      {...rest}
      style={outer}
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
          inner,
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
