/**
 * Progression of one exercise across all plans (matched by catalog id or
 * name): metric picker, time range, scrubbable chart and the session table.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { Segmented } from '../ui/Segmented';
import { LineChart } from '../ui/charts/LineChart';
import { Empty } from '../ui/Empty';
import { Tap } from '../ui/Pressable';
import { Icon } from '../ui/Icon';
import { ExerciseMedia } from '../ui/ExerciseMedia';
import {
  MetricKey,
  METRIC_LABEL,
  metricsFor,
  metricsOf,
} from '../stats/metrics';
import { exerciseSeries } from '../stats/progress';
import { RANGE_KEYS, RangeKey, rangeStart } from '../core/dates';
import {
  fmtClock,
  fmtDate,
  fmtDuration,
  fmtNum,
  fmtSigned,
} from '../core/format';
import { fmtLoad, fmtLoadValue, toDisplay } from '../core/units';
import { ScreenProps } from '../navigation/types';
import { DisplayUnit } from '../core/types';

export const formatMetric = (
  m: MetricKey,
  v: number,
  unit: DisplayUnit,
): string => {
  switch (m) {
    case 'e1rm':
    case 'maxKg':
      return fmtLoad(v, unit);
    case 'volume':
      return `${fmtNum(toDisplay(v, unit), 0)} ${unit}`;
    case 'maxSec':
    case 'totalSec':
      return fmtDuration(v);
    case 'km':
      return `${fmtNum(v, 2)} km`;
    default:
      return fmtNum(v, 0);
  }
};

export function ExerciseTrendScreen({
  route,
  navigation,
}: ScreenProps<'ExerciseTrend'>) {
  const { c } = useTheme();
  const { key, name } = route.params;
  const sessions = useStore(s => s.sessions);
  const unit = useStore(s => s.settings.unit);

  const entries = useMemo(
    () =>
      sessions
        .map(s => ({
          s,
          ex: s.exercises.find(e => e.key === key && e.sets.some(x => x.done)),
        }))
        .filter(x => !!x.ex),
    [sessions, key],
  );
  const kind = entries[entries.length - 1]?.ex?.kind ?? 'reps';
  const catalogId = entries[entries.length - 1]?.ex?.catalogId;
  const weighted = entries.some(e => metricsOf(e.ex!).maxKg > 0);
  const metrics = metricsFor(kind, weighted);
  const [metric, setMetric] = useState<MetricKey>(metrics[0]);
  const [range, setRange] = useState<RangeKey>('3M');

  const points = useMemo(
    () => exerciseSeries(sessions, key, metric, rangeStart(range)),
    [sessions, key, metric, range],
  );
  const all = useMemo(
    () => exerciseSeries(sessions, key, metric),
    [sessions, key, metric],
  );
  const best = all.length ? Math.max(...all.map(p => p.v)) : 0;
  const last = points[points.length - 1]?.v;
  const first = points[0]?.v;
  const change =
    points.length >= 2 && first ? ((last! - first) / first) * 100 : null;

  return (
    <Screen title={name} eyebrow="Progressi" back>
      {catalogId ? (
        <ExerciseMedia catalogId={catalogId} style={styles.media} />
      ) : null}
      {!entries.length ? (
        <Card>
          <Empty
            icon="chart"
            title="Nessun dato"
            text="Completa almeno una serie di questo esercizio per vedere i progressi."
          />
        </Card>
      ) : (
        <>
          {metrics.length > 1 ? (
            <View style={styles.block}>
              <Segmented
                compact
                options={metrics.map(m => ({ key: m, label: METRIC_LABEL[m] }))}
                value={metric}
                onChange={setMetric}
              />
            </View>
          ) : null}
          <Card style={styles.block}>
            <View style={styles.headline}>
              <View>
                <T v="footnote" color="secondary">
                  {METRIC_LABEL[metric]}
                </T>
                <T v="title1">
                  {last != null ? formatMetric(metric, last, unit) : '–'}
                </T>
              </View>
              {change != null ? (
                <View style={styles.change}>
                  <Icon
                    name={change >= 0 ? 'arrow-up-right' : 'arrow-down-right'}
                    size={16}
                    color={change >= 0 ? c.green : c.red}
                    weight={2.4}
                  />
                  <T v="subheadStrong">{`${fmtSigned(change, 1)}%`}</T>
                </View>
              ) : null}
            </View>
            {points.length ? (
              <LineChart
                series={[
                  {
                    key: 'm',
                    label: METRIC_LABEL[metric],
                    points: points.map(p => ({
                      t: p.t,
                      v:
                        metric === 'e1rm' ||
                        metric === 'maxKg' ||
                        metric === 'volume'
                          ? toDisplay(p.v, unit)
                          : p.v,
                    })),
                    color: c.accent,
                    area: true,
                  },
                ]}
                format={v =>
                  metric === 'e1rm' || metric === 'maxKg' || metric === 'volume'
                    ? `${fmtNum(v, 1)} ${unit}`
                    : formatMetric(metric, v, unit)
                }
              />
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

          <View style={styles.statsRow}>
            <MiniStat
              label="Migliore"
              value={formatMetric(metric, best, unit)}
            />
            <MiniStat label="Sessioni" value={String(entries.length)} />
            <MiniStat
              label="Nel periodo"
              value={change != null ? `${fmtSigned(change, 1)}%` : '–'}
            />
          </View>

          <T v="title3" style={styles.section}>
            Sessioni
          </T>
          {[...entries].reverse().map(({ s, ex }) => {
            const done = ex!.sets.filter(x => x.done);
            return (
              <Tap
                key={s.id}
                onPress={() => navigation.navigate('Session', { id: s.id })}
                scaleTo={0.98}
              >
                <Card style={styles.sessionCard}>
                  <View style={styles.sessionHead}>
                    <T v="headline">{fmtDate(s.startedAt)}</T>
                    <T v="footnote" color="secondary">
                      {s.dayName}
                    </T>
                  </View>
                  <T v="subhead" color="secondary">
                    {done
                      .map(x =>
                        ex!.kind === 'reps'
                          ? `${x.kg ? fmtLoadValue(x.kg, unit) : '0'}×${
                              x.reps ?? 0
                            }`
                          : ex!.kind === 'time'
                          ? `${x.sec ?? 0}s`
                          : `${fmtClock(x.sec ?? 0)}${
                              x.km ? ` ${fmtNum(x.km, 2)}km` : ''
                            }`,
                      )
                      .join('  ·  ')}
                  </T>
                </Card>
              </Tap>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.mini, { backgroundColor: c.card }]}>
      <T v="headline" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T v="footnote" color="secondary">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  media: { marginBottom: 12 },
  block: { marginBottom: 12 },
  headline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noData: { paddingVertical: 40, textAlign: 'center' },
  range: { marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, borderRadius: 20, padding: 12 },
  section: { marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  sessionCard: { marginBottom: 8, gap: 4 },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
