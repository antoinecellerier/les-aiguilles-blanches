---
name: documentation-screenshots
description: Captures game screenshots for README and documentation using Playwright. Use this when screenshots need updating after visual changes, new features, or level modifications.
---

## Documentation Screenshot Capture

Captures 4 screenshots at 1280×720 for the README: menu, gameplay, level complete, and ski trick.

### Prerequisites

- Vite dev server running (`npm run dev`)
- Playwright installed (`.venv/bin/activate`)

### Screenshot Specifications

All screenshots must be **1280×720** (matching `viewport={'width': 1280, 'height': 720}`).

| File | Scene | What to show |
|------|-------|-------------|
| `assets/screenshot-menu.png` | MenuScene | Title screen with mountain scenery and wildlife |
| `assets/screenshot-gameplay.png` | GameScene | Groomer mid-piste with visible grooming progress (30-50% coverage), HUD, obstacles |
| `assets/screenshot-level.png` | LevelCompleteScene | Win screen with realistic stats (coverage, time, stars, bonus objectives) |
| `assets/screenshot-ski.png` | SkiRunScene | Skier doing a trick on a park feature (kicker), with trick name text visible |

### Capture Techniques

#### Menu screenshot
Simply wait for MenuScene and screenshot. No interaction needed.

#### Gameplay screenshot
1. Start game → skip to level 4+ via `transitionToLevel()`
2. Dismiss dialogues programmatically
3. Auto-groom upper portion (~40-50%) via direct `snowGrid` manipulation for visible groomed/ungroomed contrast
4. Teleport groomer to the groomed/ungroomed boundary (~45% down)
5. Drive briefly (0.5-1s) while grooming for "in action" feel
6. Screenshot while Space (groom) is still held

```javascript
// Auto-groom pattern (run in page.evaluate)
const gs = window.game.scene.getScene('GameScene');
const midY = Math.floor(gs.level.height * 0.50);
for (let y = 0; y < midY; y++) {
    for (let x = 0; x < gs.level.width; x++) {
        const cell = gs.snowGrid[y]?.[x];
        if (cell?.groomable && !cell.groomed && Math.random() < 0.70) {
            cell.groomed = true;
            cell.tile.setTexture('snow_groomed');
            gs.groomedCount++;
        }
    }
}
// Teleport groomer to boundary
const path = gs.geometry?.pistePath?.[midY];
const centerX = path ? path.centerX * gs.tileSize : gs.groomer.x;
gs.groomer.setPosition(centerX, midY * gs.tileSize);
```

#### Level complete screenshot
1. Skip to a mid-game level (4-6)
2. Auto-groom to ~90% coverage
3. Set realistic time: `gs.timeRemaining = gs.level.timeLimit - 245` (~4 min used)
4. Set fuel usage: `gs.fuelUsed = 40`
5. Call `gs.gameOver(true)` to trigger win with realistic stats

#### Ski trick screenshot
1. Force ski mode: `localStorage.setItem('snowGroomer_skiMode', 'ski')`
2. Skip to level 3 (Air Zone — has park features)
3. Press `K` to auto-groom and launch SkiRunScene
4. Override `Math.random` to force a specific trick (e.g., 720):
   ```javascript
   const origRandom = Math.random;
   let callCount = 0;
   Math.random = function() {
       callCount++;
       if (callCount === 1) return 0.3; // index 1 = 720
       return origRandom();
   };
   setTimeout(() => { Math.random = origRandom; }, 2000);
   ```
5. Teleport skier to kicker hitbox edge, set `currentSpeed = 25`
6. Press ArrowDown, poll for `trickActive === true`
7. On trigger: **pause the scene** (`ski.scene.pause()`) — this stops `update()` which otherwise resets depth via `yDepth()`
8. Pose the skier:
   - Move up: `ski.skier.y -= tileSize * 1.5` (airborne above kicker)
   - Scale: `setScale(baseScale * 1.5)` (full trick scale)
   - Rotate: `setAngle(430)` (mid-720 spin)
   - Depth: `setDepth(150)` (renders above kicker — only works with scene paused)
9. Fix popup text: `setAlpha(1)`, reposition above skier, `setDepth(200)`

### Key Gotchas

- **Scene must be paused** for ski trick depth fix — `update()` resets depth every frame via `yDepth()`
- **`transitionToLevel()`** requires GameScene to already be active — start game first via menu
- **Tutorial (level 0)** has extensive dialogue — use level 1+ for clean screenshots
- **K shortcut** goes directly to SkiRunScene (not through LevelCompleteScene)
- **Ski run length** varies by level — tutorial is very short, level 3+ gives enough time
- **Trick text fades** via tween (1200ms) — pause scene immediately to keep it bright
- **Trick list** (kicker): `[360, 720, Backflip, Frontflip, Method]` — Math.random index 0-4
- **Skier texture** controlled by `snowGroomer_skiMode` localStorage key — set before starting game

### After Capturing

1. Verify all 4 images are 1280×720
2. `git add assets/screenshot-*.png`
3. Update alt text in README.md if screenshot content changed significantly
