# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Active Work

(No active work items)

## Next Up

- [ ] Advanced tiller mechanics — Tiller raise/lower for harder levels
- ✅ ~~Reload keyboard bindings on resume~~ — Both scenes now remove+re-add Phaser Key objects on resume so keyboard rebinds in Settings take effect immediately

## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- ✅ **Contextual win screen graphics** — Level-specific victory props next to character on win screen. Groomer: chalet (L1), snow rock (L2), kicker ramp (L3), slope warning sign (L4), winch anchor with cable (L5), halfpipe walls (L6), moon and stars (L7), avalanche debris (L8), gold trophy (L10). Ski/snowboard: slalom gates (L4/L5/L10), kicker (L3), halfpipe (L6). Rectangle-only pixel art.
- ✅ **Wildlife cliff awareness** — Ground animals (rabbits, marmots, foxes) no longer spawn on cliff tiles; spawn retries up to 8 times for valid terrain
- ✅ Sound effects polish — Character voice differentiation (pitch gap, vowel formant), melody phrasing rests, piano legato sustain, bass rebalancing
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Publish as standalone game package
- [ ] Ski/snowboard reward run (v2) — Freestyle elements on park levels, per-level modifications, best time tracking
- ✅ ~~Ski mode: remember grooming state~~ — Persists groomed tiles to localStorage on level win; ski mode from level select loads the last successful grooming instead of a synthetic pattern
- ✅ ~~Ski mode touch controls — Jump/brake buttons should match the same layout as groom/winch buttons in grooming mode~~ — Diagonal layout matching grooming mode, pixel art chevron icon for JMP button.
- [ ] Make level select look like a ski resort trail map

## Recently Completed

- ✅ **Ski run trick scoring** — Tricks award points by type (kicker 100, rail 150, halfpipe 200) with speed and variety multipliers. Consecutive unique tricks build a combo; repeating the same trick resets it. Total score, trick count, and best combo shown on the level complete screen for park levels.

- ✅ **Tuck mechanic & smooth steering** — Down key/D-pad/touch enters tuck position: +20% speed, 40% steering, minimal carve drag. Crouched sprites for skier and snowboarder. Keyboard/D-pad steering ramps over ~0.2s so quick taps feel like gentle corrections; gamepad analog bypasses the ramp.

- ✅ **Halfpipe physics & gamepad fixes** — Wall rebound, no air control, no airborne tracks in halfpipe. Gamepad Start button now pauses ski mode (with debounce). Both scenes reload gamepad/keyboard bindings from storage on resume so rebinds in Settings take effect immediately.

- ✅ **Y-depth sorting & collision refinement** — Groomer, obstacles, and all pole types use `yDepth()` for per-frame depth sorting. Tree trunk hitboxes shrunk (canopy passes behind). Groomer physics body rotates with movement direction. Cliff fall-detection zone aligned to visual cliff rocks via shared `getBounds()` with per-row variation. Steep zone detection uses per-row piste-aware bounds with 2-tile inward margin. Cliff danger poles extracted from baked texture into separate y-sorted objects. Removed unused `dangerZones` from GameScene (only SkiRunScene uses them). Debug overlay setting added (Settings → Accessibility) showing all collision zones, hitboxes, and depth markers in both game modes.

- ✅ **Piste contrast & readability** — Darkened off-piste tile textures, lightened service road tiles, and raised minimum tile size to 14px for better piste visibility on all levels (especially night). Texture-level approach: no runtime overlays needed.

- ✅ **Dialogue content review & locale fixes** — Rewrote 5 level intros (L1/L2/L6/L7/L8) across 14 locales for voice consistency (Jean-Pierre/Émilie/Thierry). Added `steepWarningNoWinch` for non-winch levels (L4 fix). Localized `showFps`. Fixed JA/KO untranslated food terms, DE Glühwein→vin chaud, IT "Riscia!"→"Ancora sci!", EN "Cat tracks"→"Access paths". Dead key cleanup: removed `uiScale`, commented 20 unused keys. Dev-mode `t()` throws on missing locale keys; `{ probe: true }` for existence checks.

- ✅ **Playtesting dialogue fixes** — Removed Émilie re-intro in L3 (already introduced L2). Fixed Thierry speaking in 3rd person on L5. Swapped L5 Glacier steep zones so gentler slope (30°) is encountered first from bottom. Replaced opaque PIDA acronym with plain language in L8. Persisted steep warning via localStorage (no repeats). Added Marie's self-introduction on first restaurant visit. Localized keybinding manager status messages (5 hardcoded English strings → `t()`).

- ✅ **Resize + touch controls regression fixes** — Camera static→follow transition when touch controls reduce effective viewport height on portrait devices (L7). Groomer stays above controls after resize. Dialogue repositions above controls (tween race fix). 9 regression tests in `test_resize_touch.py`. Smart test selection expanded to all 78 source files with three validation layers (unknown tests, unmapped sources, scene drift detection).

- ✅ **Night overlay & culling resize fix** — Fixed night overlay not covering full viewport after resize/orientation change, and terrain DynamicTextures disappearing due to center-point culling. Night fix: extracted `prepareNightFrame()` for zoom-aware coordinate mapping; `handleNightResize()` called after `setZoom()`. Culling fix: bounds-based visibility checks in `cullOffscreen()`. Simplified `run-tests.sh` to use `./dev.sh`.

- ✅ **Crisp pixel art scaling** — Per-texture nearest-neighbor scaling for all sprites and DynamicTextures. Ski run HUD zoom-independent rendering. Firefox workaround: `pixelArt:true` causes black screen, so NEAREST set per-texture instead.

- ✅ **Canvas performance optimization** — Systematic profiling and optimization of Canvas renderer performance. L9 storm Firefox: 24 FPS → 68 FPS. Key techniques: DynamicTexture consolidation (trees, rocks, snow tiles, backgrounds, night overlay), Graphics→texture baking (trees, rocks, cliffs, animal tracks), camera culling. Final profile: 69% native pixel copy (irreducible), 0.2% JavaScript, 10% vsync idle. See ARCHITECTURE.md "Performance Considerations" for full analysis and profiling guide.

- ✅ **Engine volume control** — Separate volume slider for continuous motor sounds (engine idle, snow crunch, grooming blade). New `engine` audio channel in AudioSystem. Default 50%. Winch and one-shot SFX remain on the SFX channel.

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

### Visual Issues

- ✅ ~~**La Verticale (L8) night piste visibility**~~ — Darkened off-piste tile textures for contrast on all levels (accessibility). Raised minimum tile size from 12→14px (`BALANCE.MIN_TILE_SIZE`). Lightened service road tiles to sit between piste and off-piste brightness.

### Input Issues

- ✅ ~~**Handheld touch: winch + groom unreachable**~~ — Auto-groom while winching on touch controls. Keyboard/gamepad retain independent groom/winch control.

### Patterns to Watch

1. **Closure array references** - When creating closures that reference arrays which are reused/cleared, always deep copy first (see cliff system bug in ARCHITECTURE.md)

2. **Firefox compatibility** - Avoid complex Phaser scale/render options, Graphics.fillTriangle()

3. **Scene transitions** - Use `resetGameScenes()` from `sceneTransitions.ts` for all game scene transitions. Registered scenes are the single source of truth (see `main.ts`). Always pass explicit data to `scene.start()` — omitting data reuses previous init data (see ARCHITECTURE.md "Stale Scene Data")

4. **SceneManager vs ScenePlugin** - `game.scene` (SceneManager) has `start`/`run` but NOT `launch`. Use `game.scene.start()` after stopping self. See ARCHITECTURE.md

5. **Gamepad menu navigation** - Use `createGamepadMenuNav()` from `gamepadMenu.ts` for all menu scenes. Handles debounce, cooldown, and phantom-press prevention. Override behavior via `isBlocked` callback

6. **Gamepad button reads** - Use `isGamepadButtonPressed()` from `gamepad.ts` instead of `pad.buttons[i]?.pressed`. Firefox reports Xbox LT/RT as axes, not buttons. Use `captureGamepadButtons()` at scene init for phantom-press prevention in gameplay scenes

### Test Coverage Gaps

- Nintendo B-button back navigation flaky under parallel test execution
- Y-depth sorting and collision hitbox changes lack dedicated E2E regression tests

### Deferred Refactors

- ~~Halfpipe should not have lateral boundary walls — players need to enter/exit from the sides~~ ✅ Fixed
- GameScene further decomposition: GroomingSystem, InputManager candidates. LevelGeometry, PisteRenderer, WinchSystem, ObstacleBuilder done. Remaining methods (movement, resources, game flow, camera) are tightly coupled to GameScene state — further extraction would increase complexity.
- Wildlife behavior duplication between MenuScene and WildlifeSystem (bird soaring ~7 lines, track aging ~10 lines, same-species repulsion ~9 lines). Both files use the same patterns but different coordinate systems (side-view vs top-down), making extraction non-trivial.
- MenuScene (1134 lines): terrain renderer, overlay manager, wildlife controller extracted; dead code removed, device detection deduplicated. Remaining UI layout/buttons/footer is inherently scene-specific.
- SettingsScene (1263 lines): focus navigator, keybinding manager extracted; scroll panel setup consolidated, magic numbers extracted, binding row methods merged. Remaining UI factories are tightly coupled to scene state — extraction deferred as net-negative.
- ✅ ~~HazardSystem callback coupling: GameScene passes 6 closures to `createAvalancheZones()`.~~ Replaced with `GAME_EVENTS.SHOW_DIALOGUE` and `GAME_EVENTS.HAZARD_GAME_OVER` events + query callback properties (`isGameOver`, `isGrooming`).
- ✅ ~~Timing magic numbers: various hardcoded delays in DialogueScene, HazardSystem.~~ Centralized into `BALANCE` constants (DIALOGUE_SLIDE_DURATION, TYPEWRITER_CHAR_DELAY, TYPEWRITER_SAFETY_BUFFER, AVALANCHE_WIPEOUT_DELAY).
- ✅ ~~Color magic numbers: inline `0x...` colors in ObstacleBuilder, WinchSystem, WeatherSystem, HazardSystem.~~ Centralized into `THEME.colors` world-element palette.
- ✅ ~~Silent storage errors: `storage.ts` catch blocks have no user notification.~~ Added `console.warn` logging to all write/remove failures for debugging.
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests. E2E-only coverage. Add geometry query and collision logic tests.
- ✅ ~~Bonus evaluation duplication: HUDScene and LevelCompleteScene both evaluate bonus types with similar switch logic.~~ Extracted shared `getBonusLabel()`, `evaluateBonusObjective()`, `evaluateAllBonusObjectives()` to `src/utils/bonusObjectives.ts`.
- Static Graphics to textures: Trees/rocks/cliffs/animal tracks baked. Night overlay light cone commands reduced 71%. Remaining: ~26 pole/marker Graphics (11-20 commands each, diminishing returns).
