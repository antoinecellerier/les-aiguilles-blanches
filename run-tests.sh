#!/bin/bash
# Run tests for snow-groomer game
# Usage: ./run-tests.sh [pytest-args]
# Examples:
#   ./run-tests.sh                    # Run all tests (headless, parallel, both browsers)
#   ./run-tests.sh --headed           # Run with visible browser (sequential)
#   ./run-tests.sh -k "test_skip"     # Run specific tests
#   ./run-tests.sh --browser chromium # Single browser only

set -euo pipefail
cd "$(dirname "$0")"

# Run Node.js unit tests first (fast)
echo "=== Running unit tests (Vitest) ==="
npm test
UNIT_EXIT=$?

if [ $UNIT_EXIT -ne 0 ]; then
    echo "Unit tests failed!"
    exit $UNIT_EXIT
fi

# Start dev server if not already running
DEV_SERVER_PID=""
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Dev server already running on port 3000"
else
    # Kill any stale (non-functional) process on port 3000
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "Killing stale process on port 3000..."
        kill $(lsof -ti:3000) 2>/dev/null || true
        sleep 1
    fi

    echo ""
    echo "=== Starting dev server ==="
    npm run dev &
    DEV_SERVER_PID=$!

    # Wait for server to be ready (with timeout)
    SERVER_READY=false
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "Dev server ready (PID: $DEV_SERVER_PID)"
            SERVER_READY=true
            break
        fi
        sleep 1
    done

    if [ "$SERVER_READY" = false ]; then
        echo "ERROR: Dev server failed to start within 30 seconds!"
        kill $DEV_SERVER_PID 2>/dev/null || true
        exit 1
    fi
fi

# Cleanup function — only kill server if we started it
cleanup() {
    if [ -n "$DEV_SERVER_PID" ]; then
        echo "Stopping dev server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Run E2E tests
echo ""
echo "=== Running E2E tests (Playwright) ==="
source .venv/bin/activate

# Check if --browser was explicitly provided
if [[ "$*" == *"--browser"* ]]; then
    BROWSER_ARGS=""
else
    # Default to both browsers
    BROWSER_ARGS="--browser chromium --browser firefox"
fi

# Headed mode: run sequentially (override -n auto from pytest.ini)
if [[ "$*" == *"--headed"* ]]; then
    pytest tests/e2e $BROWSER_ARGS -n 0 "$@"
else
    pytest tests/e2e $BROWSER_ARGS "$@"
fi
