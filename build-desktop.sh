#!/usr/bin/env bash
# Build the desktop (Electron) version of the game.
# This is optional — the game runs fine as a web app.
#
# Usage:
#   ./build-desktop.sh          # Build game + run in Electron
#   ./build-desktop.sh --pack   # Build game + package as distributable

set -euo pipefail
cd "$(dirname "$0")"

# 1. Build the web game
echo "=== Building game ==="
npm run build

# 2. Install Electron dependencies (separate package.json)
if [ ! -d electron/node_modules ]; then
  echo "=== Installing Electron (first time) ==="
  cd electron && npm install && cd ..
fi

# 3. Run or package
if [ "${1:-}" = "--pack" ]; then
  echo "=== Packaging desktop build ==="
  cd electron && npm run build:linux
  echo ""
  echo "✅ Desktop build ready in electron-dist/"
else
  echo "=== Launching Electron ==="
  cd electron && npx electron . --class=LesAiguillesBlanches
fi
