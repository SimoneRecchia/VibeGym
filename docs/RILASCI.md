# Build e rilasci automatici

Quattro workflow GitHub Actions in `.github/workflows/`:

| Workflow | Quando parte | Cosa fa |
| --- | --- | --- |
| **CI** (`ci.yml`) | a ogni push e pull request | typecheck, lint, test |
| **Android · Verifica build** (`android-check.yml`) | quando cambiano dipendenze native o file Android | compila l'APK per controllare che la parte nativa funzioni (artifact per 7 giorni) |
| **Android · APK di prova** (`android-apk.yml`) | a ogni aggiornamento di `main`, o quando lo lanci tu | compila l'APK e lo pubblica come *pre-release* scaricabile |
| **Android · Release Play Store** (`android-release.yml`) | quando pubblichi una *Release* (tag `v2.1.0`) | test, AAB firmato caricato su Google Play, APK e AAB allegati alla release |

## APK di prova (subito, senza configurare niente)

1. Parte da solo a ogni aggiornamento di `main`. Per lanciarlo a mano: GitHub → **Actions** → *Android · APK di prova* → **Run workflow** (scegli il branch, note facoltative).
2. Dopo circa 15 minuti trovi in **Releases** la pre-release *VibeGym 2.0.0-build.N (prova)*.
3. Apri la pagina dal telefono, scarica il file `.apk` e installalo (consenti le *app da fonti sconosciute* la prima volta).

Finché non configuri la chiave di firma (sotto), l'APK è firmato con la chiave di debug: si installa senza problemi, ma il Play Store non lo accetta. Quando passerai alla chiave vera dovrai disinstallare una volta la versione di prova, perché Android non aggiorna un'app firmata con una chiave diversa.

## Chiave di firma (una volta sola)

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore vibegym-upload.keystore \
  -alias vibegym -keyalg RSA -keysize 2048 -validity 10000
base64 -i vibegym-upload.keystore | pbcopy   # macOS; su Linux: base64 -w0 vibegym-upload.keystore
```

In GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valore |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | il keystore in base64 (copiato sopra) |
| `ANDROID_KEYSTORE_PASSWORD` | la password del keystore |
| `ANDROID_KEY_ALIAS` | `vibegym` |
| `ANDROID_KEY_PASSWORD` | la password della chiave |

Conserva il file `.keystore` e le password fuori dal repository (password manager). Con *Play App Signing* è Google a custodire la chiave definitiva dell'app; questa è la *chiave di caricamento* e, se la perdi, si può far reimpostare dal Play Console.

Per compilare in locale con la stessa chiave, aggiungi a `~/.gradle/gradle.properties`:

```properties
VIBEGYM_UPLOAD_STORE_FILE=/percorso/vibegym-upload.keystore
VIBEGYM_UPLOAD_STORE_PASSWORD=…
VIBEGYM_UPLOAD_KEY_ALIAS=vibegym
VIBEGYM_UPLOAD_KEY_PASSWORD=…
```

## Google Play (quando vorrai pubblicare)

1. Account sviluppatore Google Play (25 $ una tantum) e nuova app nel Play Console.
2. **Package name**: l'app usa `com.vibegym`, che potrebbe essere già occupato sul Play Store. Se serve, cambia `applicationId` in `android/app/build.gradle` (es. `com.simonerecchia.vibegym`) e `packageName` in `android-release.yml` **prima** del primo caricamento: dopo non si può più cambiare.
3. Il **primo** AAB va caricato a mano (Google non permette di creare l'app via API): pubblica una release su GitHub, scarica l'`.aab` allegato e caricalo nel Play Console (traccia *Test interno*).
4. Accesso automatico: Google Cloud Console → *IAM → Service account* → crea un account e una chiave JSON. Nel Play Console → *Utenti e autorizzazioni* → invita l'email del service account con i permessi di rilascio.
5. Secret `PLAY_SERVICE_ACCOUNT_JSON` = contenuto del file JSON.
6. Facoltativo, in *Variables*: `PLAY_TRACK` (`internal` predefinito, poi `alpha`, `beta`, `production`) e `PLAY_STATUS` (`completed` predefinito; usa `draft` finché l'app non è approvata la prima volta).

## Pubblicare una versione

1. GitHub → **Releases → Draft a new release**.
2. Tag nuovo nel formato `vMAJOR.MINOR.PATCH` (es. `v2.1.0`), titolo e note: le note diventano il testo *Novità* del Play Store (massimo 500 caratteri).
3. **Publish release** (non spuntare *pre-release*).

Il workflow esegue i test, compila, carica su Google Play nella traccia scelta e allega `VibeGym-2.1.0.apk` e `.aab` alla release. Se un test fallisce, non pubblica niente.

### Numeri di versione

- `versionName` = il tag (`v2.1.0` → `2.1.0`); per le build di prova `2.0.0-build.N`.
- `versionCode` = numero di commit + 100: cresce sempre ed è condiviso da tutti i workflow, quindi un APK di prova non "torna indietro" rispetto a una release.
- La versione compare in fondo a *Impostazioni*.

## iOS (in futuro)

Stesso schema con TestFlight: un workflow su runner macOS con fastlane, certificati gestiti da `fastlane match` e una chiave API di App Store Connect. Serve l'Apple Developer Program (99 €/anno).

## Costi

Sui repository privati GitHub include 2.000 minuti/mese di Actions nel piano gratuito; una build Android richiede circa 15–20 minuti, la CI circa 2.
