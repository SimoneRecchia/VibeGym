/**
 * A few key numbers side by side in one card, without boxes: big rounded
 * value, label, and optionally the change from the previous period.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { numeric } from '../theme/typography';
import { fmtSigned } from '../core/format';
import { T } from './Text';

export function Figures({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Figure({
  label,
  value,
  delta,
  decimals = 0,
  color,
  size = 28,
}: {
  label: string;
  value: string;
  delta?: number;
  decimals?: number;
  color?: string;
  size?: number;
}) {
  const { c } = useTheme();
  const up = (delta ?? 0) > 0.0001;
  const down = (delta ?? 0) < -0.0001;
  return (
    <View style={styles.figure}>
      <T
        style={[numeric(size), { color: color ?? c.label }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </T>
      <T v="footnote" color="secondary" numberOfLines={1}>
        {label}
      </T>
      {up || down ? (
        <T v="caption" color={up ? c.done[0] : c.red} numberOfLines={1}>
          {`${fmtSigned(delta!, decimals)} vs scorso`}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16 },
  figure: { flex: 1, minWidth: 0, gap: 2 },
});
