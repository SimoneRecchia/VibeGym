import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Tap } from './Pressable';
import { T } from './Text';
import { Icon, IconName } from './Icon';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  /** Accent-tinted (not selectable) chip, e.g. a suggestion. */
  tinted?: boolean;
}

export function Chip({ label, selected, onPress, icon, style, tinted }: Props) {
  const { c } = useTheme();
  const bg = selected ? c.accent : tinted ? c.accentSoft : c.fill3;
  const fg = selected ? c.onAccent : tinted ? c.accent : c.label;
  return (
    <Tap
      onPress={onPress}
      disabled={!onPress}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.chip, { backgroundColor: bg }]}>
        {icon ? <Icon name={icon} size={15} color={fg} weight={2.2} /> : null}
        <T v="subheadStrong" color={fg} numberOfLines={1}>
          {label}
        </T>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
  },
});
