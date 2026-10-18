# VibeGym

App per la palestra in React Native (iOS e Android), ridisegnata seguendo il design system **Liquid Glass** di Apple (iOS 26). Tutti i dati restano sul telefono.

## Le tre sezioni

| Progressi (sinistra) | **Scheda (centro, home)** | Nutrizione (destra) |
| --- | --- | --- |
| Trend del peso in cima, riepilogo del mese, attività delle ultime 12 settimane, alimentazione degli ultimi 7 giorni, **serie per muscolo a settimana**, record recenti, trend per esercizio (1RM stimato, carico, volume, ripetizioni, durata), storico completo | Saluto, settimana, **prossimo allenamento in un tocco**, giorni della scheda, editor, schede multiple | Diario dei pasti, calorie rimaste, macro, **consumo stimato del giorno**, scanner di codici a barre, etichette e piatti |

In alto a destra, su ogni sezione, l'avatar apre **profilo e impostazioni**: lì trovi anche **peso e corpo** (media mobile, obiettivo, BMI, composizione dalla bilancia Xiaomi, misure).

In **Profilo → Integrazioni** trovi tutto ciò che si collega: Health Connect / Salute (e gli smartwatch che ci sincronizzano), la bilancia Xiaomi via Bluetooth, le altre bilance tramite la loro app e la fascia cardio.

Con **Health Connect** o **Salute** collegati, VibeGym completa altezza, età e sesso se nel profilo mancano, importa le pesate delle altre bilance (Withings, Renpho, Eufy, Garmin, Fitbit, Zepp, Huawei, Samsung…) e mostra in Progressi il **recupero**: sonno della notte e battito a riposo, con un avviso sulla scheda se hai dormito poco.

### Nutrizione

- **Obiettivo calorie** automatico (dal consumo del giorno o da quello abituale, per dimagrire, mantenere o prendere massa a 0,25–1 kg a settimana) oppure fisso; **macro** in percentuale (preset bilanciata, sportiva, iperproteica, low carb) o in grammi, con le proteine per kg.
- **Consumo stimato**: metabolismo basale (Mifflin-St Jeor o quello della bilancia) + passi + allenamenti. Con **Health Connect** (Android: Samsung Health, Google/Fitbit, Garmin, Xiaomi, Zepp, Polar, Oura…) o **Salute** (iOS) usa i dati veri del telefono o dello smartwatch, senza contare due volte.
- **266 alimenti comuni** con nomi italiani e porzioni casalinghe (fetta, cucchiaio, vasetto…), anche offline, più i **prodotti confezionati** di Open Food Facts.
- **Scanner**: codice a barre dal vivo; in modalità foto legge il codice anche se la confezione è sullo sfondo del piatto, il nome del prodotto sull'etichetta e riconosce frutta, verdura e piatti comuni. Tutto sul telefono: su Android ML Kit con il modello EfficientNet-Lite2 incluso nell'app (Google / MediaPipe, Apache 2.0, circa 7 MB) per frutta, verdura e piatti; su iOS il classificatore di Apple Vision. Se riconosce solo «frutta» o «verdura» propone l'elenco della categoria. La quantità si inserisce in grammi, porzioni o frazioni della confezione (¼, ½, ¾).
- Alimenti propri dall'etichetta (legati al codice a barre: la volta dopo li trova subito), recenti, preferiti, copia di un pasto su oggi.

### Pesata

Ogni N giorni, settimane o mesi (Profilo → Pesata). Quando è scaduta, all'apertura dell'app compare un promemoria che puoi chiudere o disattivare con «Non mostrarlo più»; c'è anche una notifica dal giorno della scadenza finché non ti pesi.

### Allenamento live

- Tutta la giornata in un'unica lista, come una scheda di carta: ogni esercizio è una card con le sue serie (tocca la riga quando l'hai fatta, tocca peso o ripetizioni per cambiarli) e un bottone per la serie successiva. Il colore del giorno accompagna tutta la sessione; in alto l'anello dell'avanzamento, in basso riepilogo e fine.
- Il bottone registra la serie successiva con i valori già compilati (quelli dell'ultima volta): **un tocco per serie**.
- Il recupero parte da solo, flotta sopra il bottone (−15 s / +15 s / salta) e si ingrandisce a schermo intero. Con il telefono bloccato arriva una notifica a fine recupero.
- Supportati: ripetizioni con carico, corpo libero e zavorra, **a tempo** (plank, isometrie: countdown e registrazione automatica), **cardio** (durata e distanza), **superset/circuiti** (serie alternate, recupero dopo il giro), **piramidali** (valori diversi per serie), serie a cedimento.
- Suggerimento di progressione: se l'ultima volta hai completato tutte le serie, propone +2,5 kg (metà per gli esercizi di isolamento).
- **Fascia cardio Bluetooth** (Polar, Garmin, Wahoo, Coospo o lo smartwatch che trasmette il battito): battito dal vivo colorato per zona, a fine sessione media, massimo, grafico e calorie dal battito (Keytel), usate nel consumo del giorno.
- Record personali a fine allenamento; l'allenamento in corso sopravvive alla chiusura dell'app. Su iOS 26 resta visibile come accessorio della tab bar (stile "in riproduzione" di Musica).

### Schede con l'AI

L'app non chiama nessuna AI: prepara un **prompt** completo (formato, regole, esempio e la lista degli esercizi con animazione) da incollare in ChatGPT, Gemini o un'altra AI, poi importa la risposta (appunti, file `.json` o testo).

1. **Crea**: questionario (obiettivi, livello, giorni, durata, attrezzatura, infortuni) → scheda su misura.
2. **Converti**: allega foto/PDF/testo della tua scheda → stessa scheda nel formato dell'app, opzionalmente migliorata.
3. **Modifica**: la scheda attuale + i tuoi **risultati reali** → l'AI aggiorna carichi e struttura come chiedi. Lo storico non si perde.

Il parser è tollerante (blocchi markdown, testo attorno, commenti, virgole finali, `"8-10"`, `"60 kg"`) e mostra cosa ha corretto prima di salvare. Si può anche creare la scheda a mano scegliendo gli esercizi dal catalogo.

### Animazioni degli esercizi

Catalogo di 876 esercizi da [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (pubblico dominio), incluso nell'app (45 KB) con nomi italiani per i 125 più comuni. I 222 esercizi più usati hanno le illustrazioni di [RepDB](https://repdb.co) (stile uniforme, posizione iniziale e di massima contrazione che si alternano; gratuite per l'uso nell'app con il credito «Exercise data by RepDB», caricate dal pacchetto npm `@repdb/exercises` tramite jsDelivr/unpkg); gli altri alternano le due foto di free-exercise-db. Se l'esercizio non ha media o manca la connessione l'animazione non compare e il layout si adatta.

### Bilancia Xiaomi

Le bilance Xiaomi trasmettono ogni pesata nel pacchetto di advertising Bluetooth LE: l'app la legge direttamente, **senza app Mi Fit/Zepp Life né account**.

- Mi Smart Scale 2 (XMTZC04HM): peso.
- Mi Body Composition Scale 2 (XMTZC05HM): peso + impedenza → massa grassa, muscolare, acqua, ossa, grasso viscerale e metabolismo basale (stime, servono sesso, età e altezza nel profilo).

Profilo → Bilancia → *Cerca bilancia* per memorizzarla, poi *Pesati* (dal profilo o dal promemoria).

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

Dopo l'aggiornamento serve rifare `pod install` (dipendenze native nuove: fotocamera, Salute, modulo `vibe-vision`).

**Salute su iOS**: in Xcode → target VibeGym → *Signing & Capabilities* → *+ Capability* → **HealthKit** (serve un account Apple Developer). Senza la capability l'app funziona, ma il collegamento a Salute resta non disponibile.

Controlli: `npx tsc --noEmit`, `npm run lint`, `npm test`.

### Icona

Il manubrio, generato da `scripts/build-icon.js` in 9 colori (blu predefinito); il colore si sceglie in *Impostazioni → Aspetto → Icona dell'app*. Dopo una modifica allo script: `node scripts/build-icon.js`.

- **iOS 26**: `ios/VibeGym/AppIcon.icon` e le icone alternative `AppIcon-<colore>.icon` (formato Icon Composer) con il simbolo su un livello di vetro: riflessi, rifrazione e le versioni chiara, scura e a tinta le genera il sistema; Xcode ricava anche le icone per iOS precedenti. Il cambio usa le icone alternative di iOS (il sistema mostra un avviso).
- **Android**: icone adattive vettoriali con livello monocromatico (icone a tema, Android 13+); un `activity-alias` per colore nel manifest, il modulo `vibe-app-icon` attiva quello scelto. Il launcher può impiegare qualche secondo ad aggiornare l'icona.
- **Play Store**: `docs/icon/play-store.png` (512 × 512).

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
  nutrition/   alimenti (generic.json), Open Food Facts, consumo e obiettivi, foto
  services/    haptics, suoni, notifiche, file, schermo acceso, Health Connect / Salute
  theme/       colori di sistema iOS, tipografia SF, metriche
  ui/          design system (Glass, bottoni, liste, sheet, stepper, grafici…)
  navigation/  stack, tab nativa iOS / tab glass Android, accessorio allenamento
  screens/     schermate
modules/vibe-vision/       modulo nativo: codici a barre, testo e cibi in una foto (ML Kit / Vision)
modules/vibe-app-icon/     modulo nativo: colore dell'icona sulla schermata Home
scripts/build-catalog.js   rigenera src/catalog/catalog.json dal dataset
scripts/build-foods.js     rigenera src/nutrition/generic.json (USDA via tempo-food-db)
scripts/build-media-map.js abbina gli esercizi alle illustrazioni di RepDB
scripts/build-icon.js      icona dell'app nei vari colori (iOS Icon Composer, Android adattiva, Play Store)
```
