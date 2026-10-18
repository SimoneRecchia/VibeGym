import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { ACCENTS, withAlpha } from '../../theme/colors';
import { numeric } from '../../theme/typography';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { Row, Section } from '../../ui/List';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { toast } from '../../ui/Toast';
import { openBluetoothSettings } from '../../services/ble';
import { useHrScan } from '../../hr/useHrScan';
import { connectHr, disconnectHr, useHr } from '../../hr/hrRuntime';

/** Chest straps and watches that broadcast the standard heart-rate service. */
export function HeartRateSettings() {
  const { c, dark } = useTheme();
  const hr = useStore(s => s.settings.hr);
  const inWorkout = useStore(s => !!s.workout);
  const update = useStore(s => s.updateSettings);
  const { status, found, start, stop } = useHrScan();
  const live = useHr(s => s.status);
  const bpm = useHr(s => s.bpm);
  const pink = ACCENTS.pink[dark ? 'dark' : 'light'];
  const scanning = status === 'scanning';

  // Live reading while on this screen, to check the strap works.
  useEffect(() => {
    if (!hr.deviceId || inWorkout) return;
    connectHr(hr.deviceId);
    return () => disconnectHr();
  }, [hr.deviceId, inWorkout]);

  return (
    <Screen title="Fascia cardio" back>
      <Card style={styles.block}>
        <View style={styles.intro}>
          <View
            style={[styles.icon, { backgroundColor: withAlpha(pink, 0.18) }]}
          >
            <Icon name="heart" size={26} color={pink} />
          </View>
          <View style={styles.flex}>
            <T v="headline">Battito durante l’allenamento</T>
            <T v="subhead" color="secondary">
              Polar H10 e H9, Garmin HRM, Wahoo TICKR, Coospo, Decathlon e gli
              smartwatch in modalità «trasmetti battito» (Garmin, Polar,
              Amazfit, Suunto). Si collega da sola quando inizi un allenamento.
            </T>
          </View>
        </View>
      </Card>

      {hr.deviceId ? (
        <Section title="Sensore collegato">
          <Row
            title={hr.deviceName ?? 'Sensore cardio'}
            subtitle={
              live === 'live'
                ? 'Collegato'
                : live === 'connecting'
                ? 'Mi collego…'
                : 'Indossalo o attiva la trasmissione del battito'
            }
            icon="bluetooth"
            iconBg={pink}
            right={
              <T
                style={[
                  numeric(22),
                  { color: live === 'live' ? c.label : c.tertiary },
                ]}
              >
                {live === 'live' && bpm != null ? `${bpm}` : '--'}
                <T v="footnoteStrong" color="secondary">
                  {' bpm'}
                </T>
              </T>
            }
          />
          <Row
            title="Dimentica sensore"
            destructive
            onPress={() => {
              disconnectHr();
              update(s => ({ ...s, hr: {} }));
            }}
          />
        </Section>
      ) : null}

      <Section
        title={hr.deviceId ? 'Cambia sensore' : 'Collega'}
        footer="Indossa la fascia (inumidisci gli elettrodi) o avvia la trasmissione del battito sull’orologio: comparirà qui. Non serve l’abbinamento nelle impostazioni Bluetooth."
      >
        {found.map(f => (
          <Row
            key={f.id}
            title={f.name}
            subtitle="Sensore di frequenza cardiaca"
            checked={f.id === hr.deviceId}
            onPress={() => {
              update(s => ({
                ...s,
                hr: { deviceId: f.id, deviceName: f.name },
              }));
              toast('Sensore collegato', 'heart');
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
        {status === 'error' ? <Row title="Bluetooth non disponibile" /> : null}
        {scanning ? (
          <View style={styles.searching}>
            <ActivityIndicator color={pink} />
            <T v="subhead" color="secondary" style={styles.flex}>
              {found.length ? 'Cerco altri sensori…' : 'Cerco sensori vicini…'}
            </T>
          </View>
        ) : null}
      </Section>
      <Button
        title={scanning ? 'Interrompi ricerca' : 'Cerca sensore'}
        icon={scanning ? 'xmark' : 'search'}
        variant={scanning ? 'glass' : 'prominent'}
        onPress={scanning ? stop : start}
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
