import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useStore } from '../data/store';
import { Tap } from './Pressable';
import { Glass } from './Glass';
import { T } from './Text';
import { Icon } from './Icon';
import { withAlpha } from '../theme/colors';

export const initials = (name?: string): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

/** Profile button shown top-right on every tab; opens settings. */
export function ProfileButton() {
  const { c } = useTheme();
  const name = useStore(s => s.profile.name);
  const nav = useNavigation<any>();
  const ini = initials(name);
  return (
    <Tap
      onPress={() => nav.navigate('Settings')}
      accessibilityRole="button"
      accessibilityLabel="Profilo e impostazioni"
      scaleTo={0.92}
    >
      <Glass interactive style={styles.button}>
        {ini ? (
          <View
            style={[
              styles.inner,
              { backgroundColor: withAlpha(c.accent, 0.9) },
            ]}
          >
            <T v="subheadStrong" color="onAccent">
              {ini}
            </T>
          </View>
        ) : (
          <Icon name="person" size={22} color={c.label} />
        )}
      </Glass>
    </Tap>
  );
}

export function AvatarLarge({
  name,
  size = 72,
}: {
  name?: string;
  size?: number;
}) {
  const { c } = useTheme();
  const ini = initials(name);
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.accent,
        },
      ]}
    >
      {ini ? (
        <T v="title1" color="onAccent">
          {ini}
        </T>
      ) : (
        <Icon name="person" size={size * 0.5} color={c.onAccent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
