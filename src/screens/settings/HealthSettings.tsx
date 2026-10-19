import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { HealthSettings as HS } from '../../core/types';
import {
  clearHealthCache,
  healthAvailable,
  healthPlatformName,
  openHealthSettings,
  requestHealthAccess,
  SyncResult,
  syncHealth,
} from '../../services/health';
import type { Availability } from '../../services/healthNative';
import { fmtRelativeDay, fmtTime } from '../../core/format';
import { toast } from '../../ui/Toast';

const SOURCES =
  Platform.OS === 'ios'
    ? 'iPhone, Apple Watch e app collegate'
    : 'Samsung Health, Fitbit, Garmin, Xiaomi e app collegate';

export const PRIVACY_URL =
  'https://github.com/SimoneRecchia/VibeGym/blob/main/docs/PRIVACY.md';

const FIELD_LABEL = { heightCm: 'altezza', birthDate: 'età', sex: 'sesso' };

/** "Aggiunte 4 pesate · profilo: altezza, età" */
const syncMessage = (r: SyncResult | null): string => {
  if (!r || (!r.weighIns && !r.profile.length)) return 'Tutto aggiornato';
  const parts: string[] = [];
  if (r.weighIns)
    parts.push(
      r.weighIns === 1
        ? '1 pesata importata'
        : `${r.weighIns} pesate importate`,
    );
  const f = r.profile
    .map(k => FIELD_LABEL[k as keyof typeof FIELD_LABEL])
    .filter(Boolean);
  if (f.length) parts.push(`Profilo: ${f.join(', ')}`);
  return parts.join(' · ');
};

export function HealthSettings() {
  const h = useStore(s => s.settings.health);
  const update = useStore(s => s.updateSettings);
  const [avail, setAvail] = useState<Availability | null>(null);

  useEffect(() => {
    const check = () => healthAvailable().then(setAvail);
    check();
    const sub = AppState.addEventListener(
      'change',
      st => st === 'active' && check(),
    );
    return () => sub.remove();
  }, []);

  const set = (patch: Partial<HS>) =>
    update(s => ({ ...s, health: { ...s.health, ...patch } }));

  const enable = async (v: boolean) => {
    if (!v) {
      set({ enabled: false });
      clearHealthCache();
      return;
    }
    const ok = await requestHealthAccess();
    if (ok) {
      set({ enabled: true });
      clearHealthCache();
      syncHealth(true).then(r => toast(syncMessage(r)));
    } else {
      Alert.alert(
        'Accesso non concesso',
        `Consenti a VibeGym di leggere i dati dalle impostazioni di ${healthPlatformName}.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Apri', onPress: () => openHealthSettings() },
        ],
      );
    }
  };

  if (avail === 'unsupported' || avail === 'needs-install') {
    return (
      <Screen title={healthPlatformName} back>
        <Section
          footer={
            avail === 'needs-install'
              ? 'Su questo telefono Health Connect va installata dal Play Store (da Android 14 è già inclusa).'
              : `${healthPlatformName} non è disponibile su questo dispositivo. Il consumo calorico viene stimato dal metabolismo e dagli allenamenti.`
          }
        >
          {avail === 'needs-install' ? (
            <Row
              title="Installa Health Connect"
              icon="import"
              chevron
              onPress={() =>
                Linking.openURL(
                  'market://details?id=com.google.android.apps.healthdata',
                ).catch(() => {})
              }
            />
          ) : (
            <Row title="Non disponibile" />
          )}
        </Section>
      </Screen>
    );
  }

  return (
    <Screen title={healthPlatformName} back>
      <Section footer={`Da ${SOURCES}.`}>
        <Row
          title="Collega a VibeGym"
          subtitle="Passi, calorie, sonno"
          toggle={{ value: h.enabled, onChange: enable }}
        />
      </Section>

      {h.enabled ? (
        <Section title="Leggi">
          <Row
            title="Pesate delle altre bilance"
            toggle={{
              value: h.importWeight,
              onChange: v => {
                set({ importWeight: v });
                if (v) syncHealth(true).then(r => toast(syncMessage(r)));
              },
            }}
          />
          <Row
            title="Sincronizza ora"
            icon="refresh"
            value={
              h.lastSync
                ? `${fmtRelativeDay(h.lastSync)}, ${fmtTime(h.lastSync)}`
                : undefined
            }
            onPress={() => syncHealth(true).then(r => toast(syncMessage(r)))}
          />
        </Section>
      ) : null}

      <Section title="Scrivi">
        <Row
          title="Allenamenti"
          toggle={{
            value: h.writeWorkouts,
            onChange: async v => {
              if (v && !(await requestHealthAccess())) return;
              set({ writeWorkouts: v });
            },
          }}
        />
        <Row
          title="Peso e massa grassa"
          toggle={{
            value: h.writeWeight,
            onChange: async v => {
              if (v && !(await requestHealthAccess())) return;
              set({ writeWeight: v });
            },
          }}
        />
      </Section>

      <Section>
        <Row
          title="Gestisci le autorizzazioni"
          icon="gear"
          chevron
          onPress={() => openHealthSettings()}
        />
        <Row
          title="Informativa sulla privacy"
          icon="doc"
          chevron
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
        />
      </Section>
    </Screen>
  );
}
