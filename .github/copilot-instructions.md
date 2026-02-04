# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Testing
- **Dev server**: `npm run dev` then open `http://localhost:3000`
- **Skip levels**: Press `N` to skip to next level (useful for testing)
- **E2E tests**: `./run-tests.sh` (Playwright, parallel on Chromium + Firefox)
- **Headed tests**: `./run-tests.sh --headed` (sequential, visible browser)
- **Single browser**: `./run-tests.sh --browser chromium` (skip Firefox)

## Workflow
1. **Commit early, commit often** - After each validated fix or feature, commit with descriptive message
2. **Co-author commits** - Always include: `Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>`
3. **Update docs after changes** - After confirming changes work, update relevant documentation:
   - `README.md` - Setup, usage, project overview
   - `docs/ARCHITECTURE.md` - Technical patterns, scene lifecycle, code structure
   - `docs/GAMEPLAY.md` - Game mechanics, controls, level progression
   - `.github/copilot-instructions.md` - Development patterns, key files, queued items
4. **Add/update tests** - When fixing bugs or adding features:
   - Add E2E tests in `tests/e2e/test_navigation.py` for UI/gameplay changes
   - Add unit tests in `tests/unit-js/` for config validation
   - Run `./run-tests.sh` to verify all tests pass before committing
5. **Queue non-urgent items** - Use plan.md for tracking; don't interrupt current work

## Code Patterns

### Scene Layering (Critical)
Overlay scenes must be brought to top to render above GameScene:
```javascript
this.scene.launch('HUDScene', { ... });
this.scene.bringToTop('HUDScene');
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

### Groomer Spawn
Use actual piste path center, not world center:
```javascript
const bottomPath = this.pistePath[yIndex];
const startX = bottomPath.centerX * this.tileSize;
```

## Key Files
- `src/config/levels.js` - Level definitions, accessPaths, steepZones
- `src/config/localization.js` - All UI strings (FR primary, EN)
- `src/scenes/GameScene.js` - Main gameplay, physics, terrain
- `src/scenes/HUDScene.js` - UI overlay with scaling
- `src/utils/accessibility.js` - A11y settings storage
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
- Responsive game scene (window resize, orientation changes)
- Touch screen controls verification
- Piste marker orientation fix (orange on right going downhill)
- Difficulty-based obstacles (fewer on easy pistes)
- Resort buildings on easy pistes (chalets near resort)
- Dialogue improvements (ESC dismiss, freeze groomer)
