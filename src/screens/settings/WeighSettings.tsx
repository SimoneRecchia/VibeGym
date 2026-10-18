import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Row, Section } from '../../ui/List';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { T } from '../../ui/Text';
import { IntervalUnit, Settings, WeighSchedule } from '../../core/types';
import {
  requestNotificationPermission,
  syncReminders,
} from '../../services/notifications';
import { fmtInterval, nextWeighDue } from '../../body/schedule';
import { fmtUpcomingDay } from '../../core/format';
import { TimeStepper } from './NotificationSettings';

const UNITS: { key: IntervalUnit; label: string }[] = [
  { key: 'day', label: 'Giorni' },
  { key: 'week', label: 'Settimane' },
  { key: 'month', label: 'Mesi' },
];
const MAX: Record<IntervalUnit, number> = { day: 30, week: 12, month: 12 };

export function WeighSettings() {
  const weigh = useStore(s => s.settings.weigh);
  const notif = useStore(s => s.settings.notifications.weighIn);
  const last = useStore(s => s.body[s.body.length - 1]?.date);
  const update = useStore(s => s.updateSettings);

  const commit = (fn: (s: Settings) => Settings) => {
    update(fn);
    const st = useStore.getState();
    syncReminders(st.settings, st.body[st.body.length - 1]?.date);
  };
  const setWeigh = (patch: Partial<WeighSchedule>) =>
    commit(s => ({ ...s, weigh: { ...s.weigh, ...patch } }));
  const setNotif = async (patch: Partial<typeof notif>) => {
    if (patch.enabled && !(await requestNotificationPermission())) {
      Alert.alert(
        'Notifiche disattivate',
        'Consenti le notifiche a VibeGym dalle impostazioni del telefono.',
      );
      return;
    }
    commit(s => ({
      ...s,
      notifications: {
        ...s.notifications,
        weighIn: { ...s.notifications.weighIn, ...patch },
      },
    }));
  };

  const due = nextWeighDue(last, weigh);

  return (
    <Screen title="Pesata" back>
      <Section footer="Il trend del peso compare in cima a Progressi e i promemoria seguono questo ritmo. Pesarsi alla stessa ora, al mattino, rende il trend più affidabile.">
        <Row
          title="Monitora il peso"
          toggle={{
            value: weigh.enabled,
            onChange: v => setWeigh({ enabled: v }),
          }}
        />
      </Section>

      {weigh.enabled ? (
        <>
          <Section
            title="Ogni quanto"
            footer={
              due
                ? `${fmtInterval(weigh)}: prossima pesata ${fmtUpcomingDay(
                    due,
                  )}.`
                : `${fmtInterval(weigh)}.`
            }
          >
            <View style={styles.pad}>
              <Stepper
                label="Ogni"
                value={weigh.every}
                onChange={v => setWeigh({ every: v })}
                step={1}
                min={1}
                max={MAX[weigh.unit]}
                size="m"
              />
              <View style={styles.gap} />
              <Segmented
                options={UNITS}
                value={weigh.unit}
                onChange={unit =>
                  setWeigh({ unit, every: Math.min(weigh.every, MAX[unit]) })
                }
              />
            </View>
          </Section>

          <Section title="Promemoria">
            <Row
              title="Avviso quando apri l'app"
              subtitle="Se la pesata è scaduta"
              toggle={{
                value: weigh.prompt,
                onChange: v => setWeigh({ prompt: v }),
              }}
            />
            <Row
              title="Notifica"
              subtitle="Il giorno della pesata, finché non ti pesi"
              toggle={{
                value: notif.enabled,
                onChange: v => setNotif({ enabled: v }),
              }}
            />
            {notif.enabled ? (
              <View style={styles.pad}>
                <TimeStepper
                  value={notif.time}
                  onChange={time => setNotif({ time })}
                />
              </View>
            ) : null}
          </Section>
        </>
      ) : (
        <T v="footnote" color="secondary" style={styles.note}>
          Puoi sempre registrare il peso dal profilo, anche senza un ritmo
          fisso.
        </T>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14 },
  gap: { height: 12 },
  note: { marginHorizontal: 16 },
});
