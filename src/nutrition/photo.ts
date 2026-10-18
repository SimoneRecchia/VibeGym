/**
 * Turns what the camera saw (barcodes, text lines, image labels) into food
 * suggestions: a barcode to look up, a product name read from the label and
 * everyday foods recognised in the photo.
 */
import type { VisionResult } from 'vibe-vision';
import { Food } from '../core/types';
import { genericFood, normalize } from './foods';

/**
 * Image labels → bundled foods, most likely first. One table for the three
 * recognisers: Apple Vision identifiers (iOS, `mandarine`, `citrus_fruit`…),
 * ImageNet classes of the bundled EfficientNet model (Android, `orange`,
 * `Granny Smith`…) and the ML Kit base labels (`Pizza`, `Bread`…). Keys are
 * normalised: lowercase, spaces for underscores.
 */
export const LABEL_FOODS: Record<string, string[]> = {
  // Fruit
  banana: ['banana'],
  apple: ['mela'],
  'granny smith': ['mela'],
  orange: ['mandarino', 'arancia'],
  oranges: ['arancia', 'mandarino'],
  mandarine: ['mandarino', 'arancia'],
  mandarin: ['mandarino', 'arancia'],
  tangerine: ['mandarino', 'arancia'],
  clementine: ['mandarino'],
  'citrus fruit': ['arancia', 'mandarino', 'limone'],
  citrus: ['arancia', 'mandarino', 'limone'],
  grapefruit: ['arancia'],
  lemon: ['limone'],
  lime: ['limone'],
  pear: ['pera'],
  grape: ['uva'],
  strawberry: ['fragole'],
  blueberry: ['mirtilli'],
  raspberry: ['lamponi'],
  blackberry: ['mirtilli', 'lamponi'],
  berry: ['fragole', 'mirtilli', 'lamponi'],
  cherry: ['ciliegie'],
  peach: ['pesca'],
  nectarine: ['pesca'],
  apricot: ['albicocca'],
  plum: ['prugna'],
  watermelon: ['anguria'],
  melon: ['melone'],
  cantaloupe: ['melone'],
  honeydew: ['melone'],
  pineapple: ['ananas'],
  mango: ['mango'],
  avocado: ['avocado'],
  guacamole: ['avocado'],
  kiwi: ['kiwi'],
  fig: ['fichi', 'mela'],
  // Red apples often come out as pomegranate in ImageNet.
  pomegranate: ['melagrana', 'mela'],
  persimmon: ['cachi'],
  // Vegetables
  tomato: ['pomodori', 'pomodorini'],
  'cherry tomato': ['pomodorini'],
  cucumber: ['cetrioli', 'zucchine'],
  carrot: ['carote'],
  broccoli: ['broccoli'],
  cauliflower: ['cavolfiore'],
  cabbage: ['cavolo'],
  'head cabbage': ['cavolo', 'lattuga'],
  lettuce: ['lattuga', 'romana', 'iceberg'],
  salad: ['lattuga', 'insalata-riso'],
  arugula: ['rucola'],
  spinach: ['spinaci'],
  zucchini: ['zucchine', 'cetrioli'],
  courgette: ['zucchine'],
  eggplant: ['melanzane'],
  'bell pepper': ['peperoni', 'peperoni-verdi', 'pomodori'],
  'pepper veggie': ['peperoni', 'peperoni-verdi'],
  onion: ['cipolla'],
  leek: ['porri'],
  garlic: ['aglio'],
  celery: ['sedano'],
  beet: ['barbabietola'],
  potato: ['patate', 'patate-bollite'],
  'mashed potato': ['patate-bollite'],
  mushroom: ['funghi'],
  agaric: ['funghi'],
  bolete: ['funghi'],
  corn: ['mais'],
  pumpkin: ['zucca'],
  'butternut squash': ['zucca'],
  'acorn squash': ['zucca'],
  'spaghetti squash': ['zucca'],
  asparagus: ['asparagi'],
  artichoke: ['carciofi'],
  cardoon: ['carciofi', 'sedano'],
  'green beans': ['fagiolini'],
  pea: ['piselli'],
  edamame: ['edamame'],
  olive: ['olive'],
  // Bread, cereals, pasta
  bread: ['pane', 'pane-integrale'],
  'white bread': ['pane'],
  'french loaf': ['baguette', 'pane'],
  bagel: ['pane'],
  pretzel: ['pane'],
  dough: ['pane', 'pizza'],
  toast: ['pane-tostato'],
  croissant: ['cornetto'],
  pasta: ['pasta-cotta', 'pasta-integrale-cotta'],
  spaghetti: ['pasta-cotta'],
  carbonara: ['pasta-cotta'],
  noodle: ['pasta-cotta'],
  rice: ['riso-cotto', 'riso-integrale-cotto'],
  risotto: ['risotto'],
  couscous: ['couscous'],
  quinoa: ['quinoa-cotta'],
  oatmeal: ['avena'],
  porridge: ['avena'],
  cereal: ['corn-flakes', 'muesli'],
  granola: ['granola'],
  muesli: ['muesli'],
  popcorn: ['popcorn'],
  // Dishes
  pizza: ['pizza'],
  lasagna: ['lasagne'],
  sushi: ['sushi'],
  hamburger: ['hamburger-panino'],
  cheeseburger: ['hamburger-panino'],
  burger: ['hamburger-panino'],
  sandwich: ['pane', 'prosciutto-cotto'],
  burrito: ['piadina'],
  tortilla: ['piadina'],
  'french fries': ['patatine-fritte'],
  fries: ['patatine-fritte'],
  chips: ['patatine-busta'],
  soup: ['minestrone', 'brodo'],
  'hot pot': ['minestrone'],
  consomme: ['brodo'],
  caprese: ['mozzarella', 'pomodori'],
  bruschetta: ['pane-tostato', 'pomodori'],
  omelet: ['frittata'],
  omelette: ['frittata'],
  'fried egg': ['frittata', 'uovo'],
  'scrambled eggs': ['frittata'],
  egg: ['uovo', 'uovo-sodo'],
  // Meat, fish, eggs, dairy
  steak: ['bistecca', 'filetto'],
  beef: ['bistecca', 'macinato-10'],
  'meat loaf': ['macinato-10'],
  meatball: ['macinato-10'],
  chicken: ['pollo-petto-cotto'],
  'grilled chicken': ['pollo-petto-cotto'],
  'fried chicken': ['pollo-coscia-pelle'],
  poultry: ['pollo-petto-cotto', 'tacchino-cotto'],
  ham: ['prosciutto-cotto', 'prosciutto-crudo'],
  salami: ['salame'],
  pepperoni: ['salame'],
  sausage: ['salsiccia', 'wurstel'],
  'hot dog': ['wurstel'],
  hotdog: ['wurstel'],
  bacon: ['pancetta'],
  salmon: ['salmone'],
  coho: ['salmone'],
  tuna: ['tonno'],
  sardine: ['sardine'],
  anchovy: ['alici'],
  mackerel: ['sgombro'],
  seabass: ['branzino'],
  trout: ['trota'],
  swordfish: ['pesce-spada'],
  fish: ['merluzzo', 'orata', 'branzino'],
  shrimp: ['gamberi'],
  prawn: ['gamberi'],
  shellfish: ['gamberi', 'cozze'],
  squid: ['calamari'],
  octopus: ['polpo'],
  mussel: ['cozze'],
  clam: ['vongole'],
  cheese: ['mozzarella', 'parmigiano'],
  mozzarella: ['mozzarella'],
  yogurt: ['yogurt-intero', 'yogurt-greco-2'],
  milk: ['latte-ps'],
  butter: ['burro'],
  // Sweets
  'ice cream': ['gelato'],
  gelato: ['gelato'],
  'frozen dessert': ['gelato'],
  tiramisu: ['tiramisu'],
  cake: ['torta'],
  cheesecake: ['torta'],
  trifle: ['torta'],
  pie: ['crostata'],
  potpie: ['crostata'],
  cookie: ['biscotti-frollini'],
  biscuit: ['biscotti-secchi'],
  biscotti: ['biscotti-secchi'],
  chocolate: ['cioccolato-fondente', 'cioccolato-latte'],
  'chocolate sauce': ['crema-nocciole'],
  honey: ['miele'],
  jam: ['marmellata'],
  jelly: ['marmellata'],
  // Nuts, legumes
  nut: ['mandorle', 'noci'],
  almond: ['mandorle'],
  walnut: ['noci'],
  hazelnut: ['nocciole'],
  cashew: ['anacardi'],
  peanut: ['arachidi'],
  pistachio: ['pistacchi'],
  hummus: ['hummus'],
  tofu: ['tofu'],
  legume: ['ceci', 'lenticchie'],
  chickpea: ['ceci'],
  lentil: ['lenticchie'],
  bean: ['cannellini', 'borlotti'],
  // Drinks and condiments
  coffee: ['caffe', 'caffe-americano'],
  espresso: ['caffe'],
  cappuccino: ['latte-ps', 'caffe'],
  'coffee mug': ['caffe-americano'],
  'tea drink': ['te'],
  tea: ['te'],
  juice: ['succo-arancia', 'succo-mela'],
  beer: ['birra'],
  'beer glass': ['birra'],
  'beer bottle': ['birra'],
  wine: ['vino-rosso', 'vino-bianco'],
  'red wine': ['vino-rosso'],
  'white wine': ['vino-bianco'],
  'sparkling wine': ['prosecco'],
  soda: ['cola'],
  cola: ['cola'],
  'pop bottle': ['cola'],
  'water bottle': ['acqua'],
  mustard: ['senape'],
};

/** Generic labels: offer the whole category when nothing more specific shows up. */
const LABEL_CATEGORY: Record<string, string> = {
  fruit: 'frutta',
  'citrus fruit': 'frutta',
  berry: 'frutta',
  vegetable: 'verdura',
  herb: 'verdura',
  salad: 'verdura',
  'leaf vegetable': 'verdura',
  bread: 'cereali',
  'baked goods': 'cereali',
  dessert: 'dolci',
  cheese: 'formaggi',
  seafood: 'pesce',
  fish: 'pesce',
  meat: 'carne',
  nut: 'frutta-secca',
  drink: 'bevande',
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
  /** Food categories seen in the photo (e.g. 'frutta'), best first. */
  categories: string[];
  /** The models are still being downloaded by Play Services. */
  downloading: boolean;
}

const MIN_CONFIDENCE: Record<string, number> = {
  // Softmax over 1000 ImageNet classes: food classes score low but are right.
  imagenet: 0.04,
  base: 0.3,
  vision: 0.1,
};

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

  // Each label votes for its foods (the first one most); best vote wins.
  const score = new Map<string, number>();
  const catScore = new Map<string, number>();
  for (const l of r.labels) {
    if (l.confidence < (MIN_CONFIDENCE[l.source ?? 'vision'] ?? 0.1)) continue;
    const key = normalize(l.name.replace(/_/g, ' '));
    const slugs = LABEL_FOODS[key] ?? LABEL_FOODS[key.replace(/s$/, '')] ?? [];
    slugs.forEach((slug, i) => {
      const v = l.confidence * (1 - i * 0.12);
      if ((score.get(slug) ?? 0) < v) score.set(slug, v);
    });
    const cat = LABEL_CATEGORY[key];
    if (cat && (catScore.get(cat) ?? 0) < l.confidence)
      catScore.set(cat, l.confidence);
  }
  const foods = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => genericFood(`g:${slug}`))
    .filter((f): f is Food => !!f)
    .slice(0, 6);
  // The categories of what was recognised come first.
  for (const f of foods)
    if (f.category && !catScore.has(f.category)) catScore.set(f.category, 0);
  const categories = [...catScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .filter(cat => ['frutta', 'verdura'].includes(cat) || !foods.length);

  return {
    barcode,
    query,
    foods,
    categories: categories.slice(0, 2),
    downloading: r.errors.some(e => e.endsWith(':downloading')),
  };
};
