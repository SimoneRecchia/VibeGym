import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { T } from './Text';
import { haptic } from '../services/haptics';

interface Props<K extends string> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  compact?: boolean;
}

/** iOS 26 segmented control: capsule track with a sliding thumb. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  compact,
}: Props<K>) {
  const { c, dark } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(
    0,
    options.findIndex(o => o.key === value),
  );
  const x = useRef(new Animated.Value(0)).current;
  const segW = w > 0 ? (w - 4) / options.length : 0;

  useEffect(() => {
    Animated.spring(x, {
      toValue: idx * segW,
      useNativeDriver: true,
      speed: 24,
      bounciness: 4,
    }).start();
  }, [idx, segW, x]);

  const h = compact ? 32 : 36;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        { height: h, borderRadius: h / 2, backgroundColor: c.fill3 },
      ]}
      accessibilityRole="tablist"
    >
      {segW > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segW,
              height: h - 4,
              borderRadius: (h - 4) / 2,
              backgroundColor: dark ? c.cardElevated : c.card,
              transform: [{ translateX: x }],
            },
          ]}
        />
      ) : null}
      {options.map(o => (
        <Pressable
          key={o.key}
          style={styles.seg}
          onPress={() => {
            if (o.key !== value) {
              haptic('selection');
              onChange(o.key);
            }
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
        >
          <T
            v={compact ? 'footnoteStrong' : 'subheadStrong'}
            color={o.key === value ? 'label' : 'secondary'}
            numberOfLines={1}
          >
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 2, alignItems: 'center' },
  thumb: {
    position: 'absolute',
    left: 2,
    top: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  seg: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
