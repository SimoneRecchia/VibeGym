/**
 * Floating action button: one round tinted-glass button in the corner, for
 * the main action of a screen without a bar across the content.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Glass } from './Glass';
import { Icon, IconName } from './Icon';
import { Tap } from './Pressable';

export const FAB_SIZE = 60;

export function Fab({
  icon = 'plus',
  label,
  onPress,
  tint,
}: {
  icon?: IconName;
  /** Accessibility label (the button shows only the icon). */
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  const { c } = useTheme();
  return (
    <Tap
      onPress={onPress}
      feedback="medium"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Glass tint={tint ?? c.accent} interactive style={styles.fab}>
        <Icon name={icon} size={28} color={c.onAccent} weight={2.4} />
      </Glass>
    </Tap>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
