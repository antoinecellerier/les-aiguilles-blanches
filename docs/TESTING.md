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
| `test_navigation.py` | Menu, scenes, levels, progression |
| `test_gamepad.py` | Controller detection, button mapping |
| Classes: `TestNightLevel`, `TestWinchMechanics` | Night overlay, headlights, winch |

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
