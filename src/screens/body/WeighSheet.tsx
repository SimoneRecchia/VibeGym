/**
 * Weigh-in: straight from the Xiaomi scale over Bluetooth, or by hand.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Linking, Platform, StyleSheet, View } from 'react-native';
import { Sheet } from '../../ui/Sheet';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { Icon } from '../../ui/Icon';
import { toast } from '../../ui/Toast';
import { useTheme } from '../../theme/ThemeProvider';
import { selectLatestWeight, useStore } from '../../data/store';
import { openBluetoothSettings, useScale } from '../../scale/useScale';
import { SCALE_MODEL_LABEL, ScaleReading } from '../../scale/miScale';
import { computeComposition } from '../../body/composition';
import { ageFrom } from '../../core/dates';
import { fmtNum } from '../../core/format';
import { fromDisplay, toDisplay } from '../../core/units';
import { numeric } from '../../theme/typography';
import { BodyEntry } from '../../core/types';
import { haptic } from '../../services/haptics';

export function WeighSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const scaleSettings = useStore(s => s.settings.scale);
  const [mode, setMode] = useState<'scale' | 'manual'>(
    scaleSettings.deviceId ? 'scale' : 'manual',
  );
  useEffect(() => {
    if (visible) setMode(scaleSettings.deviceId ? 'scale' : 'manual');
  }, [visible, scaleSettings.deviceId]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Pesata">
      <Segmented
        options={[
          { key: 'scale', label: 'Bilancia Bluetooth' },
          { key: 'manual', label: 'A mano' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <View style={styles.body}>
        {mode === 'manual' ? (
          <Manual onDone={onClose} />
        ) : visible ? (
          <ScaleReader onDone={onClose} />
        ) : null}
      </View>
    </Sheet>
  );
}

function Manual({ onDone }: { onDone: () => void }) {
  const unit = useStore(s => s.settings.unit);
  const latest = useStore(selectLatestWeight);
  const add = useStore(s => s.addBodyEntry);
  const [v, setV] = useState(
    Math.round(toDisplay(latest?.weightKg ?? 75, unit) * 10) / 10,
  );
  return (
    <View style={styles.gap}>
      <Stepper
        label="Peso"
        value={v}
        onChange={setV}
        step={0.1}
        min={20}
        max={600}
        decimals={1}
        unit={unit}
      />
      <Button
        title="Salva"
        icon="check"
        onPress={() => {
          add({
            date: new Date().toISOString(),
            weightKg: Math.round(fromDisplay(v, unit) * 100) / 100,
            source: 'manual',
          });
          haptic('success');
          toast('Peso salvato');
          onDone();
        }}
      />
    </View>
  );
}

function ScaleReader({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const unit = useStore(s => s.settings.unit);
  const settings = useStore(s => s.settings.scale);
  const profile = useStore(s => s.profile);
  const body = useStore(s => s.body);
  const add = useStore(s => s.addBodyEntry);
  const updateSettings = useStore(s => s.updateSettings);
  // The scale keeps broadcasting its last measurement: skip the saved ones and
  // wait for the new weigh-in.
  const savedStamps = useMemo(
    () => new Set(body.map(b => b.scaleStamp).filter(Boolean)),
    [body],
  );
  const skipRef = useRef(savedStamps);
  skipRef.current = savedStamps;
  const skip = useCallback(
    (r: ScaleReading) => !!r.timestamp && skipRef.current.has(r.timestamp),
    [],
  );
  const { status, reading, device, start, slow } = useScale({
    deviceId: settings.deviceId,
    skip,
  });
  const [saved, setSaved] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const age = ageFrom(profile.birthDate);
  const canCompose = !!(profile.sex && profile.heightCm && age != null);
  const composition =
    reading?.impedance && canCompose
      ? computeComposition({
          weightKg: reading.weightKg,
          heightCm: profile.heightCm!,
          age: age!,
          sex: profile.sex!,
          impedance: reading.impedance,
        })
      : null;
  const duplicate =
    !!reading?.timestamp && body.some(b => b.scaleStamp === reading.timestamp);

  const save = () => {
    if (!reading || saved) return;
    const entry: Omit<BodyEntry, 'id'> = {
      date: new Date().toISOString(),
      weightKg: reading.weightKg,
      source: 'scale',
      impedance: reading.impedance,
      scaleStamp: reading.timestamp,
      ...(composition ?? {}),
    };
    add(entry);
    if (device && !settings.deviceId) {
      updateSettings(s => ({
        ...s,
        scale: {
          ...s.scale,
          deviceId: device.id,
          deviceName: device.name,
          model: reading.model,
        },
      }));
    }
    setSaved(true);
    haptic('success');
    toast('Pesata salvata');
    setTimeout(onDone, 700);
  };

  // Auto-save a fresh, stable reading.
  useEffect(() => {
    if (
      status === 'done' &&
      reading &&
      settings.autoSave &&
      !duplicate &&
      !saved
    )
      save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === 'permission-denied')
    return (
      <Problem
        icon="bluetooth"
        title="Permesso Bluetooth negato"
        text="Serve per leggere il peso dalla bilancia."
        action={{
          label: 'Apri Impostazioni',
          onPress: () => Linking.openSettings(),
        }}
      />
    );
  if (status === 'bluetooth-off')
    return (
      <Problem
        icon="bluetooth"
        title="Bluetooth spento"
        text="Accendi il Bluetooth per collegarti alla bilancia."
        action={{ label: 'Attiva Bluetooth', onPress: openBluetoothSettings }}
      />
    );
  if (status === 'unsupported')
    return (
      <Problem
        icon="bluetooth"
        title="Bluetooth LE non disponibile"
        text="Questo dispositivo non supporta il Bluetooth Low Energy."
      />
    );
  if (status === 'error')
    return (
      <Problem
        icon="info"
        title="Qualcosa non va"
        text="Non riesco ad avviare la ricerca della bilancia."
        action={{ label: 'Riprova', onPress: start }}
      />
    );

  const live = reading ? fmtNum(toDisplay(reading.weightKg, unit), 1) : '––,–';
  const done = status === 'done' && reading;
  return (
    <View style={styles.gap}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.halo,
            done && styles.hidden,
            {
              backgroundColor: c.accentSoft,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.05],
                  }),
                },
              ],
            },
          ]}
        />
        <T style={[numeric(64), { color: reading ? c.label : c.tertiary }]}>
          {live}
        </T>
        <T v="headline" color="secondary">
          {unit}
        </T>
      </View>
      <T v="subhead" color="secondary" align="center">
        {done
          ? duplicate
            ? 'Questa pesata è già stata salvata.'
            : `Rilevato da ${device?.name ?? 'bilancia'} (${
                SCALE_MODEL_LABEL[reading.model]
              })`
          : status === 'measuring'
          ? 'Resta fermo, sto stabilizzando…'
          : status === 'waiting'
          ? 'Attendo il Bluetooth…'
          : 'Sali sulla bilancia a piedi nudi'}
      </T>
      {slow && !reading ? (
        <T v="footnote" color="tertiary" align="center">
          Non trovo la bilancia: salici sopra per accenderla e tieni il telefono
          vicino.
          {Platform.OS === 'android' && Platform.Version < 31
            ? ' Su questa versione di Android serve anche la Localizzazione attiva.'
            : ''}
        </T>
      ) : null}
      {done && reading.model === 'mi-body-composition' && !reading.impedance ? (
        <T v="footnote" color="tertiary" align="center">
          Impedenza non ricevuta: per la composizione corporea sali a piedi nudi
          e resta fermo qualche secondo in più.
        </T>
      ) : null}
      {done && reading.impedance && !canCompose ? (
        <T v="footnote" color="tertiary" align="center">
          Inserisci sesso, data di nascita e altezza nel profilo per calcolare
          massa grassa e muscolare.
        </T>
      ) : null}
      {composition ? (
        <View style={[styles.comp, { backgroundColor: c.fill4 }]}>
          <Comp label="Grasso" value={`${fmtNum(composition.fatPct, 1)}%`} />
          <Comp
            label="Muscoli"
            value={`${fmtNum(composition.muscleKg, 1)} kg`}
          />
          <Comp label="Acqua" value={`${fmtNum(composition.waterPct, 1)}%`} />
        </View>
      ) : null}
      {done ? (
        saved ? (
          <View style={styles.savedRow}>
            <Icon name="check-circle" size={22} color={c.green} />
            <T v="headline">Salvata</T>
          </View>
        ) : (
          <View style={styles.gapS}>
            <Button
              title="Salva pesata"
              icon="check"
              onPress={save}
              disabled={duplicate}
            />
            <Button title="Ripeti" variant="glass" onPress={start} />
          </View>
        )
      ) : null}
    </View>
  );
}

function Comp({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compItem}>
      <T v="headline">{value}</T>
      <T v="caption" color="secondary">
        {label}
      </T>
    </View>
  );
}

function Problem({
  icon,
  title,
  text,
  action,
}: {
  icon: 'bluetooth' | 'info';
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.gap, styles.center]}>
      <Icon name={icon} size={36} color={c.secondary} />
      <T v="headline" align="center">
        {title}
      </T>
      <T v="subhead" color="secondary" align="center">
        {text}
      </T>
      {action ? (
        <Button
          title={action.label}
          variant="tinted"
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 18 },
  gap: { gap: 14 },
  gapS: { gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  hidden: { display: 'none' },
  halo: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  comp: { flexDirection: 'row', borderRadius: 18, padding: 12 },
  compItem: { flex: 1, alignItems: 'center' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
});
