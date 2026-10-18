/**
 * VibeGym data model (v3).
 *
 * Every value that can be tracked over time is a plain number in a fixed unit
 * (kg, seconds, km, cm) so it can be charted directly. Display units (kg/lb)
 * are a presentation concern handled in `core/units.ts`.
 */

/* ------------------------------------------------------------------ */
/*  Plan (scheda)                                                      */
/* ------------------------------------------------------------------ */

/** How an exercise is measured. */
export type ExerciseKind = 'reps' | 'time' | 'cardio';

/** Target (or logged) values for a single set. All optional, all numeric. */
export interface SetValues {
  /** Repetitions. */
  reps?: number;
  /** Duration in seconds (holds, intervals, cardio). */
  sec?: number;
  /** External load in kg. 0 / undefined = bodyweight only. */
  kg?: number;
  /** Distance in km (cardio). */
  km?: number;
}

export interface Exercise {
  /** Unique within the plan. */
  id: string;
  /** Display name (usually Italian). */
  name: string;
  /** Id in the bundled exercise catalog (free-exercise-db) — drives media. */
  catalogId?: string;
  kind: ExerciseKind;
  /** One entry per set. Pyramids simply use different values per set. */
  sets: SetValues[];
  /** Sets taken to failure: the reps target is indicative. */
  toFailure?: boolean;
  /**
   * Rest after each set, in seconds. Inside a superset the rest happens after
   * the exercise that closes the round; the others usually have 0.
   */
  restSec: number;
  notes?: string;
}

/** One exercise, or 2+ exercises performed back to back (superset/circuit). */
export interface Block {
  id: string;
  exercises: Exercise[];
}

export interface Day {
  id: string;
  name: string;
  blocks: Block[];
}

export interface Plan {
  id: string;
  name: string;
  /** ISO datetime. */
  createdAt: string;
  updatedAt: string;
  days: Day[];
  notes?: string;
}

/* ------------------------------------------------------------------ */
/*  Sessions (storico)                                                 */
/* ------------------------------------------------------------------ */

export interface LoggedSet extends SetValues {
  done: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  /**
   * Stable identity used for trends across different plans: the catalog id
   * when known, otherwise `n:<slug of the name>`.
   */
  key: string;
  name: string;
  catalogId?: string;
  kind: ExerciseKind;
  /** Block this exercise belonged to (supersets share it). */
  blockId: string;
  restSec: number;
  toFailure?: boolean;
  target: SetValues[];
  sets: LoggedSet[];
  notes?: string;
}

export type RecordKind = 'e1rm' | 'kg' | 'reps' | 'sec' | 'km' | 'volume';

export interface PersonalRecord {
  key: string;
  name: string;
  kind: RecordKind;
  value: number;
  previous?: number;
}

export interface Session {
  id: string;
  planId: string;
  planName: string;
  dayId: string;
  dayName: string;
  /** ISO datetime. */
  startedAt: string;
  endedAt: string;
  durationSec: number;
  exercises: SessionExercise[];
  records?: PersonalRecord[];
  notes?: string;
}

/** Workout in progress — persisted so it survives an app restart. */
export interface ActiveWorkout {
  id: string;
  planId: string;
  planName: string;
  dayId: string;
  dayName: string;
  /** epoch ms */
  startedAt: number;
  blocks: { id: string; exercises: SessionExercise[] }[];
  /** Index of the block shown in the workout pager. */
  cursor: number;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/*  Body                                                               */
/* ------------------------------------------------------------------ */

export interface BodyEntry {
  id: string;
  /** ISO datetime. */
  date: string;
  weightKg: number;
  source: 'manual' | 'scale';
  /** Raw bio-impedance in ohm (Mi Body Composition Scale). */
  impedance?: number;
  /** Measurement time reported by the scale (de-duplication). */
  scaleStamp?: string;
  fatPct?: number;
  muscleKg?: number;
  waterPct?: number;
  boneKg?: number;
  visceralFat?: number;
  bmrKcal?: number;
}

export type MeasureKey =
  | 'waist'
  | 'chest'
  | 'hips'
  | 'arm'
  | 'thigh'
  | 'calf'
  | 'neck';

export interface MeasureEntry {
  id: string;
  date: string;
  /** Circumferences in cm. */
  values: Partial<Record<MeasureKey, number>>;
}

/* ------------------------------------------------------------------ */
/*  Profile & settings                                                 */
/* ------------------------------------------------------------------ */

export type Sex = 'male' | 'female';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  name?: string;
  sex?: Sex;
  /** yyyy-mm-dd */
  birthDate?: string;
  heightCm?: number;
  goalWeightKg?: number;
  // Training context for the AI prompts.
  experience?: Experience;
  daysPerWeek?: number;
  sessionMin?: number;
  equipment?: string[];
  goals?: string[];
  injuries?: string;
  exclusions?: string;
}

export type ThemePref = 'system' | 'light' | 'dark';
export type AccentName =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'green'
  | 'mint'
  | 'cyan';
export type DisplayUnit = 'kg' | 'lb';

export interface ReminderSettings {
  enabled: boolean;
  /** 'HH:MM' */
  time: string;
}

export interface Settings {
  theme: ThemePref;
  accent: AccentName;
  unit: DisplayUnit;
  /** Load increment used by steppers and progression hints (in kg). */
  loadStepKg: number;
  /** Start the rest timer as soon as a set is ticked. */
  autoRest: boolean;
  keepAwake: boolean;
  sound: boolean;
  haptics: boolean;
  showMedia: boolean;
  notifications: {
    restEnd: boolean;
    workout: ReminderSettings & { weekdays: number[] };
    weighIn: ReminderSettings & {
      frequency: 'daily' | 'weekly';
      weekday: number;
    };
    measures: ReminderSettings;
  };
  scale: {
    deviceId?: string;
    deviceName?: string;
    model?: ScaleModel;
    autoSave: boolean;
  };
}

export type ScaleModel = 'mi-scale' | 'mi-body-composition';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'blue',
  unit: 'kg',
  loadStepKg: 2.5,
  autoRest: true,
  keepAwake: true,
  sound: true,
  haptics: true,
  showMedia: true,
  notifications: {
    restEnd: true,
    workout: { enabled: false, time: '18:00', weekdays: [1, 3, 5] },
    weighIn: { enabled: false, time: '08:00', frequency: 'daily', weekday: 1 },
    measures: { enabled: false, time: '09:00' },
  },
  scale: { autoSave: true },
};
