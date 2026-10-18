/**
 * Exercise animation. Common exercises use the 3-frame line drawings of
 * Workout Guide (tinted with the theme, stepping like a GIF); the others
 * cross-fade the two photos of free-exercise-db. Without media, network or
 * with media disabled the component renders nothing and the layout collapses.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { MEDIA_MIRRORS, MediaKind, mediaSource } from '../catalog';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';

const PHOTO_BG = '#FFFFFF';

type Status = 'ok' | 'fail';
/** url → status, shared across screens so repeated mounts are instant. */
const cache = new Map<string, { status: Status; at: number }>();
const RETRY_MS = 60_000;

const probe = async (urls: string[]): Promise<boolean> => {
  const key = urls[0];
  const hit = cache.get(key);
  if (hit && (hit.status === 'ok' || Date.now() - hit.at < RETRY_MS))
    return hit.status === 'ok';
  try {
    const ok = (await Promise.all(urls.map(u => Image.prefetch(u)))).every(
      Boolean,
    );
    cache.set(key, { status: ok ? 'ok' : 'fail', at: Date.now() });
    return ok;
  } catch {
    cache.set(key, { status: 'fail', at: Date.now() });
    return false;
  }
};

interface Frames {
  kind: MediaKind;
  urls: string[];
}

/** Resolve the first mirror that serves the frames. */
const useFrames = (
  catalogId: string | undefined,
  enabled: boolean,
): Frames | null => {
  const [frames, setFrames] = useState<Frames | null>(() => {
    const f = mediaSource(catalogId);
    return f.urls.length && cache.get(f.urls[0])?.status === 'ok' ? f : null;
  });
  useEffect(() => {
    let alive = true;
    if (!enabled || !catalogId) {
      setFrames(null);
      return;
    }
    (async () => {
      for (let m = 0; m < MEDIA_MIRRORS; m++) {
        const f = mediaSource(catalogId, m);
        if (!f.urls.length) break;
        if (await probe(f.urls)) {
          if (alive) setFrames(f);
          return;
        }
      }
      if (alive) setFrames(null);
    })();
    return () => {
      alive = false;
    };
  }, [catalogId, enabled]);
  return frames;
};

interface Props {
  catalogId?: string;
  style?: StyleProp<ViewStyle>;
  /** Animate between frames (false = still image). */
  animate?: boolean;
  radius?: number;
}

/** Ping-pong order of the frames: 0 1 2 1 0 … */
const sequence = (n: number) =>
  n <= 2
    ? [0, 1]
    : [
        ...Array.from({ length: n }, (_, i) => i),
        ...Array.from({ length: n - 2 }, (_, i) => n - 2 - i),
      ];

export function ExerciseMedia({
  catalogId,
  style,
  animate = true,
  radius = 22,
}: Props) {
  const { c } = useTheme();
  const enabled = useStore(s => s.settings.showMedia);
  const frames = useFrames(catalogId, enabled);
  const t = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!frames) return;
    Animated.timing(appear, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (!animate || frames.urls.length < 2) return;
    const line = frames.kind === 'line';
    const steps = sequence(frames.urls.length).slice(1).concat(0);
    const loop = Animated.loop(
      Animated.sequence(
        steps.flatMap(i => [
          Animated.delay(line ? 520 : 700),
          Animated.timing(t, {
            toValue: i,
            duration: line ? 160 : 450,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    t.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [frames, animate, t, appear]);

  if (!frames) return null;
  const line = frames.kind === 'line';
  const n = frames.urls.length;
  // Photos are opaque and simply stack; transparent drawings must also fade
  // the first frame out, or its lines would show through the others.
  const bg = line ? c.fill4 : PHOTO_BG;
  return (
    <Animated.View
      style={[
        styles.media,
        {
          borderRadius: radius,
          opacity: appear,
          backgroundColor: bg,
        },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Animazione dell'esercizio"
    >
      {frames.urls.map((u, i) => (
        <Animated.Image
          key={u}
          source={{ uri: u }}
          style={[
            line ? styles.line : StyleSheet.absoluteFill,
            line && { tintColor: c.label },
            i > 0 && {
              opacity: t.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, i + 1 < n ? 0 : 1],
                extrapolate: 'clamp',
              }),
            },
            i === 0 &&
              line &&
              n > 1 && {
                opacity: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
          ]}
          resizeMode={line ? 'contain' : 'cover'}
        />
      ))}
    </Animated.View>
  );
}

/** Small square preview for lists; falls back to a glyph tile. */
export function ExerciseThumb({
  catalogId,
  size = 48,
  kind,
}: {
  catalogId?: string;
  size?: number;
  kind?: 'reps' | 'time' | 'cardio';
}) {
  const { c } = useTheme();
  const enabled = useStore(s => s.settings.showMedia);
  const [failed, setFailed] = useState(false);
  const src = mediaSource(catalogId);
  const frame = src.urls[0];
  const showImage = enabled && frame && !failed;
  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: c.fill3,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: frame }}
          style={[
            { width: size, height: size },
            src.kind === 'line' && { tintColor: c.label },
          ]}
          resizeMode={src.kind === 'line' ? 'contain' : 'cover'}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon
          name={
            kind === 'cardio' ? 'run' : kind === 'time' ? 'timer' : 'dumbbell'
          }
          size={size * 0.5}
          color={c.secondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    aspectRatio: 3 / 2,
    overflow: 'hidden',
  },
  line: { position: 'absolute', top: '6%', bottom: '6%', left: 0, right: 0 },
  thumb: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
