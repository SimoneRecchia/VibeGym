/**
 * Live workout. Built for one-handed use between sets:
 *  - one page per exercise (swipe), media on top, sets below;
 *  - a single big button logs the next set with prefilled values;
 *  - the rest timer starts by itself and floats above the button.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../../ui/Text';
import { Button, IconButton } from '../../ui/Button';
import { Tap } from '../../ui/Pressable';
import { showMenu } from '../../ui/Menu';
import { useNow } from '../../ui/useNow';
import { WorkoutPage } from './WorkoutPage';
import { RestDock } from './RestDock';
import { SetEditSheet } from './SetEditSheet';
import { FinishSheet } from './FinishSheet';
import { EditField } from './SetTable';
import {
  SetRef,
  isBlockDone,
  nextOutsideBlock,
  nextInBlock,
  nextPending,
  workoutProgress,
} from '../../workout/engine';
import { completeSet, startTimedSet, undoSet } from '../../workout/actions';
import { stopTimer, useTimer } from '../../workout/timer';
import { keepAwake } from '../../services/keepAwake';
import { requestNotificationPermission } from '../../services/notifications';
import { fmtClock } from '../../core/format';
import { fmtLoadValue } from '../../core/units';
import { exerciseKey } from '../../core/ids';
import { useDraft } from '../../data/draft';
import { ScreenProps } from '../../navigation/types';
import { LoggedSet } from '../../core/types';

export function WorkoutScreen({ navigation }: ScreenProps<'Workout'>) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const workout = useStore(s => s.workout);
  const sessions = useStore(s => s.sessions);
  const settings = useStore(s => s.settings);
  const updateSet = useStore(s => s.updateSet);
  const updateWorkout = useStore(s => s.updateWorkout);
  const phase = useTimer(s => s.phase);
  const timerRef = useTimer(s => s.ref);
  const now = useNow(1000, !!workout);
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(workout?.cursor ?? 0);
  const [edit, setEdit] = useState<{ ref: SetRef; field: EditField } | null>(
    null,
  );
  const [finishing, setFinishing] = useState(false);

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

  // Follow the cursor when the engine moves to the next exercise.
  const cursor = workout?.cursor ?? 0;
  useEffect(() => {
    if (cursor !== page && workout && cursor < workout.blocks.length) {
      const t = setTimeout(() => {
        list.current?.scrollToIndex({ index: cursor, animated: true });
        setPage(cursor);
      }, 450);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const goTo = useCallback(
    (i: number) => {
      list.current?.scrollToIndex({ index: i, animated: true });
      setPage(i);
      updateWorkout(w => {
        w.cursor = i;
      });
    },
    [updateWorkout],
  );

  const onToggle = useCallback((ref: SetRef) => {
    const w = useStore.getState().workout;
    const set = w?.blocks[ref.bi]?.exercises[ref.ei]?.sets[ref.si];
    if (!set) return;
    if (set.done) undoSet(ref);
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

  const progress = workoutProgress(workout);
  const pending = nextInBlock(workout, page);
  const nextAny = nextPending(workout);
  const pageEx = pending ? workout.blocks[page].exercises[pending.ei] : null;
  const pendingSet: LoggedSet | null =
    pending && pageEx ? pageEx.sets[pending.si] : null;
  const timingThis =
    phase === 'work' &&
    timerRef &&
    pending &&
    timerRef.bi === pending.bi &&
    timerRef.ei === pending.ei &&
    timerRef.si === pending.si;

  const primary = () => {
    if (pending && pageEx) {
      if (pageEx.kind === 'time') {
        if (!timingThis) startTimedSet(pending);
        return;
      }
      completeSet(pending);
      return;
    }
    if (nextAny) goTo(nextAny.bi);
    else setFinishing(true);
  };

  let primaryTitle = 'Termina allenamento';
  let primaryIcon: 'check' | 'play' | 'arrow-right' | 'flame' = 'flame';
  if (pending && pageEx && pendingSet) {
    const u = settings.unit;
    if (pageEx.kind === 'reps') {
      primaryTitle = `Fatto · ${
        pendingSet.kg ? `${fmtLoadValue(pendingSet.kg, u)} ${u} × ` : ''
      }${pendingSet.reps ?? ''}`;
      primaryIcon = 'check';
    } else if (pageEx.kind === 'time') {
      primaryTitle = timingThis
        ? 'In corso…'
        : `Avvia ${pendingSet.sec ?? 30} s`;
      primaryIcon = 'play';
    } else {
      primaryTitle = 'Completa';
      primaryIcon = 'check';
    }
    if (workout.blocks[page].exercises.length > 1)
      primaryTitle = `${String.fromCharCode(65 + page)}${
        pending.ei + 1
      } · ${primaryTitle}`;
  } else if (nextAny) {
    primaryTitle = 'Prossimo esercizio';
    primaryIcon = 'arrow-right';
  }

  const topBarH = insets.top + 56 + 18;
  const dockH = 96 + (phase !== 'idle' ? 72 : 0) + insets.bottom;
  const editEx = edit
    ? workout.blocks[edit.ref.bi]?.exercises[edit.ref.ei] ?? null
    : null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <FlatList
        ref={list}
        data={workout.blocks}
        keyExtractor={b => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(workout.cursor, workout.blocks.length - 1)}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        windowSize={3}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== page) {
            setPage(i);
            updateWorkout(w => {
              w.cursor = i;
            });
          }
        }}
        renderItem={({ index }) => (
          <WorkoutPage
            workout={workout}
            bi={index}
            width={width}
            sessions={sessions}
            unit={settings.unit}
            stepKg={settings.loadStepKg}
            topPad={topBarH}
            bottomPad={dockH + 16}
            onEdit={onEdit}
            onToggle={onToggle}
            onMenu={onMenu}
            onApplyHint={onApplyHint}
            onInfo={onInfo}
          />
        )}
      />

      {/* Top bar */}
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top }]}
      >
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="wtop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.bg} stopOpacity={0.97} />
              <Stop offset="0.75" stopColor={c.bg} stopOpacity={0.85} />
              <Stop offset="1" stopColor={c.bg} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#wtop)" />
        </Svg>
        <View style={styles.topRow}>
          <IconButton
            icon="chevron-down"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Riduci allenamento"
          />
          <View style={styles.topCenter}>
            <T v="headline" numberOfLines={1}>
              {workout.dayName}
            </T>
            <T v="footnote" color="secondary" style={styles.tabular}>
              {fmtClock((now - workout.startedAt) / 1000)} · {progress.done}/
              {progress.total} serie
            </T>
          </View>
          <Button
            title="Fine"
            size="m"
            variant="tinted"
            onPress={() => setFinishing(true)}
            feedback="medium"
          />
        </View>
        {/* Progress segments, one per exercise */}
        <View style={styles.segments}>
          {workout.blocks.map((b, i) => {
            const done = isBlockDone(workout, i);
            const started = b.exercises.some(e => e.sets.some(s => s.done));
            return (
              <Tap
                key={b.id}
                onPress={() => goTo(i)}
                style={styles.segTap}
                feedback="selection"
                scaleTo={1}
                accessibilityLabel={`Esercizio ${i + 1}`}
              >
                <View
                  style={[
                    styles.seg,
                    {
                      backgroundColor: done
                        ? c.green
                        : started
                        ? c.accent
                        : c.fill,
                    },
                    i === page ? styles.segOn : styles.segOff,
                  ]}
                />
              </Tap>
            );
          })}
        </View>
      </View>

      {/* Bottom dock */}
      <View
        pointerEvents="box-none"
        style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="wbot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.bg} stopOpacity={0} />
              <Stop offset="0.35" stopColor={c.bg} stopOpacity={0.85} />
              <Stop offset="1" stopColor={c.bg} stopOpacity={0.97} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#wbot)" />
        </Svg>
        <View style={styles.dockInner}>
          <RestDock />
          <Button
            title={primaryTitle}
            icon={primaryIcon}
            onPress={primary}
            disabled={!!timingThis}
            feedback={null}
          />
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  mt: { marginTop: 16 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 14 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  topCenter: { flex: 1, alignItems: 'center', minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  segments: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
    height: 12,
  },
  segTap: { flex: 1, height: 12, justifyContent: 'center' },
  seg: { borderRadius: 3 },
  segOn: { height: 6 },
  segOff: { height: 4, opacity: 0.55 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28 },
  dockInner: { paddingHorizontal: 16, gap: 12 },
});
