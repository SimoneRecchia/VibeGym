import { ExerciseKind, PersonalRecord, Session } from '../core/types';
import { addDays, startOfWeek } from '../core/dates';
import { MetricKey, metricsOf, metricsFor, sessionVolume } from './metrics';
import { MUSCLE_FILTERS, getCatalogExercise } from '../catalog';

export interface Point {
  t: number;
  v: number;
}

export interface ExerciseSummary {
  key: string;
  name: string;
  catalogId?: string;
  kind: ExerciseKind;
  weighted: boolean;
  sessions: number;
  lastAt: number;
  metric: MetricKey;
  series: Point[];
  best: number;
  last: number;
  /** Change of the main metric over the window, in % (null if not enough data). */
  changePct: number | null;
}

/** Value of a metric for one session exercise. */
const pick = (m: ReturnType<typeof metricsOf>, k: MetricKey): number => m[k];

/** Time series of a metric for an exercise key (one point per session). */
export const exerciseSeries = (
  sessions: Session[],
  key: string,
  metric: MetricKey,
  since = 0,
): Point[] => {
  const out: Point[] = [];
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    if (t < since) continue;
    for (const e of s.exercises) {
      if (e.key !== key) continue;
      const m = metricsOf(e);
      if (!m.setsDone) continue;
      const v = pick(m, metric);
      if (v > 0) out.push({ t, v });
    }
  }
  return out;
};

/** Every exercise trained at least once, with its main metric, most recent first. */
export const exerciseSummaries = (
  sessions: Session[],
  since = 0,
  keys?: Set<string>,
): ExerciseSummary[] => {
  const byKey = new Map<
    string,
    {
      name: string;
      catalogId?: string;
      kind: ExerciseKind;
      weighted: boolean;
      count: number;
      lastAt: number;
    }
  >();
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    for (const e of s.exercises) {
      if (keys && !keys.has(e.key)) continue;
      const m = metricsOf(e);
      if (!m.setsDone) continue;
      const cur = byKey.get(e.key);
      const weighted = m.maxKg > 0;
      if (!cur)
        byKey.set(e.key, {
          name: e.name,
          catalogId: e.catalogId,
          kind: e.kind,
          weighted,
          count: 1,
          lastAt: t,
        });
      else {
        cur.count++;
        cur.lastAt = Math.max(cur.lastAt, t);
        cur.weighted = cur.weighted || weighted;
        cur.name = e.name;
      }
    }
  }
  const out: ExerciseSummary[] = [];
  for (const [key, info] of byKey) {
    const metric = metricsFor(info.kind, info.weighted)[0];
    const all = exerciseSeries(sessions, key, metric);
    const series = all.filter(p => p.t >= since);
    if (!series.length) continue;
    const best = Math.max(...all.map(p => p.v));
    const last = series[series.length - 1].v;
    const first = series[0].v;
    out.push({
      key,
      name: info.name,
      catalogId: info.catalogId,
      kind: info.kind,
      weighted: info.weighted,
      sessions: info.count,
      lastAt: info.lastAt,
      metric,
      series,
      best,
      last,
      changePct:
        series.length >= 2 && first > 0 ? ((last - first) / first) * 100 : null,
    });
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
};

export interface WeekBucket {
  start: number;
  workouts: number;
  volume: number;
  minutes: number;
}

/** Last `n` weeks (oldest first), including the current one. */
export const weeklyActivity = (
  sessions: Session[],
  n = 12,
  now = Date.now(),
): WeekBucket[] => {
  const current = startOfWeek(now);
  const weeks: WeekBucket[] = Array.from({ length: n }, (_, i) => ({
    start: addDays(current, -7 * (n - 1 - i)),
    workouts: 0,
    volume: 0,
    minutes: 0,
  }));
  const index = new Map(weeks.map((w, i) => [w.start, i]));
  for (const s of sessions) {
    const i = index.get(startOfWeek(Date.parse(s.startedAt)));
    if (i == null) continue;
    weeks[i].workouts++;
    weeks[i].volume += sessionVolume(s);
    weeks[i].minutes += s.durationSec / 60;
  }
  return weeks;
};

/** Consecutive weeks with at least one workout, ending this week (or last). */
export const weekStreak = (sessions: Session[], now = Date.now()): number => {
  const weeks = new Set(
    sessions.map(s => startOfWeek(Date.parse(s.startedAt))),
  );
  let w = startOfWeek(now);
  if (!weeks.has(w)) w = addDays(w, -7);
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w = addDays(w, -7);
  }
  return n;
};

/** Days of the current week (Mon..Sun) with a workout. */
export const trainedThisWeek = (
  sessions: Session[],
  now = Date.now(),
): boolean[] => {
  const start = startOfWeek(now);
  const out = Array(7).fill(false);
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    if (t < start || t >= addDays(start, 7)) continue;
    out[Math.floor((t - start) / 86400000)] = true;
  }
  return out;
};

export interface DatedRecord extends PersonalRecord {
  at: string;
  sessionId: string;
}

export const recentRecords = (
  sessions: Session[],
  limit = 5,
): DatedRecord[] => {
  const out: DatedRecord[] = [];
  for (let i = sessions.length - 1; i >= 0 && out.length < limit; i--) {
    for (const r of sessions[i].records ?? []) {
      out.push({ ...r, at: sessions[i].startedAt, sessionId: sessions[i].id });
      if (out.length >= limit) break;
    }
  }
  return out;
};

/** Totals for a window [from, to). */
export const periodTotals = (sessions: Session[], from: number, to: number) => {
  let workouts = 0;
  let volume = 0;
  let minutes = 0;
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    if (t < from || t >= to) continue;
    workouts++;
    volume += sessionVolume(s);
    minutes += s.durationSec / 60;
  }
  return { workouts, volume, minutes };
};

export interface MuscleLoad {
  key: string;
  label: string;
  /** Sets per week: primary muscles count 1, secondary ones ½. */
  perWeek: number;
}

/** Weekly hard sets per muscle group over `weeks` weeks ending now. */
export const muscleGroupSets = (
  sessions: Session[],
  weeks = 4,
  now = Date.now(),
): MuscleLoad[] => {
  const from = now - weeks * 7 * 86400000;
  const groupOf = new Map<string, string>();
  for (const g of MUSCLE_FILTERS)
    for (const m of g.muscles) groupOf.set(m, g.key);
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (Date.parse(s.startedAt) < from) continue;
    for (const ex of s.exercises) {
      const cat = getCatalogExercise(ex.catalogId);
      if (!cat) continue;
      const sets = ex.sets.filter(x => x.done).length;
      if (!sets) continue;
      const add = (muscles: string[], w: number) => {
        const groups = new Set(
          muscles.map(m => groupOf.get(m)).filter(Boolean) as string[],
        );
        groups.forEach(g => totals.set(g, (totals.get(g) ?? 0) + sets * w));
      };
      add(cat.primary, 1);
      add(
        cat.secondary.filter(m => !cat.primary.includes(m)),
        0.5,
      );
    }
  }
  return MUSCLE_FILTERS.filter(g => g.muscles.length)
    .map(g => ({
      key: g.key,
      label: g.label,
      perWeek: Math.round(((totals.get(g.key) ?? 0) / weeks) * 10) / 10,
    }))
    .filter(g => g.perWeek > 0)
    .sort((a, b) => b.perWeek - a.perWeek);
};
