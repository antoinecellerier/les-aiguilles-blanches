# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Documentation
- `docs/ARCHITECTURE.md` - Technical patterns, scene lifecycle, rendering, winch/night systems
- `docs/GAMEPLAY.md` - Game mechanics, controls, level guide, troubleshooting
- `docs/TESTING.md` - Test helpers, writing reliable tests, debugging

## Testing
See `docs/TESTING.md` for full details. Quick reference:
```bash
./run-tests.sh                    # All tests
./run-tests.sh --browser chromium # Single browser
./run-tests.sh -k "test_name"     # Specific test
```

Key helpers in `tests/e2e/conftest.py`:
- `skip_to_level(page, n)` - Jump to level n directly
- `dismiss_dialogues(page)` - Clear active dialogues
- `wait_for_scene(page, name)` - Wait for scene to be active

## Workflow
1. **Commit early, commit often** - After each validated fix or feature
2. **Co-author commits** - Include: `Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>`
3. **Update docs** - `README.md`, `docs/ARCHITECTURE.md`, `docs/GAMEPLAY.md`, `docs/TESTING.md`
4. **Update localizations** - Add to `src/config/localization.ts` for ALL languages
5. **Add/update tests** - E2E in `tests/e2e/`, unit in `tests/unit-js/`
6. **Queue non-urgent items** - Use plan.md; update Queued Items below

## Critical Patterns

### localStorage Keys (Must Match in Tests)
```javascript
localStorage.setItem('snowGroomer_bindings', JSON.stringify(bindings));
localStorage.setItem('snowGroomer_displayNames', JSON.stringify(displayNames));
localStorage.setItem('snowgroomer-keyboard-layout', 'azerty');
```

### Dynamic Key Placeholders
Localized strings support `{keys}`, `{groomKey}`, `{winchKey}` - replaced via `keyboardLayout.ts` utilities.

### Scene Patterns
See `docs/ARCHITECTURE.md` for scene transitions, layering, overlay input handling.

## Key Files
- `src/config/levels.ts` - Level definitions, accessPaths, steepZones, winchAnchors
- `src/config/localization.ts` - All UI strings with {placeholder} syntax
- `src/scenes/GameScene.ts` - Main gameplay, physics, night overlay, winch
- `src/scenes/HUDScene.ts` - UI overlay, touch controls
- `src/utils/gamepad.ts` - Controller detection, `isConfirmPressed()`, `isBackPressed()`
- `src/utils/keyboardLayout.ts` - Layout detection, `getGroomKeyName()`, `getWinchKeyName()`
- `tests/e2e/conftest.py` - Test helpers (`skip_to_level`, `dismiss_dialogues`, etc.)

## Domain Knowledge
- **French piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: ⚓ symbols with numbered posts

## Queued Items (from plan.md)
### Polish
- Cliff area graphics - Make clearly distinct
- Move speed consistency across input methods
- Gamepad button rebinding
- Keyboard-only menu navigation
- Level differentiation (varied objectives)
- Character avatars

### Future
- Localization audit (verify all scenes use t())
- Easter eggs (5G towers, wildlife, Candide Thovex)
- Sound effects and music
- Leaderboards
