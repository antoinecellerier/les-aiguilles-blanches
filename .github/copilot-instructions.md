# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Documentation
- `docs/ARCHITECTURE.md` - Technical patterns, critical implementation details
- `docs/GAMEPLAY.md` - Game mechanics, controls, level guide
- `docs/TESTING.md` - Test helpers, debugging, visual issue reproduction
- `docs/ROADMAP.md` - Work queue, bugs, future features (**source of truth**)
- `docs/ART_STYLE.md` - Visual style guide, color palettes, texture patterns

## Quick Commands
```bash
npm run dev                       # Dev server
./run-tests.sh --browser chromium # Fast test run
./run-tests.sh -k "test_name"     # Specific test
```

## Pre-Commit Checklist

Before every commit, verify:

1. **Code review** - Run the `code-health` skill (`.github/skills/code-health/SKILL.md`) on all changed files. Fix any HIGH/MEDIUM findings before committing.
2. **Art review** - If any visual files changed (scenes, sprites, theme, weather), run the `art-review` skill (`.github/skills/art-review/SKILL.md`). Fix any HIGH/MEDIUM findings before committing.
3. **Tests** - Regression test exists and passes
4. **Docs sync** - Run the `docs-update` skill (`.github/skills/docs-update/SKILL.md`) to verify all documentation is current with the changes.
5. **Commit message** - Summarizes functional change, lists all updates

Commit message structure:
```
<Functional change summary>

<Root cause for bugs / why needed>

- Tests: what was added
- Docs: what was updated

Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>
```

## Custom Agents
- `code-health` — Thorough code audit against engineering best practices. Auto-activates as a skill when you ask about code quality, duplication, or tech debt. Also available explicitly via `/agent` → `code-health`
- `content-review` — Expert content writer review of in-game text: dialogue, localization, lore, tone, and translation quality across all 5 languages
- `game-design` — Experienced game designer review of narrative arc, difficulty curve, character development, mechanics coherence, and pacing across all levels
- `art-review` — Art director review of visual code and rendered output against `docs/ART_STYLE.md`. Checks color palettes, shape compliance (rectangles only), dimensions, depth layering, and accessibility

## Critical Patterns

### localStorage Keys
All keys are centralized in `src/config/storageKeys.ts`. Always use `STORAGE_KEYS.*` constants — never hardcode key strings.

### Dynamic Placeholders
`{keys}`, `{groomKey}`, `{winchKey}` in localized strings - see `keyboardLayout.ts`

### Closure Array References
Deep copy arrays before creating closures if the array is reused/cleared (see cliff system in ARCHITECTURE.md)

### Balance Constants
All gameplay tuning values are in `BALANCE` (from `src/config/gameConfig.ts`). Never hardcode magic numbers in GameScene.

### Cross-Scene Communication
GameScene↔HUDScene use event-based communication via `GAME_EVENTS` (from `src/types/GameSceneInterface.ts`). No scene should hold a direct reference to another scene.

### ScrollFactor(0) Coordinates
`setScrollFactor(0)` disables scroll but NOT zoom. Use `worldToOverlay()` and `overlayFullScreen()` from `src/utils/cameraCoords.ts` for any drawing on scrollFactor(0) Graphics objects.

## Key Files
- `src/scenes/GameScene.ts` - Main gameplay, physics, cliff system
- `src/config/gameConfig.ts` - Game constants, BALANCE tuning values
- `src/config/levels.ts` - Level definitions
- `src/config/localization.ts` - All UI strings
- `src/utils/animalSprites.ts` - Procedural pixel art for alpine wildlife (6 species + bird variants)
- `src/utils/foxBehavior.ts` - Shared fox hunting/lunge constants and decision logic
- `src/utils/animalTracks.ts` - Shared track/footprint drawing
- `src/utils/characterPortraits.ts` - Procedural pixel art generation
- `src/systems/WeatherSystem.ts` - Night overlay, headlights, weather
- `src/systems/HazardSystem.ts` - Avalanche zones, risk tracking
- `src/systems/WildlifeSystem.ts` - Animal spawning, flee AI, building/cliff collision, track system
- `src/types/GameSceneInterface.ts` - Cross-scene event types
- `tests/e2e/conftest.py` - Test helpers

## Domain
- **Piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: Numbered posts with yellow plates
