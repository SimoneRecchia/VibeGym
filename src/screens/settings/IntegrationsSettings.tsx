/**
 * Everything VibeGym connects to, in one place: the health platform (and the
 * watches and scales that sync into it), the Xiaomi scale over Bluetooth and
 * the heart-rate sensor.
 */
import React from 'react';
import { Platform } from 'react-native';
import { useStore } from '../../data/store';
import { ACCENTS } from '../../theme/colors';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { healthPlatformName } from '../../services/health';
import { SettingsProps } from '../../navigation/types';

const WATCHES =
  Platform.OS === 'ios'
    ? 'Apple Watch, Garmin, Fitbit, Oura, Polar, Amazfit'
    : 'Galaxy Watch, Pixel Watch, Fitbit, Garmin, Xiaomi, Amazfit, Huawei, Oura';

export function IntegrationsSettings({
  navigation,
}: SettingsProps<'IntegrationsSettings'>) {
  const s = useStore(st => st.settings);
  const health = s.health.enabled;
  return (
    <Screen title="Integrazioni" back>
      <Section
        title="Salute e smartwatch"
        footer={`${WATCHES}: passi, calorie, sonno e battito arrivano tramite ${healthPlatformName}.`}
      >
        <Row
          icon="heart"
          iconBg={ACCENTS.pink.light}
          title={healthPlatformName}
          subtitle="Passi, calorie, sonno, peso, altezza"
          value={health ? 'Collegato' : 'Non collegato'}
          chevron
          onPress={() => navigation.navigate('HealthSettings')}
        />
      </Section>

      <Section
        title="Bilance"
        footer={`Le altre bilance smart salvano le pesate nella loro app: collegala a ${healthPlatformName} e VibeGym le importa da sola.`}
      >
        <Row
          icon="bluetooth"
          iconBg={ACCENTS.blue.light}
          title="Xiaomi Mi Scale"
          subtitle="Bluetooth diretto: peso e composizione"
          value={s.scale.deviceName ?? 'Non collegata'}
          chevron
          onPress={() => navigation.navigate('ScaleSettings')}
        />
        <Row
          icon="scale"
          iconBg={ACCENTS.mint.light}
          title="Altre bilance"
          subtitle="Withings, Renpho, Eufy, Garmin, Fitbit, Huawei, Samsung, Zepp, Omron"
          value={
            health && s.health.importWeight
              ? 'Attive'
              : `Con ${healthPlatformName}`
          }
          chevron
          onPress={() => navigation.navigate('HealthSettings')}
        />
      </Section>

      <Section
        title="Cardio"
        footer="Battito dal vivo durante l’allenamento, media, massimo e calorie dal battito a fine sessione."
      >
        <Row
          icon="heart"
          iconBg={ACCENTS.red.light}
          title="Fascia cardio"
          subtitle="Polar, Garmin, Wahoo, Coospo o lo smartwatch"
          value={s.hr.deviceName ?? 'Non collegata'}
          chevron
          onPress={() => navigation.navigate('HeartRateSettings')}
        />
      </Section>
    </Screen>
  );
}
