/**
 * "Time to weigh in": shown when the app opens (or comes back after a while)
 * and the scheduled weigh-in is due. Closable; "don't show again" turns the
 * prompt off (it can be re-enabled in Pesata settings).
 */
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Sheet } from '../../ui/Sheet';
import { Button } from '../../ui/Button';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import { T } from '../../ui/Text';
import { WeighSheet } from './WeighSheet';
import { fmtInterval, isWeighDue } from '../../body/schedule';
import { fmtRelativeDay } from '../../core/format';

/** Back in the app after this long counts as opening it again. */
const REOPEN_MS = 15 * 60_000;

const shouldPrompt = () => {
  const s = useStore.getState();
  const w = s.settings.weigh;
  return (
    s.onboarded &&
    w.enabled &&
    w.prompt &&
    !s.workout &&
    isWeighDue(s.body[s.body.length - 1]?.date, w)
  );
};

export function WeighPrompt() {
  const { c } = useTheme();
  const weigh = useStore(s => s.settings.weigh);
  const last = useStore(s => s.body[s.body.length - 1]?.date);
  const hasScale = useStore(s => !!s.settings.scale.deviceId);
  const update = useStore(s => s.updateSettings);
  const [open, setOpen] = useState(false);
  const [weighing, setWeighing] = useState(false);
  const [never, setNever] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => shouldPrompt() && setOpen(true), 900);
    let leftAt = 0;
    const sub = AppState.addEventListener('change', st => {
      if (st === 'background') leftAt = Date.now();
      else if (st === 'active' && leftAt && Date.now() - leftAt > REOPEN_MS) {
        leftAt = 0;
        if (shouldPrompt()) {
          setNever(false);
          setOpen(true);
        }
      }
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (never) update(s => ({ ...s, weigh: { ...s.weigh, prompt: false } }));
  };

  return (
    <>
      <Sheet
        visible={open}
        onClose={close}
        title="È ora di pesarti"
        subtitle={
          last
            ? `Ultima pesata ${fmtRelativeDay(last)} · ${fmtInterval(
                weigh,
              ).toLowerCase()}`
            : 'Non hai ancora registrato il peso'
        }
      >
        <View style={styles.body}>
          <Button
            title={hasScale ? 'Pesati con la bilancia' : 'Pesati ora'}
            icon={hasScale ? 'bluetooth' : 'scale'}
            onPress={() => {
              close();
              setWeighing(true);
            }}
          />
          <Button title="Più tardi" variant="plain" onPress={close} />
          <Tap
            onPress={() => setNever(v => !v)}
            style={styles.never}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: never }}
          >
            <View style={styles.neverRow}>
              <Icon
                name={never ? 'check-circle' : 'circle'}
                size={22}
                color={never ? c.accent : c.tertiary}
              />
              <T v="subhead" color="secondary">
                Non mostrarlo più
              </T>
            </View>
          </Tap>
        </View>
      </Sheet>
      <WeighSheet visible={weighing} onClose={() => setWeighing(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8, paddingTop: 4 },
  never: { alignSelf: 'center', marginTop: 4 },
  neverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 },
});
