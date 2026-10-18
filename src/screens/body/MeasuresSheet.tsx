import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Sheet } from '../../ui/Sheet';
import { Stepper } from '../../ui/Stepper';
import { Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { useTheme } from '../../theme/ThemeProvider';
import { useStore } from '../../data/store';
import { MEASURE_KEYS, MEASURE_LABEL } from '../../stats/body';
import { MeasureKey } from '../../core/types';

const DEFAULTS: Record<MeasureKey, number> = {
  waist: 80,
  chest: 95,
  hips: 95,
  arm: 33,
  thigh: 55,
  calf: 37,
  neck: 38,
};

/** Monthly circumferences (cm). Prefilled with the last values: change only what moved. */
export function MeasuresSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const measures = useStore(s => s.measures);
  const addMeasure = useStore(s => s.addMeasure);
  const [values, setValues] = useState<Record<MeasureKey, number>>(DEFAULTS);
  const [touched, setTouched] = useState<Set<MeasureKey>>(new Set());

  useEffect(() => {
    if (!visible) return;
    const last: Partial<Record<MeasureKey, number>> = {};
    for (const m of measures)
      for (const k of MEASURE_KEYS)
        if (m.values[k] != null) last[k] = m.values[k];
    setValues({ ...DEFAULTS, ...last });
    setTouched(new Set(MEASURE_KEYS.filter(k => last[k] != null)));
  }, [visible, measures]);

  const save = () => {
    const out: Partial<Record<MeasureKey, number>> = {};
    touched.forEach(k => (out[k] = values[k]));
    if (!Object.keys(out).length) return onClose();
    addMeasure(out);
    toast('Misure salvate');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Misure"
      subtitle="Centimetri, con il metro morbido"
      scroll
      action={<Button title="Salva" size="s" variant="tinted" onPress={save} />}
    >
      <T v="footnote" color="secondary" style={styles.tip}>
        Misura sempre nello stesso punto e alla stessa ora. Vengono salvate solo
        le misure che modifichi o che avevi già.
      </T>
      {MEASURE_KEYS.map(k => (
        <View
          key={k}
          style={[
            styles.row,
            { backgroundColor: c.fill4 },
            !touched.has(k) && styles.untouched,
          ]}
        >
          <Stepper
            label={MEASURE_LABEL[k]}
            value={values[k]}
            onChange={v => {
              setValues(s => ({ ...s, [k]: v }));
              setTouched(t => new Set(t).add(k));
            }}
            step={0.5}
            min={10}
            max={250}
            decimals={1}
            unit="cm"
            size="m"
          />
        </View>
      ))}
      <Button
        title="Salva misure"
        icon="check"
        onPress={save}
        style={styles.save}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tip: { marginBottom: 12 },
  row: { borderRadius: 20, padding: 12, marginBottom: 8 },
  save: { marginTop: 8 },
  untouched: { opacity: 0.65 },
});
