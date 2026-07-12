import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { ExperienceLevel, Sex } from '../lib/types';
import { GlassCard } from './GlassCard';

const SEX_OPTIONS: [Sex, string][] = [
  ['male', 'Uomo'],
  ['female', 'Donna'],
  ['other', 'Altro'],
];
const EXPERIENCE_OPTIONS: [ExperienceLevel, string][] = [
  ['beginner', 'Principiante'],
  ['intermediate', 'Intermedio'],
  ['advanced', 'Avanzato'],
];
export const EQUIPMENT_OPTIONS = [
  'Palestra completa',
  'Manubri',
  'Bilanciere',
  'Cavi',
  'Macchine',
  'Elastici',
  'Corpo libero',
];
export const GOAL_OPTIONS = [
  'Ipertrofia',
  'Forza',
  'Dimagrimento',
  'Resistenza',
  'Cardio',
  'Equilibrio',
  'Mobilità',
  'Postura',
];

/**
 * Full personal profile editor, organised into logical sections
 * (Anagrafica · Corpo · Allenamento · Salute). Bound to the store, so it drops
 * into onboarding and the Profile screen alike. Every field is optional.
 *
 * The training fields feed the AI plan builder, so collecting them here (once,
 * up front) means the "create a plan" wizard already has everything it needs.
 */
export function ProfileFields() {
  const { profile, setProfile } = useStore();

  // Numeric fields keep local text so a trailing "," / "." isn't eaten mid-type.
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

  const toggle = (arr: string[] | undefined, v: string): string[] => {
    const s = new Set(arr ?? []);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    return Array.from(s);
  };

  return (
    <View style={{ gap: space.lg }}>
      {/* -------------------- Anagrafica -------------------- */}
      <Section label="ANAGRAFICA">
        <Field label="NOME">
          <Input
            value={profile.name ?? ''}
            onChangeText={v => setProfile({ name: v })}
            placeholder="Il tuo nome"
            autoCapitalize="words"
          />
        </Field>
        <Field label="SESSO">
          <Segmented
            options={SEX_OPTIONS}
            value={profile.sex}
            onChange={v => setProfile({ sex: v })}
          />
        </Field>
        <Field label="DATA DI NASCITA">
          <Input
            value={profile.birthDate ?? ''}
            onChangeText={v => setProfile({ birthDate: v })}
            placeholder="GG/MM/AAAA"
            keyboardType="number-pad"
          />
        </Field>
      </Section>

      {/* -------------------- Corpo -------------------- */}
      <Section label="CORPO">
        <View style={styles.row}>
          <Field label="PESO" style={styles.rowItem}>
            <UnitInput value={weightText} onChangeText={onWeight} unit="kg" />
          </Field>
          <Field label="ALTEZZA" style={styles.rowItem}>
            <UnitInput value={heightText} onChangeText={onHeight} unit="cm" />
          </Field>
        </View>
      </Section>

      {/* -------------------- Allenamento -------------------- */}
      <Section label="ALLENAMENTO">
        <Field label="LIVELLO">
          <Segmented
            options={EXPERIENCE_OPTIONS}
            value={profile.experience}
            onChange={v => setProfile({ experience: v })}
          />
        </Field>
        <View style={styles.row}>
          <Field label="A SETTIMANA" style={styles.rowItem}>
            <UnitInput
              value={profile.sessionsPerWeek != null ? String(profile.sessionsPerWeek) : ''}
              onChangeText={t => {
                const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                setProfile({ sessionsPerWeek: Number.isFinite(n) ? n : undefined });
              }}
              unit="volte"
            />
          </Field>
          <Field label="DURATA" style={styles.rowItem}>
            <UnitInput
              value={profile.sessionLengthMin != null ? String(profile.sessionLengthMin) : ''}
              onChangeText={t => {
                const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                setProfile({ sessionLengthMin: Number.isFinite(n) ? n : undefined });
              }}
              unit="min"
            />
          </Field>
        </View>
        <Field label="ATTREZZATURA">
          <Chips
            options={EQUIPMENT_OPTIONS}
            selected={profile.equipment ?? []}
            onToggle={v => setProfile({ equipment: toggle(profile.equipment, v) })}
          />
        </Field>
        <Field label="OBIETTIVI">
          <Chips
            options={GOAL_OPTIONS}
            selected={profile.goals ?? []}
            onToggle={v => setProfile({ goals: toggle(profile.goals, v) })}
          />
          <Area
            value={profile.goalsNote}
            onChangeText={v => setProfile({ goalsNote: v })}
            placeholder="Qualcosa in particolare? (es. bicipiti, equilibrio)"
          />
        </Field>
      </Section>

      {/* -------------------- Salute -------------------- */}
      <Section label="SALUTE">
        <Field label="INFORTUNI O PROBLEMI FISICI">
          <Area
            value={profile.injuries}
            onChangeText={v => setProfile({ injuries: v })}
            placeholder="es. spalla destra dolorante dopo una caduta"
          />
        </Field>
        <Field label="ESERCIZI DA EVITARE">
          <Area
            value={profile.exclusions}
            onChangeText={v => setProfile({ exclusions: v })}
            placeholder="es. niente shoulder press; l'AI userà alternative"
          />
        </Field>
      </Section>
    </View>
  );
}

/* ------------------------------ pieces ------------------------------- */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View>
      <Text style={[styles.sectionLabel, { color: palette.textFaint }]}>{label}</Text>
      <GlassCard style={styles.card}>{children}</GlassCard>
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, { color: palette.textDim }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { palette } = useTheme();
  return (
    <TextInput
      placeholderTextColor={palette.textFaint}
      {...props}
      style={[
        styles.input,
        { color: palette.text, backgroundColor: palette.surface, borderColor: palette.glassBorderStrong },
      ]}
    />
  );
}

function UnitInput({
  value,
  onChangeText,
  unit,
}: {
  value: string;
  onChangeText: (t: string) => void;
  unit: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.unitRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="—"
        placeholderTextColor={palette.textFaint}
        keyboardType="decimal-pad"
        style={[
          styles.input,
          { flex: 1, color: palette.text, backgroundColor: palette.surface, borderColor: palette.glassBorderStrong },
        ]}
      />
      <Text style={[styles.unit, { color: palette.textFaint }]}>{unit}</Text>
    </View>
  );
}

function Area({
  value,
  onChangeText,
  placeholder,
}: {
  value?: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { palette } = useTheme();
  return (
    <TextInput
      value={value ?? ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textFaint}
      multiline
      style={[
        styles.area,
        { color: palette.text, backgroundColor: palette.surface, borderColor: palette.glassBorderStrong },
      ]}
    />
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.segRow}>
      {options.map(([val, lab]) => {
        const active = value === val;
        return (
          <Pressable
            key={val}
            onPress={() => onChange(active ? undefined : val)}
            style={[
              styles.segChip,
              {
                backgroundColor: active ? palette.accentSoft : palette.surface,
                borderColor: active ? palette.accent : palette.glassBorderStrong,
              },
            ]}
          >
            <Text style={[styles.segText, { color: active ? palette.accent : palette.textDim }]}>
              {lab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.chipWrap}>
      {options.map(o => {
        const active = selected.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onToggle(o)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? palette.accentSoft : palette.surface,
                borderColor: active ? palette.accent : palette.glassBorderStrong,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? palette.accent : palette.textDim }]}>
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { padding: space.md, gap: space.md },
  field: { gap: 6 },
  label: { ...typography.caption1, letterSpacing: 0.6 },
  row: { flexDirection: 'row', gap: space.md },
  rowItem: { flex: 1 },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
  },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { ...typography.subhead },
  area: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 8,
    ...typography.callout,
  },
  segRow: { flexDirection: 'row', gap: 8 },
  segChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  segText: { ...typography.footnote, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  chipText: { ...typography.footnote, fontWeight: '600' },
});
