import { ExperienceLevel, Profile, Sex } from '../types';
import { EXAMPLE_JSON, OUTPUT_RULES, SCHEMA_RULES } from './schema';

const SEX_LABEL: Record<Sex, string> = {
  male: 'uomo',
  female: 'donna',
  other: 'altro',
};

const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: 'principiante',
  intermediate: 'intermedio',
  advanced: 'avanzato',
};

/**
 * Turn the profile into a readable Italian bullet list, skipping empty fields.
 * Used to inject the person's context into the "create a plan" prompt.
 */
export const describeProfile = (p: Profile): string => {
  const lines: string[] = [];
  if (p.name) lines.push(`- Nome: ${p.name}`);
  if (p.age != null) lines.push(`- Età: ${p.age} anni`);
  else if (p.birthDate) lines.push(`- Data di nascita: ${p.birthDate}`);
  if (p.sex) lines.push(`- Sesso: ${SEX_LABEL[p.sex]}`);
  if (p.weightKg != null) lines.push(`- Peso: ${p.weightKg} kg`);
  if (p.heightCm != null) lines.push(`- Altezza: ${p.heightCm} cm`);
  if (p.experience) lines.push(`- Livello di esperienza: ${EXPERIENCE_LABEL[p.experience]}`);
  if (p.sessionsPerWeek != null)
    lines.push(`- Allenamenti a settimana: ${p.sessionsPerWeek}`);
  if (p.sessionLengthMin != null)
    lines.push(`- Durata per sessione: circa ${p.sessionLengthMin} minuti`);
  if (p.equipment && p.equipment.length)
    lines.push(`- Attrezzatura disponibile: ${p.equipment.join(', ')}`);
  if (p.goals && p.goals.length) lines.push(`- Obiettivi: ${p.goals.join(', ')}`);
  if (p.goalsNote) lines.push(`- Dettagli sugli obiettivi: ${p.goalsNote}`);
  if (p.injuries) lines.push(`- Infortuni / problemi fisici: ${p.injuries}`);
  if (p.exclusions) lines.push(`- Esercizi/movimenti da evitare: ${p.exclusions}`);
  return lines.length ? lines.join('\n') : '- (nessun dato fornito)';
};

/**
 * Prompt for a user who ALREADY has a plan (on paper, PDF, from a coach…) and
 * just needs it converted into our JSON format.
 */
export const buildConvertPrompt = (): string =>
  `Sei un assistente che converte una scheda di allenamento in un file JSON per l'app "Vibe Gym".

Ti allego la mia scheda attuale (come testo, foto o PDF). Convertila ESATTAMENTE nel formato qui sotto, senza aggiungere né togliere esercizi: riporta fedelmente giorni, esercizi, serie, ripetizioni, pesi e recuperi. Se un dato manca nella mia scheda, usa un valore sensato e segnalalo in "note_coach".

${SCHEMA_RULES}

ESEMPIO COMPLETO E VALIDO:
${EXAMPLE_JSON}

${OUTPUT_RULES}

Ecco la mia scheda:

[INCOLLA O ALLEGA QUI LA TUA SCHEDA]`;

/**
 * Prompt for a user who has NO plan yet: the AI acts as an objective coach and
 * designs one from the profile. It must push back on unhealthy/contradictory
 * goals and never silently drop essential movements.
 */
export const buildGeneratePrompt = (profile: Profile): string =>
  `Sei un personal trainer esperto, OBIETTIVO e attento alla sicurezza. Devi creare una scheda di allenamento su misura per questa persona e restituirla come file JSON per l'app "Vibe Gym".

PROFILO DELLA PERSONA:
${describeProfile(profile)}

PRINCIPI DA SEGUIRE (importante):
1. Obiettività e salute PRIMA di tutto. Se gli obiettivi sono irrealistici, contraddittori o potenzialmente dannosi (ad esempio "dimagrire" quando i dati indicano già un peso molto basso, oppure richieste incompatibili tra loro), NON assecondare: fermati, spiegami in italiano chiaro qual è il problema e proponi un obiettivo più sano, poi chiedimi conferma prima di generare la scheda.
2. Rispetta gli esercizi/movimenti da evitare. Sostituiscili con alternative che allenano gli stessi muscoli o lo stesso schema di movimento, e spiega la sostituzione nel campo "note_coach". Se un pattern fondamentale non ha una sostituzione adeguata, NON ometterlo in silenzio: segnalamelo esplicitamente e spiega perché.
3. Personalizza volume, intensità e scelta degli esercizi in base a livello di esperienza, numero di allenamenti a settimana, durata delle sessioni e SOLO all'attrezzatura realmente disponibile.
4. Bilancia i gruppi muscolari sull'arco della settimana ed evita carichi eccessivi per chi è principiante o ha infortuni.

PROCEDURA:
- Se in base ai principi sopra c'è qualcosa che non va (obiettivi malsani/contraddittori, o un esercizio essenziale che non posso fare senza sostituti), PRIMA scrivimi le tue osservazioni e le domande, senza generare il JSON, e aspetta la mia risposta.
- Quando invece è tutto sensato, genera direttamente la scheda nel formato JSON qui sotto.

${SCHEMA_RULES}

ESEMPIO COMPLETO E VALIDO:
${EXAMPLE_JSON}

${OUTPUT_RULES}`;
