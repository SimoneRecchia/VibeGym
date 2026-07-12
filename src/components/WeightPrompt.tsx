import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { GlassButton } from './GlassButton';
import { Icon } from './Icon';

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Periodic "update your weight" prompt. Rendered once at the app root; shows
 * itself when the store says a weigh-in is due (based on the reminder cadence),
 * logs the value into the body-metrics history, and snoozes otherwise.
 */
export function WeightPrompt() {
  const { weightPromptDue, logWeight, dismissWeightPrompt, profile } = useStore();
  const { palette, mode } = useTheme();
  const [text, setText] = useState('');

  useEffect(() => {
    if (weightPromptDue) setText(profile.weightKg != null ? String(profile.weightKg) : '');
  }, [weightPromptDue, profile.weightKg]);

  if (!weightPromptDue) return null;

  const save = () => {
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) logWeight(n);
    else dismissWeightPrompt();
  };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={dismissWeightPrompt}>
      <View style={[styles.bg, { backgroundColor: palette.scrim }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: mode === 'dark' ? 'rgba(22,22,28,0.98)' : 'rgba(255,255,255,0.99)',
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <View
            style={[
              styles.icon,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="chart" color={palette.accent} size={26} />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Come va il peso?</Text>
          <Text style={[styles.sub, { color: palette.textDim }]}>
            Aggiornalo ogni tanto per vedere l'andamento nel tempo.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="—"
              placeholderTextColor={palette.textFaint}
              keyboardType="decimal-pad"
              autoFocus
              style={[
                styles.input,
                { color: palette.text, backgroundColor: palette.surface, borderColor: palette.glassBorderStrong },
              ]}
            />
            <Text style={[styles.unit, { color: palette.textFaint }]}>kg</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: space.md }}>
            <GlassButton
              title="Più tardi"
              variant="secondary"
              onPress={dismissWeightPrompt}
              block
              style={{ flex: 1 }}
            />
            <GlassButton title="Salva" icon="check" onPress={save} block style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: space.xl,
    alignItems: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.md,
  },
  title: { ...typography.title2 },
  sub: { ...typography.body, textAlign: 'center', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', marginTop: space.lg },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...typography.title3,
    textAlign: 'center',
  },
  unit: { ...typography.title3 },
});
