#!/usr/bin/env bash
# Capture documentation screenshots and Open Graph image using Playwright.
# Requires: dev server running (./dev.sh), Python venv with Playwright.
#
# Usage:
#   scripts/capture-screenshots.sh          # Capture all screenshots
#   scripts/capture-screenshots.sh --menu   # Capture only menu screenshot
#   scripts/capture-screenshots.sh --og     # Capture only OG image

set -euo pipefail
cd "$(dirname "$0")/.."

# Load port from .env.local
PORT="${PORT:-3000}"
[ -f .env.local ] && source .env.local

# Check dev server
if ! curl -s -o /dev/null "http://localhost:${PORT}/"; then
  echo "❌ Dev server not running on port ${PORT}. Start with: ./dev.sh"
  exit 1
fi

source .venv/bin/activate
python "$(dirname "$0")/scripts/capture_screenshots.py" --port "${PORT}" "$@"
