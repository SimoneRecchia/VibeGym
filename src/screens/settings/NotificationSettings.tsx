import React, { useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { Stepper } from '../../ui/Stepper';
import { Segmented } from '../../ui/Segmented';
import { Chip } from '../../ui/Chip';
import { Settings } from '../../core/types';
import {
  exactAlarmsAllowed,
  openExactAlarmSettings,
  requestNotificationPermission,
  syncReminders,
} from '../../services/notifications';
import { WEEKDAYS_SHORT } from '../../core/format';
import { parseHM } from '../../core/dates';

type N = Settings['notifications'];

const toMin = (hm: string) => {
  const { h, m } = parseHM(hm);
  return h * 60 + m;
};
const toHM = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(
    min % 60,
  ).padStart(2, '0')}`;
/** Monday-first order for the weekday chips (JS getDay numbering). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function TimeStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Stepper
      label="Ora"
      value={toMin(value)}
      onChange={v => onChange(toHM(v))}
      step={15}
      min={0}
      max={23 * 60 + 45}
      size="m"
      format={toHM}
    />
  );
}

export function NotificationSettings() {
  const n = useStore(s => s.settings.notifications);
  const update = useStore(s => s.updateSettings);

  const [exactOk, setExactOk] = useState(true);
  useEffect(() => {
    const check = () => exactAlarmsAllowed().then(setExactOk);
    check();
    // Re-check when coming back from the system settings.
    const sub = AppState.addEventListener(
      'change',
      st => st === 'active' && check(),
    );
    return () => sub.remove();
  }, []);

  const apply = async (next: N, enabling: boolean) => {
    if (enabling && !(await requestNotificationPermission())) {
      Alert.alert(
        'Notifiche disattivate',
        'Consenti le notifiche a VibeGym dalle impostazioni del telefono.',
      );
      return;
    }
    update(s => ({ ...s, notifications: next }));
    syncReminders(next);
  };

  return (
    <Screen title="Notifiche" back>
      <Section footer="Se blocchi il telefono durante il recupero, ti avvisa quando è ora della serie successiva.">
        <Row
          title="Fine recupero"
          toggle={{
            value: n.restEnd,
            onChange: v => apply({ ...n, restEnd: v }, v),
          }}
        />
        {n.restEnd && !exactOk ? (
          <Row
            title="Rendi il timer puntuale"
            subtitle="Consenti «Sveglie e promemoria»: senza, Android può ritardare l'avviso"
            chevron
            onPress={openExactAlarmSettings}
          />
        ) : null}
      </Section>

      <Section title="Promemoria allenamento">
        <Row
          title="Ricordami di allenarmi"
          toggle={{
            value: n.workout.enabled,
            onChange: v =>
              apply({ ...n, workout: { ...n.workout, enabled: v } }, v),
          }}
        />
        {n.workout.enabled ? (
          <View style={styles.pad}>
            <View style={styles.chips}>
              {WEEK.map(d => {
                const on = n.workout.weekdays.includes(d);
                return (
                  <Chip
                    key={d}
                    label={WEEKDAYS_SHORT[d]}
                    selected={on}
                    onPress={() => {
                      const weekdays = on
                        ? n.workout.weekdays.filter(x => x !== d)
                        : [...n.workout.weekdays, d];
                      apply(
                        { ...n, workout: { ...n.workout, weekdays } },
                        false,
                      );
                    }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}
        {n.workout.enabled ? (
          <View style={styles.pad}>
            <TimeStepper
              value={n.workout.time}
              onChange={time =>
                apply({ ...n, workout: { ...n.workout, time } }, false)
              }
            />
          </View>
        ) : null}
      </Section>

      <Section
        title="Pesata"
        footer="Pesarsi spesso, al mattino, rende la media mobile più affidabile."
      >
        <Row
          title="Ricordami di pesarmi"
          toggle={{
            value: n.weighIn.enabled,
            onChange: v =>
              apply({ ...n, weighIn: { ...n.weighIn, enabled: v } }, v),
          }}
        />
        {n.weighIn.enabled ? (
          <View style={styles.pad}>
            <Segmented
              options={[
                { key: 'daily', label: 'Ogni giorno' },
                { key: 'weekly', label: 'Ogni settimana' },
              ]}
              value={n.weighIn.frequency}
              onChange={frequency =>
                apply({ ...n, weighIn: { ...n.weighIn, frequency } }, false)
              }
            />
          </View>
        ) : null}
        {n.weighIn.enabled && n.weighIn.frequency === 'weekly' ? (
          <View style={[styles.pad, styles.chips]}>
            {WEEK.map(d => (
              <Chip
                key={d}
                label={WEEKDAYS_SHORT[d]}
                selected={n.weighIn.weekday === d}
                onPress={() =>
                  apply({ ...n, weighIn: { ...n.weighIn, weekday: d } }, false)
                }
              />
            ))}
          </View>
        ) : null}
        {n.weighIn.enabled ? (
          <View style={styles.pad}>
            <TimeStepper
              value={n.weighIn.time}
              onChange={time =>
                apply({ ...n, weighIn: { ...n.weighIn, time } }, false)
              }
            />
          </View>
        ) : null}
      </Section>

      <Section title="Misure" footer="Il primo giorno di ogni mese.">
        <Row
          title="Ricordami di prendere le misure"
          toggle={{
            value: n.measures.enabled,
            onChange: v =>
              apply({ ...n, measures: { ...n.measures, enabled: v } }, v),
          }}
        />
        {n.measures.enabled ? (
          <View style={styles.pad}>
            <TimeStepper
              value={n.measures.time}
              onChange={time =>
                apply({ ...n, measures: { ...n.measures, time } }, false)
              }
            />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
});
