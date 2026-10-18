import React from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { ACCENTS, ACCENT_ORDER } from '../../theme/colors';
import { ThemePref } from '../../core/types';
import { T } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { APP_ICONS, AppIcon } from '../../ui/AppIcon';
import { appIconAvailable, useAppIcon } from '../../services/appIcon';

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'Automatico' },
  { key: 'light', label: 'Chiaro' },
  { key: 'dark', label: 'Scuro' },
];

export function AppearanceSettings() {
  const { c, dark } = useTheme();
  const { icon, change } = useAppIcon();

  const pickIcon = (key: string) => {
    if (key === icon) return;
    change(key)
      .then(() => {
        // iOS confirms with its own alert; Android launchers refresh shortly.
        if (Platform.OS === 'android')
          toast(
            'Icona cambiata: la schermata Home si aggiorna tra poco',
            'check',
          );
      })
      .catch(() =>
        Alert.alert(
          'Icona non cambiata',
          'Il telefono non ha accettato la nuova icona.',
        ),
      );
  };
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
      {appIconAvailable ? (
        <Section
          title="Icona dell'app"
          footer="Il colore dell'icona sulla schermata Home."
        >
          <View style={styles.icons}>
            {APP_ICONS.map(i => {
              const on = i.key === icon;
              return (
                <Tap
                  key={i.key}
                  onPress={() => pickIcon(i.key)}
                  accessibilityLabel={`Icona ${i.label}`}
                  accessibilityState={{ selected: on }}
                  scaleTo={0.92}
                  style={styles.iconItem}
                >
                  <View
                    style={[styles.iconRing, on && { borderColor: c.accent }]}
                  >
                    <AppIcon color={i.key} size={56} />
                  </View>
                  <T
                    v="caption"
                    color={on ? 'accent' : 'secondary'}
                    align="center"
                    numberOfLines={1}
                  >
                    {i.label}
                  </T>
                </Tap>
              );
            })}
          </View>
        </Section>
      ) : null}
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
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconItem: { width: '33.33%', alignItems: 'center', paddingVertical: 6 },
  iconRing: {
    borderColor: 'transparent',
    borderWidth: 2.5,
    borderRadius: 19,
    padding: 3,
    marginBottom: 4,
  },
});
