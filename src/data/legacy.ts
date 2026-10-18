/**
 * Migration of data created by previous versions of the app (schema v1/v2:
 * Italian field names, `reps: {value, unit}`, `peso_suggerito: {value, unit}`,
 * plan-embedded `storico`). Everything is converted to the v3 numeric model.
 */
import {
  Block,
  Day,
  Exercise,
  ExerciseKind,
  LoggedSet,
  Plan,
  Session,
  SessionExercise,
  SetValues,
} from '../core/types';
import { exerciseKey, uid } from '../core/ids';
import { matchCatalog } from '../catalog';
import { LB_PER_KG } from '../core/units';

type Any = Record<string, any>;

interface RepsInfo {
  kind: ExerciseKind;
  reps?: number;
  sec?: number;
  toFailure?: boolean;
  /** Seconds per logged unit (60 when the old plan counted minutes). */
  factor?: number;
}

/** Old reps representations → kind + numbers. */
export const legacyReps = (raw: unknown, durataSec?: unknown): RepsInfo => {
  if (typeof durataSec === 'number' && durataSec > 0)
    return { kind: 'time', sec: Math.round(durataSec) };
  if (raw == null) return { kind: 'reps' };
  if (typeof raw === 'number')
    return { kind: 'reps', reps: Math.round(raw) || undefined };
  if (typeof raw === 'object') {
    const r = raw as Any;
    if ('unit' in r) {
      const v = r.value == null ? null : Math.round(Number(r.value));
      if (r.unit === 'seconds')
        return v ? { kind: 'time', sec: v } : { kind: 'time', toFailure: true };
      if (r.unit === 'minutes')
        return v
          ? { kind: 'time', sec: v * 60, factor: 60 }
          : { kind: 'time', toFailure: true, factor: 60 };
      return v && v > 0
        ? { kind: 'reps', reps: v }
        : { kind: 'reps', toFailure: true };
    }
    if ('kind' in r) {
      if (r.kind === 'fixed')
        return { kind: 'reps', reps: Math.round(r.value) || undefined };
      if (r.kind === 'range')
        return { kind: 'reps', reps: Math.round(r.max ?? r.min) || undefined };
      if (r.kind === 'amrap') return { kind: 'reps', toFailure: true };
      if (r.kind === 'time')
        return { kind: 'time', sec: Math.round(r.sec) || undefined };
    }
    return { kind: 'reps' };
  }
  const s = String(raw).trim().toLowerCase();
  if (/amrap|max/.test(s)) return { kind: 'reps', toFailure: true };
  let m = s.match(/^(\d+)\s*(?:m|min|minuti|minutes)$/);
  if (m) return { kind: 'time', sec: parseInt(m[1], 10) * 60, factor: 60 };
  m = s.match(/^(\d+)\s*(?:s|sec|secondi|seconds)$/);
  if (m) return { kind: 'time', sec: parseInt(m[1], 10) };
  m = s.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (m) return { kind: 'reps', reps: parseInt(m[2], 10) };
  m = s.match(/^(\d+)$/);
  if (m) return { kind: 'reps', reps: parseInt(m[1], 10) };
  return { kind: 'reps' };
};

/** Old weight representations → kg (bodyweight = 0, "BW + x" = x). */
export const legacyKg = (raw: unknown): number | undefined => {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object') {
    const w = raw as Any;
    const v = Number(w.value);
    if (!Number.isFinite(v)) return undefined;
    return w.unit === 'lb' ? round1(v / LB_PER_KG) : v;
  }
  const s = String(raw).trim().toLowerCase();
  if (!s) return undefined;
  const bw = s.match(/bw\s*\+\s*(\d+(?:[.,]\d+)?)/);
  if (bw) return parseFloat(bw[1].replace(',', '.'));
  if (/corpo\s*libero|body\s*weight|^bw$|peso\s*corporeo/.test(s)) return 0;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(kg|lb|lbs)?/);
  if (!m) return undefined;
  const v = parseFloat(m[1].replace(',', '.'));
  return m[2] && m[2].startsWith('lb') ? round1(v / LB_PER_KG) : v;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const legacyExercise = (raw: Any, restOverride?: number): Exercise => {
  const info = legacyReps(raw.reps, raw.durata_sec);
  const n = Math.max(1, Math.round(Number(raw.serie)) || 3);
  const base = legacyKg(raw.peso_suggerito);
  const perSet: (number | undefined)[] = Array.isArray(raw.pesi_default)
    ? raw.pesi_default.map((w: unknown) => legacyKg(w))
    : [];
  const sets: SetValues[] = Array.from({ length: n }, (_, i) => {
    const kg = perSet[i] ?? base;
    const s: SetValues = {};
    if (info.kind === 'reps') s.reps = info.reps ?? 10;
    else s.sec = info.sec ?? 30;
    if (kg != null) s.kg = kg;
    return s;
  });
  const name = String(raw.nome ?? 'Esercizio');
  return {
    id: String(raw.id ?? uid('e')),
    name,
    catalogId: matchCatalog(name),
    kind: info.kind,
    sets,
    toFailure: info.toFailure || undefined,
    restSec: restOverride ?? (Math.round(Number(raw.recupero_sec)) || 90),
    notes: raw.note_coach ? String(raw.note_coach) : undefined,
  };
};

const legacyDay = (raw: Any, index: number): Day => {
  const blocks: Block[] = [];
  for (const ex of (raw.esercizi ?? []) as Any[]) {
    if (ex.tipo === 'superset' && Array.isArray(ex.esercizi)) {
      const rest = Math.round(Number(ex.recupero_sec)) || 90;
      const subs: Any[] = ex.esercizi;
      blocks.push({
        id: String(ex.id ?? uid('b')),
        exercises: subs.map((s, i) => ({
          ...legacyExercise(s, i === subs.length - 1 ? rest : 0),
          notes:
            i === 0 && ex.note_coach
              ? String(ex.note_coach)
              : legacyExercise(s).notes,
        })),
      });
    } else {
      const e = legacyExercise(ex);
      blocks.push({ id: `b_${e.id}`, exercises: [e] });
    }
  }
  if (raw.cardio && typeof raw.cardio === 'object') {
    const c = raw.cardio as Any;
    const name = String(c.tipo ?? 'Cardio');
    blocks.push({
      id: uid('b'),
      exercises: [
        {
          id: `${raw.id ?? index}_cardio`,
          name,
          catalogId: matchCatalog(name),
          kind: 'cardio',
          sets: [
            { sec: Math.max(1, Math.round(Number(c.durata_min) || 10)) * 60 },
          ],
          restSec: 0,
          notes: c.modalita ? String(c.modalita) : undefined,
        },
      ],
    });
  }
  return {
    id: String(raw.id ?? uid('d')),
    name: String(raw.nome ?? `Giorno ${index + 1}`),
    blocks,
  };
};

export const isLegacyPlan = (raw: unknown): boolean => {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Any;
  if (o.schema_version === 2) return true;
  if (o.formato || o.versione === 3) return false;
  if (!Array.isArray(o.giorni)) return false;
  return (o.giorni as Any[]).some(g =>
    ((g?.esercizi ?? []) as Any[]).some(
      e =>
        e &&
        ('reps' in e ||
          'peso_suggerito' in e ||
          e.tipo === 'superset' ||
          ('durata_sec' in e && !('tipo' in e))),
    ),
  );
};

export const legacyPlanToV3 = (
  raw: Any,
): { plan: Plan; sessions: Session[] } => {
  const now = new Date().toISOString();
  const plan: Plan = {
    id: String(raw.id || uid('p')),
    name: String(raw.nome_scheda || 'Scheda importata'),
    createdAt: raw.creata_il ? new Date(raw.creata_il).toISOString() : now,
    updatedAt: now,
    days: ((raw.giorni ?? []) as Any[]).map(legacyDay),
  };
  if (Number.isNaN(new Date(plan.createdAt).getTime())) plan.createdAt = now;
  const sessions = Array.isArray(raw.storico)
    ? legacySessionsToV3(raw.storico, plan)
    : [];
  return { plan, sessions };
};

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

const loggedSets = (
  n: number,
  done: boolean[],
  kgs: unknown[],
  reps: unknown[],
  info: RepsInfo,
): LoggedSet[] =>
  Array.from({ length: n }, (_, i) => {
    const s: LoggedSet = { done: !!done[i] };
    const kg = legacyKg(kgs[i]);
    if (kg != null) s.kg = kg;
    const r = reps[i];
    const v = typeof r === 'number' ? r : undefined;
    if (info.kind === 'reps') s.reps = v ?? info.reps;
    else s.sec = v != null ? v * (info.factor ?? 1) : info.sec;
    return s;
  });

export const legacySessionsToV3 = (
  storico: unknown[],
  plan: Plan,
): Session[] => {
  const out: Session[] = [];
  for (const raw of storico) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Any;
    if (typeof s.data !== 'string' || !Array.isArray(s.esercizi)) continue;
    const day = plan.days.find(d => d.id === s.giorno_id);
    const exercises: SessionExercise[] = [];
    for (const e of s.esercizi as Any[]) {
      const done: boolean[] = Array.isArray(e.serie_stato) ? e.serie_stato : [];
      if (e.tipo === 'superset' && Array.isArray(e.sub_esercizi)) {
        const blockId = String(e.id ?? uid('b'));
        for (const sub of e.sub_esercizi as Any[]) {
          const info = legacyReps(sub.reps);
          const n = Math.max(1, Number(sub.serie) || done.length || 1);
          const name = String(sub.nome ?? 'Esercizio');
          const catalogId = matchCatalog(name);
          exercises.push({
            exerciseId: String(sub.id ?? uid('e')),
            key: exerciseKey(name, catalogId),
            name,
            catalogId,
            kind: info.kind,
            blockId,
            restSec: 0,
            target: [],
            sets: loggedSets(
              n,
              done,
              sub.pesi_serie ?? [],
              sub.ripetizioni_serie ?? [],
              info,
            ),
          });
        }
        continue;
      }
      const info = legacyReps(e.reps);
      const n = Math.max(1, Number(e.serie_totali) || done.length || 1);
      const name = String(e.nome ?? 'Esercizio');
      const catalogId = matchCatalog(name);
      exercises.push({
        exerciseId: String(e.id ?? uid('e')),
        key: exerciseKey(name, catalogId),
        name,
        catalogId,
        kind: info.kind,
        blockId: `b_${e.id}`,
        restSec: 0,
        target: [],
        sets: loggedSets(
          n,
          done,
          e.pesi_serie ?? [],
          e.ripetizioni_serie ?? [],
          info,
        ),
        notes: e.note ? String(e.note) : undefined,
      });
    }
    const start = new Date(s.data);
    if (Number.isNaN(start.getTime())) continue;
    const dur = Number(s.durata_sec) || 0;
    out.push({
      id: String(s.id ?? s.data),
      planId: plan.id,
      planName: plan.name,
      dayId: String(s.giorno_id ?? day?.id ?? ''),
      dayName: String(s.giorno_nome ?? day?.name ?? 'Allenamento'),
      startedAt: new Date(start.getTime() - dur * 1000).toISOString(),
      endedAt: start.toISOString(),
      durationSec: dur,
      exercises,
    });
  }
  return out;
};
