# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Testing
- **Local URL**: `http://localhost/~antoine/snow-groomer/index-phaser.html`
- **Skip levels**: Press `N` to skip to next level (useful for testing)
- **No need to start a server** - local web server already available
- **E2E tests**: `./run-tests.sh` (Playwright, parallel on Chromium + Firefox)
- **Headed tests**: `./run-tests.sh --headed` (sequential, visible browser)
- **Single browser**: `./run-tests.sh --browser chromium` (skip Firefox)

## Workflow
1. **Commit early, commit often** - After each validated fix or feature, commit with descriptive message
2. **Co-author commits** - Always include: `Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>`
3. **Defer doc updates** - Update docs only after changes are confirmed working
4. **Queue non-urgent items** - Use plan.md for tracking; don't interrupt current work

## Code Patterns

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
- `docs/ARCHITECTURE.md` - Technical decisions, patterns
- `docs/GAMEPLAY.md` - Game mechanics documentation

## French Ski Standards
- **Piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: ⚓ symbols with numbered posts

## Queued Items (from plan.md)
- Piste marker orientation fix (orange on right going downhill)
- Difficulty-based obstacles (fewer on easy pistes)
- Resort buildings on easy pistes (chalets near resort)
- Dialogue improvements (ESC dismiss, freeze groomer)
