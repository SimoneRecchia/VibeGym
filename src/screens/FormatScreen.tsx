import React from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
import { Icon } from '../components/Icon';
import { FORMAT_EXAMPLE, FORMAT_PROMPT } from '../lib/formatExample';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Format'>;

export function FormatScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { showToast } = useStore();

  const copy = (s: string, label: string) => {
    Clipboard.setString(s);
    showToast(`${label} copiato`);
  };

  const shareExample = async () => {
    try {
      await Share.share({ message: FORMAT_EXAMPLE, title: 'vibe-gym-scheda-esempio.json' });
    } catch {
      /* ignore */
    }
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Crea il JSON</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <GlassCard style={[styles.intro, { borderColor: palette.glassBorder }]}>
          <Icon name="bulb" color={palette.warn} size={22} />
          <Text style={[styles.introText, { color: palette.text }]}>
            <Text style={{ color: palette.warn, fontWeight: '800' }}>Serve un file JSON.</Text>{' '}
            Copia il prompt qui sotto, incollalo in un'AI (ChatGPT, Claude, Gemini) insieme alla tua scheda
            e ti restituirà il JSON pronto da importare.
          </Text>
        </GlassCard>

        <Text style={[styles.section, { color: palette.textFaint }]}>PASSAGGI</Text>
        <View style={{ gap: 8 }}>
          {[
            'Copia il prompt qui sotto',
            "Incollalo in un'AI insieme alla tua scheda (anche come foto o testo libero)",
            'Copia il JSON che l\'AI ti restituisce e usa "Importa scheda"',
          ].map((s, i) => (
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

        <Text style={[styles.section, { color: palette.textFaint, marginTop: space.xl }]}>PROMPT</Text>
        <GlassCard style={styles.code}>
          <Text style={[styles.codeText, { color: palette.textDim }]} selectable>
            {FORMAT_PROMPT}
          </Text>
          <GlassButton
            title="Copia prompt"
            icon="copy"
            onPress={() => copy(FORMAT_PROMPT, 'Prompt')}
            variant="secondary"
            block
          />
        </GlassCard>

        <Text style={[styles.section, { color: palette.textFaint, marginTop: space.xl }]}>ESEMPIO JSON</Text>
        <GlassCard style={styles.code}>
          <Text style={[styles.codeText, styles.mono, { color: palette.textDim }]} selectable>
            {FORMAT_EXAMPLE}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <GlassButton
              title="Copia"
              icon="copy"
              onPress={() => copy(FORMAT_EXAMPLE, 'Esempio')}
              variant="secondary"
              block
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Condividi"
              icon="share"
              onPress={shareExample}
              block
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>

        <GlassButton
          title="Vai a importa scheda"
          icon="arrow-right"
          onPress={() => navigation.navigate('Import')}
          block
          size="lg"
          style={{ marginTop: space.xl }}
        />
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
  intro: {
    flexDirection: 'row',
    gap: 10,
    padding: space.md,
    alignItems: 'flex-start',
  },
  introText: {
    ...typography.body,
    flex: 1,
  },
  section: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: space.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stepNumText: {
    ...typography.caption1,
    fontWeight: '800',
  },
  stepText: {
    ...typography.callout,
    flex: 1,
  },
  code: {
    padding: space.md,
    gap: 12,
  },
  codeText: {
    ...typography.footnote,
    lineHeight: 18,
  },
  mono: {
    fontFamily: 'Menlo',
    fontSize: 11,
  },
});
