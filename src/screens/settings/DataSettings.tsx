import React from 'react';
import { Alert } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { toast } from '../../ui/Toast';
import { pickTextFile, shareJson } from '../../services/files';
import { PersistedState, SLICE_KEYS } from '../../data/storage';
import { extractJson } from '../../plan/jsonText';
import { plural } from '../../core/format';
import { SettingsProps } from '../../navigation/types';

const BACKUP_KIND = 'vibegym-backup';

export function DataSettings({ navigation }: SettingsProps<'DataSettings'>) {
  const plans = useStore(s => s.plans.length);
  const sessions = useStore(s => s.sessions.length);
  const body = useStore(s => s.body.length);

  const exportBackup = async () => {
    const s = useStore.getState();
    const data: Partial<PersistedState> = {};
    for (const k of SLICE_KEYS)
      if (k !== 'workout') (data as Record<string, unknown>)[k] = s[k];
    const json = JSON.stringify({
      kind: BACKUP_KIND,
      version: 3,
      exportedAt: new Date().toISOString(),
      data,
    });
    try {
      await shareJson(
        `vibegym-backup-${new Date().toISOString().slice(0, 10)}.json`,
        json,
      );
    } catch (e) {
      Alert.alert(
        'Esportazione non riuscita',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const importBackup = async () => {
    try {
      const text = await pickTextFile();
      if (!text) return;
      const obj = extractJson(text) as {
        kind?: string;
        data?: Partial<PersistedState>;
      };
      if (obj?.kind !== BACKUP_KIND || !obj.data) {
        Alert.alert(
          'File non riconosciuto',
          'Questo non è un backup di VibeGym. Per importare una scheda usa «Nuova scheda → Importa un file».',
        );
        return;
      }
      const d = obj.data;
      Alert.alert(
        'Ripristinare il backup?',
        `Contiene ${plural(d.plans?.length ?? 0, 'scheda', 'schede')}, ${plural(
          d.sessions?.length ?? 0,
          'allenamento',
          'allenamenti',
        )} e ${plural(
          d.body?.length ?? 0,
          'pesata',
          'pesate',
        )}. I dati attuali verranno sostituiti.`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Ripristina',
            style: 'destructive',
            onPress: () => {
              useStore.getState().replaceAll({ ...d, workout: null });
              toast('Backup ripristinato');
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        'Backup non valido',
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const wipe = () =>
    Alert.alert(
      'Eliminare tutti i dati?',
      'Schede, allenamenti, pesate e impostazioni verranno cancellati da questo dispositivo.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina tutto',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Sei sicuro?', "L'operazione non si può annullare.", [
              { text: 'Annulla', style: 'cancel' },
              {
                text: 'Sì, elimina',
                style: 'destructive',
                onPress: async () => {
                  navigation.getParent()?.goBack();
                  await useStore.getState().resetAll();
                },
              },
            ]),
        },
      ],
    );

  return (
    <Screen title="Dati e backup" back>
      <Section footer="I dati sono salvati solo su questo telefono. Esporta un backup per non perderli o per passarli a un nuovo dispositivo.">
        <Row title="Schede" value={String(plans)} />
        <Row title="Allenamenti" value={String(sessions)} />
        <Row title="Pesate" value={String(body)} />
      </Section>
      <Section>
        <Row
          icon="share"
          title="Esporta backup"
          chevron
          onPress={exportBackup}
        />
        <Row
          icon="import"
          title="Ripristina backup"
          chevron
          onPress={importBackup}
        />
      </Section>
      <Section>
        <Row title="Elimina tutti i dati" destructive onPress={wipe} />
      </Section>
    </Screen>
  );
}
