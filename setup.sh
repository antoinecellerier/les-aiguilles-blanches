#!/bin/bash
# Setup script for Les Aiguilles Blanches
# Downloads dependencies and sets up the development environment
#
# Usage: ./setup.sh [browsers...]
#   ./setup.sh                    # Install chromium + firefox (default)
#   ./setup.sh chromium           # Install chromium only
#   ./setup.sh chromium firefox webkit  # Install all three
#
# Set PLAYWRIGHT_WITH_DEPS=1 to install system dependencies (for CI):
#   PLAYWRIGHT_WITH_DEPS=1 ./setup.sh chromium

set -e

cd "$(dirname "$0")"

echo "=== Setting up Les Aiguilles Blanches ==="

BROWSERS=("${@:-chromium firefox}")

# Setup Python virtual environment for E2E tests
echo "Setting up Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "Installing test dependencies..."
pip install -q playwright pytest-playwright pytest-xdist pillow

echo "Installing Playwright browsers: ${BROWSERS[*]}..."
if [ "${PLAYWRIGHT_WITH_DEPS:-0}" = "1" ]; then
    python -m playwright install --with-deps "${BROWSERS[@]}"
else
    python -m playwright install "${BROWSERS[@]}"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To play the game:"
echo "  open http://localhost/~antoine/snow-groomer/index.html"
echo ""
echo "To run E2E tests:"
echo "  ./run-tests.sh"
echo ""
