/**
 * Turns what the camera saw (barcodes, text lines, image labels) into food
 * suggestions: a barcode to look up, a product name read from the label and
 * everyday foods recognised in the photo.
 */
import type { VisionResult } from 'vibe-vision';
import { Food } from '../core/types';
import { genericFood, normalize } from './foods';

/** Image label (ML Kit / Apple Vision, English) → bundled food. */
export const LABEL_FOODS: Record<string, string> = {
  banana: 'banana',
  apple: 'mela',
  'granny smith': 'mela',
  orange: 'arancia',
  citrus: 'arancia',
  tangerine: 'mandarino',
  mandarin: 'mandarino',
  lemon: 'limone',
  pear: 'pera',
  grape: 'uva',
  grapes: 'uva',
  strawberry: 'fragole',
  blueberry: 'mirtilli',
  raspberry: 'lamponi',
  cherry: 'ciliegie',
  peach: 'pesca',
  apricot: 'albicocca',
  plum: 'prugna',
  watermelon: 'anguria',
  melon: 'melone',
  cantaloupe: 'melone',
  pineapple: 'ananas',
  mango: 'mango',
  avocado: 'avocado',
  kiwi: 'kiwi',
  fig: 'fichi',
  pomegranate: 'melagrana',
  persimmon: 'cachi',
  date: 'datteri',
  tomato: 'pomodori',
  'cherry tomato': 'pomodorini',
  cucumber: 'cetrioli',
  carrot: 'carote',
  broccoli: 'broccoli',
  cauliflower: 'cavolfiore',
  cabbage: 'cavolo',
  lettuce: 'lattuga',
  salad: 'lattuga',
  arugula: 'rucola',
  spinach: 'spinaci',
  zucchini: 'zucchine',
  courgette: 'zucchine',
  eggplant: 'melanzane',
  'bell pepper': 'peperoni',
  pepper: 'peperoni',
  onion: 'cipolla',
  garlic: 'aglio',
  potato: 'patate',
  mushroom: 'funghi',
  corn: 'mais',
  pumpkin: 'zucca',
  squash: 'zucca',
  asparagus: 'asparagi',
  artichoke: 'carciofi',
  'green bean': 'fagiolini',
  pea: 'piselli',
  olive: 'olive',
  bread: 'pane',
  baguette: 'baguette',
  toast: 'pane-tostato',
  croissant: 'cornetto',
  pasta: 'pasta-cotta',
  spaghetti: 'pasta-cotta',
  noodle: 'pasta-cotta',
  rice: 'riso-cotto',
  risotto: 'risotto',
  pizza: 'pizza',
  lasagna: 'lasagne',
  sushi: 'sushi',
  hamburger: 'hamburger-panino',
  cheeseburger: 'hamburger-panino',
  burger: 'hamburger-panino',
  'french fries': 'patatine-fritte',
  fries: 'patatine-fritte',
  chips: 'patatine-busta',
  egg: 'uovo',
  omelette: 'frittata',
  'fried egg': 'frittata',
  yogurt: 'yogurt-intero',
  milk: 'latte-ps',
  'ice cream': 'gelato',
  cake: 'torta',
  pie: 'crostata',
  cookie: 'biscotti-frollini',
  biscuit: 'biscotti-secchi',
  chocolate: 'cioccolato-fondente',
  steak: 'bistecca',
  beef: 'bistecca',
  chicken: 'pollo-petto-cotto',
  salmon: 'salmone',
  tuna: 'tonno',
  fish: 'merluzzo',
  shrimp: 'gamberi',
  prawn: 'gamberi',
  squid: 'calamari',
  octopus: 'polpo',
  mussel: 'cozze',
  ham: 'prosciutto-cotto',
  sausage: 'salsiccia',
  'hot dog': 'wurstel',
  bacon: 'pancetta',
  cheese: 'mozzarella',
  mozzarella: 'mozzarella',
  nut: 'mandorle',
  almond: 'mandorle',
  walnut: 'noci',
  hazelnut: 'nocciole',
  peanut: 'arachidi',
  pistachio: 'pistacchi',
  coffee: 'caffe',
  espresso: 'caffe',
  tea: 'te',
  juice: 'succo-arancia',
  beer: 'birra',
  wine: 'vino-rosso',
  'red wine': 'vino-rosso',
  'white wine': 'vino-bianco',
  soup: 'minestrone',
  cereal: 'corn-flakes',
  oatmeal: 'avena',
  porridge: 'avena',
  granola: 'granola',
  muesli: 'muesli',
  honey: 'miele',
  jam: 'marmellata',
  hummus: 'hummus',
  tofu: 'tofu',
  legume: 'ceci',
  chickpea: 'ceci',
  lentil: 'lenticchie',
  bean: 'cannellini',
};

/** Words of nutrition tables and legal text, not product names. */
const NOISE =
  /\b(valori|nutrizionali|energia|kcal|kj|grassi|saturi|carboidrati|zuccheri|proteine|fibre|sale|ingredienti|conservare|scadenza|consumarsi|lotto|peso|netto|per 100|prodotto|made|www|http|e\s?\d{3})\b/i;

const isBarcode = (s: string) => /^\d{8}$|^\d{12,13}$/.test(s);

export interface PhotoFindings {
  barcode?: string;
  /** Probable product name read from the label. */
  query?: string;
  /** Everyday foods recognised in the photo, best first. */
  foods: Food[];
  /** The models are still being downloaded by Play Services. */
  downloading: boolean;
}

export const interpretPhoto = (r: VisionResult): PhotoFindings => {
  const barcode = r.barcodes.map(b => b.replace(/\D/g, '')).find(isBarcode);

  // The product name is usually the biggest text on the pack.
  const lines = r.lines
    .map(l => ({ text: l.text.replace(/\s+/g, ' ').trim(), h: l.h }))
    .filter(
      l =>
        l.text.length >= 3 &&
        /[a-zà-ú]{3}/i.test(l.text) &&
        !NOISE.test(l.text) &&
        (l.text.match(/\d/g)?.length ?? 0) <= l.text.length / 3,
    )
    .sort((a, b) => b.h - a.h)
    .slice(0, 2)
    .map(l => l.text);
  const query = lines.join(' ').slice(0, 60).trim() || undefined;

  const seen = new Set<string>();
  const foods: Food[] = [];
  for (const l of [...r.labels].sort((a, b) => b.confidence - a.confidence)) {
    const key = normalize(l.name.replace(/_/g, ' '));
    const slug = LABEL_FOODS[key] ?? LABEL_FOODS[key.replace(/s$/, '')];
    const f = slug ? genericFood(`g:${slug}`) : undefined;
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      foods.push(f);
    }
  }
  return {
    barcode,
    query,
    foods: foods.slice(0, 6),
    downloading: r.errors.some(e => e.endsWith(':downloading')),
  };
};
