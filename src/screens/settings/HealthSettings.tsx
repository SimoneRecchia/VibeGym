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
} from '../../services/health';
import type { Availability } from '../../services/healthNative';

const SOURCES =
  Platform.OS === 'ios'
    ? 'iPhone, Apple Watch e le app collegate a Salute'
    : 'Samsung Health, Google Fit / Fitbit, Garmin, Xiaomi, Zepp, Polar, Oura e le altre app collegate';

export const PRIVACY_URL =
  'https://github.com/SimoneRecchia/VibeGym/blob/main/docs/PRIVACY.md';

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
    } else {
      Alert.alert(
        'Accesso non concesso',
        `Consenti a VibeGym di leggere passi e calorie dalle impostazioni di ${healthPlatformName}.`,
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
      <Section
        footer={`Passi ed energia arrivano da ${SOURCES}. Bastano il telefono e il contapassi: lo smartwatch è facoltativo.`}
      >
        <Row
          title="Leggi passi e calorie"
          subtitle="Per il consumo giornaliero in Nutrizione"
          toggle={{ value: h.enabled, onChange: enable }}
        />
      </Section>

      <Section
        title="Scrivi"
        footer="Così gli allenamenti e il peso compaiono anche nelle altre app."
      >
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
