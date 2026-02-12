# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [x] Firefox fullscreen button with gamepad - Added F keyboard shortcut + hint toast when gamepad fullscreen is rejected
- [x] HazardSystem avalanche timer leak — delayedCall not stored, fires on destroyed objects if scene shuts down
- [x] Menu title text overflows its box horizontally
- [x] Colorblind buttons don't update visual state when opening Settings from Pause menu
- [x] Navigation to Menu is broken on the failure screen

## Code Health

- [x] Direct localStorage calls bypass storage.ts — main.ts, HUDScene, GameScene should use getJSON/getString
- [x] Extract toggleFullscreen + hint toast to shared utility (duplicated in MenuScene + HUDScene)
- [x] Remove 22 console.log debug statements from GameScene

## Testing

- [x] Vitest: LevelGeometry pure functions (pathEdges, isOnCliff, isInPiste, isOnAccessPath)
- [x] Vitest: yDepth() and keyboardLayout pure functions
- [x] E2E: Flawless bonus restartCount tracking regression test

## Polish (Medium Priority)

- [x] Gamepad diagnostic in settings — Live button readout to help users with Bluetooth controllers identify and rebind mismapped buttons
- [ ] Advanced tiller mechanics — Tiller raise/lower for harder levels (grooming quality now implemented via steering stability + fall-line alignment)
- [x] Make the settings menu look nicer — visual polish pass

- [x] Add a tool tip on mouse over / touch for menu screen controller availability icons to explain what they mean to the user
- [x] Review emojis in dialogues for consistency with in game UI. E.g. the grooming button on mobile no longer looks like a snowflake.
- [x] Avalanche zones often overlap cliffs, they should be more distinct
- [x] Level durations should automatically be set based on difficulty level, area to groom, time to navigate access paths, etc.
- [x] Volume/mute indicator on menu screen bottom-left corner, analogous to controller hint icons
- [x] Tutorial dialogue fatigue — skip tutorial option on replay
- [x] When running a browser cached version, check if a newer version is available and offer to update on the menu screen
- [x] Winch cable max extension — Cable snaps at 25 tiles with stun + stamina penalty. Tension drag slows groomer near limit.


## In Progress: Ski/Snowboard Reward Run (v1)

Optional post-grooming descent — after winning a level, ski or snowboard down the piste you just groomed. Slope-aware physics, brake control, obstacle crashes, cliff wipeouts, replayable runs.

See [GAME_DESIGN.md — Ski/Snowboard Reward Run](./GAME_DESIGN.md#skisnoboard-reward-run) for full design.

- [x] Procedural skier & snowboarder sprites (20×28px, 8 variants each: straight/left/right/brake)
- [x] Ski/snowboard preference in Settings (Bonus section, multi-button selector)
- [x] Ski run physics constants (`BALANCE.SKI_*` in gameConfig.ts)
- [x] SkiRunScene — slope-aware descent, lateral steering, groomed/ungroomed speed diff, carving drag
- [x] Visor-style HUD (speed in km/h + elapsed time, matching grooming HUD design)
- [x] "Ski it!" / "Ride it!" button on LevelCompleteScene (win only, replayable)
- [x] Brake mechanic (winch key: Shift / LB / touch top quarter)
- [x] Obstacle bumps with cooldown, cliff danger zone wipeouts with respawn
- [x] Post-run flow (return to LevelCompleteScene, replay available)
- [x] Dev shortcut (K key: auto-groom + launch ski run)
- [x] Dynamic heading-aware physics (lateral input reduces gravity, progressive acceleration)
- [x] Directional sprite variants (texture swap instead of rotation)
- [x] E2E tests (10 tests: button visibility, scene loads, preference toggle, transitions)
- [x] Ski run audio (wind, carving, powder spray, bump sounds)
- [x] Fun failure screens for ski crashes (yard sale pixel art, avalanche burial art)
- [x] Off-piste skiing with powder drag, packed-snow shoulder near edges
- [x] Avalanche risk in ski mode (5× faster trigger than groomer)
- [x] Fatal high-speed crashes (trees/rocks above 40 km/h)
- [x] Ski/snowboard tracks on ungroomed and off-piste snow
- [x] Smooth carving physics (lerped lateral velocity)
- [x] Y-depth sorted obstacles (skier renders behind trees when above them)
- [x] Default grooming generation when starting from level select
- [ ] Ski jumps (groom key)
- [ ] Level-appropriate items, slalom gates, tricks

## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- [x] Storm snow accumulation — Trees, mountains, groomer accumulate visible snow during storm weather
- [ ] Sound effects polish (character voice review, melody phrasing rests, piano legato sustain, pause menu mute toggle)
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Publish as standalone game package
- [ ] Ski/snowboard reward run (v2) — Slalom gates, freestyle elements on park levels, per-level modifications, best time tracking
- [x] After a few levels have been completed, add a persistant menu to the home screen with direct level selection
- [ ] Make level select look like a ski resort trail map

## Recently Completed

- ✅ **Ski run realism pass** — Off-piste skiing with deep powder drag and packed-snow shoulder. Ski/snowboard tracks on ungroomed and off-piste snow (parallel lines for skis, single wide track for snowboard). Smooth carving physics via lerped lateral velocity. Fatal crashes above 40 km/h. Avalanche risk on hazardous levels (5× faster trigger). Y-depth sorted obstacles. Default grooming when starting from level select. Ski crash fail screens with yard sale and avalanche burial pixel art.

- ✅ **Favicon** — Pixel-art SVG favicon with red groomer, snow-capped mountain, and groomed snow. Uses game palette colors with `crispEdges` rendering.

- ✅ **Gamepad diagnostic in settings** — Live controller test panel in Settings showing all 16 buttons, dual analog sticks, and trigger values. Auto-detects controller type (Xbox/Nintendo/PlayStation) and adapts labels. Buttons highlight gold on press, stick dots track analog input, trigger bars fill proportionally. Hidden when no gamepad connected. D-pad buttons (↑↓←→) added to all controller name maps. Localized in 14 languages.

- ✅ **Food buff auto-selection** — Chez Marie now reads the player's situation and serves the best dish automatically. Vin Chaud (warmth, 25s) on night/storm levels halves stamina drain. Croziflette (speed, 20s) when time < 40% gives +30% speed at +40% fuel cost. Génépi (precision, 15s) when coverage > 70% adds +1 grooming radius. Fondue (staminaRegen, 30s) as default fallback. Short burst durations create a pit-stop rhythm. One buff at a time; HUD shows active buff icon + countdown. Pure `selectFoodBuff()` function with 10 unit tests.

- ✅ **Background update check** — On menu load, fetches `version.json` (generated at build time by Vite plugin) with cache-busting and compares against baked-in `__APP_VERSION__`. Shows clickable reload banner above footer when a newer version is deployed. Localized in 14 languages. Session-cached to avoid repeated fetches.

- ✅ **Ski run audio & pause** — Procedural descent audio via SkiRunSounds: speed-dependent wind rush, terrain-aware snow carving (groomed swishes vs ungroomed crunch), brake scrape, obstacle bump, cliff wipeout, trick launch/land whoosh, rail grind metallic scrape. AmbienceSounds (storm/night) and MusicSystem ('intense' mood) now active during ski runs. ESC opens pause menu with Skip Run option (was instant abort). Localized in 14 languages.

- ✅ **Random ski/snowboard mode** — Default descent mode is now "Random" (50/50 ski or snowboard each run). Settings offers Random / Ski / Snowboard. Mode resolved once per run and shown on button label. Progressive turn drag: carving friction ramps from 10%→100% over 0.4s so initial turns are snappy.

- ✅ **Gameplay QoL** — Groomer spawn exclusion zone (3 tiles), obstacle minimum spacing (6 tiles), halved obstacle density with 90% edge bias, progressive turning (hold ramps to 2.2× over 0.4s), halfpipe wall lip colliders with pump-effect speed boost, ski run tile overlap to fix sub-pixel gaps, ungroomed snow texture lightened, fuel station repositioned on park levels.

- ✅ **Menu scroll & layout** — Scrollable main menu for phone landscape (container + geometry mask, wheel/touch/keyboard scroll, ▲/▼ indicators). Button reordering (Resume CTA → New Game → Level Select). Single green CTA. Groomer shifted to 82% width in landscape to avoid button overlap. Settings scene: back button + title inline at top, maximizing content area.

- ✅ **Level select & replay** — New LevelSelectScene accessible from main menu when player has progress. Shows all 11 levels with difficulty markers, star ratings (⭐⭐⭐), and Groom/Ski buttons. Per-level stats persisted (best stars, best time, bonus objectives). Ski mode gated to completed levels. Locked levels shown grayed out. Keyboard/gamepad navigation, responsive layout, scroll support.

- ✅ **Park zone system** — Terrain park features for L3 (Air Zone) and L6 (Le Tube). L3 gets 3 kickers and 3 rails in parallel lines (jump line left, jib line right); L6 gets halfpipe walls that narrow the groomable floor. Zone-specific optimal grooming direction overrides fall-line alignment. Driving onto a feature = instant fail (forgiving ~70% hitbox). Blue dye boundary lines and direction arrows. New `pipe_mastery` bonus on L6. Localized fail taunts in 14 languages. 21 unit tests.

- ✅ **Ski run trick system** — Interactive tricks on park levels during the ski/snowboard reward run. Kicker air tricks (5 variants: 360, 720, Backflip, Frontflip, Method), rail grind tricks (4 variants: Boardslide, 50-50, Lipslide, Tailslide with distinct spark colors), and halfpipe wall tricks (5 pipe-specific: McTwist, Crippler, 900, Alley-oop, Stalefish). Trick name shown in popup, 1.3× speed boost. Halfpipe triggers on boundary wall collision. Works for both ski and snowboard modes.

- ✅ **Grooming quality system** — Steering stability (angular acceleration) + fall-line alignment determine per-tile quality (0–100%). Three visual texture tiers. Re-grooming upgrades quality (best-of-N). New `precision_grooming` bonus objective on L3, L6, L10. Localized in 14 languages.

- ✅ **Steep zone visual tinting** — Pre-generated snow texture variants (warm blue for slide 25°–35°, cold icy blue for tumble 40°–50°) applied via `setTexture()` since Canvas renderer ignores `setTint()`. Textures generated in BootScene, applied in GameScene. Persists after grooming.

- ✅ **Steep zone marker cleanup** — Removed redundant dash lines and non-standard angle text. Warning triangle now tumble-only (≥40°), mounted on a yellow danger pole at the left piste border (with cliff fallback to right).

- ✅ **Avalanche/cliff overlap fix** — Avalanche zones now avoid cliff segments via `getCliffAvoidRects()` bounding rects passed as additional avoid regions.

- ✅ **Settings menu visual polish** — Alpine terrain backdrop with animated wildlife (via `MenuWildlifeController`), section panels with borders and gold accent dividers, responsive two-column/single-column layout with conditional scrollbar. Panel width properly accounts for padding to prevent overflow. Centralized `DEPTHS.MENU_OVERLAY`/`MENU_UI` constants in gameConfig.ts.

- ✅ **Localization expansion (Phase 1)** — Extended from 5 to 14 languages targeting top ski markets: Swedish 🇸🇪, Norwegian 🇳🇴, Finnish 🇫🇮, Czech 🇨🇿, Polish 🇵🇱, Turkish 🇹🇷, Slovak 🇸🇰, Japanese 🇯🇵, Korean 🇰🇷. Split monolithic localization.ts into per-language files in `src/config/locales/`. CJK support via system font fallbacks in theme.ts. Language selector ordered by skier visits (French first as home country). All 212 keys translated per language.

- ✅ **Controller tooltips** — Hover/tap on input hint icons shows combined tooltip listing all 3 input methods (keyboard, touch, gamepad) with ✓/✗ status. Separate tight hover zone (mouse) and 48px-padded touch zone. Touch hold-and-release with 1.5s minimum display. Localized in 5 languages.

- ✅ **Volume/mute indicator** — Menu screen bottom-left volume icon with hover slider (mouse) and tap-to-mute (touch). 48px touch target, forbidden-circle overlay when muted. Pointer-type detection (`wasTouch`) for hybrid devices. 7 E2E tests. conftest.py loads `.env.local` for port config.

- ✅ **Nocturne music system** — Procedural Chopin nocturne-style piano music via MusicSystem singleton. Five moods (menu, calm, night, intense, credits) with GPT-5.2-composed melodies in distinct keys. Grand piano synthesis with 7 harmonics, inharmonicity, hammer noise, sympathetic resonance. Persists across scenes with crossfade on mood change. DynamicsCompressor limiter on master output. Safari `webkitAudioContext` fallback. Fixed 6 audio node leaks (buffer sources without `.stop()`), EngineSounds `onReady()` race condition, visibility listener cleanup. Added voice & ambience volume sliders to SettingsScene (5 languages).

- ✅ **Win/fail screen visual redesign** — Alpine backgrounds via `createMenuTerrain()`, weather effects (night overlay, storm particles), wildlife via `MenuWildlifeController`, failure-specific groomer effects (tumble, avalanche, cliff, fuel, time).

- ✅ **Depth layering fix** — Y-based depth sorting for trees, chalets, anchors, wildlife via `yDepth()`. AIRBORNE depth for birds above winch cable. Background forest at fixed depth.

- ✅ **Tutorial dialogue polish** — Rewrote tutorial strings from robotic checklist format to natural Jean-Pierre dialogue. HUD description now matches actual colored bars. Fixed DE/IT grammar. Content reviewed via cross-model consultation.

- ✅ **Dialogue UI on large screens** — Capped dialogue box width at 800px (centered). Increased text font on desktop (14→16px). Prevents thin banner stretching across ultrawide monitors.

- ✅ **Menu weather from level progress** — Menu scene shows night overlay and snow particles matching the player's current level weather (night, storm, light snow).

- ✅ **Resize & zoom fixes** — Diagonal-ratio zoom scaling for orientation-independent viewport sizing. Proportional zoom on resize preserves world scale. Groomer kept above virtual touch controls on portrait devices via `GAME_EVENTS.TOUCH_CONTROLS_TOP` event with extended camera bounds.

- ✅ **Resize & orientation fix** — `ResizeObserver` on `#game-container` + `orientationchange` listener, debounced at 150ms. Night overlay, headlights, and dialogue scenes all handle resize correctly via centralized `cameraCoords.ts`.

- ✅ **Gamepad level loop fix** — Deferred `transitionPending` guard reset via `requestAnimationFrame` + `isNavigating` guard in `LevelCompleteScene.navigateTo()`.

- ✅ **HUD visor horizontal redesign** — 3-row horizontal layout with progress bars, coverage target marker, bonus objectives. Accessibility: higher alpha, text stroke, colorblind text labels.

- ✅ **Settings keyboard & gamepad navigation** — FocusItem system with 17 navigable elements, arrow/D-pad nav, auto-scroll.

- ✅ **Level progression redesign** — 11 levels (was 9): split L4 into fuel/roads + winch intro, added FIS finale L10, removed tutorial timer, lowered halfpipe coverage.

- ✅ **Alpine wildlife** — 6 species (bouquetin, chamois, marmot, bunny, birds, fox) with flee AI, tracks, fox hunting behavior. Menu + in-game.

- ✅ **GameScene extraction** — LevelGeometry, PisteRenderer, WinchSystem, ObstacleBuilder, WeatherSystem, HazardSystem. GameScene 2960→1296 lines (-56%).

- ✅ **MenuScene & SettingsScene extraction** — MenuTerrainRenderer, MenuWildlifeController, OverlayManager, FocusNavigator, KeybindingManager. MenuScene -65%, SettingsScene -27%.

<details>
<summary>Older completed items</summary>

- ✅ Smart test runner (`--smart` flag)
- ✅ Gamepad phantom press fix (captureGamepadButtons)
- ✅ Xbox LT/RT Firefox fix (axis fallback)
- ✅ Mobile art review (PauseScene, HUD compact, touch targets)
- ✅ Content review (dialogue register, character voice, localization)
- ✅ Dialogue speaker fix (introSpeaker per level)
- ✅ Art review fixes (pixel art, contrast, marker colors, depth constants)
- ✅ Art director / content-review / game-design skills
- ✅ Wildlife polish (bird sprites, fox behavior, tracks, depth)
- ✅ Code health audits v1-v4 (scene transitions, gamepad nav, architecture refactors)
- ✅ Scene navigation fixes, form factor fixes, auto-paginate dialogues
- ✅ HUD & dialogue retro overhaul, styling consistency
- ✅ Menu restyle, changelog overlay, full localization (5 languages)
- ✅ Depth layering, French signage standards, virtual joystick
- ✅ Cliff system, night rendering, winch mechanics, gamepad/touch support
- ✅ Cross-cutting: ResizeManager, storage.ts, storageKeys.ts, sceneTransitions.ts

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
- MenuScene (566 lines): terrain renderer, overlay manager, wildlife controller extracted; dead code removed, device detection deduplicated. Remaining UI layout/buttons/footer is inherently scene-specific.
- SettingsScene (880 lines): focus navigator, keybinding manager extracted; scroll panel setup consolidated, magic numbers extracted, binding row methods merged. Remaining UI factories are tightly coupled to scene state — extraction deferred as net-negative.
- HazardSystem callback coupling: GameScene passes 6 closures to `createAvalancheZones()`. Replace with event emitter pattern via `game.events`.
- Timing magic numbers: various hardcoded delays (300/500/800/2000ms) in DialogueScene, SettingsScene, HazardSystem. Centralize incrementally into BALANCE.
- Color magic numbers: inline `0x...` colors in ObstacleBuilder, WinchSystem, WeatherSystem, HazardSystem. Centralize into THEME incrementally.
- Silent storage errors: `storage.ts` catch blocks have no user notification. Consider toast/banner for critical save failures (progress, bindings).
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests. E2E-only coverage. Add geometry query and collision logic tests.
- Bonus evaluation duplication: HUDScene.updateBonusObjectives() and LevelCompleteScene.evaluateBonusObjectives() both evaluate 5 bonus types with similar switch logic. Extract shared `evaluateBonusObjective()` and `getBonusLabel()` to `src/utils/bonusObjectives.ts`.
