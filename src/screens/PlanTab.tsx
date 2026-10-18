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
  fmtWeekdayDate,
  greeting,
  plural,
  WEEKDAYS_NARROW,
} from '../core/format';
import {
  allExercises,
  dayMuscles,
  estimateDayMinutes,
  lastSessionForDay,
  nextDayId,
} from '../plan/planUtils';
import { trainedThisWeek } from '../stats/progress';
import { planToJson } from '../plan/aiFormat';
import { Nav } from '../navigation/types';
import { useDraft } from '../data/draft';
import { Day } from '../core/types';
import { workoutProgress } from '../workout/engine';

export function PlanTab() {
  const nav = useNavigation<Nav>();
  const { c } = useTheme();
  const name = useStore(s => s.profile.name);
  const plan = useStore(selectActivePlan);
  const sessions = useStore(s => s.sessions);
  const workout = useStore(s => s.workout);
  const startWorkout = useStore(s => s.startWorkout);

  const nextId = useMemo(
    () => (plan ? nextDayId(plan, sessions) : undefined),
    [plan, sessions],
  );
  const week = useMemo(() => trainedThisWeek(sessions), [sessions]);
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

  const todayIdx = (new Date().getDay() + 6) % 7;
  const nextDay = plan?.days.find(d => d.id === nextId);
  const nextIndex = plan && nextDay ? plan.days.indexOf(nextDay) : 0;

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
          {/* This week */}
          <Card style={styles.block}>
            <View style={styles.rowBetween}>
              <T v="headline">Questa settimana</T>
              <T v="subhead" color="secondary">
                {plural(
                  week.filter(Boolean).length,
                  'allenamento',
                  'allenamenti',
                )}
              </T>
            </View>
            <View style={styles.week}>
              {week.map((done, i) => (
                <View key={i} style={styles.weekDay}>
                  <T
                    v="caption"
                    color={i === todayIdx ? 'accent' : 'secondary'}
                    weight={i === todayIdx ? '700' : '500'}
                  >
                    {WEEKDAYS_NARROW[(i + 1) % 7]}
                  </T>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: done ? c.accent : c.fill3,
                        borderColor:
                          i === todayIdx && !done ? c.accent : c.fill3,
                      },
                    ]}
                  >
                    {done ? (
                      <Icon
                        name="check"
                        size={14}
                        color={c.onAccent}
                        weight={2.8}
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Next workout */}
          {workout ? (
            <Card style={styles.block}>
              <View style={styles.rowGap}>
                <View style={[styles.liveDot, { backgroundColor: c.green }]} />
                <T v="footnoteStrong" color="green">
                  ALLENAMENTO IN CORSO
                </T>
              </View>
              <T v="title2" style={styles.heroTitle} numberOfLines={2}>
                {workout.dayName}
              </T>
              <T v="subhead" color="secondary">
                {(() => {
                  const p = workoutProgress(workout);
                  return `${p.done} di ${p.total} serie completate`;
                })()}
              </T>
              <Button
                title="Riprendi"
                icon="play"
                onPress={() => nav.navigate('Workout')}
                style={styles.heroBtn}
              />
            </Card>
          ) : nextDay ? (
            <Card style={styles.block}>
              <T v="footnoteStrong" color="secondary">
                PROSSIMO ALLENAMENTO
              </T>
              <View style={[styles.rowGap, styles.heroHead]}>
                <DayBadge index={nextIndex} size={52} filled />
                <View style={styles.flex}>
                  <T v="title2" numberOfLines={2}>
                    {nextDay.name}
                  </T>
                  <T v="subhead" color="secondary" numberOfLines={1}>
                    {plural(
                      allExercises(nextDay).length,
                      'esercizio',
                      'esercizi',
                    )}{' '}
                    · {fmtMinutes(estimateDayMinutes(nextDay))}
                  </T>
                </View>
              </View>
              {dayMuscles(nextDay).length ? (
                <T v="subhead" color="secondary" style={styles.muscles}>
                  {dayMuscles(nextDay).join(' · ')}
                </T>
              ) : null}
              <View style={styles.heroActions}>
                <Button
                  title="Inizia"
                  icon="play"
                  onPress={() => start(nextDay)}
                  style={styles.flex}
                />
                <IconButton
                  icon="list"
                  onPress={() => nav.navigate('Day', { dayId: nextDay.id })}
                  size={54}
                  accessibilityLabel="Anteprima esercizi"
                  plain
                />
              </View>
            </Card>
          ) : null}

          {/* Plan days */}
          <View style={[styles.rowBetween, styles.sectionHead]}>
            <View style={styles.flex}>
              <T v="title3" numberOfLines={1}>
                {plan.name}
              </T>
              <T v="footnote" color="secondary">
                {plural(plan.days.length, 'giorno', 'giorni')}
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
            return (
              <Card
                key={d.id}
                onPress={() => nav.navigate('Day', { dayId: d.id })}
                style={styles.dayCard}
                accessibilityLabel={d.name}
              >
                <View style={styles.rowGap}>
                  <DayBadge index={i} />
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
                  {d.id === nextId && !workout ? (
                    <View
                      style={[
                        styles.nextPill,
                        { backgroundColor: c.accentSoft },
                      ]}
                    >
                      <T v="caption2" color="accent" weight="700">
                        PROSSIMO
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
        </>
      )}
    </Screen>
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
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  weekDay: { alignItems: 'center', gap: 6 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  heroHead: { marginTop: 12 },
  heroTitle: { marginTop: 8 },
  heroBtn: { marginTop: 16 },
  muscles: { marginTop: 10 },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  sectionHead: { marginTop: 16, marginBottom: 10, paddingHorizontal: 4 },
  dayCard: { marginBottom: 10 },
  nextPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
});
