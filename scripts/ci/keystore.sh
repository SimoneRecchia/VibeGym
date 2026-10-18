#!/usr/bin/env bash
# Decodes the Play upload key from the ANDROID_KEYSTORE_BASE64 secret and
# points Gradle at it. Without the secret, test builds fall back to the debug
# key; release builds (REQUIRED=1) fail with an explanation.
set -euo pipefail

if [[ -z "${KEYSTORE_BASE64:-}" ]]; then
  if [[ "${REQUIRED:-0}" == "1" ]]; then
    echo "::error::Manca il secret ANDROID_KEYSTORE_BASE64. Vedi docs/RILASCI.md, sezione «Chiave di firma»."
    exit 1
  fi
  echo "::warning::Nessuna chiave di firma configurata: APK firmato con la chiave di debug (installabile, non accettato dal Play Store)."
  exit 0
fi

FILE="$RUNNER_TEMP/upload.keystore"
echo "$KEYSTORE_BASE64" | base64 --decode > "$FILE"
echo "ORG_GRADLE_PROJECT_VIBEGYM_UPLOAD_STORE_FILE=$FILE" >> "$GITHUB_ENV"
echo "Chiave di firma pronta."
