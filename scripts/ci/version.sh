#!/usr/bin/env bash
# Version info for CI builds, exported to $GITHUB_ENV.
#  - versionCode: commits on HEAD + 100 → always increasing, shared by every
#    workflow (a test APK never "downgrades" a release and vice versa).
#  - versionName: the release tag (v2.1.0 → 2.1.0), otherwise
#    <package.json version>-build.<commits>.
# Also writes src/buildInfo.json, shown in Impostazioni.
set -euo pipefail

COUNT=$(git rev-list --count HEAD)
CODE=$((COUNT + 100))
SHA=$(git rev-parse --short HEAD)
BASE=$(node -p "require('./package.json').version")

if [[ "${GITHUB_REF_TYPE:-}" == "tag" && "${GITHUB_REF_NAME:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  NAME="${GITHUB_REF_NAME#v}"
else
  NAME="${BASE}-build.${COUNT}"
fi

{
  echo "APP_VERSION_CODE=$CODE"
  echo "APP_VERSION_NAME=$NAME"
  echo "APP_COMMIT=$SHA"
} >> "$GITHUB_ENV"

printf '{ "version": "%s", "build": "%s", "commit": "%s" }\n' "$NAME" "$CODE" "$SHA" > src/buildInfo.json
echo "Versione $NAME (codice $CODE, commit $SHA)"
