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

/**
 * How a rep target is measured. Extensible: add units here (e.g. 'meters')
 * without touching the shape. The athlete never picks the unit — it comes from
 * the plan; they only enter the numeric value they actually did.
 */
export type RepUnit = 'times' | 'seconds' | 'minutes';

/**
 * A strongly-typed rep target. `value` is always a non-negative integer, or
 * `null` for AMRAP ("al massimo"). The meaning of the number depends on `unit`:
 * 12 × times, 30 × seconds (plank), 2 × minutes, …
 */
export interface Reps {
  value: number | null;
  unit: RepUnit;
}

export interface ExerciseSub {
  id: string;
  nome: string;
  serie: number;
  reps?: Reps;
  peso_suggerito?: Weight;
  /**
   * Per-set weights learned from the last completed session. Persisted (no `_`
   * prefix) so the card keeps suggesting what you actually lifted, per set.
   */
  pesi_default?: (Weight | null)[];
  _pesi_serie?: (Weight | null)[];
  /** Actual reps done this session, per set (null = did the target). */
  _ripetizioni_serie?: (number | null)[];
}

export interface Exercise {
  id: string;
  nome: string;
  tipo?: 'superset';
  serie?: number;
  reps?: Reps;
  peso_suggerito?: Weight;
  /** Per-set weights learned from the last completed session (persisted). */
  pesi_default?: (Weight | null)[];
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
  ripetizioni_serie?: (number | null)[];
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
  /** Where the floating rest timer docks on screen. */
  timerPosition: 'top' | 'bottom';
  /** Default weight unit for new entries. */
  defaultUnit: WeightUnit;
  /**
   * Ask to update body weight every N days on app open (0 = off). Feeds the
   * body-metrics log so weight can be tracked over time without the user having
   * to remember.
   */
  weightReminderDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  skipLastRest: false,
  sound: true,
  haptic: true,
  countdownWarn: true,
  autoExpandTimer: false,
  keepScreenOn: true,
  timerPosition: 'bottom',
  defaultUnit: 'kg',
  weightReminderDays: 0,
};

/* ------------------------------- Profile ---------------------------- */

export type Sex = 'male' | 'female' | 'other';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Personal + training-context info. Every field is optional.
 *
 * The light fields (name/birthDate/weightKg/heightCm) are collected during
 * onboarding; the richer fields (experience, equipment, goals, injuries…) are
 * gathered in the "create a plan for me" wizard because they only matter when
 * building the AI prompt — the app runtime never requires them.
 */
export interface Profile {
  // Light onboarding fields
  name?: string;
  /** Free-form birth date as typed by the user, e.g. "12/03/1990". */
  birthDate?: string;
  /** Body weight in kg. */
  weightKg?: number;
  /** Height in cm. */
  heightCm?: number;

  // Demographics (may be entered directly or derived from birthDate)
  age?: number;
  sex?: Sex;

  // Training context — feeds the AI prompt builder, all optional
  experience?: ExperienceLevel;
  /** How many times per week the user trains. */
  sessionsPerWeek?: number;
  /** Typical session length in minutes. */
  sessionLengthMin?: number;
  /** Available equipment, e.g. ['bilanciere', 'manubri', 'cavi']. */
  equipment?: string[];
  /** Structured goal tags, e.g. ['ipertrofia', 'equilibrio', 'cardio']. */
  goals?: string[];
  /** Free-text elaboration on goals. */
  goalsNote?: string;
  /** Free text — injuries / physical issues to account for. */
  injuries?: string;
  /** Free text — exercises or movements the user does not want. */
  exclusions?: string;
}

export const DEFAULT_PROFILE: Profile = {};

/* ------------------------------- Backend ---------------------------- */

/**
 * Where the user has chosen to keep their data. Both backends store the full
 * session history (`Plan.storico`) so trends/charts/tracking are identical.
 *   - 'local'  → this device only (AsyncStorage), no account
 *   - 'cloud'  → device + GitHub sync (backup, edit-from-PC, commit history)
 *   - null     → not chosen yet (first run / onboarding)
 */
export type Backend = 'local' | 'cloud' | null;

/* ---------------------------- Body metrics --------------------------- */

/**
 * A single body measurement, independent of any workout plan. The log is an
 * append-only array — each weigh-in is one immutable entry, so the array itself
 * is the version history (persisted locally, or committed to GitHub in cloud
 * mode under metrics/body.json).
 */
export interface BodyEntry {
  /** ISO datetime of the measurement. */
  date: string;
  /** Body weight in kg. */
  weightKg?: number;
}

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
