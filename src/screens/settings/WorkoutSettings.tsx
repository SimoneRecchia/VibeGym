import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { Settings } from '../../core/types';

export function WorkoutSettings() {
  const s = useStore(x => x.settings);
  const update = useStore(x => x.updateSettings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    update(p => ({ ...p, [k]: v }));

  return (
    <Screen title="Allenamento" back>
      <Section title="Unità di misura">
        <View style={styles.pad}>
          <Segmented
            options={[
              { key: 'kg', label: 'Chilogrammi (kg)' },
              { key: 'lb', label: 'Libbre (lb)' },
            ]}
            value={s.unit}
            onChange={v => set('unit', v)}
          />
        </View>
      </Section>

      <Section
        title="Progressione"
        footer="Di quanto aumentano i pulsanti + e − e il carico suggerito quando completi tutte le serie. Negli esercizi di isolamento il suggerimento è dimezzato."
      >
        <View style={styles.pad}>
          <Stepper
            value={s.loadStepKg}
            onChange={v => set('loadStepKg', v)}
            step={0.5}
            min={0.5}
            max={10}
            decimals={1}
            unit="kg"
            size="m"
          />
        </View>
      </Section>

      <Section title="Durante l'allenamento">
        <Row
          title="Avvia il recupero da solo"
          subtitle="Quando segni una serie come fatta"
          toggle={{ value: s.autoRest, onChange: v => set('autoRest', v) }}
        />
        <Row
          title="Schermo sempre acceso"
          toggle={{ value: s.keepAwake, onChange: v => set('keepAwake', v) }}
        />
        <Row
          title="Animazioni degli esercizi"
          subtitle="Scaricate da internet la prima volta"
          toggle={{ value: s.showMedia, onChange: v => set('showMedia', v) }}
        />
      </Section>

      <Section title="Feedback">
        <Row
          title="Suoni"
          subtitle="Conto alla rovescia e fine timer"
          toggle={{ value: s.sound, onChange: v => set('sound', v) }}
        />
        <Row
          title="Vibrazione"
          toggle={{ value: s.haptics, onChange: v => set('haptics', v) }}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14 },
});
