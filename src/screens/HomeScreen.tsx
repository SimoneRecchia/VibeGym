import React, { useMemo, useState } from 'react';
import {
  Animated,
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
import { dayLetter, estimateDurationMin, formatTimeAgo, getDailyProgress, getGreeting } from '../lib/helpers';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { DayRow } from '../components/DayRow';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { RootStackParamList } from '../navigation/types';
import { ProgressRing } from '../components/ProgressRing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { plan, startDay, hydrating } = useStore();
  const { palette, mode, toggle } = useTheme();

  const progress = useMemo(() => getDailyProgress(plan), [plan]);
  const inProgressDay = useMemo(
    () => plan?.giorni.find(g => progress[g.id]?.inProgress),
    [plan, progress]
  );

  const otherDays = useMemo(
    () =>
      plan
        ? plan.giorni.filter(g => g.id !== inProgressDay?.id)
        : [],
    [plan, inProgressDay]
  );

  const sessions = plan?.storico ?? [];
  const lastSession = sessions[sessions.length - 1];

  const weeklyVolume = useMemo(() => {
    if (!sessions.length) return 0;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter(s => new Date(s.data).getTime() >= cutoff).length;
  }, [sessions]);

  const handleStart = (id: string) => {
    startDay(id);
    navigation.navigate('Workout');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View>
            <Text style={[styles.greet, { color: palette.textDim }]}>{getGreeting()}</Text>
            <Text style={[styles.title, { color: palette.text }]}>Vibe Gym</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton
              icon={mode === 'dark' ? 'sun' : 'moon'}
              onPress={toggle}
              size={42}
            />
            <IconButton
              icon="dots"
              onPress={() => navigation.navigate('Menu')}
              size={42}
            />
          </View>
        </View>

        {!plan && !hydrating && (
          <EmptyState
            onImport={() => navigation.navigate('Import')}
            onHelp={() => navigation.navigate('Format')}
          />
        )}

        {plan && (
          <>
            <PressableScale
              onPress={() => navigation.navigate('Schema')}
              style={{ marginTop: space.lg }}
            >
              <GlassCard rounded="lg" style={styles.schemaRow}>
                <View
                  style={[
                    styles.schemaIcon,
                    {
                      backgroundColor: palette.accentSoft,
                      borderColor: hexToRgba(stripHash(palette.accent), 0.55),
                    },
                  ]}
                >
                  <Icon name="layers" color={palette.accent} size={18} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.schemaLabel, { color: palette.textDim }]}>Scheda attiva</Text>
                  <Text style={[styles.schemaName, { color: palette.text }]} numberOfLines={1}>
                    {plan.nome_scheda || 'La mia scheda'}
                  </Text>
                </View>
                <Icon name="chevron-right" color={palette.textFaint} size={20} />
              </GlassCard>
            </PressableScale>

            {/* Quick stats strip */}
            <View style={styles.statsStrip}>
              <StatPill
                label="Sessioni"
                value={String(sessions.length)}
                hint="totali"
                icon="chart"
              />
              <StatPill
                label="Settimana"
                value={String(weeklyVolume)}
                hint={weeklyVolume === 1 ? 'allenamento' : 'allenamenti'}
                icon="flame"
                tint={palette.warn}
                tintSoft={palette.warnSoft}
              />
              <StatPill
                label="Giorni"
                value={String(plan.giorni.length)}
                hint="programmati"
                icon="list"
                tint={palette.success}
                tintSoft={palette.successSoft}
              />
            </View>

            {inProgressDay && (
              <View style={styles.section}>
                <SectionHead title="Riprendi" />
                <Hero
                  letter={dayLetter(plan.giorni.findIndex(g => g.id === inProgressDay.id))}
                  name={inProgressDay.nome}
                  doneSerie={progress[inProgressDay.id].done}
                  totalSerie={progress[inProgressDay.id].total}
                  tint={inProgressDay.colore}
                  onPress={() => handleStart(inProgressDay.id)}
                />
              </View>
            )}

            <View style={styles.section}>
              <SectionHead title={inProgressDay ? 'Altri giorni' : 'I tuoi giorni'} />
              {otherDays.length === 0 && !inProgressDay ? null : null}
              {(inProgressDay ? otherDays : plan.giorni).map(g => {
                const idx = plan.giorni.findIndex(x => x.id === g.id);
                const p = progress[g.id];
                return (
                  <DayRow
                    key={g.id}
                    letter={dayLetter(idx)}
                    name={g.nome}
                    meta={
                      p.inProgress
                        ? `${p.done}/${p.total} esercizi · in corso`
                        : `${g.esercizi.length} esercizi · ~${estimateDurationMin(g)} min`
                    }
                    tint={g.colore}
                    inProgress={p.inProgress}
                    onPress={() => handleStart(g.id)}
                  />
                );
              })}
            </View>

            {sessions.length > 0 && lastSession && (
              <View style={styles.section}>
                <SectionHead title="Attività" />
                <PressableScale onPress={() => navigation.navigate('History')}>
                  <GlassCard rounded="lg" style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
                      ]}
                    >
                      <Icon name="chart" color={palette.accent} size={18} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.activityTitle, { color: palette.text }]}>
                        {sessions.length} {sessions.length === 1 ? 'sessione completata' : 'sessioni completate'}
                      </Text>
                      <Text style={[styles.activityMeta, { color: palette.textDim }]}>
                        Ultima: {formatTimeAgo(new Date(lastSession.data))}
                      </Text>
                    </View>
                    <Icon name="chevron-right" color={palette.textFaint} size={20} />
                  </GlassCard>
                </PressableScale>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionHead({ title }: { title: string }) {
  const { palette } = useTheme();
  return (
    <Text style={[styles.sectionHead, { color: palette.textFaint }]}>{title.toUpperCase()}</Text>
  );
}

function StatPill({
  label,
  value,
  hint,
  icon,
  tint,
  tintSoft,
}: {
  label: string;
  value: string;
  hint: string;
  icon: import('../components/Icon').IconName;
  tint?: string;
  tintSoft?: string;
}) {
  const { palette } = useTheme();
  const fg = tint ?? palette.accent;
  const bg = tintSoft ?? palette.accentSoft;
  return (
    <GlassCard style={styles.statPill} rounded="lg">
      <View style={[styles.statIcon, { backgroundColor: bg, borderColor: hexToRgba(stripHash(fg), 0.45) }]}>
        <Icon name={icon} color={fg} size={14} />
      </View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textDim }]}>{label}</Text>
      <Text style={[styles.statHint, { color: palette.textFaint }]}>{hint}</Text>
    </GlassCard>
  );
}

function Hero({
  letter,
  name,
  doneSerie,
  totalSerie,
  tint,
  onPress,
}: {
  letter: string;
  name: string;
  doneSerie: number;
  totalSerie: number;
  tint?: string;
  onPress: () => void;
}) {
  const { palette, mode } = useTheme();
  const accent = tint ?? palette.accent;
  const pct = totalSerie > 0 ? doneSerie / totalSerie : 0;

  return (
    <PressableScale onPress={onPress}>
      <View
        style={[
          styles.hero,
          {
            backgroundColor:
              mode === 'dark'
                ? hexToRgba(stripHash(accent), 0.14)
                : hexToRgba(stripHash(accent), 0.08),
            borderColor: hexToRgba(stripHash(accent), 0.45),
            shadowColor: accent,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.heroBadge,
              { backgroundColor: hexToRgba(stripHash(accent), 0.25), borderColor: hexToRgba(stripHash(accent), 0.6) },
            ]}
          >
            <Icon name="lightning" color={accent} size={12} />
            <Text style={[styles.heroBadgeText, { color: accent }]}>In corso</Text>
          </View>
          <View
            style={[
              styles.heroStub,
              { backgroundColor: hexToRgba(stripHash(accent), 0.35), borderColor: hexToRgba(stripHash(accent), 0.7) },
            ]}
          >
            <Text style={[styles.heroStubText, { color: '#fff' }]}>{letter}</Text>
          </View>
        </View>

        <Text style={[styles.heroName, { color: palette.text }]} numberOfLines={2}>
          {name}
        </Text>

        <View style={styles.heroBottom}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroMeta, { color: palette.textDim }]}>
              {doneSerie}/{totalSerie} esercizi completati
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: palette.dividerStrong }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${pct * 100}%`, backgroundColor: accent },
                ]}
              />
            </View>
          </View>
          <ProgressRing progress={pct} size={56} thickness={5} color={accent}>
            <Text style={[styles.ringText, { color: palette.text }]}>
              {Math.round(pct * 100)}%
            </Text>
          </ProgressRing>
        </View>

        <View style={[styles.heroCTA, { borderColor: palette.glassBorder }]}>
          <Text style={[styles.heroCTAText, { color: palette.text }]}>Riprendi allenamento</Text>
          <Icon name="arrow-right" color={palette.text} size={18} />
        </View>
      </View>
    </PressableScale>
  );
}

function EmptyState({ onImport, onHelp }: { onImport: () => void; onHelp: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
        ]}
      >
        <Icon name="dumbbell" size={36} color={palette.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>Pronto per iniziare?</Text>
      <Text style={[styles.emptySub, { color: palette.textDim }]}>
        Importa la tua scheda in JSON e inizia ad allenarti in pochi secondi.
      </Text>
      <View style={{ gap: 10, alignSelf: 'stretch', marginTop: space.lg }}>
        <GlassButton title="Importa scheda" icon="download" onPress={onImport} block size="lg" />
        <GlassButton
          title="Non hai un file JSON?"
          variant="ghost"
          onPress={onHelp}
          block
        />
      </View>
    </View>
  );
}

function stripHash(hex: string): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  greet: {
    ...typography.subhead,
    marginBottom: 2,
  },
  title: {
    ...typography.largeTitle,
  },
  schemaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.md,
    gap: 12,
  },
  schemaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  schemaLabel: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schemaName: {
    ...typography.headline,
    marginTop: 2,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: space.md,
  },
  statPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: 8,
  },
  statValue: {
    ...typography.title2,
  },
  statLabel: {
    ...typography.footnote,
    marginTop: 1,
  },
  statHint: {
    ...typography.caption2,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  section: {
    marginTop: space.xl,
  },
  sectionHead: {
    ...typography.caption1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  hero: {
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    gap: 14,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroBadgeText: {
    ...typography.caption2,
    textTransform: 'uppercase',
  },
  heroStub: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroStubText: {
    ...typography.title1,
    fontWeight: '800',
  },
  heroName: {
    ...typography.title1,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  heroMeta: {
    ...typography.footnote,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  ringText: {
    ...typography.caption2,
    fontWeight: '700',
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroCTAText: {
    ...typography.headline,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.md,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  activityTitle: {
    ...typography.headline,
  },
  activityMeta: {
    ...typography.footnote,
    marginTop: 2,
  },
  empty: {
    marginTop: space.xxxl,
    alignItems: 'center',
    paddingHorizontal: space.md,
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
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 6,
  },
});
