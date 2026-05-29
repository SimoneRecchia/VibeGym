import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, typography } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';
import { haptic } from '../lib/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tonal';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  block?: boolean;
  style?: ViewStyle;
  tint?: string;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  block,
  style,
  tint,
}: Props) {
  const { palette } = useTheme();
  const visual = visualFor(variant, palette, tint);
  const dims = dimsFor(size);

  return (
    <PressableScale
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptic('light');
        onPress?.();
      }}
      style={[
        styles.root,
        {
          backgroundColor: visual.bg,
          borderColor: visual.border,
          paddingHorizontal: dims.padH,
          paddingVertical: dims.padV,
          borderRadius: dims.radius,
          opacity: disabled ? 0.45 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        block && { width: '100%' },
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon && <Icon name={icon} color={visual.fg} size={dims.iconSize} />}
        <Text
          style={[
            styles.label,
            {
              color: visual.fg,
              fontSize: dims.font,
              marginLeft: icon ? 8 : 0,
              marginRight: iconRight ? 8 : 0,
            } as TextStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {iconRight && <Icon name={iconRight} color={visual.fg} size={dims.iconSize} />}
      </View>
    </PressableScale>
  );
}

function visualFor(v: Variant, p: ReturnType<typeof useTheme>['palette'], tint?: string) {
  switch (v) {
    case 'primary':
      return {
        bg: tint ?? p.accent,
        border: 'rgba(255,255,255,0.18)',
        fg: '#fff',
        highlight: 'rgba(255,255,255,0.22)',
      };
    case 'tonal':
      return {
        bg: tint ?? p.accentSoft,
        border: p.glassBorder,
        fg: tint ? '#fff' : p.accent,
        highlight: 'rgba(255,255,255,0.10)',
      };
    case 'secondary':
      return {
        bg: p.glassFill,
        border: p.glassBorderStrong,
        fg: p.text,
        highlight: 'rgba(255,255,255,0.10)',
      };
    case 'ghost':
      return {
        bg: 'transparent',
        border: 'transparent',
        fg: p.text,
        highlight: 'transparent',
      };
    case 'danger':
      return {
        bg: p.dangerSoft,
        border: p.glassBorder,
        fg: p.danger,
        highlight: 'rgba(255,255,255,0.05)',
      };
  }
}

function dimsFor(s: Size) {
  switch (s) {
    case 'sm':
      return { padH: 12, padV: 8, radius: radius.md, font: 13, iconSize: 16 };
    case 'lg':
      return { padH: 22, padV: 16, radius: radius.lg, font: 16, iconSize: 20 };
    default:
      return { padH: 18, padV: 13, radius: radius.lg, font: 15, iconSize: 18 };
  }
}

const styles = StyleSheet.create({
  root: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.headline,
    letterSpacing: -0.2,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.65,
  },
});
