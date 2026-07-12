/**
 * Single source of truth for the JSON schema we hand to an external AI.
 *
 * These rules are kept in lock-step with the validator in `../validate.ts` and
 * the types in `../types.ts`, so a plan produced by following them imports
 * without errors on the first try.
 */

/** Exhaustive, unambiguous rules the AI must follow to emit a valid plan. */
export const SCHEMA_RULES = `FORMATO JSON RICHIESTO (schema "Vibe Gym", schema_version 2)

Oggetto radice:
{
  "schema_version": 2,
  "id": "slug-stabile-in-minuscolo",   // solo lettere minuscole, numeri e trattini; niente spazi
  "nome_scheda": "Nome leggibile della scheda",
  "creata_il": "AAAA-MM-GG",
  "giorni": [ ...Giorno ],
  "storico": []                          // SEMPRE un array vuoto
}

Giorno:
{
  "id": "giorno_1",                      // id univoco tra i giorni
  "nome": "Giorno A — Petto e tricipiti",
  "colore": "#5E8BFF",                   // colore esadecimale (facoltativo)
  "esercizi": [ ...Esercizio ],
  "cardio": { "tipo": "Tapis roulant", "durata_min": 15, "modalita": "camminata in salita" }  // facoltativo
}

Esercizio normale:
{
  "id": "es_1",                          // id univoco tra tutti gli esercizi
  "nome": "Panca piana con bilanciere",
  "serie": 4,                            // intero > 0
  "reps": Reps,                          // vedi sotto
  "peso_suggerito": Peso,                // facoltativo, vedi sotto
  "recupero_sec": 90,                    // intero > 0 (secondi di recupero)
  "note_coach": "…"                      // facoltativo: spiega qui eventuali sostituzioni o consigli
}

Superset (due o più esercizi da eseguire di fila):
{
  "id": "es_2",
  "tipo": "superset",
  "nome": "Superset: curl + push-down",
  "recupero_sec": 75,                    // il recupero sta sul superset
  "note_coach": "…",                     // facoltativo
  "esercizi": [                          // ALMENO 2 voci
    { "id": "es_2a", "nome": "Curl con manubri", "serie": 3, "reps": Reps, "peso_suggerito": Peso },
    { "id": "es_2b", "nome": "Push-down ai cavi", "serie": 3, "reps": Reps, "peso_suggerito": Peso }
  ]
}

Tipo Reps: { "value": intero oppure null, "unit": "times" | "seconds" | "minutes" }
- Ripetizioni normali: { "value": 10, "unit": "times" }
- A tempo (plank, hold, corsa…): { "value": 30, "unit": "seconds" } oppure { "value": 2, "unit": "minutes" }
- AMRAP / più ripetizioni possibili: { "value": null, "unit": "times" }
- "value" è SEMPRE un intero (oppure null solo per AMRAP): NIENTE intervalli tipo "8-10", scegli un singolo numero.

Tipo Peso:
- { "value": 40, "unit": "kg" }                  // chili
- { "value": 20, "unit": "lb" }                  // libbre
- { "value": 0, "unit": "bw" }                   // corpo libero
- { "value": 10, "unit": "bw" }                  // corpo libero + 10 kg di zavorra

REGOLE FERREE:
- Tutti gli "id" devono essere univoci e stabili.
- "serie" e "recupero_sec" sono interi positivi; per il cardio "durata_min" è un intero positivo.
- Non inventare campi non elencati qui.
- "storico" è sempre [].`;

/** A complete, valid example the AI can mirror. */
export const EXAMPLE_JSON = `{
  "schema_version": 2,
  "id": "full-body-3-giorni",
  "nome_scheda": "Full body 3 giorni",
  "creata_il": "2026-07-05",
  "giorni": [
    {
      "id": "giorno_1",
      "nome": "Giorno A — Spinta",
      "colore": "#5E8BFF",
      "esercizi": [
        {
          "id": "a1",
          "nome": "Panca piana con manubri",
          "serie": 4,
          "reps": { "value": 10, "unit": "times" },
          "peso_suggerito": { "value": 22, "unit": "kg" },
          "recupero_sec": 120
        },
        {
          "id": "a2",
          "nome": "Plank",
          "serie": 3,
          "reps": { "value": 40, "unit": "seconds" },
          "peso_suggerito": { "value": 0, "unit": "bw" },
          "recupero_sec": 60
        },
        {
          "id": "a3",
          "tipo": "superset",
          "nome": "Superset: alzate laterali + push-down",
          "recupero_sec": 75,
          "esercizi": [
            {
              "id": "a3a",
              "nome": "Alzate laterali",
              "serie": 3,
              "reps": { "value": 12, "unit": "times" },
              "peso_suggerito": { "value": 6, "unit": "kg" }
            },
            {
              "id": "a3b",
              "nome": "Push-down ai cavi",
              "serie": 3,
              "reps": { "value": 12, "unit": "times" },
              "peso_suggerito": { "value": 15, "unit": "kg" }
            }
          ]
        }
      ],
      "cardio": { "tipo": "Cyclette", "durata_min": 12, "modalita": "ritmo moderato" }
    }
  ],
  "storico": []
}`;

/** Strict output instruction reused by both builders. */
export const OUTPUT_RULES = `COME RISPONDERE:
- Se puoi, forniscimi un FILE .json scaricabile (chiamalo "scheda.json") così lo importo direttamente nell'app.
- In alternativa rispondi SOLO con il JSON valido: nessun testo prima o dopo, niente blocchi markdown con i backtick, così posso copiarlo e incollarlo.
- In entrambi i casi il contenuto deve essere JSON valido, importabile così com'è senza modifiche.`;
