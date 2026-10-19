/**
 * Column chart for weekly totals. Columns ≤ 24px, 4px rounded tops anchored
 * to a single baseline; history in a light step of the accent, current
 * period in the accent. Tap / drag shows the value.
 */
import React, { useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../Text';
import { compact, niceDomain } from './scale';
import { haptic } from '../../services/haptics';
import { withAlpha } from '../../theme/colors';

interface Props {
  data: { key: string; v: number; label: string; tip: string }[];
  height?: number;
  format: (v: number) => string;
}

const PAD = { top: 10, right: 34, bottom: 20 };

/** Column path with rounded top corners and a square base. */
const column = (x: number, y: number, w: number, h: number, r: number) => {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${
    x + w
  },${y} ${x + w},${y + rr}V${y + h}Z`;
};

export function BarChart({ data, height = 150, format }: Props) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.v));
  const dom = niceDomain(0, max, 2, true);
  const iw = Math.max(0, w - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const slot = data.length ? iw / data.length : 0;
  const bw = Math.min(24, Math.max(4, slot - 6));
  const y = (v: number) => PAD.top + ih - (v / (dom.hi || 1)) * ih;

  const onTouch = (e: GestureResponderEvent) => {
    if (!slot) return;
    const i = Math.min(
      data.length - 1,
      Math.max(0, Math.floor(e.nativeEvent.locationX / slot)),
    );
    if (i !== hover) haptic('selection');
    setHover(i);
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {w ? (
        <>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="barNow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.accentGrad[1]} />
                <Stop offset="1" stopColor={c.accentGrad[0]} />
              </LinearGradient>
            </Defs>
            {dom.ticks.map(v => (
              <React.Fragment key={v}>
                <Line
                  x1={0}
                  x2={iw}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={c.separator}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
                <SvgText
                  x={w - 2}
                  y={y(v) + 4}
                  fill={c.secondary}
                  fontSize={11}
                  textAnchor="end"
                >
                  {compact(v)}
                </SvgText>
              </React.Fragment>
            ))}
            {data.map((d, i) => {
              const x = i * slot + (slot - bw) / 2;
              const top = y(d.v);
              const current = i === data.length - 1;
              const active = hover === i;
              return (
                <Path
                  key={d.key}
                  d={column(
                    x,
                    top,
                    bw,
                    PAD.top + ih - top,
                    Math.min(6, bw / 2),
                  )}
                  fill={
                    current || active
                      ? 'url(#barNow)'
                      : withAlpha(c.accent, 0.3)
                  }
                />
              );
            })}
            {data.map((d, i) =>
              i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
                <SvgText
                  key={`l${d.key}`}
                  x={i * slot + slot / 2}
                  y={height - 5}
                  fill={c.secondary}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onTouch}
            onResponderMove={onTouch}
            onResponderRelease={() => setHover(null)}
            onResponderTerminate={() => setHover(null)}
          />
          {hover != null ? (
            <View
              pointerEvents="none"
              style={[
                styles.tip,
                {
                  backgroundColor: c.cardElevated,
                  left: Math.min(
                    Math.max(0, hover * slot + slot / 2 - 65),
                    w - 130,
                  ),
                },
              ]}
            >
              <T v="subheadStrong" align="center">
                {format(data[hover].v)}
              </T>
              <T v="caption" color="secondary" align="center">
                {data[hover].tip}
              </T>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    top: -8,
    width: 130,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
