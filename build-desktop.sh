#!/usr/bin/env bash
# Build the desktop (Electron) version of the game.
# This is optional — the game runs fine as a web app.
#
# Usage:
#   ./build-desktop.sh              # Build game + run in Electron
#   ./build-desktop.sh --pack       # Package for current platform (Linux)
#   ./build-desktop.sh --pack-win   # Package for Windows (needs Wine)
#   ./build-desktop.sh --pack-mac   # Package for macOS
#   ./build-desktop.sh --pack-all   # Package for all platforms

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Build the web game
echo "=== Building game ==="
npm run build

# 2. Install Electron dependencies (separate package.json)
if [ ! -d electron/node_modules ]; then
  echo "=== Installing Electron (first time) ==="
  cd electron && npm install && cd ..
fi

# 3. Generate app icon (creates icon.png + icons/ + build/icons/)
echo "=== Generating app icon ==="
cd electron && node generate-icon.cjs && cd ..

# 4. Run or package
case "${1:-}" in
  --pack)
    echo "=== Packaging for Linux ==="
    cd electron && npx electron-builder --linux
    ;;
  --pack-win)
    echo "=== Packaging for Windows ==="
    cd electron && npx electron-builder --win
    ;;
  --pack-mac)
    echo "=== Packaging for macOS ==="
    cd electron && npx electron-builder --mac
    ;;
  --pack-all)
    echo "=== Packaging for all platforms ==="
    cd electron && npx electron-builder --linux --win --mac
    ;;
  "")
    echo "=== Launching Electron ==="
    cd electron && npx electron . --class=LesAiguillesBlanches
    exit 0
    ;;
  *)
    echo "Error: unknown option '$1'" >&2
    echo "Usage: $0 [--pack | --pack-win | --pack-mac | --pack-all]" >&2
    exit 1
    ;;
esac
echo ""
echo "✅ Desktop build(s) ready in electron-dist/"
