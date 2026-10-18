/**
 * Weight at a glance: last weigh-in, smoothed trend, change and the next
 * scheduled weigh-in. Compact in the profile, with a chart in Progressi.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Sparkline } from '../../ui/charts/Sparkline';
import { LineChart } from '../../ui/charts/LineChart';
import { Icon } from '../../ui/Icon';
import { WeighSheet } from './WeighSheet';
import {
  movingAverage,
  weeklyRate,
  weightChange,
  weightPoints,
} from '../../stats/body';
import { rangeStart } from '../../core/dates';
import {
  fmtNum,
  fmtRelativeDay,
  fmtSigned,
  fmtUpcomingDay,
} from '../../core/format';
import { toDisplay } from '../../core/units';
import { numeric } from '../../theme/typography';
import { isWeighDue, nextWeighDue } from '../../body/schedule';

export function WeightCard({
  onOpen,
  chart,
  style,
}: {
  onOpen: () => void;
  chart?: boolean;
  style?: object;
}) {
  const { c } = useTheme();
  const body = useStore(s => s.body);
  const unit = useStore(s => s.settings.unit);
  const weigh = useStore(s => s.settings.weigh);
  const goal = useStore(s => s.profile.goalWeightKg);
  const hasScale = useStore(s => !!s.settings.scale.deviceId);
  const [weighing, setWeighing] = useState(false);

  const latest = body[body.length - 1];
  const avg = useMemo(() => movingAverage(weightPoints(body)), [body]);
  const since = rangeStart('3M');
  const shown = useMemo(
    () =>
      avg
        .filter(p => p.t >= since)
        .map(p => ({ t: p.t, v: toDisplay(p.v, unit) })),
    [avg, since, unit],
  );
  const d30 = useMemo(() => weightChange(body, 30), [body]);
  const rate = useMemo(() => weeklyRate(body), [body]);
  const due = weigh.enabled && isWeighDue(latest?.date, weigh);
  const next = nextWeighDue(latest?.date, weigh);

  const sheet = (
    <WeighSheet visible={weighing} onClose={() => setWeighing(false)} />
  );

  if (!latest) {
    return (
      <Card style={style} onPress={onOpen}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Icon name="scale" size={22} color={c.accent} />
          </View>
          <View style={styles.flex}>
            <T v="headline">Peso</T>
            <T v="footnote" color="secondary">
              Registra il primo peso per vedere il trend.
            </T>
          </View>
          <Button
            title="Pesati"
            size="s"
            icon={hasScale ? 'bluetooth' : 'plus'}
            onPress={() => setWeighing(true)}
          />
        </View>
        {sheet}
      </Card>
    );
  }

  return (
    <Card style={style} onPress={onOpen} accessibilityLabel="Peso e corpo">
      <View style={styles.row}>
        <View style={styles.flex}>
          <T v="footnote" color="secondary">
            Peso · {fmtRelativeDay(latest.date)}
          </T>
          <View style={styles.value}>
            <T style={[numeric(chart ? 34 : 30), { color: c.label }]}>
              {fmtNum(toDisplay(latest.weightKg, unit), 1)}
            </T>
            <T v="headline" color="secondary">
              {unit}
            </T>
          </View>
        </View>
        {!chart ? <Sparkline points={shown} width={84} height={34} /> : null}
        <Button
          title="Pesati"
          size="s"
          variant={due ? 'prominent' : 'tinted'}
          icon={hasScale ? 'bluetooth' : 'plus'}
          onPress={() => setWeighing(true)}
        />
      </View>

      {chart && shown.length > 1 ? (
        <View style={styles.chart}>
          <LineChart
            series={[
              {
                key: 'avg',
                label: 'Media 7 giorni',
                points: shown,
                color: c.accent,
                area: true,
              },
            ]}
            focusKey="avg"
            height={140}
            format={v => `${fmtNum(v, 1)} ${unit}`}
            reference={
              goal
                ? { v: toDisplay(goal, unit), label: 'Obiettivo' }
                : undefined
            }
          />
        </View>
      ) : null}

      <View style={styles.facts}>
        {d30 != null ? (
          <T v="footnote" color="secondary">
            <T v="footnoteStrong">
              {fmtSigned(toDisplay(d30, unit), 1)} {unit}
            </T>{' '}
            in 30 giorni
          </T>
        ) : null}
        {rate != null && chart ? (
          <T v="footnote" color="secondary">
            <T v="footnoteStrong">
              {fmtSigned(toDisplay(rate, unit), 2)} {unit}
            </T>{' '}
            a settimana
          </T>
        ) : null}
        {weigh.enabled ? (
          <T v="footnote" color={due ? 'accent' : 'secondary'}>
            {due
              ? 'È ora di pesarti'
              : next
              ? `Prossima pesata ${fmtUpcomingDay(next)}`
              : ''}
          </T>
        ) : null}
      </View>
      {sheet}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: { marginTop: 12 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
    marginTop: 10,
  },
});
