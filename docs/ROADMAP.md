# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Active Work

- [x] **Daily Runs (procedural generation)** — Post-campaign mode unlocked after L10. ✅ Core implemented: seeded RNG run generation, Daily Shift (date-seeded), Random Run, four difficulty ranks (Green/Blue/Red/Black), DailyRunSession singleton, per-rank completion tracking, procedural level variety, procedural French piste names with rank-themed pools and grammar agreement, daily-run-aware pause menu (quit to Daily Runs, new run for Random Runs), seed code displayed in FPS HUD, ski mode on procedural levels (slalom + freestyle), responsive layout across form factors, ✅ shareable seed codes (share button with clipboard copy, URL with ?seed=CODE&rank=RANK, BootScene URL parsing, shared seed display on DailyRunsScene, share on daily run win screen), ✅ seeded RNG determinism (ObstacleBuilder and HazardSystem route through SeededRNG during daily/random runs for reproducible obstacle placement and avalanche zone generation; wildlife remains cosmetically random).
- [x] **Player retention** — Improve first-time player hook. ✅ Streamlined ski school (9→4 steps, 14s→1.8s dialogue delay). ✅ Ski run teaser (primary CTA after ski school). ✅ Cold-open prologue (12s night cinematic for first visit). ✅ Random menu weather (5 moods per visit, storm excluded for first-timers). ✅ L1 polish (shorter piste 60→50, mid-level JP dialogue at 40% coverage, dialogueTriggers system). ✅ Ski school target raised to 60%. ✅ Daily Runs glow only when unlocked.

## Next Up

- ~~Advanced tiller mechanics~~ — Scrapped: the groom button already acts as implicit tiller up/down. Snow depth + front blade explored but too complex for the game's retro scope.
- ✅ ~~Reload keyboard bindings on resume~~ — Both scenes now remove+re-add Phaser Key objects on resume so keyboard rebinds in Settings take effect immediately

## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- ✅ **Contextual win screen graphics** — Level-specific victory props next to character on win screen. Groomer: chalet (L1), snow rock (L2), kicker ramp (L3), slope warning sign (L4), winch anchor with cable (L5), halfpipe walls (L6), moon and stars (L7), avalanche debris (L8), wind sock (L9), gold trophy (L10). Ski/snowboard: slalom gates (L4/L5/L10), kicker (L3), halfpipe (L6). Rectangle-only pixel art.
- ✅ **Wildlife cliff awareness** — Ground animals (rabbits, marmots, foxes) no longer spawn on cliff tiles; spawn retries up to 8 times for valid terrain
- ✅ Sound effects polish — Character voice differentiation (pitch gap, vowel formant), melody phrasing rests, piano legato sustain, bass rebalancing
- [ ] More character dialogues per level
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Publish as standalone game package
- ✅ ~~Electron desktop wrapper~~ — Optional Electron packaging with frameless window, F11 fullscreen toggle, display mode settings (windowed/fullscreen/borderless), app icon, and Quit Game button. Separate `electron/` directory keeps Electron deps out of main project.
- [ ] Ski/snowboard reward run (v2) — Freestyle elements on park levels, per-level modifications, best time tracking
- ✅ ~~Ski mode: remember grooming state~~ — Persists groomed tiles to localStorage on level win; ski mode from trail map loads the last successful grooming instead of a synthetic pattern
- ✅ ~~Ski mode touch controls — Jump/brake buttons should match the same layout as groom/winch buttons in grooming mode~~ — Diagonal layout matching grooming mode, pixel art chevron icon for JMP button.
- ✅ ~~Make level select look like a ski resort trail map~~ — Trail map with three peaks, colored run paths, difficulty markers, chairlift, lodge, and shared MenuTerrainRenderer backdrop (sky, trees, wildlife, snow).

## Recently Completed

- ✅ **Documentation screenshots & OG image** — Automated Playwright capture script (`capture-screenshots.sh`) for 6 doc screenshots (menu, gameplay, trail map, daily runs, level complete, ski trick) + Open Graph image. README updated to 3×2 screenshot grid.

- ✅ **E2E runtime optimization defaults** — Added `--e2e-only` mode to `run-tests.sh`, added optional screenshot write flag (`--screenshots`), switched pytest parallel scheduling to `--dist=worksteal` with 7 workers by default, added duration-aware E2E ordering from persisted history (`.pytest-e2e-durations.json`), and reused module-scoped Playwright contexts in heavy suites (`resize_touch`, `accessibility_full`, `daily_runs`) while keeping per-test page/storage isolation.

- ✅ **Scene key constant migration** — Replaced hardcoded scene-name string literals across scene constructors, launches/stops, and transitions with `SCENE_KEYS` (Boot/Menu/Pause/Settings/Game/HUD/Dialogue/SkiRun/LevelComplete/LevelSelect/DailyRuns/Credits/Prologue). Reduces typo risk and centralizes routing keys.

- ✅ **Trail map level select polish** — Closed run interaction (click selects with gray ring + prerequisite info), gamepad button hints (Ⓐ Groom / Ⓨ Ski), shared `formatTime()` utility, Linux Xbox X/Y button label swap (`xpad` driver fix), `LaunchOrigin` singleton so quit returns to trail map when launched from there. `onSecondary` gamepad callback for Y/Triangle button. Visual fixes: lodge repositioned clear of run paths, bouquetins remapped to visible left shoulder, bird perch spots aligned deterministically with drawn landmarks (cross arm, pylon cross-arms, tree tops) via `landmarkPerches` array populated by draw methods. Menu-style stepped mountain rendering with depth layering. Responsive info panel: adaptive wide/narrow layout (buttons on name row when space allows, two-row layout on narrow screens), non-breaking spaces within stat items, dynamic word wrap constrained by button positions.

- ✅ **Seed sharing E2E tests** — 14 tests covering URL param parsing (?seed=&rank=), share button clipboard, closed/open shared seed display, seed determinism, rank defaults, and uppercase normalization. Smart test mapping added to `run-tests.sh`.

- ✅ **Cinematic credits scene** — Replaced bare starfield with night alpine terrain, groomer driving with headlights + corduroy trail, sleeping wildlife, light snow. Credits text geometry-masked to scroll zone. JP farewell bookends prologue opener. Localized headings (10 new keys × 14 languages). Dedication to real night-shift groomers.

- ✅ **Prologue wildlife** — Added `MenuWildlifeController` to PrologueScene — sleeping animals and nocturnal fox on the night slope.

- ✅ **CI stability fixes** — Fixed dialogue speaker test race condition (atomic clear+show). Hardened webkit E2E tests: gamepad stick navigation now verifies selectedIndex instead of timing-based pulses, volume slider/dialogue/ski-jump tests use `wait_for_function` polling instead of fixed timeouts. CI uses `-n 4` workers to match GitHub Actions 4-vCPU runner. Removed noisy `console.table(LEVELS)` logging.

- ✅ **Test review & hardening** — Full test review (E2E + unit) against 10 anti-patterns. Fixed 7 HIGH issues: missing assertions in accessibility tests, hardcoded button indices, tight timeouts, missing inputReady waits, flaky changelog test (scene.restart race). Added data keys to PauseScene, LevelCompleteScene, CreditsScene buttons. Generalized `find_menu_button_index` to work with any scene. Bumped tight 3s timeouts to 5s. 248/248 E2E + 205/205 unit stable.

- ✅ **Test-review skill** — New `.github/skills/test-review/SKILL.md` covering 10 E2E anti-patterns and 6 unit test anti-patterns, plus test design quality, maintainability, parallel safety, and coverage assessment phases.

- ✅ **Text truncation fix** — MenuScene title and CreditsScene subtitle truncated on mobile portrait (360px). Shrink-to-fit for title, wordWrap + headerScale for subtitle.

- ✅ **E2E test infrastructure overhaul** — Replaced all hardcoded menu button indices with key-based lookup (`click_menu_by_key`, `find_menu_button_index`). Replaced fixed timeouts with state polling (`wait_for_input_ready`). Added browser launch args for reduced CPU. Capped parallel workers at 6. Fixed 27 failures.

- ✅ **Procedural French piste names** — Combinatorial name generation from rank-themed pools (nouns, adjectives, genitives) with full French grammar agreement (gender, number, elision, preposed adjective forms). Names shown in DailyRunsScene briefing, HUD visor, LevelCompleteScene, SkiRunScene, and accessibility announcements. Redundancy filter prevents combos like "Le Glacier du Glacier".

- ✅ **Daily-run-aware pause menu** — Pause menu returns to DailyRunsScene (not main menu) during daily run sessions. Random Runs get a "New Run" button to generate a fresh seed at the same rank. Extracted `rankSeed()` and `RANKS` to LevelGenerator, `randomSeed()` to seededRNG.

- ✅ **Ski mode UX improvements** — Pause/fullscreen touch buttons added to ski mode HUD. Resume from menu restores ski mode when quit from ski run. Adaptive camera lerp in SkiRunScene. Image culling in SkiRunScene for performance.

- ✅ **Settings overlay depth fix** — SettingsScene overlay was covering UI after MENU_UI depth change in Daily Runs commit; removed explicit overlayDepth override.

- ✅ **Default engine volume reduced to 25%** — Lower default for continuous motor sounds to reduce fatigue.

- ✅ **Procedural level variety** — 7 piste shapes (straight, gentle_curve, winding, serpentine, dogleg, funnel, hourglass) with per-seed variation, randomized steep zones, service road bypasses for dangerous zones only, 5 park feature combos with procedural placement, expanded slalom gate coverage.

- ✅ **Daily run briefing dialogues** — `pickDailyRunBriefing()` selects speaker based on level characteristics (Thierry for hazards, Marie for night/cold, Émilie for easy runs, JP default). 4 locale keys × 14 languages. 10 unit tests + 4 E2E integration tests.

- ✅ **Daily Runs art style compliance** — Rank indicators now use NF S52-102 shapes (●■◆★), colors match ART_STYLE.md palette, separator uses fillRect, all text colors from THEME.

- ✅ **DailyRunsScene gamepad fix** — Gamepad d-pad/B button didn't work in Daily Runs screen because `gamepadNav.update(delta)` was missing from `update()`. All other scenes had it.

- ✅ **Daily Runs E2E tests** — 14 tests in `test_daily_runs.py` covering keyboard, gamepad, multi-viewport navigation, rank cycling, and cross-scene flows (session persistence, completion UI, session cleanup).

- ✅ **HUDScene event listener leak fix** — `game.events` listeners (`gameState`, `timerUpdate`, `accessibilityChanged`) leaked +3 per level transition because `events.once('shutdown', this.shutdown, this)` was only registered inside the `if (mode === 'ski')` branch. Moved registration before the branch so it runs for all modes.

- ✅ **Frost overlay small texture** — Frost vignette texture reduced from full-screen (1024×768) to 128×128, stretched via `setDisplaySize()`. Same FPS (drawImage cost scales with destination, not source), ~50× less memory, no resize rebuild. CSS `box-shadow` alternative benchmarked but was -5.4 FPS worse.

- ✅ **Night texture performance optimization** — Replaced full-screen per-frame DynamicTexture night overlay (6-8 FPS cost on Firefox) with pre-generated `_night` variant textures via canvas `multiply` composite. Headlight reduced to 256×256 world-space DT. Frost vignette skipped on night levels (invisible behind darkening, saves ~3 FPS). FPS meter switched to `requestAnimationFrame` counting for accurate frame rate.

- ✅ **Menu scene Graphics→Image baking** — Baked menu wildlife sprites, animal tracks, trees, groomer, and ground lines from per-frame Graphics command replay to pre-baked Image textures. Graphics objects: 60→4, command buffer: 6,268→192 (97% reduction). Mountains kept as Rectangles (fillRect is cheaper than drawImage on Firefox — A/B tested: baking mountains regressed Firefox by +5% CPU while improving Chromium by -145%; cross-browser neutral is better). DynamicTexture consolidation of sky/ground also attempted and reverted — full-screen DT caused 35% memcpy cost on Firefox.

- ✅ **Balance tweaks** — Snowpark (Air Zone) timer override to 80s, Halfpipe (Le Tube) target coverage raised to 95%, winch max cable length increased to 30 tiles.

- ✅ **Electron desktop wrapper** — Optional desktop build via `./build-desktop.sh`. Windowed by default with F11 fullscreen toggle (debounced). Three display modes (windowed/fullscreen/borderless) configurable in Settings, persisted to Electron userData JSON for flicker-free startup. Window recreated on frame change (windowed↔borderless). In-game fullscreen button/F key route through Electron IPC. Quit Game button in pause and main menus. Custom pixel-art app icon rendered natively at 7 sizes (16–512px) with progressive detail reduction. Runtime xdg desktop integration on Linux for Wayland taskbar icon. Cross-platform packaging: Linux AppImage, Windows installer + portable exe, macOS zip. afterPack hook strips Vulkan SwiftShader and source maps (~5MB saved per platform). Background audio setting (default: on) suspends AudioContext on window blur. External links open in system browser. Separate `electron/` directory with own `package.json` keeps Electron deps out of main project.

- ✅ **Ski run trick scoring** — Tricks award points by type (kicker 100, rail 150, halfpipe 200) with speed and variety multipliers. Consecutive unique tricks build a combo; repeating the same trick resets it. Total score, trick count, and best combo shown on the level complete screen for park levels.

- ✅ **Tuck mechanic & smooth steering** — Down key/D-pad/touch enters tuck position: +20% speed, 40% steering, minimal carve drag. Crouched sprites for skier and snowboarder. Keyboard/D-pad steering ramps over ~0.2s so quick taps feel like gentle corrections; gamepad analog bypasses the ramp.

- ✅ **Halfpipe physics & gamepad fixes** — Wall rebound, no air control, no airborne tracks in halfpipe. Gamepad Start button now pauses ski mode (with debounce). Both scenes reload gamepad/keyboard bindings from storage on resume so rebinds in Settings take effect immediately.

- ✅ **Y-depth sorting & collision refinement** — Groomer, obstacles, and all pole types use `yDepth()` for per-frame depth sorting. Tree trunk hitboxes shrunk (canopy passes behind). Groomer physics body rotates with movement direction. Cliff fall-detection zone aligned to visual cliff rocks via shared `getBounds()` with per-row variation. Steep zone detection uses per-row piste-aware bounds with 2-tile inward margin. Cliff danger poles extracted from baked texture into separate y-sorted objects. Removed `dangerZones` rectangle hitboxes from both scenes — cliff detection uses per-frame `isOnCliff()` geometry. Debug overlay setting added (Settings → Accessibility) showing all collision zones, hitboxes, and depth markers in both game modes.

- ✅ **Piste contrast & readability** — Darkened off-piste tile textures, lightened service road tiles, and raised minimum tile size to 14px for better piste visibility on all levels (especially night). Texture-level approach: no runtime overlays needed.

- ✅ **Dialogue content review & locale fixes** — Rewrote 5 level intros (L1/L2/L6/L7/L8) across 14 locales for voice consistency (Jean-Pierre/Émilie/Thierry). Added `steepWarningNoWinch` for non-winch levels (L4 fix). Localized `showFps`. Fixed JA/KO untranslated food terms, DE Glühwein→vin chaud, IT "Riscia!"→"Ancora sci!", EN "Cat tracks"→"Access paths". Dead key cleanup: removed `uiScale`, commented 20 unused keys. Dev-mode `t()` throws on missing locale keys; `{ probe: true }` for existence checks.

- ✅ **Playtesting dialogue fixes** — Removed Émilie re-intro in L3 (already introduced L2). Fixed Thierry speaking in 3rd person on L5. Swapped L5 Glacier steep zones so gentler slope (30°) is encountered first from bottom. Replaced opaque PIDA acronym with plain language in L8. Persisted steep warning via localStorage (no repeats). Added Marie's self-introduction on first restaurant visit. Localized keybinding manager status messages (5 hardcoded English strings → `t()`).

- ✅ **Resize + touch controls regression fixes** — Camera static→follow transition when touch controls reduce effective viewport height on portrait devices (L7). Groomer stays above controls after resize. Dialogue repositions above controls (tween race fix). 9 regression tests in `test_resize_touch.py`. Smart test selection expanded to all 78 source files with three validation layers (unknown tests, unmapped sources, scene drift detection).

- ✅ **Night overlay & culling resize fix** — Fixed night overlay not covering full viewport after resize/orientation change, and terrain DynamicTextures disappearing due to center-point culling. Night fix: extracted `prepareNightFrame()` for zoom-aware coordinate mapping; `handleNightResize()` called after `setZoom()`. Culling fix: bounds-based visibility checks in `cullOffscreen()`. Simplified `run-tests.sh` to use `./dev.sh`.

- ✅ **Crisp pixel art scaling** — Per-texture nearest-neighbor scaling for all sprites and DynamicTextures. Ski run HUD zoom-independent rendering. Firefox workaround: `pixelArt:true` causes black screen, so NEAREST set per-texture instead.

- ✅ **Canvas performance optimization** — Systematic profiling and optimization of Canvas renderer performance. CPU+FPS correlation benchmark (240 measurements, rAF frame counting) confirmed: camera culling and snow tiles→DT are genuinely beneficial; TileSprite→DT was purely wasteful (CPU UP and real FPS DOWN on Firefox — the earlier JS-measured "improvement" was an artifact). Final state: L10 storm Firefox 32→36 rAF FPS at 153→152% CPU; L2 clear Firefox 50→56 rAF FPS at 143→111% CPU. See ARCHITECTURE.md for full benchmark tables.

- ✅ **Engine volume control** — Separate volume slider for continuous motor sounds (engine idle, snow crunch, grooming blade). New `engine` audio channel in AudioSystem. Default 50%. Winch and one-shot SFX remain on the SFX channel.

- ✅ **Ski jumps** — Groom key triggers speed-dependent jump during ski runs. Cliff jumps clear cliff zones at 30+ km/h. Airborne skiers skip all ground-level collisions. Touch JMP button for mobile. Win screen shows celebrating skier/snowboarder. Park features render below player. 3 E2E tests.

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

### Audio Issues

- **PipeWire/PulseAudio stream shows "Chromium"** — Electron/Chromium hardcodes the PulseAudio `application.name` and `application.icon_name` in `pulse_util.cc`. No workaround exists. Tracking [electron/electron#49270](https://github.com/electron/electron/pull/49270).

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
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests. E2E-only coverage. Add geometry query and collision logic tests.
- HUDScene event listener leak (ski mode): no regression test verifying listeners don't accumulate across level transitions
- Text truncation at 360px mobile portrait: no E2E test for MenuScene/CreditsScene title overflow
- Settings overlay depth: no test verifying settings panel renders above menu after depth changes
- Keybinding reload on resume: no test for rebinding keys in settings then resuming gameplay

### Deferred Refactors

- ~~Halfpipe should not have lateral boundary walls — players need to enter/exit from the sides~~ ✅ Fixed
- GameScene further decomposition: GroomingSystem, InputManager candidates. LevelGeometry, PisteRenderer, WinchSystem, ObstacleBuilder done. Remaining methods (movement, resources, game flow, camera) are tightly coupled to GameScene state — further extraction would increase complexity.
- Wildlife behavior duplication between MenuScene and WildlifeSystem (bird soaring ~7 lines, track aging ~10 lines, same-species repulsion ~9 lines). Both files use the same patterns but different coordinate systems (side-view vs top-down), making extraction non-trivial.
- ✅ ~~GameScene directly references DialogueScene via `scene.get()` cast — should use GAME_EVENTS for decoupling. DialogueScene similarly accesses HUDScene for touch control positioning.~~ Replaced with `DIALOGUE_ACTIVE`, `SHOW_DIALOGUE`, `SHOW_COUNTDOWN`, `DISMISS_ALL_DIALOGUE` events. DialogueScene caches `TOUCH_CONTROLS_TOP` payload instead of querying HUDScene.
- MenuScene (1134 lines): terrain renderer, overlay manager, wildlife controller extracted; dead code removed, device detection deduplicated. Remaining UI layout/buttons/footer is inherently scene-specific.
- SettingsScene (1263 lines): focus navigator, keybinding manager extracted; scroll panel setup consolidated, magic numbers extracted, binding row methods merged. Remaining UI factories are tightly coupled to scene state — extraction deferred as net-negative.
- ✅ ~~HazardSystem callback coupling: GameScene passes 6 closures to `createAvalancheZones()`.~~ Replaced with `GAME_EVENTS.SHOW_DIALOGUE` and `GAME_EVENTS.HAZARD_GAME_OVER` events + query callback properties (`isGameOver`, `isGrooming`).
- ✅ ~~Timing magic numbers: various hardcoded delays in DialogueScene, HazardSystem.~~ Centralized into `BALANCE` constants (DIALOGUE_SLIDE_DURATION, TYPEWRITER_CHAR_DELAY, TYPEWRITER_SAFETY_BUFFER, AVALANCHE_WIPEOUT_DELAY).
- ✅ ~~Color magic numbers: inline `0x...` colors in ObstacleBuilder, WinchSystem, WeatherSystem, HazardSystem.~~ Centralized into `THEME.colors` world-element palette.
- ✅ ~~Silent storage errors: `storage.ts` catch blocks have no user notification.~~ Added `console.warn` logging to all write/remove failures for debugging.
- ✅ ~~Bonus evaluation duplication: HUDScene and LevelCompleteScene both evaluate bonus types with similar switch logic.~~ Extracted shared `getBonusLabel()`, `evaluateBonusObjective()`, `evaluateAllBonusObjectives()` to `src/utils/bonusObjectives.ts`.
- Static Graphics to textures: Trees/rocks/cliffs/animal tracks baked. Night overlay light cone commands reduced 71%. Remaining: ~26 pole/marker Graphics (11-20 commands each, diminishing returns).
