import React from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useDraft } from '../../data/draft';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button, IconButton } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Empty } from '../../ui/Empty';
import { showMenu } from '../../ui/Menu';
import { toast } from '../../ui/Toast';
import { ExerciseRow } from '../components/ExerciseRow';
import { DayBadge } from '../components/DayBadge';
import { ops, editDraft } from './editorOps';
import { getCatalogExercise } from '../../catalog';
import { newExercise } from '../../plan/planUtils';
import { ScreenProps } from '../../navigation/types';

export function PlanEditorScreen({ navigation }: ScreenProps<'PlanEditor'>) {
  const { c } = useTheme();
  const plan = useDraft(s => s.editing);
  const exists = useStore(s => !!plan && s.plans.some(p => p.id === plan.id));
  const addPlan = useStore(s => s.addPlan);
  const savePlan = useStore(s => s.savePlan);
  const completeOnboarding = useStore(s => s.completeOnboarding);

  if (!plan) {
    return (
      <Screen title="Modifica scheda" back>
        <Empty icon="pencil" title="Niente da modificare" />
      </Screen>
    );
  }

  const save = () => {
    const empty = plan.days.filter(d => !d.blocks.length);
    if (!plan.days.length || empty.length === plan.days.length) {
      Alert.alert('Scheda vuota', 'Aggiungi almeno un esercizio.');
      return;
    }
    if (exists) savePlan(plan);
    else addPlan({ ...plan, updatedAt: new Date().toISOString() });
    completeOnboarding();
    useDraft.setState({ editing: null });
    toast('Scheda salvata');
    navigation.popToTop();
  };

  const cancel = () =>
    Alert.alert('Annullare le modifiche?', undefined, [
      { text: 'Continua a modificare', style: 'cancel' },
      {
        text: 'Annulla modifiche',
        style: 'destructive',
        onPress: () => {
          useDraft.setState({ editing: null });
          navigation.goBack();
        },
      },
    ]);

  const pickAndAdd = (dayId: string) => {
    useDraft.setState({
      onPick: r => {
        const cat = getCatalogExercise(r.catalogId);
        ops.addExercise(
          dayId,
          newExercise(
            r.name,
            r.catalogId,
            cat?.category === 'cardio' ? 'cardio' : 'reps',
          ),
        );
      },
    });
    navigation.navigate('ExercisePicker', { title: 'Aggiungi esercizio' });
  };

  const dayMenu = (dayId: string, index: number) =>
    showMenu({
      options: [
        ...(index > 0
          ? [{ label: 'Sposta su', onPress: () => ops.moveDay(dayId, -1) }]
          : []),
        ...(index < plan.days.length - 1
          ? [{ label: 'Sposta giù', onPress: () => ops.moveDay(dayId, 1) }]
          : []),
        { label: 'Duplica giorno', onPress: () => ops.duplicateDay(dayId) },
        {
          label: 'Elimina giorno',
          destructive: true,
          onPress: () => ops.deleteDay(dayId),
        },
      ],
    });

  const exerciseMenu = (
    dayId: string,
    blockId: string,
    exerciseId: string,
    bi: number,
    blocks: number,
    inSuperset: boolean,
  ) =>
    showMenu({
      options: [
        ...(bi > 0
          ? [
              {
                label: 'Sposta su',
                onPress: () => ops.moveBlock(dayId, blockId, -1),
              },
            ]
          : []),
        ...(bi < blocks - 1
          ? [
              {
                label: 'Sposta giù',
                onPress: () => ops.moveBlock(dayId, blockId, 1),
              },
            ]
          : []),
        ...(bi > 0 && !inSuperset
          ? [
              {
                label: 'Unisci al precedente (superset)',
                onPress: () => ops.mergeWithPrevious(dayId, blockId),
              },
            ]
          : []),
        ...(inSuperset
          ? [
              {
                label: 'Separa dal superset',
                onPress: () =>
                  ops.splitFromSuperset(dayId, blockId, exerciseId),
              },
            ]
          : []),
        {
          label: 'Duplica',
          onPress: () => ops.duplicateExercise(dayId, blockId, exerciseId),
        },
        {
          label: 'Elimina',
          destructive: true,
          onPress: () => ops.deleteExercise(dayId, blockId, exerciseId),
        },
      ],
    });

  return (
    <Screen
      title={exists ? 'Modifica scheda' : 'Nuova scheda'}
      close={cancel}
      keyboard
      right={<Button title="Salva" size="m" variant="tinted" onPress={save} />}
    >
      <TextField
        label="Nome della scheda"
        value={plan.name}
        onChangeText={t =>
          editDraft(p => {
            p.name = t;
          })
        }
        placeholder="Es. Push Pull Legs"
      />

      {plan.days.map((d, di) => (
        <Card key={d.id} style={styles.day}>
          <View style={styles.dayHead}>
            <DayBadge index={di} size={36} />
            <TextInput
              value={d.name}
              onChangeText={t => ops.renameDay(d.id, t)}
              style={[styles.dayName, { color: c.label }]}
              placeholder="Nome del giorno"
              placeholderTextColor={c.tertiary}
            />
            <IconButton
              plain
              icon="ellipsis"
              size={36}
              onPress={() => dayMenu(d.id, di)}
              accessibilityLabel="Opzioni giorno"
            />
          </View>

          {d.blocks.map((b, bi) => (
            <View
              key={b.id}
              style={
                b.exercises.length > 1
                  ? [styles.superset, { borderColor: c.accent }]
                  : undefined
              }
            >
              {b.exercises.length > 1 ? (
                <T
                  v="caption2"
                  color="accent"
                  weight="700"
                  style={styles.ssLabel}
                >
                  SUPERSET
                </T>
              ) : null}
              {b.exercises.map(ex => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  showRest={b.exercises.length === 1}
                  onPress={() =>
                    navigation.navigate('ExerciseEditor', {
                      dayId: d.id,
                      blockId: b.id,
                      exerciseId: ex.id,
                    })
                  }
                  right={
                    <IconButton
                      plain
                      icon="ellipsis"
                      size={34}
                      onPress={() =>
                        exerciseMenu(
                          d.id,
                          b.id,
                          ex.id,
                          bi,
                          d.blocks.length,
                          b.exercises.length > 1,
                        )
                      }
                      accessibilityLabel={`Opzioni ${ex.name}`}
                    />
                  }
                />
              ))}
            </View>
          ))}
          <Button
            title="Aggiungi esercizio"
            icon="plus"
            size="m"
            variant="tinted"
            onPress={() => pickAndAdd(d.id)}
            style={styles.add}
          />
        </Card>
      ))}

      <Button
        title="Aggiungi giorno"
        icon="plus"
        variant="glass"
        onPress={ops.addDay}
      />
      <T v="footnote" color="secondary" align="center" style={styles.tip}>
        Tocca un esercizio per modificarne serie, ripetizioni, carico e
        recupero. Dal menu «…» puoi unirlo al precedente per creare un superset.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { marginBottom: 14 },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  dayName: { flex: 1, fontSize: 17, fontWeight: '600', paddingVertical: 6 },
  superset: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 4,
    borderRadius: 2,
  },
  ssLabel: { marginTop: 4 },
  add: { marginTop: 8, alignSelf: 'flex-start' },
  tip: { marginTop: 16, paddingHorizontal: 12 },
});
