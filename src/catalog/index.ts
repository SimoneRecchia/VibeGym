/**
 * Exercise catalog — a slim, bundled copy of free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, released under the Unlicense).
 * Every entry has two still frames (start / end position) hosted on GitHub;
 * the app alternates them to show the movement.
 */
import raw from './catalog.json';
import { IT_ALIASES } from './aliases';

type RawItem = [
  string,
  string | 0,
  number[],
  number[],
  number,
  number,
  number,
  number,
  number,
];
interface RawCatalog {
  muscles: string[];
  equipment: string[];
  categories: string[];
  levels: string[];
  items: RawItem[];
}
const RAW = raw as unknown as RawCatalog;

export interface CatalogExercise {
  id: string;
  /** English name from the dataset. */
  name: string;
  /** Italian display name when we have one. */
  nameIt?: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  category: string;
  level: string;
  compound: boolean;
  frames: number;
}

const MUSCLE_IT: Record<string, string> = {
  abdominals: 'Addome',
  abductors: 'Abduttori',
  adductors: 'Adduttori',
  biceps: 'Bicipiti',
  calves: 'Polpacci',
  chest: 'Petto',
  forearms: 'Avambracci',
  glutes: 'Glutei',
  hamstrings: 'Femorali',
  lats: 'Dorsali',
  'lower back': 'Lombari',
  'middle back': 'Schiena',
  neck: 'Collo',
  quadriceps: 'Quadricipiti',
  shoulders: 'Spalle',
  traps: 'Trapezi',
  triceps: 'Tricipiti',
};

const EQUIPMENT_IT: Record<string, string> = {
  'body only': 'Corpo libero',
  machine: 'Macchina',
  other: 'Altro',
  'foam roll': 'Foam roller',
  none: 'Nessuna',
  kettlebells: 'Kettlebell',
  dumbbell: 'Manubri',
  cable: 'Cavi',
  barbell: 'Bilanciere',
  bands: 'Elastici',
  'medicine ball': 'Palla medica',
  'exercise ball': 'Fitball',
  'e-z curl bar': 'Bilanciere EZ',
};

const CATEGORY_IT: Record<string, string> = {
  strength: 'Forza',
  stretching: 'Stretching',
  plyometrics: 'Pliometria',
  strongman: 'Strongman',
  powerlifting: 'Powerlifting',
  cardio: 'Cardio',
  'olympic weightlifting': 'Pesistica olimpica',
};

const LEVEL_IT: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Esperto',
};

export const muscleLabel = (m: string): string => MUSCLE_IT[m] ?? m;
export const equipmentLabel = (e: string): string => EQUIPMENT_IT[e] ?? e;
export const categoryLabel = (c: string): string => CATEGORY_IT[c] ?? c;
export const levelLabel = (l: string): string => LEVEL_IT[l] ?? l;

/** Muscle filter chips shown in the picker (dataset muscle → Italian). */
export const MUSCLE_FILTERS: {
  key: string;
  label: string;
  muscles: string[];
}[] = [
  { key: 'chest', label: 'Petto', muscles: ['chest'] },
  {
    key: 'back',
    label: 'Schiena',
    muscles: ['lats', 'middle back', 'lower back', 'traps'],
  },
  { key: 'shoulders', label: 'Spalle', muscles: ['shoulders'] },
  { key: 'biceps', label: 'Bicipiti', muscles: ['biceps', 'forearms'] },
  { key: 'triceps', label: 'Tricipiti', muscles: ['triceps'] },
  {
    key: 'legs',
    label: 'Gambe',
    muscles: ['quadriceps', 'hamstrings', 'adductors', 'abductors'],
  },
  { key: 'glutes', label: 'Glutei', muscles: ['glutes'] },
  { key: 'calves', label: 'Polpacci', muscles: ['calves'] },
  { key: 'core', label: 'Addome', muscles: ['abdominals'] },
  { key: 'cardio', label: 'Cardio', muscles: [] },
];

const aliasById = new Map<string, string[]>(IT_ALIASES);

export const CATALOG: CatalogExercise[] = RAW.items.map(it => {
  const [id, name, prim, sec, eq, cat, lvl, comp, frames] = it;
  return {
    id,
    name: name === 0 ? id.replace(/_/g, ' ') : name,
    nameIt: aliasById.get(id)?.[0],
    primary: prim.map(i => RAW.muscles[i]),
    secondary: sec.map(i => RAW.muscles[i]),
    equipment: RAW.equipment[eq],
    category: RAW.categories[cat],
    level: RAW.levels[lvl],
    compound: comp === 1,
    frames,
  };
});

const byId = new Map(CATALOG.map(e => [e.id, e]));

export const getCatalogExercise = (
  id: string | undefined,
): CatalogExercise | undefined => (id ? byId.get(id) : undefined);

export const displayName = (e: CatalogExercise): string => e.nameIt ?? e.name;

/* ------------------------------------------------------------------ */
/*  Media                                                              */
/* ------------------------------------------------------------------ */

const MEDIA_BASES = [
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises',
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises',
];

/** Frame URLs (usually 2: start and end position). Empty when unknown. */
export const mediaFrames = (
  catalogId: string | undefined,
  base = 0,
): string[] => {
  const ex = getCatalogExercise(catalogId);
  if (!ex || ex.frames === 0) return [];
  const root = MEDIA_BASES[base] ?? MEDIA_BASES[0];
  return Array.from(
    { length: Math.min(ex.frames, 2) },
    (_, i) => `${root}/${ex.id}/${i}.jpg`,
  );
};

export const MEDIA_MIRRORS = MEDIA_BASES.length;

/* ------------------------------------------------------------------ */
/*  Search & matching                                                  */
/* ------------------------------------------------------------------ */

export const normalizeText = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const STOP = new Set([
  'con',
  'al',
  'alla',
  'ai',
  'a',
  'su',
  'di',
  'da',
  'in',
  'the',
  'with',
  'on',
  'e',
  'and',
  'la',
  'il',
  'le',
  'lo',
  'per',
]);
const tokens = (s: string): string[] =>
  normalizeText(s)
    .split(' ')
    .filter(t => t && !STOP.has(t));

interface SearchEntry {
  id: string;
  text: string;
  toks: string[];
  alias: boolean;
}

const SEARCH: SearchEntry[] = [];
for (const ex of CATALOG) {
  SEARCH.push({
    id: ex.id,
    text: normalizeText(ex.name),
    toks: tokens(ex.name),
    alias: false,
  });
}
for (const [id, names] of IT_ALIASES) {
  if (!byId.has(id)) continue;
  for (const n of names)
    SEARCH.push({ id, text: normalizeText(n), toks: tokens(n), alias: true });
}

/**
 * Free-text search (Italian or English). Results are ranked: exact > prefix >
 * all words contained; Italian aliases win ties.
 */
export const searchCatalog = (
  query: string,
  opts?: { muscles?: string[]; cardio?: boolean; limit?: number },
): CatalogExercise[] => {
  const q = normalizeText(query);
  const qt = tokens(query);
  const limit = opts?.limit ?? 60;
  const muscleSet = opts?.muscles?.length ? new Set(opts.muscles) : null;
  const passes = (ex: CatalogExercise) => {
    if (opts?.cardio) return ex.category === 'cardio';
    if (muscleSet) return ex.primary.some(m => muscleSet.has(m));
    return true;
  };

  if (!q) {
    // No query: aliased (common) exercises first, then the rest alphabetically.
    const common = CATALOG.filter(e => e.nameIt && passes(e));
    const rest = CATALOG.filter(
      e => !e.nameIt && passes(e) && e.category !== 'stretching',
    );
    return [...common, ...rest].slice(0, limit);
  }

  const score = new Map<string, number>();
  for (const s of SEARCH) {
    let sc = 0;
    if (s.text === q) sc = 100;
    else if (s.text.startsWith(q)) sc = 80;
    else if (qt.length && qt.every(t => s.toks.some(st => st.startsWith(t))))
      sc = 60 - Math.min(20, s.toks.length);
    else if (s.text.includes(q)) sc = 40;
    if (!sc) continue;
    if (s.alias) sc += 5;
    const prev = score.get(s.id) ?? 0;
    if (sc > prev) score.set(s.id, sc);
  }
  return [...score.entries()]
    .map(([id, sc]) => ({ ex: byId.get(id)!, sc }))
    .filter(x => passes(x.ex))
    .sort(
      (a, b) =>
        b.sc - a.sc || displayName(a.ex).localeCompare(displayName(b.ex)),
    )
    .slice(0, limit)
    .map(x => x.ex);
};

/**
 * Best catalog match for a free-form exercise name (used when importing plans
 * that don't carry a catalog id). Conservative: returns undefined unless every
 * word of a known name appears in the given one.
 */
export const matchCatalog = (name: string): string | undefined => {
  const q = normalizeText(name);
  if (!q) return undefined;
  const qt = new Set(tokens(name));
  let best: { id: string; score: number } | undefined;
  for (const s of SEARCH) {
    if (s.text === q) return s.id;
    if (!s.toks.length) continue;
    if (!s.toks.every(t => qt.has(t))) continue;
    // Prefer the most specific (longest) name, Italian aliases on ties.
    const score = s.toks.length * 10 + (s.alias ? 1 : 0);
    if (!best || score > best.score) best = { id: s.id, score };
  }
  return best?.id;
};

/** Resolve an id the AI wrote, tolerating spaces/case differences. */
export const resolveCatalogId = (
  value: string | undefined,
): string | undefined => {
  if (!value) return undefined;
  const v = value.trim();
  if (byId.has(v)) return v;
  const underscored = v.replace(/\s+/g, '_');
  if (byId.has(underscored)) return underscored;
  const norm = normalizeText(v);
  const hit = CATALOG.find(
    e => normalizeText(e.id) === norm || normalizeText(e.name) === norm,
  );
  return hit?.id;
};

/** Increment suggestion for progression: compound lifts move faster. */
export const isCompound = (catalogId: string | undefined): boolean =>
  !!getCatalogExercise(catalogId)?.compound;
