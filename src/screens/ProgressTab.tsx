/**
 * Left tab: how training is going. Exercises are tracked across plans
 * (matched by catalog id / name), so changing plan never resets progress.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore, selectActivePlan } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { ProfileButton } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { Segmented } from '../ui/Segmented';
import { BarChart } from '../ui/charts/BarChart';
import { Sparkline } from '../ui/charts/Sparkline';
import { Empty } from '../ui/Empty';
import { Icon } from '../ui/Icon';
import { Tap } from '../ui/Pressable';
import { ExerciseThumb } from '../ui/ExerciseMedia';
import { Button } from '../ui/Button';
import {
  exerciseSummaries,
  periodTotals,
  recentRecords,
  weekStreak,
  weeklyActivity,
} from '../stats/progress';
import { METRIC_LABEL } from '../stats/metrics';
import { formatMetric } from './ExerciseTrendScreen';
import { recordText } from './components/recordText';
import {
  fmtClock,
  fmtDateShort,
  fmtNum,
  fmtRelativeDay,
  fmtSigned,
  plural,
} from '../core/format';
import { rangeStart } from '../core/dates';
import { allExercises, keyOf } from '../plan/planUtils';
import { sessionSetsDone } from '../stats/metrics';
import { Nav } from '../navigation/types';

type ActivityMetric = 'workouts' | 'volume' | 'minutes';

export function ProgressTab() {
  const nav = useNavigation<Nav>();
  const { c } = useTheme();
  const sessions = useStore(s => s.sessions);
  const plan = useStore(selectActivePlan);
  const unit = useStore(s => s.settings.unit);
  const [activity, setActivity] = useState<ActivityMetric>('workouts');
  const [scope, setScope] = useState<'plan' | 'all'>(plan ? 'plan' : 'all');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).getTime();
  const month = useMemo(
    () => periodTotals(sessions, monthStart, Date.now() + 1),
    [sessions, monthStart],
  );
  const prevMonth = useMemo(
    () => periodTotals(sessions, prevMonthStart, monthStart),
    [sessions, prevMonthStart, monthStart],
  );
  const weeks = useMemo(() => weeklyActivity(sessions, 12), [sessions]);
  const streak = useMemo(() => weekStreak(sessions), [sessions]);
  const records = useMemo(() => recentRecords(sessions, 5), [sessions]);
  const planKeys = useMemo(
    () =>
      plan
        ? new Set(plan.days.flatMap(d => allExercises(d).map(keyOf)))
        : undefined,
    [plan],
  );
  const exercises = useMemo(
    () =>
      exerciseSummaries(
        sessions,
        rangeStart('3M'),
        scope === 'plan' ? planKeys : undefined,
      ),
    [sessions, scope, planKeys],
  );
  const recent = sessions.slice(-3).reverse();

  if (!sessions.length) {
    return (
      <Screen title="Progressi" right={<ProfileButton />}>
        <Card>
          <Empty
            icon="chart"
            title="I tuoi progressi appariranno qui"
            text="Completa il primo allenamento: carichi, ripetizioni e record verranno tracciati automaticamente per ogni esercizio."
          />
        </Card>
      </Screen>
    );
  }

  const barData = weeks.map(w => ({
    key: String(w.start),
    v:
      activity === 'workouts'
        ? w.workouts
        : activity === 'volume'
        ? w.volume / 1000
        : Math.round(w.minutes),
    label: fmtDateShort(w.start).split(' ')[0],
    tip: `Settimana del ${fmtDateShort(w.start)}`,
  }));

  return (
    <Screen title="Progressi" right={<ProfileButton />}>
      {/* This month */}
      <View style={styles.tiles}>
        <Tile
          label="Allenamenti"
          sub="questo mese"
          value={String(month.workouts)}
          delta={month.workouts - prevMonth.workouts}
        />
        <Tile
          label="Volume"
          sub="questo mese"
          value={`${fmtNum(month.volume / 1000, 1)} t`}
          delta={(month.volume - prevMonth.volume) / 1000}
          decimals={1}
        />
        <Tile
          label="Costanza"
          sub={streak === 1 ? 'settimana di fila' : 'settimane di fila'}
          value={String(streak)}
        />
      </View>

      {/* Weekly activity */}
      <Card style={styles.block}>
        <View style={styles.headRow}>
          <T v="headline">Ultime 12 settimane</T>
        </View>
        <Segmented
          compact
          options={[
            { key: 'workouts', label: 'Allenamenti' },
            { key: 'volume', label: 'Volume' },
            { key: 'minutes', label: 'Minuti' },
          ]}
          value={activity}
          onChange={setActivity}
        />
        <View style={styles.chart}>
          <BarChart
            data={barData}
            format={v =>
              activity === 'workouts'
                ? plural(v, 'allenamento', 'allenamenti')
                : activity === 'volume'
                ? `${fmtNum(v, 1)} t`
                : `${fmtNum(v, 0)} min`
            }
          />
        </View>
      </Card>

      {/* Records */}
      {records.length ? (
        <Card style={styles.block}>
          <T v="headline" style={styles.cardTitle}>
            Record recenti
          </T>
          {records.map(r => (
            <Tap
              key={r.sessionId + r.key + r.kind}
              onPress={() =>
                nav.navigate('ExerciseTrend', { key: r.key, name: r.name })
              }
              scaleTo={0.98}
            >
              <View style={styles.recordRow}>
                <View
                  style={[styles.trophy, { backgroundColor: c.accentSoft }]}
                >
                  <Icon name="trophy" size={18} color={c.accent} />
                </View>
                <View style={styles.flex}>
                  <T v="subheadStrong" numberOfLines={1}>
                    {r.name}
                  </T>
                  <T v="footnote" color="secondary" numberOfLines={1}>
                    {recordText(r, unit)}
                  </T>
                </View>
                <T v="footnote" color="tertiary">
                  {fmtRelativeDay(r.at)}
                </T>
              </View>
            </Tap>
          ))}
        </Card>
      ) : null}

      {/* Exercises */}
      <View style={[styles.sectionHead]}>
        <T v="title3">Esercizi</T>
        <T v="footnote" color="secondary">
          ultimi 3 mesi
        </T>
      </View>
      {plan ? (
        <View style={styles.block}>
          <Segmented
            compact
            options={[
              { key: 'plan', label: 'Scheda attuale' },
              { key: 'all', label: 'Tutti' },
            ]}
            value={scope}
            onChange={setScope}
          />
        </View>
      ) : null}
      {exercises.length ? (
        <Card padded={false} style={styles.block}>
          {exercises.map((e, i) => (
            <Tap
              key={e.key}
              onPress={() =>
                nav.navigate('ExerciseTrend', { key: e.key, name: e.name })
              }
              scaleTo={0.99}
            >
              <View
                style={[
                  styles.exRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.separator,
                  },
                ]}
              >
                <ExerciseThumb
                  catalogId={e.catalogId}
                  kind={e.kind}
                  size={44}
                />
                <View style={styles.flex}>
                  <T v="subheadStrong" numberOfLines={1}>
                    {e.name}
                  </T>
                  <T v="footnote" color="secondary" numberOfLines={1}>
                    {METRIC_LABEL[e.metric]}{' '}
                    {formatMetric(e.metric, e.last, unit)}
                  </T>
                </View>
                <Sparkline points={e.series.slice(-12)} />
                <View style={styles.change}>
                  {e.changePct != null ? (
                    <>
                      <Icon
                        name={
                          e.changePct >= 0
                            ? 'arrow-up-right'
                            : 'arrow-down-right'
                        }
                        size={14}
                        color={e.changePct >= 0 ? c.green : c.red}
                        weight={2.4}
                      />
                      <T v="footnoteStrong">{`${fmtSigned(
                        e.changePct,
                        0,
                      )}%`}</T>
                    </>
                  ) : (
                    <T v="footnote" color="tertiary">
                      nuovo
                    </T>
                  )}
                </View>
              </View>
            </Tap>
          ))}
        </Card>
      ) : (
        <Card style={styles.block}>
          <T v="subhead" color="secondary">
            Nessun esercizio di questa scheda allenato negli ultimi 3 mesi.
          </T>
        </Card>
      )}

      {/* Recent workouts */}
      <View style={styles.sectionHead}>
        <T v="title3">Allenamenti recenti</T>
      </View>
      <Card padded={false} style={styles.block}>
        {recent.map((s, i) => (
          <Tap
            key={s.id}
            onPress={() => nav.navigate('Session', { id: s.id })}
            scaleTo={0.99}
          >
            <View
              style={[
                styles.exRow,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: c.separator,
                },
              ]}
            >
              <View style={styles.flex}>
                <T v="subheadStrong" numberOfLines={1}>
                  {s.dayName}
                </T>
                <T v="footnote" color="secondary">
                  {fmtRelativeDay(s.startedAt)} · {fmtClock(s.durationSec)} ·{' '}
                  {plural(sessionSetsDone(s), 'serie', 'serie')}
                </T>
              </View>
              {s.records?.length ? (
                <Icon name="trophy" size={16} color={c.accent} />
              ) : null}
              <Icon
                name="chevron-right"
                size={16}
                color={c.tertiary}
                weight={2.4}
              />
            </View>
          </Tap>
        ))}
      </Card>
      <Button
        title="Tutto lo storico"
        variant="glass"
        icon="calendar"
        onPress={() => nav.navigate('History')}
      />
    </Screen>
  );
}

function Tile({
  label,
  sub,
  value,
  delta,
  decimals = 0,
}: {
  label: string;
  sub: string;
  value: string;
  delta?: number;
  decimals?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: c.card }]}>
      <T v="footnote" color="secondary" numberOfLines={1}>
        {label}
      </T>
      <T v="title2" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </T>
      <T v="caption" color="tertiary" numberOfLines={1}>
        {delta != null && Math.abs(delta) > 0.0001
          ? `${fmtSigned(delta, decimals)} vs mese scorso`
          : sub}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 22, padding: 12, gap: 2 },
  block: { marginBottom: 12 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chart: { marginTop: 16 },
  cardTitle: { marginBottom: 6 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  trophy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  change: {
    width: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
});
