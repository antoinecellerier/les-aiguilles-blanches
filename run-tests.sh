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

# Load local overrides (e.g. PORT=3001)
[ -f .env.local ] && export $(grep -v '^#' .env.local | xargs)

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
UNMAPPED_SRC=()
SKIP_UNIT=false
SKIP_E2E=false

if [ "$SMART_MODE" = true ]; then
    echo "=== Smart mode: selecting tests from uncommitted changes ==="
    CHANGED_FILES=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u || true)

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
                src/utils/touchDetect.ts)     SMART_E2E_FILES+=("tests/e2e/test_touch_controls.py" "tests/e2e/test_resize_touch.py") ;;
                src/scenes/HUDScene.ts)       SMART_E2E_FILES+=("tests/e2e/test_touch_controls.py" "tests/e2e/test_resize_touch.py") ;;
                src/scenes/DialogueScene.ts)  SMART_E2E_FILES+=("tests/e2e/test_dialogue_speakers.py")
                                             SMART_E2E_FILES+=("tests/e2e/test_dialogue.py" "tests/e2e/test_resize_touch.py") ;;
                src/utils/characterPortraits.ts) SMART_E2E_FILES+=("tests/e2e/test_dialogue_speakers.py") ;;
                src/scenes/GameScene.ts)     SMART_E2E_FILES+=("tests/e2e/test_gameplay.py")
                                             SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py" "tests/e2e/test_resize_touch.py") ;;
                src/utils/resizeManager.ts)  SMART_E2E_FILES+=("tests/e2e/test_resize_touch.py") ;;
                src/scenes/PauseScene.ts)    SMART_E2E_FILES+=("tests/e2e/test_pause_menu.py") ;;
                src/scenes/LevelCompleteScene.ts) SMART_E2E_FILES+=("tests/e2e/test_level_complete.py") ;;
                src/scenes/CreditsScene.ts)  SMART_E2E_FILES+=("tests/e2e/test_level_complete.py") ;;
                src/scenes/MenuScene.ts)     SMART_E2E_FILES+=("tests/e2e/test_scene_layering.py" "tests/e2e/test_volume_indicator.py" "tests/e2e/test_level_select.py") ;;
                src/scenes/LevelSelectScene.ts) SMART_E2E_FILES+=("tests/e2e/test_level_select.py") ;;
                src/scenes/ContractsScene.ts) SMART_E2E_FILES+=("tests/e2e/test_daily_runs.py") ;;
                src/scenes/SkiRunScene.ts)   SMART_E2E_FILES+=("tests/e2e/test_ski_run.py") ;;
                src/systems/ParkFeatureSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_ski_run.py") ;;
                src/utils/skiSprites.ts)     SMART_E2E_FILES+=("tests/e2e/test_ski_run.py") ;;
                src/utils/skiRunState.ts)    SMART_E2E_FILES+=("tests/e2e/test_ski_run.py") ;;
                src/config/gameConfig.ts)    SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py" "tests/e2e/test_resize_touch.py") ;;
                src/config/levels.ts)        SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py") ;;
                src/utils/keyboardLayout.ts) SMART_E2E_FILES+=("tests/e2e/test_key_hints.py") ;;
                src/systems/WeatherSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py") ;;
                src/systems/WildlifeSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py") ;;
                src/utils/accessibility.ts)  SMART_E2E_FILES+=("tests/e2e/test_accessibility.py" "tests/e2e/test_accessibility_full.py") ;;
                src/scenes/BootScene.ts)     SMART_E2E_FILES+=("tests/e2e/test_performance.py") ;;
                src/config/storageKeys.ts)   SMART_E2E_FILES+=("tests/e2e/test_settings_ui.py") ;;
                src/utils/cameraCoords.ts)   SMART_E2E_FILES+=("tests/e2e/test_resize_touch.py") ;;
                src/config/locales/*.ts|src/config/localization.ts) SMART_E2E_FILES+=("tests/e2e/test_dialogue.py" "tests/e2e/test_dialogue_speakers.py") ;;
                src/systems/AudioSystem.ts|src/systems/*Sounds.ts|src/systems/MusicSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_volume_indicator.py") ;;
                src/systems/PisteRenderer.ts|src/systems/ObstacleBuilder.ts) SMART_E2E_FILES+=("tests/e2e/test_gameplay.py" "tests/e2e/test_level_mechanics.py") ;;
                src/systems/HazardSystem.ts|src/systems/LevelGeometry.ts|src/systems/WinchSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py") ;;
                src/systems/SlalomGateSystem.ts) SMART_E2E_FILES+=("tests/e2e/test_ski_run.py") ;;
                src/systems/MenuTerrainRenderer.ts|src/systems/MenuWildlifeController.ts) SMART_E2E_FILES+=("tests/e2e/test_scene_layering.py") ;;
                src/systems/GamepadDiagnostic.ts) SMART_E2E_FILES+=("tests/e2e/test_gamepad.py") ;;
                src/systems/ContractSession.ts|src/systems/LevelGenerator.ts) SMART_E2E_FILES+=("tests/e2e/test_daily_runs.py") ;;
                src/utils/storage.ts|src/utils/fullscreen.ts) SMART_E2E_FILES+=("tests/e2e/test_settings_ui.py") ;;
                src/utils/gameProgress.ts)   SMART_E2E_FILES+=("tests/e2e/test_level_complete.py" "tests/e2e/test_navigation.py") ;;
                src/utils/sceneTransitions.ts|src/utils/menuButtonNav.ts) SMART_E2E_FILES+=("tests/e2e/test_navigation.py" "tests/e2e/test_level_select.py") ;;
                src/utils/overlayManager.ts) SMART_E2E_FILES+=("tests/e2e/test_pause_menu.py") ;;
                src/utils/focusNavigator.ts) SMART_E2E_FILES+=("tests/e2e/test_settings_ui.py" "tests/e2e/test_accessibility.py") ;;
                src/utils/keybindingManager.ts) SMART_E2E_FILES+=("tests/e2e/test_key_hints.py") ;;
                src/utils/renderThrottle.ts) SMART_E2E_FILES+=("tests/e2e/test_performance.py") ;;
                src/utils/animalSprites.ts|src/utils/animalTracks.ts|src/utils/foxBehavior.ts) SMART_E2E_FILES+=("tests/e2e/test_level_mechanics.py") ;;
                src/utils/bonusObjectives.ts) SMART_E2E_FILES+=("tests/e2e/test_level_complete.py") ;;
                # Files that don't need E2E mapping (type defs, env shims, infra-only)
                src/types/*|src/vite-env.d.ts|src/setup.ts|src/main.ts|src/config/theme.ts|src/utils/updateCheck.ts) ;;
                src/*.ts)
                    UNMAPPED_SRC+=("$f") ;;
            esac
        done <<< "$CHANGED_FILES"

        if [ ${#UNMAPPED_SRC[@]} -gt 0 ]; then
            echo ""
            echo "ERROR: Source file(s) with no --smart E2E mapping:"
            printf '  %s\n' "${UNMAPPED_SRC[@]}"
            echo "Add a case in run-tests.sh (search SMART_E2E_FILES) or add to the"
            echo "no-mapping exclusion list if no E2E test applies."
            exit 1
        fi
    fi

    # Deduplicate E2E file list
    if [ ${#SMART_E2E_FILES[@]} -gt 0 ]; then
        readarray -t SMART_E2E_FILES < <(printf '%s\n' "${SMART_E2E_FILES[@]}" | sort -u)
    fi

    # Validate: every E2E test file on disk must be known to the selection logic.
    # This catches new test files that haven't been added to the mapping above.
    KNOWN_E2E_FILES="test_navigation.py test_gamepad.py test_settings_ui.py test_touch_controls.py test_dialogue_speakers.py test_gameplay.py test_dialogue.py test_pause_menu.py test_level_complete.py test_scene_layering.py test_accessibility.py test_accessibility_full.py test_key_hints.py test_level_mechanics.py test_level_select.py test_ski_run.py test_volume_indicator.py test_performance.py test_resize_touch.py test_daily_runs.py"
    UNKNOWN_E2E=()
    for f in tests/e2e/test_*.py; do
        [ -f "$f" ] || continue
        basename=$(basename "$f")
        if ! echo "$KNOWN_E2E_FILES" | grep -qw "$basename"; then
            UNKNOWN_E2E+=("$basename")
        fi
    done
    if [ ${#UNKNOWN_E2E[@]} -gt 0 ]; then
        echo ""
        echo "ERROR: Unknown E2E test file(s) not in --smart mapping:"
        printf '  %s\n' "${UNKNOWN_E2E[@]}"
        echo "Add source→test mapping in run-tests.sh (search for KNOWN_E2E_FILES)"
        echo "and update the specialized case statement above."
        exit 1
    fi

    # Auto-validate scene→test mapping by scanning getScene() references in E2E tests.
    # For each scene file, check that tests which substantively reference it are mapped.
    # Skip catch-all tests and known incidental references (e.g. conftest helpers that
    # navigate through GameScene/MenuScene to reach the scene under test).
    ALWAYS_INCLUDED="test_navigation.py"
    # Tests that reference scenes only for setup (skip_to_level, dismiss_dialogues, etc.)
    # not because they test that scene's behavior.  Format: "SceneName:test_file.py"
    INCIDENTAL_REFS=(
        "GameScene:test_accessibility.py" "GameScene:test_accessibility_full.py"
        "GameScene:test_gamepad.py" "GameScene:test_level_complete.py"
        "GameScene:test_ski_run.py" "GameScene:test_touch_controls.py"
        "HUDScene:test_accessibility.py" "HUDScene:test_accessibility_full.py"
        "HUDScene:test_gameplay.py" "HUDScene:test_key_hints.py"
        "HUDScene:test_ski_run.py"
        "DialogueScene:test_gamepad.py" "DialogueScene:test_gameplay.py"
        "DialogueScene:test_key_hints.py"
        "MenuScene:test_dialogue_speakers.py" "MenuScene:test_gamepad.py"
        "MenuScene:test_level_mechanics.py" "MenuScene:test_touch_controls.py"
        "LevelCompleteScene:test_ski_run.py"
        "SettingsScene:test_accessibility_full.py" "SettingsScene:test_ski_run.py"
        "HUDScene:test_dialogue.py"
        "GameScene:test_daily_runs.py" "MenuScene:test_daily_runs.py"
        "DialogueScene:test_daily_runs.py" "LevelCompleteScene:test_daily_runs.py"
        "PauseScene:test_daily_runs.py"
    )
    MAPPING_DRIFT=()

    for scene_file in src/scenes/*Scene.ts; do
        [ -f "$scene_file" ] || continue
        scene_name=$(basename "$scene_file" .ts)
        # Run the case statement for this scene file to find mapped tests
        SCENE_TESTS=()
        case "$scene_file" in
            src/scenes/SettingsScene.ts)  SCENE_TESTS+=("test_settings_ui.py") ;;
            src/scenes/HUDScene.ts)       SCENE_TESTS+=("test_touch_controls.py" "test_resize_touch.py") ;;
            src/scenes/DialogueScene.ts)  SCENE_TESTS+=("test_dialogue_speakers.py" "test_dialogue.py" "test_resize_touch.py") ;;
            src/scenes/GameScene.ts)      SCENE_TESTS+=("test_gameplay.py" "test_level_mechanics.py" "test_resize_touch.py") ;;
            src/scenes/PauseScene.ts)     SCENE_TESTS+=("test_pause_menu.py") ;;
            src/scenes/LevelCompleteScene.ts) SCENE_TESTS+=("test_level_complete.py") ;;
            src/scenes/CreditsScene.ts)   SCENE_TESTS+=("test_level_complete.py") ;;
            src/scenes/MenuScene.ts)      SCENE_TESTS+=("test_scene_layering.py" "test_volume_indicator.py" "test_level_select.py") ;;
            src/scenes/LevelSelectScene.ts) SCENE_TESTS+=("test_level_select.py") ;;
            src/scenes/ContractsScene.ts) SCENE_TESTS+=("test_daily_runs.py") ;;
            src/scenes/SkiRunScene.ts)    SCENE_TESTS+=("test_ski_run.py") ;;
            src/scenes/BootScene.ts)      SCENE_TESTS+=("test_performance.py") ;;
        esac
        mapped_tests=$(printf '%s\n' "${SCENE_TESTS[@]}" | sort -u)

        # Find all test files that reference this scene via getScene()
        for test_file in tests/e2e/test_*.py; do
            [ -f "$test_file" ] || continue
            test_base=$(basename "$test_file")
            echo "$ALWAYS_INCLUDED" | grep -qw "$test_base" && continue
            # Skip known incidental references
            printf '%s\n' "${INCIDENTAL_REFS[@]}" | grep -qx "${scene_name}:${test_base}" && continue
            if grep -qP "getScene\(['\"]${scene_name}['\"]\)" "$test_file" 2>/dev/null; then
                if ! echo "$mapped_tests" | grep -qw "$test_base"; then
                    MAPPING_DRIFT+=("  ${scene_file} should trigger ${test_base} (references ${scene_name})")
                fi
            fi
        done
    done
    if [ ${#MAPPING_DRIFT[@]} -gt 0 ]; then
        echo ""
        echo "WARNING: E2E tests reference scenes not in their --smart mapping:"
        printf '%s\n' "${MAPPING_DRIFT[@]}"
        echo "Update the case statement in run-tests.sh or add to INCIDENTAL_REFS."
        echo ""
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
    DEV_PORT="${PORT:-3000}"
    if ! curl -s http://localhost:$DEV_PORT > /dev/null 2>&1; then
        echo ""
        echo "=== Starting dev server ==="
        ./dev.sh
    else
        echo "Dev server already running on port $DEV_PORT"
    fi

    echo ""
    echo "=== Running E2E tests (Playwright) ==="

    # Auto-setup venv if missing
    if [ ! -f .venv/bin/activate ]; then
        echo "Python venv not found — running setup.sh..."
        ./setup.sh
    fi
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
