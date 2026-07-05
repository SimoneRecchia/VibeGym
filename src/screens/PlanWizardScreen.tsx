import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { ChoiceCard } from '../components/ChoiceCard';
import { PressableScale } from '../components/PressableScale';
import { ExperienceLevel } from '../lib/types';
import { buildConvertPrompt, buildGeneratePrompt } from '../lib/prompt';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanWizard'>;
type Mode = null | 'have' | 'create';

const EQUIPMENT = [
  'Palestra completa',
  'Manubri',
  'Bilanciere',
  'Cavi',
  'Macchine',
  'Elastici',
  'Corpo libero',
];
const GOALS = [
  'Ipertrofia',
  'Forza',
  'Dimagrimento',
  'Resistenza',
  'Cardio',
  'Equilibrio',
  'Mobilità',
  'Postura',
];
const EXPERIENCE: { key: ExperienceLevel; label: string }[] = [
  { key: 'beginner', label: 'Principiante' },
  { key: 'intermediate', label: 'Intermedio' },
  { key: 'advanced', label: 'Avanzato' },
];

export function PlanWizardScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { profile, setProfile, showToast } = useStore();
  const [mode, setMode] = useState<Mode>(null);
  // Only a visibility flag: the prompt is always rebuilt live from `profile`
  // below, so edits made after "Crea il prompt" are reflected on copy.
  const [showPrompt, setShowPrompt] = useState(false);

  const copy = (s: string, label: string) => {
    Clipboard.setString(s);
    showToast(`${label} copiato`);
  };

  const toggleInArray = (arr: string[] | undefined, value: string): string[] => {
    const set = new Set(arr ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return Array.from(set);
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton
          icon="arrow-left"
          onPress={() => (mode ? setMode(null) : navigation.goBack())}
          size={42}
        />
        <Text style={[styles.title, { color: palette.text }]}>Aggiungi la scheda</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {/* ---------- Branch chooser ---------- */}
        {mode === null && (
          <>
            <Text style={[styles.lead, { color: palette.textDim }]}>
              Per allenarti serve una scheda in formato JSON. Scegli come ottenerla:
              un'AI (ChatGPT, Claude, Gemini…) te la prepara in un attimo.
            </Text>
            <View style={{ gap: 12, marginTop: space.lg }}>
              <ChoiceCard
                icon="doc"
                title="Ho già una scheda"
                subtitle="Convertila in JSON: copia il prompt e allega la tua scheda all'AI."
                onPress={() => setMode('have')}
              />
              <ChoiceCard
                icon="sparkles"
                title="Creane una per me"
                subtitle="Rispondi a poche domande e l'AI ti crea una scheda su misura."
                tint={palette.success}
                onPress={() => setMode('create')}
              />
            </View>
          </>
        )}

        {/* ---------- Branch: already have a plan ---------- */}
        {mode === 'have' && (
          <>
            <Steps
              steps={[
                'Copia il prompt qui sotto',
                "Incollalo nella tua AI e allega la tua scheda (testo, foto o PDF)",
                'Copia il JSON che ti restituisce e torna qui su "Importa"',
              ]}
            />
            <PromptCard
              text={buildConvertPrompt()}
              onCopy={() => copy(buildConvertPrompt(), 'Prompt')}
            />
            <GlassButton
              title="Ho il JSON — importa scheda"
              icon="arrow-right"
              onPress={() => navigation.navigate('Import')}
              block
              size="lg"
              style={{ marginTop: space.xl }}
            />
          </>
        )}

        {/* ---------- Branch: generate a plan ---------- */}
        {mode === 'create' && (
          <>
            <Text style={[styles.lead, { color: palette.textDim }]}>
              Poche domande per una scheda su misura. Salti pure ciò che non sai —
              tutto è facoltativo.
            </Text>

            <Section label="LIVELLO">
              <ChipRow>
                {EXPERIENCE.map(e => (
                  <Chip
                    key={e.key}
                    label={e.label}
                    active={profile.experience === e.key}
                    onPress={() =>
                      setProfile({
                        experience: profile.experience === e.key ? undefined : e.key,
                      })
                    }
                  />
                ))}
              </ChipRow>
            </Section>

            <Section label="QUANTE VOLTE A SETTIMANA / DURATA">
              <View style={styles.numRow}>
                <NumberField
                  value={profile.sessionsPerWeek}
                  onChange={n => setProfile({ sessionsPerWeek: n })}
                  suffix="× a settimana"
                />
                <NumberField
                  value={profile.sessionLengthMin}
                  onChange={n => setProfile({ sessionLengthMin: n })}
                  suffix="min"
                />
              </View>
            </Section>

            <Section label="ATTREZZATURA DISPONIBILE">
              <ChipRow>
                {EQUIPMENT.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    active={(profile.equipment ?? []).includes(item)}
                    onPress={() => setProfile({ equipment: toggleInArray(profile.equipment, item) })}
                  />
                ))}
              </ChipRow>
            </Section>

            <Section label="OBIETTIVI">
              <ChipRow>
                {GOALS.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    active={(profile.goals ?? []).includes(item)}
                    onPress={() => setProfile({ goals: toggleInArray(profile.goals, item) })}
                  />
                ))}
              </ChipRow>
              <FreeText
                placeholder="Vuoi puntare su qualcosa in particolare? (es. bicipiti, equilibrio)"
                value={profile.goalsNote}
                onChange={v => setProfile({ goalsNote: v })}
              />
            </Section>

            <Section label="INFORTUNI O PROBLEMI FISICI">
              <FreeText
                placeholder="es. spalla destra dolorante dopo una caduta"
                value={profile.injuries}
                onChange={v => setProfile({ injuries: v })}
              />
            </Section>

            <Section label="ESERCIZI DA EVITARE">
              <FreeText
                placeholder="es. niente shoulder press; l'AI userà alternative"
                value={profile.exclusions}
                onChange={v => setProfile({ exclusions: v })}
              />
            </Section>

            {!showPrompt ? (
              <GlassButton
                title="Crea il prompt per l'AI"
                icon="sparkles"
                onPress={() => setShowPrompt(true)}
                block
                size="lg"
                style={{ marginTop: space.lg }}
              />
            ) : (
              <>
                <Steps
                  steps={[
                    'Copia il prompt e incollalo nella tua AI',
                    "Se qualcosa non va, l'AI te lo fa notare: rispondi e sistema",
                    'Copia il JSON finale e torna qui su "Importa"',
                  ]}
                />
                <PromptCard
                  text={buildGeneratePrompt(profile)}
                  onCopy={() => copy(buildGeneratePrompt(profile), 'Prompt')}
                />
                <GlassButton
                  title="Ho il JSON — importa scheda"
                  icon="arrow-right"
                  onPress={() => navigation.navigate('Import')}
                  block
                  size="lg"
                  style={{ marginTop: space.xl }}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------ small pieces ----------------------------- */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ marginTop: space.xl }}>
      <Text style={[styles.sectionLabel, { color: palette.textFaint }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <PressableScale onPress={onPress}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? palette.accentSoft : palette.surface,
            borderColor: active ? palette.accent : palette.glassBorderStrong,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: active ? palette.accent : palette.textDim },
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

function NumberField({
  value,
  onChange,
  suffix,
}: {
  value?: number;
  onChange: (n: number | undefined) => void;
  suffix: string;
}) {
  const { palette } = useTheme();
  const [text, setText] = useState(value != null ? String(value) : '');
  return (
    <View style={[styles.numField, { borderColor: palette.glassBorderStrong, backgroundColor: palette.surface }]}>
      <TextInput
        value={text}
        onChangeText={t => {
          setText(t);
          const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
          onChange(Number.isFinite(n) ? n : undefined);
        }}
        placeholder="—"
        placeholderTextColor={palette.textFaint}
        keyboardType="number-pad"
        style={[styles.numInput, { color: palette.text }]}
      />
      <Text style={[styles.numSuffix, { color: palette.textFaint }]}>{suffix}</Text>
    </View>
  );
}

function FreeText({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { palette } = useTheme();
  return (
    <TextInput
      value={value ?? ''}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={palette.textFaint}
      multiline
      style={[
        styles.freeText,
        { color: palette.text, backgroundColor: palette.surface, borderColor: palette.glassBorderStrong },
      ]}
    />
  );
}

function Steps({ steps }: { steps: string[] }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 8, marginTop: space.md }}>
      {steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View
            style={[
              styles.stepNum,
              { backgroundColor: palette.accentSoft, borderColor: palette.glassBorderStrong },
            ]}
          >
            <Text style={[styles.stepNumText, { color: palette.accent }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: palette.text }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function PromptCard({ text, onCopy }: { text: string; onCopy: () => void }) {
  const { palette } = useTheme();
  return (
    <GlassCard style={styles.promptCard}>
      <Text style={[styles.promptText, { color: palette.textDim }]} selectable>
        {text}
      </Text>
      <GlassButton title="Copia prompt" icon="copy" onPress={onCopy} variant="secondary" block />
    </GlassCard>
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
  title: { ...typography.title2 },
  lead: { ...typography.body, marginTop: space.xs },
  sectionLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  chipText: { ...typography.footnote, fontWeight: '600' },
  numRow: { flexDirection: 'row', gap: space.md },
  numField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  numInput: { flex: 1, paddingVertical: 12, ...typography.body },
  numSuffix: { ...typography.footnote },
  freeText: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
    marginTop: 10,
    ...typography.callout,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stepNumText: { ...typography.caption1, fontWeight: '800' },
  stepText: { ...typography.callout, flex: 1 },
  promptCard: { padding: space.md, gap: 12, marginTop: space.lg },
  promptText: { ...typography.footnote, lineHeight: 18 },
});
