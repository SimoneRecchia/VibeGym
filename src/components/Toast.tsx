import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Toast({ message }: { message: string | null }) {
  const { palette, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, { toValue: 20, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [message, translate, opacity]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + space.lg,
          transform: [{ translateY: translate }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: mode === 'dark' ? 'rgba(28,28,34,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: palette.glassBorderStrong,
            shadowColor: palette.glassShadow,
          },
        ]}
      >
        <Text style={[styles.text, { color: palette.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    alignItems: 'center',
  },
  box: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    maxWidth: '92%',
  },
  text: {
    ...typography.subhead,
    textAlign: 'center',
  },
});
