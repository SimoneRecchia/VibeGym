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
import { Button, IconButton } from '../ui/Button';
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
  WEEKDAYS_NARROW,
  capitalize,
  fmtNum,
  fmtWeekdayDate,
} from '../core/format';
import { numeric } from '../theme/typography';
import { withAlpha } from '../theme/colors';
import { Nav } from '../navigation/types';
import { FoodEntrySheet, EntryValue } from './nutrition/FoodEntrySheet';
import { MACRO_COLOR, MACRO_KEYS, MACRO_LABEL } from './nutrition/macroColors';

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
      footer={
        <View style={styles.footer}>
          <Button
            title="Aggiungi cibo"
            icon="plus"
            variant="glass"
            onPress={() => add(defaultMeal)}
            style={styles.flex}
          />
          <IconButton
            icon="barcode"
            size={54}
            onPress={() => nav.navigate('Scanner', { day, meal: defaultMeal })}
            accessibilityLabel="Scansiona un prodotto"
          />
        </View>
      }
    >
      {/* Week: one light row, arrows at the ends */}
      <View style={styles.weekRow}>
        <IconButton
          icon="chevron-left"
          plain
          size={30}
          onPress={() => setDay(dayKey(addDays(dayStart(day), -7)))}
          accessibilityLabel="Settimana precedente"
        />
        <View style={styles.week}>
          {weekDays.map((d, i) => {
            const on = d === day;
            const isToday = d === today;
            const eaten = kcalByDay[d] ?? 0;
            return (
              <Tap
                key={d}
                onPress={() => setDay(d)}
                style={styles.weekDay}
                scaleTo={0.9}
                accessibilityLabel={fmtWeekdayDate(dayStart(d))}
                accessibilityState={{ selected: on }}
              >
                <T
                  v="caption"
                  color={isToday ? 'accent' : 'secondary'}
                  weight={isToday ? '700' : '500'}
                >
                  {WEEKDAYS_NARROW[(i + 1) % 7]}
                </T>
                <View
                  style={[
                    styles.dayRing,
                    { backgroundColor: on ? c.accentSoft : CLEAR },
                  ]}
                >
                  <Ring
                    progress={n.kcalGoal ? eaten / n.kcalGoal : 0}
                    size={32}
                    stroke={3.5}
                    color={eaten > n.kcalGoal * 1.05 ? c.orange : c.accent}
                  >
                    <T v="caption2" color={on ? 'accent' : 'label'}>
                      {new Date(dayStart(d)).getDate()}
                    </T>
                  </Ring>
                </View>
              </Tap>
            );
          })}
        </View>
        <IconButton
          icon="chevron-right"
          plain
          size={30}
          onPress={() => setDay(dayKey(addDays(dayStart(day), 7)))}
          accessibilityLabel="Settimana successiva"
        />
      </View>
      {day !== today ? (
        <Tap onPress={() => setDay(today)} style={styles.todayLink}>
          <T v="footnoteStrong" color="accent">
            Torna a oggi
          </T>
        </Tap>
      ) : null}

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
            size={128}
            stroke={12}
            color={left < 0 ? c.orange : c.accent}
          >
            <T style={[numeric(28), { color: c.label }]}>
              {fmtNum(Math.abs(left), 0)}
            </T>
            <T v="caption" color="secondary">
              {left >= 0 ? 'kcal rimaste' : 'kcal in più'}
            </T>
          </Ring>
          <View style={styles.heroSide}>
            <Stat
              label="Obiettivo"
              value={n.kcalGoal}
              icon="target"
              color={c.accent}
            />
            <Stat
              label="Mangiate"
              value={n.totals.kcal}
              icon="fork"
              color={c.orange}
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
                <View
                  style={[
                    styles.track,
                    { backgroundColor: withAlpha(MACRO_COLOR[k], 0.18) },
                  ]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        backgroundColor: MACRO_COLOR[k],
                        width: `${Math.min(
                          100,
                          goal ? (eaten / goal) * 100 : 0,
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <T v="footnoteStrong">
                  {fmtNum(eaten, 0)}
                  <T v="footnote" color="secondary">
                    {' '}
                    / {fmtNum(goal, 0)} g
                  </T>
                </T>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Energy: one line, details on demand */}
      <Card style={styles.block} padded={false}>
        <Tap
          onPress={() => setShowEnergy(v => !v)}
          scaleTo={0.99}
          accessibilityRole="button"
          accessibilityLabel="Consumo stimato"
          accessibilityState={{ expanded: showEnergy }}
        >
          <View style={styles.energyHead}>
            <View
              style={[
                styles.energyIcon,
                { backgroundColor: withAlpha(c.green, 0.18) },
              ]}
            >
              <Icon name="flame" size={16} color={c.green} weight={2.3} />
            </View>
            <T v="headline" style={styles.flex}>
              Consumo stimato
            </T>
            <T v="headline">{fmtNum(n.energy.total, 0)} kcal</T>
            <Icon
              name={showEnergy ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={c.tertiary}
              weight={2.4}
            />
          </View>
        </Tap>
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
      </Card>

      {/* Meals */}
      {MEALS.map(m => {
        const list = n.byMeal[m.key];
        const kcal = list.reduce((a, l) => a + logNutrients(l).kcal, 0);
        return (
          <Card key={m.key} style={styles.block} padded={false}>
            <View style={styles.mealHead}>
              <View
                style={[
                  styles.mealIcon,
                  {
                    backgroundColor: withAlpha(mealStyle(c)[m.key].color, 0.18),
                  },
                ]}
              >
                <Icon
                  name={mealStyle(c)[m.key].icon}
                  size={17}
                  color={mealStyle(c)[m.key].color}
                  weight={2.3}
                />
              </View>
              <T v="headline" style={styles.flex}>
                {m.label}
              </T>
              {list.length ? (
                <T v="subheadStrong" color="secondary">
                  {fmtNum(kcal, 0)} kcal
                </T>
              ) : null}
              {day !== today && list.length ? (
                <IconButton
                  icon="copy"
                  plain
                  size={34}
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
            {list.map(l => (
              <Tap
                key={l.id}
                onPress={() => setEditing(l)}
                onLongPress={() => entryMenu(l)}
                scaleTo={0.99}
              >
                <View
                  style={[
                    styles.entry,
                    {
                      borderTopColor: c.separator,
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <T v="body" numberOfLines={1}>
                      {l.food.name}
                    </T>
                    <T v="footnote" color="secondary" numberOfLines={1}>
                      {[
                        l.food.brand,
                        l.portion
                          ? `${fmtPortion(l.portion)} (${fmtNum(l.qty, 0)} ${
                              l.food.unit
                            })`
                          : `${fmtNum(l.qty, 0)} ${l.food.unit}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </T>
                  </View>
                  <T v="subheadStrong">{fmtNum(logNutrients(l).kcal, 0)}</T>
                </View>
              </Tap>
            ))}
          </Card>
        );
      })}

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

const CLEAR = 'transparent';

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
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <View
        style={[styles.statIcon, { backgroundColor: withAlpha(color, 0.18) }]}
      >
        <Icon name={icon} size={14} color={color} weight={2.3} />
      </View>
      <View>
        <T v="footnote" color="secondary">
          {label}
        </T>
        <T v="headline">{fmtNum(value, 0)} kcal</T>
      </View>
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
  block: { marginBottom: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
  },
  week: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6 },
  dayRing: { padding: 3, borderRadius: 24 },
  todayLink: { alignSelf: 'center', marginTop: -4, marginBottom: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  heroSide: { flex: 1, gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macros: { flexDirection: 'row', gap: 14, marginTop: 18 },
  macro: { flex: 1, gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  energyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  energyRows: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  energyIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
