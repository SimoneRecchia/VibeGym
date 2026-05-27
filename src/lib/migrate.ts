import { parseRepsString, parseWeightString } from './format';
import {
  Day,
  Exercise,
  ExerciseSub,
  Plan,
  Session,
  V1Day,
  V1Exercise,
  V1Plan,
  Weight,
} from './types';

/**
 * Migrate a legacy v1 PWA JSON (stringy weights/reps, optional durata_sec)
 * to the typed v2 schema used by this app.
 *
 * Tolerant of partial / messy inputs — anything we can't parse becomes
 * `undefined` rather than throwing, so users aren't blocked by minor format
 * issues from AI-generated JSON.
 */
export const migrateV1ToV2 = (raw: V1Plan): Plan => {
  const days: Day[] = (raw.giorni ?? []).map(migrateDay);
  const sessions: Session[] = Array.isArray(raw.storico)
    ? raw.storico.map(migrateLegacySession).filter((s): s is Session => !!s)
    : [];
  return {
    schema_version: 2,
    nome_scheda: raw.nome_scheda,
    creata_il: raw.creata_il,
    giorni: days,
    storico: sessions,
  };
};

const migrateDay = (d: V1Day): Day => ({
  id: d.id,
  nome: d.nome,
  colore: d.colore,
  esercizi: (d.esercizi ?? []).map(migrateExercise),
  cardio: d.cardio,
});

const migrateExercise = (ex: V1Exercise): Exercise => {
  if (ex.tipo === 'superset') {
    const subs: ExerciseSub[] = (ex.esercizi ?? []).map(sub => ({
      id: sub.id,
      nome: sub.nome,
      serie: sub.serie,
      reps: parseRepsString(sub.reps),
      peso_suggerito: parseWeightString(sub.peso_suggerito) ?? undefined,
    }));
    return {
      id: ex.id,
      nome: ex.nome,
      tipo: 'superset',
      recupero_sec: ex.recupero_sec ?? 90,
      note_coach: ex.note_coach,
      esercizi: subs,
    };
  }
  return {
    id: ex.id,
    nome: ex.nome,
    serie: ex.serie ?? 0,
    reps: parseRepsString(ex.reps, ex.durata_sec),
    peso_suggerito: parseWeightString(ex.peso_suggerito) ?? undefined,
    recupero_sec: ex.recupero_sec ?? 90,
    note_coach: ex.note_coach,
  };
};

interface LegacySessionExercise {
  id: string;
  nome: string;
  tipo?: 'superset';
  serie_totali: number;
  serie_fatte: number;
  serie_stato: boolean[];
  completato: boolean;
  reps?: string | number;
  peso_scheda?: string;
  pesi_serie?: string[];
  sub_esercizi?: {
    id: string;
    nome: string;
    serie: number;
    reps?: string | number;
    peso_scheda?: string;
    pesi_serie?: string[];
  }[];
  note?: string;
}

interface LegacySession {
  data: string;
  giorno_id: string;
  giorno_nome: string;
  esercizi: LegacySessionExercise[];
}

const isLegacySession = (s: unknown): s is LegacySession =>
  !!s &&
  typeof s === 'object' &&
  typeof (s as LegacySession).data === 'string' &&
  Array.isArray((s as LegacySession).esercizi);

const migrateLegacySession = (raw: unknown): Session | null => {
  if (!isLegacySession(raw)) return null;
  return {
    id: raw.data, // legacy used the ISO timestamp as a stable id
    data: raw.data,
    giorno_id: raw.giorno_id,
    giorno_nome: raw.giorno_nome,
    esercizi: raw.esercizi.map(e => {
      const pesi = (e.pesi_serie ?? []).map(s => parseWeightString(s));
      return {
        id: e.id,
        nome: e.nome,
        tipo: e.tipo,
        serie_totali: e.serie_totali,
        serie_fatte: e.serie_fatte,
        serie_stato: e.serie_stato ?? [],
        completato: !!e.completato,
        reps: parseRepsString(e.reps),
        peso_scheda: parseWeightString(e.peso_scheda) ?? undefined,
        pesi_serie: pesi.map(w => w ?? null) as (Weight | null)[],
        sub_esercizi: e.sub_esercizi?.map(sub => ({
          id: sub.id,
          nome: sub.nome,
          serie: sub.serie,
          reps: parseRepsString(sub.reps),
          peso_scheda: parseWeightString(sub.peso_scheda) ?? undefined,
          pesi_serie: (sub.pesi_serie ?? []).map(s => parseWeightString(s) ?? null),
        })),
        note: e.note ?? '',
      };
    }),
  };
};

/**
 * Detect schema version and apply migrations.
 *
 * Accepts:
 *   - v1 plan (no schema_version, stringy values)
 *   - v2 plan (schema_version: 2, typed values)
 */
export const normalizePlan = (raw: unknown): Plan => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Plan vuoto');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schema_version === 2 && Array.isArray(obj.giorni)) {
    // Already v2 — trust it but ensure storico exists
    return {
      ...(obj as unknown as Plan),
      storico: Array.isArray(obj.storico) ? (obj.storico as Session[]) : [],
    };
  }
  // Treat as v1
  return migrateV1ToV2(obj as unknown as V1Plan);
};
