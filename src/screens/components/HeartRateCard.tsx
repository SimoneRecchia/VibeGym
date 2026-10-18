/** Heart rate of a finished workout: average, maximum, energy and a chart. */
import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { ACCENTS, withAlpha } from '../../theme/colors';
import { numeric } from '../../theme/typography';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { T } from '../../ui/Text';
import { monotonePath } from '../../ui/charts/scale';
import type { HeartRateSummary } from '../../hr/heartRate';

const H = 72;

export function HeartRateCard({
  hr,
  style,
}: {
  hr: HeartRateSummary;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, dark } = useTheme();
  const [w, setW] = useState(0);
  const color = ACCENTS.pink[dark ? 'dark' : 'light'];
  const s = hr.series ?? [];
  let line = '';
  let area = '';
  if (w > 0 && s.length > 1) {
    const lo = Math.min(...s) - 5;
    const hi = Math.max(...s) + 5;
    const pts = s.map((v, i) => ({
      x: (i / (s.length - 1)) * w,
      y: 4 + (1 - (v - lo) / (hi - lo)) * (H - 8),
    }));
    line = monotonePath(pts);
    area = `${line} L ${w} ${H} L 0 ${H} Z`;
  }
  return (
    <Card style={style}>
      <View style={styles.head}>
        <View
          style={[styles.icon, { backgroundColor: withAlpha(color, 0.18) }]}
        >
          <Icon name="heart" size={16} color={color} weight={2.4} />
        </View>
        <T v="headline" style={styles.flex}>
          Battito
        </T>
      </View>
      <View style={styles.figures}>
        <Figure value={`${hr.avg}`} unit="bpm" label="Media" />
        <Figure value={`${hr.max}`} unit="bpm" label="Massimo" />
        {hr.kcal != null ? (
          <Figure value={`${hr.kcal}`} unit="kcal" label="Energia" />
        ) : null}
      </View>
      {s.length > 1 ? (
        <View
          style={styles.chart}
          onLayout={e => setW(e.nativeEvent.layout.width)}
        >
          {w > 0 ? (
            <Svg width={w} height={H}>
              <Defs>
                <LinearGradient id="hrArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill="url(#hrArea)" />
              <Path
                d={line}
                stroke={color}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          ) : null}
        </View>
      ) : null}
      <T v="caption" color={c.tertiary} style={styles.note}>
        {hr.kcal != null
          ? 'Energia stimata dal battito (Keytel 2005): sostituisce la stima per durata nel consumo del giorno.'
          : 'Aggiungi età, sesso e peso al profilo per stimare l’energia dal battito.'}
      </T>
    </Card>
  );
}

function Figure({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.flex}>
      <T style={[numeric(22), { color: c.label }]} numberOfLines={1}>
        {value}
        <T v="footnoteStrong" color="secondary">{` ${unit}`}</T>
      </T>
      <T v="caption" color="secondary">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  figures: { flexDirection: 'row', gap: 10, marginTop: 12 },
  chart: { height: H, marginTop: 12 },
  note: { marginTop: 10 },
});
