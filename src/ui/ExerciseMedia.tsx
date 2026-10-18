/**
 * Exercise animation: the two frames of the catalog (start and end position)
 * cross-fade in a loop. If the exercise has no media, the network is down or
 * media is disabled, the component renders nothing and the layout collapses.
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
import { MEDIA_MIRRORS, mediaFrames } from '../catalog';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';

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

/** Resolve the first mirror that serves the frames. */
const useFrames = (
  catalogId: string | undefined,
  enabled: boolean,
): string[] | null => {
  const [frames, setFrames] = useState<string[] | null>(() => {
    const f = mediaFrames(catalogId);
    return f.length && cache.get(f[0])?.status === 'ok' ? f : null;
  });
  useEffect(() => {
    let alive = true;
    if (!enabled || !catalogId) {
      setFrames(null);
      return;
    }
    (async () => {
      for (let m = 0; m < MEDIA_MIRRORS; m++) {
        const f = mediaFrames(catalogId, m);
        if (!f.length) break;
        if (await probe(f)) {
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

export function ExerciseMedia({
  catalogId,
  style,
  animate = true,
  radius = 22,
}: Props) {
  const enabled = useStore(s => s.settings.showMedia);
  const frames = useFrames(catalogId, enabled);
  const fade = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!frames) return;
    Animated.timing(appear, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (!animate || frames.length < 2) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(fade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(fade, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [frames, animate, fade, appear]);

  if (!frames) return null;
  return (
    <Animated.View
      style={[styles.media, { borderRadius: radius, opacity: appear }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Animazione dell'esercizio"
    >
      <Image
        source={{ uri: frames[0] }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {frames[1] ? (
        <Animated.Image
          source={{ uri: frames[1] }}
          style={[StyleSheet.absoluteFill, { opacity: fade }]}
          resizeMode="cover"
        />
      ) : null}
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
  const frame = mediaFrames(catalogId)[0];
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
          style={{ width: size, height: size }}
          resizeMode="cover"
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
    backgroundColor: '#FFFFFF',
  },
  thumb: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
