import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius, typography } from '../theme/tokens';
import { Icon } from './Icon';
import { haptic } from '../lib/haptics';

interface Props {
  index: number;
  done: boolean;
  label?: string;
  active?: boolean;
  tint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  width?: number | string;
}

export function SetChip({ index, done, label, active, tint, onPress, onLongPress, width }: Props) {
  const { palette, mode } = useTheme();
  const accent = tint ?? palette.accent;
  const bg = done
    ? mode === 'dark'
      ? 'rgba(94,139,255,0.20)'
      : 'rgba(50,102,255,0.12)'
    : palette.glassFill;
  const border = done ? accent : palette.glassBorderStrong;

  return (
    <Pressable
      onPress={() => {
        haptic(done ? 'light' : 'medium');
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
          width: width as number | undefined,
        },
        active && { borderColor: accent, borderWidth: 1.5 },
      ]}
    >
      <View style={[styles.num, { backgroundColor: done ? accent : palette.surface }]}>
        {done ? (
          <Icon name="check" size={12} color="#fff" />
        ) : (
          <Text style={[styles.numText, { color: palette.text }]}>{index + 1}</Text>
        )}
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            { color: done ? palette.text : palette.textDim },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    gap: 8,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  num: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    ...typography.caption2,
    letterSpacing: 0.1,
  },
  label: {
    ...typography.footnote,
    flex: 1,
  },
});
