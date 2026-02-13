# Copilot Instructions - Les Aiguilles Blanches

Snow groomer simulation · Phaser 3 · Canvas renderer · SkiFree retro aesthetics.

## Docs (read before working)

| Doc | Covers |
|-----|--------|
| `docs/ARCHITECTURE.md` | Project structure, key files, all technical patterns, system APIs |
| `docs/GAMEPLAY.md` | Controls, level guide, domain terms |
| `docs/GAME_DESIGN.md` | Design pillars, difficulty curve, food economy |
| `docs/ART_STYLE.md` | Visual style, color palettes, depth layers |
| `docs/TESTING.md` | Test helpers, debugging, smart test selection |
| `docs/ROADMAP.md` | **Source of truth** for work queue, bugs, future features |

## Quick Commands

```bash
./dev.sh                          # Start dev server (reads PORT from .env.local, default 3000)
./run-tests.sh --browser chromium # Fast test run
./run-tests.sh -k "test_name"     # Specific test
./run-tests.sh --smart            # Only tests affected by uncommitted changes
```

> **Always use `./dev.sh`** to start the dev server — never `npm run dev` with a hardcoded port. It loads `.env.local`, reuses running servers, and cleans up stale processes. Use the same PORT for any manual browser testing.

## Rules (never break these)

- **`STORAGE_KEYS.*`** for all localStorage keys (`src/config/storageKeys.ts`). Access via `getJSON`/`setJSON`/`getString`/`setString` (`src/utils/storage.ts`) — never call `localStorage` directly.
- **`BALANCE.*`** for all gameplay tuning (`src/config/gameConfig.ts`) — no magic numbers in scenes.
- **`DEPTHS.*`** for all Phaser depth values — no magic depth numbers.
- **`GAME_EVENTS`** for cross-scene communication (`src/types/GameSceneInterface.ts`) — no direct scene references.
- **`worldToOverlay()` / `overlayFullScreen()`** for `scrollFactor(0)` drawing (`src/utils/cameraCoords.ts`) — `setScrollFactor(0)` doesn't prevent zoom.
- **`MusicSystem.getInstance().start(mood)`** — singleton persists across scenes; never call `stop()` on shutdown.
- **Deep copy arrays** before capturing in closures if reused/cleared (see cliff system in ARCHITECTURE.md).
- **Use `gpt-5.2` for melody composition** — when composing or rewriting MusicSystem melody/bass arrays, always delegate to `gpt-5.2` model for best nocturne-style results.

## Skill Triggers

### Pre-commit (always)
1. **`code-health`** — on all changed files. Fix HIGH/MEDIUM before committing.
2. **`docs-update`** — verify documentation is current with changes.

### Pre-commit (conditional)
3. **`art-review`** — if visual files changed (scenes, sprites, theme, weather).
4. **`audio-review`** — if audio files changed (audio system, SFX, volume).
5. **`content-review`** — if changelog or localization strings changed. Changelog: 3–5 items, no enumerations, no parenthetical details.
6. **`documentation-screenshots`** — if visual changes may require updated screenshots.

### During feature design
7. **`game-design`** — invoke when designing or significantly changing: new levels, difficulty/balance tuning, new mechanics, progression changes, narrative/dialogue, food/economy systems, bonus objectives, or any feature that affects the player experience arc. This is advisory — it reviews then asks before changing.
8. **`art-review`** — invoke when designing new visual elements (sprites, textures, UI components) to validate style compliance early, before implementation.
9. **`audio-review`** — invoke when designing new sound effects, music moods, or voice profiles to validate audio direction early.

### Tests
10. Regression test exists and passes.

## Commit Message Format

```
<Functional change summary>

<Root cause for bugs / why needed>

- Tests: what was added
- Docs: what was updated

Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>
```
