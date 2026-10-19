import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { CARD_PAD, radius } from '../theme/metrics';
import { Tap } from './Pressable';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}

/** Content surface (grouped background). Content is never glass per HIG. */
export function Card({
  children,
  style,
  onPress,
  onLongPress,
  padded = true,
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card },
        padded && styles.padded,
        !onPress && style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Tap
      onPress={onPress}
      onLongPress={onLongPress}
      style={style}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: CARD_PAD },
});
