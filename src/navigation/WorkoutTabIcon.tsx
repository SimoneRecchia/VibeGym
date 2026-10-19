/**
 * Center tab icon while a workout is in progress: the dumbbell shimmers in a
 * gradient of the theme colors that keeps cycling. When a rest runs out it
 * morphs into an alarm clock that rings, then turns back.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../ui/Icon';
import { useRestAlarm } from '../workout/alarm';

const SIZE = 24;

export function WorkoutTabIcon() {
  const { c } = useTheme();
  const cycle = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const waves = useRef(new Animated.Value(0)).current;
  const alarmAt = useRestAlarm(s => s.at);
  const mountedAt = useRef(Date.now());

  // Endless color cycle: three gradients crossfading.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 3,
        duration: 5400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycle]);

  // Rest over: dumbbell → ringing alarm clock → dumbbell.
  useEffect(() => {
    if (!alarmAt || alarmAt < mountedAt.current) return;
    const ring = Animated.sequence(
      [-18, 18, -16, 16, -12, 12, -6, 0].map(deg =>
        Animated.timing(shake, {
          toValue: deg,
          duration: 55,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    const anim = Animated.sequence([
      Animated.spring(morph, {
        toValue: 1,
        speed: 14,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.sequence([
          ring,
          Animated.delay(180),
          ring,
          Animated.delay(180),
          ring,
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(waves, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(waves, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 4 },
        ),
      ]),
      Animated.delay(900),
      Animated.spring(morph, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [alarmAt, morph, shake, waves]);

  const a = c.accent;
  const b = c.accent2;
  const d = c.accent3;
  const layers: [string, string][] = [
    [a, b],
    [b, d],
    [d, a],
  ];
  // Layer i is fully visible at i, fading out towards i ± 1 (wrapping at 3).
  const opacity = (i: number) =>
    cycle.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [0, 1, 2, 3].map(x => {
        const dist = Math.min(Math.abs(x - i), 3 - Math.abs(x - i));
        return dist === 0 ? 1 : 0;
      }),
    });

  const dumbbellStyle = {
    opacity: morph.interpolate({
      inputRange: [0, 0.6],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        scale: morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }),
      },
      {
        rotate: morph.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-90deg'],
        }),
      },
    ],
  };
  const alarmStyle = {
    opacity: morph.interpolate({
      inputRange: [0.3, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        scale: morph.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1.12],
        }),
      },
      {
        rotate: shake.interpolate({
          inputRange: [-90, 90],
          outputRange: ['-90deg', '90deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.box} accessibilityLabel="Allenamento in corso">
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.center, dumbbellStyle]}
      >
        {layers.map((g, i) => (
          <Animated.View
            key={i}
            style={[
              StyleSheet.absoluteFill,
              styles.center,
              { opacity: opacity(i) },
            ]}
          >
            <Icon
              name="dumbbell"
              size={SIZE}
              color={a}
              gradient={g}
              weight={2.4}
            />
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.center, alarmStyle]}
      >
        <Icon
          name="alarm"
          size={SIZE}
          color={a}
          gradient={[a, b]}
          weight={2.4}
        />
      </Animated.View>
      {/* Ringing waves */}
      <Animated.View
        pointerEvents="none"
        style={[styles.waves, { opacity: waves }]}
      >
        <View style={[styles.wave, styles.waveLeft, { borderColor: a }]} />
        <View style={[styles.wave, styles.waveRight, { borderColor: b }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE + 12, height: SIZE },
  center: { alignItems: 'center', justifyContent: 'center' },
  waves: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wave: {
    width: 6,
    height: 12,
    borderWidth: 2,
    borderRadius: 6,
  },
  waveLeft: {
    borderRightWidth: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  waveRight: {
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
});
