/**
 * Center tab icon while a workout is in progress: a solid dumbbell whose
 * gradient keeps cycling through the theme colors. When a rest runs out it
 * melts into an alarm clock that rings, then flows back into the dumbbell.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { MorphIcon } from '../ui/MorphIcon';
import { ALARM_HANDS, MORPH, MorphName } from '../ui/morphShapes';
import { useRestAlarm } from '../workout/alarm';

const SIZE = 26;

/** Static solid dumbbell with a diagonal gradient. */
function Dumbbell({ g, id }: { g: [string, string]; id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient
          id={id}
          x1="0"
          y1="0"
          x2="24"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={g[0]} />
          <Stop offset="1" stopColor={g[1]} />
        </LinearGradient>
      </Defs>
      <Path d={MORPH.dumbbell} fill={`url(#${id})`} />
    </Svg>
  );
}

export function WorkoutTabIcon() {
  const { c } = useTheme();
  const cycle = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const alarmAt = useRestAlarm(s => s.at);
  const mountedAt = useRef(Date.now());
  const [shape, setShape] = useState<MorphName>('dumbbell');
  const [ringing, setRinging] = useState(false);

  // Endless color cycle: three gradients crossfading.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 3,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycle]);

  // Rest over: melt into the alarm, ring, flow back.
  useEffect(() => {
    if (!alarmAt || alarmAt < mountedAt.current) return;
    // Mount on the dumbbell, then morph (a first frame on the alarm would
    // skip the transformation).
    setShape('dumbbell');
    setRinging(true);
    const melt = setTimeout(() => setShape('alarm'), 40);
    const swing = Animated.sequence(
      [-16, 16, -14, 14, -10, 10, -5, 0].map(deg =>
        Animated.timing(shake, {
          toValue: deg,
          duration: 60,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );
    const ring = Animated.sequence([
      Animated.delay(560),
      swing,
      Animated.delay(220),
      swing,
      Animated.delay(220),
      swing,
    ]);
    ring.start();
    const back = setTimeout(() => setShape('dumbbell'), 3000);
    const done = setTimeout(() => setRinging(false), 3600);
    return () => {
      ring.stop();
      clearTimeout(melt);
      clearTimeout(back);
      clearTimeout(done);
    };
  }, [alarmAt, shake]);

  const layers: [string, string][] = [
    [c.accent, c.accent2],
    [c.accent2, c.accent3],
    [c.accent3, c.accent],
  ];
  // Layer i is fully visible at i, fading towards i ± 1 (wrapping at 3).
  const opacity = (i: number) =>
    cycle.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [0, 1, 2, 3].map(x =>
        Math.min(Math.abs(x - i), 3 - Math.abs(x - i)) === 0 ? 1 : 0,
      ),
    });
  const rotate = shake.interpolate({
    inputRange: [-90, 90],
    outputRange: ['-90deg', '90deg'],
  });

  return (
    <View style={styles.box} accessibilityLabel="Allenamento in corso">
      {ringing ? (
        <Animated.View style={[styles.layer, { transform: [{ rotate }] }]}>
          <MorphIcon name={shape} size={SIZE} gradient={layers[0]}>
            <Path
              d={ALARM_HANDS}
              stroke={c.glass}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </MorphIcon>
        </Animated.View>
      ) : (
        layers.map((g, i) => (
          <Animated.View
            key={i}
            style={[styles.layer, { opacity: opacity(i) }]}
          >
            <Dumbbell g={g} id={`wt${i}`} />
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
