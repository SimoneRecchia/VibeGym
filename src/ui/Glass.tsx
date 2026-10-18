/**
 * Liquid Glass surface. On iOS 26+ it is the real system material
 * (UIGlassEffect via @callstack/liquid-glass); elsewhere a translucent,
 * hairline-bordered surface with the same shape and depth.
 */
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  LiquidGlassContainerView,
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { useTheme } from '../theme/ThemeProvider';

export const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassSupported;

interface Props {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Tinted ("prominent") glass, e.g. the primary action. */
  tint?: string;
  /** Grows / shimmers on touch (native only). */
  interactive?: boolean;
  effect?: 'regular' | 'clear';
  /** Flat surfaces (sheets) skip the drop shadow. */
  flat?: boolean;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

export function Glass({
  style,
  children,
  tint,
  interactive,
  effect = 'regular',
  flat,
  pointerEvents,
}: Props) {
  const { c, dark } = useTheme();
  if (NATIVE_GLASS) {
    return (
      <LiquidGlassView
        style={style}
        tintColor={tint}
        interactive={interactive}
        effect={effect}
        colorScheme={dark ? 'dark' : 'light'}
        pointerEvents={pointerEvents}
      >
        {children}
      </LiquidGlassView>
    );
  }
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.base,
        {
          backgroundColor: tint ?? c.glass,
          borderColor: tint ?? c.glassBorder,
        },
        !flat && (dark ? styles.shadowDark : styles.shadowLight),
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Groups glass elements so they merge when close (native only). */
export function GlassGroup({
  children,
  spacing = 8,
  style,
}: {
  children: React.ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (NATIVE_GLASS) {
    return (
      <LiquidGlassContainerView spacing={spacing} style={style}>
        {children}
      </LiquidGlassContainerView>
    );
  }
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
  shadowLight: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
