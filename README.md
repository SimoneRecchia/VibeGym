# VibeGym

App per la palestra in React Native (iOS e Android), ridisegnata seguendo il design system **Liquid Glass** di Apple (iOS 26). Tutti i dati restano sul telefono.

## Le tre sezioni

| Progressi (sinistra) | **Scheda (centro, home)** | Corpo (destra) |
| --- | --- | --- |
| Riepilogo del mese, attività delle ultime 12 settimane, record recenti, trend per esercizio (1RM stimato, carico, volume, ripetizioni, durata), storico completo | Saluto, settimana, **prossimo allenamento in un tocco**, giorni della scheda, editor, schede multiple | Peso con media mobile a 7 giorni e obiettivo, BMI, composizione corporea dalla bilancia Xiaomi, misure mensili |

In alto a destra, su ogni sezione, l'avatar apre **profilo e impostazioni**.

### Allenamento live

- Una pagina per esercizio (scorri a destra/sinistra), animazione del movimento in alto.
- Il bottone grande registra la serie successiva con i valori già compilati (quelli dell'ultima volta): **un tocco per serie**.
- Il recupero parte da solo, flotta sopra il bottone (−15 s / +15 s / salta) e si ingrandisce a schermo intero. Con il telefono bloccato arriva una notifica a fine recupero.
- Supportati: ripetizioni con carico, corpo libero e zavorra, **a tempo** (plank, isometrie: countdown e registrazione automatica), **cardio** (durata e distanza), **superset/circuiti** (serie alternate, recupero dopo il giro), **piramidali** (valori diversi per serie), serie a cedimento.
- Suggerimento di progressione: se l'ultima volta hai completato tutte le serie, propone +2,5 kg (metà per gli esercizi di isolamento).
- Record personali a fine allenamento; l'allenamento in corso sopravvive alla chiusura dell'app. Su iOS 26 resta visibile come accessorio della tab bar (stile "in riproduzione" di Musica).

### Schede con l'AI

L'app non chiama nessuna AI: prepara un **prompt** completo (formato, regole, esempio e la lista degli esercizi con animazione) da incollare in ChatGPT, Gemini o un'altra AI, poi importa la risposta (appunti, file `.json` o testo).

1. **Crea**: questionario (obiettivi, livello, giorni, durata, attrezzatura, infortuni) → scheda su misura.
2. **Converti**: allega foto/PDF/testo della tua scheda → stessa scheda nel formato dell'app, opzionalmente migliorata.
3. **Modifica**: la scheda attuale + i tuoi **risultati reali** → l'AI aggiorna carichi e struttura come chiedi. Lo storico non si perde.

Il parser è tollerante (blocchi markdown, testo attorno, commenti, virgole finali, `"8-10"`, `"60 kg"`) e mostra cosa ha corretto prima di salvare. Si può anche creare la scheda a mano scegliendo gli esercizi dal catalogo.

### Animazioni degli esercizi

Catalogo di 876 esercizi da [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (pubblico dominio), incluso nell'app (45 KB) con nomi italiani per i 125 più comuni. Ogni esercizio ha due fotogrammi (inizio/fine movimento) scaricati da GitHub e alternati in loop. Se l'esercizio non è nel catalogo o manca la connessione l'animazione semplicemente non compare e il layout si adatta.

### Bilancia Xiaomi

Le bilance Xiaomi trasmettono ogni pesata nel pacchetto di advertising Bluetooth LE: l'app la legge direttamente, **senza app Mi Fit/Zepp Life né account**.

- Mi Smart Scale 2 (XMTZC04HM): peso.
- Mi Body Composition Scale 2 (XMTZC05HM): peso + impedenza → massa grassa, muscolare, acqua, ossa, grasso viscerale e metabolismo basale (stime, servono sesso, età e altezza nel profilo).

Impostazioni → Bilancia → *Cerca bilancia* per memorizzarla, poi Corpo → *Pesati*.

## Formato della scheda

Valori solo numerici, così tutto è tracciabile nei grafici. Esempio completo: [`docs/esempio-scheda.json`](docs/esempio-scheda.json).

```json
{
  "formato": "vibegym",
  "versione": 3,
  "nome": "Push Pull Legs",
  "giorni": [
    {
      "nome": "Push",
      "esercizi": [
        { "nome": "Panca piana", "catalogo": "Barbell_Bench_Press_-_Medium_Grip", "tipo": "ripetizioni", "serie": 4, "ripetizioni": 8, "carico_kg": 60, "recupero_sec": 120 },
        { "nome": "Piramidale", "tipo": "ripetizioni", "serie": 3, "ripetizioni": [12, 10, 8], "carico_kg": [40, 45, 50], "recupero_sec": 90 },
        { "nome": "Plank", "catalogo": "Plank", "tipo": "tempo", "serie": 3, "durata_sec": 45, "carico_kg": 0, "recupero_sec": 60 },
        { "superset": [ { "nome": "Alzate laterali", "ripetizioni": 15, "carico_kg": 8 }, { "nome": "Push down", "ripetizioni": 12, "carico_kg": 20 } ], "serie": 3, "recupero_sec": 75 },
        { "nome": "Tapis roulant", "catalogo": "Running_Treadmill", "tipo": "cardio", "durata_min": 15, "distanza_km": 2 }
      ]
    }
  ]
}
```

Si importano anche i file delle versioni precedenti dell'app.

## Avvio

Requisiti: Node ≥ 22, Xcode **26** (per il Liquid Glass nativo; su iOS < 26 si usa un materiale traslucido equivalente), Android SDK 36.

```sh
npm install
# iOS
bundle install
cd ios && bundle exec pod install && cd ..
npm run ios
# Android
npm run android
```

Dopo l'aggiornamento serve rifare `pod install` (sono cambiate le dipendenze native: rimosso il keychain di GitHub; aggiunti Bluetooth, Liquid Glass, tab bar nativa, notifiche e haptics).

Controlli: `npx tsc --noEmit`, `npm run lint`, `npm test`.

## Build e rilasci automatici

GitHub Actions compila l'APK quando vuoi (pubblicato come pre-release scaricabile dal telefono) e, quando pubblichi una Release `vX.Y.Z`, carica l'AAB firmato su Google Play. Configurazione passo passo: [`docs/RILASCI.md`](docs/RILASCI.md).

## Dati e migrazione

Al primo avvio i dati della versione precedente (schede, storico, pesate, profilo, impostazioni) vengono convertiti automaticamente nel nuovo modello. La sincronizzazione GitHub è stata rimossa: i dati restano sul telefono e si possono esportare/ripristinare da *Impostazioni → Dati e backup*. Se avevi dati solo su GitHub, importa il file della scheda da *Nuova scheda → Importa un file* (lo storico contenuto nel file viene recuperato).

## Struttura

```
src/
  core/        modello dati v3, formattazione italiana, unità, date
  data/        store (zustand) con persistenza per sezione, migrazione legacy, bozze
  catalog/     catalogo esercizi + alias italiani, ricerca e abbinamento
  plan/        formato AI (parse/serialize), prompt, demo, utilità scheda
  workout/     motore allenamento (ordine serie, superset, progressione), timer, azioni
  stats/       metriche (1RM, volume, record), trend, statistiche corpo
  scale/       parser BLE Mi Scale + hook di scansione
  body/        composizione corporea da impedenza
  services/    haptics, suoni, notifiche, file, schermo acceso
  theme/       colori di sistema iOS, tipografia SF, metriche
  ui/          design system (Glass, bottoni, liste, sheet, stepper, grafici…)
  navigation/  stack, tab nativa iOS / tab glass Android, accessorio allenamento
  screens/     schermate
scripts/build-catalog.js   rigenera src/catalog/catalog.json dal dataset
```
