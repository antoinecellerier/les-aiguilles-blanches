#!/usr/bin/env bash
# Build the desktop (Tauri) version of the game.
# Produces a lightweight native-webview app (~25 MB vs ~340 MB Electron).
#
# Usage:
#   ./build-tauri.sh              # Build game + run in Tauri dev mode
#   ./build-tauri.sh --build      # Production build for current platform
#   ./build-tauri.sh --debug      # Debug build (faster, unoptimized Rust)

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

case "${1:-}" in
  --build)
    echo "=== Building production release ==="
    npm run build
    cargo tauri build
    echo ""
    echo "✅ Tauri build ready in src-tauri/target/release/bundle/"
    ;;
  --debug)
    echo "=== Building debug release ==="
    npm run build
    cargo tauri build --debug
    ;;
  "")
    echo "=== Starting Tauri dev mode ==="
    echo "    (start the dev server first with ./dev.sh)"
    cargo tauri dev
    ;;
  *)
    echo "Error: unknown option '$1'" >&2
    echo "Usage: $0 [--build | --debug]" >&2
    exit 1
    ;;
esac
