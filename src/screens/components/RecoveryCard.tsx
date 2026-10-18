/**
 * Last night's sleep and the resting heart rate from Health Connect /
 * Salute. Hidden when the platform has neither.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ACCENTS, withAlpha } from '../../theme/colors';
import { numeric } from '../../theme/typography';
import { Card } from '../../ui/Card';
import { Icon, IconName } from '../../ui/Icon';
import { T } from '../../ui/Text';
import { useHealthRecovery } from '../../services/health';
import { sleepHint } from '../../stats/health';

const sleepText = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
};

export function RecoveryCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c, dark } = useTheme();
  const r = useHealthRecovery();
  if (!r || (r.sleepMin == null && r.restingHr == null)) return null;
  const hint = sleepHint(r.sleepMin);
  const tone = dark ? 'dark' : 'light';
  return (
    <Card style={style}>
      <T v="headline" style={styles.title}>
        Recupero
      </T>
      <View style={styles.row}>
        {r.sleepMin != null ? (
          <Figure
            icon="moon"
            color={ACCENTS.indigo[tone]}
            value={sleepText(r.sleepMin)}
            label="Sonno stanotte"
          />
        ) : null}
        {r.restingHr != null ? (
          <Figure
            icon="heart"
            color={ACCENTS.pink[tone]}
            value={`${r.restingHr} bpm`}
            label="Battito a riposo"
          />
        ) : null}
      </View>
      {hint ? (
        <View
          style={[styles.hint, { backgroundColor: withAlpha(c.orange, 0.14) }]}
        >
          <Icon name="info" size={15} color={c.orange} />
          <T v="footnote" color={c.orange} style={styles.flex}>
            {hint}
          </T>
        </View>
      ) : null}
    </Card>
  );
}

function Figure({
  icon,
  color,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  value: string;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.figure}>
      <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Icon name={icon} size={18} color={color} weight={2.3} />
      </View>
      <View style={styles.flex}>
        <T style={[numeric(22), { color: c.label }]} numberOfLines={1}>
          {value}
        </T>
        <T v="caption" color="secondary" numberOfLines={1}>
          {label}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  figure: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
});
