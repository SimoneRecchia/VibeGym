import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/tokens';

interface Props {
  url?: string;
  fallback?: string;
  size?: number;
}

/**
 * Round avatar with initials fallback. We fetch the GitHub profile picture
 * directly with <Image source={{ uri }} /> — no caching/preload, just a
 * plain HTTPS request. RN's Image handles disk caching for us.
 */
export function Avatar({ url, fallback, size = 36 }: Props) {
  const { palette } = useTheme();
  const initials = (fallback ?? '?').slice(0, 1).toUpperCase();

  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.surface,
          borderColor: palette.glassBorderStrong,
        },
      ]}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initials, { color: palette.text, fontSize: size * 0.45 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  initials: {
    ...typography.headline,
    fontWeight: '800',
  },
});
