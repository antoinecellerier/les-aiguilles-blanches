#!/bin/bash
# Run tests for snow-groomer game
# Usage: ./run-tests.sh [pytest-args]
# Examples:
#   ./run-tests.sh                    # Run all tests (headless, parallel, both browsers)
#   ./run-tests.sh --headed           # Run with visible browser (sequential)
#   ./run-tests.sh -k "test_skip"     # Run specific tests
#   ./run-tests.sh --browser chromium # Single browser only

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
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo ""
    echo "=== Starting dev server ==="
    npm run dev &
    DEV_SERVER_PID=$!
    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "Dev server ready"
            break
        fi
        sleep 1
    done
fi

# Cleanup function
cleanup() {
    if [ -n "$DEV_SERVER_PID" ]; then
        echo "Stopping dev server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null
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
