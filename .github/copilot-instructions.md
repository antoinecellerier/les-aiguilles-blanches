# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Documentation
- `docs/ARCHITECTURE.md` - Technical patterns, scene lifecycle, rendering, winch/night systems
- `docs/GAMEPLAY.md` - Game mechanics, controls, level guide, troubleshooting

## Testing
- **Dev server**: `npm run dev` then open `http://localhost:3000`
- **Skip levels**: Press `N` to skip to next level (useful for testing)
- **E2E tests**: `./run-tests.sh` (Playwright, parallel on Chromium + Firefox)
- **Headed tests**: `./run-tests.sh --headed` (sequential, visible browser)
- **Single browser**: `./run-tests.sh --browser chromium` (skip Firefox)
- **Specific test**: `./run-tests.sh -k "test_name"` (uses pytest -k filter)
- **Test script auto-starts dev server** if not already running

## Workflow
1. **Commit early, commit often** - After each validated fix or feature, commit with descriptive message
2. **Co-author commits** - Always include: `Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>`
3. **Update docs after changes** - Update `README.md`, `docs/ARCHITECTURE.md`, `docs/GAMEPLAY.md` as needed
4. **Update localizations** - Add strings to `src/config/localization.ts` for ALL languages (FR, EN, DE, IT, ES)
5. **Add/update tests** - E2E in `tests/e2e/`, unit in `tests/unit-js/`
6. **Queue non-urgent items** - Use plan.md for tracking; update Queued Items below

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
See `docs/ARCHITECTURE.md` for details on:
- Scene transitions (remove/recreate to avoid texture corruption)
- Scene layering (HUDScene on top for input priority)
- Overlay input handling (disable interactivity when hidden)

## Key Files
- `src/config/levels.ts` - Level definitions, accessPaths, steepZones, winchAnchors
- `src/config/localization.ts` - All UI strings with {placeholder} syntax
- `src/scenes/GameScene.ts` - Main gameplay, physics, night overlay, winch
- `src/scenes/HUDScene.ts` - UI overlay, touch controls
- `src/utils/gamepad.ts` - Controller detection, `isConfirmPressed()`, `isBackPressed()`
- `src/utils/keyboardLayout.ts` - Layout detection, `getGroomKeyName()`, `getWinchKeyName()`

## Domain Knowledge
- **French piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: ⚓ symbols with numbered posts

## Queued Items (from plan.md)
### Polish
- Background padding graphics more similar to off-piste
- Gamepad button rebinding
- Keyboard-only menu navigation
- Level differentiation (varied objectives)
- Character avatars
- Show connected gamepad name in settings
- Localize How to Play WASD directions

### Future
- Localization audit (verify all scenes use t() except intentional French)
- Easter eggs (5G towers, slipping cars, wildlife, Candide Thovex)
- Sound effects and music
- Leaderboards
