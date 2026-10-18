import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Icon, IconName } from '../../ui/Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { ScreenProps } from '../../navigation/types';
import { useDraft } from '../../data/draft';
import { useStore } from '../../data/store';
import { newPlan } from '../../plan/planUtils';
import { buildDemoPlan } from '../../plan/demoPlan';
import { pickTextFile } from '../../services/files';
import { parsePlanText } from '../../plan/aiFormat';
import { toast } from '../../ui/Toast';

function Option({
  icon,
  title,
  text,
  onPress,
  primary,
}: {
  icon: IconName;
  title: string;
  text: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={styles.option} accessibilityLabel={title}>
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { backgroundColor: primary ? c.accent : c.accentSoft },
          ]}
        >
          <Icon name={icon} size={24} color={primary ? c.onAccent : c.accent} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <T v="headline">{title}</T>
            {primary ? (
              <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
                <T v="caption2" color="accent" weight="700">
                  CONSIGLIATO
                </T>
              </View>
            ) : null}
          </View>
          <T v="subhead" color="secondary">
            {text}
          </T>
        </View>
        <Icon name="chevron-right" size={16} color={c.tertiary} weight={2.4} />
      </View>
    </Card>
  );
}

export function PlanSetupScreen({ navigation }: ScreenProps<'PlanSetup'>) {
  const addPlan = useStore(s => s.addPlan);

  const importFile = async () => {
    try {
      const text = await pickTextFile();
      if (!text) return;
      useDraft.setState({ parsed: parsePlanText(text), replacesPlanId: null });
      navigation.navigate('ImportReview');
    } catch (e) {
      Alert.alert(
        'File non valido',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  return (
    <Screen title="Nuova scheda" eyebrow="Scegli come iniziare" close>
      <Option
        primary
        icon="sparkles"
        title="Creala con l'AI"
        text="Rispondi a poche domande: l'app prepara il prompt per ChatGPT, Gemini o un'altra AI."
        onPress={() => navigation.navigate('AiFlow', { mode: 'create' })}
      />
      <Option
        icon="camera"
        title="Ho già una scheda"
        text="Foto, PDF o testo: l'AI la converte nel formato dell'app e, se vuoi, la migliora."
        onPress={() => navigation.navigate('AiFlow', { mode: 'convert' })}
      />
      <Option
        icon="pencil"
        title="Creala a mano"
        text="Scegli gli esercizi dal catalogo e imposta serie, ripetizioni e carichi."
        onPress={() => {
          useDraft.setState({ editing: newPlan() });
          navigation.navigate('PlanEditor');
        }}
      />
      <Option
        icon="import"
        title="Importa un file"
        text="Un file .json di VibeGym (anche delle versioni precedenti)."
        onPress={importFile}
      />
      <Option
        icon="play"
        title="Prova la scheda demo"
        text="Full body su 3 giorni con superset, esercizi a tempo e cardio."
        onPress={() => {
          addPlan(buildDemoPlan());
          toast('Scheda demo pronta');
          navigation.popToTop();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
