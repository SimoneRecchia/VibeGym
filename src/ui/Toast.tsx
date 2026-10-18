import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useTheme } from '../theme/ThemeProvider';
import { Glass } from './Glass';
import { T } from './Text';
import { Icon, IconName } from './Icon';
import { Tap } from './Pressable';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string | null;
  icon?: IconName;
  action?: ToastAction;
  key: number;
}
const useToastStore = create<ToastState>()(() => ({ message: null, key: 0 }));

/** Banner message; with `action` it stays longer and shows a button (undo). */
export const toast = (
  message: string,
  icon: IconName = 'check-circle',
  action?: ToastAction,
) => useToastStore.setState(s => ({ message, icon, action, key: s.key + 1 }));

/** Glass capsule that drops from the top, like iOS system banners. */
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { message, icon, action, key } = useToastStore();
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    a.setValue(0);
    Animated.sequence([
      Animated.spring(a, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 6,
      }),
      Animated.delay(action ? 4200 : 2200),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(
      ({ finished }) => finished && useToastStore.setState({ message: null }),
    );
  }, [key, message, action, a]);

  if (!message) return null;
  return (
    <View
      pointerEvents={action ? 'box-none' : 'none'}
      style={[styles.wrap, { top: insets.top + 6 }]}
    >
      <Animated.View
        style={{
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            },
            {
              scale: a.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        }}
      >
        <Glass style={styles.pill}>
          {icon ? (
            <Icon name={icon} size={18} color={c.accent} weight={2.2} />
          ) : null}
          <T v="subheadStrong" numberOfLines={2} style={styles.text}>
            {message}
          </T>
          {action ? (
            <Tap
              onPress={() => {
                action.onPress();
                useToastStore.setState({ message: null });
              }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <T v="subheadStrong" color="accent">
                {action.label}
              </T>
            </Tap>
          ) : null}
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
    maxWidth: 360,
  },
  text: { flexShrink: 1 },
});
