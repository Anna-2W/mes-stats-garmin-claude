#!/usr/bin/env bash
# Construit dist/mes-stats-garmin-claude-<version>.zip, le fichier à envoyer au Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/mes-stats-garmin-claude-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -r "$out" manifest.json background.js collector.js claude-button.js periods.js popup.html popup.js icons
echo "$out"
unzip -l "$out"
