/**
 * The set you are about to do, front and centre: which one it is, the
 * target, last time's numbers and the values to adjust with − / + right
 * here, without opening anything. The big button below logs it.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DisplayUnit, LoggedSet, SessionExercise } from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../../ui/Text';
import { Stepper } from '../../ui/Stepper';
import { fmtClock, fmtNum } from '../../core/format';
import { fmtLoadValue, toDisplay } from '../../core/units';
import { EditField } from './SetTable';

interface Props {
  ex: SessionExercise;
  si: number;
  unit: DisplayUnit;
  stepKg: number;
  previous?: LoggedSet;
  /** New value in display units (kg/lb, reps, seconds, km). */
  onChange: (field: EditField, value: number) => void;
}

const targetText = (ex: SessionExercise, si: number): string | null => {
  const t = ex.target[si] ?? ex.target[0];
  if (!t) return null;
  if (ex.kind === 'reps' && t.reps)
    return `${t.reps}${ex.toFailure ? '+' : ''} rip.`;
  if (ex.kind === 'time' && t.sec) return `${t.sec} s`;
  return null;
};

const prevText = (
  ex: SessionExercise,
  s: LoggedSet | undefined,
  unit: DisplayUnit,
) => {
  if (!s?.done) return null;
  if (ex.kind === 'reps')
    return `${s.kg ? `${fmtLoadValue(s.kg, unit)} ${unit} × ` : ''}${
      s.reps ?? 0
    }`;
  if (ex.kind === 'time')
    return `${s.sec ?? 0} s${
      s.kg ? ` con ${fmtLoadValue(s.kg, unit)} ${unit}` : ''
    }`;
  return `${fmtClock(s.sec ?? 0)}${s.km ? ` · ${fmtNum(s.km, 2)} km` : ''}`;
};

export function SetFocus({ ex, si, unit, stepKg, previous, onChange }: Props) {
  const { c } = useTheme();
  const set = ex.sets[si];
  const target = targetText(ex, si);
  const prev = prevText(ex, previous, unit);
  const weighted =
    ex.kind === 'reps' ||
    (ex.kind === 'time' &&
      (ex.sets.some(s => (s.kg ?? 0) > 0) ||
        ex.target.some(t => (t.kg ?? 0) > 0)));
  const step = unit === 'lb' ? 5 : stepKg;
  const kg = Math.round(toDisplay(set.kg ?? 0, unit) * 100) / 100;

  return (
    <View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.accent }]}
    >
      <View style={styles.head}>
        <T v="footnoteStrong" color="accent">
          SERIE {si + 1} DI {ex.sets.length}
        </T>
        {target ? (
          <T v="footnoteStrong" color="secondary">
            Obiettivo {target}
          </T>
        ) : null}
      </View>
      {prev ? (
        <T v="footnote" color="tertiary" style={styles.prev}>
          Ultima volta: {prev}
        </T>
      ) : null}

      {weighted ? (
        <Field label="Peso" hint={unit}>
          <Stepper
            size="m"
            value={kg}
            onChange={v => onChange('kg', v)}
            step={step}
            max={1000}
            decimals={2}
          />
        </Field>
      ) : null}
      {ex.kind === 'reps' ? (
        <Field label="Ripetizioni">
          <Stepper
            size="m"
            value={set.reps ?? 0}
            onChange={v => onChange('reps', v)}
            step={1}
            max={500}
            decimals={0}
          />
        </Field>
      ) : null}
      {ex.kind === 'time' ? (
        <Field label="Durata" hint="secondi">
          <Stepper
            size="m"
            value={set.sec ?? 0}
            onChange={v => onChange('sec', v)}
            step={5}
            min={1}
            max={3600}
            decimals={0}
          />
        </Field>
      ) : null}
      {ex.kind === 'cardio' ? (
        <>
          <Field label="Durata">
            <Stepper
              size="m"
              value={set.sec ?? 0}
              onChange={v => onChange('sec', v)}
              step={60}
              max={6 * 3600}
              format={v => fmtClock(v)}
            />
          </Field>
          <Field label="Distanza" hint="km">
            <Stepper
              size="m"
              value={set.km ?? 0}
              onChange={v => onChange('km', v)}
              step={0.1}
              max={300}
              decimals={2}
            />
          </Field>
        </>
      ) : null}
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <T v="headline">{label}</T>
        {hint ? (
          <T v="footnote" color="secondary">
            {hint}
          </T>
        ) : null}
      </View>
      <View style={styles.fieldInput}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    marginBottom: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prev: { marginTop: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  fieldLabel: { flex: 1, minWidth: 0 },
  fieldInput: { width: 196 },
});
