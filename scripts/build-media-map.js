#!/usr/bin/env node
/**
 * Builds src/catalog/wgMap.json: catalog id (free-exercise-db) → slug of the
 * matching Workout Guide animation (@bryllim/workout-guide, CC BY-SA 4.0,
 * 3-frame line drawings). Exercises without a match keep the photos.
 *
 * Usage:
 *   npm pack @bryllim/workout-guide@1.0.0 && tar -xzf bryllim-workout-guide-1.0.0.tgz
 *   node scripts/build-media-map.js package/manifest.json
 */
const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const catalog = require('../src/catalog/catalog.json');
const slugs = new Set(manifest.map(e => e.slug));

// Hand-checked matches for the common exercises (null = no good match).
const OVERRIDES = {
  'Barbell_Bench_Press_-_Medium_Grip': 'bench-press',
  Dumbbell_Bench_Press: 'dumbbell-bench-press',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 'incline-bench-press',
  Incline_Dumbbell_Press: 'incline-dumbbell-press',
  Decline_Barbell_Bench_Press: 'decline-bench-press',
  'Close-Grip_Barbell_Bench_Press': 'close-grip-bench-press',
  Smith_Machine_Bench_Press: 'smith-machine-bench-press',
  Leverage_Chest_Press: 'machine-chest-press',
  Cable_Chest_Press: null,
  Dumbbell_Flyes: 'dumbbell-fly',
  Incline_Dumbbell_Flyes: 'dumbbell-fly',
  Cable_Crossover: 'cable-fly',
  Low_Cable_Crossover: 'incline-cable-fly',
  Butterfly: 'pec-deck',
  Pushups: 'push-up',
  'Push-Up_Wide': 'wide-push-up',
  'Decline_Push-Up': 'decline-push-up',
  'Dips_-_Chest_Version': 'chest-dip',
  Pullups: 'pull-up',
  'Chin-Up': 'chin-up',
  'Band_Assisted_Pull-Up': 'assisted-pull-up',
  'Wide-Grip_Lat_Pulldown': 'wide-grip-lat-pulldown',
  'Close-Grip_Front_Lat_Pulldown': 'close-grip-lat-pulldown',
  'Straight-Arm_Pulldown': 'straight-arm-pulldown',
  Bent_Over_Barbell_Row: 'barbell-row',
  'One-Arm_Dumbbell_Row': 'one-arm-dumbbell-row',
  Seated_Cable_Rows: 'seated-row',
  'T-Bar_Row_with_Handle': 't-bar-row',
  Inverted_Row: 'inverted-row',
  Face_Pull: 'face-pull',
  Barbell_Shrug: 'shrug',
  Dumbbell_Shrug: 'dumbbell-shrug',
  Hyperextensions_Back_Extensions: 'back-extension',
  Superman: 'superman',
  Barbell_Squat: 'squat',
  Front_Barbell_Squat: 'front-squat',
  Goblet_Squat: 'goblet-squat',
  Bodyweight_Squat: 'bodyweight-squat',
  Smith_Machine_Squat: 'smith-machine-squat',
  Hack_Squat: 'hack-squat',
  Split_Squat_with_Dumbbells: 'split-squat',
  Kettlebell_Pistol_Squat: 'pistol-squat',
  Dumbbell_Lunges: 'walking-lunge',
  Barbell_Lunge: 'forward-lunge',
  Bodyweight_Walking_Lunge: 'forward-lunge',
  Dumbbell_Rear_Lunge: 'reverse-lunge',
  Dumbbell_Step_Ups: 'step-up',
  Leg_Press: 'leg-press',
  Leg_Extensions: 'leg-extension',
  Lying_Leg_Curls: 'lying-leg-curl',
  Seated_Leg_Curl: 'seated-leg-curl',
  Standing_Leg_Curl: 'leg-curl',
  Barbell_Deadlift: 'deadlift',
  Romanian_Deadlift: 'romanian-deadlift',
  'Stiff-Legged_Barbell_Deadlift': 'romanian-deadlift',
  'Stiff-Legged_Dumbbell_Deadlift': 'dumbbell-romanian-deadlift',
  Sumo_Deadlift: 'sumo-deadlift',
  Trap_Bar_Deadlift: 'trap-bar-deadlift',
  Good_Morning: 'good-morning',
  Barbell_Hip_Thrust: 'hip-thrust',
  Barbell_Glute_Bridge: 'barbell-glute-bridge',
  Single_Leg_Glute_Bridge: 'single-leg-glute-bridge',
  Glute_Kickback: 'cable-kickback',
  Thigh_Adductor: 'hip-adduction-machine',
  Thigh_Abductor: 'hip-abduction-machine',
  Standing_Calf_Raises: 'standing-calf-raise',
  Seated_Calf_Raise: 'seated-calf-raise',
  Calf_Press_On_The_Leg_Press_Machine: 'leg-press-calf-raise',
  Standing_Military_Press: 'overhead-press',
  Seated_Barbell_Military_Press: 'overhead-press',
  Dumbbell_Shoulder_Press: 'seated-dumbbell-press',
  Machine_Shoulder_Military_Press: 'machine-shoulder-press',
  Arnold_Dumbbell_Press: 'arnold-press',
  Side_Lateral_Raise: 'lateral-raise',
  Cable_Seated_Lateral_Raise: 'cable-lateral-raise',
  Front_Dumbbell_Raise: 'front-raise',
  Front_Plate_Raise: 'plate-front-raise',
  'Seated_Bent-Over_Rear_Delt_Raise': 'bent-over-rear-delt-raise',
  Reverse_Machine_Flyes: 'reverse-pec-deck',
  Cable_Rear_Delt_Fly: 'cable-rear-delt-fly',
  Upright_Barbell_Row: 'upright-row',
  Barbell_Curl: 'reverse-curl',
  'EZ-Bar_Curl': 'ez-bar-curl',
  Dumbbell_Bicep_Curl: 'bicep-curl',
  Dumbbell_Alternate_Bicep_Curl: 'bicep-curl',
  Hammer_Curls: 'hammer-curl',
  Preacher_Curl: 'preacher-curl',
  Concentration_Curls: 'concentration-curl',
  Incline_Dumbbell_Curl: 'incline-dumbbell-curl',
  Standing_Biceps_Cable_Curl: 'cable-curl',
  Triceps_Pushdown: 'tricep-pushdown',
  'Triceps_Pushdown_-_Rope_Attachment': 'rope-tricep-pushdown',
  'EZ-Bar_Skullcrusher': 'skull-crusher',
  Cable_Rope_Overhead_Triceps_Extension: 'overhead-tricep-extension',
  Standing_Dumbbell_Triceps_Extension: 'dumbbell-overhead-tricep-extension',
  Tricep_Dumbbell_Kickback: 'tricep-kickback',
  'Dips_-_Triceps_Version': 'dip',
  Bench_Dips: 'bench-dip',
  Plank: 'plank',
  Side_Bridge: 'side-plank',
  Crunches: 'crunch',
  Cable_Crunch: 'cable-crunch',
  Reverse_Crunch: 'reverse-crunch',
  Oblique_Crunches: 'bicycle-crunch',
  'Sit-Up': 'decline-sit-up',
  Russian_Twist: 'russian-twist',
  Flat_Bench_Lying_Leg_Raise: 'lying-leg-raise',
  Hanging_Leg_Raise: 'hanging-leg-raise',
  Mountain_Climbers: 'mountain-climber',
  Ab_Roller: 'ab-wheel',
  Dead_Bug: 'dead-bug',
  Running_Treadmill: 'running',
  Walking_Treadmill: 'walking',
  Jogging_Treadmill: 'running',
  Bicycling_Stationary: 'cycling',
  Elliptical_Trainer: 'elliptical',
  Rowing_Stationary: 'rowing',
  Stairmaster: 'stair-climber',
  Rope_Jumping: 'jump-rope',
  Battling_Ropes: 'battle-ropes',
  'One-Arm_Kettlebell_Swings': 'kettlebell-swing',
  Farmers_Walk: 'farmer-carry',
  Front_Box_Jump: null,
  Power_Clean: null,
  Kettlebell_Thruster: null,
};

// The barbell curl drawing is the standing curl with a straight bar.
OVERRIDES.Barbell_Curl = 'ez-bar-curl';

const EQUIP = {
  barbell: ['Barbell'],
  dumbbell: ['Dumbbell'],
  cable: ['Cable'],
  machine: ['Machine'],
  kettlebells: ['Kettlebell'],
  bands: ['Resistance Band'],
  'body only': ['Bodyweight', 'Pull-up Bar', 'Wall', 'Bench', 'Box'],
  'exercise ball': ['Stability Ball'],
  'e-z curl bar': ['Barbell'],
};

const PLURAL = [
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

const wg = manifest.map(e => ({
  slug: e.slug,
  equipment: e.equipment,
  key: tokens(e.name).sort().join(' '),
}));

const out = {};
let auto = 0;
for (const it of catalog.items) {
  const [id, name0, , , eq] = it;
  const name = name0 || id.replace(/_/g, ' ');
  if (id in OVERRIDES) {
    if (OVERRIDES[id]) out[id] = OVERRIDES[id];
    continue;
  }
  const equipment = catalog.equipment[eq];
  const key = tokens(name).sort().join(' ');
  const allowed = EQUIP[equipment];
  const hit = wg.find(
    w => w.key === key && (!allowed || allowed.includes(w.equipment)),
  );
  if (hit) {
    out[id] = hit.slug;
    auto++;
  }
}

for (const [id, slug] of Object.entries(out))
  if (!slugs.has(slug)) throw new Error(`unknown slug ${slug} for ${id}`);

const file = path.join(__dirname, '..', 'src', 'catalog', 'wgMap.json');
fs.writeFileSync(file, JSON.stringify(out) + '\n');
console.log(
  `${
    Object.keys(out).length
  } exercises mapped (${auto} automatic) → ${path.relative(
    process.cwd(),
    file,
  )}`,
);
