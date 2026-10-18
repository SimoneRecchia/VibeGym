import { Block, Day, Exercise, Plan, Session, SetValues } from '../core/types';
import { exerciseKey, uid } from '../core/ids';
import { getCatalogExercise, muscleLabel } from '../catalog';
import { fmtDuration } from '../core/format';
import { DisplayUnit } from '../core/types';
import { fmtLoad } from '../core/units';

export const keyOf = (ex: Pick<Exercise, 'name' | 'catalogId'>): string =>
  exerciseKey(ex.name, ex.catalogId);

export const allExercises = (day: Day): Exercise[] =>
  day.blocks.flatMap(b => b.exercises);

export const isSuperset = (b: Block): boolean => b.exercises.length > 1;

export const countSets = (day: Day): number =>
  allExercises(day).reduce((s, e) => s + e.sets.length, 0);

/** Rough workout length in minutes: work time + rest between sets. */
export const estimateDayMinutes = (day: Day): number => {
  let sec = 0;
  const blocks = day.blocks;
  blocks.forEach((b, bi) => {
    const rounds = Math.max(...b.exercises.map(e => e.sets.length), 0);
    for (let r = 0; r < rounds; r++) {
      b.exercises.forEach((ex, ei) => {
        const set = ex.sets[r];
        if (!set) return;
        if (ex.kind === 'reps') sec += 15 + (set.reps ?? 10) * 3;
        else sec += set.sec ?? 60;
        const lastOfWorkout =
          bi === blocks.length - 1 &&
          r === rounds - 1 &&
          ei === b.exercises.length - 1;
        if (!lastOfWorkout) sec += ex.restSec;
      });
    }
    sec += 60; // set-up / transition between blocks
  });
  return Math.max(1, Math.round(sec / 60));
};

/** Most-hit primary muscles of a day, translated ("Petto · Tricipiti · Spalle"). */
export const dayMuscles = (day: Day, max = 3): string[] => {
  const count = new Map<string, number>();
  for (const ex of allExercises(day)) {
    const c = getCatalogExercise(ex.catalogId);
    if (!c) continue;
    c.primary.forEach(m => count.set(m, (count.get(m) ?? 0) + ex.sets.length));
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([m]) => muscleLabel(m));
};

/** The day after the last one trained in this plan (rotation), or the first. */
export const nextDayId = (
  plan: Plan,
  sessions: Session[],
): string | undefined => {
  if (!plan.days.length) return undefined;
  const last = [...sessions]
    .reverse()
    .find(s => s.planId === plan.id && plan.days.some(d => d.id === s.dayId));
  if (!last) return plan.days[0].id;
  const i = plan.days.findIndex(d => d.id === last.dayId);
  return plan.days[(i + 1) % plan.days.length].id;
};

export const lastSessionForDay = (
  sessions: Session[],
  planId: string,
  dayId: string,
): Session | undefined => {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.planId === planId && s.dayId === dayId) return s;
  }
  return undefined;
};

/** True when all sets share the same target values. */
export const uniformSets = (sets: SetValues[]): boolean =>
  sets.every(
    s =>
      s.reps === sets[0]?.reps &&
      s.sec === sets[0]?.sec &&
      s.kg === sets[0]?.kg &&
      s.km === sets[0]?.km,
  );

const range = (vals: (number | undefined)[]): string => {
  const v = vals.filter((x): x is number => x != null);
  if (!v.length) return '';
  const min = Math.min(...v);
  const max = Math.max(...v);
  return min === max ? String(min) : vals.join('-');
};

/** Compact prescription: "4 × 8 · 60 kg", "3 × 45 s", "20 min · 3 km". */
export const prescription = (ex: Exercise, unit: DisplayUnit): string => {
  const n = ex.sets.length;
  const parts: string[] = [];
  if (ex.kind === 'reps') {
    const reps = range(ex.sets.map(s => s.reps));
    parts.push(`${n} × ${reps || '–'}${ex.toFailure ? '+' : ''}`);
  } else if (ex.kind === 'time') {
    const secs = ex.sets.map(s => s.sec ?? 0);
    const same = secs.every(s => s === secs[0]);
    parts.push(
      `${n} × ${
        same ? fmtDuration(secs[0]) : secs.map(s => `${s}`).join('-') + ' s'
      }`,
    );
  } else {
    const s = ex.sets[0] ?? {};
    if (n > 1) parts.push(`${n} ×`);
    if (s.sec) parts.push(fmtDuration(s.sec));
    if (s.km) parts.push(`${String(s.km).replace('.', ',')} km`);
  }
  if (ex.kind !== 'cardio') {
    const kgs = ex.sets.map(s => s.kg ?? 0);
    if (kgs.some(k => k > 0)) {
      const same = kgs.every(k => k === kgs[0]);
      parts.push(
        same
          ? fmtLoad(kgs[0], unit)
          : `${fmtLoad(Math.min(...kgs), unit)} → ${fmtLoad(
              Math.max(...kgs),
              unit,
            )}`,
      );
    }
  }
  return parts.join(' · ');
};

/* ------------------------------------------------------------------ */
/*  Constructors / editing helpers                                     */
/* ------------------------------------------------------------------ */

export const newExercise = (
  name: string,
  catalogId?: string,
  kind: Exercise['kind'] = 'reps',
): Exercise => ({
  id: uid('e'),
  name,
  catalogId,
  kind,
  sets:
    kind === 'reps'
      ? Array.from({ length: 3 }, () => ({ reps: 10, kg: 0 }))
      : kind === 'time'
      ? Array.from({ length: 3 }, () => ({ sec: 30 }))
      : [{ sec: 15 * 60 }],
  restSec: kind === 'cardio' ? 0 : 90,
});

export const newDay = (index: number): Day => ({
  id: uid('d'),
  name: `Giorno ${String.fromCharCode(65 + index)}`,
  blocks: [],
});

export const newPlan = (name = 'La mia scheda'): Plan => {
  const now = new Date().toISOString();
  return {
    id: uid('p'),
    name,
    createdAt: now,
    updatedAt: now,
    days: [newDay(0)],
  };
};

/** Deep copy with fresh ids (for "Duplica"). Exercise keys are preserved. */
export const duplicatePlan = (p: Plan): Plan => {
  const now = new Date().toISOString();
  return {
    ...p,
    id: uid('p'),
    name: `${p.name} (copia)`,
    createdAt: now,
    updatedAt: now,
    days: p.days.map(d => ({
      ...d,
      id: uid('d'),
      blocks: d.blocks.map(b => ({
        id: uid('b'),
        exercises: b.exercises.map(e => ({
          ...e,
          id: uid('e'),
          sets: e.sets.map(s => ({ ...s })),
        })),
      })),
    })),
  };
};

export const dayLetter = (i: number): string =>
  String.fromCharCode(65 + (i % 26));

/**
 * Keep the old plan id and day ids (same name first, then same position), so
 * "last done" info and the day rotation survive a modify. Each old id is used
 * once. Returns the mapping new day id → kept id.
 */
export const carryDayIds = (
  next: Plan,
  old: Plan,
): { plan: Plan; dayMap: Record<string, string> } => {
  const norm = (n: string) => n.trim().toLowerCase();
  const used = new Set<string>();
  const ids: (string | undefined)[] = next.days.map(d => {
    const same = old.days.find(
      o => !used.has(o.id) && norm(o.name) === norm(d.name),
    );
    if (same) used.add(same.id);
    return same?.id;
  });
  next.days.forEach((_, i) => {
    const byPos = old.days[i];
    if (!ids[i] && byPos && !used.has(byPos.id)) {
      ids[i] = byPos.id;
      used.add(byPos.id);
    }
  });
  const dayMap: Record<string, string> = {};
  const days = next.days.map((d, i) => {
    const id = ids[i] ?? d.id;
    dayMap[d.id] = id;
    return { ...d, id };
  });
  return {
    plan: { ...next, id: old.id, createdAt: old.createdAt, days },
    dayMap,
  };
};
