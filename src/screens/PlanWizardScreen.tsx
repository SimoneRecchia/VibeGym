import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { ChoiceCard } from '../components/ChoiceCard';
import { buildConvertPrompt, buildGeneratePrompt, describeProfile } from '../lib/prompt';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanWizard'>;
type Mode = null | 'have' | 'create';

export function PlanWizardScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { profile, showToast } = useStore();
  const [mode, setMode] = useState<Mode>(null);
  // Visibility only: the prompt is always rebuilt live from `profile` on render.
  const [showPrompt, setShowPrompt] = useState(false);

  const copy = (s: string, label: string) => {
    Clipboard.setString(s);
    showToast(`${label} copiato`);
  };

  const profileText = describeProfile(profile);
  const hasProfile = profileText !== '- (nessun dato fornito)';

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
                subtitle="Usa i dati del tuo profilo per una scheda su misura."
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

        {/* ---------- Branch: generate a plan from the profile ---------- */}
        {mode === 'create' && (
          <>
            <Text style={[styles.lead, { color: palette.textDim }]}>
              Creiamo una scheda su misura dai dati del tuo profilo. Più il profilo è
              completo, più la scheda sarà azzeccata.
            </Text>

            <Text style={[styles.sectionLabel, { color: palette.textFaint }]}>
              DATI CHE USEREMO
            </Text>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.summaryText, { color: hasProfile ? palette.textDim : palette.textFaint }]}>
                {hasProfile ? profileText : 'Il profilo è vuoto: aggiungi almeno obiettivi e attrezzatura.'}
              </Text>
            </GlassCard>
            <GlassButton
              title="Modifica il profilo"
              icon="pencil"
              variant="ghost"
              onPress={() => navigation.navigate('Profile')}
              block
              style={{ marginTop: 10 }}
            />

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
    marginTop: space.xl,
    marginBottom: 10,
    marginLeft: 4,
  },
  summaryCard: { padding: space.md },
  summaryText: { ...typography.footnote, lineHeight: 20 },
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
