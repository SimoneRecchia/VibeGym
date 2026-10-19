/**
 * Landing tab: what to train today, in one tap.
 */
import React, { useMemo } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore, selectActivePlan } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { ProfileButton } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { Button, IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Empty } from '../ui/Empty';
import { showMenu } from '../ui/Menu';
import { DayBadge } from './components/DayBadge';
import {
  capitalize,
  fmtMinutes,
  fmtRelativeDay,
  fmtClock,
  fmtWeekdayDate,
  greeting,
  plural,
} from '../core/format';
import {
  allExercises,
  dayLetter,
  dayMuscles,
  estimateDayMinutes,
  lastSessionForDay,
  nextDayId,
} from '../plan/planUtils';
import { trainedThisWeek, weekStreak } from '../stats/progress';
import { StatRow, StatTile } from '../ui/StatTile';
import { HeroButton, HeroCard } from '../ui/HeroCard';
import { Tap } from '../ui/Pressable';
import { dayColor, withAlpha } from '../theme/colors';
import { planToJson } from '../plan/aiFormat';
import { Nav } from '../navigation/types';
import { useDraft } from '../data/draft';
import { Day } from '../core/types';
import { workoutProgress } from '../workout/engine';
import { useTimer } from '../workout/timer';
import { useHealthRecovery } from '../services/health';
import { sleepHint } from '../stats/health';

export function PlanTab() {
  const nav = useNavigation<Nav>();
  const { c } = useTheme();
  const name = useStore(s => s.profile.name);
  const plan = useStore(selectActivePlan);
  const sessions = useStore(s => s.sessions);
  const workout = useStore(s => s.workout);
  const startWorkout = useStore(s => s.startWorkout);
  const restHint = sleepHint(useHealthRecovery()?.sleepMin);

  const nextId = useMemo(
    () => (plan ? nextDayId(plan, sessions) : undefined),
    [plan, sessions],
  );
  const week = useMemo(() => trainedThisWeek(sessions), [sessions]);
  const streak = useMemo(() => weekStreak(sessions), [sessions]);
  const lastSession = sessions[sessions.length - 1];
  const title = `${greeting()}${name ? `, ${name.split(' ')[0]}` : ''}`;

  const start = (day: Day) => {
    if (!plan) return;
    if (workout) {
      nav.navigate('Workout');
      return;
    }
    if (startWorkout(plan.id, day.id)) nav.navigate('Workout');
  };

  const planMenu = () => {
    if (!plan) return;
    showMenu({
      title: plan.name,
      options: [
        {
          label: 'Modifica scheda',
          onPress: () => {
            useDraft.setState({ editing: JSON.parse(JSON.stringify(plan)) });
            nav.navigate('PlanEditor');
          },
        },
        {
          label: "Modifica con l'AI",
          onPress: () => nav.navigate('AiFlow', { mode: 'modify' }),
        },
        { label: 'Le mie schede', onPress: () => nav.navigate('Plans') },
        {
          label: 'Condividi scheda (JSON)',
          onPress: () =>
            Share.share({ message: planToJson(plan) }).catch(() => {}),
        },
      ],
    });
  };

  const nextDay = plan?.days.find(d => d.id === nextId);
  const nextIndex = plan && nextDay ? plan.days.indexOf(nextDay) : 0;
  const nextColor = dayColor(nextIndex, c);
  const liveIndex =
    plan && workout
      ? Math.max(
          0,
          plan.days.findIndex(d => d.id === workout.dayId),
        )
      : 0;
  const liveColor = dayColor(liveIndex, c);
  const live = workout
    ? (() => {
        const p = workoutProgress(workout);
        return { ...p, share: p.total ? p.done / p.total : 0 };
      })()
    : { done: 0, total: 0, share: 0 };

  return (
    <Screen
      title={title}
      eyebrow={capitalize(fmtWeekdayDate(new Date()))}
      right={<ProfileButton />}
    >
      {!plan ? (
        <Card>
          <Empty
            icon="sparkles"
            title="Configura la tua scheda"
            text="Fattela creare dall'AI, converti quella che hai già oppure costruiscila a mano. Ci vogliono un paio di minuti."
          >
            <Button
              title="Inizia"
              icon="arrow-right"
              onPress={() => nav.navigate('PlanSetup')}
            />
          </Empty>
        </Card>
      ) : (
        <>
          {/* Numbers that matter, each in its color */}
          <StatRow>
            <StatTile
              icon="flame"
              color={c.orange}
              value={String(week.filter(Boolean).length)}
              label="Settimana"
            />
            <StatTile
              icon="trophy"
              color={c.yellow}
              value={String(streak)}
              unit="sett."
              label="Di fila"
            />
            <StatTile
              icon="chart"
              color={c.accent}
              value={String(sessions.length)}
              label="Totali"
            />
          </StatRow>

          {/* The one thing to do now */}
          {workout ? (
            <HeroCard color={liveColor} style={styles.block}>
              <View style={styles.rowGap}>
                <View style={styles.liveDot} />
                <T v="footnoteStrong" color="#FFFFFF">
                  Allenamento in corso
                </T>
              </View>
              <T
                v="title1"
                color="#FFFFFF"
                style={styles.heroTitle}
                numberOfLines={2}
              >
                {workout.dayName}
              </T>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(live.share * 100)}%` },
                  ]}
                />
              </View>
              <LiveLine done={live.done} total={live.total} />
              <HeroButton
                title="Riprendi"
                icon="play"
                color={liveColor}
                onPress={() => nav.navigate('Workout')}
                style={styles.heroBtn}
              />
            </HeroCard>
          ) : nextDay ? (
            <HeroCard color={nextColor} style={styles.block}>
              <T v="footnoteStrong" color="rgba(255,255,255,0.85)">
                Prossimo · Giorno {dayLetter(nextIndex)}
              </T>
              <T
                v="title1"
                color="#FFFFFF"
                style={styles.heroTitle}
                numberOfLines={2}
              >
                {nextDay.name}
              </T>
              <T v="subhead" color="rgba(255,255,255,0.85)" numberOfLines={2}>
                {plural(allExercises(nextDay).length, 'esercizio', 'esercizi')}{' '}
                · {fmtMinutes(estimateDayMinutes(nextDay))}
                {dayMuscles(nextDay).length
                  ? ` · ${dayMuscles(nextDay).slice(0, 3).join(', ')}`
                  : ''}
              </T>
              {restHint ? (
                <View style={styles.heroHint}>
                  <Icon name="moon" size={14} color="#FFFFFF" />
                  <T v="footnote" color="#FFFFFF" style={styles.flex}>
                    {restHint}
                  </T>
                </View>
              ) : null}
              <View style={styles.heroActions}>
                <HeroButton
                  title={
                    allExercises(nextDay).length ? 'Inizia' : 'Giorno vuoto'
                  }
                  icon="play"
                  color={nextColor}
                  onPress={() => start(nextDay)}
                  disabled={!allExercises(nextDay).length}
                  style={styles.flex}
                />
                <Tap
                  onPress={() => nav.navigate('Day', { dayId: nextDay.id })}
                  accessibilityRole="button"
                  accessibilityLabel="Anteprima esercizi"
                >
                  <View style={styles.heroRound}>
                    <Icon name="list" size={20} color="#FFFFFF" weight={2.3} />
                  </View>
                </Tap>
              </View>
            </HeroCard>
          ) : null}

          {/* Plan days */}
          <View style={[styles.rowBetween, styles.sectionHead]}>
            <View style={styles.flex}>
              <T v="footnoteStrong" color="secondary">
                I tuoi giorni
              </T>
              <T v="title3" numberOfLines={1}>
                {plan.name}
              </T>
            </View>
            <IconButton
              icon="ellipsis"
              onPress={planMenu}
              size={40}
              accessibilityLabel="Opzioni scheda"
              plain
            />
          </View>

          {plan.days.map((d, i) => {
            const last = lastSessionForDay(sessions, plan.id, d.id);
            const color = dayColor(i, c);
            const next = d.id === nextId && !workout;
            return (
              <Card
                key={d.id}
                onPress={() => nav.navigate('Day', { dayId: d.id })}
                style={styles.dayCard}
                accessibilityLabel={d.name}
              >
                <View style={styles.rowGap}>
                  <DayBadge index={i} filled={next} />
                  <View style={styles.flex}>
                    <T v="headline" numberOfLines={1}>
                      {d.name}
                    </T>
                    <T v="footnote" color="secondary" numberOfLines={1}>
                      {plural(allExercises(d).length, 'esercizio', 'esercizi')}{' '}
                      · {fmtMinutes(estimateDayMinutes(d))}
                      {last ? ` · ${fmtRelativeDay(last.startedAt)}` : ''}
                    </T>
                  </View>
                  {next ? (
                    <View
                      style={[
                        styles.nextPill,
                        { backgroundColor: withAlpha(color, 0.2) },
                      ]}
                    >
                      <T v="caption2" color={color} weight="700">
                        Prossimo
                      </T>
                    </View>
                  ) : null}
                  <Icon
                    name="chevron-right"
                    size={16}
                    color={c.tertiary}
                    weight={2.4}
                  />
                </View>
              </Card>
            );
          })}

          {/* Last activity */}
          {lastSession ? (
            <>
              <T
                v="footnoteStrong"
                color="secondary"
                style={styles.sectionLabel}
              >
                Attività
              </T>
              <Card
                onPress={() => nav.navigate('History')}
                accessibilityLabel="Storico allenamenti"
              >
                <View style={styles.rowGap}>
                  <View
                    style={[styles.actIcon, { backgroundColor: c.accentSoft }]}
                  >
                    <Icon
                      name="clock"
                      size={18}
                      color={c.accent}
                      weight={2.2}
                    />
                  </View>
                  <View style={styles.flex}>
                    <T v="headline" numberOfLines={1}>
                      {lastSession.dayName}
                    </T>
                    <T v="footnote" color="secondary" numberOfLines={1}>
                      {fmtRelativeDay(lastSession.startedAt)} ·{' '}
                      {fmtMinutes(Math.round(lastSession.durationSec / 60))} ·
                      Storico
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
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/** Sets done, or the rest counting down while you look at the plan. */
function LiveLine({ done, total }: { done: number; total: number }) {
  const phase = useTimer(t => t.phase);
  const remaining = useTimer(t => t.remaining);
  return (
    <T v="subhead" color="rgba(255,255,255,0.85)">
      {phase === 'rest'
        ? `Recupero ${fmtClock(remaining)} · ${done} di ${total} serie`
        : `${done} di ${total} serie`}
    </T>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  heroTitle: { marginTop: 6, marginBottom: 4 },
  heroHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroBtn: { marginTop: 16 },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  heroRound: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  sectionHead: { marginTop: 12, marginBottom: 10, paddingHorizontal: 4 },
  sectionLabel: { marginTop: 14, marginBottom: 8, paddingHorizontal: 4 },
  dayCard: { marginBottom: 10 },
  nextPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
