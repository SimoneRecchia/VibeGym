/**
 * Live workout as one list, like a paper plan: every exercise is a card with
 * its sets (tap a row when done, tap a value to change it) and a button for
 * the next set that starts the rest. The day's color runs through it; the
 * progress ring sits at the top, summary and finish at the bottom.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { dayColor } from '../../theme/colors';
import { T } from '../../ui/Text';
import { Button, IconButton } from '../../ui/Button';
import { Ring } from '../../ui/charts/Ring';
import { Backdrop } from '../../ui/Backdrop';
import { showMenu } from '../../ui/Menu';
import { useNow } from '../../ui/useNow';
import { ExerciseCard, EditField } from './ExerciseCard';
import { RestDock } from './RestDock';
import { HeartRateBadge } from './HeartRateBadge';
import { SetEditSheet } from './SetEditSheet';
import { FinishSheet } from './FinishSheet';
import { WorkoutOverview } from './WorkoutOverview';
import {
  SetRef,
  nextInBlock,
  nextOutsideBlock,
  workoutProgress,
} from '../../workout/engine';
import { completeSet, startTimedSet, undoSet } from '../../workout/actions';
import { stopTimer, useTimer } from '../../workout/timer';
import { keepAwake } from '../../services/keepAwake';
import { requestNotificationPermission } from '../../services/notifications';
import { fmtClock } from '../../core/format';
import { exerciseKey } from '../../core/ids';
import { dayLetter } from '../../plan/planUtils';
import { useDraft } from '../../data/draft';
import { ScreenProps } from '../../navigation/types';

const TOP_H = 64;

export function WorkoutScreen({ navigation }: ScreenProps<'Workout'>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = useStore(s => s.workout);
  const plans = useStore(s => s.plans);
  const sessions = useStore(s => s.sessions);
  const settings = useStore(s => s.settings);
  const updateSet = useStore(s => s.updateSet);
  const updateWorkout = useStore(s => s.updateWorkout);
  const phase = useTimer(s => s.phase);
  const timerRef = useTimer(s => s.ref);
  const scroll = useRef<ScrollView>(null);
  const cardY = useRef<number[]>([]);
  const [edit, setEdit] = useState<{ ref: SetRef; field: EditField } | null>(
    null,
  );
  const [finishing, setFinishing] = useState(false);
  const [overview, setOverview] = useState(false);

  // Ask once, in context: the rest-end notification needs permission.
  useEffect(() => {
    if (useStore.getState().settings.notifications.restEnd)
      requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!settings.keepAwake) return;
    keepAwake(true);
    return () => keepAwake(false);
  }, [settings.keepAwake]);

  const scrollToBlock = useCallback((bi: number) => {
    const y = cardY.current[bi];
    if (y != null)
      scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);

  // When an exercise is finished the engine moves on: follow it.
  const cursor = workout?.cursor ?? 0;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => scrollToBlock(cursor), 450);
    return () => clearTimeout(t);
  }, [cursor, scrollToBlock]);

  const goTo = useCallback(
    (bi: number) => {
      updateWorkout(w => {
        w.cursor = bi;
      });
      scrollToBlock(bi);
    },
    [updateWorkout, scrollToBlock],
  );

  const onToggle = useCallback((ref: SetRef) => {
    const w = useStore.getState().workout;
    const set = w?.blocks[ref.bi]?.exercises[ref.ei]?.sets[ref.si];
    if (!set) return;
    if (set.done) undoSet(ref);
    else completeSet(ref);
  }, []);

  const onAction = useCallback((bi: number) => {
    const w = useStore.getState().workout;
    if (!w) return;
    const ref = nextInBlock(w, bi);
    if (!ref) return;
    if (w.blocks[ref.bi].exercises[ref.ei].kind === 'time') startTimedSet(ref);
    else completeSet(ref);
  }, []);

  const onEdit = useCallback(
    (ref: SetRef, field: EditField) => setEdit({ ref, field }),
    [],
  );

  const onApplyHint = useCallback(
    (bi: number, ei: number, kg: number) =>
      updateWorkout(w => {
        w.blocks[bi].exercises[ei].sets.forEach(s => {
          if (!s.done) s.kg = kg;
        });
      }),
    [updateWorkout],
  );

  const onInfo = useCallback(
    (bi: number, ei: number) => {
      const ex = useStore.getState().workout?.blocks[bi].exercises[ei];
      if (ex)
        navigation.navigate('ExerciseInfo', {
          catalogId: ex.catalogId,
          name: ex.name,
          key: ex.key,
        });
    },
    [navigation],
  );

  const onMenu = useCallback(
    (bi: number, ei: number) => {
      const ex = useStore.getState().workout?.blocks[bi].exercises[ei];
      if (!ex) return;
      showMenu({
        title: ex.name,
        options: [
          {
            label: 'Aggiungi una serie',
            onPress: () =>
              updateWorkout(w => {
                const e = w.blocks[bi].exercises[ei];
                const last = e.sets[e.sets.length - 1] ?? { done: false };
                e.sets.push({ ...last, done: false });
              }),
          },
          {
            label: 'Rimuovi l’ultima serie',
            destructive: true,
            onPress: () =>
              updateWorkout(w => {
                const e = w.blocks[bi].exercises[ei];
                if (e.sets.length > 1 && !e.sets[e.sets.length - 1].done)
                  e.sets.pop();
              }),
          },
          {
            label: 'Sostituisci esercizio (solo oggi)',
            onPress: () => {
              useDraft.setState({
                onPick: r =>
                  updateWorkout(w => {
                    const e = w.blocks[bi].exercises[ei];
                    e.name = r.name;
                    e.catalogId = r.catalogId;
                    e.key = exerciseKey(r.name, r.catalogId);
                  }),
              });
              navigation.navigate('ExercisePicker', {
                title: 'Sostituisci esercizio',
                cardio: ex.kind === 'cardio',
              });
            },
          },
          {
            label: 'Salta esercizio',
            onPress: () => {
              const w = useStore.getState().workout;
              const next = w ? nextOutsideBlock(w, bi) : null;
              if (next) goTo(next.bi);
            },
          },
        ],
      });
    },
    [goTo, navigation, updateWorkout],
  );

  if (!workout) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.bg }]}>
        <T v="headline">Nessun allenamento in corso</T>
        <Button
          title="Chiudi"
          variant="glass"
          onPress={() => navigation.goBack()}
          style={styles.mt}
        />
      </View>
    );
  }

  const plan = plans.find(p => p.id === workout.planId);
  const dayIndex = Math.max(
    0,
    plan?.days.findIndex(d => d.id === workout.dayId) ?? 0,
  );
  const color = dayColor(dayIndex, c);
  const progress = workoutProgress(workout);
  const timing = phase === 'work' ? timerRef ?? null : null;
  const topH = insets.top + TOP_H;
  const bottomH =
    84 + (phase !== 'idle' ? 72 : 0) + Math.max(insets.bottom, 12);
  const editEx = edit
    ? workout.blocks[edit.ref.bi]?.exercises[edit.ref.ei] ?? null
    : null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <Backdrop tint={color} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topH + 8, paddingBottom: bottomH + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {workout.blocks.map((b, bi) => (
          <View
            key={b.id}
            onLayout={e => {
              cardY.current[bi] = e.nativeEvent.layout.y;
            }}
          >
            <ExerciseCard
              workout={workout}
              bi={bi}
              color={color}
              sessions={sessions}
              unit={settings.unit}
              stepKg={settings.loadStepKg}
              timing={timing}
              onToggle={onToggle}
              onEdit={onEdit}
              onAction={onAction}
              onInfo={onInfo}
              onMenu={onMenu}
              onApplyHint={onApplyHint}
            />
          </View>
        ))}
      </ScrollView>

      {/* Top bar */}
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top }]}
      >
        <Fade from="top" color={c.bg} />
        <View style={styles.topRow}>
          <IconButton
            icon="chevron-down"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Riduci allenamento"
          />
          <View style={styles.topCenter}>
            <T v="caption2" color={color} weight="700">
              GIORNO {dayLetter(dayIndex)} ·{' '}
              <Elapsed since={workout.startedAt} />
            </T>
            <T v="headline" numberOfLines={1}>
              {workout.dayName}
            </T>
          </View>
          <HeartRateBadge />
          <Ring
            progress={progress.total ? progress.done / progress.total : 0}
            size={48}
            stroke={5}
            color={color}
          >
            <T v="caption2" weight="700">
              {progress.done}/{progress.total}
            </T>
          </Ring>
        </View>
      </View>

      {/* Bottom bar */}
      <View
        pointerEvents="box-none"
        style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Fade from="bottom" color={c.bg} />
        <View style={styles.dockInner}>
          <RestDock />
          <View style={styles.dockRow}>
            <Button
              title="Riepilogo"
              icon="list"
              variant="glass"
              onPress={() => setOverview(true)}
              style={styles.flex}
            />
            <Button
              title="Fine"
              icon="flame"
              tint={color}
              onPress={() => setFinishing(true)}
              feedback="medium"
              style={styles.flex}
            />
          </View>
        </View>
      </View>

      <SetEditSheet
        visible={!!edit}
        ex={editEx}
        si={edit?.ref.si ?? 0}
        field={edit?.field ?? 'kg'}
        unit={settings.unit}
        stepKg={settings.loadStepKg}
        onClose={() => setEdit(null)}
        onSave={(patch, propagate) => {
          if (edit)
            updateSet(edit.ref.bi, edit.ref.ei, edit.ref.si, patch, propagate);
          setEdit(null);
        }}
      />

      <WorkoutOverview
        visible={overview}
        workout={workout}
        page={cursor}
        unit={settings.unit}
        onClose={() => setOverview(false)}
        onGo={i => {
          setOverview(false);
          goTo(i);
        }}
      />

      <FinishSheet
        visible={finishing}
        onClose={() => setFinishing(false)}
        onSaved={id => {
          stopTimer();
          setFinishing(false);
          navigation.replace('Session', { id });
        }}
        onDiscarded={() => {
          stopTimer();
          setFinishing(false);
          useStore.getState().discardWorkout();
          navigation.goBack();
        }}
      />
    </View>
  );
}

/** Workout clock: ticks on its own, so the list doesn't re-render each second. */
function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <>{fmtClock((now - since) / 1000)}</>;
}

/** Background fade under the floating bars. */
function Fade({ from, color }: { from: 'top' | 'bottom'; color: string }) {
  const top = from === 'top';
  const id = top ? 'wfadeTop' : 'wfadeBottom';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={top ? 1 : 0} />
          <Stop offset="0.6" stopColor={color} stopOpacity={top ? 0.9 : 0.92} />
          <Stop offset="1" stopColor={color} stopOpacity={top ? 0 : 1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  mt: { marginTop: 16 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 12 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: TOP_H,
  },
  topCenter: { flex: 1, minWidth: 0 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24 },
  dockInner: { paddingHorizontal: 16, gap: 10 },
  dockRow: { flexDirection: 'row', gap: 10 },
});
