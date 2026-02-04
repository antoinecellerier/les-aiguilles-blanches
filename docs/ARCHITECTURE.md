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
│   │   ├── gameConfig.ts   # Game constants, colors
│   │   ├── levels.ts       # Level definitions
│   │   └── localization.ts # i18n translations
│   ├── utils/
│   │   ├── accessibility.ts # A11y helpers, settings
│   │   ├── gamepad.ts      # Controller detection, button mapping
│   │   ├── gameProgress.ts # Save/load game progress
│   │   └── keyboardLayout.ts # Keyboard layout detection, defaults
│   ├── scenes/
│   │   ├── BootScene.ts    # Asset loading, texture generation
│   │   ├── MenuScene.ts    # Main menu, How to Play overlay
│   │   ├── SettingsScene.ts # Language, a11y, controls, keyboard layout
│   │   ├── GameScene.ts    # Main gameplay
│   │   ├── HUDScene.ts     # UI overlay (parallel to GameScene)
│   │   ├── DialogueScene.ts # Character dialogue overlay
│   │   ├── PauseScene.ts   # Pause menu
│   │   ├── LevelCompleteScene.ts
│   │   └── CreditsScene.ts
├── tests/
│   ├── e2e/                # Playwright browser tests
│   └── unit-js/            # Vitest config validation
└── docs/
    ├── ARCHITECTURE.md     # This file
    └── GAMEPLAY.md         # Game mechanics
```

### Scene Flow

```
BootScene → MenuScene → GameScene ⟷ HUDScene
     ↑           ↑            ↓         ↓
     │           │      DialogueScene   │
     │           │            ↓         │
     │           │      PauseScene      │
     │           │            ↓         │
     │           └── LevelCompleteScene ┘
     │                        ↓
     └──────────── CreditsScene ────────
```

## Design Decisions

### 1. Canvas vs DOM for Game Rendering

**Decision**: Use HTML5 Canvas for game world, DOM for UI

**Rationale**:
- Canvas provides pixel-perfect control for retro SkiFree aesthetic
- DOM elements are more accessible for UI (screen readers, focus management)
- Hybrid approach: Canvas for gameplay, DOM overlays for menus/HUD

### 2. Input Abstraction Layer

**Decision**: Unified InputManager that abstracts all input sources

**Rationale**:
- Game logic doesn't need to know about input source
- Easy to add new input methods (e.g., voice, eye tracking)
- Simplifies rebinding - only one place to manage mappings

```javascript
// All input sources return the same interface
inputManager.getMovement() // { dx: 0-1, dy: 0-1 }
inputManager.isPressed('groom') // true/false
```

### 3. Physical Key Codes for Keyboard

**Decision**: Use `event.code` (e.g., 'KeyW') not `event.key` (e.g., 'w')

**Rationale**:
- Works correctly on AZERTY, QWERTZ, and other keyboard layouts
- Physical position remains consistent regardless of language
- Arrow keys as universal fallback for all layouts

### 4. Localization System

**Decision**: Inline translations with `data-i18n` attributes

**Rationale**:
- No build step required
- Easy to add languages by extending TRANSLATIONS object
- DOM elements self-document their translation keys
- Works with screen readers

```html
<button data-i18n="startGame">Start Game</button>
```

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
    nameKey: 'level1Name',      // Localization key
    taskKey: 'level1Task',
    difficulty: 'green',         // green/blue/red/black/park
    timeLimit: 300,              // seconds
    targetCoverage: 80,          // percentage
    width: 40,                   // tiles
    height: 60,
    hasWinch: false,
    isNight: false,
    weather: 'clear',            // clear/light_snow/storm
    obstacles: ['trees'],
    introDialogue: 'jeanPierreIntro'
}
```

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
7. drawNightOverlay() - Visibility reduction
```

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

- **Single column mode**: Activated when `logicalWidth < 500` or `aspectRatio > 1.5` (portrait)
- **Two column mode**: Used on wider landscape displays
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

Menu uses responsive scaling based on viewport:

```typescript
const scaleByHeight = Math.max(0.7, Math.min(height / 768, 1.5));
const scaleByWidth = Math.max(0.5, Math.min(width / 1024, 1.5));
const dprBoost = Math.sqrt(Math.min(dpr, 2));
const scaleFactor = Math.min(scaleByHeight, scaleByWidth) * dprBoost;
```

## Browser Compatibility Notes

### Firefox Rendering

Firefox requires simplified Phaser configuration to render correctly. Key findings:

1. **Use Canvas renderer**: `type: Phaser.CANVAS` ensures consistent rendering
2. **Avoid scale options**: `scale.mode` and `scale.autoCenter` can cause black screen
3. **Avoid render options**: `pixelArt`, `antialias`, `desynchronized` cause issues
4. **Avoid callbacks**: `preBoot` and `postBoot` callbacks break rendering
5. **Avoid Graphics methods**: `fillTriangle()` and `lineBetween()` may cause issues

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

**Solution:** Remove and recreate ALL game scenes completely during level transitions:

```javascript
// In GameScene.transitionToLevel():
this.scene.stop('HUDScene');
this.scene.stop('DialogueScene');
this.scene.stop('GameScene');

setTimeout(() => {
    // Remove ALL scene instances to clear corrupted textures
    game.scene.remove('HUDScene');
    game.scene.remove('DialogueScene');
    game.scene.remove('GameScene');
    
    // Re-add fresh scene instances (order matters for layering)
    game.scene.add('GameScene', GameScene, false);
    game.scene.add('HUDScene', HUDScene, false);
    game.scene.add('DialogueScene', DialogueScene, false);
    
    // Start GameScene with new level
    game.scene.start('GameScene', { level: nextLevel });
}, 100);
```

**Key Points:**
- Always stop scenes before removing them
- Use setTimeout to allow render frame to complete
- Create fresh scene instances via `scene.add()` rather than reusing
- Reset instance variables (like `isSkipping`) in `init()` not just `create()`

### Cleanup in shutdown()

All scenes should implement `shutdown()` for proper cleanup:

```javascript
shutdown() {
    this.tweens.killAll();           // Stop all animations
    this.time.removeAllEvents();      // Cancel all timers
    this.children.removeAll(true);    // Destroy all game objects
}
```

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

## Service Road System

Steep piste levels require service roads for groomer access to winch anchors.

### Configuration

```javascript
// In levels.js
{
    id: 4,
    accessPaths: [
        { startY: 0.15, endY: 0.4, side: 'left' },
        { startY: 0.45, endY: 0.75, side: 'right' }
    ],
    // ...
}
```

### Implementation

1. **Pre-calculate entry zones** before boundary walls are created
2. **Skip boundary walls** at entry/exit zones
3. **Draw curved switchback paths** with smooth S-curves
4. **Place orange/black striped poles** along path edges (French standard)
5. **Exclude trees** from path areas

### Physics

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
