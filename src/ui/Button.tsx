import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/colors';
import { Tap } from './Pressable';
import { Glass } from './Glass';
import { Icon, IconName } from './Icon';
import { T } from './Text';
import { Haptic } from '../services/haptics';

export type ButtonVariant =
  | 'prominent'
  | 'glass'
  | 'tinted'
  | 'plain'
  | 'destructive';

interface Props {
  title?: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'l' | 'm' | 's';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Override the accent tint (e.g. destructive red). */
  tint?: string;
  feedback?: Haptic | null;
  accessibilityLabel?: string;
}

const HEIGHT = { l: 54, m: 44, s: 34 };
const ICON = { l: 20, m: 18, s: 15 };

/** Capsule button following the iOS 26 button styles. */
export function Button({
  title,
  icon,
  onPress,
  variant = 'prominent',
  size = 'l',
  disabled,
  loading,
  style,
  tint,
  feedback = 'light',
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const h = HEIGHT[size];
  const accent = tint ?? (variant === 'destructive' ? c.red : c.accent);
  const fg =
    variant === 'prominent'
      ? c.onAccent
      : variant === 'glass'
      ? c.label
      : accent;
  const inner = (
    <View
      style={[
        styles.inner,
        { height: h },
        title ? (size === 's' ? styles.padS : styles.padL) : { width: h },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} size={ICON[size]} color={fg} weight={2.2} />
          ) : null}
          {title ? (
            <T
              v={size === 's' ? 'subheadStrong' : 'headline'}
              color={fg}
              numberOfLines={1}
            >
              {title}
            </T>
          ) : null}
        </>
      )}
    </View>
  );
  const shape = { borderRadius: h / 2, overflow: 'hidden' as const };
  let body: React.ReactNode;
  if (variant === 'prominent')
    body = (
      <Glass tint={accent} interactive style={shape}>
        {inner}
      </Glass>
    );
  else if (variant === 'glass')
    body = (
      <Glass interactive style={shape}>
        {inner}
      </Glass>
    );
  else if (variant === 'tinted' || variant === 'destructive')
    body = (
      <View
        style={[
          shape,
          {
            backgroundColor:
              variant === 'destructive'
                ? withAlpha(c.red, 0.14)
                : tint
                ? withAlpha(tint, 0.16)
                : c.accentSoft,
          },
        ]}
      >
        {inner}
      </View>
    );
  else body = <View style={shape}>{inner}</View>;

  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      feedback={feedback}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {body}
    </Tap>
  );
}

/**
 * Round button with a single icon. Glass in the navigation layer (bars,
 * toolbars); `plain` (a filled circle) inside content, where HIG asks to
 * avoid glass.
 */
export function IconButton({
  icon,
  onPress,
  size = 44,
  tint,
  color,
  style,
  accessibilityLabel,
  disabled,
  plain,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  tint?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  disabled?: boolean;
  plain?: boolean;
}) {
  const { c } = useTheme();
  const glyph = (
    <Icon
      name={icon}
      size={Math.round(size * 0.45)}
      color={color ?? (tint ? c.onAccent : c.label)}
      weight={2.1}
    />
  );
  const shape = [
    styles.center,
    { width: size, height: size, borderRadius: size / 2 },
  ];
  return (
    <Tap
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      scaleTo={0.92}
    >
      {plain ? (
        <View style={[shape, { backgroundColor: tint ?? c.fill3 }]}>
          {glyph}
        </View>
      ) : (
        <Glass tint={tint} interactive style={shape}>
          {glyph}
        </Glass>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  padS: { paddingHorizontal: 14 },
  padL: { paddingHorizontal: 20 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
