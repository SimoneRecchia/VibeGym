/**
 * Small colored stat: icon in a tinted tile, big number, short label.
 * Used in rows of three to give each figure its own color.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/colors';
import { numeric } from '../theme/typography';
import { Icon, IconName } from './Icon';
import { T } from './Text';

export function StatTile({
  icon,
  color,
  value,
  unit,
  label,
}: {
  icon: IconName;
  color: string;
  value: string;
  /** Small unit after the value ("sett."). */
  unit?: string;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: c.card }]}>
      <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Icon name={icon} size={16} color={color} weight={2.3} />
      </View>
      <T style={[numeric(24), { color: c.label }]} numberOfLines={1}>
        {value}
        {unit ? (
          <T v="footnoteStrong" color="secondary">
            {` ${unit}`}
          </T>
        ) : null}
      </T>
      <T v="caption" color="secondary" numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 20, padding: 12, gap: 6 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
