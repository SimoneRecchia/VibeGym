/**
 * Prompts the user copies into an AI chat. All three flows share the same
 * schema, example and exercise list, so whatever comes back imports cleanly.
 */
import { Experience, Plan, Profile, Session, Sex } from '../core/types';
import { CATALOG, CatalogExercise } from '../catalog';
import { planToJson } from './aiFormat';
import { ageFrom } from '../core/dates';
import { fmtNum } from '../core/format';
import { keyOf, allExercises } from './planUtils';

/* ------------------------------------------------------------------ */
/*  Shared blocks                                                      */
/* ------------------------------------------------------------------ */

export const SCHEMA_TEXT = `FORMATO JSON "VibeGym" (versione 3)

{
  "formato": "vibegym",
  "versione": 3,
  "nome": "Nome della scheda",
  "note": "facoltativo: indicazioni generali (riscaldamento, progressione…)",
  "giorni": [ Giorno, … ]
}

Giorno:  { "nome": "Push — Petto, spalle, tricipiti", "esercizi": [ Esercizio | Superset, … ] }

Esercizio a ripetizioni:
{ "nome": "Panca piana", "catalogo": "Barbell_Bench_Press_-_Medium_Grip", "tipo": "ripetizioni",
  "serie": 4, "ripetizioni": 8, "carico_kg": 60, "recupero_sec": 120, "note": "facoltativo" }

Esercizio a tempo (plank, isometrie, intervalli):
{ "nome": "Plank", "catalogo": "Plank", "tipo": "tempo", "serie": 3, "durata_sec": 45, "carico_kg": 0, "recupero_sec": 60 }

Cardio:
{ "nome": "Tapis roulant", "catalogo": "Running_Treadmill", "tipo": "cardio", "durata_min": 15, "distanza_km": 2.5, "note": "pendenza 6%" }

Superset / circuito (esercizi eseguiti di fila, il recupero arriva dopo l'ultimo):
{ "superset": [ Esercizio, Esercizio ], "serie": 3, "recupero_sec": 90 }

REGOLE (obbligatorie):
1. Solo NUMERI per serie, ripetizioni, carico_kg, durata_sec, durata_min, distanza_km, recupero_sec. Mai testo come "8-10", "max", "corpo libero" o unità di misura dentro i numeri.
2. "ripetizioni" è un singolo intero (scegli il valore obiettivo, es. 10 invece di "8-10"). Se le serie hanno valori diversi (piramidale) usa un array lungo quanto "serie": "ripetizioni": [12, 10, 8, 6], "carico_kg": [40, 45, 50, 55].
3. "carico_kg" è il carico esterno in kg: 0 per gli esercizi a corpo libero, un numero per la zavorra. Se non conosci il carico della persona stimalo prudentemente in base al profilo.
4. Esercizi a cedimento/AMRAP: metti comunque un numero indicativo in "ripetizioni" e aggiungi "a_cedimento": true.
5. "catalogo" DEVE essere copiato esattamente da un id della LISTA ESERCIZI qui sotto: serve a mostrare l'animazione del movimento. Scegli l'id più fedele al movimento; se nessuno corrisponde ometti il campo "catalogo" (non inventare id).
6. "nome" è in italiano, breve e chiaro (es. "Panca piana", "Lat machine presa larga").
7. Nessun campo diverso da quelli elencati. Nessun id: li genera l'app.`;

export const EXAMPLE_JSON = `{
  "formato": "vibegym",
  "versione": 3,
  "nome": "Full body 3 giorni",
  "note": "Aumenta il carico di 2,5 kg quando completi tutte le serie al numero di ripetizioni indicato.",
  "giorni": [
    {
      "nome": "Giorno A — Full body",
      "esercizi": [
        { "nome": "Squat", "catalogo": "Barbell_Squat", "tipo": "ripetizioni", "serie": 4, "ripetizioni": 6, "carico_kg": 70, "recupero_sec": 150 },
        { "nome": "Panca piana con manubri", "catalogo": "Dumbbell_Bench_Press", "tipo": "ripetizioni", "serie": 3, "ripetizioni": [12, 10, 8], "carico_kg": [20, 22, 24], "recupero_sec": 90 },
        { "nome": "Trazioni", "catalogo": "Pullups", "tipo": "ripetizioni", "serie": 3, "ripetizioni": 8, "carico_kg": 0, "a_cedimento": true, "recupero_sec": 120 },
        { "superset": [
            { "nome": "Alzate laterali", "catalogo": "Side_Lateral_Raise", "tipo": "ripetizioni", "ripetizioni": 15, "carico_kg": 8 },
            { "nome": "Push down con corda", "catalogo": "Triceps_Pushdown_-_Rope_Attachment", "tipo": "ripetizioni", "ripetizioni": 12, "carico_kg": 20 }
          ], "serie": 3, "recupero_sec": 75 },
        { "nome": "Plank", "catalogo": "Plank", "tipo": "tempo", "serie": 3, "durata_sec": 45, "carico_kg": 0, "recupero_sec": 60 },
        { "nome": "Cyclette", "catalogo": "Bicycling_Stationary", "tipo": "cardio", "durata_min": 12 }
      ]
    }
  ]
}`;

export const OUTPUT_TEXT = `COME RISPONDERE:
- Rispondi con UN SOLO blocco di codice \`\`\`json contenente la scheda completa, senza commenti dentro il JSON.
- Prima del blocco puoi scrivere al massimo 3 righe di spiegazione; nient'altro dopo.
- Se puoi creare file, allega anche "scheda.json" con lo stesso contenuto.`;

/* ------------------------------------------------------------------ */
/*  Exercise list                                                      */
/* ------------------------------------------------------------------ */

const GROUP_ORDER = [
  'chest',
  'lats',
  'middle back',
  'lower back',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'abdominals',
  'neck',
];

/** Wizard equipment chips → dataset equipment values. */
export const EQUIPMENT_OPTIONS: {
  key: string;
  label: string;
  values: string[];
}[] = [
  { key: 'barbell', label: 'Bilanciere', values: ['barbell', 'e-z curl bar'] },
  { key: 'dumbbell', label: 'Manubri', values: ['dumbbell'] },
  { key: 'machine', label: 'Macchine', values: ['machine'] },
  { key: 'cable', label: 'Cavi', values: ['cable'] },
  { key: 'kettlebells', label: 'Kettlebell', values: ['kettlebells'] },
  { key: 'bands', label: 'Elastici', values: ['bands'] },
  {
    key: 'balls',
    label: 'Palla medica / fitball',
    values: ['medicine ball', 'exercise ball'],
  },
  { key: 'cardio', label: 'Macchine cardio', values: [] },
];

export const FULL_GYM = EQUIPMENT_OPTIONS.map(o => o.key);

interface ListOptions {
  equipment?: string[];
  includeStretching?: boolean;
  advanced?: boolean;
}

const allowedByEquipment = (
  ex: CatalogExercise,
  keys: string[] | undefined,
): boolean => {
  if (!keys || !keys.length) return true;
  if (ex.category === 'cardio')
    return (
      keys.includes('cardio') ||
      ex.equipment === 'body only' ||
      ex.equipment === 'none'
    );
  if (
    ex.equipment === 'body only' ||
    ex.equipment === 'none' ||
    ex.equipment === 'other'
  )
    return true;
  const values = new Set(
    EQUIPMENT_OPTIONS.filter(o => keys.includes(o.key)).flatMap(o => o.values),
  );
  return values.has(ex.equipment);
};

/** "petto: id1, id2…" lines, grouped by main muscle; cardio last. */
export const exerciseList = (opts: ListOptions = {}): string => {
  const groups = new Map<string, string[]>();
  const cardio: string[] = [];
  for (const ex of CATALOG) {
    if (ex.category === 'stretching' && !opts.includeStretching) continue;
    if (
      !opts.advanced &&
      (ex.category === 'strongman' || ex.category === 'olympic weightlifting')
    )
      continue;
    if (!allowedByEquipment(ex, opts.equipment)) continue;
    if (ex.category === 'cardio') {
      cardio.push(ex.id);
      continue;
    }
    const g = ex.primary[0] ?? 'other';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(ex.id);
  }
  const lines: string[] = [];
  for (const g of GROUP_ORDER) {
    const ids = groups.get(g);
    if (ids?.length) lines.push(`${g}: ${ids.join(', ')}`);
  }
  if (cardio.length) lines.push(`cardio: ${cardio.join(', ')}`);
  return `LISTA ESERCIZI (id validi per "catalogo", raggruppati per muscolo principale):\n${lines.join(
    '\n',
  )}`;
};

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

const SEX: Record<Sex, string> = { male: 'uomo', female: 'donna' };
const EXP: Record<Experience, string> = {
  beginner: 'principiante',
  intermediate: 'intermedio',
  advanced: 'avanzato',
};

export const describeProfile = (
  p: Profile,
  currentWeightKg?: number,
): string => {
  const l: string[] = [];
  if (p.sex) l.push(`- Sesso: ${SEX[p.sex]}`);
  const age = ageFrom(p.birthDate);
  if (age != null) l.push(`- Età: ${age} anni`);
  if (p.heightCm) l.push(`- Altezza: ${p.heightCm} cm`);
  if (currentWeightKg) l.push(`- Peso attuale: ${fmtNum(currentWeightKg)} kg`);
  if (p.goalWeightKg) l.push(`- Peso obiettivo: ${fmtNum(p.goalWeightKg)} kg`);
  if (p.experience) l.push(`- Esperienza: ${EXP[p.experience]}`);
  if (p.daysPerWeek) l.push(`- Allenamenti a settimana: ${p.daysPerWeek}`);
  if (p.sessionMin)
    l.push(`- Durata massima di una sessione: ${p.sessionMin} minuti`);
  if (p.goals?.length) l.push(`- Obiettivi: ${p.goals.join(', ')}`);
  if (p.equipment?.length) {
    const labels = EQUIPMENT_OPTIONS.filter(o =>
      p.equipment!.includes(o.key),
    ).map(o => o.label.toLowerCase());
    l.push(`- Attrezzatura disponibile: corpo libero, ${labels.join(', ')}`);
  }
  if (p.injuries) l.push(`- Infortuni / limitazioni: ${p.injuries}`);
  if (p.exclusions) l.push(`- Esercizi da evitare: ${p.exclusions}`);
  return l.length ? l.join('\n') : '- (nessun dato)';
};

/* ------------------------------------------------------------------ */
/*  1 — Create a plan from scratch                                     */
/* ------------------------------------------------------------------ */

export const buildCreatePrompt = (
  p: Profile,
  extra: { notes?: string; currentWeightKg?: number } = {},
): string => `Sei un personal trainer esperto, obiettivo e attento alla salute. Crea una scheda di allenamento su misura per me e restituiscila nel formato JSON dell'app "VibeGym".

IL MIO PROFILO:
${describeProfile(p, extra.currentWeightKg)}
${extra.notes ? `\nRICHIESTE AGGIUNTIVE:\n${extra.notes}\n` : ''}
PRINCIPI:
1. Sicurezza prima di tutto: volumi e carichi adeguati al livello; se ci sono infortuni scegli varianti che non li sollecitano.
2. Se un obiettivo è irrealistico o poco sano rispetto ai miei dati, dimmelo in una riga e adatta la scheda a un obiettivo sano.
3. Usa SOLO l'attrezzatura disponibile e rispetta gli esercizi da evitare (sostituiscili con alternative per gli stessi muscoli e spiegalo in "note").
4. Rispetta numero di giorni e durata delle sessioni; bilancia i gruppi muscolari nella settimana.
5. Indica carichi di partenza prudenti in "carico_kg" e scrivi in "note" della scheda come progredire.

${SCHEMA_TEXT}

ESEMPIO VALIDO:
${EXAMPLE_JSON}

${exerciseList({
  equipment: p.equipment,
  includeStretching: p.goals?.some(g => /mobilit/i.test(g)),
  advanced: p.experience === 'advanced',
})}

${OUTPUT_TEXT}`;

/* ------------------------------------------------------------------ */
/*  2 — Convert (and optionally improve) an existing plan             */
/* ------------------------------------------------------------------ */

export const buildConvertPrompt = (opts: {
  improve: boolean;
  notes?: string;
  profile?: Profile;
  currentWeightKg?: number;
}): string => `Sei un assistente esperto di allenamento. Ti allego la mia scheda (testo, foto o PDF). ${
  opts.improve
    ? 'Convertila nel formato JSON dell\'app "VibeGym" e MIGLIORALA dove serve (equilibrio tra gruppi muscolari, volume, recuperi), mantenendone lo stile e la struttura dei giorni. Elenca in massimo 3 righe, prima del JSON, cosa hai cambiato.'
    : 'Convertila ESATTAMENTE nel formato JSON dell\'app "VibeGym": stessi giorni, stessi esercizi, stesse serie, ripetizioni, carichi e recuperi. Non aggiungere e non togliere nulla.'
}
Se un dato manca (es. il recupero) usa un valore standard sensato. Se la scheda indica un intervallo di ripetizioni (es. 8-10) usa il valore più alto.
${
  opts.profile
    ? `\nIL MIO PROFILO:\n${describeProfile(
        opts.profile,
        opts.currentWeightKg,
      )}\n`
    : ''
}${opts.notes ? `\nRICHIESTE:\n${opts.notes}\n` : ''}
${SCHEMA_TEXT}

ESEMPIO VALIDO:
${EXAMPLE_JSON}

${exerciseList({ includeStretching: true, advanced: true })}

${OUTPUT_TEXT}

LA MIA SCHEDA:
[allega la foto/PDF oppure incolla qui il testo]`;

/* ------------------------------------------------------------------ */
/*  3 — Modify the current plan, using real progress data              */
/* ------------------------------------------------------------------ */

/** Last performance per exercise of a plan, for the AI to adjust loads. */
export const progressSummary = (plan: Plan, sessions: Session[]): string => {
  const lines: string[] = [];
  const keys = new Set(plan.days.flatMap(d => allExercises(d).map(keyOf)));
  for (const key of keys) {
    const hits = sessions.filter(s => s.exercises.some(e => e.key === key));
    if (!hits.length) continue;
    const last = hits[hits.length - 1];
    const ex = last.exercises.find(e => e.key === key)!;
    const done = ex.sets.filter(s => s.done);
    if (!done.length) continue;
    const desc = done
      .map(s =>
        ex.kind === 'reps'
          ? `${fmtNum(s.kg ?? 0)}kg×${s.reps ?? 0}`
          : ex.kind === 'time'
          ? `${s.sec ?? 0}s`
          : `${Math.round((s.sec ?? 0) / 60)}min${s.km ? ` ${s.km}km` : ''}`,
      )
      .join(', ');
    lines.push(
      `- ${ex.name}: ultima volta (${last.startedAt.slice(0, 10)}) ${desc} — ${
        hits.length
      } sessioni registrate`,
    );
  }
  return lines.length
    ? lines.join('\n')
    : '- (nessun allenamento registrato con questa scheda)';
};

export const buildModifyPrompt = (
  plan: Plan,
  sessions: Session[],
  request: string,
  profile?: Profile,
  currentWeightKg?: number,
): string => `Sei un personal trainer esperto. Questa è la mia scheda attuale nel formato JSON dell'app "VibeGym", insieme ai miei ultimi risultati reali. Modificala come ti chiedo e restituiscila COMPLETA nello stesso formato.

COSA VOGLIO CAMBIARE:
${
  request.trim() ||
  '(nessuna richiesta specifica: aggiorna carichi e volumi in base ai progressi)'
}

REGOLE PER LA MODIFICA:
- Mantieni invariati "nome" e "catalogo" degli esercizi che non cambi: servono a non perdere lo storico dei progressi.
- Usa i risultati reali qui sotto per aggiornare i carichi (progressione graduale e sicura).
- Cambia solo ciò che serve per soddisfare la richiesta.
${
  profile
    ? `\nIL MIO PROFILO:\n${describeProfile(profile, currentWeightKg)}\n`
    : ''
}
I MIEI ULTIMI RISULTATI:
${progressSummary(plan, sessions)}

SCHEDA ATTUALE:
\`\`\`json
${planToJson(plan, false)}
\`\`\`

${SCHEMA_TEXT}

${exerciseList({ includeStretching: true, advanced: true })}

${OUTPUT_TEXT}`;

/* ------------------------------------------------------------------ */
/*  AI chat shortcuts                                                  */
/* ------------------------------------------------------------------ */

export const AI_APPS: { key: string; label: string; url: string }[] = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { key: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
];
