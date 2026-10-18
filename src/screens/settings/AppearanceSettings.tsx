import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { ACCENTS, ACCENT_ORDER } from '../../theme/colors';
import { ThemePref } from '../../core/types';

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'Automatico' },
  { key: 'light', label: 'Chiaro' },
  { key: 'dark', label: 'Scuro' },
];

export function AppearanceSettings() {
  const { dark } = useTheme();
  const theme = useStore(s => s.settings.theme);
  const accent = useStore(s => s.settings.accent);
  const update = useStore(s => s.updateSettings);

  return (
    <Screen title="Aspetto" back>
      <Section
        title="Tema"
        footer="Automatico segue le impostazioni del telefono."
      >
        {THEMES.map(t => (
          <Row
            key={t.key}
            title={t.label}
            checked={theme === t.key}
            onPress={() => update(s => ({ ...s, theme: t.key }))}
          />
        ))}
      </Section>
      <Section title="Colore principale">
        <View style={styles.swatches}>
          {ACCENT_ORDER.map(a => {
            const col = ACCENTS[a][dark ? 'dark' : 'light'];
            const on = a === accent;
            return (
              <Tap
                key={a}
                onPress={() => update(s => ({ ...s, accent: a }))}
                accessibilityLabel={ACCENTS[a].label}
                accessibilityState={{ selected: on }}
                scaleTo={0.9}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: col },
                    on && styles.on,
                  ]}
                >
                  {on ? (
                    <Icon name="check" size={20} color="#FFFFFF" weight={3} />
                  ) : null}
                </View>
              </Tap>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 16,
    justifyContent: 'center',
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { transform: [{ scale: 1.08 }] },
});
