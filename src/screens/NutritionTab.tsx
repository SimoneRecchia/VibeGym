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
import { Icon } from '../ui/Icon';
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
  fmtDateShort,
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
      {/* Week */}
      <Card style={styles.block}>
        <View style={styles.rowBetween}>
          <IconButton
            icon="chevron-left"
            plain
            size={32}
            onPress={() => setDay(dayKey(addDays(dayStart(day), -7)))}
            accessibilityLabel="Settimana precedente"
          />
          <T v="subheadStrong" color="secondary">
            {fmtDateShort(weekStart)} – {fmtDateShort(addDays(weekStart, 6))}
          </T>
          <IconButton
            icon="chevron-right"
            plain
            size={32}
            onPress={() => setDay(dayKey(addDays(dayStart(day), 7)))}
            accessibilityLabel="Settimana successiva"
          />
        </View>
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
                    on && { backgroundColor: c.accentSoft },
                  ]}
                >
                  <Ring
                    progress={n.kcalGoal ? eaten / n.kcalGoal : 0}
                    size={34}
                    stroke={4}
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
        {day !== today ? (
          <Tap onPress={() => setDay(today)} style={styles.todayLink}>
            <T v="footnoteStrong" color="accent">
              Torna a oggi
            </T>
          </Tap>
        ) : null}
      </Card>

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
            <Stat label="Obiettivo" value={n.kcalGoal} />
            <Stat label="Mangiate" value={n.totals.kcal} />
            <Stat label="Consumo" value={n.energy.total} muted />
          </View>
        </View>
        <View style={styles.macros}>
          {MACRO_KEYS.map(k => {
            const eaten = n.totals[k];
            const goal = n.macros[k];
            return (
              <View key={k} style={styles.macro}>
                <T v="footnote" color="secondary">
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
        <T v="caption" color="tertiary" style={styles.goalNote}>
          {goalLine(n.goals, n.energy.total)}
        </T>
      </Card>

      {/* Energy */}
      <Card style={styles.block}>
        <View style={styles.rowBetween}>
          <T v="headline">Consumo stimato</T>
          <T v="headline">{fmtNum(n.energy.total, 0)} kcal</T>
        </View>
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
        </View>
        {n.energy.assumed ? (
          <Tap
            onPress={() =>
              nav.navigate('Settings', { screen: 'HealthSettings' })
            }
            style={styles.healthLink}
          >
            <T v="footnote" color="accent">
              Collega {healthPlatformName} per contare i passi del telefono o
              dello smartwatch
            </T>
          </Tap>
        ) : null}
      </Card>

      {/* Meals */}
      {MEALS.map(m => {
        const list = n.byMeal[m.key];
        const kcal = list.reduce((a, l) => a + logNutrients(l).kcal, 0);
        return (
          <Card key={m.key} style={styles.block} padded={false}>
            <View style={styles.mealHead}>
              <View style={styles.flex}>
                <T v="headline">{m.label}</T>
                {list.length ? (
                  <T v="footnote" color="secondary">
                    {fmtNum(kcal, 0)} kcal
                  </T>
                ) : null}
              </View>
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

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <View>
      <T v="footnote" color="secondary">
        {label}
      </T>
      <T v="headline" color={muted ? 'secondary' : 'label'}>
        {fmtNum(value, 0)} kcal
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
  block: { marginBottom: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  weekDay: { alignItems: 'center', gap: 6 },
  dayRing: { padding: 3, borderRadius: 24 },
  todayLink: { alignSelf: 'center', marginTop: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  heroSide: { flex: 1, gap: 8 },
  macros: { flexDirection: 'row', gap: 14, marginTop: 18 },
  macro: { flex: 1, gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  goalNote: { marginTop: 14 },
  energyRows: { marginTop: 10, gap: 10 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  energyIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthLink: { marginTop: 12 },
  mealHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
