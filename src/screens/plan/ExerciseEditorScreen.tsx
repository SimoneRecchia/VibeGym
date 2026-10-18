import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDraft } from '../../data/draft';
import { useStore } from '../../data/store';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { Stepper } from '../../ui/Stepper';
import { TextField } from '../../ui/TextField';
import { Row, Section } from '../../ui/List';
import { Empty } from '../../ui/Empty';
import { ExerciseThumb } from '../../ui/ExerciseMedia';
import { Tap } from '../../ui/Pressable';
import { ops, findExercise } from './editorOps';
import { displayName, getCatalogExercise } from '../../catalog';
import { Exercise, ExerciseKind, SetValues } from '../../core/types';
import { uniformSets } from '../../plan/planUtils';
import { fmtClock } from '../../core/format';
import { fromDisplay, roundTo, toDisplay } from '../../core/units';
import { ScreenProps } from '../../navigation/types';

const KINDS: { key: ExerciseKind; label: string }[] = [
  { key: 'reps', label: 'Ripetizioni' },
  { key: 'time', label: 'Tempo' },
  { key: 'cardio', label: 'Cardio' },
];

const convertSets = (ex: Exercise, kind: ExerciseKind): SetValues[] => {
  if (kind === 'cardio') return [{ sec: 15 * 60 }];
  const n = ex.kind === 'cardio' ? 3 : ex.sets.length;
  return Array.from({ length: n }, (_, i) => {
    const s = ex.sets[i] ?? ex.sets[ex.sets.length - 1] ?? {};
    return kind === 'reps'
      ? { reps: s.reps ?? 10, kg: s.kg ?? 0 }
      : { sec: s.sec && s.sec < 600 ? s.sec : 30, kg: s.kg ?? 0 };
  });
};

export function ExerciseEditorScreen({
  route,
  navigation,
}: ScreenProps<'ExerciseEditor'>) {
  const { dayId, blockId, exerciseId } = route.params;
  const plan = useDraft(s => s.editing);
  const unit = useStore(s => s.settings.unit);
  const stepKg = useStore(s => s.settings.loadStepKg);
  const found = plan ? findExercise(plan, dayId, blockId, exerciseId) : null;
  const ex = found?.ex;
  const [perSet, setPerSet] = React.useState(() =>
    ex ? !uniformSets(ex.sets) : false,
  );

  if (!ex || !found?.block) {
    return (
      <Screen title="Esercizio" back>
        <Empty icon="dumbbell" title="Esercizio non trovato" />
      </Screen>
    );
  }

  const inSuperset = found.block.exercises.length > 1;
  const isLastInSuperset =
    inSuperset && found.ei === found.block.exercises.length - 1;
  const update = (fn: (e: Exercise) => void) =>
    ops.updateExercise(dayId, blockId, exerciseId, fn);
  const cat = getCatalogExercise(ex.catalogId);
  const loadStep = unit === 'lb' ? 5 : stepKg;

  const setCount = (n: number) =>
    update(e => {
      if (n > e.sets.length) {
        const last = e.sets[e.sets.length - 1] ?? {};
        while (e.sets.length < n) e.sets.push({ ...last });
      } else e.sets.length = Math.max(1, n);
    });

  const setAll = (patch: Partial<SetValues>) =>
    update(e => e.sets.forEach(s => Object.assign(s, patch)));
  const setOne = (i: number, patch: Partial<SetValues>) =>
    update(e => Object.assign(e.sets[i], patch));

  const kgIn = (kg?: number) => Math.round(toDisplay(kg ?? 0, unit) * 10) / 10;
  const kgOut = (v: number) => roundTo(fromDisplay(v, unit), 0.05);

  const valueEditors = (
    s: SetValues,
    apply: (p: Partial<SetValues>) => void,
  ) => {
    if (ex.kind === 'cardio') {
      return (
        <>
          <Stepper
            label="Durata"
            value={s.sec ?? 0}
            onChange={v => apply({ sec: v })}
            step={60}
            max={6 * 3600}
            size="m"
            format={v => fmtClock(v)}
          />
          <View style={styles.gap} />
          <Stepper
            label="Distanza (facoltativa)"
            value={s.km ?? 0}
            onChange={v => apply({ km: v || undefined })}
            step={0.1}
            max={300}
            decimals={2}
            unit="km"
            size="m"
          />
        </>
      );
    }
    return (
      <>
        {ex.kind === 'reps' ? (
          <Stepper
            label="Ripetizioni"
            value={s.reps ?? 0}
            onChange={v => apply({ reps: v })}
            step={1}
            min={1}
            max={500}
            decimals={0}
            size="m"
          />
        ) : (
          <Stepper
            label="Durata"
            value={s.sec ?? 0}
            onChange={v => apply({ sec: v })}
            step={5}
            min={1}
            max={3600}
            decimals={0}
            unit="s"
            size="m"
          />
        )}
        <View style={styles.gap} />
        <Stepper
          label={
            ex.kind === 'reps'
              ? `Carico (${unit}) · 0 = corpo libero`
              : `Zavorra (${unit})`
          }
          value={kgIn(s.kg)}
          onChange={v => apply({ kg: kgOut(v) })}
          step={loadStep}
          max={1000}
          decimals={2}
          unit={unit}
          size="m"
        />
      </>
    );
  };

  return (
    <Screen title={ex.name || 'Esercizio'} back keyboard>
      <TextField
        label="Nome"
        value={ex.name}
        onChangeText={t =>
          update(e => {
            e.name = t;
          })
        }
        placeholder="Nome dell'esercizio"
      />

      <Section title="Animazione">
        <Tap
          onPress={() => {
            useDraft.setState({
              onPick: r =>
                update(e => {
                  const oldCat = getCatalogExercise(e.catalogId);
                  if (
                    !e.name.trim() ||
                    (oldCat && e.name === displayName(oldCat))
                  )
                    e.name = r.name;
                  e.catalogId = r.catalogId;
                }),
            });
            navigation.navigate('ExercisePicker', {
              title: 'Collega esercizio',
              cardio: ex.kind === 'cardio',
            });
          }}
          scaleTo={0.99}
        >
          <View style={styles.catRow}>
            <ExerciseThumb catalogId={ex.catalogId} kind={ex.kind} size={44} />
            <View style={styles.flex}>
              <T v="body">{cat ? displayName(cat) : 'Nessuna animazione'}</T>
              <T v="footnote" color="secondary">
                {cat ? cat.name : 'Tocca per scegliere dal catalogo'}
              </T>
            </View>
            <T v="body" color="accent">
              {cat ? 'Cambia' : 'Scegli'}
            </T>
          </View>
        </Tap>
        {cat ? (
          <Row
            title="Scollega animazione"
            destructive
            onPress={() =>
              update(e => {
                e.catalogId = undefined;
              })
            }
          />
        ) : null}
      </Section>

      <View style={styles.block}>
        <Segmented
          options={KINDS}
          value={ex.kind}
          onChange={k =>
            update(e => {
              e.sets = convertSets(e, k);
              e.kind = k;
              if (k === 'cardio') e.restSec = 0;
              else if (!e.restSec && !inSuperset) e.restSec = 90;
            })
          }
        />
      </View>

      {ex.kind !== 'cardio' ? (
        <Card style={styles.block}>
          <Stepper
            label="Serie"
            value={ex.sets.length}
            onChange={setCount}
            step={1}
            min={1}
            max={20}
            decimals={0}
            size="m"
          />
        </Card>
      ) : null}

      {ex.kind !== 'cardio' && ex.sets.length > 1 ? (
        <Section footer="Disattiva per una piramidale: valori diversi per ogni serie.">
          <Row
            title="Stessi valori per tutte le serie"
            toggle={{ value: !perSet, onChange: v => setPerSet(!v) }}
          />
        </Section>
      ) : null}

      {perSet && ex.kind !== 'cardio' ? (
        ex.sets.map((s, i) => (
          <Card key={i} style={styles.block}>
            <T v="footnoteStrong" color="secondary" style={styles.setLabel}>
              SERIE {i + 1}
            </T>
            {valueEditors(s, p => setOne(i, p))}
          </Card>
        ))
      ) : (
        <Card style={styles.block}>
          {valueEditors(ex.sets[0] ?? {}, setAll)}
        </Card>
      )}

      {ex.kind === 'reps' ? (
        <Section>
          <Row
            title="A cedimento"
            subtitle="Le ripetizioni sono indicative: fai il massimo"
            toggle={{
              value: !!ex.toFailure,
              onChange: v =>
                update(e => {
                  e.toFailure = v || undefined;
                }),
            }}
          />
        </Section>
      ) : null}

      {ex.kind !== 'cardio' ? (
        <Card style={styles.block}>
          <Stepper
            label={
              inSuperset
                ? isLastInSuperset
                  ? 'Recupero dopo il giro'
                  : 'Pausa prima del prossimo esercizio'
                : 'Recupero tra le serie'
            }
            value={ex.restSec}
            onChange={v =>
              update(e => {
                e.restSec = v;
              })
            }
            step={15}
            min={0}
            max={900}
            size="m"
            format={v => (v ? fmtClock(v) : 'Nessuno')}
          />
        </Card>
      ) : null}

      <TextField
        label="Note"
        value={ex.notes ?? ''}
        onChangeText={t =>
          update(e => {
            e.notes = t || undefined;
          })
        }
        placeholder="Tecnica, tempo, varianti…"
        multiline
      />

      <Button
        title="Elimina esercizio"
        variant="destructive"
        icon="trash"
        onPress={() => {
          navigation.goBack();
          ops.deleteExercise(dayId, blockId, exerciseId);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  flex: { flex: 1, minWidth: 0 },
  gap: { height: 14 },
  setLabel: { marginBottom: 8 },
});
