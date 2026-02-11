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
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript config
├── publish.sh              # Build script for deployment
├── src/
│   ├── main.ts             # Phaser init, game creation
│   ├── setup.ts            # Window globals initialization
│   ├── config/
│   │   ├── gameConfig.ts   # Game constants, colors, BALANCE tuning, DEPTHS layering
│   │   ├── levels.ts       # Level definitions
│   │   ├── localization.ts # i18n translations (uses {placeholder} syntax)
│   │   ├── storageKeys.ts  # Centralized localStorage key constants
│   │   └── theme.ts        # UI colors, fonts, button styles
│   ├── systems/
│   │   ├── WeatherSystem.ts  # Night overlay, headlights, weather particles
│   │   ├── HazardSystem.ts   # Avalanche zones, risk handling
│   │   ├── WildlifeSystem.ts # Animal spawning, flee AI, update loop
│   │   ├── LevelGeometry.ts # Piste path, cliff, access path geometry (pure data, no Phaser)
│   │   ├── MenuTerrainRenderer.ts # Menu background: sky, mountains, snow, trees, groomer
│   │   ├── MenuWildlifeController.ts # Menu wildlife AI, snowflakes, animal tracks
│   │   ├── ObstacleBuilder.ts # Obstacle placement, buildings, chalets
│   │   ├── ParkFeatureSystem.ts # Terrain park features: kickers, rails, halfpipe walls, zone scoring
│   │   ├── PisteRenderer.ts # Boundary colliders, cliff visuals, markers, trees, access paths
│   │   ├── WinchSystem.ts  # Winch anchors, cable rendering, attach/detach state
│   │   ├── AudioSystem.ts  # Web Audio API singleton, volume channels, gain chain
│   │   ├── AmbienceSounds.ts # Storm wind/gusts, night owl & wolf calls
│   │   ├── EngineSounds.ts # Engine rumble, snow crunch, grooming, winch, hazard, warning SFX
│   │   ├── MusicSystem.ts  # Chopin nocturne-style procedural piano music (singleton, 5 moods)
│   │   ├── UISounds.ts     # Procedural UI SFX (click, hover, cancel, toggle, level win/fail)
│   │   ├── VoiceSounds.ts  # Celeste-style voice gibberish (4 speaker profiles)
│   │   └── WildlifeSounds.ts # Animal flee/alarm sounds (marmot, chamois, bird, bunny, bouquetin, fox)
│   ├── types/
│   │   ├── global.d.ts           # Window/navigator type augmentations
│   │   └── GameSceneInterface.ts # Cross-scene event types (GAME_EVENTS)
│   ├── utils/
│   │   ├── accessibility.ts # A11y helpers, settings
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
│   │   ├── resizeManager.ts # Debounced resize-restart handler for scenes
│   │   ├── sceneTransitions.ts # Centralized scene cleanup and transitions
│   │   ├── skiRunState.ts    # Shared groomed-tile state between GameScene and SkiRunScene
│   │   ├── skiSprites.ts     # Procedural pixel art for skier & snowboarder (20×28px, 8 variants each)
│   │   ├── storage.ts       # Type-safe localStorage helpers (getJSON/setJSON/getString/setString)
│   │   └── touchDetect.ts    # Touch detection with Firefox desktop fallback
│   ├── scenes/
│   │   ├── BootScene.ts    # Asset loading, texture generation
│   │   ├── MenuScene.ts    # Main menu, How to Play overlay
│   │   ├── LevelSelectScene.ts # Level select / replay (browse + star ratings)
│   │   ├── SettingsScene.ts # Language, a11y, gameplay prefs, controls, keyboard layout
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
│   │   ├── code-health/   # Auto-invoked code audit skill
│   │   ├── content-review/# Content writer review skill
│   │   └── docs-update/   # Auto-invoked docs sync skill
│   └── copilot-instructions.md   # Copilot custom instructions
└── docs/
    ├── ARCHITECTURE.md     # This file
    ├── GAMEPLAY.md         # Game mechanics
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
├── CSS-based high contrast mode
├── SVG filters for colorblind modes
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

`computeTimeLimit()` in `levels.ts` derives time limits from level geometry:

```
timeLimit = ceil( (tilesToGroom / groomRate) × navOverhead × difficultyScale + pathTime + winchOverhead )
```

- **groomRate** = `GROOMER_SPEED / TILE_SIZE × GROOM_WIDTH / TILE_SIZE` ≈ 14 tiles²/s
- **navOverhead** = 0.3 (empirically calibrated so skilled play uses ~40-60% of time)
- **difficultyScale**: green=1.3, blue=1.0, park=1.4, red=0.9, black=0.75
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

1. **Tile culling**: Only render visible tiles
2. **Object pooling**: Reuse particle objects for weather
3. **RequestAnimationFrame**: Synchronized with display refresh
4. **Reduced motion**: Skip particle effects when enabled
5. **Extended background sizing**: Use `screen * 1.3` — enough for URL bar/viewport jitter, not `max(screen, 2560) * 1.5` which creates thousands of unnecessary game objects and tanks mobile FPS
6. **HUD resize debounce**: Mobile browsers fire frequent resize events (URL bar, soft keyboard); debounce with 300ms + 10px threshold to prevent rapid scene restarts

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
- Visor background alpha increases from 0.55 to 0.80
- All visor text gains a black stroke outline for readability
- Bar borders brighten from `0x555555` to `0x999999`
- Colorblind mode replaces colored dots with text labels ("F"/"S") so users don't rely on red/green color differentiation
- Bottom accent line doubles in thickness

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

1. **Use Canvas renderer**: `type: Phaser.CANVAS` ensures consistent rendering
2. **Avoid scale options**: `scale.mode` and `scale.autoCenter` can cause black screen
3. **Avoid render options**: `pixelArt`, `antialias`, `desynchronized` cause issues
4. **Avoid callbacks**: `preBoot` and `postBoot` callbacks break rendering
5. **Avoid Graphics methods**: `fillTriangle()` and `lineBetween()` may cause issues
6. **No runtime tinting**: `setTint()` / `clearTint()` are silently ignored by the Canvas renderer. Use pre-generated texture variants via `setTexture()` instead (see steep zone textures in BootScene)

Working Firefox configuration:
```javascript
const config = {
    type: Phaser.CANVAS,
    parent: 'game-container',
    width: 1024,
    height: 768,
    backgroundColor: '#2d5a7b',
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
- `render: { pixelArt: ..., antialias: ... }`
- `callbacks: { preBoot: ..., postBoot: ... }`

**Safe to include:**
- `physics` configuration
- `input` configuration  
- `backgroundColor`

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

```javascript
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
| `TOUCH_CONTROLS_TOP` | HUD → GameScene | topEdge (screen px) | On touch control layout |

Always clean up listeners in `shutdown()` with `this.game.events.off(GAME_EVENTS.*)`.

GameScene constructs the `GAME_STATE` payload via `buildGameStatePayload()` — a single method used by both the per-frame emit in `update()` and the final emit in `gameOver()`. HUDScene uses the bonus stats to evaluate bonus objectives in real-time inside the visor, with irreversible failure tracking for `no_tumble` and `speed_run`.
#### Touch Controls Camera Offset

On narrow/portrait devices (aspect < 1.2), virtual touch controls overlap the play area. HUDScene emits `TOUCH_CONTROLS_TOP` with the top edge of the controls in screen pixels. GameScene uses this to apply a negative `followOffset.y` so the groomer renders above the controls. Camera bounds are extended downward by `|followOffset.y|` via `updateCameraBoundsForOffset()` to prevent clamping at the world bottom edge.

### GameScene System Extraction

GameScene delegates to extracted subsystems in `src/systems/`:

- **WeatherSystem** — Night overlay rendering, headlight cones, weather particle emitters, accessibility filters
- **HazardSystem** — Avalanche zone creation with irregular polygon shapes (randomized ellipse vertices), risk tracking, avalanche trigger sequence. Zones avoid piste path, cliffs, and each other via inter-zone spacing. Uses broad-phase rect + precise ray-casting `pointInPolygon()` for hitbox. Depth-layered above terrain (`CLIFFS+0.5`) with signage at `SIGNAGE`/`MARKERS` depth.
- **WildlifeSystem** — Decorative animal spawning, flee-from-groomer AI, per-level species config. Uses shared utilities: `foxBehavior.ts` for fox hunting decisions, `animalTracks.ts` for track drawing, `animalSprites.ts` for procedural sprites (including side-view flying and perched bird variants). Animals avoid buildings/cliffs (non-climbing species), grooming erases tracks, and tracks are bootstrapped at level start.
- **LevelGeometry** — Pure data system (no Phaser dependency). Generates piste path, access path zones/curves, and cliff segments from level config. Provides query methods `isInPiste()`, `isOnCliff()`, `isOnAccessPath()` used by rendering and physics. `getCliffAvoidRects()` returns bounding rects for avalanche zone placement. On levels with avalanche hazards, cliffs are limited to top/bottom bands (outside 15-65% height).
- **ObstacleBuilder** — Creates obstacles (rocks, trees), interactable buildings (restaurant, fuel station), and decorative chalets. Tracks building footprints for wildlife collision avoidance.
- **ParkFeatureSystem** — Terrain park feature placement and zone scoring. Arranges features in parallel lines (jump line with kickers, jib line with rails) at fixed positions on park levels, with approach/landing zones that override the default fall-line alignment for grooming quality scoring. Renders line corridors with subtle lane tinting and paint marks at takeoff/landing spots. Halfpipe mode narrows the groomable area with banked walls. Driving onto a feature triggers instant fail (forgiving hitbox at ~70% of visual size).
- **PisteRenderer** — All piste visual rendering: boundary colliders, cliff edge visuals, piste markers, forest trees, access path roads/poles, steep zone indicators, and extended background. Returns physics groups for GameScene collision setup.
- **WinchSystem** — Winch anchor creation, cable rendering (taut/slack), attach/detach state. Exposes `isTaut()` query used by movement and resource systems.
- **AudioSystem** — Singleton managing all game audio via Web Audio API. Handles AudioContext lifecycle (autoplay resume with `webkitAudioContext` Safari fallback, visibility suspend/resume with cleanup on reset), five volume channels (master, music, sfx, voice, ambience) routed through a gain node chain with a DynamicsCompressor limiter (threshold −6dB) before destination, and localStorage persistence for volume settings. Provides `onReady()` callback registration for deferred audio initialization.
- **MusicSystem** — Singleton (`getInstance()`) procedural Chopin nocturne-style piano music. Five moods (menu, calm, night, intense, credits) with distinct keys, tempos, and melodic contours. Grand piano synthesis: 7-harmonic series with inharmonicity, hammer strike noise, sympathetic resonance, velocity-dependent brightness, two-stage decay. Persists across scene transitions — `start(mood)` crossfades when mood changes, no-ops when same mood. Random melody start position prevents identical openings.
- **EngineSounds** — Procedural engine/movement sounds and hazard warnings. Continuous: diesel idle rumble, speed-dependent pitch, surface-dependent snow crunch, grooming blade buzz, winch tension hum. One-shot: winch attach/detach, obstacle bump, fuel refill, restaurant chime, tumble impacts, cliff fall, stamina depleted. Hazard warnings: avalanche rumbles (2 escalation levels + trigger roar), low fuel double-beep (every 2s below 20%), low stamina descending tone (every 3s below threshold), time-running-out ticks (accelerating: 2s→1s→0.5s under 30s). Uses `onReady()` deferred start with destroyed guard. Created/destroyed per GameScene lifecycle.
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
- Reuse Graphics objects with `.clear()` for things drawn every frame (e.g., night overlay, winch cable)
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
}
```

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
   - Creates danger zones matching visual cliff bounds exactly
   - No invisible death zones

4. **createCliffEdgeVisuals()** - Uses same cliffSegments for rendering
   - Organic edges (per-row variation, edge tile skipping)
   - Warning poles at danger zone boundary

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

### Visual Feedback

- **Taut cable**: Straight line, color shifts gray→red with distance
- **Slack cable**: Curved/sagging line, thinner, grayer (0.7 opacity)

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

## Future Architecture Considerations

1. **Save/Load**: Serialize gameState to localStorage
2. **Multiplayer**: WebRTC for peer-to-peer
3. **Level Editor**: Visual tool for creating custom levels
4. **Procedural Generation**: Algorithm-based level creation
5. **Sound System**: Web Audio API integration
