# Copilot Instructions - Les Aiguilles Blanches

## Project Overview
Snow groomer simulation game set in a fictional Savoie ski resort. Phaser 3 browser game with SkiFree-style retro aesthetics.

## Documentation
- `docs/ARCHITECTURE.md` - Technical patterns, critical implementation details
- `docs/GAMEPLAY.md` - Game mechanics, controls, level guide
- `docs/GAME_DESIGN.md` - Design pillars, proposed features, difficulty curve, food economy
- `docs/TESTING.md` - Test helpers, debugging, visual issue reproduction
- `docs/ROADMAP.md` - Work queue, bugs, future features (**source of truth**)
- `docs/ART_STYLE.md` - Visual style guide, color palettes, texture patterns

## Quick Commands
```bash
npm run dev                       # Dev server
./run-tests.sh --browser chromium # Fast test run
./run-tests.sh -k "test_name"     # Specific test
./run-tests.sh --smart            # Only tests affected by uncommitted changes
```

## Pre-Commit Checklist

Before every commit, verify:

1. **Code review** - Run the `code-health` skill (`.github/skills/code-health/SKILL.md`) on all changed files. Fix any HIGH/MEDIUM findings before committing.
2. **Art review** - If any visual files changed (scenes, sprites, theme, weather), run the `art-review` skill (`.github/skills/art-review/SKILL.md`). Fix any HIGH/MEDIUM findings before committing.
3. **Audio review** - If any audio files changed (audio system, SFX triggers, volume settings), run the `audio-review` skill (`.github/skills/audio-review/SKILL.md`). Fix any HIGH/MEDIUM findings before committing.
4. **Content review** - If any changelog or localization strings changed, run the `content-review` skill (`.github/skills/content-review/SKILL.md`). Changelog entries must follow the crisp style (3–5 items, no enumerations, no parenthetical details).
5. **Tests** - Regression test exists and passes
6. **Docs sync** - Run the `docs-update` skill (`.github/skills/docs-update/SKILL.md`) to verify all documentation is current with the changes.
7. **Commit message** - Summarizes functional change, lists all updates

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
- `content-review` — Expert content writer review of in-game text: dialogue, localization, lore, tone, and translation quality across all 14 languages
- `game-design` — Experienced game designer review of narrative arc, difficulty curve, character development, mechanics coherence, and pacing across all levels
- `art-review` — Art director review of visual code and rendered output against `docs/ART_STYLE.md`. Checks color palettes, shape compliance (rectangles only), dimensions, depth layering, and accessibility
- `audio-review` — Audio director / sound designer review of game audio code. Checks sound palette coherence, Chopin nocturne-style music, Celeste-style voice gibberish, mixing balance, Web Audio API usage, and accessibility

## Critical Patterns

### localStorage Keys
All keys are centralized in `src/config/storageKeys.ts`. Always use `STORAGE_KEYS.*` constants — never hardcode key strings. Use `getJSON`/`setJSON`/`getString`/`setString` from `src/utils/storage.ts` — never call `localStorage` directly.

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

### Music Persistence
MusicSystem is a singleton that persists across scene transitions. Use `MusicSystem.getInstance().start(mood)` — it crossfades on mood change and no-ops on same mood. Never call `stop()` on scene shutdown.

## Key Files
- `src/scenes/GameScene.ts` - Main gameplay, physics, cliff system
- `src/scenes/LevelSelectScene.ts` - Level select / replay with star ratings
- `src/scenes/SkiRunScene.ts` - Post-grooming ski/snowboard descent (reward run)
- `src/config/gameConfig.ts` - Game constants, BALANCE tuning values
- `src/config/levels.ts` - Level definitions
- `src/config/localization.ts` - Localization hub, imports from locales/
- `src/config/locales/*.ts` - Per-language translation files (14 languages)
- `src/utils/animalSprites.ts` - Procedural pixel art for alpine wildlife (6 species + bird variants)
- `src/utils/skiSprites.ts` - Procedural pixel art for skier & snowboarder sprites
- `src/utils/foxBehavior.ts` - Shared fox hunting/lunge constants and decision logic
- `src/utils/animalTracks.ts` - Shared track/footprint drawing
- `src/utils/characterPortraits.ts` - Procedural pixel art generation
- `src/systems/WeatherSystem.ts` - Night overlay, headlights, weather
- `src/systems/HazardSystem.ts` - Avalanche zones, risk tracking
- `src/systems/WildlifeSystem.ts` - Animal spawning, flee AI, building/cliff collision, track system
- `src/systems/LevelGeometry.ts` - Piste path, cliff, access path geometry (pure data, no Phaser)
- `src/systems/ObstacleBuilder.ts` - Obstacle placement, buildings, chalets, building footprints
- `src/systems/ParkFeatureSystem.ts` - Terrain park: kickers, rails, halfpipe walls, zone scoring
- `src/systems/PisteRenderer.ts` - Boundary colliders, cliff visuals, markers, trees, access paths
- `src/systems/WinchSystem.ts` - Winch anchors, cable rendering, attach/detach state
- `src/systems/AudioSystem.ts` - Web Audio API singleton, volume channels, gain chain, compressor limiter
- `src/systems/MusicSystem.ts` - Chopin nocturne procedural piano music (singleton, 5 moods, crossfade)
- `src/types/GameSceneInterface.ts` - Cross-scene event types
- `tests/e2e/conftest.py` - Test helpers

## Domain
- **Piste markers**: Green ●, Blue ■, Red ◆, Black ◆◆
- **Service roads**: Orange/black striped poles
- **Winch anchors**: Numbered posts with yellow plates
