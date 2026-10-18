import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Sheet } from '../../ui/Sheet';
import { Stepper } from '../../ui/Stepper';
import { Button } from '../../ui/Button';
import { T } from '../../ui/Text';
import { Chip } from '../../ui/Chip';
import { useTheme } from '../../theme/ThemeProvider';
import { LoggedSet, SessionExercise, DisplayUnit } from '../../core/types';
import { fromDisplay, roundTo, toDisplay } from '../../core/units';
import { fmtClock, fmtNum } from '../../core/format';
import { EditField } from './SetTable';

interface Props {
  visible: boolean;
  ex: SessionExercise | null;
  si: number;
  field: EditField;
  unit: DisplayUnit;
  stepKg: number;
  onClose: () => void;
  onSave: (patch: Partial<LoggedSet>, propagate: boolean) => void;
}

/** Edit the values of one set. Load changes can carry to the next sets. */
export function SetEditSheet({
  visible,
  ex,
  si,
  field,
  unit,
  stepKg,
  onClose,
  onSave,
}: Props) {
  const { c } = useTheme();
  const set = ex?.sets[si];
  const setRef = useRef(set);
  setRef.current = set;
  const initial = useRef({ kg: 0, reps: 0, sec: 0, km: 0 });
  const [kg, setKg] = useState(0);
  const [reps, setReps] = useState(0);
  const [sec, setSec] = useState(0);
  const [km, setKm] = useState(0);
  const [propagate, setPropagate] = useState(true);

  // Initialise once per opening: the workout object is rebuilt on every
  // update (e.g. a timed set ending), which must not wipe what you typed.
  useEffect(() => {
    const cur = setRef.current;
    if (!visible || !cur) return;
    const init = {
      kg: Math.round(toDisplay(cur.kg ?? 0, unit) * 100) / 100,
      reps: cur.reps ?? 0,
      sec: cur.sec ?? 0,
      km: cur.km ?? 0,
    };
    initial.current = init;
    setKg(init.kg);
    setReps(init.reps);
    setSec(init.sec);
    setKm(init.km);
    // Loads usually stay the same for the next sets; reps usually don't.
    setPropagate(field === 'kg');
  }, [visible, si, unit, field]);

  if (!ex || !set) return null;
  const step = unit === 'lb' ? 5 : stepKg;
  const remaining = ex.sets.slice(si + 1).filter(s => !s.done).length;

  /** Only the values you actually changed are saved (and carried over). */
  const save = () => {
    const init = initial.current;
    const changed = (a: number, b: number) => Math.abs(a - b) > 1e-9;
    const patch: Partial<LoggedSet> = {};
    if (ex.kind !== 'cardio' && changed(kg, init.kg)) {
      patch.kg = roundTo(fromDisplay(kg, unit), 0.01);
    }
    if (ex.kind === 'reps' && changed(reps, init.reps)) {
      patch.reps = Math.round(reps);
    }
    if (ex.kind !== 'reps' && changed(sec, init.sec)) {
      patch.sec = Math.round(sec);
    }
    if (ex.kind === 'cardio' && changed(km, init.km)) {
      patch.km = km || undefined;
    }
    onSave(patch, propagate && remaining > 0);
  };

  const quick = [-step * 2, -step, step, step * 2];
  const showKg =
    ex.kind !== 'cardio' &&
    (ex.kind === 'reps' || field === 'kg' || (set.kg ?? 0) > 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={ex.name}
      subtitle={`Serie ${si + 1} di ${ex.sets.length}`}
    >
      <View style={styles.body}>
        {showKg ? (
          <View style={[styles.block, { backgroundColor: c.fill4 }]}>
            <Stepper
              label={`Carico (${unit})`}
              value={kg}
              onChange={setKg}
              step={step}
              max={1000}
              decimals={2}
              unit={unit}
            />
            <View style={styles.quick}>
              {quick.map(d => (
                <Chip
                  key={d}
                  label={`${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d), 2)}`}
                  onPress={() =>
                    setKg(v => Math.max(0, Math.round((v + d) * 100) / 100))
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
        {ex.kind === 'reps' ? (
          <View style={[styles.block, { backgroundColor: c.fill4 }]}>
            <Stepper
              label="Ripetizioni"
              value={reps}
              onChange={setReps}
              step={1}
              max={500}
              decimals={0}
            />
          </View>
        ) : null}
        {ex.kind === 'time' ? (
          <View style={[styles.block, { backgroundColor: c.fill4 }]}>
            <Stepper
              label="Durata"
              value={sec}
              onChange={setSec}
              step={5}
              min={1}
              max={3600}
              decimals={0}
              unit="s"
            />
          </View>
        ) : null}
        {ex.kind === 'cardio' ? (
          <>
            <View style={[styles.block, { backgroundColor: c.fill4 }]}>
              <Stepper
                label="Durata"
                value={sec}
                onChange={setSec}
                step={60}
                min={0}
                max={6 * 3600}
                format={v => fmtClock(v)}
              />
            </View>
            <View style={[styles.block, { backgroundColor: c.fill4 }]}>
              <Stepper
                label="Distanza"
                value={km}
                onChange={setKm}
                step={0.1}
                max={300}
                decimals={2}
                unit="km"
              />
            </View>
          </>
        ) : null}
        {remaining > 0 && ex.kind !== 'cardio' ? (
          <View style={styles.toggle}>
            <T v="body" style={styles.flex}>
              Applica alle serie successive
            </T>
            <Switch
              value={propagate}
              onValueChange={setPropagate}
              trackColor={{ true: c.green, false: c.fill }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={c.fill}
            />
          </View>
        ) : null}
        <Button title="Salva" icon="check" onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  block: { borderRadius: 24, padding: 14 },
  quick: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  flex: { flex: 1 },
});
