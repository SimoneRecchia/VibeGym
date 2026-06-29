/**
 * Vibe Gym data model v2.
 *
 * Field names stay Italian (the original gym-domain DSL: giorno, esercizio,
 * serie, ripetizioni…) so JSON files still read naturally and migrate cleanly
 * from the v1 (PWA) schema. The *values* are now strongly typed: weights are
 * numbers with a unit, reps are tagged unions, durations are seconds.
 *
 * The on-disk format includes "schema_version": 2 so we can keep evolving.
 */

export type WeightUnit = 'kg' | 'lb' | 'bw';

export interface Weight {
  /** Numeric load. For bodyweight, this is the added load (0 by default). */
  value: number;
  unit: WeightUnit;
}

/** Tagged union covering the four ways a "rep" target can be expressed. */
export type Reps =
  | { kind: 'fixed'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'amrap' }
  | { kind: 'time'; sec: number };

export interface ExerciseSub {
  id: string;
  nome: string;
  serie: number;
  reps?: Reps;
  peso_suggerito?: Weight;
  _pesi_serie?: (Weight | null)[];
}

export interface Exercise {
  id: string;
  nome: string;
  tipo?: 'superset';
  serie?: number;
  reps?: Reps;
  peso_suggerito?: Weight;
  recupero_sec: number;
  note_coach?: string;
  esercizi?: ExerciseSub[];

  // Live session state (stripped on import, rebuilt by ensureSessionFields)
  _serie_stato?: boolean[];
  _pesi_serie?: (Weight | null)[];
  _ripetizioni_serie?: (number | null)[];
  _note_utente?: string;
}

export interface Cardio {
  tipo: string;
  durata_min: number;
  modalita?: string;
}

export interface Day {
  id: string;
  nome: string;
  colore?: string;
  esercizi: Exercise[];
  cardio?: Cardio;
}

/* ------------------------------ Sessions ----------------------------- */

export interface HistoryExerciseSub {
  id: string;
  nome: string;
  serie: number;
  reps?: Reps;
  peso_scheda?: Weight;
  pesi_serie: (Weight | null)[];
}

export interface HistoryExercise {
  id: string;
  nome: string;
  tipo?: 'superset';
  serie_totali: number;
  serie_fatte: number;
  serie_stato: boolean[];
  completato: boolean;
  reps?: Reps;
  peso_scheda?: Weight;
  pesi_serie: (Weight | null)[];      // [] for supersets — see sub_esercizi
  ripetizioni_serie?: (number | null)[];
  sub_esercizi?: HistoryExerciseSub[];
  note: string;
}

export interface Session {
  id: string;            // unique session id; doubles as GitHub filename slug
  data: string;          // ISO datetime
  giorno_id: string;
  giorno_nome: string;
  giorno_colore?: string;
  durata_sec?: number;
  esercizi: HistoryExercise[];
}

/* -------------------------------- Plan ------------------------------- */

export interface Plan {
  schema_version: 2;
  /**
   * Stable slug used as the folder name on GitHub
   * (e.g. `schede/push-pull-2026/`). Derived from nome_scheda on first import
   * and never changes — renaming nome_scheda does NOT move the folder, so
   * git history stays intact.
   */
  id: string;
  nome_scheda?: string;
  creata_il?: string;
  giorni: Day[];
  storico: Session[];
}

/* ------------------------------- Settings ---------------------------- */

export interface Settings {
  skipLastRest: boolean;
  sound: boolean;
  haptic: boolean;
  countdownWarn: boolean;
  autoExpandTimer: boolean;
  keepScreenOn: boolean;
  /** Default weight unit for new entries. */
  defaultUnit: WeightUnit;
}

export const DEFAULT_SETTINGS: Settings = {
  skipLastRest: false,
  sound: true,
  haptic: true,
  countdownWarn: true,
  autoExpandTimer: false,
  keepScreenOn: true,
  defaultUnit: 'kg',
};

/* ------------------------------- Profile ---------------------------- */

/** Personal info collected on the first page. All fields optional. */
export interface Profile {
  name?: string;
  /** Free-form birth date as typed by the user, e.g. "12/03/1990". */
  birthDate?: string;
  /** Body weight in kg. */
  weightKg?: number;
  /** Height in cm. */
  heightCm?: number;
}

export const DEFAULT_PROFILE: Profile = {};

/* --------------------------- Legacy v1 schema ------------------------ */
/* Kept only so we can migrate imports created with the original PWA.    */

export interface V1ExerciseSub {
  id: string;
  nome: string;
  serie: number;
  reps?: string | number;
  peso_suggerito?: string;
}

export interface V1Exercise {
  id: string;
  nome: string;
  tipo?: 'superset';
  serie?: number;
  reps?: string | number;
  durata_sec?: number;
  peso_suggerito?: string;
  recupero_sec: number;
  note_coach?: string;
  esercizi?: V1ExerciseSub[];
}

export interface V1Day {
  id: string;
  nome: string;
  colore?: string;
  esercizi: V1Exercise[];
  cardio?: { tipo: string; durata_min: number; modalita?: string };
}

export interface V1Plan {
  version?: number;
  nome_scheda?: string;
  creata_il?: string;
  giorni: V1Day[];
  storico?: unknown[];
}
