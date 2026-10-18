/**
 * One page of the workout pager = one block (single exercise or superset).
 */
import React, { memo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActiveWorkout, LoggedSet, Session } from '../../core/types';
import { useTheme } from '../../theme/ThemeProvider';
import { ExerciseMedia, ExerciseThumb } from '../../ui/ExerciseMedia';
import { T } from '../../ui/Text';
import { Chip } from '../../ui/Chip';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { EditField, SetTable } from './SetTable';
import { SetFocus } from './SetFocus';
import { Tap } from '../../ui/Pressable';
import {
  SetRef,
  lastPerformance,
  nextInBlock,
  progressionHint,
} from '../../workout/engine';
import { DisplayUnit } from '../../core/types';
import { fmtDuration, plural } from '../../core/format';
import { fmtLoad } from '../../core/units';
import { getCatalogExercise, muscleLabel } from '../../catalog';

interface Props {
  workout: ActiveWorkout;
  bi: number;
  width: number;
  sessions: Session[];
  unit: DisplayUnit;
  stepKg: number;
  bottomPad: number;
  topPad: number;
  onEdit: (ref: SetRef, field: EditField) => void;
  /** Value of the set in progress changed (display units). */
  onSetValue: (ref: SetRef, field: EditField, value: number) => void;
  onToggle: (ref: SetRef) => void;
  onMenu: (bi: number, ei: number) => void;
  onApplyHint: (bi: number, ei: number, kg: number) => void;
  onInfo: (bi: number, ei: number) => void;
}

function WorkoutPageImpl({
  workout,
  bi,
  width,
  sessions,
  unit,
  stepKg,
  bottomPad,
  topPad,
  onEdit,
  onSetValue,
  onToggle,
  onMenu,
  onApplyHint,
  onInfo,
}: Props) {
  const { c } = useTheme();
  const block = workout.blocks[bi];
  const superset = block.exercises.length > 1;
  const active = nextInBlock(workout, bi);
  // The animation helps before the first set; then the controls matter.
  const started = block.exercises.some(e => e.sets.some(s => s.done));
  const [showMedia, setShowMedia] = useState<boolean | null>(null);
  const mediaOpen = showMedia ?? !started;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {!superset && mediaOpen ? (
        <Tap
          onPress={() => setShowMedia(false)}
          scaleTo={0.99}
          feedback={null}
          accessibilityLabel="Riduci l'animazione"
        >
          <ExerciseMedia
            catalogId={block.exercises[0].catalogId}
            style={styles.media}
          />
        </Tap>
      ) : null}
      {superset ? (
        <View style={styles.ssHead}>
          <View style={[styles.ssPill, { backgroundColor: c.accentSoft }]}>
            <T v="caption2" color="accent" weight="700">
              {block.exercises.length > 2 ? 'CIRCUITO' : 'SUPERSET'}
            </T>
          </View>
          <T v="footnote" color="secondary">
            Esegui gli esercizi di fila, recupera dopo il giro
          </T>
        </View>
      ) : null}

      {block.exercises.map((ex, ei) => {
        const last = lastPerformance(sessions, ex.key);
        const prev: LoggedSet[] | undefined = last?.ex.sets;
        const hint = progressionHint(ex, sessions, stepKg);
        const cat = getCatalogExercise(ex.catalogId);
        const activeSet = active && active.ei === ei ? active.si : null;
        return (
          <View
            key={`${ex.exerciseId}-${ei}`}
            style={[
              styles.exercise,
              superset && [styles.ssCard, { backgroundColor: c.card }],
            ]}
          >
            <View style={styles.titleRow}>
              {superset || !mediaOpen ? (
                <Tap
                  onPress={() =>
                    superset ? onInfo(bi, ei) : setShowMedia(true)
                  }
                  scaleTo={0.94}
                  accessibilityLabel="Mostra l'animazione"
                >
                  <ExerciseThumb
                    catalogId={ex.catalogId}
                    kind={ex.kind}
                    size={52}
                  />
                </Tap>
              ) : null}
              <View style={styles.flex}>
                {superset ? (
                  <T v="caption2" color="accent" weight="700">
                    {String.fromCharCode(65 + bi)}
                    {ei + 1}
                  </T>
                ) : null}
                <T v={superset ? 'title3' : 'title2'} numberOfLines={2}>
                  {ex.name}
                </T>
                <T v="subhead" color="secondary" numberOfLines={2}>
                  {[
                    plural(ex.sets.length, 'serie', 'serie'),
                    ex.kind === 'reps' && ex.target[0]?.reps
                      ? `${ex.target[0].reps}${ex.toFailure ? '+' : ''} rip.`
                      : null,
                    ex.restSec ? `recupero ${fmtDuration(ex.restSec)}` : null,
                    cat?.primary.length
                      ? cat.primary.map(muscleLabel).join(', ')
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </T>
              </View>
              <IconButton
                plain
                icon="info"
                size={36}
                onPress={() => onInfo(bi, ei)}
                accessibilityLabel="Informazioni esercizio"
              />
              <IconButton
                plain
                icon="ellipsis"
                size={36}
                onPress={() => onMenu(bi, ei)}
                accessibilityLabel="Opzioni esercizio"
              />
            </View>

            {ex.notes ? (
              <View style={[styles.note, { backgroundColor: c.fill4 }]}>
                <Icon name="bulb" size={16} color={c.orange} />
                <T v="footnote" color="secondary" style={styles.flex}>
                  {ex.notes}
                </T>
              </View>
            ) : null}

            {hint ? (
              <View style={styles.hintRow}>
                <Chip
                  tinted
                  icon="arrow-up"
                  label={`Prova ${fmtLoad(hint, unit)}`}
                  onPress={() => onApplyHint(bi, ei, hint)}
                />
                <T v="footnote" color="secondary" style={styles.flex}>
                  L'ultima volta hai completato tutto
                </T>
              </View>
            ) : null}

            {activeSet != null ? (
              <SetFocus
                ex={ex}
                si={activeSet}
                unit={unit}
                stepKg={stepKg}
                previous={prev?.[activeSet]}
                onChange={(f, v) => onSetValue({ bi, ei, si: activeSet }, f, v)}
              />
            ) : null}

            <SetTable
              ex={ex}
              previous={prev}
              unit={unit}
              activeSet={activeSet}
              onEdit={(si, f) => onEdit({ bi, ei, si }, f)}
              onToggle={si => onToggle({ bi, ei, si })}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

export const WorkoutPage = memo(WorkoutPageImpl);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  media: { marginBottom: 16 },
  ssHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ssPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  exercise: { marginBottom: 14 },
  ssCard: { borderRadius: 24, padding: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  flex: { flex: 1, minWidth: 0 },
  note: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
});
