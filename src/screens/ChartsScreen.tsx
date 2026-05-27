import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { Sparkline } from '../components/Sparkline';
import { weightInKg } from '../lib/format';
import { Session } from '../lib/types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Charts'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

interface Point {
  date: string;
  kg: number;
}

interface ExerciseSeries {
  id: string;
  name: string;
  /** Latest day color for accent. */
  color?: string;
  points: Point[];
  isSuper?: boolean;
  subSeries?: { id: string; name: string; points: Point[] }[];
}

const W = Dimensions.get('window').width - space.lg * 2 - space.md * 2;

export function ChartsScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { plan } = useStore();

  const series = useMemo(() => buildSeries(plan?.storico ?? []), [plan?.storico]);
  const dayColorById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const g of plan?.giorni ?? []) map.set(g.id, g.colore);
    return map;
  }, [plan]);

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Progressione</Text>
        <View style={{ width: 42 }} />
      </View>

      {series.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="sparkles" color={palette.accent} size={28} />
          </View>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            Niente da mostrare
          </Text>
          <Text style={[styles.emptySub, { color: palette.textDim }]}>
            Completa qualche serie con un peso e qui troverai la tua progressione.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
          {series.map(ser => {
            const accent = palette.accent;
            const latest = ser.points[ser.points.length - 1]?.kg ?? 0;
            const first = ser.points[0]?.kg ?? latest;
            const delta = latest - first;
            return (
              <GlassCard key={ser.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.exName, { color: palette.text }]} numberOfLines={1}>
                      {ser.name}
                    </Text>
                    <Text style={[styles.exMeta, { color: palette.textDim }]}>
                      {ser.points.length} {ser.points.length === 1 ? 'sessione' : 'sessioni'} · max {fmt(latest)} kg
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.deltaTag,
                      {
                        backgroundColor:
                          delta > 0
                            ? palette.successSoft
                            : delta < 0
                            ? palette.dangerSoft
                            : palette.glassFill,
                        borderColor: palette.glassBorderStrong,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deltaText,
                        {
                          color:
                            delta > 0
                              ? palette.success
                              : delta < 0
                              ? palette.danger
                              : palette.textDim,
                        },
                      ]}
                    >
                      {delta > 0 ? '+' : ''}
                      {fmt(delta)} kg
                    </Text>
                  </View>
                </View>
                <View style={styles.chartWrap}>
                  <Sparkline
                    values={ser.points.map(p => p.kg)}
                    width={W}
                    height={64}
                    color={accent}
                    fillColor={hexToRgba(stripHash(accent), 0.12)}
                  />
                </View>
                {ser.subSeries?.map(sub => {
                  const subLatest = sub.points[sub.points.length - 1]?.kg ?? 0;
                  const subFirst = sub.points[0]?.kg ?? subLatest;
                  return (
                    <View key={sub.id} style={styles.subRow}>
                      <Text style={[styles.subName, { color: palette.textDim }]} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={[styles.subValue, { color: palette.text }]}>
                        {fmt(subLatest)} kg{' '}
                        <Text style={{ color: subLatest > subFirst ? palette.success : palette.textFaint }}>
                          ({subLatest > subFirst ? '+' : ''}
                          {fmt(subLatest - subFirst)})
                        </Text>
                      </Text>
                    </View>
                  );
                })}
              </GlassCard>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
};

function buildSeries(history: Session[]): ExerciseSeries[] {
  // For each exercise id, collect: { date, maxKg } from sessions where any set was done.
  const map = new Map<string, ExerciseSeries>();

  const sortedHistory = [...history].sort((a, b) => a.data.localeCompare(b.data));

  for (const s of sortedHistory) {
    for (const e of s.esercizi) {
      const maxKg = computeMaxKg(e.pesi_serie ?? [], e.serie_stato ?? []);
      if (maxKg === null && (!e.sub_esercizi || e.sub_esercizi.length === 0)) continue;

      let entry = map.get(e.id);
      if (!entry) {
        entry = { id: e.id, name: e.nome, points: [] };
        if (e.tipo === 'superset') {
          entry.isSuper = true;
          entry.subSeries = (e.sub_esercizi ?? []).map(sub => ({
            id: sub.id,
            name: sub.nome,
            points: [],
          }));
        }
        map.set(e.id, entry);
      }
      if (maxKg !== null) entry.points.push({ date: s.data, kg: maxKg });
      // For supersets, push per-sub max
      if (e.tipo === 'superset' && entry.subSeries) {
        for (const sub of e.sub_esercizi ?? []) {
          const subMax = computeMaxKg(sub.pesi_serie ?? [], e.serie_stato ?? []);
          if (subMax === null) continue;
          const ser = entry.subSeries.find(x => x.id === sub.id);
          ser?.points.push({ date: s.data, kg: subMax });
        }
      }
    }
  }

  return Array.from(map.values())
    .filter(s => s.points.length >= 1 || (s.subSeries?.some(ss => ss.points.length >= 1) ?? false))
    .sort((a, b) => b.points.length - a.points.length);
}

function computeMaxKg(weights: (import('../lib/types').Weight | null)[], done: boolean[]): number | null {
  let max = -Infinity;
  for (let i = 0; i < weights.length; i++) {
    if (!done[i]) continue;
    const w = weights[i];
    const kg = weightInKg(w);
    if (kg !== null && kg > max) max = kg;
  }
  return Number.isFinite(max) ? max : null;
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: { ...typography.title2 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.lg,
  },
  emptyTitle: { ...typography.title1 },
  emptySub: { ...typography.body, textAlign: 'center', marginTop: 4 },
  card: {
    padding: space.md,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exName: { ...typography.headline },
  exMeta: { ...typography.footnote, marginTop: 2 },
  deltaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  deltaText: { ...typography.caption1, fontWeight: '800' },
  chartWrap: {
    marginTop: space.sm,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.18)',
  },
  subName: { ...typography.footnote, flex: 1, marginRight: 12 },
  subValue: { ...typography.footnote, fontWeight: '700' },
});
