#!/usr/bin/env node
/**
 * Builds src/catalog/mediaMap.json: catalog id (free-exercise-db) → RepDB
 * illustration [id, frames] (@repdb/exercises, flat 512 px WebP, free for use
 * inside apps with the credit "Exercise data by RepDB (repdb.co)"). Frames:
 * 2 = start + peak, 1 = a single image. Exercises without a match keep the
 * photos. The images are loaded from the npm CDNs, not copied here.
 *
 * Usage: node scripts/build-media-map.js
 */
const fs = require('fs');
const path = require('path');

const repdb = require('@repdb/exercises/exercises.json').exercises;
const catalog = require('../src/catalog/catalog.json');
const byId = new Map(repdb.map(e => [e.id, e]));
const catalogIds = new Set(catalog.items.map(i => i[0]));

// Hand-checked matches for the common exercises (null = no good match).
const OVERRIDES = {
  'Barbell_Bench_Press_-_Medium_Grip': 'bench-press',
  Dumbbell_Bench_Press: 'db-bench-press',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 'incline-bench-press',
  Incline_Dumbbell_Press: 'incline-db-press',
  Decline_Barbell_Bench_Press: 'decline-bench-press-barbell',
  'Close-Grip_Barbell_Bench_Press': 'close-grip-bench-press',
  Smith_Machine_Bench_Press: 'smith-machine-bench-press',
  Leverage_Chest_Press: 'chest-press-machine',
  Cable_Chest_Press: 'cable-chest-press',
  Dumbbell_Flyes: 'db-fly',
  Incline_Dumbbell_Flyes: 'incline-dumbbell-fly',
  Cable_Crossover: 'cable-fly',
  Low_Cable_Crossover: 'cable-fly',
  Butterfly: 'pec-deck',
  Pushups: 'push-up',
  'Push-Ups_-_Close_Triceps_Position': 'close-grip-push-ups',
  'Push-Up_Wide': 'wide-grip-push-ups',
  'Decline_Push-Up': 'decline-push-up',
  'Dips_-_Chest_Version': 'dips',
  Pullups: 'pull-up',
  'Chin-Up': 'chin-ups',
  'Band_Assisted_Pull-Up': 'band-assisted-pull-ups',
  'Wide-Grip_Lat_Pulldown': 'lat-pulldown',
  'Close-Grip_Front_Lat_Pulldown': 'close-grip-lat-pulldown',
  'Straight-Arm_Pulldown': 'straight-arm-pulldown',
  Bent_Over_Barbell_Row: 'barbell-row',
  'One-Arm_Dumbbell_Row': 'single-arm-db-row',
  Seated_Cable_Rows: 'seated-cable-row',
  'T-Bar_Row_with_Handle': 't-bar-row',
  Inverted_Row: 'inverted-row',
  Face_Pull: 'face-pull',
  Barbell_Shrug: 'shrug',
  Dumbbell_Shrug: 'db-shrug',
  Hyperextensions_Back_Extensions: 'back-extension',
  Superman: 'superman',
  Barbell_Squat: 'squat',
  Front_Barbell_Squat: 'front-squat',
  Goblet_Squat: 'goblet-squat',
  Bodyweight_Squat: 'bodyweight-squat',
  Smith_Machine_Squat: 'smith-machine-squat',
  Hack_Squat: 'hack-squat',
  Split_Squat_with_Dumbbells: 'dumbbell-split-squat',
  Kettlebell_Pistol_Squat: 'kettlebell-pistol-squat',
  Dumbbell_Lunges: 'db-lunge',
  Barbell_Lunge: 'barbell-lunge',
  Bodyweight_Walking_Lunge: 'walking-lunge',
  Dumbbell_Rear_Lunge: 'reverse-lunge',
  Dumbbell_Step_Ups: 'step-ups',
  Leg_Press: 'leg-press',
  Leg_Extensions: 'leg-extension',
  Lying_Leg_Curls: 'leg-curl',
  Seated_Leg_Curl: 'seated-leg-curl',
  Standing_Leg_Curl: null,
  Barbell_Deadlift: 'deadlift',
  Romanian_Deadlift: 'romanian-deadlift',
  'Stiff-Legged_Barbell_Deadlift': 'stiff-leg-deadlift',
  'Stiff-Legged_Dumbbell_Deadlift': 'dumbbell-romanian-deadlift',
  Sumo_Deadlift: 'sumo-deadlift',
  Trap_Bar_Deadlift: 'hex-bar-deadlift',
  Good_Morning: 'good-morning',
  Barbell_Hip_Thrust: 'hip-thrust',
  Barbell_Glute_Bridge: 'barbell-glute-bridge',
  Single_Leg_Glute_Bridge: 'single-leg-glute-bridge',
  Glute_Kickback: 'glute-kickback',
  Thigh_Adductor: 'hip-adduction',
  Thigh_Abductor: 'hip-abduction',
  Standing_Calf_Raises: 'standing-calf-raise',
  Seated_Calf_Raise: 'seated-calf-raise',
  Calf_Press_On_The_Leg_Press_Machine: 'machine-calf-raise',
  Standing_Military_Press: 'ohp',
  Seated_Barbell_Military_Press: 'seated-barbell-overhead-press',
  Dumbbell_Shoulder_Press: 'seated-db-press',
  Machine_Shoulder_Military_Press: 'machine-shoulder-press',
  Arnold_Dumbbell_Press: 'arnold-press',
  Side_Lateral_Raise: 'lateral-raise',
  Cable_Seated_Lateral_Raise: 'cable-lateral-raise',
  Front_Dumbbell_Raise: 'dumbbell-front-raise',
  Front_Plate_Raise: null,
  'Seated_Bent-Over_Rear_Delt_Raise': 'rear-delt-fly',
  Reverse_Machine_Flyes: null,
  Cable_Rear_Delt_Fly: null,
  Upright_Barbell_Row: 'upright-row',
  Barbell_Curl: 'barbell-curl',
  'EZ-Bar_Curl': 'ez-bar-curl',
  Dumbbell_Bicep_Curl: 'bicep-curl',
  Dumbbell_Alternate_Bicep_Curl: 'bicep-curl',
  Hammer_Curls: 'hammer-curl',
  Preacher_Curl: 'preacher-curl',
  Concentration_Curls: 'concentration-curl',
  Incline_Dumbbell_Curl: 'incline-db-curl',
  Standing_Biceps_Cable_Curl: 'cable-curl',
  Triceps_Pushdown: 'tricep-pushdown',
  'Triceps_Pushdown_-_Rope_Attachment': 'tricep-pushdown',
  'EZ-Bar_Skullcrusher': 'skull-crusher',
  Cable_Rope_Overhead_Triceps_Extension: 'overhead-tricep-extension',
  Standing_Dumbbell_Triceps_Extension: 'dumbbell-tricep-extension',
  Tricep_Dumbbell_Kickback: 'tricep-kickback',
  'Dips_-_Triceps_Version': 'dips',
  Bench_Dips: 'bench-dips',
  Plank: 'plank',
  Side_Bridge: 'side-plank',
  Crunches: 'crunches',
  Cable_Crunch: 'cable-crunch',
  Reverse_Crunch: 'reverse-crunches',
  Oblique_Crunches: 'cross-body-crunch',
  'Sit-Up': 'sit-ups',
  Russian_Twist: 'russian-twist',
  Flat_Bench_Lying_Leg_Raise: 'lying-leg-raise',
  Hanging_Leg_Raise: 'hanging-leg-raise',
  Mountain_Climbers: 'mountain-climbers',
  Ab_Roller: 'ab-wheel-rollout',
  Dead_Bug: 'dead-bug',
  Running_Treadmill: 'treadmill-running',
  Walking_Treadmill: 'walking',
  Jogging_Treadmill: 'treadmill-running',
  Bicycling_Stationary: 'stationary-bike',
  Elliptical_Trainer: 'elliptical-trainer',
  Rowing_Stationary: 'rowing-machine',
  Stairmaster: 'stair-climber',
  Rope_Jumping: 'jump-rope',
  Battling_Ropes: 'battle-ropes',
  'One-Arm_Kettlebell_Swings': 'one-arm-kettlebell-swing',
  Farmers_Walk: 'dumbbell-farmers-walk',
  Front_Box_Jump: 'box-jump',
  Power_Clean: null,
  Kettlebell_Thruster: null,
};

// Catalog equipment → RepDB equipment allowed for an automatic match.
const MACHINES = repdb
  .map(e => e.equipment)
  .filter(
    q => q && /machine|leg_press|leg_curl|leg_extension|hack_squat/.test(q),
  );
const EQUIP = {
  barbell: ['barbell'],
  dumbbell: ['dumbbell'],
  cable: ['cable'],
  machine: MACHINES,
  kettlebells: ['kettlebell'],
  bands: ['loop_band', 'resistance_band'],
  'body only': [
    null,
    'pull_up_bar',
    'flat_bench',
    'dip_station',
    'rings',
    'suspension_trainer',
    'plyo_box',
  ],
  'exercise ball': ['stability_ball'],
  'e-z curl bar': ['ez_bar'],
};

const PLURAL = [
  [/^(tri|bi)ceps$/, '$1cep'],
  [/ups$/, 'up'],
  [
    /(curl|raise|press|row|fly|lunge|squat|crunch|dip|shrug|extension|kickback|twist|climber)(e?s)$/,
    '$1',
  ],
  [/flyes$/, 'fly'],
];
const DROP = new Set([
  'barbell',
  'dumbbell',
  'dumbbells',
  'db',
  'cable',
  'machine',
  'kettlebell',
  'kettlebells',
  'band',
  'bands',
  'with',
  'the',
  'a',
  'on',
  'standing',
  'version',
]);

const tokens = name =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(' - ')[0]
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(w => PLURAL.reduce((x, [re, to]) => x.replace(re, to), w))
    .filter(w => w && !DROP.has(w));

const pool = repdb.map(e => ({
  id: e.id,
  equipment: e.equipment ?? null,
  key: tokens(e.name_en).sort().join(' '),
}));

const frames = id => (byId.get(id).images.flat.peak ? 2 : 1);

for (const id of Object.keys(OVERRIDES))
  if (!catalogIds.has(id)) throw new Error(`unknown catalog id ${id}`);

const out = {};
let auto = 0;
for (const it of catalog.items) {
  const [id, name0, , , eq] = it;
  const name = name0 || id.replace(/_/g, ' ');
  if (id in OVERRIDES) {
    const r = OVERRIDES[id];
    if (r) {
      if (!byId.has(r)) throw new Error(`unknown RepDB id ${r} for ${id}`);
      out[id] = [r, frames(r)];
    }
    continue;
  }
  const allowed = EQUIP[catalog.equipment[eq]];
  const key = tokens(name).sort().join(' ');
  const hit = pool.find(
    p => p.key === key && (!allowed || allowed.includes(p.equipment)),
  );
  if (hit) {
    out[id] = [hit.id, frames(hit.id)];
    auto++;
  }
}

const file = path.join(__dirname, '..', 'src', 'catalog', 'mediaMap.json');
fs.writeFileSync(file, JSON.stringify(out) + '\n');
console.log(
  `${
    Object.keys(out).length
  } exercises mapped (${auto} automatic) → ${path.relative(
    process.cwd(),
    file,
  )}`,
);
