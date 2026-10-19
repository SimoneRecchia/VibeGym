/**
 * Floating timer: compact glass capsule above the bottom buttons, expandable
 * to a full-screen countdown readable from across the room. Hold it and drag
 * to move it out of the way; the position is remembered.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useStore } from '../../data/store';
import { haptic } from '../../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adjustTimer, finishNow, useTimer } from '../../workout/timer';
import { useTheme } from '../../theme/ThemeProvider';
import { Glass } from '../../ui/Glass';
import { Tap } from '../../ui/Pressable';
import { T } from '../../ui/Text';
import { Ring } from '../../ui/charts/Ring';
import { IconButton, Button } from '../../ui/Button';
import { numeric } from '../../theme/typography';
import { fmtClock } from '../../core/format';
import { Icon } from '../../ui/Icon';
import { ACCENTS } from '../../theme/colors';

export function RestDock({
  bottom,
  maxLift,
}: {
  /** Distance of the docked position from the screen bottom. */
  bottom: number;
  /** How far up it may be dragged. */
  maxLift: number;
}) {
  const { c } = useTheme();
  const saved = useStore(s => s.settings.restDockLift ?? 0);
  const lift = useRef(new Animated.Value(-saved)).current;
  const base = useRef(saved);
  const [dragging, setDragging] = useState(false);
  const clamp = (v: number) => Math.min(maxLift, Math.max(0, v));
  const maxRef = useRef(maxLift);
  maxRef.current = maxLift;

  useEffect(() => {
    base.current = clamp(saved);
    lift.setValue(-base.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, maxLift]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(280)
        .runOnJS(true)
        .onStart(() => {
          haptic('medium');
          setDragging(true);
        })
        .onUpdate(e => {
          const v = Math.min(
            maxRef.current,
            Math.max(0, base.current - e.translationY),
          );
          lift.setValue(-v);
        })
        .onEnd(e => {
          const v = Math.min(
            maxRef.current,
            Math.max(0, base.current - e.translationY),
          );
          base.current = v;
          setDragging(false);
          useStore
            .getState()
            .updateSettings(st => ({ ...st, restDockLift: Math.round(v) }));
        })
        .onFinalize(() => setDragging(false)),
    [lift],
  );
  const phase = useTimer(s => s.phase);
  const remaining = useTimer(s => s.remaining);
  const total = useTimer(s => s.total);
  const nextLabel = useTimer(s => s.nextLabel);
  const label = useTimer(s => s.label);
  const [expanded, setExpanded] = useState(false);

  // Timed sets open big by default: you are holding a plank, not reading small text.
  useEffect(() => {
    if (phase === 'work') setExpanded(true);
    if (phase === 'idle') setExpanded(false);
  }, [phase]);

  if (phase === 'idle') return null;
  // Rest is calm (cyan, like the Stand ring), effort is green.
  const color = phase === 'work' ? c.green : REST_COLOR(c);
  const progress = 1 - remaining / Math.max(1, total);

  return (
    <>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.float,
            {
              bottom,
              transform: [{ translateY: lift }, { scale: dragging ? 1.03 : 1 }],
            },
          ]}
        >
          <Tap
            onPress={() => setExpanded(true)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${
              phase === 'rest' ? 'Recupero' : label
            }: ${fmtClock(
              remaining,
            )}. Tocca per ingrandire, tieni premuto per spostare`}
          >
            <Glass interactive style={styles.capsule}>
              <Ring progress={progress} size={40} stroke={4} color={color}>
                <Icon name="timer" size={16} color={c.label} />
              </Ring>
              <View style={styles.texts}>
                <T v="caption" color="secondary" numberOfLines={1}>
                  {phase === 'rest' ? `Poi: ${nextLabel}` : label}
                </T>
                <T style={[numeric(26), { color: c.label }]}>
                  {fmtClock(remaining)}
                </T>
              </View>
              <View style={styles.actions}>
                <IconButton
                  plain
                  icon="minus"
                  size={40}
                  onPress={() => adjustTimer(-15)}
                  accessibilityLabel="Togli 15 secondi"
                />
                <IconButton
                  plain
                  icon="plus"
                  size={40}
                  onPress={() => adjustTimer(15)}
                  accessibilityLabel="Aggiungi 15 secondi"
                />
                <IconButton
                  plain
                  icon={phase === 'rest' ? 'forward' : 'check'}
                  size={40}
                  onPress={finishNow}
                  accessibilityLabel={
                    phase === 'rest' ? 'Salta recupero' : 'Termina ora'
                  }
                />
              </View>
            </Glass>
          </Tap>
        </Animated.View>
      </GestureDetector>
      <TimerFullScreen visible={expanded} onClose={() => setExpanded(false)} />
    </>
  );
}

function TimerFullScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const phase = useTimer(s => s.phase);
  const remaining = useTimer(s => s.remaining);
  const total = useTimer(s => s.total);
  const nextLabel = useTimer(s => s.nextLabel);
  const label = useTimer(s => s.label);
  if (phase === 'idle') return null;
  const color = phase === 'work' ? c.green : REST_COLOR(c);
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.full,
          {
            backgroundColor: c.bg,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.fullTop}>
          <IconButton
            plain
            icon="chevron-down"
            onPress={onClose}
            accessibilityLabel="Riduci timer"
          />
        </View>
        <View style={styles.fullCenter}>
          <T v="title3" color="secondary" align="center">
            {phase === 'rest' ? 'Recupero' : label}
          </T>
          <Ring
            progress={1 - remaining / Math.max(1, total)}
            size={280}
            stroke={18}
            color={color}
          >
            <T
              style={[numeric(84), { color: c.label }]}
              accessibilityRole="timer"
            >
              {fmtClock(remaining)}
            </T>
          </Ring>
          {nextLabel ? (
            <T
              v="headline"
              color="secondary"
              align="center"
              numberOfLines={2}
              style={styles.next}
            >
              {phase === 'rest'
                ? `Poi: ${nextLabel}`
                : `Dopo: recupero, poi ${nextLabel}`}
            </T>
          ) : null}
        </View>
        <View style={styles.fullActions}>
          <Button
            title="−15 s"
            variant="glass"
            onPress={() => adjustTimer(-15)}
            style={styles.flex}
          />
          <Button
            title="+15 s"
            variant="glass"
            onPress={() => adjustTimer(15)}
            style={styles.flex}
          />
        </View>
        <Button
          title={phase === 'rest' ? 'Salta recupero' : 'Termina ora'}
          icon={phase === 'rest' ? 'forward' : 'check'}
          tint={color}
          onPress={() => {
            finishNow();
            if (phase === 'rest') onClose();
          }}
          style={styles.skip}
        />
      </View>
    </Modal>
  );
}

const REST_COLOR = (c: { dark: boolean }) =>
  ACCENTS.cyan[c.dark ? 'dark' : 'light'];

const styles = StyleSheet.create({
  float: { position: 'absolute', left: 16, right: 16 },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 32,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  texts: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 6 },
  full: { flex: 1, paddingHorizontal: 20 },
  fullTop: { flexDirection: 'row' },
  fullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  next: { maxWidth: 320 },
  fullActions: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  skip: { marginTop: 12 },
});
