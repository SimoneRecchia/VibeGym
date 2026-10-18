/**
 * Food database helpers: the bundled everyday foods (USDA SR Legacy via
 * tempo-food-db, Italian names), search, nutrients for a quantity.
 */
import data from './generic.json';
import { Food, FoodLog, MealKey, Nutrients, Portion } from '../core/types';

export const CATEGORY_LABEL: Record<string, string> = {
  cereali: 'Pasta, riso, pane e cereali',
  tuberi: 'Patate',
  legumi: 'Legumi e derivati',
  carne: 'Carne',
  salumi: 'Salumi',
  pesce: 'Pesce',
  uova: 'Uova',
  latticini: 'Latte e yogurt',
  formaggi: 'Formaggi',
  verdura: 'Verdura',
  frutta: 'Frutta',
  'frutta-secca': 'Frutta secca e semi',
  grassi: 'Oli e grassi',
  condimenti: 'Salse e condimenti',
  dolci: 'Dolci e zuccheri',
  bevande: 'Bevande',
  piatti: 'Piatti pronti',
  integratori: 'Integratori',
};

type Row = [
  string,
  string,
  string,
  'g' | 'ml',
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  [string, number][] | 0,
];

export const GENERIC: Food[] = (data.foods as unknown as Row[]).map(r => ({
  id: `g:${r[0]}`,
  name: r[1],
  category: r[2],
  unit: r[3],
  kcal: r[4],
  protein: r[5],
  carbs: r[6],
  fat: r[7],
  fiber: r[8],
  sugar: r[9],
  satFat: r[10],
  salt: r[11],
  portions: r[12] ? r[12].map(([label, g]) => ({ label, g })) : undefined,
  source: 'generic' as const,
}));

const GENERIC_BY_ID = new Map(GENERIC.map(f => [f.id, f]));
export const genericFood = (id: string) => GENERIC_BY_ID.get(id);

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Colazione' },
  { key: 'lunch', label: 'Pranzo' },
  { key: 'snack', label: 'Spuntini' },
  { key: 'dinner', label: 'Cena' },
];
export const MEAL_LABEL = Object.fromEntries(
  MEALS.map(m => [m.key, m.label]),
) as Record<MealKey, string>;

/** Meal that fits the time of day. */
export const mealForNow = (d = new Date()): MealKey => {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60 + 30) return 'breakfast';
  if (m < 15 * 60) return 'lunch';
  if (m < 18 * 60 + 30) return 'snack';
  return 'dinner';
};

/* ------------------------------------------------------------------ */
/*  Quantities                                                         */
/* ------------------------------------------------------------------ */

export const ZERO: Required<Nutrients> = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  satFat: 0,
  salt: 0,
};

const KEYS = Object.keys(ZERO) as (keyof Nutrients)[];

export const nutrientsFor = (
  food: Nutrients,
  qty: number,
): Required<Nutrients> => {
  const k = qty / 100;
  const out = { ...ZERO };
  for (const key of KEYS) out[key] = (food[key] ?? 0) * k;
  return out;
};

export const sumNutrients = (
  list: Required<Nutrients>[],
): Required<Nutrients> => {
  const out = { ...ZERO };
  for (const n of list) for (const key of KEYS) out[key] += n[key];
  return out;
};

export const logNutrients = (l: FoodLog) => nutrientsFor(l.food, l.qty);

export const dayTotals = (logs: FoodLog[]) =>
  sumNutrients(logs.map(logNutrients));

/** Portions to offer: the food's own, plus the whole package. */
export const portionsOf = (f: Food): Portion[] => {
  const list = [...(f.portions ?? [])];
  if (f.packageG && !list.some(p => Math.abs(p.g - f.packageG!) < 1))
    list.push({ label: 'confezione', g: f.packageG });
  return list;
};

/** "2 vasetti" style label for a logged portion. */
export const fmtPortion = (p: { label: string; count: number }) =>
  `${p.count % 1 === 0 ? p.count : String(p.count).replace('.', ',')} × ${
    p.label
  }`;

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();

/**
 * Every query word must start a word of the name (or brand). Ranking: name
 * starting with the query, then fewer extra words, then shorter names.
 */
export const searchFoods = (
  query: string,
  pool: Food[],
  limit = 40,
): Food[] => {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(' ');
  const scored: { f: Food; s: number }[] = [];
  const seen = new Set<string>();
  for (const f of pool) {
    if (seen.has(f.id)) continue;
    const name = normalize(f.name);
    const hay = ` ${name} ${normalize(f.brand ?? '')} `;
    if (!words.every(w => hay.includes(` ${w}`))) continue;
    seen.add(f.id);
    let s = name.startsWith(q) ? 0 : hay.includes(` ${q}`) ? 10 : 20;
    s += name.split(' ').length - words.length + name.length / 100;
    scored.push({ f, s });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, limit).map(x => x.f);
};

/** kcal from macros (Atwater): used to fill custom foods. */
export const kcalFromMacros = (p: number, c: number, f: number) =>
  Math.round(4 * p + 4 * c + 9 * f);
