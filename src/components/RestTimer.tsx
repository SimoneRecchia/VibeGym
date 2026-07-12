import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { useStore } from '../lib/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { GlassButton } from './GlassButton';
import { formatMMSS } from '../lib/helpers';
import Svg, { Circle } from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function RestTimer() {
  const { timer, expandTimer, collapseTimer, addTimerSeconds, stopTimer, settings, setSetting } =
    useStore();
  const { palette, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const atTop = settings.timerPosition === 'top';
  const [barH, setBarH] = useState(64);

  // Absolute top-offset of the bar for each dock, and the off-screen parking spot.
  const dockY = (top: boolean) => (top ? insets.top + 8 : SCREEN_H - insets.bottom - 92 - barH);
  const hiddenY = (top: boolean) => (top ? -(barH + insets.top + 80) : SCREEN_H + 80);

  const y = useRef(new Animated.Value(hiddenY(atTop))).current;
  const yRef = useRef(hiddenY(atTop));
  const startYRef = useRef(0);
  const didPanRef = useRef(false);

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      yRef.current = value;
    });
    return () => y.removeListener(id);
  }, [y]);

  // Slide to the docked position when active / when the dock changes; park it
  // off-screen when inactive. (Not while the user is mid-drag.)
  useEffect(() => {
    Animated.spring(y, {
      toValue: timer.active ? dockY(atTop) : hiddenY(atTop),
      useNativeDriver: false,
      speed: 16,
      bounciness: 5,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.active, atTop, barH, insets.top, insets.bottom]);

  const onGesture = (e: PanGestureHandlerGestureEvent) => {
    const min = dockY(true);
    const max = dockY(false);
    const v = Math.max(min, Math.min(max, startYRef.current + e.nativeEvent.translationY));
    y.setValue(v);
  };

  const onState = (e: PanGestureHandlerStateChangeEvent) => {
    const { state, translationY } = e.nativeEvent;
    if (state === State.BEGAN) {
      startYRef.current = yRef.current;
      didPanRef.current = false;
    } else if (state === State.ACTIVE) {
      didPanRef.current = true;
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      if (!didPanRef.current) {
        expandTimer(); // treated as a tap
        return;
      }
      didPanRef.current = false;
      const released = startYRef.current + translationY;
      const mid = (dockY(true) + dockY(false)) / 2;
      const goTop = released < mid;
      Animated.spring(y, {
        toValue: dockY(goTop),
        useNativeDriver: false,
        speed: 16,
        bounciness: 7,
      }).start();
      if (goTop !== atTop) setSetting('timerPosition', goTop ? 'top' : 'bottom');
    }
  };

  const pct = timer.total > 0 ? Math.max(0, Math.min(1, 1 - timer.remaining / timer.total)) : 0;
  const isWork = timer.phase === 'work';
  const ringColor = timer.finished ? palette.success : isWork ? palette.warn : palette.accent;

  return (
    <>
      {/* Draggable mini bar */}
      <Animated.View
        pointerEvents={timer.active ? 'box-none' : 'none'}
        style={[styles.miniWrap, { top: 0, transform: [{ translateY: y }], opacity: timer.active ? 1 : 0 }]}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h && Math.abs(h - barH) > 1) setBarH(h);
        }}
      >
        <PanGestureHandler onGestureEvent={onGesture} onHandlerStateChange={onState}>
          <Animated.View
            style={[
              styles.mini,
              {
                backgroundColor: mode === 'dark' ? 'rgba(22,22,28,0.94)' : 'rgba(255,255,255,0.96)',
                borderColor: hexToRgba(stripHash(ringColor), 0.45),
                shadowColor: ringColor,
              },
            ]}
          >
            <View style={styles.miniProgressTrack}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${pct * 100}%`, backgroundColor: hexToRgba(stripHash(ringColor), 0.22) },
                ]}
              />
            </View>
            <View style={styles.miniInner}>
              <View style={[styles.grip, { backgroundColor: palette.dividerStrong }]} />
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: hexToRgba(stripHash(ringColor), 0.2), borderColor: hexToRgba(stripHash(ringColor), 0.55) },
                ]}
              >
                <Icon name={isWork ? 'play' : 'timer'} color={ringColor} size={14} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.miniLabel, { color: palette.textDim }]}>
                  {timer.finished ? 'VAI' : isWork ? 'Esercizio' : 'Recupero'}
                </Text>
                <Text style={[styles.miniName, { color: palette.text }]} numberOfLines={1}>
                  {timer.exName}
                </Text>
              </View>
              <Text style={[styles.miniTime, { color: palette.text }]}>
                {timer.finished ? '00:00' : formatMMSS(timer.remaining)}
              </Text>
              <IconButton icon="x" size={32} variant="solid" onPress={stopTimer} />
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>

      {/* Expanded modal */}
      <Modal
        transparent
        visible={timer.expanded && timer.active}
        animationType="fade"
        onRequestClose={collapseTimer}
        statusBarTranslucent
      >
        <View style={[styles.expanded, { backgroundColor: palette.bg, paddingTop: insets.top + 12 }]}>
          <View style={styles.expandedTop}>
            <Pressable
              onPress={collapseTimer}
              hitSlop={12}
              style={({ pressed }) => [
                styles.dismiss,
                { backgroundColor: palette.glassFill, borderColor: palette.glassBorder, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Icon name="chevron-down" color={palette.text} size={22} />
            </Pressable>
            <View
              style={[
                styles.phaseBadge,
                { backgroundColor: hexToRgba(stripHash(ringColor), 0.18), borderColor: hexToRgba(stripHash(ringColor), 0.55) },
              ]}
            >
              <Icon name={isWork ? 'play' : 'timer'} color={ringColor} size={14} />
              <Text style={[styles.phaseText, { color: ringColor }]}>
                {timer.finished ? 'VAI!' : isWork ? 'ESERCIZIO' : 'RECUPERO'}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.bigCircle}>
            <BigRing progress={pct} color={ringColor} />
            <View style={styles.bigCircleInner} pointerEvents="none">
              <Text style={[styles.bigTime, { color: palette.text }]}>
                {timer.finished ? '00:00' : formatMMSS(timer.remaining)}
              </Text>
              <Text style={[styles.bigSub, { color: palette.textDim }]}>{timer.subText}</Text>
            </View>
          </View>

          <Text style={[styles.bigExName, { color: palette.text }]} numberOfLines={2}>
            {timer.exName}
          </Text>

          {!timer.finished && (
            <View style={styles.controls}>
              <GlassButton title="-15s" icon="minus" variant="secondary" onPress={() => addTimerSeconds(-15)} />
              <GlassButton title="+15s" iconRight="plus" variant="secondary" onPress={() => addTimerSeconds(15)} />
            </View>
          )}

          <View style={styles.expandedActions}>
            <GlassButton
              title={timer.finished ? 'Chiudi' : 'Salta recupero'}
              icon={timer.finished ? 'check' : 'arrow-right'}
              variant="primary"
              tint={ringColor}
              onPress={stopTimer}
              block
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function BigRing({ progress, color }: { progress: number; color: string }) {
  const { palette } = useTheme();
  const size = Math.min(SCREEN_W - 64, 320);
  const thickness = 16;
  const r = (size - thickness) / 2;
  const cir = 2 * Math.PI * r;
  const dash = cir * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.dividerStrong} strokeWidth={thickness} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${cir}, ${cir}`}
        strokeDashoffset={dash}
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  miniWrap: { position: 'absolute', left: space.md, right: space.md },
  mini: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  miniProgressTrack: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  miniProgressFill: { height: '100%' },
  miniInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  grip: { width: 4, height: 26, borderRadius: 2, marginRight: 2 },
  miniBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  miniLabel: { ...typography.caption2, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniName: { ...typography.subhead, marginTop: 1 },
  miniTime: { ...typography.title3, fontVariant: ['tabular-nums'], fontWeight: '800' },
  expanded: { flex: 1, paddingHorizontal: space.lg },
  expandedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xxl,
  },
  dismiss: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  phaseText: { ...typography.caption1, letterSpacing: 0.7 },
  bigCircle: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: space.xl },
  bigCircleInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bigTime: { fontSize: 72, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  bigSub: { ...typography.subhead, marginTop: 4 },
  bigExName: { ...typography.title1, textAlign: 'center', marginTop: space.md },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: space.xl },
  expandedActions: { marginTop: 'auto', marginBottom: space.xl },
});
