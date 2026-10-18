/**
 * Time-series line chart with a scrubbable crosshair + tooltip.
 * 2px lines, ~10% area wash, hairline recessive grid, end-dot with a
 * surface ring; text always in label colors (never the series color).
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { T } from '../Text';
import { compact, monotonePath, niceDomain } from './scale';
import { fmtDateShort } from '../../core/format';
import { haptic } from '../../services/haptics';

export interface Series {
  key: string;
  label: string;
  points: { t: number; v: number }[];
  color: string;
  /** Draw as a line (default) or as dots only. */
  style?: 'line' | 'dots';
  area?: boolean;
}

interface Props {
  series: Series[];
  height?: number;
  format: (v: number) => string;
  /** Series used by the crosshair (defaults to the last one). */
  focusKey?: string;
  /** Horizontal reference (e.g. goal weight). */
  reference?: { v: number; label: string };
  zeroBased?: boolean;
  xFormat?: (t: number) => string;
}

const PAD = { top: 12, right: 44, bottom: 22, left: 2 };

export function LineChart({
  series,
  height = 190,
  format,
  focusKey,
  reference,
  zeroBased,
  xFormat = fmtDateShort,
}: Props) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const lastIdx = useRef<number | null>(null);

  const all = series.flatMap(s => s.points);
  const focus =
    series.find(s => s.key === focusKey) ?? series[series.length - 1];

  const geo = useMemo(() => {
    if (!all.length || !w) return null;
    const tMin = Math.min(...all.map(p => p.t));
    const tMax = Math.max(...all.map(p => p.t));
    const vals = all.map(p => p.v).concat(reference ? [reference.v] : []);
    const dom = niceDomain(Math.min(...vals), Math.max(...vals), 3, zeroBased);
    const iw = w - PAD.left - PAD.right;
    const ih = height - PAD.top - PAD.bottom;
    const x = (t: number) =>
      PAD.left + (tMax === tMin ? iw / 2 : ((t - tMin) / (tMax - tMin)) * iw);
    const y = (v: number) =>
      PAD.top + ih - ((v - dom.lo) / (dom.hi - dom.lo || 1)) * ih;
    return { tMin, tMax, dom, x, y, iw, ih };
  }, [all, w, height, reference, zeroBased]);

  const onTouch = (e: GestureResponderEvent) => {
    if (!geo || !focus?.points.length) return;
    const lx = e.nativeEvent.locationX;
    let best = 0;
    let bd = Infinity;
    focus.points.forEach((p, i) => {
      const d = Math.abs(geo.x(p.t) - lx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (lastIdx.current !== best) {
      lastIdx.current = best;
      haptic('selection');
    }
    setHover(best);
  };
  const endTouch = () => {
    lastIdx.current = null;
    setHover(null);
  };

  const hp = hover != null ? focus?.points[hover] : undefined;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {geo ? (
        <>
          <Svg width={w} height={height}>
            <Defs>
              {series.map(s => (
                <LinearGradient
                  key={s.key}
                  id={`a-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.18} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>
            {geo.dom.ticks.map(v => (
              <React.Fragment key={v}>
                <Line
                  x1={PAD.left}
                  x2={PAD.left + geo.iw}
                  y1={geo.y(v)}
                  y2={geo.y(v)}
                  stroke={c.separator}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
                <SvgText
                  x={w - 2}
                  y={geo.y(v) + 4}
                  fill={c.secondary}
                  fontSize={11}
                  textAnchor="end"
                >
                  {compact(v)}
                </SvgText>
              </React.Fragment>
            ))}
            {reference ? (
              <>
                <Line
                  x1={PAD.left}
                  x2={PAD.left + geo.iw}
                  y1={geo.y(reference.v)}
                  y2={geo.y(reference.v)}
                  stroke={c.green}
                  strokeWidth={1}
                  opacity={0.7}
                />
                <SvgText
                  x={PAD.left + 4}
                  y={geo.y(reference.v) - 5}
                  fill={c.secondary}
                  fontSize={11}
                >
                  {reference.label}
                </SvgText>
              </>
            ) : null}
            {series.map(s => {
              const pts = s.points.map(p => ({ x: geo.x(p.t), y: geo.y(p.v) }));
              if (s.style === 'dots') {
                return pts.map((p, i) => (
                  <Circle
                    key={`${s.key}${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={2.5}
                    fill={s.color}
                  />
                ));
              }
              const d = monotonePath(pts);
              const base = PAD.top + geo.ih;
              return (
                <React.Fragment key={s.key}>
                  {s.area && pts.length > 1 ? (
                    <Path
                      d={`${d}L${pts[pts.length - 1].x},${base}L${
                        pts[0].x
                      },${base}Z`}
                      fill={`url(#a-${s.key})`}
                    />
                  ) : null}
                  <Path
                    d={d}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {pts.length ? (
                    <Circle
                      cx={pts[pts.length - 1].x}
                      cy={pts[pts.length - 1].y}
                      r={4}
                      fill={s.color}
                      stroke={c.card}
                      strokeWidth={2}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
            {hp ? (
              <>
                <Line
                  x1={geo.x(hp.t)}
                  x2={geo.x(hp.t)}
                  y1={PAD.top}
                  y2={PAD.top + geo.ih}
                  stroke={c.secondary}
                  strokeWidth={1}
                />
                <Circle
                  cx={geo.x(hp.t)}
                  cy={geo.y(hp.v)}
                  r={5}
                  fill={focus.color}
                  stroke={c.card}
                  strokeWidth={2}
                />
              </>
            ) : null}
            <SvgText
              x={PAD.left}
              y={height - 6}
              fill={c.secondary}
              fontSize={11}
            >
              {xFormat(geo.tMin)}
            </SvgText>
            {geo.tMax !== geo.tMin ? (
              <SvgText
                x={PAD.left + geo.iw}
                y={height - 6}
                fill={c.secondary}
                fontSize={11}
                textAnchor="end"
              >
                {xFormat(geo.tMax)}
              </SvgText>
            ) : null}
          </Svg>
          {/* Touch layer for the crosshair */}
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onTouch}
            onResponderMove={onTouch}
            onResponderRelease={endTouch}
            onResponderTerminate={endTouch}
            accessible
            accessibilityLabel={`Grafico: ultimo valore ${
              focus?.points.length
                ? format(focus.points[focus.points.length - 1].v)
                : 'nessuno'
            }`}
          />
          {hp ? (
            <View
              pointerEvents="none"
              style={[
                styles.tip,
                {
                  backgroundColor: c.cardElevated,
                  left: Math.min(Math.max(0, geo.x(hp.t) - 60), w - 120),
                },
              ]}
            >
              <T v="subheadStrong" align="center" numberOfLines={1}>
                {format(hp.v)}
              </T>
              <T v="caption" color="secondary" align="center" numberOfLines={1}>
                {fmtDateShort(hp.t)}
              </T>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Legend row — only rendered for charts with 2+ series. */
export function Legend({
  items,
}: {
  items: { label: string; color: string; dots?: boolean }[];
}) {
  return (
    <View style={styles.legend}>
      {items.map(i => (
        <View key={i.label} style={styles.legendItem}>
          <View
            style={
              i.dots
                ? [styles.keyDot, { backgroundColor: i.color }]
                : [styles.keyLine, { backgroundColor: i.color }]
            }
          />
          <T v="footnote" color="secondary">
            {i.label}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    top: -6,
    width: 120,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyLine: { width: 14, height: 3, borderRadius: 2 },
  keyDot: { width: 7, height: 7, borderRadius: 4 },
});
