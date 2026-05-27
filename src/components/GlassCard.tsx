import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

interface Props extends ViewProps {
  intensity?: 'subtle' | 'regular' | 'strong';
  tint?: string;
  rounded?: keyof typeof radius;
  inset?: boolean;
  noBorder?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * A multi-layer translucent surface evoking iOS "liquid glass":
 *  - a tinted base fill
 *  - an inner top highlight
 *  - a hairline border
 *  - an outer drop shadow
 *
 * Avoids a native BlurView dependency by relying on layered translucency,
 * which reads well over the dark gradient backgrounds we use.
 */
export function GlassCard({
  children,
  intensity = 'regular',
  tint,
  rounded = 'lg',
  inset = false,
  noBorder = false,
  style,
  ...rest
}: Props) {
  const { palette, mode } = useTheme();
  const r = radius[rounded];

  const baseAlpha = intensity === 'subtle' ? 0.4 : intensity === 'strong' ? 0.85 : 0.62;
  const fill = tint
    ? tint
    : mode === 'dark'
    ? `rgba(28,28,34,${baseAlpha})`
    : `rgba(255,255,255,${baseAlpha})`;

  return (
    <View
      style={[
        styles.root,
        {
          borderRadius: r,
          backgroundColor: fill,
          borderColor: noBorder ? 'transparent' : palette.glassBorder,
          shadowColor: palette.glassShadow,
        },
        inset && styles.inset,
        style,
      ]}
      {...rest}
    >
      {/* top inner highlight — gives the glass that lit edge */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
            backgroundColor:
              mode === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.95)',
          },
        ]}
      />
      {/* subtle bottom inner shade */}
      {mode === 'dark' && (
        <View
          pointerEvents="none"
          style={[
            styles.shade,
            {
              borderBottomLeftRadius: r,
              borderBottomRightRadius: r,
            },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    overflow: 'hidden',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  inset: {
    shadowOpacity: 0,
    elevation: 0,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.65,
  },
  shade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    opacity: 0.6,
  },
});
