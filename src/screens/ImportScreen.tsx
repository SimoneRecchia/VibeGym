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
import { radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Import'>;

export function ImportScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { importPlan, showToast } = useStore();
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickFile = async () => {
    try {
      setBusy(true);
      setError(null);
      const [picked] = await pick({
        type: [pickerTypes.allFiles],
      });
      if (!picked?.uri) {
        setBusy(false);
        return;
      }
      const path = decodeURIComponent(picked.uri.replace('file://', ''));
      let raw: string;
      if (Platform.OS === 'android' && picked.uri.startsWith('content://')) {
        raw = await RNFS.readFile(picked.uri, 'utf8');
      } else {
        raw = await RNFS.readFile(path, 'utf8');
      }
      const res = importPlan(raw);
      if (!res.ok) {
        setError(res.error ?? 'Errore durante l\'import');
      } else {
        showToast('Scheda importata');
        navigation.navigate('Home');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // user-cancel produces a known message we can swallow
      if (!/cancel/i.test(msg)) {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const onPasteImport = () => {
    if (!pasted.trim()) {
      setError('Incolla il JSON nel campo qui sopra');
      return;
    }
    const res = importPlan(pasted.trim());
    if (!res.ok) {
      setError(res.error ?? 'JSON non valido');
      return;
    }
    showToast('Scheda importata');
    navigation.navigate('Home');
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Importa scheda</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
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
            placeholder='Incolla qui il JSON che inizia con {"version": 1, "nome_scheda": …}'
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
          <GlassButton title="Importa" icon="check" onPress={onPasteImport} block size="lg" />
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
    padding: space.md,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBig: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
  errorText: {
    ...typography.footnote,
    flex: 1,
  },
});
