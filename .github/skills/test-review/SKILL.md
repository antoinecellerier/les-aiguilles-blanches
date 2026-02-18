---
name: test-review
description: Reviews E2E test code for brittleness, flakiness, and anti-patterns. Use this when writing new E2E tests, fixing test failures, or before committing test changes.
---

## E2E Test Review Process

Review all E2E test code as an experienced test engineer would. The test suite uses Playwright + pytest-xdist (6 parallel workers) against a Phaser 3 Canvas game — timing sensitivity and shared state are the primary failure vectors.

### Phase 1: Scope detection

Identify changed test files and the conftest infrastructure:

```bash
git --no-pager diff --name-only | grep -E 'tests/e2e/|pytest.ini'
```

If no test files changed, check if source changes require new tests:
- New scenes → need test file + `run-tests.sh` smart mapping entry
- New buttons/UI → need navigation tests
- New game mechanics → need gameplay tests

### Phase 2: Test design quality

Review each test for sound engineering:

#### Test naming and intent
- **Name describes the expected behavior**, not the mechanism: `test_escape_returns_to_menu` ✅ not `test_press_escape_key` ❌
- **Docstring explains the regression** or user story being validated, not just rephrasing the name
- **One assertion per logical behavior** — a test can have multiple `assert` statements if they all verify aspects of the same behavior, but should not test two unrelated things

#### Arrange / Act / Assert structure
Every test should have clear phases. Flag tests that intermix setup with verification.
```python
# ✅ Clear AAA
def test_pause_resumes_gameplay(self, game_page):
    # Arrange
    click_button(game_page, BUTTON_START, "Start Game")
    wait_for_scene(game_page, 'GameScene')
    dismiss_dialogues(game_page)
    # Act
    game_page.keyboard.press("Escape")
    wait_for_scene(game_page, 'PauseScene')
    wait_for_input_ready(game_page, 'PauseScene')
    game_page.keyboard.press("Escape")
    # Assert
    wait_for_scene_inactive(game_page, 'PauseScene')
    assert_scene_active(game_page, 'GameScene')
```

#### Assertion quality
- **Assert on behavior, not implementation** — check what the user sees, not internal state when possible
- **Meaningful error messages** — include actual vs expected: `f"Should be on level 0, got {level}"` not just `assert level == 0`
- **Not over-specified** — don't assert on exact pixel positions, frame counts, or timing values that vary under load
- **Not under-specified** — every test must have at least one assertion; flag any test that only calls functions without asserting outcomes

#### Edge cases and failure paths
Check that the test suite covers:
- **Happy path** — normal user flow works
- **Error recovery** — what happens when a scene transition fails, fuel runs out, timer expires
- **Boundary conditions** — first level, last level, zero values, max values
- **Interruption** — pause during transition, resize during dialogue, orientation change during gameplay
- **State reset** — returning to menu clears game state properly

### Phase 3: Project-specific anti-patterns

Launch explore agents to check each changed test file for these patterns:

#### 1. Hardcoded button indices ❌

**Bad:** Breaks when menu order changes (caused 20+ failures in one session).
```python
click_button(page, 3, "Settings")  # ❌ fragile index
BUTTON_SETTINGS = 3                # ❌ stale constant
```

**Good:** Key-based lookup immune to reordering.
```python
click_menu_by_key(page, 'settings')              # ✅
idx = find_menu_button_index(page, 'settings')    # ✅
```

MenuScene buttons are tagged with `button.setData('key', btnKey)` where keys match the translation key (e.g., `'startGame'`, `'settings'`, `'howToPlay'`, `'changelog'`, `'dailyRuns'`, `'newGame'`).

**Exception:** `BUTTON_START = 0` is safe — the primary action button is always first. But prefer `click_menu_by_key(page, 'startGame')` for clarity.

#### 2. Fixed timeouts instead of state polling ❌

**Bad:** Fails under CPU contention from parallel workers.
```python
page.wait_for_timeout(350)         # ❌ races with SCENE_INPUT_DELAY
page.wait_for_timeout(300)         # ❌ grooming might not register yet
```

**Good:** Poll actual game state.
```python
wait_for_input_ready(page, 'PauseScene')   # ✅ waits for inputReady === true
page.wait_for_function(f"""() => {{        # ✅ polls until condition met
    const gs = window.game.scene.getScene('GameScene');
    return gs && gs.groomedCount > {initial};
}}""", timeout=5000)
```

**When `wait_for_timeout` IS acceptable:**
- Between rapid keyboard events (50ms for ArrowDown sequences)
- After scene transitions when waiting for render (500ms + state check)
- Never as the sole mechanism to verify game state changed

#### 3. Missing inputReady wait ❌

**Bad:** Sends input before scene is ready to receive it.
```python
wait_for_scene(page, 'PauseScene')
page.keyboard.press("Escape")      # ❌ might be ignored
```

**Good:** Wait for the scene's input delay to expire.
```python
wait_for_scene(page, 'PauseScene')
wait_for_input_ready(page, 'PauseScene')
page.keyboard.press("Escape")      # ✅ scene is listening
```

Scenes with `BALANCE.SCENE_INPUT_DELAY` (300ms): PauseScene, LevelCompleteScene, LevelSelectScene, SettingsScene, CreditsScene. Always use `wait_for_input_ready` before keyboard events on these scenes.

#### 4. Container-relative coordinate bugs ❌

**Bad:** Uses local coordinates as if they were screen coordinates.
```python
pos = page.evaluate("""() => {
    const btn = scene.menuButtons[0];
    return { x: btn.x, y: btn.y };  // ❌ local to container
}""")
page.mouse.click(box["x"] + pos["x"], box["y"] + pos["y"])
```

**Good:** Account for parent container offset.
```python
pos = page.evaluate("""() => {
    const btn = scene.menuButtons[0];
    const cx = btn.parentContainer ? btn.parentContainer.x : 0;
    const cy = btn.parentContainer ? btn.parentContainer.y : 0;
    return { x: cx + btn.x, y: cy + btn.y };  // ✅ screen coords
}""")
```

#### 5. Tight explicit timeouts ❌

**Bad:** Overrides default timeout with a value too tight for parallel execution.
```python
wait_for_scene(page, 'SettingsScene', timeout=3000)  # ❌ too tight
```

**Good:** Use the default (8s) or a generous explicit timeout.
```python
wait_for_scene(page, 'SettingsScene')                 # ✅ uses 8s default
wait_for_scene(page, 'GameScene', timeout=10000)      # ✅ generous for slow transitions
```

The default timeout (8s) accounts for 6 parallel workers sharing CPU. Only override with larger values (10s+ for level loads, 30s for full ski runs).

#### 6. Duplicated conftest helpers ❌

**Bad:** Inline evaluate duplicating a conftest function.
```python
idx = page.evaluate("""() => {
    const scene = window.game?.scene?.getScene('MenuScene');
    return scene.menuButtons.findIndex(b => b.getData('key') === 'settings');
}""")                              # ❌ duplicates find_menu_button_index
```

**Good:** Import and use the helper.
```python
from conftest import find_menu_button_index
idx = find_menu_button_index(page, 'settings')  # ✅
```

#### 7. Checking local depth instead of effective depth ❌

**Bad:** Checks depth of objects inside containers — reports 0 when the container has the depth.
```python
assert btn.depth >= 10  # ❌ local depth is 0, container depth is 10
```

**Good:** Compute effective depth.
```python
containerDepth = btn.parentContainer ? btn.parentContainer.depth : 0
effectiveDepth = btn.depth + containerDepth  # ✅
```

#### 8. Missing smart test mapping ❌

When adding new source files or test files, update `run-tests.sh`:
- New `src/scenes/FooScene.ts` → add case branch mapping to test file(s)
- New `tests/e2e/test_foo.py` → add to `KNOWN_E2E_FILES`
- Renamed scenes → update both the case branch and `SCENE_TESTS` mapping

### Phase 4: Maintainability

1. **DRY without over-abstraction** — Shared setup belongs in conftest fixtures or helper functions. But don't abstract away test clarity; a reader should understand what a test does without jumping to 5 helpers.
2. **Test class grouping** — Related tests grouped in classes (`TestPauseMenu`, `TestSkiJump`). Classes should share a common setup pattern and test a single feature area.
3. **Consistent patterns across files** — Same flow (start game → navigate → assert) should use the same helpers everywhere. New test files should follow the established structure of existing ones.
4. **No orphaned tests** — Tests that were disabled, skipped, or commented out should be deleted or fixed. `@pytest.mark.skip` must have a reason.
5. **Import hygiene** — Only import what's used. Don't import removed constants (`BUTTON_SETTINGS` etc.).

### Phase 5: Parallel safety and isolation

1. **No shared mutable state** — Tests must not depend on localStorage from other tests (fixture clears it)
2. **No port conflicts** — All tests use `GAME_URL` from conftest (reads PORT from `.env.local`)
3. **No file system side effects** — Screenshots go to `tests/screenshots/` only
4. **Idempotent setup** — Each test must work regardless of execution order
5. **No test interdependence** — Test A must not set state that test B relies on. If you see tests that only pass when run together, flag as HIGH.
6. **Deterministic behavior** — Tests must not depend on wall-clock time, random values, or network. Game uses seeded RNG for daily runs; tests should inject known seeds when testing procedural content.

### Phase 6: Coverage assessment

For changed or new features, verify:

1. **Critical path covered** — Can the user complete the main flow without hitting untested code?
2. **Regression test for bugs** — Every bug fix should have a test that would have caught it. The docstring should reference what broke.
3. **Input method coverage** — Keyboard, mouse/touch, gamepad should all be tested for interactive features. At minimum, keyboard (most reliable in Playwright).
4. **Viewport coverage** — Tests that depend on layout should verify at least the default viewport (1280×720). Responsive-critical features use the `touch_page` fixture (390×844 portrait).

### Phase 7: Findings

Organize by severity:

| Severity | Criteria |
|----------|----------|
| **HIGH** | Will fail under parallel load, breaks on menu reorder, uses wrong coordinates, tests depend on each other, no assertions |
| **MEDIUM** | Duplicates helpers, uses unnecessarily tight timeouts, missing inputReady, poor error messages, tests multiple unrelated behaviors |
| **LOW** | Style inconsistency, could use a better helper but works correctly, missing edge case coverage |

### Phase 8: Verification

```bash
# Run changed tests in isolation
./run-tests.sh --browser chromium -k "test_name"

# Run full suite to check parallel stability
./run-tests.sh --browser chromium

# 248/248 should pass consistently across 2+ runs
```

## Available conftest helpers

| Helper | Purpose |
|--------|---------|
| `click_menu_by_key(page, key)` | Click menu button by data key (immune to reorder) |
| `find_menu_button_index(page, key)` | Get button index by data key |
| `click_button(page, index, desc)` | Click by index (for non-menu buttons like pause menu) |
| `wait_for_scene(page, name)` | Wait for scene active (8s default) |
| `wait_for_scene_inactive(page, name)` | Wait for scene to stop |
| `wait_for_input_ready(page, name)` | Wait for SCENE_INPUT_DELAY |
| `wait_for_game_ready(page)` | Wait for MenuScene (used by fixture) |
| `dismiss_dialogues(page)` | Dismiss any active briefing dialogues |
| `skip_to_level(page, N)` | Skip forward to level N |
| `navigate_to_daily_runs(page)` | Navigate to DailyRunsScene |
| `navigate_to_settings(page)` | Navigate to SettingsScene |
| `assert_scene_active(page, name)` | Assert scene is active |
| `assert_scene_not_active(page, name)` | Assert scene is not active |
| `get_active_scenes(page)` | List all active scene keys |
| `get_current_level(page)` | Get current GameScene level index |
