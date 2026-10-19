/**
 * Right tab: food diary. Calories left for the day (target from the burn
 * and the goal), macros, energy expenditure and the four meals.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../data/store';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../ui/Screen';
import { ProfileButton } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';
import { IconButton } from '../ui/Button';
import { Icon, IconName } from '../ui/Icon';
import { Tap } from '../ui/Pressable';
import { Ring } from '../ui/charts/Ring';
import { toast } from '../ui/Toast';
import { showMenu } from '../ui/Menu';
import { FoodLog, MealKey } from '../core/types';
import {
  MEALS,
  fmtPortion,
  logNutrients,
  mealForNow,
} from '../nutrition/foods';
import { useDayNutrition, useKcalByDay } from '../nutrition/useDayNutrition';
import { goalOffset } from '../nutrition/energy';
import { healthPlatformName } from '../services/health';
import { DAY_MS, addDays, dayKey, dayStart, startOfWeek } from '../core/dates';
import {
  capitalize,
  fmtNum,
  fmtWeekdayDate,
} from '../core/format';
import { numeric } from '../theme/typography';
import { mix, withAlpha } from '../theme/colors';
import { BLOCK } from '../theme/metrics';
import { Row, Section } from '../ui/List';
import { Bar } from '../ui/charts/Bar';
import { SwipeDays } from '../ui/SwipeDays';
import { DayStrip } from './nutrition/DayStrip';
import { Nav } from '../navigation/types';
import { FoodEntrySheet, EntryValue } from './nutrition/FoodEntrySheet';
import { MACRO_COLOR, MACRO_KEYS, MACRO_LABEL } from './nutrition/macroColors';
import { Fab } from '../ui/Fab';

export function NutritionTab() {
  const nav = useNavigation<Nav>();
  const { c } = useTheme();
  const [day, setDay] = useState(dayKey());
  const today = dayKey();
  const n = useDayNutrition(day);
  const updateLog = useStore(s => s.updateFoodLog);
  const deleteLog = useStore(s => s.deleteFoodLog);
  const restoreLog = useStore(s => s.restoreFoodLog);
  const logFood = useStore(s => s.logFood);
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const [showEnergy, setShowEnergy] = useState(false);

  const weekStart = startOfWeek(dayStart(day));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i))),
    [weekStart],
  );
  const kcalByDay = useKcalByDay(weekDays);

  const left = n.kcalGoal - n.totals.kcal;
  const label =
    day === today
      ? 'Oggi'
      : day === dayKey(Date.now() - DAY_MS)
      ? 'Ieri'
      : capitalize(fmtWeekdayDate(dayStart(day)));

  const add = (meal: MealKey) => nav.navigate('FoodAdd', { day, meal });
  const defaultMeal = day === today ? mealForNow() : 'lunch';

  const remove = (l: FoodLog) => {
    deleteLog(l.id);
    toast(`${l.food.name} eliminato`, 'trash', {
      label: 'Annulla',
      onPress: () => restoreLog(l),
    });
  };

  const entryMenu = (l: FoodLog) =>
    showMenu({
      title: l.food.name,
      options: [
        { label: 'Modifica', icon: 'pencil', onPress: () => setEditing(l) },
        {
          label: day === today ? 'Aggiungi di nuovo' : 'Copia su oggi',
          icon: 'copy',
          onPress: () => {
            logFood({
              day: today,
              meal: day === today ? l.meal : mealForNow(),
              food: l.food,
              qty: l.qty,
              portion: l.portion,
            });
            toast('Aggiunto a oggi');
          },
        },
        {
          label: 'Elimina',
          icon: 'trash',
          destructive: true,
          onPress: () => remove(l),
        },
      ],
    });

  const copyMealToToday = (meal: MealKey) => {
    const list = n.byMeal[meal];
    list.forEach(l =>
      logFood({
        day: today,
        meal,
        food: l.food,
        qty: l.qty,
        portion: l.portion,
      }),
    );
    toast(`${list.length} alimenti copiati su oggi`);
  };

  return (
    <Screen
      title="Nutrizione"
      eyebrow={label}
      right={<ProfileButton />}
      fab={<Fab label="Aggiungi cibo" onPress={() => add(defaultMeal)} />}
    >
      <DayStrip
        days={weekDays}
        selected={day}
        today={today}
        kcalByDay={kcalByDay}
        goal={n.kcalGoal}
        onSelect={setDay}
        onWeek={dir => setDay(dayKey(addDays(dayStart(day), dir * 7)))}
      />
      {day !== today ? (
        <Tap onPress={() => setDay(today)} style={styles.todayLink}>
          <T v="footnoteStrong" color="accent">
            Torna a oggi
          </T>
        </Tap>
      ) : (
        <View style={styles.stripGap} />
      )}

      {/* Swipe left / right on the day to move to the next / previous one */}
      <SwipeDays onSwipe={dir => setDay(dayKey(addDays(dayStart(day), dir)))}>
        {/* Calories + macros */}
        <Card
          style={styles.block}
          onPress={() =>
            nav.navigate('Settings', { screen: 'NutritionSettings' })
          }
          accessibilityLabel="Obiettivi di nutrizione"
        >
          <View style={styles.hero}>
            <Ring
              progress={n.kcalGoal ? n.totals.kcal / n.kcalGoal : 0}
              size={136}
              stroke={14}
              gradient={left < 0 ? c.gold : c.energy}
            >
              <T style={[numeric(30), { color: c.label }]}>
                {fmtNum(Math.abs(left), 0)}
              </T>
              <T v="caption" color="secondary">
                {left >= 0 ? 'kcal rimaste' : 'kcal in più'}
              </T>
            </Ring>
            <View style={styles.heroSide}>
              <Stat label="Obiettivo" value={n.kcalGoal} />
              <Stat
                label="Mangiate"
                value={n.totals.kcal}
                color={c.energy[0]}
              />
            </View>
          </View>
          <View style={styles.macros}>
            {MACRO_KEYS.map(k => {
              const eaten = n.totals[k];
              const goal = n.macros[k];
              return (
                <View key={k} style={styles.macro}>
                  <T v="footnoteStrong" color={MACRO_COLOR[k]}>
                    {MACRO_LABEL[k]}
                  </T>
                  <Bar
                    progress={goal ? eaten / goal : 0}
                    gradient={[
                      MACRO_COLOR[k],
                      mix(MACRO_COLOR[k], '#FFFFFF', 0.35),
                    ]}
                  />
                  <T v="footnoteStrong">
                    {fmtNum(eaten, 0)}
                    <T v="footnote" color="secondary">
                      {` / ${fmtNum(goal, 0)} g`}
                    </T>
                  </T>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Energy: one line, details on demand */}
        <Section>
          <Row
            icon="flame"
            iconBg={c.done[0]}
            title="Consumo stimato"
            value={`${fmtNum(n.energy.total, 0)} kcal`}
            right={
              <Icon
                name={showEnergy ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={c.tertiary}
                weight={2.4}
              />
            }
            onPress={() => setShowEnergy(v => !v)}
          />
          {showEnergy ? (
            <View style={styles.energyRows}>
              <EnergyRow
                icon="flame"
                label="Metabolismo basale"
                kcal={n.energy.basal}
              />
              {n.energy.fromHealth ? (
                <EnergyRow
                  icon="run"
                  label={`Attività (${healthPlatformName})`}
                  kcal={n.energy.active}
                />
              ) : (
                <>
                  <EnergyRow
                    icon="run"
                    label={
                      n.energy.steps != null
                        ? `${fmtNum(n.energy.steps, 0)} passi`
                        : 'Attività quotidiana (stima)'
                    }
                    kcal={
                      n.energy.assumed
                        ? n.energy.active - n.energy.workoutKcal
                        : n.energy.stepsKcal
                    }
                  />
                  {n.energy.workouts ? (
                    <EnergyRow
                      icon="dumbbell"
                      label={
                        n.energy.workouts === 1
                          ? 'Allenamento'
                          : `${n.energy.workouts} allenamenti`
                      }
                      kcal={n.energy.workoutKcal}
                    />
                  ) : null}
                </>
              )}
              <T v="caption" color="tertiary">
                {goalLine(n.goals, n.energy.total)}
              </T>
              {n.energy.assumed ? (
                <Tap
                  onPress={() =>
                    nav.navigate('Settings', { screen: 'HealthSettings' })
                  }
                >
                  <T v="footnote" color="accent">
                    Collega {healthPlatformName} per contare i passi
                  </T>
                </Tap>
              ) : null}
            </View>
          ) : null}
        </Section>

        {/* Meals: one grouped list each */}
        {MEALS.map(m => {
          const list = n.byMeal[m.key];
          const kcal = list.reduce((a, l) => a + logNutrients(l).kcal, 0);
          const ms = mealStyle(c)[m.key];
          return (
            <Section key={m.key}>
              <Row
                left={
                  <View
                    style={[
                      styles.mealIcon,
                      { backgroundColor: withAlpha(ms.color, 0.16) },
                    ]}
                  >
                    <Icon
                      name={ms.icon}
                      size={17}
                      color={ms.color}
                      weight={2.3}
                    />
                  </View>
                }
                title={m.label}
                value={list.length ? `${fmtNum(kcal, 0)} kcal` : undefined}
                right={
                  <View style={styles.mealActions}>
                    {day !== today && list.length ? (
                      <IconButton
                        icon="copy"
                        plain
                        size={34}
                        color={c.secondary}
                        onPress={() => copyMealToToday(m.key)}
                        accessibilityLabel={`Copia ${m.label.toLowerCase()} su oggi`}
                      />
                    ) : null}
                    <IconButton
                      icon="plus"
                      plain
                      size={34}
                      tint={c.accentSoft}
                      color={c.accent}
                      onPress={() => add(m.key)}
                      accessibilityLabel={`Aggiungi a ${m.label.toLowerCase()}`}
                    />
                  </View>
                }
              />
              {list.map(l => (
                <Row
                  key={l.id}
                  title={l.food.name}
                  subtitle={[
                    l.food.brand,
                    l.portion
                      ? `${fmtPortion(l.portion)} (${fmtNum(l.qty, 0)} ${
                          l.food.unit
                        })`
                      : `${fmtNum(l.qty, 0)} ${l.food.unit}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  value={fmtNum(logNutrients(l).kcal, 0)}
                  onPress={() => setEditing(l)}
                  onLongPress={() => entryMenu(l)}
                />
              ))}
            </Section>
          );
        })}
      </SwipeDays>

      <FoodEntrySheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        food={editing?.food ?? null}
        mode="edit"
        initial={{
          qty: editing?.qty ?? 100,
          meal: editing?.meal ?? 'lunch',
          portion: editing?.portion,
        }}
        onSubmit={(v: EntryValue) => {
          if (editing)
            updateLog(editing.id, {
              qty: v.qty,
              meal: v.meal,
              portion: v.portion,
            });
          setEditing(null);
        }}
        onDelete={() => {
          if (editing) {
            const l = editing;
            setEditing(null);
            remove(l);
          }
        }}
      />
    </Screen>
  );
}

const goalLine = (
  g: ReturnType<typeof useDayNutrition>['goals'],
  burn: number,
) => {
  if (g.macroMode === 'g') return 'Obiettivo calcolato dai grammi dei macro.';
  if (g.mode === 'manual') return 'Obiettivo fisso. Tocca per cambiarlo.';
  const off = goalOffset(g);
  const what =
    g.goal === 'maintain'
      ? 'per mantenere il peso'
      : `${off < 0 ? '−' : '+'}${fmtNum(Math.abs(off), 0)} kcal per ${
          g.goal === 'lose' ? 'perdere' : 'prendere'
        } ${fmtNum(g.rate, 2)} kg a settimana`;
  return g.adaptive
    ? `Consumo di oggi (${fmtNum(burn, 0)} kcal) ${what}.`
    : `Consumo abituale ${what}.`;
};

/** Icon and color of each meal. */
const mealStyle = (c: {
  yellow: string;
  orange: string;
  green: string;
  accent: string;
}): Record<MealKey, { icon: IconName; color: string }> => ({
  breakfast: { icon: 'sun', color: c.yellow },
  lunch: { icon: 'fork', color: c.orange },
  snack: { icon: 'bolt', color: c.green },
  dinner: { icon: 'moon', color: c.accent },
});

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const { c } = useTheme();
  return (
    <View>
      <T v="footnote" color="secondary">
        {label}
      </T>
      <T style={[numeric(24), { color: color ?? c.label }]}>
        {fmtNum(value, 0)}
        <T v="footnoteStrong" color="secondary">
          {' kcal'}
        </T>
      </T>
    </View>
  );
}

function EnergyRow({
  icon,
  label,
  kcal,
}: {
  icon: 'flame' | 'run' | 'dumbbell';
  label: string;
  kcal: number;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.energyRow}>
      <View style={[styles.energyIcon, { backgroundColor: c.fill3 }]}>
        <Icon name={icon} size={16} color={c.secondary} />
      </View>
      <T v="subhead" style={styles.flex} numberOfLines={1}>
        {label}
      </T>
      <T v="subhead" color="secondary">
        {fmtNum(kcal, 0)} kcal
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: BLOCK },
  flex: { flex: 1, minWidth: 0 },
  stripGap: { height: BLOCK },
  todayLink: { alignSelf: 'center', paddingVertical: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroSide: { flex: 1, gap: 16 },
  macros: { flexDirection: 'row', gap: 16, marginTop: 22 },
  macro: { flex: 1, gap: 8 },
  energyRows: { paddingHorizontal: 18, paddingBottom: 16, gap: 12 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  energyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealActions: { flexDirection: 'row', gap: 8 },
});
