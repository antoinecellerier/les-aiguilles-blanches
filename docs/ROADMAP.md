# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Active Work

- [ ] Advanced tiller mechanics — Tiller raise/lower for harder levels (grooming quality now implemented via steering stability + fall-line alignment)

## Next Up: Canvas Performance Deep Analysis

Profile and fix the root cause of FPS drops on heavy levels (L9 storm: 24 FPS / 40% sim speed in Firefox). Prior TileSprite optimization reduced objects from 10,668→3,369 but ~1,461 Graphics objects with 64,005 draw commands still consume ~35% CPU.

- [x] Deep profiling session — Playwright probe on L0 and L9: L9 had 3,943 objects (1,588 Graphics, 2,251 Images). Detailed breakdown: 1,472 Graphics with 21-50 commands (trees/rocks), 30 with 51+ (cliffs), 26 with 11-20 (poles)
- [x] Bake tree/rock Graphics to textures — Pre-generate tree textures (4 sizes × normal/storm) and rock textures (3 sizes) in BootScene. PisteRenderer uses Images instead of Graphics. Result: L9 Graphics 1,588→97 (-94%), L0 Graphics 307→39 (-87%)
- [x] Bake cliff Graphics to textures — Two-pass approach: compute bounding box, draw at origin offset, `generateTexture()` per segment. Stale textures cleaned on level switch. L7 FPS +63%, L8 FPS +95%
- [x] Bake animal track Graphics to textures — Pre-generate track textures per species (bunny, chamois, bouquetin, marmot, fox) in BootScene. WildlifeSystem uses Images instead of Graphics. L1 Graphics −72%, L7 Graphics −58%
- [x] Reduce night overlay light cone commands — Reduced headlight step grid (6×8×12→4×5×8), compensated with larger circles (sizeFactor 0.25→0.4). Result: 12,524→3,632 commands per frame (−71%)
- [ ] Camera culling for off-screen objects — Set `visible=false` on Graphics/sprites outside camera viewport. Reduces display list iteration

**Key constraint:** `Game.step()` override freezes Firefox entirely — any frame-rate management must use Phaser's built-in config, not monkey-patching.

## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- [ ] Contextual win screen graphics — Level-specific victory scenes (e.g. night stars for L7, storm clearing for L9, avalanche debris for L8, park features for L3/L6)
- [ ] Wildlife cliff awareness — Prevent ground animals (rabbits, marmots) from spawning on cliff tiles; restrict to safe terrain
- ✅ Sound effects polish — Character voice differentiation (pitch gap, vowel formant), melody phrasing rests, piano legato sustain, bass rebalancing
- [ ] Pause menu mute toggle
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Publish as standalone game package
- [ ] Ski/snowboard reward run (v2) — Freestyle elements on park levels, per-level modifications, best time tracking
- [ ] Make level select look like a ski resort trail map

## Recently Completed

- ✅ **Ski jumps** — Groom key triggers speed-dependent jump during ski runs. Cliff jumps clear danger zones at 30+ km/h. Airborne skiers skip all ground-level collisions. Touch JMP button for mobile. Win screen shows celebrating skier/snowboarder. Park features render below player. 3 E2E tests.

- ✅ **Slalom gates** — Red/blue pole pairs on L4 (8 wide), L5 (10 medium), L10 (12 tight). Pass/miss detection with ✓/✗ feedback, HUD gate counter, results on level complete. Audio chime on pass, buzz on miss. 3 E2E tests.

- ✅ **FPS counter & simulation monitor** — In-game FPS display in visor bottom-right with simulation speed percentage (actualFps/targetFps). Passive FPS monitoring via Phaser `poststep` event with rolling 30-frame average and hysteresis-based throttle detection. Togglable in Settings → Accessibility → Show FPS. Green monospace font, 500ms update interval. Localized in 14 languages. Investigated Phaser `fps.limit` config — `stepLimitFPS()` couples update+render so can't decouple physics from rendering.

- ✅ **Ski run realism pass** — Off-piste skiing with deep powder drag and packed-snow shoulder. Ski/snowboard tracks on ungroomed and off-piste snow (parallel lines for skis, single wide track for snowboard). Smooth carving physics via lerped lateral velocity. Fatal crashes above 40 km/h. Avalanche risk on hazardous levels (5× faster trigger). Y-depth sorted obstacles. Default grooming when starting from level select. Ski crash fail screens with yard sale and avalanche burial pixel art.

- ✅ **Settings layout polish** — Adaptive inline/stacked layout for multi-select button groups (colorblind, ski mode, keyboard layout): measures whether label + buttons fit on one line, stacks if not. Touch sub-section in Controls showing detection status. Scene auto-restarts on first touch event to resize targets. Language flag buttons scale with touch target size. Updated `inputTouchOff` across 14 locales.

- ✅ **Level select UX** — Scroll hints (▲/▼), gold ▶ selection arrow for keyboard/gamepad navigation, scroll-into-view on navigation, dark difficulty marker visibility fix (white stroke). Consistent scroll direction across scenes.

- ✅ **Ski headlamp** — Night ski runs use a narrow forward headlamp instead of wide groomer work lights. Single cone beam, head-mounted origin with forward projection. Shared `drawLightCone()` helper for both light types.

- ✅ **Frost vignette cold exposure** — Icy overlay creeps from screen edges on late-game levels. Night 25%/min, storm 35%/min, light snow 15%/min. Speed -10% at 50% frost, -20% at 75%. Warmth buff pauses accumulation; Chez Marie resets to 0%. HUD ❄️ indicator with blue→orange→red color progression. L7 exempt (already teaches night+cliffs). Difficulty curve: L8 introduces gently, L9/L10 ramp up. Overlay pre-rendered to static texture (zero per-frame cost on Canvas). Pure `getFrostRate()`/`getFrostSpeedMultiplier()` with 15 unit tests.

- ✅ **Canvas rendering optimization** — Profiling via Playwright revealed 10,668 game objects on L9 (7,300 background `snow_offpiste` tiles from PisteRenderer). Replaced extended background and in-world off-piste tiles with TileSprite (2 objects). Added camera-based tile culling for piste tiles. Result: 10,668→3,369 objects, 26→54 FPS (Chromium headless).

- ✅ **Food buff auto-selection** — Chez Marie now reads the player's situation and serves the best dish automatically. Vin Chaud (warmth, 25s) on night/storm levels halves stamina drain. Croziflette (speed, 20s) when time < 40% gives +30% speed at +40% fuel cost. Génépi (precision, 15s) when coverage > 70% adds +1 grooming radius. Fondue (staminaRegen, 30s) as default fallback. Short burst durations create a pit-stop rhythm. One buff at a time; HUD shows active buff icon + countdown. Pure `selectFoodBuff()` function with 10 unit tests.

- ✅ **Ski run realism pass** — Off-piste skiing with deep powder drag and packed-snow shoulder. Ski/snowboard tracks on ungroomed and off-piste snow. Smooth carving physics via lerped lateral velocity. Fatal crashes above 40 km/h. Avalanche risk on hazardous levels (5× faster trigger). Y-depth sorted obstacles. Default grooming when starting from level select. Ski crash fail screens with yard sale and avalanche burial pixel art.

- ✅ **Favicon** — Pixel-art SVG favicon with red groomer, snow-capped mountain, and groomed snow.

- ✅ **Food buff auto-selection** — Chez Marie reads player situation and serves best dish automatically. Short burst durations create a pit-stop rhythm. One buff at a time; HUD shows active buff icon + countdown.

- ✅ **Gamepad diagnostic in settings** — Live controller test panel showing all 16 buttons, dual analog sticks, and trigger values. Auto-detects controller type. Localized in 14 languages.

- ✅ **Ski/Snowboard Reward Run (v1)** — Optional post-grooming descent with slope-aware physics, brake control, obstacle crashes, cliff wipeouts. Procedural sprites, visor HUD, trick system (kickers, rails, halfpipe), audio (wind, carving, powder), random mode (50/50 ski/snowboard). Replayable runs from level select.

<details>
<summary>Older completed items</summary>

- ✅ Background update check with cache-busting version.json
- ✅ Ski run audio & pause menu with Skip Run option
- ✅ Random ski/snowboard mode (50/50 per run)
- ✅ Gameplay QoL (spawn exclusion, obstacle spacing, progressive turning)
- ✅ Menu scroll & layout for phone landscape
- ✅ Level select & replay (LevelSelectScene with stars, per-level stats)
- ✅ Park zone system (kickers, rails, halfpipe walls)
- ✅ Ski run trick system (air tricks, rail grinds, pipe tricks)
- ✅ Grooming quality system (steering stability + fall-line alignment)
- ✅ Steep zone visual tinting (pre-generated texture variants for Canvas)
- ✅ Settings menu visual polish (alpine backdrop, wildlife, responsive layout)
- ✅ Localization expansion to 14 languages
- ✅ Controller tooltips with combined input method status
- ✅ Volume/mute indicator on menu screen
- ✅ Nocturne music system (5 moods, grand piano synthesis)
- ✅ Win/fail screen visual redesign with weather effects
- ✅ Depth layering fix (Y-based sorting)
- ✅ Tutorial dialogue polish
- ✅ Menu weather from level progress
- ✅ Resize & zoom fixes (diagonal-ratio scaling, orientation handling)
- ✅ Gamepad level loop fix
- ✅ HUD visor horizontal redesign
- ✅ Settings keyboard & gamepad navigation
- ✅ Level progression redesign (11 levels)
- ✅ Alpine wildlife (6 species with flee AI)
- ✅ GameScene extraction (-56%)
- ✅ MenuScene & SettingsScene extraction
- ✅ Smart test runner, gamepad fixes, mobile art review
- ✅ Code health audits v1-v4
- ✅ Scene navigation, form factor, auto-paginate dialogues
- ✅ HUD & dialogue retro overhaul
- ✅ Menu restyle, changelog, localization (5→14 languages)
- ✅ Cliff system, night rendering, winch mechanics, gamepad/touch support
- ✅ Cross-cutting: ResizeManager, storage.ts, storageKeys.ts, sceneTransitions.ts
- ✅ Winch cable max extension with snap + stun penalty
- ✅ Tutorial skip on replay
- ✅ Level durations auto-calculated from difficulty and area
- ✅ Avalanche/cliff overlap fix
- ✅ Dialogue UI capped width for large screens

</details>

---

## Technical Debt / Known Issues

### Patterns to Watch

1. **Closure array references** - When creating closures that reference arrays which are reused/cleared, always deep copy first (see cliff system bug in ARCHITECTURE.md)

2. **Firefox compatibility** - Avoid complex Phaser scale/render options, Graphics.fillTriangle()

3. **Scene transitions** - Use `resetGameScenes()` from `sceneTransitions.ts` for all game scene transitions. Registered scenes are the single source of truth (see `main.ts`). Always pass explicit data to `scene.start()` — omitting data reuses previous init data (see ARCHITECTURE.md "Stale Scene Data")

4. **SceneManager vs ScenePlugin** - `game.scene` (SceneManager) has `start`/`run` but NOT `launch`. Use `game.scene.start()` after stopping self. See ARCHITECTURE.md

5. **Gamepad menu navigation** - Use `createGamepadMenuNav()` from `gamepadMenu.ts` for all menu scenes. Handles debounce, cooldown, and phantom-press prevention. Override behavior via `isBlocked` callback

6. **Gamepad button reads** - Use `isGamepadButtonPressed()` from `gamepad.ts` instead of `pad.buttons[i]?.pressed`. Firefox reports Xbox LT/RT as axes, not buttons. Use `captureGamepadButtons()` at scene init for phantom-press prevention in gameplay scenes

### Test Coverage Gaps

- Nintendo B-button back navigation flaky under parallel test execution

### Deferred Refactors

- GameScene further decomposition: GroomingSystem, InputManager candidates. LevelGeometry, PisteRenderer, WinchSystem, ObstacleBuilder done. Remaining methods (movement, resources, game flow, camera) are tightly coupled to GameScene state — further extraction would increase complexity.
- Wildlife behavior duplication between MenuScene and WildlifeSystem (bird soaring ~7 lines, track aging ~10 lines, same-species repulsion ~9 lines). Both files use the same patterns but different coordinate systems (side-view vs top-down), making extraction non-trivial.
- MenuScene (1134 lines): terrain renderer, overlay manager, wildlife controller extracted; dead code removed, device detection deduplicated. Remaining UI layout/buttons/footer is inherently scene-specific.
- SettingsScene (1263 lines): focus navigator, keybinding manager extracted; scroll panel setup consolidated, magic numbers extracted, binding row methods merged. Remaining UI factories are tightly coupled to scene state — extraction deferred as net-negative.
- HazardSystem callback coupling: GameScene passes 6 closures to `createAvalancheZones()`. Replace with event emitter pattern via `game.events`.
- Timing magic numbers: various hardcoded delays (300/500/800/2000ms) in DialogueScene, SettingsScene, HazardSystem. Centralize incrementally into BALANCE.
- Color magic numbers: inline `0x...` colors in ObstacleBuilder, WinchSystem, WeatherSystem, HazardSystem. Centralize into THEME incrementally.
- Silent storage errors: `storage.ts` catch blocks have no user notification. Consider toast/banner for critical save failures (progress, bindings).
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests. E2E-only coverage. Add geometry query and collision logic tests.
- Bonus evaluation duplication: HUDScene.updateBonusObjectives() and LevelCompleteScene.evaluateBonusObjectives() both evaluate 5 bonus types with similar switch logic. Extract shared `evaluateBonusObjective()` and `getBonusLabel()` to `src/utils/bonusObjectives.ts`.
- Static Graphics to textures: Trees/rocks/cliffs/animal tracks baked. Night overlay light cone commands reduced 71%. Remaining: ~26 pole/marker Graphics (11-20 commands each, diminishing returns).
