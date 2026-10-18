/**
 * Body, inside the profile: weight (smoothed trend + goal), composition from
 * the Xiaomi scale, and monthly measurements.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../ui/Screen';
import { Card } from '../../ui/Card';
import { T } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { Empty } from '../../ui/Empty';
import { Icon } from '../../ui/Icon';
import { Tap } from '../../ui/Pressable';
import { LineChart, Legend } from '../../ui/charts/LineChart';
import { WeighSheet } from './WeighSheet';
import { MeasuresSheet } from './MeasuresSheet';
import {
  COMPOSITION,
  bmi,
  bmiCategory,
  latestMeasures,
  movingAverage,
  weeklyRate,
  weightChange,
  weightPoints,
} from '../../stats/body';
import { RANGE_KEYS, RangeKey, rangeStart } from '../../core/dates';
import { fmtNum, fmtRelativeDay, fmtSigned } from '../../core/format';
import { toDisplay } from '../../core/units';
import { numeric } from '../../theme/typography';
import { SettingsProps } from '../../navigation/types';
import { IconButton } from '../../ui/Button';
import { fmtInterval } from '../../body/schedule';

export function BodyScreen({ navigation: nav }: SettingsProps<'Body'>) {
  const { c } = useTheme();
  const weigh = useStore(s => s.settings.weigh);
  const body = useStore(s => s.body);
  const measures = useStore(s => s.measures);
  const profile = useStore(s => s.profile);
  const unit = useStore(s => s.settings.unit);
  const hasScale = useStore(s => !!s.settings.scale.deviceId);
  const [weighing, setWeighing] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [range, setRange] = useState<RangeKey>('3M');

  const latest = body[body.length - 1];
  const pts = useMemo(() => weightPoints(body), [body]);
  const avg = useMemo(() => movingAverage(pts), [pts]);
  const since = rangeStart(range);
  const d7 = useMemo(() => weightChange(body, 7), [body]);
  const d30 = useMemo(() => weightChange(body, 30), [body]);
  const rate = useMemo(() => weeklyRate(body), [body]);
  const lastComp = [...body].reverse().find(b => b.fatPct != null);
  const prevComp = [...body].reverse().filter(b => b.fatPct != null)[1];
  const mm = useMemo(() => latestMeasures(measures), [measures]);

  const dispPts = (p: { t: number; v: number }[]) =>
    p.filter(x => x.t >= since).map(x => ({ t: x.t, v: toDisplay(x.v, unit) }));
  const goal = profile.goalWeightKg;
  const bmiValue = latest ? bmi(latest.weightKg, profile.heightCm) : null;

  const sheets = (
    <>
      <WeighSheet visible={weighing} onClose={() => setWeighing(false)} />
      <MeasuresSheet visible={measuring} onClose={() => setMeasuring(false)} />
    </>
  );

  if (!latest) {
    return (
      <Screen
        title="Corpo"
        back
        eyebrow={weigh.enabled ? fmtInterval(weigh) : undefined}
        right={
          <IconButton
            icon="gear"
            onPress={() => nav.navigate('WeighSettings')}
            accessibilityLabel="Frequenza della pesata"
          />
        }
      >
        <Card>
          <Empty
            icon="scale"
            title="Inizia a tracciare il peso"
            text="Pesati la mattina, a digiuno: l'app calcola la media mobile così le oscillazioni giornaliere non ti confondono."
          >
            <Button
              title="Pesati ora"
              icon="plus"
              onPress={() => setWeighing(true)}
            />
            {!hasScale ? (
              <Button
                title="Collega la bilancia Xiaomi"
                icon="bluetooth"
                variant="glass"
                onPress={() => nav.navigate('ScaleSettings')}
              />
            ) : null}
          </Empty>
        </Card>
        {sheets}
      </Screen>
    );
  }

  return (
    <Screen
      title="Corpo"
      back
      eyebrow={weigh.enabled ? fmtInterval(weigh) : undefined}
      right={
        <IconButton
          icon="gear"
          onPress={() => nav.navigate('WeighSettings')}
          accessibilityLabel="Frequenza della pesata"
        />
      }
    >
      {/* Hero */}
      <Card style={styles.block}>
        <View style={styles.heroTop}>
          <View style={styles.flex}>
            <T v="footnote" color="secondary">
              Peso · {fmtRelativeDay(latest.date)}
            </T>
            <View style={styles.heroValue}>
              <T style={[numeric(52), { color: c.label }]}>
                {fmtNum(toDisplay(latest.weightKg, unit), 1)}
              </T>
              <T v="title3" color="secondary">
                {unit}
              </T>
            </View>
          </View>
          <Button
            title="Pesati"
            icon={hasScale ? 'bluetooth' : 'plus'}
            size="m"
            onPress={() => setWeighing(true)}
          />
        </View>
        <View style={styles.deltas}>
          <Delta label="7 giorni" kg={d7} unit={unit} />
          <Delta label="30 giorni" kg={d30} unit={unit} />
          {rate != null ? (
            <Delta label="a settimana" kg={rate} unit={unit} />
          ) : null}
        </View>
        {goal ? (
          <GoalBar
            current={latest.weightKg}
            goal={goal}
            start={body[0].weightKg}
            unit={unit}
          />
        ) : null}
      </Card>

      {/* Trend */}
      <Card style={styles.block}>
        {pts.filter(p => p.t >= since).length ? (
          <>
            <LineChart
              series={[
                {
                  key: 'raw',
                  label: 'Pesate',
                  points: dispPts(pts),
                  color: c.tertiary,
                  style: 'dots',
                },
                {
                  key: 'avg',
                  label: 'Media 7 giorni',
                  points: dispPts(avg),
                  color: c.accent,
                  area: true,
                },
              ]}
              focusKey="avg"
              format={v => `${fmtNum(v, 1)} ${unit}`}
              reference={
                goal
                  ? { v: toDisplay(goal, unit), label: 'Obiettivo' }
                  : undefined
              }
            />
            <Legend
              items={[
                { label: 'Media 7 giorni', color: c.accent },
                { label: 'Pesate', color: c.tertiary, dots: true },
              ]}
            />
          </>
        ) : (
          <T v="subhead" color="secondary" style={styles.noData}>
            Nessuna pesata in questo periodo.
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
        <Tap
          onPress={() => nav.navigate('BodyMetric', { metric: 'weight' })}
          style={styles.link}
        >
          <T v="subhead" color="accent">
            Tutte le pesate
          </T>
        </Tap>
      </Card>

      {/* BMI */}
      {bmiValue ? (
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <View>
              <T v="footnote" color="secondary">
                Indice di massa corporea
              </T>
              <T v="title2">{fmtNum(bmiValue, 1)}</T>
            </View>
            <T v="subheadStrong" color="secondary">
              {bmiCategory(bmiValue)}
            </T>
          </View>
        </Card>
      ) : null}

      {/* Composition */}
      {lastComp ? (
        <>
          <View style={styles.sectionHead}>
            <T v="title3">Composizione</T>
            <T v="footnote" color="secondary">
              {fmtRelativeDay(lastComp.date)}
            </T>
          </View>
          <View style={styles.grid}>
            {COMPOSITION.map(m => {
              const v = lastComp[m.key];
              if (v == null) return null;
              const p = prevComp?.[m.key];
              return (
                <Tap
                  key={m.key}
                  onPress={() => nav.navigate('BodyMetric', { metric: m.key })}
                  style={styles.gridItem}
                  scaleTo={0.97}
                >
                  <View style={[styles.tile, { backgroundColor: c.card }]}>
                    <T v="footnote" color="secondary" numberOfLines={1}>
                      {m.label}
                    </T>
                    <T v="title3">
                      {fmtNum(v, m.decimals)}
                      {m.unit ? ` ${m.unit}` : ''}
                    </T>
                    {p != null ? (
                      <T v="caption" color="tertiary">
                        {fmtSigned(v - p, m.decimals)} dall'ultima
                      </T>
                    ) : null}
                  </View>
                </Tap>
              );
            })}
          </View>
          <T v="footnote" color="tertiary" style={styles.note}>
            Stime calcolate dall'impedenza della bilancia: guarda l'andamento
            più che il valore singolo.
          </T>
        </>
      ) : null}

      {/* Measurements */}
      <View style={styles.sectionHead}>
        <T v="title3">Misure</T>
        <Button
          title="Aggiungi"
          icon="ruler"
          size="s"
          variant="tinted"
          onPress={() => setMeasuring(true)}
        />
      </View>
      {mm.length ? (
        <Card padded={false} style={styles.block}>
          {mm.map((m, i) => (
            <Tap
              key={m.key}
              onPress={() =>
                nav.navigate('BodyMetric', { metric: `measure:${m.key}` })
              }
              scaleTo={0.99}
            >
              <View
                style={[
                  styles.mRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.separator,
                  },
                ]}
              >
                <T v="body" style={styles.flex}>
                  {m.label}
                </T>
                {m.delta != null && m.delta !== 0 ? (
                  <T v="footnote" color="secondary">
                    {fmtSigned(m.delta, 1)} cm
                  </T>
                ) : null}
                <T v="headline">{fmtNum(m.last!.v, 1)} cm</T>
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
      ) : (
        <Card style={styles.block}>
          <T v="subhead" color="secondary">
            Vita, petto, braccia, cosce: una volta al mese bastano per vedere
            come cambia il corpo, anche quando il peso resta fermo.
          </T>
        </Card>
      )}

      {!hasScale ? (
        <Card
          style={styles.block}
          onPress={() => nav.navigate('ScaleSettings')}
        >
          <View style={styles.rowGap}>
            <View style={[styles.btIcon, { backgroundColor: c.accentSoft }]}>
              <Icon name="bluetooth" size={22} color={c.accent} />
            </View>
            <View style={styles.flex}>
              <T v="headline">Collega la bilancia Xiaomi</T>
              <T v="footnote" color="secondary">
                Mi Smart Scale 2 e Mi Body Composition Scale 2: il peso arriva
                da solo, senza l'app ufficiale.
              </T>
            </View>
            <Icon
              name="chevron-right"
              size={16}
              color={c.tertiary}
              weight={2.4}
            />
          </View>
        </Card>
      ) : null}
      {sheets}
    </Screen>
  );
}

function Delta({
  label,
  kg,
  unit,
}: {
  label: string;
  kg: number | null;
  unit: 'kg' | 'lb';
}) {
  const { c } = useTheme();
  if (kg == null) return null;
  const v = toDisplay(kg, unit);
  return (
    <View style={[styles.delta, { backgroundColor: c.fill4 }]}>
      <T v="subheadStrong">
        {fmtSigned(v, 1)} {unit}
      </T>
      <T v="caption" color="secondary">
        {label}
      </T>
    </View>
  );
}

function GoalBar({
  current,
  goal,
  start,
  unit,
}: {
  current: number;
  goal: number;
  start: number;
  unit: 'kg' | 'lb';
}) {
  const { c } = useTheme();
  const total = Math.abs(start - goal);
  const done = total
    ? Math.min(1, Math.max(0, 1 - Math.abs(current - goal) / total))
    : 1;
  const left = Math.abs(current - goal);
  return (
    <View style={styles.goal}>
      <View style={styles.rowBetween}>
        <T v="footnote" color="secondary">
          Obiettivo {fmtNum(toDisplay(goal, unit), 1)} {unit}
        </T>
        <T v="footnoteStrong">
          {left < 0.05
            ? 'Raggiunto!'
            : `mancano ${fmtNum(toDisplay(left, unit), 1)} ${unit}`}
        </T>
      </View>
      <View style={[styles.track, { backgroundColor: c.accentSoft }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(done * 100)}%`, backgroundColor: c.accent },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  flex: { flex: 1, minWidth: 0 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  deltas: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  delta: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  goal: { marginTop: 16, gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  noData: { paddingVertical: 40, textAlign: 'center' },
  range: { marginTop: 12 },
  link: { alignSelf: 'flex-start', marginTop: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  gridItem: { width: '50%', padding: 5 },
  tile: { borderRadius: 22, padding: 14, gap: 2 },
  note: { marginTop: 6, marginBottom: 12, paddingHorizontal: 4 },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  btIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
