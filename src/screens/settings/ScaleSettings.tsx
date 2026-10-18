import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Row, Section } from '../../ui/List';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { toast } from '../../ui/Toast';
import { openBluetoothSettings, useScale } from '../../scale/useScale';
import { SCALE_MODEL_LABEL } from '../../scale/miScale';
import { fmtNum } from '../../core/format';
import { toDisplay } from '../../core/units';

export function ScaleSettings() {
  const { c } = useTheme();
  const scale = useStore(s => s.settings.scale);
  const unit = useStore(s => s.settings.unit);
  const update = useStore(s => s.updateSettings);
  const { status, found, start, stop, slow } = useScale({ discover: true });
  const searching =
    status === 'scanning' || status === 'measuring' || status === 'waiting';

  useEffect(() => stop, [stop]);

  return (
    <Screen title="Bilancia" back>
      <Card style={styles.block}>
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Icon name="scale" size={26} color={c.accent} />
          </View>
          <View style={styles.flex}>
            <T v="headline">Bilance Xiaomi</T>
            <T v="subhead" color="secondary">
              Mi Smart Scale 2 e Mi Body Composition Scale 2. Il peso viene
              letto direttamente via Bluetooth: non serve l'app Mi Fit / Zepp
              Life né un account.
            </T>
          </View>
        </View>
      </Card>

      {scale.deviceId ? (
        <Section title="Bilancia collegata">
          <Row
            title={scale.deviceName ?? 'Bilancia Xiaomi'}
            subtitle={scale.model ? SCALE_MODEL_LABEL[scale.model] : undefined}
            icon="bluetooth"
            iconBg={c.accent}
          />
          <Row
            title="Salva automaticamente"
            subtitle="Quando la pesata si stabilizza"
            toggle={{
              value: scale.autoSave,
              onChange: v =>
                update(s => ({ ...s, scale: { ...s.scale, autoSave: v } })),
            }}
          />
          <Row
            title="Dimentica bilancia"
            destructive
            onPress={() =>
              update(s => ({ ...s, scale: { autoSave: s.scale.autoSave } }))
            }
          />
        </Section>
      ) : null}

      <Section
        title={scale.deviceId ? 'Cambia bilancia' : 'Collega'}
        footer="Accendi la bilancia salendoci sopra: comparirà qui. Se vicino a te ce n'è più di una, scegli quella che mostra il tuo peso."
      >
        {found.map(f => (
          <Row
            key={f.id}
            title={f.name}
            subtitle={`${SCALE_MODEL_LABEL[f.reading.model]} · ${fmtNum(
              toDisplay(f.reading.weightKg, unit),
              1,
            )} ${unit}`}
            checked={f.id === scale.deviceId}
            onPress={() => {
              update(s => ({
                ...s,
                scale: {
                  ...s.scale,
                  deviceId: f.id,
                  deviceName: f.name,
                  model: f.reading.model,
                },
              }));
              toast('Bilancia collegata');
              stop();
            }}
          />
        ))}
        {status === 'permission-denied' ? (
          <Row
            title="Permesso Bluetooth negato"
            subtitle="Apri le impostazioni"
            onPress={() => Linking.openSettings()}
            chevron
          />
        ) : null}
        {status === 'bluetooth-off' ? (
          <Row
            title="Bluetooth spento"
            subtitle="Tocca per attivarlo"
            onPress={openBluetoothSettings}
            chevron
          />
        ) : null}
        {status === 'unsupported' ? (
          <Row title="Bluetooth LE non supportato" />
        ) : null}
        {searching ? (
          <View style={styles.searching}>
            <ActivityIndicator color={c.accent} />
            <T v="subhead" color="secondary" style={styles.flex}>
              {status === 'waiting'
                ? 'Attendo il Bluetooth…'
                : slow && !found.length
                ? Platform.OS === 'android' && Platform.Version < 31
                  ? 'Ancora niente: salici sopra e attiva la Localizzazione (necessaria su questa versione di Android).'
                  : 'Ancora niente: salici sopra per accenderla e tieni il telefono vicino.'
                : 'Sali sulla bilancia…'}
            </T>
          </View>
        ) : null}
      </Section>
      <Button
        title={searching ? 'Interrompi ricerca' : 'Cerca bilancia'}
        icon={searching ? 'xmark' : 'search'}
        variant={searching ? 'glass' : 'prominent'}
        onPress={searching ? stop : start}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 28 },
  intro: { flexDirection: 'row', gap: 14 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
});
