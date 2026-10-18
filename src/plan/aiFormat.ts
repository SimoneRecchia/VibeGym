/**
 * The JSON format exchanged with external AIs (ChatGPT, Claude, Gemini…).
 *
 * Italian keys, only numbers for anything trackable. Parsing is tolerant:
 * missing values get sensible defaults and every assumption is reported as
 * a warning the user can review before saving.
 *
 * {
 *   "formato": "vibegym", "versione": 3,
 *   "nome": "Push Pull Legs",
 *   "giorni": [{
 *     "nome": "Push",
 *     "esercizi": [
 *       { "nome": "Panca piana", "catalogo": "Barbell_Bench_Press_-_Medium_Grip",
 *         "tipo": "ripetizioni", "serie": 4, "ripetizioni": 8, "carico_kg": 60, "recupero_sec": 120 },
 *       { "superset": [ {…}, {…} ], "serie": 3, "recupero_sec": 90 }
 *     ]
 *   }]
 * }
 */
import {
  Block,
  Day,
  Exercise,
  ExerciseKind,
  Plan,
  Session,
  SetValues,
} from '../core/types';
import { uid } from '../core/ids';
import { matchCatalog, resolveCatalogId } from '../catalog';
import { extractJson } from './jsonText';
import { isLegacyPlan, legacyPlanToV3 } from '../data/legacy';
import { uniformSets } from './planUtils';

type Any = Record<string, any>;

export class PlanImportError extends Error {}

export interface ParsedPlan {
  plan: Plan;
  warnings: string[];
  /** Sessions found in legacy files (old app exports). */
  sessions: Session[];
  /** Exercises without a catalog match (no animation). */
  unmatched: number;
}

/* ------------------------------------------------------------------ */
/*  Number coercion                                                    */
/* ------------------------------------------------------------------ */

/** "8-10" → 10, "60 kg" → 60, "1,5" → 1.5. */
const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().replace(',', '.');
  const range = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return parseFloat(range[2]);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

/** Number, array of numbers, or "12/10/8" string → number[] (may be empty). */
/**
 * Number, array of numbers, or a list in a string ("12/10/8", "12, 10, 8")
 * → number[] (may be empty). For integer fields (reps, seconds) a bare comma
 * also separates values ("12,10,8"); for loads "62,5" stays a decimal.
 */
const toNumberList = (v: unknown, integers = false): number[] => {
  if (Array.isArray(v))
    return v.map(toNumber).filter((x): x is number => x != null);
  if (typeof v === 'string') {
    const commas = (v.match(/,/g) ?? []).length;
    const sep = integers || commas > 1 ? /[/;,]/ : /[/;]|,\s/;
    if (sep.test(v)) {
      return v
        .split(sep)
        .map(toNumber)
        .filter((x): x is number => x != null);
    }
  }
  const n = toNumber(v);
  return n == null ? [] : [n];
};

const isRange = (v: unknown) =>
  typeof v === 'string' && /\d\s*[-–]\s*\d/.test(v);

const fit = (vals: number[], n: number): number[] => {
  if (!vals.length) return [];
  return Array.from(
    { length: n },
    (_, i) => vals[Math.min(i, vals.length - 1)],
  );
};

const KIND_ALIASES: Record<string, ExerciseKind> = {
  ripetizioni: 'reps',
  reps: 'reps',
  rip: 'reps',
  tempo: 'time',
  time: 'time',
  isometria: 'time',
  durata: 'time',
  cardio: 'cardio',
};

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */

interface Ctx {
  warnings: string[];
  unmatched: number;
  where: string;
}

const pickKind = (raw: Any): ExerciseKind => {
  const t =
    typeof raw.tipo === 'string'
      ? KIND_ALIASES[raw.tipo.toLowerCase().trim()]
      : undefined;
  if (t) return t;
  if (raw.durata_min != null || raw.distanza_km != null) return 'cardio';
  if (raw.durata_sec != null && raw.ripetizioni == null) return 'time';
  return 'reps';
};

const parseExercise = (
  raw: Any,
  ctx: Ctx,
  inherited?: { serie?: unknown; recupero?: number },
): Exercise => {
  const name = String(raw.nome ?? raw.name ?? '').trim() || 'Esercizio';
  const where = `${ctx.where}, «${name}»`;
  const kind = pickKind(raw);

  let catalogId = resolveCatalogId(
    raw.catalogo ?? raw.catalog ?? raw.catalogo_id,
  );
  if (!catalogId) catalogId = matchCatalog(name);
  if (!catalogId) ctx.unmatched++;

  const repsList = toNumberList(raw.ripetizioni ?? raw.reps, true);
  const kgList = toNumberList(
    raw.carico_kg ?? raw.kg ?? raw.peso_kg ?? raw.carico,
  );
  const secList = toNumberList(
    raw.durata_sec ?? (raw.durata_min != null ? undefined : raw.secondi),
    true,
  );
  const minList = toNumberList(raw.durata_min);
  const kmList = toNumberList(raw.distanza_km);

  let n = Math.round(toNumber(raw.serie ?? inherited?.serie) ?? 0);
  const longest = Math.max(
    repsList.length,
    kgList.length,
    secList.length,
    minList.length,
  );
  if (n <= 0) {
    if (longest > 1) n = longest;
    else if (kind === 'cardio') n = 1;
    else {
      n = 3;
      ctx.warnings.push(`${where}: serie mancanti, impostate a 3.`);
    }
  }
  if (longest > 1 && longest !== n) {
    ctx.warnings.push(
      `${where}: i valori per serie (${longest}) non corrispondono alle serie (${n}); adattati.`,
    );
  }
  if (isRange(raw.ripetizioni))
    ctx.warnings.push(
      `${where}: intervallo «${raw.ripetizioni}» convertito nel valore massimo.`,
    );

  const reps = fit(repsList.map(Math.round), n);
  const kg = fit(
    kgList.map(v => Math.max(0, v)),
    n,
  );
  const secs = secList.length
    ? fit(secList.map(Math.round), n)
    : fit(
        minList.map(m => Math.round(m * 60)),
        n,
      );
  const km = fit(kmList, n);

  if (kind === 'reps' && !reps.length && !raw.a_cedimento) {
    ctx.warnings.push(`${where}: ripetizioni mancanti, impostate a 10.`);
  }
  if (kind === 'time' && !secs.length)
    ctx.warnings.push(`${where}: durata mancante, impostata a 30 s.`);
  if (kind === 'cardio' && !secs.length && !km.length)
    ctx.warnings.push(`${where}: durata mancante, impostata a 15 min.`);

  const sets: SetValues[] = Array.from({ length: n }, (_, i) => {
    const s: SetValues = {};
    if (kind === 'reps') s.reps = reps[i] ?? (raw.a_cedimento ? undefined : 10);
    if (kind === 'time') s.sec = secs[i] ?? 30;
    if (kind === 'cardio') {
      if (secs[i] != null) s.sec = secs[i];
      if (km[i] != null) s.km = km[i];
      if (s.sec == null && s.km == null) s.sec = 15 * 60;
    }
    if (kind !== 'cardio' && kg[i] != null) s.kg = kg[i];
    return s;
  });

  const defaultRest = kind === 'cardio' ? 0 : kind === 'time' ? 60 : 90;
  let restSec = toNumber(
    raw.recupero_sec ?? raw.recupero ?? inherited?.recupero,
  );
  if (restSec == null) {
    restSec = defaultRest;
    if (kind !== 'cardio' && inherited?.recupero == null)
      ctx.warnings.push(
        `${where}: recupero mancante, impostato a ${defaultRest} s.`,
      );
  }

  return {
    id: uid('e'),
    name,
    catalogId,
    kind,
    sets,
    toFailure: raw.a_cedimento === true || raw.amrap === true || undefined,
    restSec: Math.max(0, Math.round(restSec)),
    notes:
      typeof raw.note === 'string' && raw.note.trim()
        ? raw.note.trim()
        : typeof raw.note_coach === 'string'
        ? raw.note_coach
        : undefined,
  };
};

const parseBlock = (raw: Any, ctx: Ctx): Block | null => {
  if (!raw || typeof raw !== 'object') return null;
  const group =
    raw.superset ??
    raw.circuito ??
    (raw.tipo === 'superset' ? raw.esercizi : undefined);
  if (Array.isArray(group)) {
    const rest = toNumber(raw.recupero_sec ?? raw.recupero);
    const subs = group.filter(g => g && typeof g === 'object') as Any[];
    if (!subs.length) return null;
    const exercises = subs.map((g, i) =>
      parseExercise(
        // Inside a superset only the last exercise rests (unless the AI says otherwise).
        {
          ...g,
          recupero_sec:
            g.recupero_sec ?? (i === subs.length - 1 ? rest ?? 90 : 0),
        },
        ctx,
        { serie: raw.serie, recupero: 0 },
      ),
    );
    if (exercises.length === 1)
      ctx.warnings.push(
        `${ctx.where}: un superset con un solo esercizio è stato trattato come esercizio singolo.`,
      );
    return { id: uid('b'), exercises };
  }
  return { id: uid('b'), exercises: [parseExercise(raw, ctx)] };
};

/** Parse an object that is already JSON (or legacy data) into a plan. */
export const planFromObject = (obj: unknown): ParsedPlan => {
  let root: Any | undefined;
  if (Array.isArray(obj)) root = { giorni: obj };
  else if (obj && typeof obj === 'object')
    root =
      (obj as Any).scheda && typeof (obj as Any).scheda === 'object'
        ? (obj as Any).scheda
        : (obj as Any);
  if (!root) throw new PlanImportError('Il contenuto non è una scheda.');

  if (isLegacyPlan(root)) {
    const { plan, sessions } = legacyPlanToV3(root);
    if (!plan.days.length)
      throw new PlanImportError('La scheda non contiene giorni.');
    const unmatched = plan.days
      .flatMap(d => d.blocks.flatMap(b => b.exercises))
      .filter(e => !e.catalogId).length;
    return {
      plan,
      sessions,
      unmatched,
      warnings: [
        'File di una versione precedente dell’app: convertito nel nuovo formato.',
      ],
    };
  }

  const giorni = root.giorni ?? root.days;
  if (!Array.isArray(giorni) || !giorni.length)
    throw new PlanImportError(
      'La scheda non contiene giorni («giorni» mancante o vuoto).',
    );

  const ctx: Ctx = { warnings: [], unmatched: 0, where: '' };
  const days: Day[] = giorni.map((g: Any, gi: number) => {
    const dayName = String(g?.nome ?? g?.name ?? `Giorno ${gi + 1}`).trim();
    ctx.where = dayName;
    const items = (g?.esercizi ?? g?.exercises ?? []) as Any[];
    if (!Array.isArray(items) || !items.length)
      ctx.warnings.push(`${dayName}: nessun esercizio.`);
    const blocks = (Array.isArray(items) ? items : [])
      .map(it => parseBlock(it, ctx))
      .filter((b): b is Block => !!b);
    return { id: uid('d'), name: dayName, blocks };
  });

  const now = new Date().toISOString();
  return {
    plan: {
      id: uid('p'),
      name:
        String(
          root.nome ?? root.nome_scheda ?? root.name ?? 'Nuova scheda',
        ).trim() || 'Nuova scheda',
      createdAt: now,
      updatedAt: now,
      days,
      notes: typeof root.note === 'string' ? root.note : undefined,
    },
    warnings: ctx.warnings,
    sessions: [],
    unmatched: ctx.unmatched,
  };
};

/** Parse text pasted from an AI chat (or a .json file). */
export const parsePlanText = (text: string): ParsedPlan =>
  planFromObject(extractJson(text));

/* ------------------------------------------------------------------ */
/*  Serialization (used by the "modify with AI" flow and export)       */
/* ------------------------------------------------------------------ */

const KIND_OUT: Record<ExerciseKind, string> = {
  reps: 'ripetizioni',
  time: 'tempo',
  cardio: 'cardio',
};

const compact = (
  vals: (number | undefined)[],
): number | number[] | undefined => {
  const v = vals.map(x => x ?? 0);
  if (vals.every(x => x == null)) return undefined;
  return v.every(x => x === v[0]) ? v[0] : v;
};

const exerciseOut = (e: Exercise, inSuperset: boolean): Any => {
  const o: Any = { nome: e.name };
  if (e.catalogId) o.catalogo = e.catalogId;
  o.tipo = KIND_OUT[e.kind];
  if (e.kind === 'cardio') {
    const s = e.sets[0] ?? {};
    if (e.sets.length > 1) o.serie = e.sets.length;
    if (s.sec) o.durata_min = Math.round((s.sec / 60) * 10) / 10;
    if (s.km) o.distanza_km = s.km;
  } else {
    o.serie = e.sets.length;
    if (e.kind === 'reps') {
      const r = compact(e.sets.map(s => s.reps));
      if (r !== undefined) o.ripetizioni = r;
    } else {
      o.durata_sec = compact(e.sets.map(s => s.sec));
    }
    const kg = compact(e.sets.map(s => s.kg));
    o.carico_kg = kg ?? 0;
  }
  if (e.toFailure) o.a_cedimento = true;
  if (!inSuperset) o.recupero_sec = e.restSec;
  if (e.notes) o.note = e.notes;
  return o;
};

export const planToObject = (plan: Plan): Any => ({
  formato: 'vibegym',
  versione: 3,
  nome: plan.name,
  ...(plan.notes ? { note: plan.notes } : {}),
  giorni: plan.days.map(d => ({
    nome: d.name,
    esercizi: d.blocks.map(b => {
      if (b.exercises.length === 1) return exerciseOut(b.exercises[0], false);
      const last = b.exercises[b.exercises.length - 1];
      return {
        superset: b.exercises.map(e => exerciseOut(e, true)),
        recupero_sec: last.restSec,
      };
    }),
  })),
});

export const planToJson = (plan: Plan, pretty = true): string =>
  JSON.stringify(planToObject(plan), null, pretty ? 2 : 0);

/** Exposed for the editor: whether an exercise's sets are all equal. */
export { uniformSets };
