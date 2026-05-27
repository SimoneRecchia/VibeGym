import React, { useMemo, useState } from 'react';
import {
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
import { Sheet } from '../components/Sheet';
import { PressableScale } from '../components/PressableScale';
import { dayLetter, formatTimeAgo, previousMaxKg } from '../lib/helpers';
import { formatWeight, weightInKg } from '../lib/format';
import { Session, Weight } from '../lib/types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'History'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

const maxLiftedKg = (weights: (Weight | null)[], done: boolean[]): number | null => {
  let max = -Infinity;
  for (let i = 0; i < weights.length; i++) {
    if (!done[i]) continue;
    const kg = weightInKg(weights[i]);
    if (kg !== null && kg > max) max = kg;
  }
  return Number.isFinite(max) ? max : null;
};

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { plan } = useStore();
  const { palette, mode } = useTheme();
  const [detail, setDetail] = useState<Session | null>(null);

  const sessions = useMemo(
    () => (plan?.storico ? [...plan.storico].reverse() : []),
    [plan]
  );

  const weekly = useMemo(() => {
    const out: { label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = sessions.filter(s => {
        const t = new Date(s.data).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      out.push({
        label: d.toLocaleDateString('it-IT', { weekday: 'narrow' }),
        count,
      });
    }
    return out;
  }, [sessions]);

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Storico</Text>
        <View style={{ width: 42 }} />
      </View>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="chart" size={32} color={palette.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Nessuna sessione</Text>
          <Text style={[styles.emptySub, { color: palette.textDim }]}>
            Completa il tuo primo allenamento per vederlo qui.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Mini weekly heatmap */}
          <GlassCard style={styles.weekly}>
            <Text style={[styles.weeklyLabel, { color: palette.textDim }]}>ULTIMA SETTIMANA</Text>
            <View style={styles.weeklyRow}>
              {weekly.map((d, i) => (
                <View key={i} style={styles.weeklyCell}>
                  <View
                    style={[
                      styles.weeklyBar,
                      {
                        height: d.count > 0 ? 30 + d.count * 12 : 6,
                        backgroundColor:
                          d.count > 0
                            ? palette.accent
                            : palette.dividerStrong,
                      },
                    ]}
                  />
                  <Text style={[styles.weeklyDay, { color: palette.textDim }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {sessions.map(s => {
            const day = plan?.giorni.find(g => g.id === s.giorno_id);
            const idx = plan?.giorni.findIndex(g => g.id === s.giorno_id) ?? -1;
            const letter = idx >= 0 ? dayLetter(idx) : '?';
            const color = day?.colore ?? palette.accent;
            const d = new Date(s.data);
            const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const fatti = s.esercizi.filter(e => e.completato).length;
            const tot = s.esercizi.length;
            return (
              <PressableScale key={s.data} onPress={() => setDetail(s)} style={{ marginBottom: 10 }}>
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.78)',
                      borderColor: palette.glassBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stub,
                      {
                        backgroundColor: hexToRgba(stripHash(color), 0.22),
                        borderColor: hexToRgba(stripHash(color), 0.6),
                      },
                    ]}
                  >
                    <Text style={[styles.stubText, { color }]}>{letter}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>
                      {s.giorno_nome}
                    </Text>
                    <Text style={[styles.rowMeta, { color: palette.textDim }]}>
                      {dateStr} · {timeStr} · {formatTimeAgo(d)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.stat,
                      {
                        backgroundColor: hexToRgba(stripHash(color), 0.15),
                        borderColor: hexToRgba(stripHash(color), 0.45),
                      },
                    ]}
                  >
                    <Text style={[styles.statText, { color }]}>
                      {fatti}/{tot}
                    </Text>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      <Sheet
        visible={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.giorno_nome}
        subtitle={detail ? new Date(detail.data).toLocaleString('it-IT') : ''}
      >
        {detail && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail.esercizi.map(e => {
              const stato = e.serie_stato ?? [];
              const day = plan?.giorni.find(g => g.id === detail.giorno_id);
              const accent = day?.colore ?? palette.accent;

              // PR detection: compare this session's max weight against history
              // before this session.
              const prevMax = plan
                ? previousMaxKg(plan.storico.filter(s => s.id !== detail.id), e.id)
                : null;
              const sessionMaxKg = maxLiftedKg(e.pesi_serie ?? [], e.serie_stato ?? []);
              const isPR =
                sessionMaxKg !== null && (prevMax === null || sessionMaxKg > prevMax);

              const formatList = (arr: (Weight | null)[]) =>
                arr.map(w => (w ? formatWeight(w) : '—')).join('  ·  ');

              const pesi =
                e.tipo === 'superset'
                  ? (e.sub_esercizi ?? [])
                      .map(sub => `${sub.nome.split(' ')[0]}: ${formatList(sub.pesi_serie ?? [])}`)
                      .join('  ·  ')
                  : formatList(e.pesi_serie ?? []);

              return (
                <View
                  key={e.id}
                  style={[styles.detailRow, { borderColor: palette.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {e.completato && <Icon name="check" color={palette.success} size={16} />}
                    <Text
                      style={[
                        styles.detailName,
                        { color: e.completato ? palette.text : palette.textDim },
                      ]}
                    >
                      {e.nome}
                    </Text>
                    {isPR && (
                      <View
                        style={[
                          styles.prTag,
                          {
                            backgroundColor: palette.warnSoft,
                            borderColor: hexToRgba('#FBBF24', 0.55),
                          },
                        ]}
                      >
                        <Icon name="trophy" color={palette.warn} size={11} />
                        <Text style={[styles.prText, { color: palette.warn }]}>PR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.detailMeta, { color: palette.textDim }]}>
                    {e.serie_fatte}/{e.serie_totali} serie · {pesi}
                  </Text>
                  <View style={styles.detailDots}>
                    {stato.map((v, i) => (
                      <View
                        key={i}
                        style={[
                          styles.detailDot,
                          {
                            backgroundColor: v ? accent : palette.dividerStrong,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.detailDotNum, { color: v ? '#fff' : palette.textFaint }]}
                        >
                          {i + 1}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {e.note ? (
                    <View
                      style={[
                        styles.detailNote,
                        { backgroundColor: palette.surface, borderColor: palette.glassBorder },
                      ]}
                    >
                      <Text style={[styles.detailNoteText, { color: palette.textDim }]}>{e.note}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View style={{ height: 16 }} />
          </ScrollView>
        )}
      </Sheet>
    </Screen>
  );
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
  title: {
    ...typography.title2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.lg,
  },
  emptyTitle: {
    ...typography.title1,
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 6,
  },
  weekly: {
    padding: space.md,
    marginBottom: space.md,
  },
  weeklyLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    minHeight: 80,
  },
  weeklyCell: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyBar: {
    width: 10,
    borderRadius: 5,
  },
  weeklyDay: {
    ...typography.caption1,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stub: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  stubText: {
    ...typography.title3,
    fontWeight: '800',
  },
  rowTitle: {
    ...typography.headline,
  },
  rowMeta: {
    ...typography.footnote,
    marginTop: 2,
  },
  stat: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  statText: {
    ...typography.mono,
    fontWeight: '700',
  },
  detailRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailName: {
    ...typography.headline,
    flex: 1,
  },
  prTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  prText: {
    ...typography.caption2,
    letterSpacing: 0.4,
  },
  detailMeta: {
    ...typography.footnote,
    marginTop: 4,
  },
  detailDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  detailDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDotNum: {
    ...typography.caption2,
    fontWeight: '700',
  },
  detailNote: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  detailNoteText: {
    ...typography.footnote,
    fontStyle: 'italic',
  },
});
