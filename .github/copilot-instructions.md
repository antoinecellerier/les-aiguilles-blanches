# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

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
3. **Update docs after changes** - After confirming changes work, update relevant documentation:
   - `README.md` - Setup, usage, project overview
   - `docs/ARCHITECTURE.md` - Technical patterns, scene lifecycle, code structure
   - `docs/GAMEPLAY.md` - Game mechanics, controls, level progression
   - `.github/copilot-instructions.md` - Development patterns, key files, queued items
4. **Update localizations** - When adding/changing UI text:
   - Add strings to `src/config/localization.ts` for ALL languages (FR, EN, DE, IT, ES)
   - Use `t('keyName')` for all user-facing text
   - Use placeholders for dynamic keys: `{keys}`, `{groomKey}`, `{winchKey}`
   - FR is primary, others can use similar phrasing if unsure
5. **Add/update tests** - When fixing bugs or adding features:
   - Add E2E tests in `tests/e2e/test_navigation.py` for UI/gameplay changes
   - Add unit tests in `tests/unit-js/` for config validation
   - Run `./run-tests.sh` to verify all tests pass before committing
6. **Queue non-urgent items** - Use plan.md for tracking; don't interrupt current work
7. **Keep queued items current** - Remove completed items from the Queued Items section below

## Critical Patterns

### localStorage Keys (Must Match)
Settings use specific localStorage keys - tests must use the same:
```javascript
// Correct keys (from SettingsScene.ts):
localStorage.setItem('snowGroomer_bindings', JSON.stringify(bindings));
localStorage.setItem('snowGroomer_displayNames', JSON.stringify(displayNames));
localStorage.setItem('snowgroomer-keyboard-layout', 'azerty');
```

### Dynamic Key Placeholders
Localized strings support placeholders for rebound keys:
```typescript
// In localization.ts:
tutorialControls: "Use {keys} or arrows to move."
tutorialGroomAction: "Hold {groomKey} while moving to groom."
winchHint: "Press {winchKey} near anchor to use winch."

// Replaced in DialogueScene.showDialogue() and HUDScene.update()
// Using utilities from keyboardLayout.ts:
getMovementKeysString()  // Returns "WASD" or "ZQSD" based on layout
getGroomKeyName()        // Returns bound groom key name
getWinchKeyName()        // Returns bound winch key name
```

### Scene Layering (Critical)
HUDScene must be on top for input priority over DialogueScene:
```javascript
this.scene.launch('DialogueScene');
this.scene.launch('HUDScene', { ... });
this.scene.bringToTop('HUDScene');  // HUD on top for button clicks
```

### Scene Transitions (Critical)
Reusing stopped scenes causes texture corruption. Always remove and recreate:
```javascript
// See GameScene.transitionToLevel() for full pattern
game.scene.remove('SceneName');
game.scene.add('SceneName', SceneClass, false);
```

### Overlay Scene Input
Disable interactivity when overlay is hidden to prevent input blocking:
```javascript
this.bg.disableInteractive();  // in hideDialogue()
this.bg.setInteractive();      // in displayNextDialogue()
```

### Responsive Scaling
Game uses `Scale.RESIZE` mode for full viewport coverage:
```javascript
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.CENTER_BOTH,
}
// Handle resize in scenes:
this.scale.on('resize', this.handleResize, this);
```

### Touch Control Safety
HUDScene resets touch states when no pointers are active (prevents stuck controls):
```javascript
const activePointers = this.input.manager.pointers.filter(p => p.isDown);
if (activePointers.length === 0) {
  this.touchUp = false; // etc.
}
```

## Key Files
- `src/config/levels.ts` - Level definitions, accessPaths, steepZones
- `src/config/localization.ts` - All UI strings (FR primary, EN) with {placeholder} syntax
- `src/scenes/GameScene.ts` - Main gameplay, physics, terrain
- `src/scenes/HUDScene.ts` - UI overlay with scaling, touch controls
- `src/scenes/DialogueScene.ts` - Dialogue with dynamic key replacement
- `src/scenes/MenuScene.ts` - Main menu with responsive layout
- `src/utils/accessibility.ts` - A11y settings storage
- `src/utils/gamepad.ts` - Controller detection and button mapping (Nintendo/Xbox/PlayStation)
- `src/utils/keyboardLayout.ts` - Layout detection, getGroomKeyName(), getWinchKeyName()
- `src/main.ts` - Game init, resize/orientation handlers
- `docs/ARCHITECTURE.md` - Technical decisions, patterns
- `docs/GAMEPLAY.md` - Game mechanics documentation

## Gamepad Support
- **Controller detection**: `src/utils/gamepad.ts` detects controller type from `pad.id`
- **Nintendo swap**: A/B buttons are physically swapped vs Xbox; utility handles this
- **Button mapping**: Use `isConfirmPressed(pad)` and `isBackPressed(pad)` instead of `pad.A`/`pad.B`
- **Labels**: Use `getMappingFromGamepad(pad).confirmLabel` for UI hints

## French Ski Standards
- **Piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: ⚓ symbols with numbered posts

## Accessibility Features
- **High contrast mode**: CSS filter on canvas, body class toggle
- **Colorblind modes**: SVG color matrix filters (deuteranopia, protanopia, tritanopia)
- **Reduced motion**: Skips weather particle effects
- **Screen reader**: ARIA live region announcements

## Queued Items (from plan.md)
### Polish
- Gamepad button rebinding
- Night scene rendering + groomer headlights
- Keyboard-only menu navigation
- Level differentiation (varied objectives)
- Winch anchor proximity requirement
- Character avatars
- Show connected gamepad name in settings
- Localize How to Play WASD directions

### Future
- Localization audit (verify all scenes use t() except intentional French)
- Easter eggs (5G towers, slipping cars, wildlife, Candide Thovex)
- Sound effects and music
- Leaderboards
