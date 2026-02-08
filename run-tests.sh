#!/bin/bash
# Run tests for snow-groomer game
# Usage: ./run-tests.sh [pytest-args]
# Examples:
#   ./run-tests.sh                    # Run all tests (headless, parallel, both browsers)
#   ./run-tests.sh --headed           # Run with visible browser (sequential)
#   ./run-tests.sh -k "test_skip"     # Run specific tests
#   ./run-tests.sh --browser chromium # Single browser only
#   ./run-tests.sh --smart            # Only run tests affected by uncommitted changes

set -euo pipefail
cd "$(dirname "$0")"

# Check for --smart flag and strip it from args
SMART_MODE=false
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--smart" ]; then
        SMART_MODE=true
    else
        ARGS+=("$arg")
    fi
done
set -- "${ARGS[@]+"${ARGS[@]}"}"

# --- Smart test selection ---
# Uses git diff to select only tests affected by uncommitted changes.
# Unit tests: vitest --changed traces the import graph automatically.
# E2E tests: file-level selection based on which source files changed.
SMART_UNIT_ARGS=()
SMART_E2E_FILES=()
SKIP_UNIT=false
SKIP_E2E=false

if [ "$SMART_MODE" = true ]; then
    echo "=== Smart mode: selecting tests from uncommitted changes ==="
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)

    if [ -z "$CHANGED_FILES" ]; then
        echo "No uncommitted changes detected — nothing to test."
        exit 0
    fi

    echo "Changed files:"
    echo "$CHANGED_FILES" | sed 's/^/  /'

    # Unit tests: use vitest --changed HEAD
    SMART_UNIT_ARGS=(--changed HEAD)

    # E2E selection
    HAS_SRC=false
    HAS_CONFTEST=false
    while IFS= read -r f; do
        case "$f" in
            src/*) HAS_SRC=true ;;
            tests/e2e/conftest.py) HAS_CONFTEST=true ;;
            tests/e2e/test_*.py) SMART_E2E_FILES+=("$f") ;;
        esac
    done <<< "$CHANGED_FILES"

    if [ "$HAS_CONFTEST" = true ]; then
        # Core test infrastructure changed — run all E2E
        SMART_E2E_FILES=()
        echo "  → conftest.py changed: running all E2E tests"
    elif [ "$HAS_SRC" = true ]; then
        # Always include the catch-all integration suite
        SMART_E2E_FILES+=("tests/e2e/test_navigation.py")

        # Include specialized test files when their source dependencies changed
        while IFS= read -r f; do
            case "$f" in
                src/utils/gamepad*.ts)       SMART_E2E_FILES+=("tests/e2e/test_gamepad.py") ;;
                src/scenes/SettingsScene.ts)  SMART_E2E_FILES+=("tests/e2e/test_settings_ui.py") ;;
                src/utils/touchDetect.ts)     SMART_E2E_FILES+=("tests/e2e/test_touch_controls.py") ;;
                src/scenes/HUDScene.ts)       SMART_E2E_FILES+=("tests/e2e/test_touch_controls.py") ;;
                src/scenes/DialogueScene.ts)  SMART_E2E_FILES+=("tests/e2e/test_dialogue_speakers.py") ;;
                src/utils/characterPortraits.ts) SMART_E2E_FILES+=("tests/e2e/test_dialogue_speakers.py") ;;
            esac
        done <<< "$CHANGED_FILES"
    fi

    # Deduplicate E2E file list
    if [ ${#SMART_E2E_FILES[@]} -gt 0 ]; then
        readarray -t SMART_E2E_FILES < <(printf '%s\n' "${SMART_E2E_FILES[@]}" | sort -u)
    fi

    # Determine what to skip
    if ! echo "$CHANGED_FILES" | grep -qE '^(src/|tests/unit-js/)'; then
        SKIP_UNIT=true
        echo "  → No src/ or unit test changes: skipping unit tests"
    fi

    if [ "$HAS_CONFTEST" = false ] && [ ${#SMART_E2E_FILES[@]} -eq 0 ]; then
        SKIP_E2E=true
        echo "  → No src/ or E2E test changes: skipping E2E tests"
    else
        if [ "$HAS_CONFTEST" = true ]; then
            echo "  → E2E: all files (conftest changed)"
        else
            echo "  → E2E: ${SMART_E2E_FILES[*]}"
        fi
    fi
    echo ""
fi

# --- Run unit tests ---
if [ "$SKIP_UNIT" = false ]; then
    echo "=== Running unit tests (Vitest) ==="
    npx vitest run "${SMART_UNIT_ARGS[@]}"
    UNIT_EXIT=$?

    if [ $UNIT_EXIT -ne 0 ]; then
        echo "Unit tests failed!"
        exit $UNIT_EXIT
    fi
else
    echo "=== Skipping unit tests (no relevant changes) ==="
fi

# --- Run E2E tests ---
if [ "$SKIP_E2E" = false ]; then
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

    # Build E2E target: specific files in smart mode, or full directory
    if [ "$SMART_MODE" = true ] && [ ${#SMART_E2E_FILES[@]} -gt 0 ]; then
        E2E_TARGET=("${SMART_E2E_FILES[@]}")
    else
        E2E_TARGET=("tests/e2e")
    fi

    # Headed mode: run sequentially (override -n auto from pytest.ini)
    if [[ "$*" == *"--headed"* ]]; then
        pytest "${E2E_TARGET[@]}" $BROWSER_ARGS -n 0 "$@"
    else
        pytest "${E2E_TARGET[@]}" $BROWSER_ARGS "$@"
    fi
else
    echo ""
    echo "=== Skipping E2E tests (no relevant changes) ==="
fi
