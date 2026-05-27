import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { Icon, IconName } from '../components/Icon';
import { Settings, WeightUnit } from '../lib/types';
import { RootStackParamList } from '../navigation/types';

type BooleanSettingKey =
  | 'haptic'
  | 'sound'
  | 'countdownWarn'
  | 'autoExpandTimer'
  | 'skipLastRest'
  | 'keepScreenOn';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { settings, setSetting } = useStore();
  const { palette, mode, toggle } = useTheme();

  const items: {
    key: BooleanSettingKey;
    label: string;
    hint: string;
    icon: IconName;
  }[] = [
    { key: 'haptic', label: 'Vibrazione', hint: 'Feedback tattile sui tasti', icon: 'sparkles' },
    { key: 'sound', label: 'Suoni', hint: 'Beep al termine del timer', icon: 'lightning' },
    { key: 'countdownWarn', label: 'Avviso countdown', hint: 'Tick negli ultimi 3 secondi', icon: 'timer' },
    { key: 'autoExpandTimer', label: 'Timer a tutto schermo', hint: "Apri timer in modo grande quando parte", icon: 'sparkles' },
    { key: 'skipLastRest', label: "Salta ultimo recupero", hint: "Non avviare il timer dopo l'ultima serie", icon: 'check' },
    { key: 'keepScreenOn', label: 'Tieni schermo acceso', hint: 'Durante un allenamento', icon: 'sun' },
  ];

  const units: { value: WeightUnit; label: string }[] = [
    { value: 'kg', label: 'kg' },
    { value: 'lb', label: 'lb' },
    { value: 'bw', label: 'BW' },
  ];

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Impostazioni</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <Text style={[styles.section, { color: palette.textFaint }]}>ASPETTO</Text>
        <GlassCard style={[styles.card, { marginBottom: space.lg }]}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
              ]}
            >
              <Icon name={mode === 'dark' ? 'moon' : 'sun'} color={palette.accent} size={18} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.label, { color: palette.text }]}>Tema</Text>
              <Text style={[styles.hint, { color: palette.textDim }]}>
                {mode === 'dark' ? 'Scuro' : 'Chiaro'}
              </Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{ true: palette.accent, false: palette.dividerStrong }}
              thumbColor="#fff"
            />
          </View>
        </GlassCard>

        <Text style={[styles.section, { color: palette.textFaint }]}>UNITÀ DI MISURA</Text>
        <GlassCard style={[styles.card, { marginBottom: space.lg }]}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
              ]}
            >
              <Icon name="dumbbell" color={palette.accent} size={18} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.label, { color: palette.text }]}>Unità peso</Text>
              <Text style={[styles.hint, { color: palette.textDim }]}>
                Predefinita per nuovi inserimenti
              </Text>
            </View>
            <View style={styles.segmented}>
              {units.map(u => {
                const active = settings.defaultUnit === u.value;
                return (
                  <Pressable
                    key={u.value}
                    onPress={() => setSetting('defaultUnit', u.value)}
                    style={[
                      styles.segmentedItem,
                      {
                        backgroundColor: active ? palette.accent : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.segmentedText, { color: active ? '#fff' : palette.text }]}>
                      {u.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </GlassCard>

        <Text style={[styles.section, { color: palette.textFaint }]}>ALLENAMENTO</Text>
        <GlassCard style={styles.card}>
          {items.map((it, i) => (
            <View key={it.key}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
                  ]}
                >
                  <Icon name={it.icon} color={palette.accent} size={18} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.label, { color: palette.text }]}>{it.label}</Text>
                  <Text style={[styles.hint, { color: palette.textDim }]}>{it.hint}</Text>
                </View>
                <Switch
                  value={settings[it.key]}
                  onValueChange={(v: boolean) => setSetting(it.key, v)}
                  trackColor={{ true: palette.accent, false: palette.dividerStrong }}
                  thumbColor="#fff"
                />
              </View>
              {i < items.length - 1 && (
                <View style={[styles.divider, { backgroundColor: palette.divider }]} />
              )}
            </View>
          ))}
        </GlassCard>

        <Text style={[styles.footer, { color: palette.textFaint }]}>
          Vibe Gym · build {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: {
    ...typography.title2,
  },
  section: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  label: {
    ...typography.headline,
  },
  hint: {
    ...typography.footnote,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  footer: {
    ...typography.caption1,
    textAlign: 'center',
    marginTop: space.xxl,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: 'rgba(127,127,127,0.25)',
  },
  segmentedItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  segmentedText: {
    ...typography.footnote,
    fontWeight: '700',
  },
});
