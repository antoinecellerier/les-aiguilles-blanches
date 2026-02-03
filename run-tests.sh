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

# Default to parallel execution unless --headed is specified
if [[ "$*" == *"--headed"* ]]; then
    pytest tests/e2e $BROWSER_ARGS "$@"
else
    pytest tests/e2e $BROWSER_ARGS "$@"
fi
