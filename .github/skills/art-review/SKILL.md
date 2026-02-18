---
name: art-review
description: Art director review of visual code and rendered output. Use this when asked to review visual consistency, art style compliance, sprite quality, responsive layout across viewports, or before committing visual changes.
---

## Art Director Review Process

Review all visual code and rendered output for compliance with `docs/ART_STYLE.md`. The game uses a SkiFree-inspired retro pixel-art style — rectangles only, flat colors, limited palettes, procedurally generated textures.

### Phase 1: Scope detection

Identify which changed files contain visual/rendering code:

```
src/scenes/BootScene.ts          # Texture generation
src/scenes/GameScene.ts          # Terrain, cliffs, markers, rendering
src/scenes/MenuScene.ts          # Menu pixel art, alpine scene
src/scenes/HUDScene.ts           # HUD visor, touch buttons
src/scenes/PauseScene.ts         # Pause overlay
src/scenes/SettingsScene.ts      # Settings UI
src/scenes/LevelCompleteScene.ts # Victory screen
src/scenes/CreditsScene.ts       # Credits visuals
src/utils/animalSprites.ts       # Wildlife pixel art
src/utils/characterPortraits.ts  # Character face sprites
src/utils/animalTracks.ts        # Track/footprint drawing
src/systems/WeatherSystem.ts     # Night overlay, headlights, particles
src/systems/WildlifeSystem.ts    # Animal rendering, positioning
src/config/gameConfig.ts         # DEPTHS, BALANCE (visual tuning)
src/config/theme.ts              # UI color theme
```

Use `git --no-pager diff --cached --name-only` (or `git --no-pager diff HEAD --name-only` for unstaged) to identify changed files. If none of the above files changed, report "No visual changes detected" and skip the review.

### Phase 2: Code review against ART_STYLE.md

Read `docs/ART_STYLE.md` in full, then launch parallel explore agents to check each dimension:

1. **Color compliance**
   - Every hex color in rendering code must match an `ART_STYLE.md` palette entry
   - Check: snow/terrain colors, cliff palette, vehicle colors, UI colors, wildlife colors, marker colors
   - Flag any unknown or undocumented hex values
   - Common violations: gray cliffs (should be warm brown), pure black shadows (should be `0x1a1612` or `0x2d2822`)

2. **Shape compliance**
   - Only `fillRect` for drawing — no `arc`, `circle`, `lineTo` curves, `ellipse`, `beginPath` with curves
   - No gradients (`createLinearGradient`, `createRadialGradient`)
   - No anti-aliasing or smoothing (`imageSmoothingEnabled` should be false)
   - All sprites built from rectangles

3. **Dimension consistency**
   - Sprites match documented sizes: tiles 16×16, groomer 32×48, trees 30×40, rocks 24×16, restaurant 60×50, fuel station 44×44
   - Character portraits use 12×12 pixel grid
   - Wildlife sprites match grid sizes in ART_STYLE.md (bouquetin 10×8, chamois 7×6, marmot 5×4, etc.)
   - New elements relate proportionally to 16px tile grid

4. **Depth layering**
   - All depth values use `DEPTHS.*` constants from `src/config/gameConfig.ts`
   - No magic depth numbers
   - Layering order matches ART_STYLE.md table (terrain=0 < piste=2 < cliffs=3 < trees=4 < markers=8 < player=101)

5. **Anti-pattern detection** (from ART_STYLE.md)
   - ❌ Gradients (use flat colors with discrete detail patches)
   - ❌ Circles/curves (use rectangles only)
   - ❌ External image files (generate all textures procedurally)
   - ❌ Gray cliffs (use warm brown alpine palette)
   - ❌ Pure black shadows (use dark brown `0x1a1612` or `0x2d2822`)
   - ❌ Too many colors per element (max 4-5)
   - ❌ Anti-aliasing or smoothing effects

6. **Proportion & composition**
   - New sprites are proportional to existing elements relative to 16px tile grid
   - Elements don't visually clash in scale
   - Texture detail density is consistent (2-4 detail rectangles per 16×16 tile)
   - Color count per element stays within 4-5 max

7. **Accessibility & contrast**
   - Interactive UI elements have sufficient contrast against backgrounds
   - Color-blind-safe distinctions — not relying solely on red/green differentiation
   - Text readability against varying terrain backgrounds
   - HUD elements visible over both light (snow) and dark (night) scenes
   - Small interactive elements should have generous touch targets (48px+ padding) when not adjacent to other interactive elements. Use separate zones: tight for mouse hover, large padded for touch/click.

### Phase 3: Visual inspection

Launch the dev server and capture screenshots for visual verification:

1. Start dev server: `./dev.sh` (reads PORT from .env.local, default 3000)
2. Use Playwright to navigate to affected screens:
   ```python
   from playwright.sync_api import sync_playwright
   with sync_playwright() as p:
       browser = p.chromium.launch()
       page = browser.new_page(viewport={"width": 1280, "height": 720})
       page.goto("http://localhost:3000")
       # Wait for menu scene (game instance is window.game)
       page.wait_for_function("""() => {
           const game = window.game;
           if (!game || !game.scene) return false;
           const scene = game.scene.getScene('MenuScene');
           return scene && scene.sys && scene.sys.isActive();
       }""")
       page.screenshot(path="tests/screenshots/art-review/menu.png")
   ```
3. Capture screenshots of all affected screens (menu, gameplay, HUD, pause, settings, level complete)
4. Save to `tests/screenshots/art-review/` for human reference
5. Analyze screenshots for:
   - Dominant colors matching documented palettes
   - Sprite visibility and readability
   - Element overlap or z-ordering issues
   - Visual balance and composition
   - Retro aesthetic fidelity (crisp pixels, no blur)

### Phase 3b: Responsive layout validation

When reviewing scenes with UI layout (menus, overlays, HUD, settings, daily runs), test across representative viewports. This catches text overflow, button overlap, and elements going off-screen.

**Reference viewports** (test at minimum 3, always include smallest and largest):

| Name | Size | Use case |
|------|------|----------|
| Mobile portrait | 360×640 | Phones (smallest common) |
| Mobile landscape | 640×360 | Phones rotated |
| Tablet portrait | 768×1024 | iPad |
| Tablet landscape | 1024×768 | iPad rotated |
| Desktop | 1280×720 | Standard laptop (default) |
| Ultrawide | 2560×1080 | Ultrawide monitors |

**What to check at each viewport:**
- **No text truncation** — all labels, titles, and descriptions fully visible
- **No element overlap** — buttons, text blocks, and decorative elements must not collide
- **No off-screen content** — all interactive elements reachable without scrolling
- **Touch target size** — buttons ≥44px tall on mobile viewports (360–768px wide)
- **Readable font size** — minimum ~12px effective on mobile; scale factor should keep text legible
- **Consistent spacing** — margins and gaps proportional to viewport, no cramped layouts

**Testing procedure:**
```python
VIEWPORTS = [
    ("mobile_portrait", 360, 640),
    ("mobile_landscape", 640, 360),
    ("tablet_landscape", 1024, 768),
    ("desktop", 1280, 720),
    ("ultrawide", 2560, 1080),
]

for name, w, h in VIEWPORTS:
    page.set_viewport_size({"width": w, "height": h})
    # Wait for resize to propagate (debounced at 150ms + scene restart)
    page.wait_for_timeout(500)
    page.screenshot(path=f"tests/screenshots/art-review/{scene}_{name}.png")
```

**Orientation change:** After capturing landscape, resize to portrait (and vice versa) to verify the scene adapts without artifacts or frozen layouts.

**Known patterns:**
- Scenes use `scaleFactor = min(scaleByHeight, scaleByWidth) * dprBoost` — verify it doesn't produce illegible text at small viewports or wasteful whitespace at large ones
- SettingsScene switches to single-column below 500px logical width
- MenuScene drops Fullscreen button when buttons overflow vertical space
- HUDScene uses debounced resize (300ms + 10px threshold) for mobile viewport jitter

### Phase 4: Cross-model consultation

Only perform cross-model consultation when Phase 2 produced significant findings (3+ issues, or changes affect major visual systems like terrain/sprites/weather):

- When running as Opus: consult `gemini-3-pro-preview` (strong vision analysis) and `gpt-5.2` (creative/aesthetic judgment)
- When running as any other model: consult `claude-opus-4.6` (vision-capable, strong aesthetic sense)

Share screenshots from Phase 3 alongside findings and ask reviewers to evaluate:
- Palette compliance — do rendered colors match ART_STYLE.md?
- Visual balance — are elements well-composed and proportional?
- Retro aesthetic — does it maintain SkiFree-inspired pixel-art feel?
- Accessibility — are all interactive elements clearly visible and distinguishable?
- Missed issues — anything the code review didn't catch?

Skip this phase for minor changes (single color tweak, no HIGH findings, < 3 total issues).

### Phase 5: Prioritized findings

Organize findings into a severity matrix:

| Severity | Criteria | Examples |
|----------|----------|---------|
| **HIGH** | Breaks visual identity, accessibility issue | Wrong palette, gradients, curves, unreadable UI, external images |
| **MEDIUM** | Inconsistent with style guide, proportion mismatch | Slightly off colors, oversized sprites, depth layering errors, too many colors |
| **LOW** | Polish opportunities, minor improvements | Better color choices, texture detail density, composition tweaks |
| **DEFERRED** | Large visual reworks, new art direction | Full palette revision, new animation systems |

Track findings in SQL:

```sql
CREATE TABLE IF NOT EXISTS art_review (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    file_path TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open'
);
```

### Phase 6: Implementation

For each fix:

1. **Match exact palette** — Use the specific hex values from ART_STYLE.md, not approximations
2. **Use DEPTHS constants** — Import from `src/config/gameConfig.ts`, never hardcode depth numbers
3. **Rectangle-only shapes** — Replace any curves/circles with `fillRect` equivalents
4. **Re-screenshot** — Capture new screenshots after fixes to confirm visual improvement
5. **Update ART_STYLE.md** — If adding new visual elements, document their colors, dimensions, and layer in the style guide
6. **Preserve behavior** — Visual fixes must not change gameplay mechanics or break existing tests

### Phase 7: Verification

1. Run TypeScript compilation: `npx tsc --noEmit`
2. Run test suite: `./run-tests.sh --browser chromium`
3. Take comparison screenshots (before/after) for changed screens
4. Verify ART_STYLE.md is updated with any new visual elements
5. Clean up `tests/screenshots/art-review/` temporary files

## Principles

- **ART_STYLE.md is the source of truth** — All visual decisions defer to this document
- **Rectangles only** — The single most important rule; no exceptions
- **Minimal palette** — 4-5 colors per element maximum
- **Procedural everything** — No external image files, all textures generated in code
- **Pixel-perfect** — Crisp edges, no blur, no anti-aliasing
- **Accessibility matters** — Visual clarity is part of art direction, not separate from it
- **Don't over-polish** — The retro aesthetic is intentional; imperfection within the rules is fine
