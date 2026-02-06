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
npm test                              # Unit tests only
```

The test script auto-starts the dev server if not running.

## Test Helpers

All helpers are in `tests/e2e/conftest.py`.

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

Tests must match the game's keys (see [ARCHITECTURE.md](./ARCHITECTURE.md#localization-system)):

```python
game_page.evaluate("""() => {
    localStorage.setItem('snowGroomer_bindings', JSON.stringify({...}));
    localStorage.setItem('snowGroomer_displayNames', JSON.stringify({...}));
    localStorage.setItem('snowgroomer-keyboard-layout', 'qwerty');
}""")
```

## Test Categories

| File | Tests |
|------|-------|
| `test_navigation.py` | Menu, scenes, levels, progression, changelog |
| `test_gamepad.py` | Controller detection, button mapping |
| `test_touch_controls.py` | Touch input, orientation changes, resize |
| `test_settings_ui.py` | Settings layout, DPI, viewport sizes |
| Classes: `TestNightLevel`, `TestWinchMechanics` | Night overlay, headlights, winch |

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
    game_page.screenshot(path="/home/antoine/.copilot/session-state/.../files/cliff_test.png")
```

### Levels for Visual Testing

| Level | Feature | What to Check |
|-------|---------|---------------|
| 6 | Black Piste (serpentine) | Left/right cliffs, night overlay |
| 7 | Avalanche Zone (winding) | Cliff curves follow piste shape |
| 8 | Storm Recovery (gentle_curve) | Cliffs + weather effects |

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

| Index | Level | Notable Features |
|-------|-------|------------------|
| 0 | Tutorial | Intro dialogues |
| 1 | Green Piste | Good for basic tests |
| 2-5 | Blue/Park/Red/Halfpipe | Various mechanics |
| 6 | Black Piste | `isNight`, `hasWinch` |
| 7 | Avalanche Zone | Danger zones |
| 8 | Storm Recovery | Weather effects |

See [GAMEPLAY.md](./GAMEPLAY.md) for full level details.
