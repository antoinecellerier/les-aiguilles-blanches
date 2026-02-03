#!/bin/bash
# Run tests for snow-groomer game
# Usage: ./run-tests.sh [pytest-args]
# Examples:
#   ./run-tests.sh                    # Run all tests (headless, parallel)
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

# Default to parallel execution unless --headed is specified
if [[ "$*" == *"--headed"* ]]; then
    pytest tests/e2e "$@"
else
    pytest tests/e2e -n auto "$@"
fi
