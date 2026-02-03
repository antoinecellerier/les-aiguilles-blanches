#!/bin/bash
# Setup script for Les Aiguilles Blanches
# Downloads dependencies and sets up the development environment

set -e

cd "$(dirname "$0")"

echo "=== Setting up Les Aiguilles Blanches ==="

# Download Phaser 3
echo "Downloading Phaser 3..."
mkdir -p js
curl -sL "https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.js" -o js/phaser.js
echo "  Downloaded js/phaser.js"

# Setup Python virtual environment for E2E tests
echo "Setting up Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "Installing test dependencies..."
pip install -q playwright pytest-playwright pytest-xdist pillow

echo "Installing Playwright browsers..."
python -m playwright install chromium firefox

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To play the game:"
echo "  open http://localhost/~antoine/snow-groomer/index.html"
echo ""
echo "To run E2E tests:"
echo "  ./run-tests.sh"
echo ""
