# Testing Guide

## Overview

- **Unit tests** (Vitest): Config validation in `tests/unit-js/`
- **E2E tests** (Playwright): Browser-based gameplay tests in `tests/e2e/`

For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Running Tests

```bash
./run-tests.sh                        # All tests (parallel, Chromium + Firefox)
./run-tests.sh --browser chromium     # Single browser
./run-tests.sh --headed               # Visible browser (sequential)
./run-tests.sh -k "test_name"         # Specific test
./run-tests.sh --smart                # Only tests affected by uncommitted changes
./run-tests.sh --smart --browser chromium  # Smart + single browser (fastest)
npm test                              # Unit tests only
```

The test script auto-starts the dev server if not running.

## E2E Setup (first time)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install playwright pytest-playwright pytest-xdist
python -m playwright install chromium firefox
```

## Smart Test Selection

The `--smart` flag runs only tests affected by uncommitted changes (`git diff HEAD`):

- **Unit tests**: Uses Vitest's `--changed` flag which traces the import graph automatically — zero maintenance.
- **E2E tests**: File-level selection based on which source files changed:
  - Any `src/` change → always runs `test_navigation.py` (catch-all integration suite)
  - `src/scenes/GameScene.ts` → also runs `test_gameplay.py`, `test_level_mechanics.py`, `test_resize_touch.py`
  - `src/scenes/DialogueScene.ts` → also runs `test_dialogue_speakers.py`, `test_dialogue.py`, `test_resize_touch.py`
  - `src/scenes/PauseScene.ts` → also runs `test_pause_menu.py`
  - `src/scenes/LevelCompleteScene.ts` or `CreditsScene.ts` → also runs `test_level_complete.py`
  - `src/scenes/MenuScene.ts` → also runs `test_scene_layering.py`, `test_volume_indicator.py`
  - `src/utils/gamepad*.ts` → also runs `test_gamepad.py`
  - `src/scenes/SettingsScene.ts` → also runs `test_settings_ui.py`
  - `src/scenes/DailyRunsScene.ts`, `src/systems/DailyRunSession.ts`, `src/systems/LevelGenerator.ts` → also runs `test_daily_runs.py`
  - `src/scenes/SkiRunScene.ts`, `src/systems/ParkFeatureSystem.ts`, `src/utils/skiSprites.ts`, `src/utils/skiRunState.ts` → also runs `test_ski_run.py`
  - `src/utils/touchDetect.ts` or `src/scenes/HUDScene.ts` → also runs `test_touch_controls.py`, `test_resize_touch.py`
  - `src/utils/keyboardLayout.ts` → also runs `test_key_hints.py`
  - `src/config/levels.ts`, `src/systems/*` → also runs `test_level_mechanics.py`
  - `src/utils/resizeManager.ts`, `src/utils/cameraCoords.ts`, `src/config/gameConfig.ts` → also runs `test_resize_touch.py`
  - `src/utils/accessibility.ts` → also runs `test_accessibility.py`, `test_accessibility_full.py`
  - `src/systems/AudioSystem.ts`, `src/systems/*Sounds.ts`, `src/systems/MusicSystem.ts` → also runs `test_volume_indicator.py`
  - `tests/e2e/conftest.py` changed → runs all E2E tests
  - No `src/` or test changes → skips E2E entirely

All 78 source files have explicit mappings. Three validation layers enforce this:

1. **Unknown test files** (ERROR) — New `test_*.py` files must be added to `KNOWN_E2E_FILES`.
2. **Unmapped source files** (ERROR) — Changed `src/*.ts` files must have a case branch (or be in the no-mapping exclusion list for type defs, env shims, etc.).
3. **Scene reference drift** (WARNING) — Scans `getScene('FooScene')` calls in all test files and warns if a test references a scene not in its mapping. An `INCIDENTAL_REFS` array ignores known setup-only references (e.g. `test_accessibility.py` references GameScene only via `skip_to_level()`).

## Test Helpers

Core helpers are in `tests/e2e/conftest.py`, including `click_menu_button`, `click_button`, `BUTTON_*` constants, `LEVEL_INDEX`, `assert_scene_active`, `assert_scene_not_active`, `assert_no_error_message`, `assert_not_on_menu`, `assert_canvas_renders_content`, `get_active_scenes`, `get_current_level`, `navigate_to_settings`, and other shared utilities.

### Fixtures

```python
def test_example(self, game_page: Page):  # Auto-navigates to game, waits for MenuScene
    ...
```

### Scene Utilities

```python
wait_for_scene(page, 'GameScene')           # Wait for scene to be active
wait_for_scene_inactive(page, 'PauseScene') # Wait for scene to stop
wait_for_game_ready(page)                   # Wait for MenuScene (used by fixture)
```

### Level Navigation

```python
skip_to_level(page, 6)                      # Jump directly to level 6
skip_to_credits(page)                       # Skip all levels (tests progression)
wait_for_level_or_credits(page, level)      # Wait for level OR game end
```

### Menu & Navigation

```python
LEVEL_INDEX                                 # Dict mapping level nameKey → array index
get_current_level(page)                     # Get current level index from GameScene
navigate_to_settings(page)                  # Navigate to SettingsScene directly
```

### Assertions

```python
assert_no_error_message(page)               # Assert no error message on screen
assert_canvas_renders_content(page)         # Assert canvas has non-black content
assert_scene_not_active(page, 'MenuScene')  # Assert a scene is NOT active
assert_not_on_menu(page)                    # Assert we're no longer on MenuScene
```

### Dialogue Management

```python
dismiss_dialogues(page)                     # Clear any active dialogue
```

### Environment

```python
# Override game URL via environment variable
GAME_URL = os.environ.get("GAME_URL", "http://localhost:3000/index.html")
```

## Choosing the Right Helper

| Testing... | Use | Why |
|------------|-----|-----|
| Level-specific mechanics | `skip_to_level()` | Fast, reliable |
| Level progression | Press `n` key | Tests actual skip logic |
| Dialogue content | Click to dismiss | Tests dialogue flow |
| Mechanics after dialogue | `dismiss_dialogues()` | Avoids timing issues |

## Writing Reliable Tests

### Best Practices

```python
def test_example(self, game_page: Page):
    click_button(game_page, BUTTON_START, "Start Game")
    wait_for_scene(game_page, 'GameScene')
    
    # 1. Skip to the level you need
    skip_to_level(game_page, 1)
    
    # 2. Clear dialogues if not testing them
    dismiss_dialogues(game_page)
    
    # 3. Get initial state
    initial = game_page.evaluate("() => ...")
    
    # 4. Perform action
    game_page.keyboard.down("ArrowUp")
    
    # 5. Wait for state change (NOT fixed timeout!)
    game_page.wait_for_function(f"() => stateChanged({initial})", timeout=3000)
    
    game_page.keyboard.up("ArrowUp")
```

### Avoid

- Fixed `wait_for_timeout()` for game state changes
- `skip_to_level()` when testing progression
- `dismiss_dialogues()` when testing dialogue behavior
- Reading `ds.dialogueText.text` for assertions — use `ds.fullText` instead (typewriter reveals text gradually)

## localStorage Keys

All keys are centralized in `src/config/storageKeys.ts`. Tests should use the same key strings.

The `game_page` fixture automatically clears localStorage after each test to prevent state leakage between tests.

## Test Categories

| File | Tests |
|------|-------|
| `test_navigation.py` | Menu navigation, canvas rendering, game progress, level transitions |
| `test_gameplay.py` | Tutorial, groomer movement, grooming input guard, snow contrast |
| `test_dialogue.py` | Dialogue display, dismissal, positioning |
| `test_pause_menu.py` | Pause menu open/close, settings roundtrip |
| `test_level_complete.py` | Level complete, fail screen, credits, keyboard nav |
| `test_scene_layering.py` | Scene depth ordering, menu depth, resize behavior |
| `test_accessibility.py` | Colorblind filters, high contrast, HUD, background rendering |
| `test_accessibility_full.py` | Full a11y pass: HC canvas filter, all CB modes, reduced motion, ARIA, persistence, responsive form factors, combined modes |
| `test_key_hints.py` | Dynamic key hints, rebound keys, AZERTY layout |
| `test_level_mechanics.py` | Night, winch, cliffs, forests, access paths, wildlife |
| `test_dialogue_speakers.py` | Speaker assignment, character portraits per level |
| `test_gamepad.py` | Controller detection, button mapping, Nintendo/PlayStation |
| `test_touch_controls.py` | Touch input, orientation changes, resize |
| `test_resize_touch.py` | Static→follow camera transition, groomer/dialogue above touch controls, zoom stability |
| `test_settings_ui.py` | Settings layout, DPI, viewport sizes |
| `test_volume_indicator.py` | Volume icon, mute toggle, hover slider, overlay |
| `test_level_select.py` | Level select navigation, star ratings, ski/groom buttons |
| `test_daily_runs.py` | Daily runs navigation, rank cycling, gamepad, session persistence, briefing, level generation |
| `test_ski_run.py` | Ski run HUD, descent mode settings, viewport bounds |
| `test_performance.py` | Baseline object counts (L0 vs L9), object count stability (leak detection) |

### Viewport / Resize Testing

Use `set_viewport_size` + `resizeGame()` for testing responsive behavior. Phaser's `Scale.RESIZE` doesn't react to Playwright viewport changes alone — `resizeGame()` forces a manual refresh for test purposes only.

```python
game_page.set_viewport_size({"width": 375, "height": 667})
game_page.evaluate("() => window.resizeGame?.()")
game_page.wait_for_timeout(300)
```

## Debugging

```bash
# Run single test with visible browser
./run-tests.sh --headed -k "test_name"
```

```python
# Add debug output
game_page.screenshot(path="debug.png")
print(game_page.evaluate("""() => ({
    scenes: window.game?.scene?.getScenes(true).map(s => s.scene.key),
    level: window.game?.scene?.getScene('GameScene')?.levelIndex,
    dialogue: window.game?.scene?.getScene('DialogueScene')?.isDialogueShowing?.()
})"""))
```

## Visual Debugging (Screenshots)

For debugging visual issues (e.g., cliff placement, rendering bugs), capture screenshots at specific levels:

### Manual Screenshot Capture

```bash
# Start dev server
npm run dev &

# Run headed test, pause at specific level
./run-tests.sh --headed -k "test_cliff"
```

### Automated Screenshot Test Pattern

```python
def test_cliff_visuals(self, game_page: Page):
    """Capture cliff rendering for visual verification."""
    click_button(game_page, BUTTON_START, "Start Game")
    wait_for_scene(game_page, 'GameScene')
    
    # Jump to level with cliffs (6, 7, or 8 have hasDangerousBoundaries)
    skip_to_level(game_page, 7)
    dismiss_dialogues(game_page)
    
    # Move camera to see cliff areas
    game_page.keyboard.down("ArrowUp")
    game_page.wait_for_timeout(2000)  # Let camera pan
    game_page.keyboard.up("ArrowUp")
    
    # Capture screenshot for visual inspection
    # Store in session files directory (no git commit needed)
    game_page.screenshot(path="tests/screenshots/cliff_test.png")
```

### Levels for Visual Testing

| Level | Feature | What to Check |
|-------|---------|---------------|
| 5 | Steep zones (slide + tumble) | Blue tint bands, warm→cold transition |
| 6 | Black Piste (serpentine) | Left/right cliffs, night overlay |
| 7 | Avalanche Zone (winding) | Cliff curves follow piste shape |
| 8 | Storm Recovery (gentle_curve) | Cliffs + weather effects |

### Loading a Specific Level in Playwright

Use `game.scene.start('GameScene', { level: N })` where N is the 0-based level index. The data key is `level` (not `levelIndex`):

```python
page.evaluate("() => window.game.scene.start('GameScene', { level: 5 })")
time.sleep(5)  # Wait for scene to load
```

### Common Visual Issues

1. **Cliffs overlapping piste** - Check `calculateCliffSegments()` edge array copying
2. **Invisible death zones** - Verify physics uses same `cliffSegments` as visuals
3. **Boxy cliff edges** - Check organic variation only pushes away from piste
4. **Cliff gaps at access roads** - Verify `accessEntryZones` exclusion logic
5. **Road blocked by walls** - Check init order: `calculateAccessPathGeometry()` must run before `createBoundaryColliders()`

### Physics Debugging with Automated Screenshots

For issues where visuals don't match physics (e.g., groomer blocked by invisible walls), make colliders visible and capture screenshots programmatically:

```python
# In a Python script (activate .venv first: source .venv/bin/activate)
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.goto('http://localhost:3000/index.html')
    # ... wait for menu, start game ...

    skip_to_level(page, 4)   # Use conftest helper or evaluate transitionToLevel
    dismiss_dialogues(page)   # Clear intro dialogs

    # Teleport groomer to area of interest
    page.evaluate("() => { const gs = ...; gs.groomer.setPosition(x, y); }")

    # Move and check position changed
    page.keyboard.down("a")
    page.wait_for_timeout(2000)
    page.keyboard.up("a")

    # Read groomer position to verify traversal
    pos = page.evaluate("() => { const gs = ...; return { x: gs.groomer.x, y: gs.groomer.y }; }")
```

**Tip**: To visualize physics colliders, temporarily change wall creation from `0x000000, 0` (invisible) to `0xff0000, 0.3` (red, semi-transparent) with `setDepth(50)`.

| Level | Access Paths | Boundaries | What to Check |
|-------|-------------|------------|---------------|
| 4 | Left + Right | Non-dangerous (walls) | Walls exempt road Y ranges |
| 6 | Left + Right + Left | Dangerous (cliffs) | Cliff segments skip road areas |
| 7 | Left + Right | Dangerous (cliffs) | Same as 6, different layout |

## Level Reference

| Index | Difficulty | Notable Features |
|-------|-----------|------------------|
| 0 | Tutorial | Intro dialogues |
| 1 | Green | Basic grooming |
| 2 | Blue | Trees, rocks |
| 3 | Park | Jumps, rails |
| 4 | Red | `hasWinch`, winding piste |
| 5 | Park | Halfpipe |
| 6 | Black | `isNight`, `hasWinch` |
| 7 | Black | `hasWinch`, light snow, avalanche zones |
| 8 | Red | `hasWinch`, storm weather |

See [GAMEPLAY.md](./GAMEPLAY.md) for full level details.

## CLI Test Tools

- **`tests/e2e/generate_level_previews.py`** — Generates annotated level preview images for visual inspection of procedural generation. Usage: `python tests/e2e/generate_level_previews.py --samples 5 --ranks green,blue,red,black`
- **`capture_daily_runs.py`** — Captures daily run screenshots for regression comparison.
