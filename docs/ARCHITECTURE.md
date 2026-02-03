# Architecture Documentation

## Overview

Les Aiguilles Blanches is a browser-based game with two implementations:

1. **Phaser 3 Version** (Recommended) - Uses the Phaser game framework for cross-browser compatibility
2. **Vanilla JS Version** (Legacy) - Pure JavaScript/Canvas implementation

The architecture prioritizes:

1. **Cross-browser compatibility** - Works in Firefox, Chrome, Safari, Edge
2. **Modular code organization** - Separated concerns for maintainability
3. **Progressive enhancement** - Works on all devices, enhanced where supported
4. **Accessibility first** - WCAG compliance built into the design

## Technology Stack

### Phaser 3 Version (Recommended)
- **Framework**: Phaser 3.70.0
- **Rendering**: Canvas (forced for Firefox compatibility)
- **Physics**: Arcade Physics
- **Input**: Built-in keyboard, gamepad, touch support
- **Scenes**: Modular scene-based architecture

### Vanilla JS Version (Legacy)
- **Rendering**: HTML5 Canvas 2D API
- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with CSS Variables
- **No Build Required**: Runs directly in browser

## Phaser 3 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   index-phaser.html                      │
│                    (Entry Point)                         │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  src/config/    │ │  src/utils/     │ │  src/scenes/    │
│  gameConfig.js  │ │ accessibility.js│ │  BootScene.js   │
│  levels.js      │ └─────────────────┘ │  MenuScene.js   │
│  localization.js│                     │  GameScene.js   │
└─────────────────┘                     │  HUDScene.js    │
                                        │  DialogueScene  │
                                        │  PauseScene.js  │
                                        │  LevelComplete  │
                                        └─────────────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   src/main.js   │
                                        │  (Game Init)    │
                                        └─────────────────┘
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
     └─────────────────────────────────────
```

## Vanilla JS Module Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
│                    (Entry Point)                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      main.js                             │
│              (Initialization & Glue Code)                │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   config.js   │  │    game.js    │  │  renderer.js  │
│ (Static Data) │  │ (Game Logic)  │  │  (Drawing)    │
└───────────────┘  └───────────────┘  └───────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   input.js    │  │localization.js│  │  style.css    │
│ (Input Layer) │  │ (i18n System) │  │  (Styles)     │
└───────────────┘  └───────────────┘  └───────────────┘
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
├── Touch controls with large hit targets
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

## Future Architecture Considerations

1. **Save/Load**: Serialize gameState to localStorage
2. **Multiplayer**: WebRTC for peer-to-peer
3. **Level Editor**: Visual tool for creating custom levels
4. **Procedural Generation**: Algorithm-based level creation
5. **Sound System**: Web Audio API integration
