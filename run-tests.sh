#!/bin/bash
# Run Playwright E2E tests for snow-groomer game
# Usage: ./run-tests.sh [pytest-args]
# Examples:
#   ./run-tests.sh                    # Run all tests (headless, parallel)
#   ./run-tests.sh --headed           # Run with visible browser (sequential)
#   ./run-tests.sh -k "test_skip"     # Run specific tests
#   ./run-tests.sh -n 4               # Run with 4 parallel workers

cd "$(dirname "$0")"
source .venv/bin/activate

# Default to parallel execution unless --headed is specified
if [[ "$*" == *"--headed"* ]]; then
    pytest "$@"
else
    pytest -n auto "$@"
fi
