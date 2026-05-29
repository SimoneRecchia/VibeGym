import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../lib/store';
import { useTheme } from '../theme/ThemeProvider';
import { hexToRgba, radius, space, typography } from '../theme/tokens';
import {
  dayLetter,
  estimateDurationMin,
  formatTimeAgo,
  getDailyProgress,
  getGreeting,
} from '../lib/helpers';
import { Screen } from '../components/Screen';
import { IconButton } from '../components/IconButton';
import { DayRow } from '../components/DayRow';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Icon, IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Avatar } from '../components/Avatar';
import { ProgressRing } from '../components/ProgressRing';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function stripHash(hex: string | undefined): string {
  if (!hex) return '#5E8BFF';
  return hex.startsWith('#') ? hex : `#${hex}`;
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { plan, startDay, hydrating, github } = useStore();
  const { palette, mode, toggle } = useTheme();

  const progress = useMemo(() => getDailyProgress(plan), [plan]);
  const inProgressDay = useMemo(
    () => plan?.giorni.find(g => progress[g.id]?.inProgress),
    [plan, progress]
  );
  const otherDays = useMemo(
    () => (plan ? plan.giorni.filter(g => g.id !== inProgressDay?.id) : []),
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

  // ---- Onboarding state machine ----
  // 1. not connected → "Collega GitHub"
  // 2. connected, no plan → "Aggiungi scheda"
  // 3. connected, plan → normal day list
  const stage: 'connect' | 'add-plan' | 'workout' = !github.token
    ? 'connect'
    : !plan
    ? 'add-plan'
    : 'workout';

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton
              icon={mode === 'dark' ? 'sun' : 'moon'}
              onPress={toggle}
              size={42}
            />
            <PressableScale onPress={() => navigation.navigate('Settings')}>
              {github.token ? (
                <Avatar url={github.token.avatarUrl} fallback={github.token.login} size={42} />
              ) : (
                <IconButton icon="gear" onPress={() => navigation.navigate('Settings')} size={42} />
              )}
            </PressableScale>
          </View>
        </View>

        {!hydrating && stage === 'connect' && (
          <ConnectHero onPress={() => navigation.navigate('Sync')} />
        )}

        {stage === 'add-plan' && (
          <AddPlanHero
            login={github.token?.login ?? ''}
            avatarUrl={github.token?.avatarUrl}
            onImport={() => navigation.navigate('Import')}
            onHelp={() => navigation.navigate('Format')}
          />
        )}

        {stage === 'workout' && plan && (
          <>
            <View style={styles.statsStrip}>
              <StatPill label="Sessioni" value={String(sessions.length)} hint="totali" icon="chart" />
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
                        {
                          backgroundColor: palette.accentSoft,
                          borderColor: hexToRgba(stripHash(palette.accent), 0.5),
                        },
                      ]}
                    >
                      <Icon name="chart" color={palette.accent} size={18} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.activityTitle, { color: palette.text }]}>
                        {sessions.length}{' '}
                        {sessions.length === 1 ? 'sessione completata' : 'sessioni completate'}
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
  return <Text style={[styles.sectionHead, { color: palette.textFaint }]}>{title.toUpperCase()}</Text>;
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
  icon: IconName;
  tint?: string;
  tintSoft?: string;
}) {
  const { palette } = useTheme();
  const fg = tint ?? palette.accent;
  const bg = tintSoft ?? palette.accentSoft;
  return (
    <GlassCard style={styles.statPill} rounded="lg">
      <View
        style={[
          styles.statIcon,
          { backgroundColor: bg, borderColor: hexToRgba(stripHash(fg), 0.45) },
        ]}
      >
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
              {
                backgroundColor: hexToRgba(stripHash(accent), 0.25),
                borderColor: hexToRgba(stripHash(accent), 0.6),
              },
            ]}
          >
            <Icon name="lightning" color={accent} size={12} />
            <Text style={[styles.heroBadgeText, { color: accent }]}>In corso</Text>
          </View>
          <View
            style={[
              styles.heroStub,
              {
                backgroundColor: hexToRgba(stripHash(accent), 0.35),
                borderColor: hexToRgba(stripHash(accent), 0.7),
              },
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
                style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: accent }]}
              />
            </View>
          </View>
          <ProgressRing progress={pct} size={56} thickness={5} color={accent}>
            <Text style={[styles.ringText, { color: palette.text }]}>{Math.round(pct * 100)}%</Text>
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

function ConnectHero({ onPress }: { onPress: () => void }) {
  const { palette, mode } = useTheme();
  return (
    <View style={styles.onboard}>
      <View
        style={[
          styles.onboardIcon,
          { backgroundColor: palette.accentSoft, borderColor: hexToRgba(stripHash(palette.accent), 0.5) },
        ]}
      >
        <Icon name="layers" size={36} color={palette.accent} />
      </View>
      <Text style={[styles.onboardTitle, { color: palette.text }]}>Inizia da GitHub</Text>
      <Text style={[styles.onboardSub, { color: palette.textDim }]}>
        Vibe Gym usa il tuo account GitHub come backup: scheda + storico vivono
        in una repo privata tua, niente server di terzi, tutto versionato.
      </Text>
      <View style={{ gap: 10, alignSelf: 'stretch', marginTop: space.lg }}>
        <GlassButton title="Collega GitHub" icon="lightning" onPress={onPress} block size="lg" />
      </View>
      <View style={[styles.featuresList, { borderColor: palette.glassBorder, backgroundColor: palette.surface }]}>
        <Feature icon="check" text="Sincronizzazione automatica dopo ogni allenamento" />
        <Feature icon="check" text="Storico completo + grafici di progressione" />
        <Feature icon="check" text="I dati restano tuoi, sul tuo account" />
      </View>
    </View>
  );
}

function AddPlanHero({
  login,
  avatarUrl,
  onImport,
  onHelp,
}: {
  login: string;
  avatarUrl?: string;
  onImport: () => void;
  onHelp: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.onboard}>
      <View style={styles.welcomeRow}>
        <Avatar url={avatarUrl} fallback={login} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.welcomeLabel, { color: palette.textDim }]}>COLLEGATO</Text>
          <Text style={[styles.welcomeName, { color: palette.text }]} numberOfLines={1}>
            @{login}
          </Text>
        </View>
      </View>
      <Text style={[styles.onboardTitle, { color: palette.text, marginTop: space.lg }]}>
        Aggiungi la tua scheda
      </Text>
      <Text style={[styles.onboardSub, { color: palette.textDim }]}>
        Importa un file JSON con i tuoi giorni e esercizi. L'app verifica
        formato e valori; se qualcosa è scritto come "8-9 kg" puoi correggerlo
        subito.
      </Text>
      <View style={{ gap: 10, alignSelf: 'stretch', marginTop: space.lg }}>
        <GlassButton title="Importa scheda" icon="download" onPress={onImport} block size="lg" />
        <GlassButton
          title="Non hai un JSON? Vedi come crearlo"
          variant="ghost"
          onPress={onHelp}
          block
          icon="bulb"
        />
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.featureRow}>
      <Icon name={icon} color={palette.success} size={16} />
      <Text style={[styles.featureText, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg },
  topbar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  greet: { ...typography.subhead, marginBottom: 2 },
  title: { ...typography.largeTitle },
  statsStrip: { flexDirection: 'row', gap: 10, marginTop: space.lg },
  statPill: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'flex-start' },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: 8,
  },
  statValue: { ...typography.title2 },
  statLabel: { ...typography.footnote, marginTop: 1 },
  statHint: { ...typography.caption2, textTransform: 'uppercase', marginTop: 1 },
  section: { marginTop: space.xl },
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
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroBadgeText: { ...typography.caption2, textTransform: 'uppercase' },
  heroStub: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroStubText: { ...typography.title1, fontWeight: '800' },
  heroName: { ...typography.title1 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroMeta: { ...typography.footnote, marginBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  ringText: { ...typography.caption2, fontWeight: '700' },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 1.5,
  },
  heroCTAText: { ...typography.headline },
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
  activityTitle: { ...typography.headline },
  activityMeta: { ...typography.footnote, marginTop: 2 },
  onboard: { marginTop: space.xxl, alignItems: 'center', paddingHorizontal: space.sm },
  onboardIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginBottom: space.lg,
  },
  onboardTitle: { ...typography.title1, textAlign: 'center' },
  onboardSub: { ...typography.body, textAlign: 'center', marginTop: 6 },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginTop: space.xl,
  },
  welcomeLabel: { ...typography.caption2, letterSpacing: 0.7 },
  welcomeName: { ...typography.title2, marginTop: 2 },
  featuresList: {
    alignSelf: 'stretch',
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    gap: 10,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { ...typography.callout, flex: 1 },
});
