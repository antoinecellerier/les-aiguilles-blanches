# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Testing
- **Dev server**: `npm run dev` then open `http://localhost:3000`
- **Skip levels**: Press `N` to skip to next level (useful for testing)
- **E2E tests**: `./run-tests.sh` (Playwright, parallel on Chromium + Firefox)
- **Headed tests**: `./run-tests.sh --headed` (sequential, visible browser)
- **Single browser**: `./run-tests.sh --browser chromium` (skip Firefox)
- **Specific test**: Run individual tests when debugging: `python -m pytest tests/e2e/test_file.py::TestClass::test_name -v`

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
   - FR is primary, others can use similar phrasing if unsure
5. **Add/update tests** - When fixing bugs or adding features:
   - Add E2E tests in `tests/e2e/test_navigation.py` for UI/gameplay changes
   - Add unit tests in `tests/unit-js/` for config validation
   - Run `./run-tests.sh` to verify all tests pass before committing
6. **Queue non-urgent items** - Use plan.md for tracking; don't interrupt current work
7. **Keep queued items current** - Remove completed items from the Queued Items section below

## Code Patterns

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
- `src/config/localization.ts` - All UI strings (FR primary, EN)
- `src/scenes/GameScene.ts` - Main gameplay, physics, terrain
- `src/scenes/HUDScene.ts` - UI overlay with scaling, touch controls
- `src/scenes/MenuScene.ts` - Main menu with responsive layout
- `src/utils/accessibility.ts` - A11y settings storage
- `src/main.ts` - Game init, resize/orientation handlers
- `docs/ARCHITECTURE.md` - Technical decisions, patterns
- `docs/GAMEPLAY.md` - Game mechanics documentation

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
### Features  
- Off-piste appearance (no groomed look)
- Stamina mechanics review

### Polish
- Taunt text size (make bigger on fail screen)
- Keyboard-only menu navigation
- Gamepad support (manual testing needed)
- Level differentiation (varied objectives)
- Winch anchor proximity requirement
- Character avatars

### Future
- Localization audit (verify all scenes use t() except intentional French)
- Easter eggs (5G towers, slipping cars, wildlife, Candide Thovex)
- Sound effects and music
- Leaderboards
