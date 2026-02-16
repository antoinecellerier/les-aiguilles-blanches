# Architecture Documentation

## Overview

Les Aiguilles Blanches is a browser-based Phaser 3 game with retro SkiFree aesthetics.

The architecture prioritizes:

1. **Cross-browser compatibility** - Works in Firefox, Chrome, Safari, Edge
2. **Modular code organization** - Scene-based architecture for maintainability
3. **Progressive enhancement** - Works on all devices, enhanced where supported
4. **Accessibility first** - WCAG compliance built into the design

## Technology Stack

- **Framework**: Phaser 3.90.0
- **UI Library**: rexUI (phaser3-rex-plugins) for responsive layouts
- **Bundler**: Vite 7.x with TypeScript
- **Language**: TypeScript (all scenes and utilities)
- **Rendering**: Canvas (forced for Firefox compatibility)
- **Physics**: Arcade Physics
- **Input**: Built-in keyboard, gamepad, touch support
- **Scenes**: Modular scene-based architecture
- **Testing**: Vitest (unit), Playwright (E2E, parallel)

## Project Structure

```
snow-groomer/
├── index.html              # Entry point
├── assets/
│   └── favicon.svg         # Pixel-art favicon (groomer + mountain)
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript config
├── publish.sh              # Build script for deployment
├── publish-remote.sh       # Build and deploy to remote server via scp
├── build-desktop.sh        # Build game + launch/package Electron desktop app
├── dev.sh                  # Ensure dev server is running (starts or reuses)
├── setup.sh                # Download dependencies, set up dev environment
├── run-tests.sh            # Run Playwright tests (headless, parallel, both browsers)
├── test-update-check.sh    # Test version update check banner locally
├── electron/               # Optional desktop wrapper (Electron)
│   ├── main.cjs            # Electron main process — window management, display modes, IPC, xdg integration
│   ├── preload.cjs         # contextBridge API (quit, fullscreen, display mode, background audio)
│   ├── package.json        # Separate deps, electron-builder config (Linux/Win/Mac targets)
│   ├── generate-icon.cjs   # Generates app icon at all sizes natively (16–512px)
│   ├── afterPack.cjs       # Post-build cleanup (strips Vulkan SwiftShader, source maps)
│   └── icon.png            # Generated 512×512 app icon
├── src/
│   ├── main.ts             # Phaser init, game creation
│   ├── setup.ts            # Window globals initialization
│   ├── config/
│   │   ├── gameConfig.ts   # Game constants, colors, BALANCE tuning, DEPTHS layering
│   │   ├── levels.ts       # Level definitions
│   │   ├── localization.ts # i18n translations (uses {placeholder} syntax)
│   │   ├── storageKeys.ts  # Centralized localStorage key constants
│   │   └── theme.ts        # UI colors, fonts, button styles, world-element colors
│   ├── systems/
│   │   ├── WeatherSystem.ts  # Night overlay, headlights, weather particles
│   │   ├── HazardSystem.ts   # Avalanche zones, risk handling
│   │   ├── WildlifeSystem.ts # Animal spawning, flee AI, update loop
│   │   ├── LevelGeometry.ts # Piste path, cliff, access path geometry (pure data, no Phaser)
│   │   ├── MenuTerrainRenderer.ts # Menu background: sky, mountains, snow, trees, groomer
│   │   ├── MenuWildlifeController.ts # Menu wildlife AI, snowflakes, animal tracks
│   │   ├── ObstacleBuilder.ts # Obstacle placement, buildings, chalets
│   │   ├── ParkFeatureSystem.ts # Terrain park features: kickers, rails, halfpipe walls, zone scoring
│   │   ├── SlalomGateSystem.ts # Slalom gates: pole placement, pass/miss detection, feedback
│   │   ├── PisteRenderer.ts # Boundary colliders, cliff visuals, markers, trees, access paths
│   │   ├── WinchSystem.ts  # Winch anchors, cable rendering, attach/detach state
│   │   ├── AudioSystem.ts  # Web Audio API singleton, volume channels, gain chain
│   │   ├── AmbienceSounds.ts # Storm wind/gusts, night owl & wolf calls
│   │   ├── EngineSounds.ts # Engine rumble, snow crunch, grooming, winch, hazard, warning SFX
│   │   ├── MusicSystem.ts  # Chopin nocturne-style procedural piano music (singleton, 5 moods)
│   │   ├── SkiRunSounds.ts # Ski descent audio: wind rush, carving, brake, tricks, bump/wipeout
│   │   ├── UISounds.ts     # Procedural UI SFX (click, hover, cancel, toggle, level win/fail)
│   │   ├── VoiceSounds.ts  # Celeste-style voice gibberish (4 speaker profiles)
│   │   ├── WildlifeSounds.ts # Animal flee/alarm sounds (marmot, chamois, bird, bunny, bouquetin, fox)
│   │   └── GamepadDiagnostic.ts # Live button/stick/trigger readout for controller testing in settings
│   ├── types/
│   │   ├── global.d.ts           # Window/navigator type augmentations
│   │   └── GameSceneInterface.ts # Cross-scene event types (GAME_EVENTS)
│   ├── utils/
│   │   ├── accessibility.ts # A11y helpers, settings
│   │   ├── bonusObjectives.ts # Shared bonus objective evaluation and label formatting
│   │   ├── animalSprites.ts  # Procedural pixel art for alpine wildlife (6 species + perched/flying variants)
│   │   ├── animalTracks.ts   # Shared track/footprint drawing for menu & game scenes
│   │   ├── characterPortraits.ts # Procedural 12×12 pixel art portraits
│   │   ├── foxBehavior.ts    # Shared fox hunting/lunge decision logic + constants
│   │   ├── gamepad.ts      # Controller detection, button mapping
│   │   ├── gamepadMenu.ts  # Reusable gamepad menu navigation controller
│   │   ├── gameProgress.ts # Save/load game progress
│   │   ├── keyboardLayout.ts # Keyboard layout detection, key name utilities
│   │   ├── menuButtonNav.ts  # Reusable button selection/navigation controller
│   │   ├── focusNavigator.ts # Reusable keyboard/gamepad focus navigation with scroll
│   │   ├── keybindingManager.ts # Keyboard/gamepad binding load, save, rebind, reset
│   │   ├── overlayManager.ts # Modal overlay dialogs (simple + scrollable) with keyboard dismiss
│   │   ├── cameraCoords.ts  # World↔overlay coordinate conversions for scrollFactor(0) objects
│   │   ├── nightPalette.ts   # Night color transform, texture key lists, nightColor(), NIGHT_SUFFIX
│   │   ├── renderThrottle.ts # Passive FPS monitor with rolling average and throttle state detection
│   │   ├── resizeManager.ts # Debounced resize-restart handler for scenes
│   │   ├── sceneTransitions.ts # Centralized scene cleanup and transitions
│   │   ├── skiRunState.ts    # Shared groomed-tile state between GameScene and SkiRunScene
│   │   ├── skiSprites.ts     # Procedural pixel art for skier & snowboarder (20×28px, 8 variants each)
│   │   ├── storage.ts       # Type-safe localStorage helpers (getJSON/setJSON/getString/setString)
│   │   ├── touchDetect.ts    # Touch detection with Firefox desktop fallback
│   │   ├── fullscreen.ts     # Fullscreen toggle/query abstraction (browser + Electron IPC)
│   │   └── updateCheck.ts    # Checks for newer deployed version via version.json
│   ├── scenes/
│   │   ├── BootScene.ts    # Asset loading, texture generation
│   │   ├── MenuScene.ts    # Main menu, How to Play overlay
│   │   ├── LevelSelectScene.ts # Level select / replay (browse + star ratings)
│   │   ├── SettingsScene.ts # Language, a11y, gameplay prefs, display mode (desktop), controls, keyboard layout
│   │   ├── GameScene.ts    # Main gameplay
│   │   ├── HUDScene.ts     # UI overlay (parallel to GameScene)
│   │   ├── DialogueScene.ts # Character dialogue overlay
│   │   ├── PauseScene.ts   # Pause menu
│   │   ├── LevelCompleteScene.ts
│   │   ├── SkiRunScene.ts  # Post-grooming ski/snowboard descent (reward run)
│   │   └── CreditsScene.ts
├── tests/
│   ├── e2e/                # Playwright browser tests
│   └── unit-js/            # Vitest config validation
├── .github/
│   ├── agents/
│   │   └── code-health.agent.md  # Code audit custom agent
│   ├── skills/
│   │   ├── art-review/    # Art director visual review skill
│   │   ├── audio-review/  # Audio director review skill
│   │   ├── code-health/   # Auto-invoked code audit skill
│   │   ├── content-review/# Content writer review skill
│   │   ├── docs-update/   # Auto-invoked docs sync skill
│   │   └── game-design/   # Game design review skill
│   └── copilot-instructions.md   # Copilot custom instructions
└── docs/
    ├── ARCHITECTURE.md     # This file
    ├── GAMEPLAY.md         # Game mechanics
    ├── GAME_DESIGN.md      # Design pillars, difficulty curve, food economy
    ├── TESTING.md          # Test helpers, debugging
    ├── ART_STYLE.md        # Visual style guide
    └── ROADMAP.md          # Work queue, bugs, future features
```

### Scene Flow

```
BootScene → MenuScene → GameScene ⟷ HUDScene
     ↑           ↑↓           ↓         ↓
     │    LevelSelectScene DialogueScene │
     │           ↑            ↓         │
     │           │      PauseScene      │
     │           │            ↓         │
     │           └── LevelCompleteScene ┘
     │                   ↓          ↓
     │            SkiRunScene ⟷ HUDScene (ski mode)
     │                   ↓          │
     └──────────── CreditsScene ────┘
```

## Design Decisions

### 1. Canvas vs DOM for Game Rendering

**Decision**: Use HTML5 Canvas for game world, DOM for UI

**Rationale**:
- Canvas provides pixel-perfect control for retro SkiFree aesthetic
- DOM elements are more accessible for UI (screen readers, focus management)
- Hybrid approach: Canvas for gameplay, DOM overlays for menus/HUD

### 2. Input Handling

**Decision**: Distributed input polling — each scene reads its own inputs directly

**Design**:
- GameScene polls keyboard (`this.cursors`, `this.wasd`) and gamepad in `update()`
- HUDScene emits touch state via `GAME_EVENTS.TOUCH_INPUT` for GameScene and SkiRunScene to consume
- HUDScene supports `mode: 'groom' | 'ski'` — ski mode shows joystick + brake instead of D-pad + action buttons
- Gamepad button mappings are loaded via `loadGamepadBindings()` from localStorage
- No unified InputManager — input is handled per-scene for simplicity

### 3. Physical Key Codes for Keyboard

**Decision**: Use `event.code` (e.g., 'KeyW') not `event.key` (e.g., 'w')

**Rationale**:
- Works correctly on AZERTY, QWERTZ, and other keyboard layouts
- Physical position remains consistent regardless of language
- Arrow keys as universal fallback for all layouts

### 4. Localization System

**Decision**: Inline translations with `t()` function and dynamic placeholders

**Rationale**:
- No build step required
- Easy to add languages by extending TRANSLATIONS object
- Supports dynamic placeholders for key rebindings
- All 14 languages have complete translations
- Per-language files in `src/config/locales/` for maintainability

**Supported Languages** (ordered by ski market size):
- French (fr) - Primary locale, fallback source (home country)
- English (en) - US + Canada 78M skier visits
- German (de) - Austria + Germany 60M
- Italian (it) - 32M
- Japanese (ja) - 24M
- Swedish (sv) - 10.5M
- Norwegian Bokmål (nb) - 7-9M
- Finnish (fi) - 5-6M
- Korean (ko) - 4-5M
- Czech (cs) - 4-5M
- Polish (pl) - 4-5M
- Turkish (tr) - 2-3M
- Slovak (sk) - 2-3M
- Spanish (es) - 2M

**Font Stack**: `Courier New` with CJK fallbacks (`Noto Sans JP`, `Noto Sans KR`, `Hiragino Sans`, `Yu Gothic`, `Malgun Gothic`) for Japanese and Korean system font rendering.

**Dynamic Placeholders**:
- `{keys}` - Movement keys (WASD/ZQSD based on layout/rebinding)
- `{groomKey}` - Groom action key (respects rebinding)
- `{winchKey}` - Winch action key (respects rebinding)

```typescript
// In localization.ts
tutorialControls: "🎮 CONTROLS: Use {keys} or arrows to move."

// Replaced at runtime in DialogueScene.showDialogue()
text = text.replace('{keys}', getMovementKeysString());
text = text.replace('{groomKey}', getGroomKeyName());
```

**Dev-mode validation**: `t(key)` throws an `Error` in dev mode (`import.meta.env.DEV`) when a key is missing from all locales. This surfaces bad keys during E2E tests. Use `t(key, { probe: true })` when intentionally checking if a key exists (e.g., `showDialogue()` probes for `key + 'Touch'` / `key + 'Gamepad'` variants).

**Testing**: Unit tests in `tests/unit-js/localization.test.js` ensure all languages have all keys from FR (primary locale). Test fails if any translation is missing.

### 5. Accessibility Architecture

**Decision**: Multiple layers of accessibility support

**Implementation**:
```
Layer 1: Semantic HTML
├── Proper heading hierarchy
├── Button elements for actions
├── Form labels for inputs
└── Dialog roles for modals

Layer 2: ARIA Enhancement
├── aria-live regions for announcements
├── aria-label for canvas
└── role attributes for custom widgets

Layer 3: Visual Accessibility
├── CSS contrast(1.4) + saturate(1.3) filter on canvas for high contrast
├── SVG filters for colorblind modes
├── High contrast + colorblind filters compose via CSS filter chain
├── Reduced motion preference detection
└── Scalable UI (rem-based sizing)

Layer 4: Motor Accessibility
├── No simultaneous key requirements
├── Rebindable controls with localStorage persistence
├── Touch controls: Virtual D-pad + action buttons (mobile-first, show on first touch for desktop)
├── Multitouch: 3 active pointers for simultaneous D-pad + action
└── Gamepad support via standard Gamepad API
```

### 6. State Management

**Decision**: Single global gameState object

**Rationale**:
- Simple and debuggable
- Easy to serialize for save/load (future feature)
- All game logic references same source of truth

```javascript
const gameState = {
    currentLevel: 0,
    isPlaying: false,
    isPaused: false,
    groomer: { x, y, fuel, stamina, ... },
    snowGrid: [...],
    obstacles: [...],
    settings: { ... }
};
```

### 7. Level Data Structure

**Decision**: Declarative level definitions

**Rationale**:
- Easy to add/modify levels without changing logic
- Self-documenting level properties
- Enables procedural generation (future enhancement)

```javascript
{
    id: 1,
    nameKey: 'level_marmottesName',  // Localization key (descriptive, not numbered)
    taskKey: 'level_marmottesTask',
    difficulty: 'green',         // green/blue/red/black/park
    timeLimit: 60,               // seconds (auto-computed, see below)
    targetCoverage: 80,          // percentage
    width: 40,                   // tiles
    height: 60,
    hasWinch: false,
    isNight: false,
    weather: 'clear',            // clear/light_snow/storm
    obstacles: ['trees'],
    introDialogue: 'jeanPierreIntro',
    introSpeaker: 'Jean-Pierre'    // Character who delivers the intro
}
```

#### Time Limit Auto-Calculation

`computeTimeLimit()` in `levels.ts` derives time limits from level geometry. Individual levels can set `timeLimitOverride` to bypass the formula.

```
timeLimit = ceil( (tilesToGroom / groomRate) × navOverhead × difficultyScale + pathTime + winchOverhead )
```

- **groomRate** = `GROOMER_SPEED / TILE_SIZE × GROOM_WIDTH / TILE_SIZE` ≈ 14 tiles²/s
- **navOverhead** = 0.3 (empirically calibrated so skilled play uses ~40-60% of time)
- **difficultyScale**: green=1.3, blue=1.0, park=1.5, red=0.9, black=0.75
- **pathTime** = 10s per access path
- **winchOverhead** = 15s for winch levels
- **Minimum floor** of 60s per level
- Rounded to nearest 30s

Speed run bonus targets are auto-set to 60% of the computed timeLimit.

Timer thresholds are proportional: red at 30% remaining, warning sounds at 15% remaining.

To tune: adjust `navOverhead` (overall tightness), `scales` (per-difficulty), or `floors` (minimums). `console.table` output at startup shows all computed values. `[level-complete]` logs show actual completion times.

**Calibration reference** (experienced player, commit 013293e):

| Level | Computed limit | Actual completion | Usage |
|-------|---------------|-------------------|-------|
| Marmottes (green) | 60s | 34-35s | 57% |
| Tube (park) | 60s | 24s | 40% |
| Verticale (black/winch) | 90s | 27s | 30% |
| Col Dangereux (red/winch) | 90s | 40s | 44% |
| Tempête (black/winch) | 90s | 48s | 53% |

Target: skilled play should use 30-60% of time budget. New players get ~2× headroom.

### 8. Rendering Pipeline

**Decision**: Camera-centered rendering with tile-based snow grid

```
Frame Update:
1. clear()           - Draw sky gradient
2. drawMountains()   - Static background
3. drawSnowGrid()    - Tile-based snow with groomed state
4. drawObstacles()   - Trees, rocks, buildings
5. drawGroomer()     - Player vehicle
6. drawWeatherEffects() - Snow particles
7. drawNightOverlay() - Visibility reduction + headlights
```

**Night Overlay System:**
- Dark overlay (0x000022, 70% opacity) covers entire viewport with `setScrollFactor(0)` (screen-space)
- Uses `worldToOverlay()` / `overlayFullScreen()` from `src/utils/cameraCoords.ts`
- World-to-overlay draw-space: `drawPos = worldPos - cam.scrollX/Y` (zoom handled by camera)
- Full-screen fill inverts camera origin+zoom transform to cover all pixels
- Overdraw by 10px margin to prevent edge gaps during resize transitions
- Directional flood lights rendered as layered circles, radii scaled by zoom
- Front lights: Wide 108° spread, 5 tile range (warm white)
- Rear lights: 5 tile range (slightly warm tint)
- Light direction tracks groomer velocity
- Lights originate from front/back of sprite, not center

**Camera System**:
- Camera centered on groomer
- Offset calculated each frame
- All world objects drawn relative to camera

### 9. Collision System

**Decision**: Simple AABB (Axis-Aligned Bounding Box) collision

**Rationale**:
- Sufficient for tile-based game
- Performant for large number of obstacles
- Easy to debug visually

```javascript
function checkCollision(groomer, obstacle) {
    return groomer.x < obstacle.x + obstacle.width &&
           groomer.x + groomer.width > obstacle.x &&
           groomer.y < obstacle.y + obstacle.height &&
           groomer.y + groomer.height > obstacle.y;
}
```

### 10. Food/Buff System

**Decision**: Time-based buffs with visual indicators

**Implementation**:
- Buffs stored as object with remaining duration
- Decremented each frame
- Visual indicator in HUD when active
- Multiple buffs can stack

```javascript
groomer.buffs = {
    speed: 45.5,        // seconds remaining
    coldResist: 120.0
};
```

## Performance Considerations

### Canvas Renderer Performance Model

The game uses Canvas renderer (`Phaser.CANVAS`) because WebGL causes black screens on some configurations. On Canvas, **the dominant cost is native pixel copy** (`drawImage` → `memcpy`), not JavaScript execution.

**Firefox profiler** on L9 (storm, heaviest level — 51s capture, 68 FPS):

| Category | CPU % | Notes |
|----------|-------|-------|
| `__memcpy_avx_unaligned_erms` | 69% | Native pixel blitting from `drawImage()` — irreducible |
| `__syscall_cancel_arch` | 10% | Vsync idle wait — indicates CPU headroom |
| `ImageCanvasRenderer` | <1% | JS wrapper around drawImage |
| JavaScript (game logic, physics, audio) | 0.2% | Negligible — 56 samples in 51s |
| GC | 0% | No garbage collection pressure |

Chrome DevTools on the same L9 session (47s capture, 68 FPS / 100% sim speed):

| Category | Time | % | Notes |
|----------|------|---|-------|
| Idle | ~36.5s | 77% | Chrome has massive headroom |
| Scripting | 7,247ms | 15% | Phaser main loop + canvas state |
| Painting | 2,953ms | 6% | `Commit` (compositing) + `drawImage` |
| System | 670ms | 1.4% | OS-level overhead |
| Rendering | 110ms | 0.2% | Layout/style recalc |
| C++ GC | ~1,300ms | 2.7% | Minor garbage collection |

Bottom-up self-time: `Commit` 28.5%, `drawImage` 19.7%, canvas state ops (`save`/`setTransform`/`restore`/`setColor`) 3-4% each. Game code (`stampPisteTile`, `ImageCanvasRenderer`) rounds to 0.0%.

**Firefox is the binding constraint** — Chrome runs L9 at 77% idle while Firefox runs at 10% idle. Both hit 68 FPS but Firefox has far less headroom. Always profile in Firefox first.

**Key insight:** Reducing per-pixel work is impossible without hiding content. The lever is **reducing the number of `drawImage` calls** — fewer objects on the display list means fewer function calls, less depth sorting, and fewer `willRender()` checks per frame. This is why DynamicTexture consolidation yields such large FPS gains even when the total pixel count is similar.

### Optimization Techniques (in order of impact)

1. **DynamicTexture consolidation** — Paint many small objects onto a single DynamicTexture at level start. One `drawImage` call replaces hundreds. Used for: off-piste background (tiled pattern via `createPattern('repeat')`), piste snow tiles, access road tiles, background trees/rocks, piste-edge trees. L9 went from 876 Images to 65 (-93%). **Caveat:** Only beneficial when consolidating many small textures into one. Consolidating a few large Rectangles (which are cheap `fillRect` calls) into a full-screen DynamicTexture is a net negative on Firefox — the `drawImage` call on a large backing canvas triggers expensive `memcpy` (35% CPU) that far exceeds the cost of individual `fillRect` calls. See "DynamicTexture size tradeoff" below
2. **Graphics → texture baking** — Graphics objects replay their command buffer every frame on Canvas. Static decorations (trees, rocks, cliffs, animal tracks) are pre-generated as textures in BootScene via `generateTexture()`. L9 Graphics went from 1,588 to ~97 (-94%). Menu scenes apply the same pattern: MenuTerrainRenderer bakes trees/groomer/ground lines, MenuWildlifeController bakes animal sprites and uses pre-baked track textures from BootScene. Bird state changes use `setTexture()` instead of `clear()`+`drawBird()`. Textures are cleaned up on scene shutdown to avoid key collisions on re-entry
3. **Night texture pre-generation** — Pre-generates `_night` variant textures at boot via canvas `multiply` composite (darkened + blue-shifted, `BALANCE.NIGHT_BRIGHTNESS` 0.3, `BALANCE.NIGHT_BLUE_SHIFT` 0.15). All systems resolve textures with `nightSfx` suffix (`'_night'` or `''`) and transform Graphics colors via `nc: ColorTransform` (identity for day, `nightColor` for night). Headlight is a small 256×256 DynamicTexture positioned in world coords on the groomer — replaces the old full-screen DT that cost 6-8 FPS on Firefox per frame
4. **Frost vignette skip on night levels** — Frost vignette is invisible behind night darkening; skipped on night levels to save ~3 FPS
5. **Frost vignette small texture** — Baked once at 128×128 via `generateTexture()`, displayed stretched to screen via `setDisplaySize()`. Phaser skips `drawImage` entirely at alpha=0 (renderFlags). No rebuild on resize — just reposition. CSS `box-shadow: inset` alternative was tested but cost -5.4 FPS (worse) on Chromium; full-size texture was equivalent in FPS but used ~50× more memory
6. **Camera culling** — `cullOffscreenImages()` (`src/utils/cullImages.ts`) hides world-space Images outside viewport (+ margin) using origin-aware display-bounds checks. Only rechecked when camera moves a full tile (hysteresis). Used by both GameScene and SkiRunScene. ~770 of 1,220 images (63%) culled in SkiRunScene, ~1,200 in GameScene L9. `lastCullBounds` is reset in `handleResize()` to force immediate recull after viewport changes
7. **Extended background sizing** — Use `max(screenWidth, screenHeight) × 1.3` for both dimensions, ensuring coverage in any orientation without recreating the DynamicTexture on resize
8. **HUD resize debounce** — 300ms + 10px threshold prevents rapid scene restarts from mobile resize events

### Canvas Renderer Constraints

- **`setTint()` does NOT work** — use pre-generated texture variants via `setTexture()` instead
- **Graphics objects are expensive** — they re-render from their command list every frame. Always prefer `generateTexture()` for static content
- **`Graphics.clear()` + redraw per frame** — use only for dynamic content (night overlay headlights, winch cable)
- **TileSprite re-tiles every frame** but is still cheaper than a world-sized DynamicTexture on Firefox (see TileSprite→DT regression below)
- **Display list iteration** — Phaser iterates ALL game objects for depth sort and `willRender()` every frame. Reducing object count has outsized impact vs reducing per-object pixel size
- **DynamicTexture `.update()` is unnecessary on Canvas** — the Canvas renderer reads the source canvas directly, so painting to the context is immediately reflected

#### Why Not WebGL?

The game uses `Phaser.CANVAS` because WebGL is both incompatible and slower:

1. **GameScene crashes on WebGL** — `stampPisteTile`, night overlay, and access road painting use `DynamicTexture.context` (Canvas 2D API), which returns `null` under WebGL. Fixing this would require rewriting all DynamicTexture painting to use WebGL-compatible Phaser APIs.
2. **WebGL uses more CPU than Canvas** — A/B tested on Chromium (headed, 5 runs, Welch's t-test):

| Scene | Canvas (% CPU) | WebGL (% CPU) | Δ | Significant? |
|-------|---------------|---------------|---|---|
| Menu (idle) | 721 ±8 | 800 ±11 | **+79 (+11%)** | **yes (p<0.005)** |
| GameScene | 779–869 | crashes | — | — |

WebGL's GPU-native `drawImage` and DPR scaling advantages don't help here — the game's draw calls are lightweight (small textures, simple quads), so WebGL's per-draw-call overhead (state changes, shader programs, buffer uploads) exceeds Canvas 2D's simpler `drawImage` path.

#### Rectangle vs Image Tradeoff (fillRect vs drawImage)

Firefox and Chromium have opposite performance profiles for Rectangles vs baked Images:

- **Rectangles** use `fillRect` — no backing canvas, no memcpy, nearly free per call on Firefox
- **Images** (from `generateTexture()`) use `drawImage` — per-call overhead even for small textures

A/B testing (headed, 5 runs, Welch's t-test α=0.05) on menu stepped mountains (140 Rectangles → 7 Images):

| Version | Chromium | Firefox |
|---------|----------|---------|
| Rectangles (baseline) | 865.8% ±72.9 | 47.2% ±4.1 |
| Baked Images | 720.6% ±11.9 (-145, **p<0.005**) | 52.1% ±0.7 (+4.8, **p≈0.03**) |

Chromium benefits from fewer display objects (multi-process overhead), but Firefox regresses because `fillRect` is cheaper than `drawImage` for its Canvas implementation. **Keep mountains as Rectangles** for cross-browser neutrality.

**Rule of thumb:** Only bake to `generateTexture()` when replacing Graphics objects (which replay command buffers every frame). Rectangles are already optimal — they're just `fillRect` calls with no backing bitmap.

#### DynamicTexture Size Tradeoff

DynamicTexture consolidation is a net win when replacing **many small Images** (hundreds of `drawImage` calls → one), but a net **loss** when replacing **a few cheap primitives** (Rectangles) with one large DynamicTexture. Firefox profiling confirmed this on menu scenes:

- **Before (Rectangles + baked mountain Images)**: 3 sky Rectangles rendered as `fillRect` (no backing canvas, no memcpy) + 7 mountain Images (small textures). ~15% CPU idle.
- **After (full-screen DynamicTexture)**: Sky + far mountains painted onto a 1024×631 DynamicTexture. Firefox spent 35% of samples in `__memcpy_avx_unaligned_erms` under `CanvasRenderingContext2D.drawImage` — the large backing canvas triggers a full-resolution pixel copy every frame. ~40% CPU idle.

**Rule of thumb:** Only consolidate into a DynamicTexture when eliminating ≥10 `drawImage` calls. A `Rectangle` is just a `fillRect` with no source bitmap — it's always cheaper than a DynamicTexture of equivalent screen area. For backgrounds composed of a few solid-color bands, keep them as Rectangles.

#### TileSprite → DynamicTexture Regression

⚠️ The GameScene TileSprite→DynamicTexture replacement (`f59221d`) **doubled Firefox CPU** (70→140%, p<0.005) while having no significant effect on Chromium. This was validated with A/B testing (headed mode, 5 runs per commit, psutil process-tree CPU, Welch's t-test α=0.05):

| GameScene optimization | Chromium (% CPU) | Firefox (% CPU) | FF significant? |
|------------------------|------------------|-----------------|-----------------|
| Baseline (pre-opt) | 792.1 ±8.6 | 70.5 ±3.4 | — |
| Camera culling | 830.0 ±72.3 (+38, n.s.) | 66.6 ±1.0 (-3.9) | **yes (p≈0.03)** |
| Snow tiles → DT | 790.9 ±14.0 (-1, n.s.) | 71.9 ±1.5 (+1.4) | no |
| Access road → DT | 801.1 ±12.4 (+9, n.s.) | 70.7 ±1.8 (+0.2) | no |
| Night overlay → DT | 802.1 ±12.8 (+10, n.s.) | 71.6 ±0.8 (+1.1) | no |
| **TileSprite → DT** | 784.8 ±16.3 (-7, n.s.) | **139.7 ±7.1 (+69)** | **yes (p<0.005)** 🔴 |
| Trees/rocks baked | 791.5 ±21.4 (-1, n.s.) | 138.8 ±20.2 (+68) | **yes (p<0.005)** 🔴 |
| Current HEAD | 769.7 ±15.3 (-22, sig) | 152.6 ±12.7 (+82) | **yes (p<0.005)** 🔴 |

The only statistically significant improvement is camera culling on Firefox (-3.9%). The DynamicTexture replacements for small tile groups (snow, access road, night overlay) are within noise. The TileSprite→DT replacement is a clear regression on Firefox. **Both TileSprite→DT (`f59221d`) and tree/rock DT consolidation (`eb913a3`) have been reverted** — backgrounds now use TileSprite again and trees/rocks are individual Image objects.

#### Multi-Level CPU Benchmarks (L1 / L8 Night+Frost / L10 Storm+Frost)

Cross-level validation confirms TileSprite→DT regression scales with scene complexity. Headed mode, 3 runs per commit per browser per level, psutil process-tree CPU, Welch's t-test α=0.05:

**L1 Clear Day (Firefox)**

| Optimization step | Firefox (% CPU) | Δ vs baseline | Significant? |
|-------------------|-----------------|---------------|--------------|
| Baseline (pre-opt) | 73.1 ±5.5 | — | — |
| Camera culling | 67.1 ±3.8 | -6.0 | no (p=0.20) |
| Snow tiles → DT | 78.2 ±10.7 | +5.1 | no (p=0.51) |
| **TileSprite → DT** | **135.8 ±2.2** | **+62.8** | **yes (p=0.001)** 🔴 |
| Trees/rocks baked | 156.4 ±4.7 | +83.3 | **yes (p<0.001)** 🔴 |
| Current HEAD | 158.8 ±19.1 | +85.7 | **yes (p=0.011)** 🔴 |

**L8 Night + Frost (Firefox)**

| Optimization step | Firefox (% CPU) | Δ vs baseline | Significant? |
|-------------------|-----------------|---------------|--------------|
| Baseline (pre-opt) | 143.4 ±0.9 | — | — |
| Camera culling | 129.4 ±8.4 | -14.0 | no (p=0.10) |
| Snow tiles → DT | 143.3 ±8.9 | -0.1 | no |
| **TileSprite → DT** | **162.3 ±4.6** | **+18.9** | **yes (p=0.016)** 🔴 |
| Trees/rocks baked | 158.4 ±9.7 | +15.0 | no (p=0.11) |
| Current HEAD | **186.2 ±1.7** | **+42.8** | **yes (p<0.001)** 🔴 |

**L10 Storm + Frost (Firefox)**

| Optimization step | Firefox (% CPU) | Δ vs baseline | Significant? |
|-------------------|-----------------|---------------|--------------|
| Baseline (pre-opt) | 148.2 ±8.5 | — | — |
| Camera culling | 149.8 ±3.7 | +1.6 | no |
| Snow tiles → DT | 150.7 ±10.6 | +2.5 | no |
| TileSprite → DT | 149.9 ±11.2 | +1.7 | no (p=0.84) |
| Trees/rocks baked | 160.7 ±1.1 | +12.5 | no (p=0.12) |
| Current HEAD | **188.3 ±16.0** | **+40.1** | **yes (p=0.030)** 🔴 |

**Chromium multi-level:** TileSprite→DT significant only on L8 (+42.7, p=0.02). Snow tiles→DT significant on L10 (+47.6, p=0.04). L1 all within noise. Current HEAD significant on L10 (+41.9, p=0.04).

**Key findings:**
- TileSprite→DT doubles Firefox L1 CPU (+63%) — consistent with L1-only test
- L8 night+frost has high baseline (143%) due to frost overlay and dark alpha blending; TileSprite→DT adds +19% on top
- L10 storm: TileSprite→DT itself isn't significant here (storm particle overhead dominates), but cumulative HEAD is +40%
- Current HEAD is significantly regressed on all levels and both browsers at L8/L10
- **Reverting TileSprite→DT is the single highest-impact fix**, especially for L1 and L8

### A/B Performance Testing Methodology

Cross-browser CPU benchmarking using psutil process-tree sampling:

1. **Headed Playwright** — launch with `headless=False` to include GPU/compositor cost
2. **psutil tree CPU** — sum `cpu_times().user + .system` across the browser PID and all child processes via `psutil.Process(pid).children(recursive=True)`
3. **Browser PID** — `browser._impl_obj._connection._transport._proc.pid`
4. **5-second warmup** — let the scene fully initialize before measuring
5. **10-second measurement window** — sample CPU before/after, compute `(cpu_delta / wall_time) * 100`
6. **5 runs per commit per browser** — compute mean, stddev, 95% CI (t-crit=2.776 for n=5)
7. **Welch's t-test** — two-sample, α=0.05, for pairwise significance vs baseline
8. **Git checkout per commit** — fresh vite server restart between commits

Scripts: `~/.copilot/session-state/.../files/cpu_ab_test_v4.py` (menu), `cpu_gamescene_test.py` (game L1), `cpu_multilevel_test.py` (game L1/L8/L10 with frost)

Note: Chromium reports >100% CPU because psutil sums across all processes (GPU, renderer, utility). Firefox has fewer processes so reports single-core percentages.

#### CPU vs rAF FPS Correlation (Full Benchmark)

Comprehensive benchmark measuring **both** CPU (psutil) and **real framerate** (rAF frame counting, not JS probes) across 6 commits × 4 scenarios × 2 browsers × 5 runs = 240 measurements.

**Firefox — L2 clear (day, no effects):**

| Commit | CPU % | rAF FPS | ΔCPU | ΔFPS | CPU sig | FPS sig |
|--------|-------|---------|------|------|---------|---------|
| baseline (pre-opt) | 143±5 | 50 | — | — | — | — |
| camera culling | 131±3 | 56 | -11 | +5.6 | ✅ p≈0.005 | ✅ p≈0.03 |
| snow tiles → DT | 104±9 | 56 | -39 | +6.0 | ✅ p≈0.005 | p≈0.05 |
| **TileSprite → DT** | **152±6** | **46** | **+9** | **-4.5** | p≈0.05 | p≈0.12 |
| trees/rocks baked | 157±4 | 44 | +14 | -5.9 | ✅ p≈0.005 | ✅ p≈0.03 |
| current HEAD (reverted) | 111±6 | 56 | -31 | +5.9 | ✅ p≈0.005 | p≈0.05 |

**Firefox — L8 night+frost:**

| Commit | CPU % | rAF FPS | ΔCPU | ΔFPS | CPU sig | FPS sig |
|--------|-------|---------|------|------|---------|---------|
| baseline (pre-opt) | 141±7 | 38 | — | — | — | — |
| camera culling | 123±14 | 51 | -18 | +13.0 | p≈0.05 | ✅ p≈0.03 |
| snow tiles → DT | 146±4 | 46 | +5 | +7.9 | p≈0.25 | ✅ p≈0.03 |
| **TileSprite → DT** | **157±8** | **26** | **+17** | **-11.6** | **✅ p≈0.03** | **✅ p≈0.005** |
| trees/rocks baked | 160±8 | 25 | +20 | -13.1 | ✅ p≈0.005 | ✅ p≈0.005 |
| current HEAD (reverted) | 151±9 | 29 | +11 | -9.1 | p≈0.12 | ✅ p≈0.005 |

**Firefox — L10 storm+frost:**

| Commit | CPU % | rAF FPS | ΔCPU | ΔFPS |
|--------|-------|---------|------|------|
| baseline (pre-opt) | 153±7 | 32 | — | — |
| camera culling | 143±7 | 38 | -10 | +5.5 |
| snow tiles → DT | 135±8 | 41 | -18 | +8.7 |
| TileSprite → DT | 154±9 | 31 | +0 | -1.2 |
| trees/rocks baked | 159±8 | 29 | +6 | -3.4 |
| current HEAD (reverted) | 152±10 | 36 | -1 | +3.6 |

**Key findings:**

1. **TileSprite→DT was purely wasteful on Firefox.** CPU went UP and rAF FPS went DOWN. The earlier JS-measured "FPS improvement" was a measurement artifact — reduced JS overhead made `game.loop.actualFps` report higher values, but the browser was actually rendering fewer frames.

2. **CPU and FPS correlate well** in most cases: when CPU goes down, FPS goes up. The Chromium menu is an exception — CPU dropped 146% but FPS also dropped 18 (a display list reduction lowered both GPU work and canvas throughput).

3. **Camera culling is the best optimization** — consistently lowers CPU AND raises FPS on both browsers.

4. **Snow tiles → DT is beneficial on Firefox** (CPU -39%, FPS +6 on L2; CPU -18%, FPS +8.7 on L10) — it was correctly kept.

5. **Current HEAD (with reverts) is near-optimal for Firefox**: L2 at 111% CPU / 56 FPS vs baseline 143% / 50 FPS (−22% CPU, +12% FPS). L8 night+frost still lags at 29 FPS — the night overlay + frost effects are the bottleneck, not the optimizations we control.

6. **Chromium FPS is capped around 18-28 FPS** regardless of optimization, with 700-850% CPU. The multi-process overhead dominates; optimizations mainly affect Firefox.

**Divergence cases flagged:**
- Chromium Menu: all commits show LESS CPU with FEWER frames. This is expected — the baseline had ~60 Graphics objects replaying 6,268 commands which burned massive CPU but were fast to composite. Baking them into fewer Images reduced both CPU and compositor throughput in Chromium's multi-process model.
- L2/L10 Chromium: some commits show MORE CPU with MORE frames — normal positive correlation (spending more CPU to render more frames).

### Performance Journey (L9 Storm, Firefox)

Previous JS-measured FPS data with updated CPU/rAF correlation data:

| Milestone | rAF FPS | FF CPU % | Status |
|-----------|---------|----------|--------|
| Baseline (before optimization) | ~32 (L10) | 153% | |
| Camera culling for off-screen objects | ~38 | 143% (-10) | ✅ kept |
| Snow tiles → DynamicTexture | ~41 | 135% (-18) | ✅ kept |
| TileSprite → DynamicTexture | ~31 | 154% (+0) | ❌ reverted |
| Tree/rock consolidation into DynamicTextures | ~29 | 159% (+6) | ❌ reverted |
| Current HEAD (with reverts) | ~36 | 152% (-1) | ✅ final |

#### Night Effect Isolation Benchmark (Firefox L8)

Isolated each night-specific effect by disabling it at runtime and measuring rAF FPS + CPU:

| Variant | rAF FPS | ΔFPS | CPU % | Insight |
|---------|---------|------|-------|---------|
| Full night (baseline) | 25 | — | 140±11% | All effects on |
| No headlights (darkness only, no arc() calls) | 25 | −0.3 | 134±14% | **Headlight arcs are free** |
| No frost overlay | 25 | +0.0 | 139±8% | Frost is free (static texture, alpha only) |
| No weather particles | 24 | −0.8 | 136±9% | Particles are negligible |
| **No night overlay** (darkness + headlights removed) | **31** | **+6.5** | 140±13% | **DT blit is the bottleneck** |
| Clear day (L2 reference) | 52 | +27.0 | 134±5% | 2× faster without night |

**Key findings:**

1. **The 360 headlight `arc()` calls are essentially free** — removing them gained 0 FPS. The per-frame cost is the full-screen DynamicTexture blit itself (`clearRect` + `fillRect` + compositing), not the drawing operations. Same Firefox `memcpy` pattern as the TileSprite→DT regression.

2. **Frost overlay is free** — static texture with per-frame `setAlpha()` only. No optimization needed. (Note: tested at frost level 0, start of level — cost at high frost levels TBD.)

3. **Weather particles are negligible** — Phaser's particle system is efficient.

4. **Eliminating the night overlay gains ~6.5 FPS** (25→31), a 26% improvement. The remaining gap to clear day (31→52) is from level geometry differences (L8 has more objects than L2).

5. **Optimization approach**: ✅ Replaced with pre-generated `_night` variant textures (canvas `multiply` composite at boot) and a small 256×256 headlight DT in world coords. Eliminates the full-screen DT redraw entirely. See "Night texture pre-generation" in Optimization Techniques.

#### Frost + Night Cross-Level Benchmark (Firefox)

Tested frost at 70% (forced) and night overlay independently across L7/L9/L10:

| Variant | rAF FPS | CPU % | Notes |
|---------|---------|-------|-------|
| **L7 night only** (no frost native) | 24 | 136±12% | Night overlay active |
| **L7 no night overlay** | 32 | 141±6% | **+8 FPS from removing night DT** |
| **L9 storm+frost=70** (all on) | 29 | 135±11% | Storm + frost, no night |
| **L9 storm+frost=0** (no frost) | 33 | 132±10% | **+4 FPS from removing frost at 70%** |
| **L10 night+frost=70** (all on) | **19** | 140±11% | Heaviest: night + frost + weather |
| **L10 night, no frost** | **22** | 145±5% | **+3.3 FPS from removing frost** |
| **L10 no night, frost=70** | **23** | 141±12% | **+4.0 FPS from removing night DT** |
| **L10 no night, no frost** | **27** | 146±9% | **+8.3 FPS from removing both** |

**Additional findings:**

6. **Frost at 70% costs ~3-4 FPS** — L9 storm: 29→33 (+4 FPS), L10 night: 19→22 (+3.3 FPS). The earlier test at frost=0 showed no cost because `setAlpha(0)` skips the blit. At 70% alpha, the full-screen Image compositing adds a measurable per-frame cost.

7. **Frost overlay is invisible on night levels** — the light icy blue vignette (`0xc8e8ff` at 35% opacity) is completely swallowed by the night overlay's dark fill. On L10 (which has both night + frost), players pay 3 FPS for an invisible effect.

8. **Night overlay removal is consistent** — L7: +8 FPS (24→32), L8: +6.5 FPS (25→31), L10: +4 FPS (19→23 with frost, 22→27 without). The full-screen DynamicTexture per-frame blit costs 4-8 FPS on Firefox.

9. **Combined: removing both night + frost on L10 gains +8.3 FPS** (19→27, +44%). The effects are additive — each full-screen overlay blit adds independent compositing cost.

**Frost on night levels — ✅ resolved:** Frost vignette is now skipped on night levels, recovering ~3 FPS on L10.

#### Frost Overlay Alternative Approaches (Chromium A/B)

Tested alternatives to the full-size baked Image frost overlay on L9 storm at 70% frost. Interleaved runs, 4 samples each.

| Approach | FPS | Δ vs baseline | Notes |
|----------|-----|---------------|-------|
| **Full-size Image** (1024×768 texture) | 37.8 ± 0.3 | baseline | Baked via `generateTexture()`, resize rebuilds |
| **128×128 Image** (stretched to screen) | 37.3 ± 1.0 | -0.5 (n.s.) | Same FPS, ~50× less memory, no resize rebuild |
| **CSS box-shadow: inset** (DOM overlay) | 32.2 ± 0.8 | **-5.4** | Browser compositor more expensive than Canvas drawImage |
| **Frost OFF** (alpha=0, same scene) | 37.6 ± 0.6 | -0.0 (n.s.) | Phaser skips drawImage at alpha=0 (renderFlags) |

**Findings:**
- Phaser's `renderFlags` optimization means alpha=0 images are **free** — no drawImage call
- At alpha>0, Canvas `drawImage` cost scales with **destination** pixels, not source. 128×128 → 1024×768 stretch costs the same as native 1024×768
- CSS `box-shadow: inset` triggers browser repaint compositing every frame, which is **slower** than Canvas drawImage on Chromium
- The 128×128 approach was adopted: simpler code (no resize rebuild needed), less memory, identical FPS

#### Night Texture Optimization Results (Firefox A/B)

Same-session, back-to-back A/B comparison. Old code uses full-screen DynamicTexture for night darkness + headlights; new code uses pre-darkened `_night` textures + 256×256 headlight-only DT. 10s × 5 runs per level.

| Level | Old FPS | New FPS | Delta | Improvement |
|-------|---------|---------|-------|-------------|
| L2 day (control) | 57.2 | 57.9 | +0.7 | +1% (noise) |
| **L8 night** | **34.4** | **39.8** | **+5.4** | **+16%** |
| **L10 night** | **27.0** | **33.0** | **+6.0** | **+22%** |

CPU usage also dropped: L8 215%→206%, L10 235%→216%.

**Key takeaways:**
1. Day levels unaffected (control stable) — confirms gains are from night system changes only
2. Night levels gain +5-6 FPS by eliminating the full-screen DT blit
3. The 256×256 headlight DT still has *some* cost vs no DT at all (previous "no overlay" measured 31 FPS on L8 vs new 40 FPS — the smaller DT is much cheaper but not free)
4. Combined with frost skip, L10 went from 19 FPS (original) → 33 FPS (+74% total improvement across all optimizations)

### Profiling Guide

To re-profile if performance regresses:

**Firefox** (binding constraint — least headroom):
1. Open Firefox DevTools → Performance tab → Start recording
2. Play L9 (storm level, heaviest) for ~30-60 seconds
3. Stop recording, switch to Call Tree → Invert call stacks
4. Look at the top self-time entries:
   - `__memcpy_avx_unaligned_erms` > 60% is normal (pixel copy)
   - `__syscall_cancel_arch` > 5% means CPU has headroom (vsync wait)
   - `TileSpriteCanvasRenderer` appearing means a TileSprite was reintroduced — replace it
   - `GraphicsCanvasRenderer` > 5% means un-baked Graphics objects — use `generateTexture()`
   - Full-screen DynamicTexture per-frame blit costs 6-8 FPS on Firefox Canvas (`memcpy` bottleneck) — avoid camera-sized DTs
   - JavaScript > 2% means game logic needs optimization
5. Check the Categories panel: DOM should be ~100%, JavaScript < 1%

**Chrome** (more headroom, better for isolating JS bottlenecks):
1. Open DevTools → Performance tab → Record
2. Play L9 for ~30-60 seconds, stop recording
3. Check Summary tab: Idle should be >70%, Scripting <20%, Painting <10%
4. Bottom-up tab: `Commit` + `drawImage` should dominate self-time
5. If Scripting % rises significantly, use Bottom-up to find the JS function responsible

**Both browsers:**
- Use `window.game.__perfStats` in console for live object counts (imageCount, graphicsCount, etc.)
- Run multiple captures to isolate outliers from external factors (background processes, thermal throttling)

## Centralized Theme System

All UI styling references `src/config/theme.ts` (`THEME` constant) for consistent colors, fonts, and spacing across scenes.

### Color Hierarchy
- **`buttonCTA`** (green #228b22): Primary action buttons — "Start Game", "Resume", "Next Level", "Retry"
- **`buttonPrimary`** (blue #2d5a7b): Navigation/secondary buttons — "Menu", "Settings", "How to Play"
- **`buttonDanger`** (red #CC2200): Destructive actions — "Back" from settings
- **`toggleActive`** (dark green #1a5a1a): Active toggle/selection state

### Rule: "Green = Go"
The CTA color is reserved for the primary forward action in every scene. This teaches players that green always means "continue playing."

### Scenes Using THEME
All scenes import THEME: MenuScene, SettingsScene, DialogueScene, HUDScene, PauseScene, LevelCompleteScene, CreditsScene.

### Adding New Colors
Add both hex number (`0x...`) and string (`'#...'`) variants to THEME. Hex numbers are used for Phaser Graphics/Rectangle fills; strings are used for Text styles.

## Retro 3D Bevel Pattern

Dialogue boxes use a 3D bevel effect inspired by '90s game UIs (SimCity 2000, Theme Hospital):

```typescript
bevelLight = 0x555555  // top + left edges (highlight)
bevelDark  = 0x111111  // bottom + right edges (shadow)
panelFill  = 0x1a1a1a  // opaque background
bevelWidth = Math.max(2, Math.round(2 * uiScale))
```

A thin accent stripe (1px, THEME color) runs inside the top bevel for visual polish.

## HUD: Visor Style

The HUD uses a "visor" pattern: a full-width semi-transparent dark strip across the top of the screen. All HUD text sits inside this strip — the dark background provides contrast against snow/terrain. A thin cyan accent line marks the bottom edge.

### Three-Row Horizontal Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Blue Piste – Le Chamois     🔗 WINCH          03:58        │  Row 1
│ 🔴██████ 100%  🟢██████ 100%  ██████|████ 52%             │  Row 2
│ ★ No tumbles ✓   ★ Fuel ≤60% 52%                          │  Row 3
└─────────────────────────────────────────────────────────────┘
```

- **Row 1**: Level name (left), winch status (center), timer (right, large font)
- **Row 2**: Fuel bar + stamina bar + coverage progress bar (all horizontal, with colored dot identifiers and percentage labels)
- **Row 3**: Bonus objectives (horizontal, fixed-width columns) — empty/hidden if no bonuses
- **Coverage bar**: Gray border, dark bg, white fill (turns green when ≥ target). Gold vertical target marker at target % position. Fills remaining width after fuel+stamina, capped at 200×uiScale for ultrawide
- **Winch status**: Green "🔗 WINCH" text in row 1, visible only when winch is active
- **Touch buttons**: Pixel art icons on circular buttons (rake = groom, anchor = winch)
- **No permanent winch hint**: Winch instructions are delivered via Jean-Pierre dialogue on the first winch level

### Accessibility Adaptation

When high-contrast or colorblind modes are active:
- Canvas receives CSS `contrast(1.4) saturate(1.3)` filter, boosting game world visibility
- Visor background alpha increases from 0.55 to 0.80
- All visor text gains a black stroke outline for readability
- Bar borders brighten from `0x555555` to `0x999999`
- Colorblind mode replaces colored dots with text labels ("F"/"S") so users don't rely on red/green color differentiation
- Bottom accent line doubles in thickness
- High contrast and colorblind filters compose: `canvas.style.filter` chains both when enabled simultaneously

### Responsive Layout

Scaling: `baseScale = max(0.6, min(2.0, min(width/1024, height/768)))`. On high-DPI mobile (dpr > 1.5), boosted ×1.2.

| Mode | Condition | Behaviour |
|------|-----------|-----------|
| Compact | `isNarrow` (width < 600) or `isShort` (height < 500) | Shorter bars (60px vs 80px), tighter spacing, bonus objectives flash 4s then fade |
| Very narrow | width ≤ 360 + touch | Skip button repositioned left to avoid crowding pause/fullscreen |
| Joystick cap | width < 600 | Joystick radius capped to `(width - actionBtnSpace - padding*2 - 10) / 2` to prevent overlap with action buttons |

### Pause/Fullscreen Pill Buttons

On touch devices, pause (`||`) and fullscreen (`[]`) buttons sit below the visor with pill-shaped dark backgrounds (black, alpha 0.55) for contrast against any terrain or lighting condition.

## Dialogue System

### Dynamic Box Height
The dialogue box has a base height of 130px. On narrow screens where text wraps to many lines, `displayNextDialogue()` measures the full text height and calls `resizeDialogueBox()` to grow the box, repositioning the bottom bevel and continue indicator.

### Auto-Pagination
When dialogue text exceeds 30% of screen height, `splitTextToPages()` breaks it into multiple pages at sentence boundaries. Each page is shown sequentially with the `>>` continue indicator. This prevents text from overflowing the dialogue box on small screens.

### Character Portraits
Each speaker gets a colored portrait box with their initial letter:
- Jean-Pierre / Tutorial: `0x2d5a7b` (blue)
- Marie: `0x7b2d5a` (purple)
- Thierry: `0x5a7b2d` (green)
- Émilie: `0x7b5a2d` (brown)

### Speaker Assignment
Each level specifies its intro speaker via `introSpeaker` in the Level config. `DialogueScene.showDialogue(key, speaker?)` accepts an optional speaker parameter. Resolution order: explicit parameter → `DIALOGUE_SPEAKERS` map → default (Jean-Pierre). Valid speakers: `'Jean-Pierre'`, `'Émilie'`, `'Thierry'`, `'Marie'`.

### Typewriter Text Effect
Dialogue text reveals character-by-character at 25ms intervals:
- First click/Enter/tap during typing → skips to full text
- Second click → advances to next dialogue line
- `fullText` property holds the complete string (public, used by tests)
- Timer cleaned up in `hideDialogue()` and `shutdown()`
- Continue indicator `>>` appears only after typewriter finishes

### Phaser Text `font:` Shorthand Bug
**Never use the `font:` shorthand property** (e.g., `font: 'bold 16px Courier New, monospace'`). Phaser misparses the font family as the fontSize. Always use explicit `fontFamily`, `fontSize`, `fontStyle` properties separately.

## Responsive UI Design

### DPI-Aware Layout

All UI scenes use DPI-aware calculations to ensure proper sizing on high-density displays:

```typescript
const dpr = window.devicePixelRatio || 1;
const logicalWidth = width / dpr;  // CSS pixels
const logicalHeight = height / dpr;
```

### SettingsScene Layout

The Settings scene uses rexUI Sizer components for responsive layout:

- **Single column mode**: Activated when `logicalWidth < 500`, `aspectRatio > 1.5` (portrait), or `logicalHeight < 400` (landscape phones)
- **Two column mode**: Used on wider landscape displays with sufficient height
- **FixWidthSizer**: Auto-wraps content when it exceeds available width
- **Origin positioning**: Use `origin: 0` for top-left anchoring
- **Font sizing**: Scales with viewport width and DPR for readability
- **Touch targets**: Minimum touch target calculated from viewport

**rexUI Components Used:**
- `Sizer`: Vertical/horizontal layout containers
- `FixWidthSizer`: Auto-wrapping for buttons and toggles

**Key Patterns:**
```typescript
// Set origin for correct positioning
this.rexUI.add.sizer({
  x: padding,
  y: padding,
  width: contentWidth,
  orientation: 'vertical',
  origin: 0  // Top-left origin
});

// FixWidthSizer needs explicit width to wrap
this.rexUI.add.fixWidthSizer({
  width: this.contentWidth,  // Must set for wrapping
  space: { item: 4, line: 4 }
});
```

### MenuScene Scaling

Menu uses responsive scaling based on viewport. On landscape phones where buttons overflow the available vertical space, the Fullscreen button is automatically dropped. Title background width is clamped to `width - 20` to prevent overflow on narrow screens.

```typescript
const scaleByHeight = Math.max(0.7, Math.min(height / 768, 1.5));
const scaleByWidth = Math.max(0.5, Math.min(width / 1024, 1.5));
const dprBoost = Math.sqrt(Math.min(dpr, 2));
const scaleFactor = Math.min(scaleByHeight, scaleByWidth) * dprBoost;
```

### Resize & Orientation Handling

Phaser's `Scale.RESIZE` mode handles most window resize events automatically. However, Firefox dev tools responsive mode and some mobile orientation changes don't reliably fire `window.resize` events.

**Solution:** `main.ts` installs three redundant resize detectors:
1. **`ResizeObserver`** on `#game-container` — most reliable, catches all container size changes
2. **`window.addEventListener('resize')`** — fallback for older browsers
3. **`orientationchange`** listener — deferred reads (200ms + 500ms) since viewport dimensions update after the event

All three are **debounced at 150ms** to avoid interfering with scene transitions (which use `setTimeout(100ms)` internally). The debounced handler reads container dimensions and calls `game.scale.resize()` only when they actually changed.

Canvas CSS `width: 100% !important; height: 100% !important` prevents visual gaps while Phaser's pixel resolution catches up.

The game config uses percentage-based sizing:
```typescript
scale: {
  mode: Phaser.Scale.RESIZE,
  width: '100%',
  height: '100%',
}
```

Scenes listen for resize events and restart. **HUDScene uses debounced resize** (300ms + 10px threshold) to prevent rapid restarts from mobile viewport jitter (URL bar show/hide, soft keyboard). Other scenes use `requestAnimationFrame` guard:

```typescript
// HUDScene — debounced resize (mobile-critical)
private handleResize(): void {
  if (!this.cameras?.main) return;
  const { width, height } = this.cameras.main;
  if (Math.abs(width - this.lastResizeWidth) < 10 &&
      Math.abs(height - this.lastResizeHeight) < 10) return;
  if (this.resizeTimer) clearTimeout(this.resizeTimer);
  this.resizeTimer = setTimeout(() => {
    if (this.scene.isActive()) {
      this.scene.restart({ level: this.level, gameScene: this.gameScene });
    }
  }, 300);
}

// Other scenes — requestAnimationFrame guard
private handleResize(): void {
  if (this.resizing) return;
  this.resizing = true;
  requestAnimationFrame(() => {
    this.scene.restart();
    this.resizing = false;
  });
}

shutdown() {
  this.scale.off('resize', this.handleResize, this);
}
```

**Scene resize behavior:**
| Scene | Strategy |
|-------|----------|
| MenuScene | Restart scene |
| SettingsScene | Restart scene (preserves navigation state) |
| GameScene | Update camera zoom/bounds (no restart) |
| HUDScene | Debounced restart (300ms, 10px threshold) |
| LevelCompleteScene | Restart scene (preserves result data via `scene.settings.data`) |
| DialogueScene | Debounced restart (300ms, 10px threshold) — saves/restores dialogue queue |
| PauseScene | Debounced restart (300ms, 10px threshold) — preserves `levelIndex` |
| CreditsScene | Debounced restart (300ms, 10px threshold) |

**GameScene zoom strategy:** Uses diagonal ratio (`sqrt(w²+h²)`) of current vs original viewport to compute zoom. This is orientation-independent — rotating the device preserves perceived world scale. Zoom is clamped to [0.5, 1.5].

**Groomer depth on portrait:** On portrait devices with virtual touch controls, HUDScene emits `GAME_EVENTS.TOUCH_CONTROL_HEIGHT` with the control area height. GameScene sets `CAMERA_MIN_OFFSET_Y` so the groomer never hides behind touch buttons.

**Key lesson:** Always consult Phaser documentation before implementing framework-level features. Manual `scale.resize()` calls caused persistent bugs that were resolved by following the built-in `Scale.RESIZE` pattern. The only exception is the ResizeObserver/orientationchange handler in `main.ts`, which calls `game.scale.resize()` explicitly to compensate for events Phaser's built-in handler misses.

### Scene Lifecycle & Cleanup

Every scene that registers event listeners **must** clean them up in `shutdown()`:

```typescript
create() {
  this.scale.on('resize', this.handleResize, this);
  this.input.keyboard?.on('keydown-ESC', this.onEscape, this);
}

shutdown(): void {
  this.scale.off('resize', this.handleResize, this);
  this.input.keyboard?.removeAllListeners();
  this.tweens.killAll();
  this.children.removeAll(true);
}
```

**All scenes have shutdown cleanup:**
| Scene | Cleans up |
|-------|-----------|
| MenuScene | Scale resize listener |
| SettingsScene | Scale resize listener |
| GameScene | Scale resize, gamepad listeners, game.events listeners, timers |
| HUDScene | Scale resize, custom events, gameScene refs |
| LevelCompleteScene | Scale resize listener, inputReady timer |
| DialogueScene | Scale resize listener, keyboard listeners, tweens, children |
| PauseScene | Scale resize listener, keyboard listeners, inputReady timer |
| CreditsScene | Scale resize listener, keyboard listeners, tweens, children |

### Input Ready Delay Pattern

**Problem**: Held keys from the previous scene can trigger immediate actions in the new scene. For example, holding SPACE to groom in GameScene would immediately activate the first button when LevelCompleteScene appears, causing unintended navigation.

**Solution**: Use an `inputReady` flag with a 300ms delay before accepting input:

```typescript
export default class YourScene extends Phaser.Scene {
  private inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;

  init(data: any): void {
    // Reset flag on scene init
    this.inputReady = false;
  }

  create(): void {
    // Guard all input handlers with inputReady check
    this.input.keyboard?.on('keydown-SPACE', () => { 
      if (this.inputReady) this.activate(); 
    });
    
    // Delay accepting input
    this.inputReadyTimer = this.time.delayedCall(300, () => { 
      this.inputReady = true; 
    });
  }

  shutdown(): void {
    // Clean up timer
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
  }
}
```

**When to use**: Apply this pattern to scenes that:
- Accept immediate action input (ENTER, SPACE, ESC)
- Can be entered while a user is holding keys (e.g., end-of-level transitions)
- Have toggle/resume behavior that could loop (e.g., ESC to pause → ESC to resume)

**Currently implemented in**: LevelCompleteScene, PauseScene

## Browser Compatibility Notes

### Firefox Touch Detection

Firefox desktop does NOT expose `ontouchstart` or set `navigator.maxTouchPoints > 0` for touchscreen laptops, unlike Chrome/Edge. This breaks both Phaser's built-in `Device.input.touch` detection and standard browser touch checks.

**Solutions applied:**
1. **Phaser config**: `input.touch: true` force-enables `TouchManager` so Phaser always registers touch event listeners (harmless on non-touch devices)
2. **Application code**: `src/utils/touchDetect.ts` provides `hasTouch()` (capability check), `touchConfirmed()` (runtime-only check), and `onTouchAvailable(cb)` (fires callback on first real `touchstart` event). All scenes import these instead of inline checks
3. **Scene guards**: `onTouchAvailable` callbacks must guard against stale scene references with `this.scene?.manager && this.scene.isActive()` since the callback fires globally and the scene may have been shut down

### Firefox Gamepad Triggers

Firefox reports Xbox LT/RT as axes (indices 4, 5) instead of buttons (6, 7). Use `isGamepadButtonPressed()` from `src/utils/gamepad.ts` — it checks `pad.buttons[i]?.pressed` first, then falls back to the axis value. Never read `pad.buttons[i]?.pressed` directly for gameplay bindings.

### Firefox Rendering

Firefox requires simplified Phaser configuration to render correctly. Key findings:

1. **Use Canvas renderer**: `type: Phaser.CANVAS` — WebGL crashes GameScene (Canvas 2D API deps) and uses 11% more CPU even where it works (see "Why Not WebGL?")
2. **Avoid scale options**: `scale.mode` and `scale.autoCenter` can cause black screen
3. **Avoid `pixelArt: true`**: Causes black screen on Firefox Canvas. Use per-texture `source[0].scaleMode = Phaser.ScaleModes.NEAREST` instead (see BootScene, PisteRenderer)
4. **Avoid callbacks**: `preBoot` and `postBoot` callbacks break rendering
5. **Avoid Graphics methods**: `fillTriangle()` and `lineBetween()` may cause issues
6. **No runtime tinting**: `setTint()` / `clearTint()` are silently ignored by the Canvas renderer. Use pre-generated texture variants via `setTexture()` instead (see steep zone textures in BootScene)

### Per-Texture Nearest-Neighbor Scaling

For crisp retro pixel art without `pixelArt: true` (which breaks Firefox):

1. **Generated textures**: After `generateTexture()`, set `textures.get(key).source[0].scaleMode = Phaser.ScaleModes.NEAREST`
2. **DynamicTextures**: After `addDynamicTexture()`, set `dt.source[0].scaleMode = Phaser.ScaleModes.NEAREST` AND `dt.context.imageSmoothingEnabled = false`
3. **Exception**: Night headlight DynamicTexture (256×256) keeps default smoothing (light glow gradient)

Working Firefox configuration:
```javascript
const config = {
    type: Phaser.CANVAS,
    parent: 'game-container',
    width: 1024,
    height: 768,
    backgroundColor: '#2d5a7b',
    render: { pixelArt: false, antialias: true, roundPixels: true },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    input: { gamepad: true, touch: true },
    scene: [...]
};
```

**Do NOT include in Firefox:**
- `scale: { mode: ..., autoCenter: ... }`
- `render: { pixelArt: true }`
- `callbacks: { preBoot: ..., postBoot: ... }`

**Safe to include:**
- `render: { pixelArt: false, antialias: true, roundPixels: true }`
- `physics` configuration
- `input` configuration  
- `backgroundColor`

### HiDPI / DPR-Aware Rendering (Not Viable)

We investigated making the Canvas renderer DPR-aware for crisp rendering on HiDPI displays
and browser zoom > 100%. **Conclusion: not viable with Canvas 2D renderer due to performance cost.**

**Approaches tried and why they fail:**

1. **CSS `image-rendering: pixelated/crisp-edges`** — Black screen on Firefox Canvas renderer.

2. **`Scale.NONE` + `zoom: 1/dpr`** — Game coordinates become physical pixels instead of CSS pixels.
   All layout code (text positioning, camera bounds, touch controls) assumes CSS-pixel coordinates.
   Would require multiplying every coordinate constant by DPR throughout the codebase.

3. **Per-frame canvas inflation via `PRE_RENDER_CLEAR`** — Setting `canvas.width = cssW * dpr` each
   frame with `ctx.scale(dpr, dpr)`. Fails because Phaser's `batchSprite` uses `ctx.setTransform()`
   (absolute, not relative) which wipes the DPR scale. Game renders in a tiny corner of the canvas.

4. **Canvas width/height property interceptors + `ctx.setTransform` monkey-patch** — Intercept
   `canvas.width` setter to inflate backing store by DPR (getter returns CSS value for Phaser math).
   Patch `ctx.setTransform(a,b,c,d,e,f)` to multiply entire matrix by DPR, prepending a uniform scale.
   `ctx.transform()` NOT patched (it's multiplicative, compounds correctly with DPR-scaled base).
   **This approach works correctly** — rendering is crisp, coordinates stay in CSS pixels, input works.
   **But the performance cost is prohibitive**: at DPR 1.76 the canvas has 3.1× more pixels, and
   `drawImage` (used by `batchSprite` for every sprite) bottlenecks on native pixel copy (memcpy).
   Firefox profiler showed 34% CPU in `__memcpy_avx_unaligned_erms` under `drawImage`. At DPR 3
   (the cap), it would be 9× more pixels — unplayable.

**Why this is a Canvas 2D limitation:** WebGL has native DPR support via `gl.viewport()` with no
per-sprite cost — the GPU handles pixel scaling in hardware. However, WebGL is not viable for this game: it crashes GameScene (Canvas 2D API dependencies in DynamicTexture painting) and benchmarks 11% higher CPU than Canvas on Chromium even for simple scenes (see "Why Not WebGL?" above).

**Recommendation:** Accept native-resolution rendering. The slight blur at high browser zoom (240%+)
is acceptable. WebGL migration is not recommended — the performance penalty and extensive refactoring outweigh the HiDPI benefit.

## Scene Lifecycle Management

### Scene Transitions (Critical)

Phaser scene reuse can cause texture corruption when scenes are stopped and relaunched repeatedly. This manifests as:
```
TypeError: can't access property "cut", data is null
```

**Problem:** When `scene.stop()` is called, the scene instance is preserved but paused. When `scene.launch()` is called again, the SAME instance is reused with potentially corrupted texture references.

**Solution:** Use the centralized `resetGameScenes()` utility from `src/utils/sceneTransitions.ts`:

```javascript
import { resetGameScenes } from '../utils/sceneTransitions';

// In any scene that needs to restart game scenes:
resetGameScenes(this.game, 'GameScene', { level: nextLevel });
```

The utility stops all registered game scenes, removes them, re-adds fresh instances, and starts the target scene. Game scenes are registered at boot via `registerGameScenes()` in `main.ts`.

**Key Points:**
- All game scene cleanup is centralized — no duplicate scene lists
- Registration pattern in `main.ts` avoids circular imports between scenes and utility
- Always pass explicit data to prevent stale `sys.settings.data` reuse
- Uses `setTimeout(100ms)` to allow render frame to complete
- **Must stop() before remove()**: Phaser's `remove()` calls `sys.destroy()` which does NOT call `shutdown()`. Without an explicit `stop()`, `game.events` listeners registered in `create()` leak and fire on the next scene instance
- **`transitionPending` guard** prevents double-fire. Reset is deferred via the target scene's `'update'` event after `game.scene.start()` so that at least one Phaser update frame passes — this ensures `captureGamepadButtons()` in new scenes' `create()` properly captures held buttons before new transitions are allowed
- Callers should also guard locally (e.g., `isNavigating` flag in LevelCompleteScene, `isSkipping` in HUDScene, `isTransitioning` in GameScene) as defense-in-depth

### Stale Scene Data (Critical)

`scene.start(key)` **without data reuses the PREVIOUS init data** from `sys.settings.data`. Always pass explicit data:

```javascript
// BAD: reuses previous data (e.g., stale returnTo='PauseScene')
this.scene.start('SettingsScene');

// GOOD: explicitly clear/set data
this.scene.start('SettingsScene', { returnTo: null });
```

### SceneManager vs ScenePlugin API

`game.scene` (SceneManager) and `this.scene` (ScenePlugin) have different APIs:
- `game.scene.start(key)` — starts a scene WITHOUT stopping the caller
- `this.scene.start(key)` — starts a scene AND stops the calling scene
- `this.scene.launch(key)` — starts a scene without stopping caller (ScenePlugin only)
- `game.scene.launch()` — **DOES NOT EXIST** (throws TypeError)

After stopping self, use `game` reference (captured before stop) for subsequent operations:
```javascript
const game = this.game;
this.scene.stop('MyScene');
game.scene.start('OtherScene', data);  // Safe: uses SceneManager
```

### Zombie Resize Handlers

`this.scale` is the game-global Scale Manager shared across ALL scenes. `scale.off('resize', handler, this)` in `shutdown()` may fail to properly remove the listener. Guard all resize handlers:

```javascript
private handleResize(): void {
    if (this.resizing || !this.scene.isActive()) return;  // Required guard
    // ...
}
```

### Cleanup in shutdown()

All scenes should implement `shutdown()` for proper cleanup. **Critical**: remove `game.events` listeners BEFORE destroying children — otherwise global events can fire on destroyed objects between the two calls, crashing Phaser's entire update loop.

**Register shutdown BEFORE any early-return branches** — `this.events.once('shutdown', this.shutdown, this)` must run for ALL code paths. If it's inside a conditional branch (e.g. `if (mode === 'ski') { ...; return; }`), the main path never registers cleanup and `game.events` listeners leak (+N per level transition).

```javascript
create() {
    // Register shutdown cleanup FIRST, before any conditional returns
    this.events.once('shutdown', this.shutdown, this);

    if (this.mode === 'special') {
      this.setupSpecialMode();
      return; // shutdown listener already registered above
    }

    // Normal setup...
    this.game.events.on(GAME_EVENTS.MY_EVENT, this.handler, this);
}

shutdown() {
    // 1. Remove global event listeners FIRST
    this.game.events.off(GAME_EVENTS.MY_EVENT, this.handler, this);
    // 2. Then destroy everything
    this.tweens.killAll();           // Stop all animations
    this.time.removeAllEvents();      // Cancel all timers
    this.children.removeAll(true);    // Destroy all game objects
}
```

In `update()`, always check `.active` on game objects before calling methods (e.g. `setText`, `setFillStyle`) — a race between scene stop and update can cause `setText` on a destroyed Text to throw, killing the game loop.

### Gamepad Menu Navigation

All menu scenes use `createGamepadMenuNav()` from `src/utils/gamepadMenu.ts` to handle D-pad/stick navigation, A-confirm, B-back with debounce and phantom-press prevention:

```javascript
import { createGamepadMenuNav } from '../utils/gamepadMenu';

this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
    onNavigate: (dir) => this.buttonNav.navigate(dir),
    onConfirm: () => this.buttonNav.activate(),
    onBack: () => this.goBack(),
    isBlocked: () => this.overlayOpen,  // Optional: suppress during overlays
});
this.gamepadNav.initState();  // Capture current button state to prevent phantom presses

// In update():
this.gamepadNav.update(delta);
```

### Gamepad Phantom Press Prevention (Gameplay Scenes)

Non-menu scenes (GameScene, HUDScene) use `captureGamepadButtons()` from `src/utils/gamepad.ts` to snapshot button state at scene init. This prevents a button held from a previous scene from triggering immediate actions:

```javascript
import { captureGamepadButtons, isGamepadButtonPressed } from '../utils/gamepad';

// In create():
const padState = captureGamepadButtons(this, [this.gamepadBindings.pause]);

// In update() — only act if button was NOT already held at scene start:
if (isGamepadButtonPressed(pad, binding) && !padState[binding]) { ... }
```

### Menu Button Navigation

All menu scenes use `createMenuButtonNav()` from `src/utils/menuButtonNav.ts` to manage button selection state, keyboard navigation, and hover styling. Preset stylers handle common patterns:

```javascript
import { createMenuButtonNav, ctaStyler } from '../utils/menuButtonNav';

this.buttonNav = createMenuButtonNav(
  this.menuButtons, this.buttonCallbacks, ctaStyler(this.buttonIsCTA),
  { canNavigate: () => !this.overlayOpen },
);

// Hook into keyboard and pointer events:
this.input.keyboard?.on('keydown-UP', () => this.buttonNav.navigate(-1));
btn.on('pointerover', () => this.buttonNav.select(i));
```

Available stylers: `ctaStyler(isCTA[])` (green CTA / blue standard), `simpleStyler()` (uniform blue), or pass a custom `ButtonStyler` function for scene-specific visuals (e.g. MenuScene's shadow+arrow pattern).

### Cross-Scene Communication (GAME_EVENTS)

GameScene and HUDScene communicate via Phaser's global event emitter (`game.events`) using typed events defined in `src/types/GameSceneInterface.ts`. No scene holds a direct reference to another scene.

| Event | Direction | Payload | Frequency |
|-------|-----------|---------|-----------|
| `GAME_STATE` | GameScene → HUD | fuel, stamina, coverage, winchActive, levelIndex, tumbleCount, fuelUsed, winchUseCount, pathsVisited, totalPaths | Every frame |
| `TIMER_UPDATE` | GameScene → HUD | seconds remaining | Every second |
| `TOUCH_INPUT` | HUD → GameScene | left, right, up, down, groom, winch | Every frame |
| `PAUSE_REQUEST` | HUD/Pause → GameScene | — | On button press |
| `RESUME_REQUEST` | Pause → GameScene | — | On button press |
| `SKIP_LEVEL` | HUD → GameScene | nextLevel | On button press |
| `START_SKI_RUN` | HUD → GameScene | — | On button press |
| `TOUCH_CONTROLS_TOP` | HUD → GameScene | topEdge (screen px) | On touch control layout |
| `ACCESSIBILITY_CHANGED` | Settings → HUD | — | On setting change |
| `VOLUME_CHANGED` | Settings → AudioSystem | — | On setting change |
| `MUTE_CHANGED` | Settings/Pause → AudioSystem | — | On setting change |
| `DIALOGUE_DISMISSED` | Dialogue → GameScene | — | On ESC/B press |

Always clean up listeners in `shutdown()` with `this.game.events.off(GAME_EVENTS.*)`.

GameScene constructs the `GAME_STATE` payload via `buildGameStatePayload()` — a single method used by both the per-frame emit in `update()` and the final emit in `gameOver()`. HUDScene uses the bonus stats to evaluate bonus objectives in real-time inside the visor, with irreversible failure tracking for `no_tumble` and `speed_run`.
#### Touch Controls Camera Offset

On narrow/portrait devices (aspect ≤ 1.2), virtual touch controls overlap the play area. HUDScene emits `TOUCH_CONTROLS_TOP` with the top edge of the controls in screen pixels. GameScene caches this as `touchControlsHeight` (viewport-independent) and calls `recalcTouchFollowOffset()` to adjust the camera:

1. **Follow camera (large world)**: Applies a negative `followOffset.y` so the groomer renders above the controls. Camera bounds are extended downward by `|followOffset.y|` via `updateCameraBoundsForOffset()`.
2. **Static camera, world fits**: Re-centers the world in the effective area (`screenH - touchControlsHeight`) without enforcing `CAMERA_MIN_OFFSET_Y` (which would push the world into the controls).
3. **Static → follow transition**: When the world barely fits above controls (slack < `CAMERA_MIN_OFFSET_Y`), switches to follow mode with groomer tracking offset. This ensures the groomer stays visible on tall levels (e.g. L7 La Verticale) in portrait.

`handleResize()` uses `effectiveHeight` (accounting for touch controls) for the static vs follow decision. `recalcTouchFollowOffset()` is called both from `onTouchControlsTop()` (when HUD emits) and from `handleResize()` (when viewport changes before HUD restarts).

**Dialogue positioning**: DialogueScene listens for `TOUCH_CONTROLS_TOP` and repositions above controls via `onTouchControlsChanged()`. The handler kills any running show tween before setting Y to prevent the tween from overriding the repositioned value.

### GameScene System Extraction

GameScene delegates to extracted subsystems in `src/systems/`:

- **WeatherSystem** — Night overlay rendering, headlight cones, weather particle emitters, accessibility filters
- **HazardSystem** — Avalanche zone creation with irregular polygon shapes (randomized ellipse vertices), risk tracking, avalanche trigger sequence. Zones avoid piste path, cliffs, and each other via inter-zone spacing. Uses broad-phase rect + precise ray-casting `pointInPolygon()` for hitbox. Depth-layered above terrain (`CLIFFS+0.5`) with signage at `SIGNAGE`/`MARKERS` depth.
- **WildlifeSystem** — Decorative animal spawning, flee-from-groomer AI, per-level species config. Uses shared utilities: `foxBehavior.ts` for fox hunting decisions, `animalTracks.ts` for track drawing, `animalSprites.ts` for procedural sprites (including side-view flying and perched bird variants). Animals avoid buildings/cliffs (non-climbing species), grooming erases tracks, and tracks are bootstrapped at level start.
- **LevelGeometry** — Pure data system (no Phaser dependency). Generates piste path, access path zones/curves, and cliff segments from level config. Provides query methods `isInPiste()`, `isOnCliff()`, `isOnAccessPath()` used by rendering and physics. `getCliffAvoidRects()` returns bounding rects for avalanche zone placement. On levels with avalanche hazards, cliffs are limited to top/bottom bands (outside 15-65% height).
- **ObstacleBuilder** — Creates obstacles (rocks, trees), interactable buildings (restaurant, fuel station), and decorative chalets. Tracks building footprints for wildlife collision avoidance.
- **ParkFeatureSystem** — Terrain park feature placement and zone scoring. Arranges features in parallel lines (jump line with kickers, jib line with rails) at fixed positions on park levels, with approach/landing zones that override the default fall-line alignment for grooming quality scoring. Renders line corridors with subtle lane tinting and paint marks at takeoff/landing spots. Halfpipe mode narrows the groomable area with banked walls. Driving onto a feature triggers instant fail (forgiving hitbox at ~70% of visual size).
- **SlalomGateSystem** — Slalom gate placement and pass/miss detection for ski reward runs. Generates evenly-spaced red/blue pole pairs along the piste with alternating lateral offset. Detection triggers when skier Y enters the gate row range; hit = between poles, miss = outside. Visual feedback: ✓/✗ floating text, missed poles dim to 30% alpha. Returns `'hit'`/`'miss'`/`null` per frame for audio integration. Non-punitive — display-only results on level complete. Configured per-level via `slalomGates: { count, width }` in levels.ts.
- **PisteRenderer** — All piste visual rendering: boundary colliders, cliff edge visuals, piste markers, forest trees, access path roads/poles, steep zone indicators, and extended background. Returns physics groups for GameScene collision setup.
- **WinchSystem** — Winch anchor creation, cable rendering (taut/slack), attach/detach state. Exposes `isTaut()` query used by movement and resource systems.
- **AudioSystem** — Singleton managing all game audio via Web Audio API. Handles AudioContext lifecycle (autoplay resume with `webkitAudioContext` Safari fallback, visibility suspend/resume with cleanup on reset), six volume channels (master, music, sfx, engine, voice, ambience) routed through a gain node chain with a DynamicsCompressor limiter (threshold −6dB) before destination, and localStorage persistence for volume settings. The engine channel controls continuous motor sounds (idle rumble, snow crunch, grooming blade) separately from other SFX. Provides `onReady()` callback registration for deferred audio initialization.
- **MusicSystem** — Singleton (`getInstance()`) procedural Chopin nocturne-style piano music inspired by Op. 9 No. 1 (B♭ minor) and No. 2 (E♭ major). Five moods (menu/E♭ major, calm/A♭ major, night/B♭ minor, intense/C minor, credits/E♭ major) with distinct keys, tempos, and melodic contours. **Polyphonic voices**: counter-melody (diatonic thirds below, probabilistic per mood), ornamental echoes (neighbor-tone turns on longer notes), distant cadential echoes (octave-up repeat), Picardy third coloring (night mood). **Section form**: night mood plays A(2×)→B(D♭ major, octave doubling sotto voce, no ornaments)→A'(1×)→repeat. **Phrase dynamics**: sine-shaped volume swell + scaled harmony/echo density. **Triplet bass**: 12/8 subdivision for nocturne accompaniment (all moods except intense). **Grand piano synthesis**: string-pair detuning (±2.5 cents on fundamental+2nd harmonic), pitch settling (starts sharp, exponential relaxation ~50ms), 20ms exponential felt-hammer attack, 62% sustain with long tail, dual hammer noise (high click + low thud), 7-harmonic series with inharmonicity, per-note micro-detuning and volume randomization, sympathetic resonance, velocity-dependent soundboard LPF. Persists across scene transitions — `start(mood)` crossfades when mood changes, no-ops when same mood.
- **EngineSounds** — Procedural engine/movement sounds and hazard warnings. Continuous motor sounds (diesel idle rumble, speed-dependent pitch, surface-dependent snow crunch, grooming blade buzz) route through the dedicated engine channel for independent volume control. Winch tension hum and one-shot sounds (winch attach/detach, obstacle bump, fuel refill, restaurant chime, tumble impacts, cliff fall, stamina depleted) route through SFX. Hazard warnings: avalanche rumbles (2 escalation levels + trigger roar), low fuel double-beep (every 2s below 20%), low stamina descending tone (every 3s below threshold), time-running-out ticks (accelerating: 2s→1s→0.5s under 30s). Uses `onReady()` deferred start with destroyed guard. Created/destroyed per GameScene lifecycle.
- **SkiRunSounds** — Procedural ski/snowboard descent audio. Continuous: speed-dependent wind rush (bandpass noise), terrain-aware snow carving (groomed sine swishes vs ungroomed noise bursts), brake scrape (filtered noise). One-shot: obstacle bump, cliff wipeout, trick launch whoosh, trick landing thud, rail grind (sustained metallic scrape ~480ms), slalom gate pass chime / miss buzz, avalanche warning/trigger sounds. Created/destroyed per SkiRunScene lifecycle. Routes through SFX channel.
- **AmbienceSounds** — Environmental soundscapes routed through the ambience channel. Storm levels get continuous bandpass-filtered wind noise + LFO-modulated howling gusts. Night levels get occasional procedural wildlife calls (owl two-tone hoot, wolf howl with vibrato) spaced 8–20s apart. Paused/resumed with game state. Supports dialogue ducking via `setDuck()`.
- **VoiceSounds** — Celeste-style voice gibberish via Web Audio API. Each character has a distinct voice profile (base pitch, pitch range, waveform type, blip speed, volume). Letters map to pitch offsets for natural-sounding speech variation; spaces/punctuation produce silence. Called from DialogueScene's typewriter callback. During dialogue, engine is ducked to 30% and ambience to 20% for audibility. Animal flee sounds are suppressed entirely.

Each system takes the Phaser scene in its constructor and exposes methods called from GameScene's `createLevel()` and `update()`. LevelGeometry is the exception — it takes `level` and `tileSize` as params since it has no Phaser dependency.

### MenuTerrainRenderer Reuse

`createMenuTerrain()` accepts a `skipGroomer` parameter (default `false`). LevelCompleteScene passes `skipGroomer: true` to draw custom failure-specific groomer effects via `drawGroomerFailEffect()` instead of the standard side-view groomer. LevelCompleteScene also uses `MenuWildlifeController` for wildlife and applies weather effects (night overlay, storm particles) matching the completed level's weather config.

Five failure groomer effects: **tumble** (upside-down groomer), **avalanche** (snow pile with cabin tip), **cliff** (tilted with debris), **fuel** (smoke plumes + gauge), **time** (zzZ sleep marks).

### Balance Constants

All gameplay tuning values are centralized in `BALANCE` (exported from `src/config/gameConfig.ts`). Categories: stamina, fuel, movement, slopes, avalanche, camera, timing, night/headlights, grooming quality. Never hardcode magic numbers in GameScene — add them to `BALANCE`.

### Depth Constants

All Phaser depth (z-order) values are centralized in `DEPTHS` (exported from `src/config/gameConfig.ts`). Never use magic depth numbers — always use `DEPTHS.*` constants. See `docs/ART_STYLE.md` for the full layer table. Menu/settings scenes use `DEPTHS.MENU_OVERLAY` (13) and `DEPTHS.MENU_UI` (15) to layer UI above terrain backdrops with animated wildlife.

### Overlay Scene Input Handling

DialogueScene runs as an overlay on top of GameScene. To prevent input blocking:

```javascript
// Disable interactivity when dialogue is hidden
hideDialogue() {
    this.isShowing = false;
    if (this.bg) {
        this.bg.disableInteractive();
    }
    // ... hide animation
}

// Re-enable when showing
displayNextDialogue() {
    this.isShowing = true;
    if (this.bg) {
        this.bg.setInteractive({ useHandCursor: true });
    }
    // ... show animation
}
```

## Phaser Best Practices (Audited)

This section documents Phaser 3 patterns audited and verified in this codebase. Follow these when making changes.

### Scale & Resize

- Use `Phaser.Scale.RESIZE` with `width: '100%', height: '100%'` in the game config
- **Do not call `scale.resize()` from scenes** — use Phaser's built-in resize handler
- `main.ts` installs a `ResizeObserver` + `orientationchange` listener that calls `game.scale.resize()` to compensate for events Phaser misses (Firefox dev tools, some mobile orientation changes). This is debounced at 150ms.
- `window.resizeGame()` is also exposed for test automation (Playwright viewport changes don't trigger real browser resize events)
- Scenes handle resize via `this.scale.on('resize')` with a `requestAnimationFrame` guard to prevent restart-during-create loops
- **Night overlay resize timing** — `handleNightResize()` must be called AFTER `setZoom()` because `overlayFullScreen()` reads `cam.zoom`. The overlay is repositioned every frame via `prepareNightFrame()` which maps world coords to canvas pixels using zoom-scaled draw-space offsets. `handleFrostResize()` is independent of zoom and can be called before the camera branch.

### Shutdown & Event Cleanup

Every scene that registers listeners **must** remove them in `shutdown()`:

| Listener type | Cleanup method |
|---------------|---------------|
| `this.scale.on('resize', fn, this)` | `this.scale.off('resize', fn, this)` |
| `this.input.keyboard?.on(...)` | `this.input.keyboard?.removeAllListeners()` |
| `this.input.gamepad?.on(...)` | `this.input.gamepad?.removeAllListeners()` |
| `this.input.on('pointermove', ...)` | `this.input.removeAllListeners()` |
| Custom events via `scene.events.on(...)` | `scene.events.off(...)` |

Also call `this.tweens.killAll()` and `this.children.removeAll(true)` in shutdown for scenes with animations or dynamically created objects.

### Physics & Movement

- Use `setVelocity()` for all movement — never set `x`/`y` directly (bypasses physics)
- Use `physics.add.collider()` for solid obstacles, `physics.add.overlap()` for trigger zones
- Use `physics.add.staticGroup()` for immovable obstacles
- Apply `setDrag()` for natural deceleration
- Set `setCollideWorldBounds(true)` on the player

### Input Handling

- **Gameplay input** (movement, actions): Use `keyboard.addKey()` + `.isDown` checks in `update()` for continuous polling
- **Menu/UI input** (button presses): Use `keyboard.on('keydown-X', ...)` event listeners in `create()`
- **Gamepad**: Poll state in `update()` (stick axes, button pressed), use events only for `connected`/`disconnected`
- **Touch**: Use pointer events on game objects (auto-cleanup), track pointer identity for multitouch

### Game Object Creation

- Create all objects in `create()`, never in `update()` — the update loop runs 60fps
- Use `generateTexture()` in `preload()` for procedural textures, destroy the temp Graphics immediately
- **Prefer TileSprite over individual Image tiles** for uniform backgrounds (off-piste snow, forest floor). One TileSprite = one game object vs thousands of tiles
- **Bake static overlays to textures**: For overlays that change infrequently (frost vignette), draw into an off-screen Graphics with `scene.make.graphics({} as any, false)`, call `generateTexture()`, destroy the Graphics, and display as an Image. Update only alpha per frame
- Reuse Graphics objects with `.clear()` for things drawn every frame (e.g., night overlay headlights, winch cable) — but minimize the number of such objects
- Use consistent depth values with gaps between layers for future insertions

### ScrollFactor(0) Coordinate System

`setScrollFactor(0)` prevents camera scroll but **does NOT prevent zoom**. The camera still applies its zoom+origin transform to drawn coordinates. For full-screen overlays or world-positioned effects on `scrollFactor(0)` Graphics:

```typescript
import { worldToOverlay, overlayFullScreen } from '../utils/cameraCoords';

// Convert world position to overlay draw-space: drawPos = worldPos - cam.scrollXY
const { x, y } = worldToOverlay(cam, worldX, worldY);

// Fill entire screen (accounts for zoom + origin offset)
const rect = overlayFullScreen(cam, 10); // 10px margin
graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
```

**Never** use `scale.width/height` or `cam.width/height` directly for `scrollFactor(0)` draw coordinates — both produce incorrect results when zoom ≠ 1.

### Timers

- For in-game timers: use `this.time.delayedCall()` or `this.time.addEvent()` — these pause with the scene
- For post-shutdown work (scene removal/re-addition): use native `setTimeout` — Phaser timers are destroyed with the scene

### Tweens

- All tweens should be finite (no `repeat: -1` without explicit cleanup)
- Call `this.tweens.killAll()` in `shutdown()`
- Use `onComplete` callbacks for one-shot effects

### Debug Logging

- Use `console.log` freely during development — it's stripped from production builds via Vite `esbuild.pure` config
- Use `console.error`/`console.warn` for messages that must appear in production
- Never use `console.log` for user-visible feedback — use the localization system instead

### Debug Overlay

Settings → Accessibility → Debug Overlay (`STORAGE_KEYS.SHOW_DEBUG`) renders per-frame collision/zone visualization on both GameScene and SkiRunScene. Default: off.

| Color | Element |
|-------|---------|
| Cyan | Groomer/skier physics body outline |
| Red line | Groomer depth-Y reference |
| Green | Obstacle hitboxes (trees, rocks, buildings) |
| Yellow | Obstacle depth-Y reference |
| Magenta | Pole depth-Y reference (all pole types) |
| Orange fill | Steep zone active bounds (per-row piste-aware, with 2-tile margin) |
| Blue fill | Boundary wall colliders |
| Purple fill | Danger zone colliders (SkiRunScene only) |
| Pink | Park feature hitboxes (kickers, rails) |
| Teal | Halfpipe wall hitboxes |
| Yellow-orange | Avalanche zone polygon + physics body |
| Red fill | Cliff fall-detection zone (matches visual cliff rocks) |
| White/orange cross | Groomer cliff detection points (center + left/right side) |

Pole magenta lines are drawn once at level creation (on the Graphics object). All other overlays are redrawn per frame by `debugGfx`.

## Service Road System

Steep piste levels require service roads for groomer access to winch anchors.

### Configuration

```javascript
// In levels.ts
{
    id: 4,
    accessPaths: [
        { startY: 0.15, endY: 0.4, side: 'left' },
        { startY: 0.45, endY: 0.75, side: 'right' }
    ],
    // ...
}
```

### Implementation (two-phase)

**Phase 1 — Geometry** (`calculateAccessPathGeometry()`, called early):
1. Compute switchback curve points from piste edge to off-piste and back
2. Build left/right edge arrays (road width = 5 tiles)
3. Store `accessPathRects` for collision exemption and tree avoidance
4. Store `accessPathCurves` for visual rendering

**Phase 2 — Visuals** (`createAccessPaths()`, called during piste boundary setup):
1. Place `snow_packed` tiles along curve (distinct from groomed piste surface)
2. Place amber-yellow/black striped poles with minimum screen-distance spacing
3. No signs — level intro dialog explains service roads on first appearance (level 4)

### Initialization Order

`calculateAccessPathGeometry()` must run BEFORE:
- `createBoundaryColliders()` — boundary walls check `accessPathRects` to exempt road area
- `createExtendedBackground()` — trees/rocks check `accessPathRects` to avoid road
- `calculateCliffSegments()` — cliff gaps check `accessEntryZones` AND `accessPathRects`

**Critical**: `createBoundaryColliders()` was moved OUT of `createSnowGrid()` and into `_createLevel()` AFTER `calculateAccessPathGeometry()`. This ensures `accessPathRects` are populated when walls are created. Order in `_createLevel()`:
1. `createSnowGrid()` (builds `pistePath`, calls `calculateAccessPathZones()` + `calculateCliffSegments()`)
2. `calculateAccessPathGeometry()` (populates `accessPathRects`)
3. `createBoundaryColliders()` (uses `accessPathRects` to skip walls on roads)
4. `createExtendedBackground()` (uses `isOnAccessPath()` to skip trees/rocks)

### Physics

Boundary walls exempt the full road switchback area (not just entry/exit zones).
Groomer on access path bypasses steep zone effects:
```javascript
checkSteepness() {
    // Check if on access path first
    if (this.accessPathRects) {
        for (const path of this.accessPathRects) {
            if (inBounds(groomer, path)) {
                return; // Safe on access path
            }
        }
    }
    // Then check steep zones...
}
```

## Cliff System

Levels with `hasDangerousBoundaries: true` have cliff areas that kill the player on contact.

### Cliff Segments

Cliffs are calculated once and shared between physics and visuals to ensure alignment:

```typescript
interface CliffSegment {
  side: 'left' | 'right';
  startY: number;          // Vertical start position (pixels)
  endY: number;            // Vertical end position (pixels)
  offset: number;          // Distance from piste edge (1.5-3 tiles)
  extent: number;          // Width of cliff area (3-5 tiles)
  getX: (y: number) => number;  // Piste edge position interpolator
  getBounds: (y: number) => { cliffStart: number; cliffEnd: number };  // Per-row cliff bounds matching visual
}
```

The `getBounds()` function returns per-row cliff boundaries that include the same `rowVariation` used by the visual renderer, ensuring the fall-detection zone exactly matches the visible rock tiles. Both use the same deterministic `visualRand` seeded with `startY`.

### Implementation Flow

1. **generatePistePath()** - Creates piste boundary data
   - Stores `{ centerX, width }` per row in tile coordinates
   - Used by `isInPiste()` for snow tile rendering

2. **calculateCliffSegments()** - Called after piste path generation
   - Builds segments from piste path data
   - Converts tile coords to pixel coords for cliff edges
   - Calculates variable offset/extent per segment
   - **CRITICAL**: Makes deep copy of edge arrays for getX closure (see below)
   - Stores in `this.cliffSegments`

3. **createBoundaryColliders()** - Uses cliffSegments for physics
   - Creates boundary walls (forest walls beyond cliffs). Cliff wipeouts use per-frame `LevelGeometry.isOnCliff()` in both GameScene and SkiRunScene
   - Cliff danger poles extracted as separate y-sorted Graphics objects (not baked into cliff texture)

4. **createCliffEdgeVisuals()** - Uses same cliffSegments for rendering
   - Organic edges (per-row variation, edge tile skipping)
   - Cliff danger poles at boundary with yellow/black striping, y-depth sorted

### Critical Implementation Detail: Closure Bug

The `getX()` interpolation function is a closure that references the edges array. Since the same edges array is reused and cleared after each segment, the closure **must** receive a deep copy:

```typescript
// WRONG - closure references array that gets cleared
const getX = (y: number) => edges.findIndex(...);
leftEdges.length = 0;  // Breaks getX!

// CORRECT - closure has its own copy
const edgesCopy = edges.map(e => ({ y: e.y, x: e.x }));
const getX = (y: number) => edgesCopy.findIndex(...);
leftEdges.length = 0;  // Safe, getX uses edgesCopy
```

Without this fix, cliffs render at incorrect positions (often overlapping the piste) because `getX()` returns wrong values after the source array is cleared.

### Visual Style

- Tile-based rock texture (SkiFree aesthetic)
- Warm brown color palette (alpine rock)
- Sparse trees on cliff areas
- Per-row edge variation for organic look (only pushes cliffs away from piste)
- ~30% of edge tiles randomly skipped for organic boundaries

## Winch System

### Anchor Structure

Level config (`levels.ts`) defines anchors with only a fractional `y` position:

```typescript
// In levels.ts
interface WinchAnchor { y: number; }  // fractional height (0-1)
```

GameScene's `createWinchAnchors()` converts these to runtime objects with calculated properties:

```typescript
// Runtime object (constructed in GameScene)
{ x, y: hookY, baseY: baseY, number: anchorIndex }
```

### Proximity Detection

Winch only attaches when groomer is within 3 tiles of anchor **base** (not hook):

```javascript
const maxAttachDistance = this.tileSize * 3;
const dist = Phaser.Math.Distance.Between(
    groomer.x, groomer.y,
    anchor.x, anchor.baseY  // Use baseY for proximity
);
```

### Cable Tension / Slack

Cable state depends on relative altitude of groomer vs anchor:

```javascript
// Screen coords: lower Y = higher altitude
const groomerY = this.groomer.y - 10;
const hasSlack = groomerY <= this.winchAnchor.y;

if (hasSlack) {
    // Groomer above anchor - cable sags
    // Draw quadratic bezier curve drooping down
    // NO physics assist, normal stamina drain
} else {
    // Groomer below anchor - cable taut
    // Draw straight line with tension coloring
    // Apply winch pulling force, reduced stamina drain
}
```

### Cable Extension Limit

Cable has a maximum length (`BALANCE.WINCH_MAX_CABLE` tiles). As the groomer moves away from the anchor:

- **70-100% extension**: Progressive drag slows movement away from anchor (100% speed → 30% speed)
- **100% extension**: Cable snaps — 800ms stun, -20 stamina, camera shake
- Tension is visible via cable color: gray (slack) → red (near snap)

Players must switch between anchors on long descents rather than using one anchor for the entire slope.

### Visual Feedback

- **Taut cable**: Straight line, color shifts gray→red with distance (tension = dist/maxDist)
- **Slack cable**: Curved/sagging line, thinner, grayer (0.7 opacity)
- **Near snap**: Cable fully red, groomer visibly slowed

## HUD Scaling

HUD elements scale based on viewport size for readability on different displays:

```javascript
// Reference resolution: 1024x768
const scaleX = width / 1024;
const scaleY = height / 768;
this.uiScale = Math.max(0.75, Math.min(2, Math.min(scaleX, scaleY)));

// Apply to all UI elements
const fontSize = Math.round(12 * this.uiScale) + 'px';
const padding = Math.round(12 * this.uiScale);
```

## Electron Desktop Wrapper

Optional desktop packaging via `electron/`. Keeps Electron deps out of the main project — separate `package.json` with its own `node_modules/`.

### Build Commands

```bash
./build-desktop.sh              # Build game + launch in Electron
./build-desktop.sh --pack       # Package for Linux (AppImage)
./build-desktop.sh --pack-win   # Package for Windows (installer + portable exe)
./build-desktop.sh --pack-mac   # Package for macOS (unsigned zip)
./build-desktop.sh --pack-all   # Package for all platforms
```

### Key Files

- `main.cjs` — Electron main process: window creation, display mode management (windowed/fullscreen/borderless), F11 toggle, xdg desktop integration (Linux/Wayland), external link handling
- `preload.cjs` — contextBridge API exposing `electronAPI` (quit, fullscreen, display mode, background audio). Must inline all values — preload sandbox forbids `require()` of other files
- `afterPack.cjs` — Post-build hook: strips Vulkan SwiftShader and source maps (~5MB per platform)
- `generate-icon.cjs` — Renders pixel-art groomer icon natively at 7 sizes (16–512px) with progressive detail reduction. Outputs to `icons/` (bundled in asar) and `build/icons/` (for electron-builder)

### Architecture Decisions

- **Display mode persistence**: Saved to JSON in `app.getPath('userData')` (not localStorage) so it can be read synchronously before window creation — avoids startup flicker. F11 toggles are transient and don't overwrite the saved preference.
- **Window recreation**: `frame` property can't be changed at runtime. Switching windowed↔borderless requires destroying and recreating the BrowserWindow. `isRecreating` flag prevents `window-all-closed` from quitting during recreation.
- **Wayland icon**: `BrowserWindow({ icon })` only works on X11. On Wayland, the taskbar icon comes from the `.desktop` file matched via `StartupWMClass`. Runtime `xdg-icon-resource`/`xdg-desktop-menu` install handles this on first launch (idempotent).
- **Background audio**: Setting in Audio section (desktop only, default: on). Uses `AudioContext.suspend()`/`resume()` on `window` blur/focus events for instant mute. `setBackgroundThrottling` as complementary CPU optimization. State tracked in main process to survive window recreation.
- **PipeWire audio**: Stream name and icon are hardcoded to "Chromium" in Chromium's `pulse_util.cc`. No workaround until [electron/electron#49270](https://github.com/electron/electron/pull/49270) merges.
- **Cross-compilation**: Windows builds work from Linux via Wine. macOS zip builds work but can't be code-signed (requires macOS).
- **Size optimization**: `electronLanguages` strips 40 unused Chromium locales. `afterPack.cjs` removes Vulkan SwiftShader and source maps. ~99MB AppImage (floor is the Chromium binary).

## Night Texture System

Night levels use pre-generated darkened textures instead of a per-frame full-screen DynamicTexture overlay (which cost 6-8 FPS on Firefox due to `memcpy` bottleneck).

### Architecture (`src/utils/nightPalette.ts`)

- **`nightColor(color: number): number`** — Converts a daytime `0xRRGGBB` to its night equivalent: darkens by `BALANCE.NIGHT_BRIGHTNESS` (0.3) and shifts blue channel by `BALANCE.NIGHT_BLUE_SHIFT` (0.15)
- **`ColorTransform` type** — `(color: number) => number`. Identity (`dayColors`) for day levels, `nightColors` for night levels
- **`NIGHT_TEXTURE_KEYS`** — List of snow texture keys that get `_night` variants (ungroomed, offpiste, groomed, packed, steep zones)
- **`nightKey(key)`** — Appends `NIGHT_SUFFIX` (`'_night'`) to a texture key
- **`NIGHT_SUFFIX`** — String constant `'_night'`

### Texture Generation (BootScene)

Night variant textures are generated at boot by drawing the day texture onto a new canvas, then overlaying a solid night color via `globalCompositeOperation = 'multiply'`. This produces darkened + blue-shifted textures that require zero per-frame cost.

### Runtime Pattern

All systems that draw textured content or colored shapes accept two parameters:
1. **`nightSfx: string`** — `'_night'` on night levels, `''` on day. Appended to texture keys for `setTexture()` calls
2. **`nc: ColorTransform`** — Applied to all `fillStyle` / `lineStyle` hex colors in Graphics calls

This avoids any runtime overlay compositing. The only per-frame night cost is a small 256×256 DynamicTexture for the headlight glow, positioned in world coordinates on the groomer.

### FPS Meter (rAF Counting)

The HUD FPS counter uses `requestAnimationFrame` counting instead of `game.loop.delta` averaging. This measures actual rendered frames rather than Phaser loop ticks, which can diverge when the browser drops frames. The rAF callback counts frames over 500ms windows and updates the display text.

## Future Architecture Considerations

1. **Save/Load**: Serialize gameState to localStorage
2. **Multiplayer**: WebRTC for peer-to-peer
3. **Level Editor**: Visual tool for creating custom levels
4. **Procedural Generation**: Algorithm-based level creation
5. **Sound System**: Web Audio API integration
