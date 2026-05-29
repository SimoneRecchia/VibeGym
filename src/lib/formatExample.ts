/**
 * Reference JSON shown in the "Crea il JSON" screen and shared with users
 * as the AI conversion prompt target.
 *
 * The example deliberately uses the v2 typed schema so AIs produce clean
 * numeric weights / reps from day one, but the importer still accepts the
 * legacy v1 stringy format via `normalizePlan()`.
 */

export const FORMAT_EXAMPLE = `{
  "schema_version": 2,
  "id": "la-mia-scheda",
  "nome_scheda": "La mia scheda",
  "creata_il": "2026-05-27",
  "giorni": [
    {
      "id": "giorno_1",
      "nome": "Giorno A — Petto",
      "colore": "#5E8BFF",
      "esercizi": [
        {
          "id": "a1",
          "nome": "Chest Press",
          "serie": 4,
          "reps": { "kind": "range", "min": 8, "max": 10 },
          "peso_suggerito": { "value": 40, "unit": "kg" },
          "recupero_sec": 120
        },
        {
          "id": "a2",
          "nome": "Plank",
          "serie": 3,
          "reps": { "kind": "time", "sec": 30 },
          "peso_suggerito": { "value": 0, "unit": "bw" },
          "recupero_sec": 60
        },
        {
          "id": "a3",
          "tipo": "superset",
          "nome": "Superset: Alzate + Pushdown",
          "recupero_sec": 75,
          "esercizi": [
            {
              "id": "a3a",
              "nome": "Alzate laterali",
              "serie": 3,
              "reps": { "kind": "fixed", "value": 12 },
              "peso_suggerito": { "value": 6, "unit": "kg" }
            },
            {
              "id": "a3b",
              "nome": "Pushdown",
              "serie": 3,
              "reps": { "kind": "fixed", "value": 12 },
              "peso_suggerito": { "value": 15, "unit": "kg" }
            }
          ]
        }
      ],
      "cardio": {
        "tipo": "Tapis roulant",
        "durata_min": 20,
        "modalita": "Pendenza 8-10, velocità 5 km/h"
      }
    }
  ],
  "storico": []
}`;

export const FORMAT_PROMPT = `Trasforma la mia scheda da palestra in un JSON valido secondo questo schema. Regole:

- Oggetto root: { "schema_version": 2, "id": "slug-stabile", "nome_scheda": string, "creata_il": "YYYY-MM-DD", "giorni": [...], "storico": [] }. L'"id" è uno slug lowercase-con-trattini, NON cambierà mai (è il nome cartella su GitHub).
- Ogni giorno: { "id": slug, "nome": string (es. "Giorno A — Petto"), "colore": "#HEX", "esercizi": [...], opzionalmente "cardio" }.
- Ogni esercizio: { "id": slug, "nome": string, "serie": intero, "reps": Reps, "peso_suggerito": Weight, "recupero_sec": intero, opzionalmente "note_coach": string }.
- Tipo Weight: { "value": numero, "unit": "kg" | "lb" | "bw" }. Per corpo libero usa { "value": 0, "unit": "bw" }; per BW + zavorra usa { "value": 10, "unit": "bw" }.
- Tipo Reps: una delle seguenti varianti:
  • { "kind": "fixed", "value": numero }    — ripetizioni fisse
  • { "kind": "range", "min": numero, "max": numero }   — range tipo 8-10
  • { "kind": "amrap" }   — al massimo
  • { "kind": "time", "sec": numero }   — esercizi a tempo (plank, hold…)
- Superset: { "tipo": "superset", "nome": string, "recupero_sec": intero, "esercizi": [due voci con id/nome/serie/reps/peso_suggerito] }. Il "recupero_sec" sta sul superset.
- Cardio opzionale: { "tipo": string, "durata_min": intero, "modalita": string }.
- "storico" sempre [].
- Rispondi SOLO con JSON valido, niente commenti né backtick markdown.

Ecco la mia scheda:

[INCOLLA QUI LA TUA SCHEDA IN QUALSIASI FORMATO]`;
