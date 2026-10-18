#!/usr/bin/env node
/**
 * Builds src/catalog/catalog.json — a slim copy of free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, public domain / Unlicense).
 *
 * Usage:
 *   curl -L -o /tmp/exercises.json \
 *     https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
 *   node scripts/build-catalog.js /tmp/exercises.json
 *
 * Output shape (kept compact to keep the JS bundle small):
 *   { muscles: string[], equipment: string[], categories: string[], levels: string[],
 *     items: [id, name|0, primary[], secondary[], equipment, category, level, compound(0|1), frames][] }
 * `name` is 0 when it equals the id with underscores replaced by spaces.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/build-catalog.js <exercises.json>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

const index = list => value => {
  const v = value ?? 'none';
  let i = list.indexOf(v);
  if (i === -1) {
    list.push(v);
    i = list.length - 1;
  }
  return i;
};

const muscles = [];
const equipment = [];
const categories = [];
const levels = [];
const m = index(muscles);
const e = index(equipment);
const c = index(categories);
const l = index(levels);

const items = data
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(x => [
    x.id,
    x.id.replace(/_/g, ' ') === x.name ? 0 : x.name,
    (x.primaryMuscles || []).map(m),
    (x.secondaryMuscles || []).map(m),
    e(x.equipment),
    c(x.category),
    l(x.level),
    x.mechanic === 'compound' ? 1 : 0,
    (x.images || []).length,
  ]);

const out = { muscles, equipment, categories, levels, items };
const dest = path.join(__dirname, '..', 'src', 'catalog', 'catalog.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`Wrote ${items.length} exercises to ${dest} (${fs.statSync(dest).size} bytes)`);
