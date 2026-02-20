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
| Skier | 20×28 | ~1.25 tiles wide, 1.75 tiles tall (8 variants) |
| Snowboarder | 20×28 | ~1.25 tiles wide, 1.75 tiles tall (8 variants) |

## Color Palettes

### Snow & Terrain

| Surface | Base Color | Detail Colors | Notes |
|---------|------------|---------------|-------|
| Groomed piste | `0xffffff` (white) | `0xe8f0f8` (lines) | Horizontal grooming lines every 3px |
| Ungroomed piste | `0xe8eff3` (off-white) | `0xc8d4d8` (shadows) | Irregular shadow patches |
| Off-piste powder | `0xdce6ec` (darker) | `0xe4ecf0` (mounds), `0xccd8e2` (shadows) | Darker than piste for contrast |
| Ice | `0xb8e0f0` (blue-tint) | - | Hazardous surface |
| Deep snow | `0xd0e0e8` (gray-blue) | - | Slower movement |
| Steep slide (25°) | `0xd0dee6` (warm gray-blue) | `0xc0ced6` | Gentle slope warning |
| Steep slide (30°) | `0xc8d8e2` (cool gray-blue) | `0xb8c8d2` | Moderate slope |
| Steep slide (35°) | `0xc0d2de` (cool gray-blue) | `0xb0c2ce` | Near slide threshold |
| Steep tumble (40°) | `0xb8d8ee` (cold blue) | `0xa8c8de` | Tumble danger zone |
| Steep tumble (45°) | `0xaed0ea` (icy blue) | `0x9ec0da` | Severe danger |
| Steep tumble (50°) | `0xa4c8e6` (icy blue) | `0x94b8d6` | Maximum danger |

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
- Storm variant (`groomer_storm`): same sprite with snow patches (`0xf0f5f8`) on roof and body

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
| Settings panel | Muted teal | `0x2d4a63` |
| Dialog background | Navy | `0x1a2a3e` |
| Footer panel | Navy | `0x1a2a3e` |
| Success/positive | Green | `0x22aa22` |
| Warning/danger | Red | `0xcc2200` |
| CTA button | Forest green | `0x228b22` |
| CTA button hover | Bright green | `0x33bb33` |
| Park rank button | Orange | `0xf59e0b` |
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
- Warning signs: yellow triangle with exclamation mark on yellow danger pole (`0xddaa00`), tumble zones only (≥40°), placed on left piste border
- Avalanche barrier flags: yellow (`0xffcc00`)

### Slalom Gate Poles (Ski Reward Run)

Paired red/blue poles placed along the piste on L4, L5, L10. Rectangles only.

| Element | Size | Colors |
|---------|------|--------|
| Color shaft | 3×30 px | Red `0xcc2222` or Blue `0x1e90ff` |
| Ground base | 3×6 px | Black `0x111111` |

- Base texture: 3×36 px, no scaling (world-coordinate size, like piste markers)
- Depth: `DEPTHS.MARKERS` (9)
- On miss: poles dim to 30% alpha

### Victory Screen Props

Level-specific pixel art props drawn next to the groomer on the win screen. All rectangle-only, no curves. Scale: `3.0 × scaleFactor`. Positioned left of the groomer at the snow line.

| Level | Prop | Key Colors |
|-------|------|------------|
| L1 Les Marmottes | Chalet | Walls `0x8b4513`, roof `0xa52a2a`, snow `0xf0f5f8`, windows `0xffff00`, door `0x5a3018` |
| L2 Le Chamois | Snow rock | Base `0x696969`, highlight `0x888888`, snow cap `0xf0f5f8` |
| L3 Air Zone | Kicker ramp | Snow `0xddeeff`, edge highlight `0xaabbcc` (stepped rectangles) |
| L4 L'Aigle | Slope warning sign | Pole `0xffcc00`/`0x111111` stripes, sign `0xddaa00`, exclamation `0x111111` |
| L5 Le Glacier | Winch post | Post `0x888888`, drum `0x666666`, cable `0x999999` |
| L6 Le Tube | Halfpipe walls | Snow `0xddeeff`, lip highlight `0xaabbcc` (stepped rectangles) |
| L7 La Verticale | Moon & stars | Moon `0xffffcc`, shadow `0x000022`, stars `0xffffff` (depth 3) |
| L8 Col Dangereux | Avalanche debris | Snow `0xdde8f0`, rock `0x696969`, trunk `0x5a3a1a`, foliage `0x2d5a1a` |
| L10 Coupe des Aiguilles | Trophy | Gold `0xffd700`, pedestal `0x4a3a2a`/`0x5a4a3a`, star `0xfffff0` |

L0 (Tutorial) and L9 (Tempête) have no props — tutorial is introductory, storm weather effects are sufficient.

**Ski/snowboard wins** show level-appropriate features:
- **Gate levels** (L4, L5, L10): Red/blue slalom gate pair
- **L3** (Air Zone): Kicker ramp (same as groomer win)
- **L6** (Le Tube): Halfpipe walls (same as groomer win)
- Other levels: no props (character alone is sufficient)

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

### Skier & Snowboarder Sprites

Procedural pixel art generated in `skiSprites.ts` for the post-grooming reward run. Top-down view, 20×28px using direct `fillRect` calls (same approach as groomer sprite). Generated in BootScene. 8 texture variants per character: straight, left, right, brake.

90s retro ski clothing style with neon color blocking.

| Element | Dimensions | Key Colors |
|---------|-----------|------------|
| Skier (straight/left/right/brake) | 20×28px | Teal jacket `0x00aaaa`, magenta panels `0xcc2288`, dark teal `0x007777`, red bonnet `0xcc2200`, yellow pompom `0xffdd00`, goggles `0x87ceeb`, skis `0x666666` |
| Snowboarder (straight/left/right/brake) | 20×28px | Hot pink jacket `0xff3388`, blue panels `0x3366ff`, dark pink `0xcc2266`, orange beanie `0xff6600`, board `0x8b4513`/`0x664422`, goggles `0x87ceeb` |

Shared colors: boots `0x333333`, goggles `0x87ceeb`.

**Skier variants:** Straight = parallel skis, bonnet with pompom on top. Left/right = skis angle into turn, body leans. Brake = pizza/snow plow stance (ski tips converge downhill, tails spread uphill).

**Snowboarder variants:** Straight = vertical board (nose downhill). Left/right = board angled diagonally in turn direction. Brake = horizontal board (perpendicular to fall line), crouched stance.

### Ski Tracks

Drawn on ungroomed and off-piste snow via a persistent Graphics layer at `DEPTHS.PISTE + 0.5`:

- **Skier** — Two parallel 1px lines with perpendicular offset following direction of travel. Gap = `tileSize × 0.15` from center.
- **Snowboarder** — Single 3px wide line.
- **Color** — `0x8899aa` (blue-gray). Alpha 0.15 on ungroomed piste, 0.25 off-piste.
- **Spacing** — New segment drawn every `tileSize × 0.5` pixels for smooth curves.

### Favicon

SVG at `assets/favicon.svg`. Pixel-art style with `shape-rendering="crispEdges"`. Uses game palette: slate blue sky `#3a6d8e`, brown rock mountain `#4a423a`/`#6a5e52`, white snow cap, two-tone red groomer `#cc2200`/`#aa1a00`, blue windshield `#87ceeb`, white groomed snow with `#d8e4e8` corduroy lines.

### Bird Sprite Variants

- **Top-down flying** (4×3): V-shape wings spread, used in game scene
- **Side-view flying** (6×3): Soaring profile with raised wing, used in menu scene. Flips horizontally via `setScale(-1, 1)` for leftward flight
- **Perched** (2×3): Compact upright sitting pose with folded wings and visible red legs

## Texture Patterns

### Snow Textures

All snow textures are 16×16 tiles with detail rectangles for texture:

```
Groomed (high quality ≥80%): White base + even horizontal lines (every 3px)
┌────────────────┐
│════════════════│  ← grooming line (1px, e8f0f8)
│                │
│════════════════│
│                │
│════════════════│
└────────────────┘

Groomed (medium quality 50-80%): Slightly grey + offset lines
┌────────────────┐
│══════════════  │  ← offset/shorter lines (dce6f0)
│                │
│ ════════════════
│                │
│═════════════   │
└────────────────┘

Groomed (low quality <50%): Grey base + scattered short dashes
┌────────────────┐
│ ══════         │  ← fragmented lines (d0dae4)
│        ═══════ │
│═════           │
│          ════  │
│   ════════     │
└────────────────┘

Ungroomed: Off-white base + irregular shadow patches
┌────────────────┐
│  ▪▪            │  ← shadow patch (c8d4d8)
│         ▪▪▪    │
│    ▪▪▪         │
│           ▪▪   │
└────────────────┘

Off-piste: Darker base for contrast + mound highlights + subtle shadows
┌────────────────┐
│ ░░░    ░░░░    │  ← mound (e4ecf0, lighter)
│      ▪▪        │  ← shadow (ccd8e2)
│   ░░░░░░  ░░░  │
│ ▪▪       ░░    │
└────────────────┘

Steep zones: Same patterns as ungroomed/groomed, but with blue-shifted palette.
Slide zones (25°–35°) use warm gray-blue; tumble zones (40°–50°) use cold icy blue.
Textures are pre-generated in BootScene (setTint does NOT work on Canvas renderer).
Texture keys: snow_steep_{slope}, snow_groomed_steep_{slope} (slope: 25,30,35,40,45,50)
```

### Park Feature Visuals

Terrain park features drawn procedurally via Phaser Graphics (no texture files):

- **Kickers**: Wide tabletop ramp (~3×2 tiles). Two tiers: wide base (`0xdce4ee`) and narrower lip (`0xeef2fa`). Ground shadow (`0xb0bcc8`, 60% alpha) for contrast against snow. Lip edge accent (`0x8899aa`). Y-depth sorted.
- **Rails**: Narrow metallic bar (~1×3 tiles). Dark gray body (`0x666677`), highlight stripe (`0x9999bb`), three support posts (top/middle/bottom, `0x444455`). Y-depth sorted.
- **Line corridors**: Subtle lane tints along each feature line. Jump line blue (`0x4488cc`, 5% alpha), jib line orange (`0xcc8844`, 5% alpha). Small paint dots at corridor edges every 4 tiles (15% alpha).
- **Zone paint marks**: Blue takeoff lines (`0x2266cc`, 40% alpha) at approach/run-in exit. Orange landing lines (`0xcc6622`, 35% alpha) at landing/run-out entry. Solid 2px-tall `fillRect` strips.
- **Halfpipe walls**: Gradient fill along piste edges (3 tiles wide). Darker toward piste edge to simulate concave banking. Blue-gray tint (`0x8899bb`). Edge line marks the lip.
- **Trick sparks** (ski run only): Small rectangles falling from skier during rail grinds. Each grind trick has a distinct spark color: Boardslide (`0xffdd44` yellow), 50-50 (`0x44ddff` cyan), Lipslide (`0xff6644` orange-red), Tailslide (`0x66ff44` green). 40% chance of white (`0xffffff`) fallback. 3px squares, falling 12×baseScale with 300ms fade.

Physics collision textures (`park_kicker`, `park_rail`): 4×4px near-transparent sprites used as invisible physics bodies. Visuals are drawn separately by ParkFeatureSystem.

### Cliff Textures

Cliffs use tile-sized (16×16) rock cells with layered detail:

1. **Base fill**: Mid rock (`0x4a423a`)
2. **Light patches**: 3-4px rectangles of light rock (`0x6a5e52`)
3. **Shadow details**: 2-3px rectangles of dark rock (`0x2d2822`)
4. **Edge variation**: ~30% of edge tiles randomly skipped for organic look

### Service Roads

Switchback paths through off-piste forest, allowing groomer to travel between piste sections:
- **Surface**: `snow_packed` tile (`0xe6eef3` base) — close to piste brightness, distinct from off-piste
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

## Failure Groomer Effects (LevelCompleteScene)

On fail screens, the standard groomer is replaced by a failure-specific visual drawn via `drawGroomerFailEffect()`. The fail overlay uses `0x3a1a1a` at 55% alpha.

| Failure Type | Visual | Colors |
|-------------|--------|--------|
| Tumble | Upside-down groomer with smoke | Standard groomer colors + smoke `0x888888` |
| Avalanche | Snow pile with cabin roof tip poking out | Snow `0xf0f5f8`, `0xe0e8ef`; roof tip `0xaa1a00` |
| Cliff | Tilted groomer with debris, warning stripes | Debris `0x6a5e52`; stripes `0xff4444` |
| Fuel | Smoke plumes rising, red fuel gauge | Smoke `0x666666`; gauge `0xff0000` |
| Time | Gray "zzZ" sleep marks above groomer | Text `0xaaaacc` |

## Level Select Trail Map

The trail map uses a three-peak mountain silhouette with colored run paths, difficulty markers, a chairlift, and a lodge. All elements are rectangles only.

### Mountain Terrain
- Three peaks: main center (x≈0.50), left shoulder (x≈0.18), right ridge (x≈0.82)
- Rock palette: shadow `0x2d2822`, mid `0x4a423a`, light `0x6a5e52`, highlight `0x8a7e6a`
- Snow cap on summit top ~20% (white `0xffffff`)
- Summit cross landmark: dark brown `0x2d2822`

### Run Paths & Markers
- Path color by difficulty: Green `0x22c55e`, Blue `0x3b82f6`, Red `0xef4444`, Black `0x1f2937`, Park `0xf59e0b`
- White outline pass + colored inner pass for depth; alpha 0.85 unlocked, 0.25 locked
- Marker squares: ~28px scaled, white border (2px), difficulty-colored fill, symbol (●■◆★▲ or 🔒)
- Selection ring: gold `0xffd700` border (3px) + translucent glow (0.4 alpha)

### Chairlift (Right Ridge)
- Cable: dark brown `0x2d2822` at 0.9 alpha, pixel-stepped for continuity
- 4 pylons with cross-arms along cable
- Gondola cars: red `0xcc2200` body, light blue `0x87ceeb` window
- Base station: brown `0x4a423a` body, red `0xcc2200` roof, "Télécabine" label

### Lodge (Chez Marie)
- Body: warm brown `0x8b4513`, stepped roof dark red `0x8b1a1a` with white snow cap
- Windows: gold `0xffd700`, door: dark brown `0x2d2822`
- Chimney: brown `0x4a423a` with white smoke rectangles

### Info Panel
- Background: navy `0x1a1a2e` at 0.94 alpha, gold accent line at top
- Groom/Ski buttons using standard CTA styling

## Rendering Guidelines

### Depth/Layering (Phaser depth values)

All depth values are centralized in `DEPTHS` from `src/config/gameConfig.ts`:

| Layer | Depth | Constant | Contents |
|-------|-------|----------|----------|
| Background tiles | -100 | `BG_FOREST_TILES` | Off-piste snow beyond world bounds |
| Background trees/rocks | 1 | `BG_FOREST_ROCKS` | Trees/rocks beyond world bounds |
| Terrain | 0 | `TERRAIN` | Off-piste snow tiles (base layer) |
| Access roads | 1 | `ACCESS_ROAD` | Packed snow on service roads |
| Piste | 2 | `PISTE` | Piste snow tiles (above access roads) |
| Ground objects | 2 | `GROUND_OBJECTS` | Chalets, anchor posts |
| Cliffs | 3 | `CLIFFS` | Cliff rock textures |
| Trees | 4 | `TREES` | Trees (above cliffs in top-down view) |
| Ground labels | 5 | `GROUND_LABELS` | Anchor numbers, text on objects |
| Signage | 8 | `SIGNAGE` | Avalanche warnings, hazards |
| Markers | 9 | `MARKERS` | Piste poles, road poles, danger poles |
| Winch cable | 50 | `WINCH_CABLE` | Cable graphics |
| Airborne | 55 | `AIRBORNE` | Flying birds, airborne objects |
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

Night levels use pre-generated `_night` variant textures instead of a runtime overlay:

- **Texture generation**: Day textures darkened at boot via canvas `multiply` composite
- **Brightness**: `BALANCE.NIGHT_BRIGHTNESS` = 0.3 (30% of original RGB)
- **Blue shift**: `BALANCE.NIGHT_BLUE_SHIFT` = 0.15 (adds 15% blue channel)
- **Color transform**: Graphics fill colors use `nightColor()` from `nightPalette.ts`
- **Headlight glow**: Small 256×256 DynamicTexture in world coords on groomer, warm white (`0xffffee`)
- Front lights: 108° spread, 5 tile range
- Rear lights: 5 tile range, slightly warm tint (`0xffddcc`)
- **Frost vignette**: Skipped on night levels (invisible behind darkening)

## Adding New Visual Elements

When adding new sprites or visual elements:

1. **Use existing palettes** - Pick colors from the tables above
2. **Match tile scale** - New elements should relate to 16px tile size
3. **Simple shapes** - Rectangles only, no curves or complex polygons
4. **Limited details** - 2-4 colors per simple element (rocks, markers), up to 9 for complex sprites (groomer, fuel station)
5. **Generate in BootScene** - All textures created via Phaser Graphics
6. **Set NEAREST scaleMode** - After `generateTexture()` or `addDynamicTexture()`, set `source[0].scaleMode = Phaser.ScaleModes.NEAREST` for crisp scaling. Set `context.imageSmoothingEnabled = false` on DynamicTexture contexts. Do NOT use global `pixelArt: true` (breaks Firefox Canvas)
7. **Test in context** - Verify against snow backgrounds and other elements

## Anti-Patterns (Avoid)

- ❌ Gradients (use flat colors with discrete detail patches)
- ❌ Circles/curves (use rectangles only)
- ❌ External image files (generate all textures)
- ❌ Gray cliffs (use warm brown alpine palette)
- ❌ Pure black shadows (use dark brown `0x1a1612` or `0x2d2822`)
- ❌ Too many colors per element (max 4-5 for simple elements, max 9 for complex sprites)
- ❌ Anti-aliasing or smoothing effects
