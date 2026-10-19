/**
 * Icon that turns into another one with a liquid motion: the outline is
 * re-computed frame by frame (flubber), pieces split and merge, and the
 * whole glyph swells a little as it changes, like a drop.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { combine, interpolate, interpolateAll, separate } from 'flubber';
import { MORPH, MorphName, MorphShape } from './morphShapes';

const OPTS = { maxSegmentLength: 0.5, single: true } as const;

const cache = new Map<string, (t: number) => string>();
const morpher = (a: MorphName, b: MorphName) => {
  const key = `${a}>${b}`;
  let fn = cache.get(key);
  if (!fn) {
    const x = MORPH[a] as MorphShape;
    const y = MORPH[b] as MorphShape;
    fn =
      typeof x === 'string' && typeof y === 'string'
        ? interpolate(x, y, OPTS)
        : typeof x === 'string'
        ? separate(x, y as string[], OPTS)
        : typeof y === 'string'
        ? combine(x, y, OPTS)
        : interpolateAll(x, y, OPTS);
    cache.set(key, fn);
  }
  return fn;
};

const pathOf = (n: MorphName) => {
  const s = MORPH[n] as MorphShape;
  return typeof s === 'string' ? s : s.join(' ');
};

// Ease in-out with a soft landing: liquid, not mechanical.
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function MorphIcon({
  name,
  size = 24,
  color,
  gradient,
  duration = 520,
  children,
}: {
  name: MorphName;
  size?: number;
  color?: string;
  gradient?: [string, string];
  duration?: number;
  /** Extra SVG drawn on top once the morph is over (24pt grid). */
  children?: React.ReactNode;
}) {
  const [settled, setSettled] = useState(true);
  const id = `mi${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [d, setD] = useState(() => pathOf(name));
  const shown = useRef(name);
  const swell = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const from = shown.current;
    if (from === name) return;
    shown.current = name;
    const fn = morpher(from, name);
    const start = Date.now();
    let raf = 0;
    setSettled(false);
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setD(t >= 1 ? pathOf(name) : fn(ease(t)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setSettled(true);
    };
    raf = requestAnimationFrame(step);
    Animated.sequence([
      Animated.timing(swell, {
        toValue: 1.14,
        duration: duration * 0.45,
        useNativeDriver: true,
      }),
      Animated.spring(swell, {
        toValue: 1,
        speed: 10,
        bounciness: 14,
        useNativeDriver: true,
      }),
    ]).start();
    return () => cancelAnimationFrame(raf);
  }, [name, duration, swell]);

  return (
    <Animated.View style={{ transform: [{ scale: swell }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {gradient ? (
          <Defs>
            <LinearGradient
              id={id}
              x1="0"
              y1="0"
              x2="24"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Path d={d} fill={gradient ? `url(#${id})` : color} />
        {settled ? children : null}
      </Svg>
    </Animated.View>
  );
}
