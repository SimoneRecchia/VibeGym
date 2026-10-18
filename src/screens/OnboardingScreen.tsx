import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { T } from '../ui/Text';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Icon, IconName } from '../ui/Icon';
import { GUTTER } from '../theme/metrics';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'sparkles',
    title: 'Scheda su misura',
    text: "Creala o convertila con l'AI in un paio di minuti.",
  },
  {
    icon: 'timer',
    title: 'Allenamento veloce',
    text: 'Un tocco per serie, recupero automatico, animazioni degli esercizi.',
  },
  {
    icon: 'chart',
    title: 'Progressi reali',
    text: 'Carichi, record e peso corporeo, anche dalla bilancia Xiaomi.',
  },
];

export function OnboardingScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const setProfile = useStore(s => s.setProfile);
  const complete = useStore(s => s.completeOnboarding);
  const [name, setName] = useState('');

  const start = () => {
    if (name.trim()) setProfile({ name: name.trim() });
    complete();
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Soft accent glow so the glass has something to refract */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="18%" r="70%">
            <Stop offset="0" stopColor={c.accent} stopOpacity={0.35} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.logo, { backgroundColor: c.accent }]}>
            <Icon name="dumbbell" size={44} color={c.onAccent} weight={2.2} />
          </View>
          <T v="largeTitle" align="center" style={styles.title}>
            Benvenuto in VibeGym
          </T>
          <T v="body" color="secondary" align="center" style={styles.subtitle}>
            La tua scheda, i tuoi progressi, il tuo corpo. Tutto in un posto,
            tutto sul tuo telefono.
          </T>

          <View style={styles.features}>
            {FEATURES.map(f => (
              <View key={f.title} style={styles.feature}>
                <Glass style={styles.featureIcon}>
                  <Icon name={f.icon} size={24} color={c.accent} />
                </Glass>
                <View style={styles.flex}>
                  <T v="headline">{f.title}</T>
                  <T v="subhead" color="secondary">
                    {f.text}
                  </T>
                </View>
              </View>
            ))}
          </View>

          <T v="footnote" color="secondary" style={styles.label}>
            COME TI CHIAMI?
          </T>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Il tuo nome (facoltativo)"
            placeholderTextColor={c.tertiary}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={start}
            style={[styles.input, { backgroundColor: c.card, color: c.label }]}
          />
          <Button
            title="Iniziamo"
            icon="arrow-right"
            onPress={start}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER + 8 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 24 },
  subtitle: { marginTop: 10 },
  features: { marginTop: 36, gap: 20 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  label: { marginTop: 40, marginLeft: 16, marginBottom: 6 },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, fontSize: 17 },
  cta: { marginTop: 16 },
});
