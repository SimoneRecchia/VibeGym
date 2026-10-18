import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { ExerciseMedia } from '../ui/ExerciseMedia';
import { Sparkline } from '../ui/charts/Sparkline';
import {
  categoryLabel,
  equipmentLabel,
  getCatalogExercise,
  levelLabel,
  mediaSource,
  muscleLabel,
} from '../catalog';
import { exerciseKey } from '../core/ids';
import { metricsFor, metricsOf, METRIC_LABEL } from '../stats/metrics';
import { exerciseSeries } from '../stats/progress';
import { formatMetric } from './ExerciseTrendScreen';
import { ScreenProps } from '../navigation/types';

export function ExerciseInfoScreen({
  route,
  navigation,
}: ScreenProps<'ExerciseInfo'>) {
  const { catalogId, name } = route.params;
  const key = route.params.key ?? exerciseKey(name, catalogId);
  const cat = getCatalogExercise(catalogId);
  const sessions = useStore(s => s.sessions);
  const unit = useStore(s => s.settings.unit);

  const trend = useMemo(() => {
    const last = [...sessions]
      .reverse()
      .flatMap(s => s.exercises)
      .find(e => e.key === key && e.sets.some(x => x.done));
    if (!last) return null;
    const m = metricsFor(last.kind, metricsOf(last).maxKg > 0)[0];
    const pts = exerciseSeries(sessions, key, m);
    return { metric: m, points: pts, last: pts[pts.length - 1]?.v };
  }, [sessions, key]);

  return (
    <Screen title={name} close largeTitle>
      <ExerciseMedia catalogId={catalogId} style={styles.media} />
      {mediaSource(catalogId).kind === 'line' ? (
        <T v="caption" color="tertiary" style={styles.credit}>
          Illustrazione: Workout Guide di Bryl Lim (CC BY-SA 4.0)
        </T>
      ) : null}
      {cat ? (
        <Card style={styles.block}>
          {cat.nameIt && cat.nameIt !== name ? (
            <T v="subhead" color="secondary" style={styles.alt}>
              {cat.nameIt} · {cat.name}
            </T>
          ) : (
            <T v="subhead" color="secondary" style={styles.alt}>
              {cat.name}
            </T>
          )}
          <T v="footnoteStrong" color="secondary">
            MUSCOLI PRINCIPALI
          </T>
          <View style={styles.chips}>
            {cat.primary.map(m => (
              <Chip key={m} label={muscleLabel(m)} tinted />
            ))}
          </View>
          {cat.secondary.length ? (
            <>
              <T v="footnoteStrong" color="secondary" style={styles.mt}>
                MUSCOLI SECONDARI
              </T>
              <View style={styles.chips}>
                {cat.secondary.map(m => (
                  <Chip key={m} label={muscleLabel(m)} />
                ))}
              </View>
            </>
          ) : null}
          <View style={styles.facts}>
            <Fact label="Attrezzatura" value={equipmentLabel(cat.equipment)} />
            <Fact
              label="Tipo"
              value={`${categoryLabel(cat.category)}${
                cat.compound ? ' · multiarticolare' : ''
              }`}
            />
            <Fact label="Livello" value={levelLabel(cat.level)} />
          </View>
        </Card>
      ) : null}

      {trend ? (
        <Card
          style={styles.block}
          onPress={() => navigation.navigate('ExerciseTrend', { key, name })}
        >
          <View style={styles.trend}>
            <View style={styles.flex}>
              <T v="footnote" color="secondary">
                {METRIC_LABEL[trend.metric]}
              </T>
              <T v="title2">
                {trend.last != null
                  ? formatMetric(trend.metric, trend.last, unit)
                  : '–'}
              </T>
            </View>
            <Sparkline
              points={trend.points.slice(-12)}
              width={110}
              height={40}
            />
          </View>
          <T v="subhead" color="accent" style={styles.mt}>
            Vedi tutti i progressi
          </T>
        </Card>
      ) : null}

      {!cat && !trend ? (
        <Card>
          <T v="subhead" color="secondary">
            Questo esercizio non è collegato al catalogo, quindi non ha
            un'animazione. Puoi collegarlo dall'editor della scheda.
          </T>
        </Card>
      ) : null}
      {trend ? null : (
        <Button
          title="Chiudi"
          variant="glass"
          onPress={() => navigation.goBack()}
          style={styles.mt}
        />
      )}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <T v="footnote" color="secondary">
        {label}
      </T>
      <T v="subheadStrong">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  media: { marginBottom: 12 },
  credit: { marginTop: -6, marginBottom: 12, textAlign: 'center' },
  block: { marginBottom: 12 },
  alt: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mt: { marginTop: 14 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 16 },
  fact: { minWidth: '28%' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
