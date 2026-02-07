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
| Groomer | 32×48 | 2 tiles wide, 3 tiles tall |
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

**Trees:**
- Foliage: `0x228b22` (forest green)
- Trunk: `0x8b4513` (saddle brown)

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
| Button | Slate blue | `0x2d5a7b` |
| Button hover | Lighter blue | `0x3d7a9b` |
| Button shadow | Dark slate | `0x1a3a5c` |
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
- Side-view groomer: tracks, red body, blue cabin, front blade, exhaust
- Retro 3D buttons with shadow offset
- Dark footer panel with gold "Made with ❄️" text
- Layout adapts to aspect ratio (portrait vs landscape)

### Difficulty Markers (French Standard)

| Difficulty | Color | Shape | Symbol |
|------------|-------|-------|--------|
| Tutorial | White `0xffffff` | Circle | ○ |
| Green | Green `0x22c55e` | Circle | ● |
| Blue | Blue `0x3b82f6` | Square | ■ |
| Red | Red `0xef4444` | Diamond | ◆ |
| Black | Near-black `0x1f2937` | Star | ★ |
| Park | Orange `0xf59e0b` | Triangle | ▲ |

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

- Post: `0x888888` (gray metal)
- Number plate: `0xffff00` (yellow) with black text
- Anchor symbol: ⚓ (displayed as text or simple graphic)

## Rendering Guidelines

### Depth/Layering (Phaser depth values)

| Layer | Depth | Contents |
|-------|-------|----------|
| Terrain | 0 | Snow tiles, cliffs |
| Ground objects | 1-2 | Trees, rocks, buildings |
| Player | 3 | Groomer |
| Effects | 4-5 | Cliff edges, markers |
| UI overlays | 10+ | HUD, dialogues |

### Organic Edges

For natural-looking boundaries (cliffs, terrain transitions):
1. Add per-row variation (0-0.5 tiles)
2. Variation only pushes AWAY from piste, never into it
3. Skip ~30% of edge tiles randomly
4. Use seeded random for consistency across renders

### HUD / Visor Strip

The HUD uses a "visor" pattern: full-width semi-transparent dark bar across the top.

| Property | Value |
|----------|-------|
| Background | Black `0x000000`, alpha 0.55 |
| Bottom accent | Cyan (`THEME.colors.infoHex`), alpha 0.40, 1px |
| Text | White `#FFFFFF` (main), muted `#EEEEEE` (skip) |
| Coverage | White, green `#00FF00` when target met |
| Timer | White, red when ≤60s remaining |
| Target | Accent yellow (`THEME.colors.accent`) |

Touch button icons are pixel art drawn with `fillRect` calls:
- **Groom**: 3-prong rake/tiller in light blue (`0xddddff`)
- **Winch**: Simplified anchor shape in warm gold (`0xffddaa`)
- Both on circular dark backgrounds with beveled edge highlight

Pause/fullscreen buttons use pill-shaped backgrounds (black, alpha 0.55) for contrast against any terrain.

### Night Rendering

- Dark overlay: `0x000022` at 70% opacity
- Headlights: Layered circles with decreasing opacity
- Front lights: 108° spread, 5 tile range, warm white
- Rear lights: 5 tile range, slightly warm tint

## Adding New Visual Elements

When adding new sprites or visual elements:

1. **Use existing palettes** - Pick colors from the tables above
2. **Match tile scale** - New elements should relate to 16px tile size
3. **Simple shapes** - Rectangles only, no curves or complex polygons
4. **Limited details** - 2-4 colors per element maximum
5. **Generate in BootScene** - All textures created via Phaser Graphics
6. **Test in context** - Verify against snow backgrounds and other elements

## Anti-Patterns (Avoid)

- ❌ Gradients (use flat colors with discrete detail patches)
- ❌ Circles/curves (use rectangles only)
- ❌ External image files (generate all textures)
- ❌ Gray cliffs (use warm brown alpine palette)
- ❌ Pure black shadows (use dark brown `0x1a1612` or `0x2d2822`)
- ❌ Too many colors per element (max 4-5)
- ❌ Anti-aliasing or smoothing effects
