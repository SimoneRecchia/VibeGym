import { useMemo } from 'react';
import { useStore } from '../data/store';
import { useHealthDay } from '../services/health';
import { dayKey, dayStart, DAY_MS } from '../core/dates';
import { FoodLog, MealKey } from '../core/types';
import { dayTotals, MEALS } from './foods';
import { dayEnergy, kcalTarget, macroTargets, workoutKcal } from './energy';

/** Everything the diary needs for one day: food, burn, targets. */
export function useDayNutrition(day: string) {
  const logs = useStore(s => s.foodLog);
  const goals = useStore(s => s.settings.nutrition);
  const profile = useStore(s => s.profile);
  const body = useStore(s => s.body);
  const sessions = useStore(s => s.sessions);
  const health = useHealthDay(day);

  return useMemo(() => {
    const start = dayStart(day);
    const end = start + DAY_MS;
    const dayLogs = logs.filter(l => l.day === day);
    const byMeal = Object.fromEntries(
      MEALS.map(m => [m.key, dayLogs.filter(l => l.meal === m.key)]),
    ) as Record<MealKey, FoodLog[]>;
    const totals = dayTotals(dayLogs);

    // Body data known on that day.
    const known = body.filter(b => Date.parse(b.date) < end);
    const weightKg = known[known.length - 1]?.weightKg;
    const comp = [...known].reverse().find(b => b.bmrKcal != null);
    const scaleBmr =
      comp && end - Date.parse(comp.date) < 45 * DAY_MS
        ? comp.bmrKcal
        : undefined;

    const daySessions = sessions.filter(
      s => dayKey(Date.parse(s.startedAt)) === day,
    );
    const energy = dayEnergy({
      profile,
      weightKg,
      scaleBmr,
      sessions: daySessions,
      health,
    });

    // Usual burn: light everyday activity + the average training load of
    // the last two weeks (used when the target doesn't follow the day).
    const kg = weightKg ?? 70;
    const recent = sessions.filter(
      s => Date.parse(s.startedAt) >= start - 14 * DAY_MS,
    );
    const avgWorkout =
      recent.reduce((a, s) => a + workoutKcal(s.durationSec, kg), 0) / 14;
    const typical = Math.round(energy.basal * 1.2 + avgWorkout);

    const kcalGoal = kcalTarget(goals, { day: energy.total, typical });
    const macros = macroTargets(goals, kcalGoal);
    return {
      logs: dayLogs,
      byMeal,
      totals,
      energy,
      typical,
      kcalGoal,
      macros,
      goals,
    };
  }, [day, logs, goals, profile, body, sessions, health]);
}

/** kcal eaten per day for a list of day keys. */
export const useKcalByDay = (days: string[]) => {
  const logs = useStore(s => s.foodLog);
  return useMemo(() => {
    const set = new Set(days);
    const out: Record<string, number> = {};
    for (const l of logs) {
      if (!set.has(l.day)) continue;
      out[l.day] = (out[l.day] ?? 0) + (l.food.kcal * l.qty) / 100;
    }
    return out;
  }, [logs, days]);
};
