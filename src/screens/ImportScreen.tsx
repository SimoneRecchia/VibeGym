import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import { pick, types as pickerTypes } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { RootStackParamList } from '../navigation/types';
import { normalizePlan } from '../lib/migrate';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Import'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * The import path now always routes through ValidatePlanScreen, even when
 * the JSON parses cleanly — that screen surfaces any field-level issues
 * (bad weight, bad reps, etc.) and lets the user fix them inline. We do
 * the cheap "is it JSON at all?" check here so the user gets a useful
 * error if they paste something nonsensical, but everything else is the
 * validation screen's job.
 */
export function ImportScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { github } = useStore();
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRaw = (raw: string) => {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      const plan = normalizePlan(parsed);
      if (!plan.giorni || plan.giorni.length === 0) {
        setError('Nessun giorno trovato nella scheda. Il JSON deve contenere un array "giorni".');
        return;
      }
      navigation.navigate('ValidatePlan', { plan });
    } catch (e) {
      setError(e instanceof Error ? `JSON non valido: ${e.message}` : 'JSON non valido');
    }
  };

  const onPickFile = async () => {
    try {
      setBusy(true);
      setError(null);
      const [picked] = await pick({ type: [pickerTypes.allFiles] });
      if (!picked?.uri) {
        setBusy(false);
        return;
      }
      const path = decodeURIComponent(picked.uri.replace('file://', ''));
      const raw =
        Platform.OS === 'android' && picked.uri.startsWith('content://')
          ? await RNFS.readFile(picked.uri, 'utf8')
          : await RNFS.readFile(path, 'utf8');
      handleRaw(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onPasteImport = () => {
    if (!pasted.trim()) {
      setError('Incolla il JSON nel campo qui sopra');
      return;
    }
    handleRaw(pasted.trim());
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Importa scheda</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {!github.token && (
          <View
            style={[
              styles.warn,
              {
                backgroundColor: palette.warnSoft,
                borderColor: hexToRgba(stripHash(palette.warn), 0.45),
              },
            ]}
          >
            <Icon name="bulb" color={palette.warn} size={18} />
            <Text style={[styles.warnText, { color: palette.text }]}>
              Per salvare i progressi nel cloud serve collegare GitHub. Senza il
              collegamento la scheda viene salvata solo sul telefono.
            </Text>
          </View>
        )}

        <Text style={[styles.section, { color: palette.textFaint }]}>OPZIONE 1 — DA FILE</Text>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconBig,
                { backgroundColor: palette.accentSoft, borderColor: palette.glassBorder },
              ]}
            >
              <Icon name="doc" color={palette.accent} size={28} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.label, { color: palette.text }]}>Seleziona file .json</Text>
              <Text style={[styles.hint, { color: palette.textDim }]}>
                Scegli un file dal tuo dispositivo.
              </Text>
            </View>
          </View>
          <GlassButton
            title={busy ? 'Lettura…' : 'Apri file'}
            icon="download"
            onPress={onPickFile}
            disabled={busy}
            block
            size="lg"
          />
        </GlassCard>

        <Text style={[styles.section, { color: palette.textFaint, marginTop: space.xl }]}>OPZIONE 2 — INCOLLA JSON</Text>
        <GlassCard style={styles.card}>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            placeholder='Incolla qui il JSON che inizia con {"schema_version": 2, "nome_scheda": …}'
            placeholderTextColor={palette.textFaint}
            multiline
            style={[
              styles.textarea,
              {
                color: palette.text,
                backgroundColor: palette.surface,
                borderColor: palette.glassBorder,
              },
            ]}
          />
          <GlassButton title="Verifica e procedi" icon="arrow-right" onPress={onPasteImport} block size="lg" />
        </GlassCard>

        {error && (
          <View
            style={[
              styles.error,
              { backgroundColor: palette.dangerSoft, borderColor: palette.glassBorderStrong },
            ]}
          >
            <Icon name="x" color={palette.danger} size={16} />
            <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
          </View>
        )}

        <GlassButton
          title="Non hai un JSON? Vedi come crearlo"
          icon="bulb"
          variant="ghost"
          onPress={() => navigation.navigate('Format')}
          block
          style={{ marginTop: space.lg }}
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
  title: { ...typography.title2 },
  warn: {
    flexDirection: 'row',
    gap: 8,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.md,
    alignItems: 'flex-start',
  },
  warnText: { ...typography.footnote, flex: 1 },
  section: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: { padding: space.md, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBig: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  label: { ...typography.headline },
  hint: { ...typography.footnote, marginTop: 2 },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 160,
    textAlignVertical: 'top',
    fontSize: 13,
    fontFamily: 'Menlo',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginTop: space.lg,
  },
  errorText: { ...typography.footnote, flex: 1 },
});
