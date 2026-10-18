/**
 * Italian names for the most common gym exercises, mapped to catalog ids.
 * The first name of each entry is used as the display name in the app; the
 * others are synonyms that help search and automatic matching.
 */
export const IT_ALIASES: [string, string[]][] = [
  // Petto
  [
    'Barbell_Bench_Press_-_Medium_Grip',
    ['Panca piana', 'Panca piana con bilanciere', 'Distensioni su panca'],
  ],
  [
    'Dumbbell_Bench_Press',
    ['Panca piana con manubri', 'Distensioni con manubri'],
  ],
  [
    'Barbell_Incline_Bench_Press_-_Medium_Grip',
    ['Panca inclinata', 'Panca inclinata con bilanciere'],
  ],
  [
    'Incline_Dumbbell_Press',
    ['Panca inclinata con manubri', 'Spinte inclinate con manubri'],
  ],
  [
    'Decline_Barbell_Bench_Press',
    ['Panca declinata', 'Panca declinata con bilanciere'],
  ],
  ['Close-Grip_Barbell_Bench_Press', ['Panca presa stretta']],
  [
    'Smith_Machine_Bench_Press',
    ['Panca al multipower', 'Panca alla smith machine'],
  ],
  ['Leverage_Chest_Press', ['Chest press', 'Chest press alla macchina']],
  ['Cable_Chest_Press', ['Chest press ai cavi']],
  ['Dumbbell_Flyes', ['Croci con manubri', 'Croci su panca piana']],
  ['Incline_Dumbbell_Flyes', ['Croci su panca inclinata', 'Croci inclinate']],
  [
    'Cable_Crossover',
    ['Croci ai cavi', 'Cable crossover', 'Croci al cavo alto'],
  ],
  ['Low_Cable_Crossover', ['Croci al cavo basso']],
  ['Butterfly', ['Pectoral machine', 'Pec deck', 'Butterfly']],
  ['Pushups', ['Piegamenti', 'Flessioni', 'Push up']],
  ['Push-Up_Wide', ['Piegamenti presa larga', 'Flessioni presa larga']],
  ['Decline_Push-Up', ['Piegamenti con piedi rialzati', 'Flessioni declinate']],
  ['Dips_-_Chest_Version', ['Dip', 'Dip alle parallele', 'Parallele']],

  // Schiena
  [
    'Pullups',
    ['Trazioni', 'Trazioni alla sbarra', 'Trazioni presa prona', 'Pull up'],
  ],
  ['Chin-Up', ['Trazioni presa supina', 'Trazioni presa inversa', 'Chin up']],
  ['Band_Assisted_Pull-Up', ['Trazioni assistite', 'Trazioni con elastico']],
  [
    'Wide-Grip_Lat_Pulldown',
    ['Lat machine', 'Lat machine presa larga', 'Lat pulldown'],
  ],
  [
    'Close-Grip_Front_Lat_Pulldown',
    ['Lat machine presa stretta', 'Lat machine triangolo'],
  ],
  ['Straight-Arm_Pulldown', ['Pulldown a braccia tese', 'Pullover ai cavi']],
  ['Bent_Over_Barbell_Row', ['Rematore con bilanciere', 'Rematore bilanciere']],
  [
    'One-Arm_Dumbbell_Row',
    ['Rematore con manubrio', 'Rematore manubrio', 'Rematore a un braccio'],
  ],
  [
    'Seated_Cable_Rows',
    ['Pulley basso', 'Pulley', 'Rematore ai cavi', 'Rematore seduto'],
  ],
  ['T-Bar_Row_with_Handle', ['Rematore T-bar', 'T-bar row']],
  ['Inverted_Row', ['Rematore inverso', 'Australian pull up']],
  ['Face_Pull', ['Face pull', 'Tirate al viso']],
  ['Barbell_Shrug', ['Scrollate', 'Scrollate con bilanciere', 'Shrug']],
  ['Dumbbell_Shrug', ['Scrollate con manubri']],
  [
    'Hyperextensions_Back_Extensions',
    ['Iperestensioni', 'Hyperextension', 'Estensioni lombari'],
  ],
  ['Superman', ['Superman']],

  // Gambe
  ['Barbell_Squat', ['Squat', 'Squat con bilanciere', 'Back squat']],
  ['Front_Barbell_Squat', ['Front squat', 'Squat frontale']],
  ['Goblet_Squat', ['Goblet squat']],
  ['Bodyweight_Squat', ['Squat a corpo libero', 'Air squat']],
  ['Smith_Machine_Squat', ['Squat al multipower', 'Squat alla smith machine']],
  ['Hack_Squat', ['Hack squat']],
  [
    'Split_Squat_with_Dumbbells',
    ['Squat bulgaro', 'Bulgarian split squat', 'Split squat'],
  ],
  ['Kettlebell_Pistol_Squat', ['Pistol squat', 'Squat a una gamba']],
  ['Dumbbell_Lunges', ['Affondi', 'Affondi con manubri']],
  ['Barbell_Lunge', ['Affondi con bilanciere']],
  [
    'Bodyweight_Walking_Lunge',
    ['Affondi in camminata', 'Affondi camminati', 'Walking lunges'],
  ],
  ['Dumbbell_Rear_Lunge', ['Affondi indietro', 'Affondi inversi']],
  ['Dumbbell_Step_Ups', ['Step up', 'Salite sul box']],
  ['Leg_Press', ['Leg press', 'Pressa', 'Pressa 45']],
  ['Leg_Extensions', ['Leg extension', 'Estensioni gambe']],
  ['Lying_Leg_Curls', ['Leg curl', 'Leg curl sdraiato', 'Leg curl prono']],
  ['Seated_Leg_Curl', ['Leg curl seduto']],
  ['Standing_Leg_Curl', ['Leg curl in piedi']],
  ['Barbell_Deadlift', ['Stacco da terra', 'Stacco', 'Deadlift']],
  ['Romanian_Deadlift', ['Stacco rumeno', 'Romanian deadlift', 'RDL']],
  ['Stiff-Legged_Barbell_Deadlift', ['Stacco a gambe tese']],
  [
    'Stiff-Legged_Dumbbell_Deadlift',
    ['Stacco rumeno con manubri', 'Stacco a gambe tese con manubri'],
  ],
  ['Sumo_Deadlift', ['Stacco sumo']],
  ['Trap_Bar_Deadlift', ['Stacco con trap bar', 'Stacco esagonale']],
  ['Good_Morning', ['Good morning']],
  ['Barbell_Hip_Thrust', ['Hip thrust', 'Hip thrust con bilanciere']],
  [
    'Barbell_Glute_Bridge',
    ['Ponte glutei', 'Glute bridge', 'Ponte per glutei'],
  ],
  ['Single_Leg_Glute_Bridge', ['Ponte glutei a una gamba']],
  ['Glute_Kickback', ['Kickback glutei', 'Slanci posteriori']],
  [
    'Thigh_Adductor',
    ['Adductor machine', 'Adduttori alla macchina', 'Adduttori'],
  ],
  [
    'Thigh_Abductor',
    ['Abductor machine', 'Abduttori alla macchina', 'Abduttori'],
  ],
  [
    'Standing_Calf_Raises',
    [
      'Calf raise',
      'Calf in piedi',
      'Polpacci in piedi',
      'Sollevamenti sulle punte',
    ],
  ],
  ['Seated_Calf_Raise', ['Calf seduto', 'Polpacci seduto']],
  [
    'Calf_Press_On_The_Leg_Press_Machine',
    ['Calf alla pressa', 'Polpacci alla pressa'],
  ],

  // Spalle
  [
    'Standing_Military_Press',
    ['Lento avanti', 'Military press', 'Overhead press', 'Lento in piedi'],
  ],
  ['Seated_Barbell_Military_Press', ['Lento avanti seduto']],
  [
    'Dumbbell_Shoulder_Press',
    ['Lento con manubri', 'Shoulder press con manubri', 'Spinte con manubri'],
  ],
  [
    'Machine_Shoulder_Military_Press',
    ['Shoulder press', 'Shoulder press alla macchina'],
  ],
  ['Arnold_Dumbbell_Press', ['Arnold press']],
  ['Side_Lateral_Raise', ['Alzate laterali', 'Alzate laterali con manubri']],
  ['Cable_Seated_Lateral_Raise', ['Alzate laterali ai cavi']],
  ['Front_Dumbbell_Raise', ['Alzate frontali', 'Alzate frontali con manubri']],
  ['Front_Plate_Raise', ['Alzate frontali con disco']],
  [
    'Seated_Bent-Over_Rear_Delt_Raise',
    ['Alzate posteriori', 'Alzate a 90', 'Deltoide posteriore'],
  ],
  [
    'Reverse_Machine_Flyes',
    ['Reverse fly', 'Croci inverse alla macchina', 'Pectoral inversa'],
  ],
  ['Cable_Rear_Delt_Fly', ['Croci inverse ai cavi']],
  ['Upright_Barbell_Row', ['Tirate al mento', 'Upright row']],

  // Braccia
  ['Barbell_Curl', ['Curl con bilanciere', 'Curl bilanciere']],
  ['EZ-Bar_Curl', ['Curl con bilanciere EZ', 'Curl EZ']],
  ['Dumbbell_Bicep_Curl', ['Curl con manubri', 'Curl manubri']],
  [
    'Dumbbell_Alternate_Bicep_Curl',
    ['Curl alternato', 'Curl alternato con manubri'],
  ],
  ['Hammer_Curls', ['Curl a martello', 'Hammer curl']],
  ['Preacher_Curl', ['Curl alla panca Scott', 'Panca Scott']],
  ['Concentration_Curls', ['Curl concentrato']],
  ['Incline_Dumbbell_Curl', ['Curl su panca inclinata']],
  ['Standing_Biceps_Cable_Curl', ['Curl ai cavi', 'Curl al cavo basso']],
  [
    'Triceps_Pushdown',
    ['Push down', 'Pushdown', 'Pushdown ai cavi', 'Push down ai cavi'],
  ],
  [
    'Triceps_Pushdown_-_Rope_Attachment',
    ['Push down con corda', 'Pushdown con corda'],
  ],
  [
    'EZ-Bar_Skullcrusher',
    ['French press', 'Skull crusher', 'French press con bilanciere EZ'],
  ],
  [
    'Cable_Rope_Overhead_Triceps_Extension',
    ['Estensioni sopra la testa ai cavi', 'French press ai cavi'],
  ],
  [
    'Standing_Dumbbell_Triceps_Extension',
    ['Estensioni tricipiti con manubrio', 'French press con manubrio'],
  ],
  ['Tricep_Dumbbell_Kickback', ['Kickback tricipiti', 'Kickback con manubrio']],
  ['Dips_-_Triceps_Version', ['Dip per tricipiti']],
  ['Bench_Dips', ['Dip alla panca', 'Dip su panca']],

  // Core
  ['Plank', ['Plank', 'Plank frontale']],
  ['Side_Bridge', ['Plank laterale', 'Side plank']],
  ['Crunches', ['Crunch', 'Crunch a terra']],
  ['Cable_Crunch', ['Crunch ai cavi', 'Crunch inginocchiato ai cavi']],
  ['Reverse_Crunch', ['Crunch inverso']],
  ['Oblique_Crunches', ['Crunch obliqui']],
  ['Sit-Up', ['Sit up']],
  ['Russian_Twist', ['Russian twist', 'Torsioni russe']],
  [
    'Flat_Bench_Lying_Leg_Raise',
    ['Leg raise', 'Sollevamento gambe', 'Alzate gambe'],
  ],
  [
    'Hanging_Leg_Raise',
    ['Leg raise alla sbarra', 'Sollevamento gambe alla sbarra'],
  ],
  ['Mountain_Climbers', ['Mountain climber', 'Scalatore']],
  ['Ab_Roller', ['Ruota addominali', 'Ab wheel', 'Ab roller']],
  ['Dead_Bug', ['Dead bug']],

  // Cardio e funzionale
  ['Running_Treadmill', ['Tapis roulant', 'Corsa', 'Corsa su tapis roulant']],
  [
    'Walking_Treadmill',
    ['Camminata', 'Camminata su tapis roulant', 'Camminata in pendenza'],
  ],
  ['Jogging_Treadmill', ['Jogging']],
  ['Bicycling_Stationary', ['Cyclette', 'Bici', 'Spinning']],
  ['Elliptical_Trainer', ['Ellittica', 'Ellittico']],
  ['Rowing_Stationary', ['Vogatore', 'Rowing', 'Remoergometro']],
  ['Stairmaster', ['Stepper', 'Scala', 'Stairmaster']],
  ['Rope_Jumping', ['Salto con la corda', 'Corda', 'Salto della corda']],
  ['Battling_Ropes', ['Battle rope', 'Corde ondulatorie']],
  ['One-Arm_Kettlebell_Swings', ['Kettlebell swing', 'Swing con kettlebell']],
  ['Farmers_Walk', ['Farmer walk', 'Camminata del contadino']],
  ['Front_Box_Jump', ['Box jump', 'Salti sul box']],
  ['Power_Clean', ['Girata', 'Power clean']],
  ['Kettlebell_Thruster', ['Thruster']],
];
