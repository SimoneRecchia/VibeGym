/**
 * Everything VibeGym connects to, in one place: the health platform (and the
 * watches and scales that sync into it), the Xiaomi scale over Bluetooth and
 * the heart-rate sensor.
 */
import React from 'react';
import { useStore } from '../../data/store';
import { ACCENTS } from '../../theme/colors';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { healthPlatformName } from '../../services/health';
import { SettingsProps } from '../../navigation/types';

export function IntegrationsSettings({
  navigation,
}: SettingsProps<'IntegrationsSettings'>) {
  const s = useStore(st => st.settings);
  const health = s.health.enabled;
  return (
    <Screen title="Integrazioni" back>
      <Section title="Salute e smartwatch">
        <Row
          icon="heart"
          iconBg={ACCENTS.pink.light}
          title={healthPlatformName}
          subtitle={health ? 'Collegato' : 'Non collegato'}
          chevron
          onPress={() => navigation.navigate('HealthSettings')}
        />
      </Section>

      <Section title="Bilance">
        <Row
          icon="bluetooth"
          iconBg={ACCENTS.blue.light}
          title="Bilancia Xiaomi"
          subtitle={s.scale.deviceName ?? 'Non collegata'}
          chevron
          onPress={() => navigation.navigate('ScaleSettings')}
        />
        <Row
          icon="scale"
          iconBg={ACCENTS.mint.light}
          title="Altre bilance"
          subtitle={
            health && s.health.importWeight
              ? 'Importate'
              : `Con ${healthPlatformName}`
          }
          chevron
          onPress={() => navigation.navigate('HealthSettings')}
        />
      </Section>

      <Section title="Cardio">
        <Row
          icon="heart"
          iconBg={ACCENTS.red.light}
          title="Fascia cardio"
          subtitle={s.hr.deviceName ?? 'Non collegata'}
          chevron
          onPress={() => navigation.navigate('HeartRateSettings')}
        />
      </Section>
    </Screen>
  );
}
