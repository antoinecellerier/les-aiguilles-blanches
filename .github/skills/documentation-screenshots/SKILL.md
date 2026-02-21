---
name: documentation-screenshots
description: Captures game screenshots for README and documentation using Playwright. Use this when screenshots need updating after visual changes, new features, or level modifications.
---

## Documentation Screenshot Capture

Captures 6 screenshots at 1280×720 + 1 Open Graph image at 1200×630.

### Quick Start

```bash
./capture-screenshots.sh                    # All 7 images
./capture-screenshots.sh --only menu,og     # Specific captures
./capture-screenshots.sh --only gameplay    # Single capture
```

Requires dev server running (`./dev.sh`) and Playwright installed (`.venv/`).

### Screenshot Specifications

All screenshots are **1280×720** except OG which is **1200×630**.

| File | Scene | What to show |
|------|-------|-------------|
| `assets/screenshot-menu.png` | MenuScene | Night + light snow, title with mountain scenery |
| `assets/screenshot-trailmap.png` | LevelSelectScene | Trail map with full progress, colored run paths |
| `assets/screenshot-dailyruns.png` | DailyRunsScene | Daily runs mode with procedural generation |
| `assets/screenshot-gameplay.png` | GameScene | Groomer mid-piste with adjacent grooming passes, realistic HUD |
| `assets/screenshot-level.png` | LevelCompleteScene | Win screen with stars and stats |
| `assets/screenshot-ski.png` | SkiRunScene | Skier doing a 720 trick on a park kicker |
| `public/og-image.png` | MenuScene | Clear daytime menu (intentionally light weather) |

### Implementation

The capture script is `scripts/capture_screenshots.py`. Key techniques:

#### snowGrid grooming (gameplay & level complete)

Cells have `{ groomed, groomable, quality }` — **no `.tile` property**. The piste uses a DynamicTexture. To groom programmatically:

```javascript
const gs = window.game.scene.getScene('GameScene');
const texKey = 'snow_groomed' + gs.nightSfx;
// Set cell state AND stamp the visual texture
cell.groomed = true;
cell.quality = 0.8;
gs.groomedCount++;
gs.stampPisteTile(texKey, x, y);
```

Never use `cell.tile.setTexture()` — cells don't have tiles.

#### Menu weather control

Set `currentLevel=99` (beyond LEVELS array) so `init()` uses `randomMood`. Then monkey-patch `pickRandomMenuMood()`:

```javascript
menu.pickRandomMenuMood = () => ({ isNight: true, weather: 'light_snow' });
menu.randomMood = null;
menu.scene.restart();
```

#### Grooming pattern (gameplay)

Uses adjacent top-down passes with smooth sine-wave drift (like a real groomer). Pass width matches `GROOM_WIDTH` config (baseRadius=2 → 5 tiles). 3 full-height passes + 1 partial pass in progress. Groomer positioned at the tip of the partial pass.

#### Ski trick

Pause the scene after trick triggers — `update()` resets depth every frame via `yDepth()`. Pose skier airborne above kicker with mid-spin angle.

### Key Gotchas

- **`stampPisteTile(texKey, x, y)`** — only way to update piste visuals (DynamicTexture canvas)
- **Scene must be paused** for ski trick depth fix
- **HUD reads via GAME_STATE event** — set `fuel`/`stamina`/`timeRemaining` on GameScene, then wait ≥1 frame for HUD to update (don't pause immediately)
- **Setting `timeRemaining` too low** triggers instant game over on next frame
- **Tutorial (level 0)** has extensive dialogue — use level 1+ for clean screenshots
- **Snow particles** need ~5s warm-up delay before menu screenshot
- **OG image** uses separate browser context at 1200×630 — wrap in try/finally

### After Capturing

1. Verify images: 6 at 1280×720, OG at 1200×630
2. `git add assets/screenshot-*.png public/og-image.png`
3. Update README.md alt text if screenshot content changed significantly
