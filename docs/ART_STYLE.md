# Art & Visual Style Guide

This document defines the visual language for Les Aiguilles Blanches to ensure consistency across all game elements.

## Core Aesthetic: SkiFree Retro

The game uses a **retro pixel-art style** inspired by the 1991 Windows game SkiFree:
- Simple geometric shapes (rectangles, no complex curves)
- Limited color palettes per element
- Tile-based terrain (16×16 pixels)
- Procedurally generated textures (no external image files)
- Clear visual distinction between game elements

## Tile & Sprite Dimensions

| Element | Size (px) | Notes |
|---------|-----------|-------|
| Tile | 16×16 | Base unit for terrain |
| Groomer | 36×58 | ~2.25 tiles wide, ~3.6 tiles tall (includes rear tiller) |
| Tree | 30×40 | ~2 tiles wide, 2.5 tiles tall |
| Rock | 24×16 | 1.5 tiles wide, 1 tile tall |
| Restaurant | 60×50 | ~4 tiles wide, 3 tiles tall |
| Fuel station | 44×44 | ~3 tiles square |

## Color Palettes

### Snow & Terrain

| Surface | Base Color | Detail Colors | Notes |
|---------|------------|---------------|-------|
| Groomed piste | `0xffffff` (white) | `0xe8f0f8` (lines) | Horizontal grooming lines every 3px |
| Ungroomed piste | `0xd8e4e8` (off-white) | `0xc8d4d8` (shadows) | Irregular shadow patches |
| Off-piste powder | `0xe8f0f4` (bright) | `0xf0f6fa` (mounds), `0xd8e4ec` (shadows) | Winter wonderland feel |
| Ice | `0xb8e0f0` (blue-tint) | - | Hazardous surface |
| Deep snow | `0xd0e0e8` (gray-blue) | - | Slower movement |

### Cliffs & Rock

Alpine rock with warm brown tones (NOT gray):

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Shadow rock | Very dark brown | `0x1a1612` | Deep crevices, edges |
| Dark rock | Dark brown | `0x2d2822` | Base layer |
| Mid rock | Medium brown-gray | `0x4a423a` | Main fill |
| Light rock | Light brown-gray | `0x6a5e52` | Highlights |
| Highlight | Tan | `0x8a7e6a` | Top edges, sun-facing |
| Snow on rock | White | `0xf0f5f8` | Sparse patches |
| Snow shadow | Blue-white | `0xd8e0e8` | Shadowed snow |

### Sky & Atmosphere

| Condition | Color | Hex |
|-----------|-------|-----|
| Day | Sky blue | `0x87ceeb` |
| Night | Deep navy | `0x0a1628` |
| Storm | Dark gray | (use night + particles) |

### Vehicles & Objects

**Groomer (Pisten Bully style):**
- Body: `0xcc2200` (red)
- Window frame: `0x1e90ff` (blue)
- Window glass: `0x87ceeb` (light blue)
- Tracks: `0x333333` (dark gray)
- Blade: `0x888888` (gray)
- Base: `0x666666` (medium gray)
- Tiller drum: `0x555555` (dark mechanical gray)
- Tiller arm: `0x777777` (mid mechanical gray)
- Comb teeth: `0x999999` (light mechanical gray)

**Trees:**
- Foliage: `0x228b22` (forest green) — menu/texture
- Foliage (in-game): `0x1a4a2a` (dark forest green) — darker for top-down contrast
- Trunk: `0x8b4513` (saddle brown) — menu/texture
- Trunk (in-game): `0x4a3728` (dark brown) — darker for top-down contrast

**Rock obstacles:**
- Base: `0x696969` (dim gray)
- Highlight: `0x888888` (gray)

**Fuel station:**
- Pump body: `0xcc2222` (red)
- Roof: `0x991111` (dark red)
- Display: `0xeeeeee` (light gray)
- Hose/nozzle: `0x333333` (dark gray)
- Base: `0x666666` (concrete gray)

**Restaurant:**
- Roof: `0xa52a2a` (brown)
- Walls: `0x8b4513` (wood brown)
- Windows: `0xffff00` (warm yellow glow)

### UI Colors

| Element | Color | Hex |
|---------|-------|-----|
| Button | Slate blue | `0x3a6d8e` |
| Button hover | Lighter blue | `0x4a8aab` |
| Button shadow | Dark slate | `#1a3a5c` (hardcoded in MenuScene) |
| Selection arrow | Gold | `0xffd700` |
| Panel background | Dark gray | `0x222222` |
| Dialog background | Navy | `0x1a2a3e` |
| Footer panel | Navy | `0x1a2a3e` |
| Success/positive | Green | `0x22aa22` |
| Warning/danger | Red | `0xcc2200` |
| Gold/highlight | Gold | `0xffd700` |

### Menu Screen

The menu uses a **side-view alpine scene** with pixel-art elements:
- Sky gradient: `0x5bb8e8` → `0x87ceeb` → `0xa8ddf0` (bands proportional to snow line)
- Stepped pixel mountains using rock palette with snow caps (max 4 steps)
- White snow ground (`0xffffff`) with subtle grooming lines (`0xf0f6fa`)
- Animated falling snow particles (2-4px white rects, 40 particles)
- Pixel-art pine trees clustered along snow line
- Side-view groomer: tracks, red body (`0xcc2200`), blue cabin, front blade, exhaust (`0x555555`), dark red roof (`0xaa1a00`), blade accent (`0xaaaaaa`)
- Menu ribbon decorations: dark red shades (`0x8b1a1a`, `0x550000`, `0xe63e1a`, `0x991a00`)
- Retro 3D buttons with shadow offset
- Dark footer panel with gold "Made with ❄️" text
- Layout adapts to aspect ratio (portrait vs landscape)

### Difficulty Markers (French Standard)

Signage follows NF S52-102 (French ski slope marking standard). Reference: [sports.gouv.fr](https://www.sports.gouv.fr/pratiquer-l-hiver-balisage-et-signalisation-697)

| Difficulty | Color | Shape | Symbol |
|------------|-------|-------|--------|
| Tutorial | White `0xffffff` | Circle | ○ | Uses green markers in-game for snow visibility |
| Green | Green `0x22c55e` | Circle | ● |
| Blue | Blue `0x3b82f6` | Square | ■ |
| Red | Red `0xef4444` | Diamond | ◆ |
| Black | Near-black `0x1f2937` | Star | ★ |
| Park | Orange `0xf59e0b` | Triangle | ▲ |

### Character Portraits

Character faces appear in dialogue boxes using a 12×12 pixel grid system.

| Character | Role | Color Scheme | Features |
|-----------|------|--------------|----------|
| **Jean-Pierre** | Head Groomer | Blue `0x2d5a7b` | Mustache, balding grey hair |
| **Marie** | Chef | Purple `0x7b2d5a` | Chef hat, apron, buns |
| **Thierry** | Patrol | Green `0x5a7b2d` | Helmet, red badge, sunglasses |
| **Émilie** | Apprentice | Orange `0x7b5a2d` | Beanie, blonde hair |

Shared portrait colors: skin `0xffccaa`, eyes `0x000000`, mouth `0x553333`, hair grays `0x4a3b2a`/`0xd4a055`.

**Jalon rules (NF S52-102):**
- Right-side markers (going downhill) have orange top cap — since camera faces uphill, this is screen-left
- Danger poles: yellow/black stripes (`0xffcc00`/`0x111111`)
- Warning signs: yellow triangle with exclamation mark
- Avalanche barrier flags: yellow (`0xffcc00`)

## Wildlife

Procedural pixel art animals generated in `animalSprites.ts`. All rectangle-only, no curves. Fox uses shared hunting logic from `foxBehavior.ts`. Track marks drawn via `animalTracks.ts` in blue-gray (`0xb8c4d0`).

| Species | Grid Size | Key Colors |
|---------|-----------|------------|
| Bouquetin (ibex) | 10×8 | Gray-brown `0x6E6259`, belly tan `0xC4A35A`, dark horns `0x444444` |
| Chamois | 7×6 | Dark brown `0x5C3D1E`, cream belly `0xD4B87A`, face mask stripe |
| Marmot | 5×4 | Tawny `0x8B7355`, light belly `0xC4A87A` |
| Bunny | 6×5 | Near-white `0xF0F0F0`, pink inner ear `0xFFC0CB`, black ear tips |
| Bird (Alpine chough) | 4×3 top-down, 6×3 side-flying, 2×3 perched | Black `0x111111`, yellow beak `0xFFCC00`, red legs `0xFF3333` |
| Fox | 8×5 | Orange `0xCC6600`, cream belly `0xF0E0C0`, white tail tip |

### Bird Sprite Variants

- **Top-down flying** (4×3): V-shape wings spread, used in game scene
- **Side-view flying** (6×3): Soaring profile with raised wing, used in menu scene. Flips horizontally via `setScale(-1, 1)` for leftward flight
- **Perched** (2×3): Compact upright sitting pose with folded wings and visible red legs

## Texture Patterns

### Snow Textures

All snow textures are 16×16 tiles with detail rectangles for texture:

```
Groomed: White base + horizontal lines (every 3px)
┌────────────────┐
│════════════════│  ← grooming line (1px, e8f0f8)
│                │
│════════════════│
│                │
│════════════════│
└────────────────┘

Ungroomed: Off-white base + irregular shadow patches
┌────────────────┐
│  ▪▪            │  ← shadow patch (c8d4d8)
│         ▪▪▪    │
│    ▪▪▪         │
│           ▪▪   │
└────────────────┘

Off-piste: Bright base + mound highlights + subtle shadows
┌────────────────┐
│ ░░░    ░░░░    │  ← mound (f0f6fa, brighter)
│      ▪▪        │  ← shadow (d8e4ec)
│   ░░░░░░  ░░░  │
│ ▪▪       ░░    │
└────────────────┘
```

### Cliff Textures

Cliffs use tile-sized (16×16) rock cells with layered detail:

1. **Base fill**: Mid rock (`0x4a423a`)
2. **Light patches**: 3-4px rectangles of light rock (`0x6a5e52`)
3. **Shadow details**: 2-3px rectangles of dark rock (`0x2d2822`)
4. **Edge variation**: ~30% of edge tiles randomly skipped for organic look

### Service Roads

Switchback paths through off-piste forest, allowing groomer to travel between piste sections:
- **Surface**: `snow_packed` tile (`0xd8e4e8` base) — distinct from groomed piste (white) and off-piste
- **Poles**: Amber-yellow/black stripes, matching piste marker size (28×5px)
  - Amber: `0xFFAA00` (distinct from red `0xFF0000` piste markers)
  - Black: `0x111111`
  - Spacing: minimum 12 tiles screen-distance between poles (prevents clustering at turns)
- **Tree clearance**: Trees and rocks avoid `accessPathRects` zones
- **Physics**: Boundary walls exempt road area so groomer can traverse
- **Introduction**: Level 4 intro dialog explains service roads (first appearance)

### Winch Anchors

- Base plate: `0x888888` (gray metal)
- Pole: `0xFFAA00` (amber)
- Cable hook: `0xCCCCCC` (light gray), rectangular ring (no circles)
- Number plate: `0xffff00` (yellow) with black number text

## Rendering Guidelines

### Depth/Layering (Phaser depth values)

All depth values are centralized in `DEPTHS` from `src/config/gameConfig.ts`:

| Layer | Depth | Constant | Contents |
|-------|-------|----------|----------|
| Background tiles | -100 | `BG_FOREST_TILES` | Off-piste snow beyond world bounds |
| Background rocks | -50 | `BG_FOREST_ROCKS` | Rocks beyond world bounds |
| Terrain | 0 | `TERRAIN` | Off-piste snow tiles (base layer) |
| Access roads | 1 | `ACCESS_ROAD` | Packed snow on service roads |
| Piste | 2 | `PISTE` | Piste snow tiles (above access roads) |
| Ground objects | 2 | `GROUND_OBJECTS` | Chalets, anchor posts |
| Cliffs | 3 | `CLIFFS` | Cliff rock textures |
| Trees | 4 | `TREES` | Trees (above cliffs in top-down view) |
| Ground labels | 5 | `GROUND_LABELS` | Anchor numbers, text on objects |
| Signage | 6 | `SIGNAGE` | Steep zones, warnings |
| Markers | 8 | `MARKERS` | Piste marker poles, road poles |
| Winch cable | 50 | `WINCH_CABLE` | Cable graphics |
| Night overlay | 100 | `NIGHT_OVERLAY` | Night/weather darkening |
| Player | 101 | `PLAYER` | Groomer (above night for headlights) |
| Feedback/Weather | 200 | `FEEDBACK`/`WEATHER` | Floating text, snow particles |
| Victory | 500 | `VICTORY` | Victory text (topmost) |

### Organic Edges

For natural-looking boundaries (cliffs, terrain transitions):
1. Add per-row variation (0-0.5 tiles)
2. Variation only pushes AWAY from piste, never into it
3. Skip ~30% of edge tiles randomly
4. Use seeded random for consistency across renders

### HUD / Visor Strip

The HUD uses a "visor" pattern: full-width semi-transparent dark bar across the top with a 3-row horizontal layout.

**Layout:**
```
Row 1: Level name (left) + winch status (center) + timer (right)
Row 2: Fuel bar + stamina bar + coverage bar (all horizontal)
Row 3: Bonus objectives (horizontal columns)
```

| Property | Value |
|----------|-------|
| Background | Black `0x000000`, alpha 0.55 (0.80 in accessibility modes) |
| Bottom accent | Cyan (`THEME.colors.infoHex`), alpha 0.40, 1px (2px in high-contrast) |
| Text | White `#FFFFFF` (main), muted `#EEEEEE` (skip) |
| Text stroke | Black `#000000` (accessibility modes only) |
| Bar border | Gray `0x555555` (normal) / `0x999999` (high-contrast) |
| Bar background | Dark `0x222222` |
| Fuel bar | Red (`THEME.colors.dangerHex`), brighter red `0xff0000` when ≤30% |
| Stamina bar | Green (`THEME.colors.successHex`), orange `0xffaa00` when ≤30% |
| Coverage bar | White `0xffffff` (below target), green (`THEME.colors.successHex`) when ≥ target |
| Coverage target marker | Gold (`THEME.colors.accentHex`), 2px wide, extends 4px above/below bar |
| Timer | White, red when ≤60s remaining |
| Bar identifiers | Colored dots (normal) or text labels "F"/"S" (colorblind mode) |

**Compact mode** (narrow/short screens): Shorter bars (60px vs 80px). Bonus objectives flash for 4s then fade, re-flash on status change.

Touch button icons are pixel art drawn with `fillRect` calls:
- **Groom**: 3-prong rake/tiller in light blue (`0xddddff`) on dark blue bg (`0x1a4a7a`)
- **Winch**: Simplified anchor shape in warm gold (`0xffddaa`) on dark brown bg (`0x7a4a1a`)
- Both on circular dark backgrounds with beveled edge highlight

Pause/fullscreen buttons use pill-shaped backgrounds (black, alpha 0.55) for contrast against any terrain.

### Night Rendering

- Dark overlay: `0x000022` at 70% opacity
- Headlights: Layered circles with decreasing opacity
- Front lights: 108° spread, 5 tile range, warm white (`0xffffee`)
- Rear lights: 5 tile range, slightly warm tint (`0xffddcc`)

## Adding New Visual Elements

When adding new sprites or visual elements:

1. **Use existing palettes** - Pick colors from the tables above
2. **Match tile scale** - New elements should relate to 16px tile size
3. **Simple shapes** - Rectangles only, no curves or complex polygons
4. **Limited details** - 2-4 colors per simple element (rocks, markers), up to 9 for complex sprites (groomer, fuel station)
5. **Generate in BootScene** - All textures created via Phaser Graphics
6. **Test in context** - Verify against snow backgrounds and other elements

## Anti-Patterns (Avoid)

- ❌ Gradients (use flat colors with discrete detail patches)
- ❌ Circles/curves (use rectangles only)
- ❌ External image files (generate all textures)
- ❌ Gray cliffs (use warm brown alpine palette)
- ❌ Pure black shadows (use dark brown `0x1a1612` or `0x2d2822`)
- ❌ Too many colors per element (max 4-5 for simple elements, max 9 for complex sprites)
- ❌ Anti-aliasing or smoothing effects
