import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { GlassCard } from './GlassCard';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

interface Props {
  icon: IconName;
  title: string;
  subtitle: string;
  /** Accent for the icon bubble; defaults to the theme accent. */
  tint?: string;
  onPress: () => void;
  /** Show a spinner instead of the chevron (e.g. while connecting). */
  loading?: boolean;
  disabled?: boolean;
}

/**
 * A large, tappable option card used in the onboarding "how do you want to save"
 * chooser. Both options render with identical size/weight so neither visually
 * dominates — the only difference is the icon and its tint.
 */
export function ChoiceCard({ icon, title, subtitle, tint, onPress, loading, disabled }: Props) {
  const { palette } = useTheme();
  const accent = tint ?? palette.accent;

  return (
    <PressableScale onPress={onPress} disabled={disabled || loading}>
      <GlassCard rounded="lg" style={styles.card}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: hexToRgba(stripHash(accent), 0.16),
              borderColor: hexToRgba(stripHash(accent), 0.5),
            },
          ]}
        >
          <Icon name={icon} color={accent} size={26} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textDim }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator color={accent} />
        ) : (
          <Icon name="chevron-right" color={palette.textFaint} size={22} />
        )}
      </GlassCard>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  body: { flex: 1, minWidth: 0 },
  title: { ...typography.title3 },
  subtitle: { ...typography.footnote, marginTop: 3 },
});
