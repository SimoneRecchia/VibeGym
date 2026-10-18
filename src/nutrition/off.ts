/**
 * Open Food Facts (open database, ODbL): packaged products by barcode or
 * name. Their API asks for an identifying User-Agent and no search-as-you-
 * type, so searches run on submit only and products are cached locally.
 */
import { Platform } from 'react-native';
import { Food, Portion } from '../core/types';
import buildInfo from '../buildInfo.json';

const UA = `VibeGym/${buildInfo.version} (${Platform.OS}; https://github.com/SimoneRecchia/VibeGym)`;
const FIELDS = [
  'code',
  'product_name',
  'product_name_it',
  'generic_name_it',
  'brands',
  'nutriments',
  'product_quantity',
  'product_quantity_unit',
  'quantity',
  'serving_size',
  'serving_quantity',
].join(',');

const get = async (url: string, timeoutMs = 9000): Promise<any> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return typeof n === 'number' && isFinite(n) ? n : undefined;
};

const round1 = (v: number | undefined) =>
  v == null ? undefined : Math.round(v * 10) / 10;

/** OFF product → Food (null when it has no usable nutrition facts). */
export const offToFood = (p: any): Food | null => {
  if (!p || typeof p !== 'object') return null;
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(n.energy_100g) ?? num(n['energy-kj_100g']);
    if (kj != null) kcal = kj / 4.184;
  }
  const protein = num(n.proteins_100g);
  const carbs = num(n.carbohydrates_100g);
  const fat = num(n.fat_100g);
  if (kcal == null || (protein == null && carbs == null && fat == null))
    return null;
  const name = String(
    p.product_name_it || p.product_name || p.generic_name_it || '',
  ).trim();
  if (!name) return null;
  const code = String(p.code ?? '');
  const qtyUnit = String(p.product_quantity_unit ?? p.quantity ?? '');
  const unit: Food['unit'] = /\b(ml|cl|l)\b/i.test(qtyUnit) ? 'ml' : 'g';
  const packageG = num(p.product_quantity);
  const serving = num(p.serving_quantity);
  const portions: Portion[] = [];
  if (serving && serving > 0 && serving !== packageG)
    portions.push({ label: 'porzione', g: Math.round(serving * 10) / 10 });
  return {
    id: `off:${code}`,
    name,
    brand:
      String(p.brands ?? '')
        .split(',')[0]
        .trim() || undefined,
    barcode: code || undefined,
    unit,
    kcal: Math.round(kcal),
    protein: round1(protein) ?? 0,
    carbs: round1(carbs) ?? 0,
    fat: round1(fat) ?? 0,
    fiber: round1(num(n.fiber_100g)),
    sugar: round1(num(n.sugars_100g)),
    satFat: round1(num(n['saturated-fat_100g'])),
    salt: round1(num(n.salt_100g)),
    packageG: packageG && packageG > 0 ? packageG : undefined,
    portions: portions.length ? portions : undefined,
    source: 'off',
  };
};

export type LookupResult =
  | { status: 'found'; food: Food }
  | { status: 'incomplete'; name?: string }
  | { status: 'missing' }
  | { status: 'offline' };

export const fetchProduct = async (barcode: string): Promise<LookupResult> => {
  const code = barcode.replace(/\D/g, '');
  if (!code) return { status: 'missing' };
  try {
    const j = await get(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`,
    );
    if (j?.status !== 1 || !j.product) return { status: 'missing' };
    const food = offToFood({ ...j.product, code: j.product.code ?? code });
    return food
      ? { status: 'found', food }
      : {
          status: 'incomplete',
          name: j.product.product_name_it || j.product.product_name,
        };
  } catch (e: any) {
    // 404 means unknown product; anything else is a network problem.
    return /HTTP 404/.test(String(e?.message))
      ? { status: 'missing' }
      : { status: 'offline' };
  }
};

/** Name search (Italian first). Throws when offline. */
export const searchProducts = async (query: string): Promise<Food[]> => {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  let hits: any[] | undefined;
  try {
    const j = await get(
      `https://search.openfoodfacts.org/search?q=${q}&langs=it,en&page_size=30&fields=${FIELDS}`,
    );
    hits = Array.isArray(j?.hits) ? j.hits : undefined;
  } catch {
    hits = undefined;
  }
  if (!hits) {
    const j = await get(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&json=1&page_size=30&fields=${FIELDS}`,
      12000,
    );
    hits = Array.isArray(j?.products) ? j.products : [];
  }
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const h of hits ?? []) {
    const f = offToFood(h);
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
};
