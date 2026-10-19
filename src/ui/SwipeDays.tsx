/**
 * Horizontal swipe on a block of content to move to the previous / next
 * item (day). Vertical scrolling keeps working: the gesture only starts on a
 * clearly horizontal drag. The content slides out and the new one in.
 */
import React, { useMemo, useRef } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { haptic } from '../services/haptics';

const THRESHOLD = 64;

export function SwipeDays({
  onSwipe,
  children,
}: {
  /** -1: previous (swipe right), 1: next (swipe left). */
  onSwipe: (dir: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-14, 14])
        .runOnJS(true)
        .onUpdate(e => x.setValue(e.translationX * 0.6))
        .onEnd(e => {
          const dir: -1 | 0 | 1 =
            e.translationX < -THRESHOLD || e.velocityX < -700
              ? 1
              : e.translationX > THRESHOLD || e.velocityX > 700
              ? -1
              : 0;
          if (!dir) {
            Animated.spring(x, {
              toValue: 0,
              useNativeDriver: true,
              speed: 20,
              bounciness: 6,
            }).start();
            return;
          }
          haptic('selection');
          Animated.timing(x, {
            toValue: -dir * width * 0.35,
            duration: 140,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRef.current(dir);
            x.setValue(dir * width * 0.35);
            Animated.spring(x, {
              toValue: 0,
              useNativeDriver: true,
              speed: 16,
              bounciness: 5,
            }).start();
          });
        }),
    [x, width],
  );

  const opacity = x.interpolate({
    inputRange: [-width * 0.35, 0, width * 0.35],
    outputRange: [0.2, 1, 0.2],
    extrapolate: 'clamp',
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ opacity, transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
