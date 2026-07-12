import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { GlassCard } from '../components/GlassCard';
import { Icon } from '../components/Icon';
import { dayLetter, estimateDurationMin, getSerieTotali } from '../lib/helpers';
import { formatDate } from '../lib/format';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Schema'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function SchemaScreen() {
  const navigation = useNavigation<Nav>();
  const { palette } = useTheme();
  const { plan } = useStore();

  if (!plan) {
    return (
      <Screen>
        <View style={styles.topbar}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
          <Text style={[styles.title, { color: palette.text }]}>Scheda</Text>
          <View style={{ width: 42 }} />
        </View>
      </Screen>
    );
  }

  const totalExercises = plan.giorni.reduce((s, g) => s + g.esercizi.length, 0);
  const totalSets = plan.giorni.reduce(
    (s, g) => s + g.esercizi.reduce((sub, e) => sub + getSerieTotali(e), 0),
    0
  );

  return (
    <Screen>
      <View style={styles.topbar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={42} />
        <Text style={[styles.title, { color: palette.text }]}>Scheda</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        <GlassCard style={styles.hero}>
          <View
            style={[
              styles.iconBig,
              { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
            ]}
          >
            <Icon name="layers" color={palette.accent} size={28} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroLabel, { color: palette.textDim }]}>SCHEDA ATTIVA</Text>
            <Text style={[styles.heroName, { color: palette.text }]} numberOfLines={2}>
              {plan.nome_scheda || 'La mia scheda'}
            </Text>
            {plan.creata_il && (
              <Text style={[styles.heroMeta, { color: palette.textFaint }]}>
                Creata il {formatDate(plan.creata_il)}
              </Text>
            )}
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <Stat label="Giorni" value={String(plan.giorni.length)} />
          <Stat label="Esercizi" value={String(totalExercises)} />
          <Stat label="Serie" value={String(totalSets)} />
        </View>

        <Text style={[styles.section, { color: palette.textFaint }]}>GIORNI</Text>
        {plan.giorni.map((g, idx) => {
          const color = g.colore ?? palette.accent;
          return (
            <GlassCard key={g.id} style={[styles.dayCard, { borderColor: palette.glassBorder }]}>
              <View
                style={[
                  styles.dayStub,
                  {
                    backgroundColor: hexToRgba(stripHash(color), 0.22),
                    borderColor: hexToRgba(stripHash(color), 0.6),
                  },
                ]}
              >
                <Text style={[styles.dayStubText, { color }]}>{dayLetter(idx)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.dayName, { color: palette.text }]} numberOfLines={2}>
                  {g.nome}
                </Text>
                <Text style={[styles.dayMeta, { color: palette.textDim }]}>
                  {g.esercizi.length} esercizi · ~{estimateDurationMin(g)} min
                </Text>
                {g.cardio && (
                  <Text style={[styles.dayCardio, { color: palette.textFaint }]}>
                    + Cardio: {g.cardio.tipo} ({g.cardio.durata_min}min)
                  </Text>
                )}
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <GlassCard style={styles.stat}>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textDim }]}>{label}</Text>
    </GlassCard>
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: space.md,
  },
  iconBig: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroName: {
    ...typography.title2,
    marginTop: 2,
  },
  heroMeta: {
    ...typography.footnote,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: space.md,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title1,
  },
  statLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  section: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.xl,
    marginBottom: 10,
    marginLeft: 4,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    marginBottom: 10,
  },
  dayStub: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  dayStubText: {
    ...typography.title3,
    fontWeight: '800',
  },
  dayName: {
    ...typography.headline,
  },
  dayMeta: {
    ...typography.footnote,
    marginTop: 2,
  },
  dayCardio: {
    ...typography.caption1,
    marginTop: 2,
  },
});
