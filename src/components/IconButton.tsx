import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { haptic } from '../lib/haptics';

interface Props {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  variant?: 'glass' | 'solid' | 'plain';
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = 36,
  color,
  variant = 'glass',
  style,
}: Props) {
  const { palette } = useTheme();
  const bg =
    variant === 'plain'
      ? 'transparent'
      : variant === 'solid'
      ? palette.surfaceSolid
      : palette.glassFill;
  const border = variant === 'plain' ? 'transparent' : palette.glassBorder;

  return (
    <Pressable
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.65 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} color={color ?? palette.text} size={size * 0.52} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
});
