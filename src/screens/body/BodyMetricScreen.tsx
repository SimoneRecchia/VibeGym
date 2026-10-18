import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Segmented } from '../../ui/Segmented';
import { LineChart, Legend } from '../../ui/charts/LineChart';
import { Tap } from '../../ui/Pressable';
import { Icon } from '../../ui/Icon';
import {
  BODY_METRICS,
  CompositionKey,
  MEASURE_LABEL,
  compositionPoints,
  movingAverage,
  weightPoints,
} from '../../stats/body';
import { RANGE_KEYS, RangeKey, rangeStart } from '../../core/dates';
import { fmtDate, fmtNum, fmtTime } from '../../core/format';
import { toDisplay } from '../../core/units';
import { BodyEntry, MeasureKey } from '../../core/types';
import { SettingsProps } from '../../navigation/types';
import { WeighDetailSheet } from './WeighDetail';
import { healthPlatformName } from '../../services/health';

interface Row {
  id: string;
  date: string;
  value: number;
  sub?: string;
}

export function BodyMetricScreen({ route }: SettingsProps<'BodyMetric'>) {
  const { c } = useTheme();
  const { metric } = route.params;
  const body = useStore(s => s.body);
  const measures = useStore(s => s.measures);
  const unit = useStore(s => s.settings.unit);
  const deleteBody = useStore(s => s.deleteBodyEntry);
  const deleteMeasure = useStore(s => s.deleteMeasure);
  const [range, setRange] = useState<RangeKey>('6M');
  const [detail, setDetail] = useState<BodyEntry | null>(null);

  const isWeight = metric === 'weight';
  const measureKey = metric.startsWith('measure:')
    ? (metric.slice(8) as MeasureKey)
    : null;
  const comp = BODY_METRICS.find(m => m.key === metric);

  const { title, unitLabel, decimals, points, rows } = useMemo(() => {
    if (isWeight) {
      return {
        title: 'Peso',
        unitLabel: unit,
        decimals: 1,
        points: weightPoints(body).map(p => ({
          t: p.t,
          v: toDisplay(p.v, unit),
        })),
        rows: body.map<Row>(b => ({
          id: b.id,
          date: b.date,
          value: toDisplay(b.weightKg, unit),
          sub:
            b.source === 'scale'
              ? 'Bilancia'
              : b.source === 'health'
              ? b.sourceApp ?? healthPlatformName
              : 'A mano',
        })),
      };
    }
    if (measureKey) {
      const list = measures.filter(m => m.values[measureKey] != null);
      return {
        title: MEASURE_LABEL[measureKey],
        unitLabel: 'cm',
        decimals: 1,
        points: list.map(m => ({
          t: Date.parse(m.date),
          v: m.values[measureKey]!,
        })),
        rows: list.map<Row>(m => ({
          id: m.id,
          date: m.date,
          value: m.values[measureKey]!,
        })),
      };
    }
    const key = metric as CompositionKey;
    return {
      title: comp?.label ?? 'Metrica',
      unitLabel: comp?.unit ?? '',
      decimals: comp?.decimals ?? 1,
      points: compositionPoints(body, key),
      rows: body
        .filter(b => b[key] != null)
        .map<Row>(b => ({ id: b.id, date: b.date, value: b[key] as number })),
    };
  }, [isWeight, measureKey, metric, comp, body, measures, unit]);

  const since = rangeStart(range);
  const shown = points.filter(p => p.t >= since);
  const avg = isWeight ? movingAverage(points).filter(p => p.t >= since) : [];
  const fmt = (v: number) =>
    `${fmtNum(v, decimals)}${unitLabel ? ` ${unitLabel}` : ''}`;

  const remove = (r: Row) =>
    Alert.alert(
      'Eliminare questo valore?',
      `${fmt(r.value)} del ${fmtDate(r.date)}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => (measureKey ? deleteMeasure(r.id) : deleteBody(r.id)),
        },
      ],
    );

  return (
    <Screen title={title} eyebrow="Corpo" back>
      <Card style={styles.block}>
        {shown.length ? (
          <>
            <LineChart
              series={
                isWeight
                  ? [
                      {
                        key: 'raw',
                        label: 'Pesate',
                        points: shown,
                        color: c.tertiary,
                        style: 'dots',
                      },
                      {
                        key: 'avg',
                        label: 'Media 7 giorni',
                        points: avg,
                        color: c.accent,
                        area: true,
                      },
                    ]
                  : [
                      {
                        key: 'v',
                        label: title,
                        points: shown,
                        color: c.accent,
                        area: true,
                      },
                    ]
              }
              focusKey={isWeight ? 'avg' : 'v'}
              format={fmt}
              height={220}
            />
            {isWeight ? (
              <Legend
                items={[
                  { label: 'Media 7 giorni', color: c.accent },
                  { label: 'Pesate', color: c.tertiary, dots: true },
                ]}
              />
            ) : null}
          </>
        ) : (
          <T v="subhead" color="secondary" style={styles.noData}>
            Nessun dato in questo periodo.
          </T>
        )}
        <View style={styles.range}>
          <Segmented
            compact
            options={RANGE_KEYS.map(r => ({ key: r, label: r }))}
            value={range}
            onChange={setRange}
          />
        </View>
      </Card>

      <T v="footnote" color="secondary" style={styles.hint}>
        {measureKey
          ? 'Tieni premuto un valore per eliminarlo.'
          : 'Tocca una pesata per vedere tutti i dati salvati.'}
      </T>
      <Card padded={false}>
        {[...rows].reverse().map((r, i) => (
          <Tap
            key={r.id}
            onPress={
              measureKey
                ? undefined
                : () => setDetail(body.find(b => b.id === r.id) ?? null)
            }
            onLongPress={() => remove(r)}
            feedback={null}
            scaleTo={0.99}
          >
            <View
              style={[
                styles.row,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: c.separator,
                },
              ]}
            >
              <View style={styles.flex}>
                <T v="body">{fmtDate(r.date)}</T>
                <T v="footnote" color="secondary">
                  {fmtTime(r.date)}
                  {r.sub ? ` · ${r.sub}` : ''}
                </T>
              </View>
              <T v="headline">{fmt(r.value)}</T>
              {r.sub === 'Bilancia' ? (
                <Icon name="bluetooth" size={14} color={c.tertiary} />
              ) : null}
              {measureKey ? null : (
                <Icon
                  name="chevron-right"
                  size={16}
                  color={c.tertiary}
                  weight={2.4}
                />
              )}
            </View>
          </Tap>
        ))}
      </Card>
      <WeighDetailSheet entry={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  noData: { paddingVertical: 40, textAlign: 'center' },
  range: { marginTop: 12 },
  hint: { marginBottom: 8, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  flex: { flex: 1 },
});
