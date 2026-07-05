import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { Sex } from '../lib/types';
import { GlassCard } from './GlassCard';

const SEX_OPTIONS: [Sex, string][] = [
  ['male', 'Uomo'],
  ['female', 'Donna'],
  ['other', 'Altro'],
];

/**
 * Personal profile editor (name, birth date, weight, height). Bound directly to
 * the store, so it can be dropped into the onboarding first page and the
 * Settings → Profile screen alike. All fields are optional.
 */
export function ProfileFields() {
  const { profile, setProfile } = useStore();
  const { palette } = useTheme();

  // Numeric fields keep local text so a trailing "," / "." doesn't get eaten.
  const [weightText, setWeightText] = useState(
    profile.weightKg != null ? String(profile.weightKg) : ''
  );
  const [heightText, setHeightText] = useState(
    profile.heightCm != null ? String(profile.heightCm) : ''
  );

  const onWeight = (t: string) => {
    setWeightText(t);
    const n = parseFloat(t.replace(',', '.'));
    setProfile({ weightKg: Number.isFinite(n) ? n : undefined });
  };
  const onHeight = (t: string) => {
    setHeightText(t);
    const n = parseFloat(t.replace(',', '.'));
    setProfile({ heightCm: Number.isFinite(n) ? n : undefined });
  };

  const inputStyle = [
    styles.input,
    {
      color: palette.text,
      backgroundColor: palette.surface,
      borderColor: palette.glassBorderStrong,
    },
  ];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.textDim }]}>NOME</Text>
        <TextInput
          value={profile.name ?? ''}
          onChangeText={v => setProfile({ name: v })}
          placeholder="Il tuo nome"
          placeholderTextColor={palette.textFaint}
          autoCapitalize="words"
          style={inputStyle}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.textDim }]}>DATA DI NASCITA</Text>
        <TextInput
          value={profile.birthDate ?? ''}
          onChangeText={v => setProfile({ birthDate: v })}
          placeholder="GG/MM/AAAA"
          placeholderTextColor={palette.textFaint}
          keyboardType="number-pad"
          style={inputStyle}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.textDim }]}>SESSO</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map(([val, lab]) => {
            const active = profile.sex === val;
            return (
              <Pressable
                key={val}
                onPress={() => setProfile({ sex: active ? undefined : val })}
                style={[
                  styles.sexChip,
                  {
                    backgroundColor: active ? palette.accentSoft : palette.surface,
                    borderColor: active ? palette.accent : palette.glassBorderStrong,
                  },
                ]}
              >
                <Text style={[styles.sexText, { color: active ? palette.accent : palette.textDim }]}>
                  {lab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.field, styles.rowItem]}>
          <Text style={[styles.label, { color: palette.textDim }]}>PESO</Text>
          <View style={styles.inputUnitRow}>
            <TextInput
              value={weightText}
              onChangeText={onWeight}
              placeholder="—"
              placeholderTextColor={palette.textFaint}
              keyboardType="decimal-pad"
              style={[inputStyle, { flex: 1 }]}
            />
            <Text style={[styles.unit, { color: palette.textFaint }]}>kg</Text>
          </View>
        </View>

        <View style={[styles.field, styles.rowItem]}>
          <Text style={[styles.label, { color: palette.textDim }]}>ALTEZZA</Text>
          <View style={styles.inputUnitRow}>
            <TextInput
              value={heightText}
              onChangeText={onHeight}
              placeholder="—"
              placeholderTextColor={palette.textFaint}
              keyboardType="decimal-pad"
              style={[inputStyle, { flex: 1 }]}
            />
            <Text style={[styles.unit, { color: palette.textFaint }]}>cm</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.md, gap: space.md },
  field: { gap: 6 },
  label: { ...typography.caption1, letterSpacing: 0.6 },
  row: { flexDirection: 'row', gap: space.md },
  rowItem: { flex: 1 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  sexText: { ...typography.footnote, fontWeight: '700' },
  inputUnitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { ...typography.subhead },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
  },
});
