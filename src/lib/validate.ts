/**
 * Plan validation.
 *
 * Walks a raw imported plan (v1 or v2 JSON, already passed through
 * normalizePlan) and produces a flat list of issues, each carrying:
 *   - a stable, addressable `path` so the UI can render an inline editor
 *     at exactly that field;
 *   - the offending raw value so the user sees what they typed;
 *   - a human-friendly Italian message explaining what's wrong and how
 *     to fix it.
 *
 * The validator is *tolerant*: it never throws. It surfaces problems
 * the user can fix in the UI rather than rejecting the whole plan.
 */

import { Plan, RepUnit, Reps, Weight, WeightUnit } from './types';

export type IssueKind =
  | 'missing_root_giorni'
  | 'missing_day_id'
  | 'missing_day_name'
  | 'missing_ex_id'
  | 'missing_ex_name'
  | 'bad_serie'
  | 'bad_reps'
  | 'bad_weight'
  | 'bad_rest'
  | 'bad_cardio_duration'
  | 'bad_superset_subs';

export type PathSeg = string | number;

export interface Issue {
  /** Dotted path used as a stable React key; e.g. "giorni.0.esercizi.2.peso_suggerito". */
  path: PathSeg[];
  /** Single-key id of the offending field, e.g. "peso_suggerito". */
  field: string;
  kind: IssueKind;
  /** What the user wrote that we couldn't parse, if any. */
  raw?: unknown;
  /** Italian explanation shown next to the inline editor. */
  message: string;
}

const PATH = (...segs: PathSeg[]) => segs;
const issue = (
  path: PathSeg[],
  field: string,
  kind: IssueKind,
  message: string,
  raw?: unknown
): Issue => ({ path, field, kind, raw, message });

/* ------------------------------------------------------------------ */
/*  Type guards                                                        */
/* ------------------------------------------------------------------ */

const isPositiveInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 && Math.floor(n) === n;

const isUnit = (u: unknown): u is WeightUnit => u === 'kg' || u === 'lb' || u === 'bw';

const isWeight = (w: unknown): w is Weight =>
  !!w &&
  typeof w === 'object' &&
  typeof (w as Weight).value === 'number' &&
  Number.isFinite((w as Weight).value) &&
  (w as Weight).value >= 0 &&
  isUnit((w as Weight).unit);

const isRepUnit = (u: unknown): u is RepUnit =>
  u === 'times' || u === 'seconds' || u === 'minutes';

const isReps = (r: unknown): r is Reps => {
  if (!r || typeof r !== 'object') return false;
  const x = r as Reps;
  if (!isRepUnit(x.unit)) return false;
  if (x.value === null) return true; // AMRAP
  return isPositiveInt(x.value);
};

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export const validatePlan = (plan: Plan): Issue[] => {
  const out: Issue[] = [];

  if (!Array.isArray(plan.giorni) || plan.giorni.length === 0) {
    out.push(
      issue(PATH('giorni'), 'giorni', 'missing_root_giorni', 'La scheda non contiene giorni.')
    );
    return out;
  }

  plan.giorni.forEach((day, gi) => {
    if (!day.id) {
      out.push(issue(PATH('giorni', gi, 'id'), 'id', 'missing_day_id', `Manca l'id del giorno ${gi + 1}`));
    }
    if (!day.nome) {
      out.push(
        issue(PATH('giorni', gi, 'nome'), 'nome', 'missing_day_name', `Manca il nome del giorno ${gi + 1}`)
      );
    }

    if (day.cardio && !isPositiveInt(day.cardio.durata_min)) {
      out.push(
        issue(
          PATH('giorni', gi, 'cardio', 'durata_min'),
          'durata_min',
          'bad_cardio_duration',
          'La durata del cardio deve essere un numero di minuti (intero positivo).',
          day.cardio.durata_min
        )
      );
    }

    (day.esercizi ?? []).forEach((ex, ei) => {
      const exPath = PATH('giorni', gi, 'esercizi', ei);

      if (!ex.id) {
        out.push(issue([...exPath, 'id'], 'id', 'missing_ex_id', "Manca l'id dell'esercizio."));
      }
      if (!ex.nome) {
        out.push(issue([...exPath, 'nome'], 'nome', 'missing_ex_name', "Manca il nome dell'esercizio."));
      }

      if (!isPositiveInt(ex.recupero_sec)) {
        out.push(
          issue(
            [...exPath, 'recupero_sec'],
            'recupero_sec',
            'bad_rest',
            'Il recupero deve essere un numero di secondi (intero positivo).',
            ex.recupero_sec
          )
        );
      }

      if (ex.tipo === 'superset') {
        const subs = ex.esercizi ?? [];
        if (subs.length < 2) {
          out.push(
            issue(
              [...exPath, 'esercizi'],
              'esercizi',
              'bad_superset_subs',
              'Un superset deve avere almeno 2 esercizi figli.'
            )
          );
        }
        subs.forEach((sub, si) => {
          const subPath = [...exPath, 'esercizi', si];
          if (!isPositiveInt(sub.serie)) {
            out.push(
              issue(
                [...subPath, 'serie'],
                'serie',
                'bad_serie',
                'Le serie devono essere un intero positivo.',
                sub.serie
              )
            );
          }
          if (!isReps(sub.reps)) {
            out.push(
              issue(
                [...subPath, 'reps'],
                'reps',
                'bad_reps',
                'Ripetizioni non valide. Usa { "value": intero (o null per AMRAP), "unit": "times" | "seconds" | "minutes" }.',
                sub.reps
              )
            );
          }
          if (sub.peso_suggerito !== undefined && !isWeight(sub.peso_suggerito)) {
            out.push(
              issue(
                [...subPath, 'peso_suggerito'],
                'peso_suggerito',
                'bad_weight',
                'Peso non valido. Usa un numero con unità: es. "40 kg" o "corpo libero".',
                sub.peso_suggerito
              )
            );
          }
        });
      } else {
        if (!isPositiveInt(ex.serie)) {
          out.push(
            issue(
              [...exPath, 'serie'],
              'serie',
              'bad_serie',
              'Le serie devono essere un intero positivo.',
              ex.serie
            )
          );
        }
        if (!isReps(ex.reps)) {
          out.push(
            issue(
              [...exPath, 'reps'],
              'reps',
              'bad_reps',
              'Ripetizioni non valide. Usa un numero fisso, un range (8-10), AMRAP o tempo.',
              ex.reps
            )
          );
        }
        if (ex.peso_suggerito !== undefined && !isWeight(ex.peso_suggerito)) {
          out.push(
            issue(
              [...exPath, 'peso_suggerito'],
              'peso_suggerito',
              'bad_weight',
              'Peso non valido. Usa un numero con unità: es. "40 kg" o "corpo libero".',
              ex.peso_suggerito
            )
          );
        }
      }
    });
  });

  return out;
};

/* ------------------------------------------------------------------ */
/*  Path apply — used by the validation screen to commit a fix.        */
/* ------------------------------------------------------------------ */

/**
 * Set a value at `path` inside a Plan, returning a NEW plan object.
 * Existing intermediate objects/arrays are shallow-cloned along the way.
 */
export const setAtPath = <T extends object>(root: T, path: PathSeg[], value: unknown): T => {
  const clone = (o: unknown) => (Array.isArray(o) ? [...o] : { ...(o as object) });
  if (path.length === 0) return value as T;
  const next: T = clone(root) as T;
  let cursor: unknown = next;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const child = (cursor as Record<string | number, unknown>)[seg as string | number];
    const childClone = clone(child);
    (cursor as Record<string | number, unknown>)[seg as string | number] = childClone;
    cursor = childClone;
  }
  (cursor as Record<string | number, unknown>)[path[path.length - 1] as string | number] = value;
  return next;
};

/**
 * Look up the current value at a path. Used by the inline editors so they
 * can show the user the (possibly invalid) original value.
 */
export const getAtPath = (root: unknown, path: PathSeg[]): unknown => {
  let cursor: unknown = root;
  for (const seg of path) {
    if (cursor == null) return undefined;
    cursor = (cursor as Record<string | number, unknown>)[seg as string | number];
  }
  return cursor;
};

export const pathKey = (path: PathSeg[]): string => path.join('.');

/**
 * Produce a stable slug for a scheda from its nome_scheda. Used as the
 * folder name on GitHub. Falls back to a timestamp slug if no name.
 */
export const slugifySchedaName = (name: string | undefined): string => {
  const base = (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (base) return base;
  return `scheda-${new Date().toISOString().slice(0, 10)}`;
};
