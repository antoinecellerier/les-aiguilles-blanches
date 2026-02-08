# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [ ] Nintendo B-button back navigation - Flaky in full test suite (timing-sensitive gamepad stick navigation)
- [x] Service road width vs piste width - Roads (5 tiles) are already 2-5× narrower than pistes with distinct packed-snow texture
- [x] Avalanche zones overlap service roads - Increased avoidRects margin from 0.8× to 1.2× road width to cover curve interpolation
- [x] Anchor point accessibility - Unit test validates no anchor falls inside steep zones; all current levels pass
- [x] Groomer fall mechanics - Center-of-mass based cliff fall instead of instant physics overlap death
- [x] Chalet placement overlap - AABB overlap check against restaurant/fuel station footprints before placing chalets
- [x] PauseScene boot crash (not reproducible) - Added `this.scene.manager` null guard in pauseGame/resumeGame to handle deferred scene teardown timing
- [ ] Firefox fullscreen button with gamepad - `requestFullscreen()` requires user-gesture; gamepad events don't qualify in Firefox
- [x] BootScene GitHub link - GitHub issues link in BootScene error handler and index.html fallback (15s timeout)
- [x] Firefox desktop touch detection - Touch availability updates on background tap via canvas listener
- [x] GameScene→LevelCompleteScene scene transition - By design: direct scene.start is correct here (overlays stopped explicitly, resetGameScenes would be unnecessary overhead)

## Polish (Medium Priority)

- [x] Level differentiation - Bonus objectives (fuel efficiency, no tumble, speed run, winch mastery, exploration) with per-level assignments and grade integration
- [x] Character avatars - Visual representations for Jean-Pierre, Marie, Thierry, Émilie
- [x] Service roads - Improved legibility and practical usability (packed snow texture, amber poles, tree clearing, boundary wall exemption, intro dialog)
- [x] Responsive design - All scenes handle resize/orientation change; form factor fixes for landscape phones, narrow portrait, compact HUD
- [x] Gamepad button rebinding - Allow customizing controller buttons
- [x] Rework home screen styling
- [x] Styling consistency audit - All scenes use centralized THEME; green CTA hierarchy for primary actions
- [ ] Advanced tiller mechanics - Tiller raise/lower, speed-dependent grooming quality for harder levels
- [ ] Make test script robust to stale sessions
- [x] Review Phaser patterns - Audit implementation against Phaser recommended patterns (Scale, Scene lifecycle, cameras)
- [ ] Adapt the menu scene to render weather from the current level (night, storm, etc.)
- [ ] Make the settings menu look nicer

## Future (Backlog)

- [ ] Sound effects and music
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Menu wildlife flees on multitouch inputs (currently only single pointer triggers flee)
- [x] Movement sensitivity setting - Continuous slider (25%–200%) in SettingsScene, saved to localStorage, applied as speed multiplier
- [x] Hide gamepad button hints in dialogues when no controller is connected
- [x] Settings keyboard/gamepad navigation - Full focus system for all 17 interactive elements, arrow keys + D-pad, Enter/A to activate, left/right for groups/slider
- [x] HUD bonus objectives panel - Live display of bonus objectives inside visor during gameplay with ✓/✗ status, compact mode fade
- [ ] Publish as standalone game package

## Recently Completed

- ✅ **HUD visor horizontal redesign** — Replaced 4-row vertical visor layout with compact 3-row horizontal design. Row 1: level name + timer. Row 2: fuel, stamina, and coverage progress bars side by side with colored dot identifiers. Row 3: bonus objectives in horizontal columns. Coverage bar shows gold target marker at target % position, fills white→green on target met. Accessibility: visor alpha 0.55→0.80, text stroke, brighter bar borders, text labels ("F"/"S") replacing colored dots in colorblind mode. Fixed timer init bug (was "00:00" causing false speed_run failure).

- ✅ **HUD bonus objectives** — Bonus objectives (fuel efficiency, no tumbles, speed run, winch mastery, exploration) displayed inside visor during gameplay. Live evaluation with green ✓ on success, red ✗ on irreversible failure. Compact screens flash objectives for 4s then fade, with re-flash on status change. Added `tumbleCount`, `fuelUsed`, `winchUseCount`, `pathsVisited`, `totalPaths` to `GameStateEvent`. Extracted `buildGameStatePayload()` in GameScene to remove emit duplication.

- ✅ **Cross-cutting code health fixes** — Extracted `ResizeManager` utility (dedup resize-debounce in 4 scenes, -56 net lines). Extracted `storage.ts` with typed `getJSON`/`setJSON`/`getString`/`setString` (dedup localStorage patterns in 6 files, -23 net lines). Centralized `BINDINGS_VERSION` in `storageKeys.ts` (was fragile duplicate). Added `SENSITIVITY_MIN/MAX/DEFAULT` and `SCENE_INPUT_DELAY` to BALANCE. Extracted `getSavedKeyName()` to dedup `getGroomKeyName`/`getWinchKeyName`.

- ✅ **GameScene LevelGeometry + PisteRenderer + WinchSystem + ObstacleBuilder extraction** — Extracted piste path/cliff/access path geometry into `LevelGeometry` (385 lines, zero Phaser dependency), boundary colliders/cliff visuals/markers/trees/access path rendering into `PisteRenderer` (651 lines), winch anchors/cable/state into `WinchSystem` (196 lines), and obstacle/building/chalet creation into `ObstacleBuilder` (218 lines). Decomposed 220-line `createLevel()` into 6 focused sub-methods. GameScene reduced from 2783→1296 lines (-53%). Fixed shutdown ordering.

- ✅ **MenuScene god method refactoring** — Split `create()` (390→50 lines) and `update()` (467→7 lines) into focused sub-methods. Extracted createSkyAndGround, createTitle, createMenuButtons, createFooter, setupInput from create(); updateSnowflakes, updateWildlife, updateBird, updateClimber, updateGroundAnimal, animateGroundAnimal, wanderDecision, updateTracks from update(); createMenuClimbers, createMenuBirds from createMenuWildlife. 38 methods total, no behavioral changes.

- ✅ **Settings keyboard & gamepad navigation** - FocusItem system with 17 navigable elements (language group, toggles, bindings, layout group, sensitivity slider, gamepad bindings, reset, back). Arrow/D-pad up/down navigates, left/right cycles groups and adjusts slider. Focus indicator with auto-scroll and panel clipping. Gamepad left/right handled with separate cooldown from vertical nav.

- ✅ **Smart test runner** - `run-tests.sh --smart` runs only tests affected by uncommitted changes. Unit tests use `vitest --changed HEAD`; E2E uses file-level selection with `test_navigation.py` as catch-all.

- ✅ **Resize & zoom fixes** - Diagonal-ratio zoom scaling for orientation-independent viewport sizing. Proportional zoom on resize preserves world scale. Groomer depth raised above virtual touch controls on portrait devices via `GAME_EVENTS.TOUCH_CONTROL_HEIGHT` event.

- ✅ **Gamepad phantom press fix** - Added `captureGamepadButtons()` utility for non-menu scenes (GameScene, HUDScene). Captures button state at scene init to suppress held-button phantom presses during transitions.

- ✅ **Xbox LT/RT Firefox fix** - Firefox reports Xbox triggers as axes (indices 4,5) not buttons (6,7). Added `isGamepadButtonPressed()` with axis fallback. Settings rebind UI handles trigger-as-axis display.

- ✅ **Input hints z-order fix** - Input method hints (keyboard/touch/gamepad) now render above footer on MenuScene.

- ✅ **Mobile art review** - PauseScene responsive redesign (viewport-aware scaling, adaptive panel/font/button sizing, touch targets). HUD compact mode circles→rectangles (ART_STYLE compliance). MenuScene title/button font floors for narrow screens. SettingsScene touch target minimum fix (was shrinking below 44px on narrow touch devices).

- ✅ **Level progression redesign** - Split L4 (3 mechanics) into L4 L'Aigle (fuel/roads) + L5 Le Glacier (winch intro). Added L10 Coupe des Aiguilles (FIS finale, night, all mechanics, Jean-Pierre bookend). Removed tutorial time limit. Lowered halfpipe coverage 95%→80%. Renamed all level keys from numbered (level1Name) to descriptive (level_marmottesName). Game now has 11 levels with proper one-mechanic-per-level difficulty curve.

- ✅ **Content review** - Fixed thierryWarning register break (vous→tu), subtitle wording, level 2/3 character voice, avalanche wordplay. Added Émilie to level 3 intro. Fixed DE/IT missing taunt sentences.

- ✅ **Dialogue speaker fix** - Added `introSpeaker` field to Level config and `DIALOGUE_SPEAKERS` map in DialogueScene. Each level intro now shows the correct character name and portrait. 12 e2e tests + 1 unit test.

- ✅ **Art review fixes** - Enabled pixelArt mode (crisp pixel edges), improved button contrast (WCAG AA), refactored marker colors to use centralized DIFFICULTY_MARKERS, replaced magic depth numbers in HUDScene with DEPTHS constants, improved touch button contrast. Updated ART_STYLE.md with accurate groomer dimensions, mechanical palette, tree variants, and undocumented colors.

- ✅ **Art director review skill** - New `art-review` skill for visual code review against ART_STYLE.md (colors, shapes, dimensions, depth, accessibility) with Playwright screenshot inspection and cross-model consultation. Added to pre-commit checklist.

- ✅ **Alpine wildlife** - Decorative bouquetin, chamois, marmots, bunnies, and birds on menu and in-game. Flee AI reacts to groomer proximity. Per-level species config via WildlifeSystem

- ✅ **Wildlife polish** - Side-view flying bird sprite (Gemini-reviewed), perched/flying sprite swaps, proper flight orientation via setScale, smooth arc-turning soaring, fox hunting/lunge/rest extracted to foxBehavior.ts, track drawing extracted to animalTracks.ts, Y-based bouquetin depth, bird world-edge wrapping, dialog depth fix (renders above mountains), building/cliff collision, track erasure on grooming, track bootstrapping, overlay shutdown cleanup

- ✅ **Code health audit - Level loop bug fix** - Added regression test for held SPACE across scene transitions. Applied inputReady pattern to PauseScene (prevents held ESC from immediately resuming). Added timer cleanup to LevelCompleteScene and PauseScene shutdown(). Documented inputReady pattern in ARCHITECTURE.md. Confirmed PauseScene↔SettingsScene direct scene transitions are correct (preserve game state).

- ✅ **Level loop fix** - Game looped between levels when pressing SPACE. Two causes: (1) `game.scene.remove()` doesn't call `shutdown()`, leaking `game.events` listeners — fixed by stopping scenes before removing in `resetGameScenes()`. (2) Held SPACE from prior scene immediately activated LevelCompleteScene buttons — fixed with 300ms input delay

- ✅ **Game freeze fix** - Added `.active` guards on all HUD game objects, null-safe DialogueScene access, `isActive` guards on pauseGame/resumeGame, fixed skipLevel scene stop order. Removed unreliable `delayedCall(1)` wrapper for overlay scene launches. Winch slack cable no longer prevents steep slope slide. Removed useless below-zone anchors (levels 7-9). Dialogue tween race prevention

- ✅ **Dialogue typewriter freeze fix** - ESC during dialogue typing simultaneously dismissed dialogue and paused game, causing stuck state. ESC/Start/pause button now dismiss dialogue first; pause only fires on next press. Added safety timeout and closure-captured text to prevent timer desync

- ✅ **Code health audit v4 — architecture refactors** - Extracted WeatherSystem and HazardSystem from GameScene (2960→2570 lines). Decoupled GameScene↔HUDScene via event-based communication (GAME_EVENTS). Centralized 40+ physics magic numbers into BALANCE config. Unified button navigation across 4 scenes (menuButtonNav.ts). Eliminated `as any` type casts via global.d.ts and GameSceneInterface. All audit items resolved (11/12 done, 1 deferred: depth constants)

- ✅ **Code health audit v3** - Fixed HUD pause button crash (passed wrong data to PauseScene), added .catch() to async keyboard layout detection, removed dead code (`detectLayoutFromEvent`), blocked overlay click bleed-through in MenuScene, standardized button hover scale to 1.05×. Updated code-health skill to always use best available models for cross-referencing

- ✅ **Code health audit** - Centralized scene transitions (`sceneTransitions.ts`) and gamepad menu navigation (`gamepadMenu.ts`). Eliminated 273 lines of duplicated cleanup/polling code across 8 files. Fixed inconsistent scene lists (CreditsScene/GameScene were missing PauseScene cleanup). Registration pattern breaks circular imports. Created `code-health` custom agent (`.github/agents/`) to make audits repeatable

- ✅ **Scene navigation fixes** - Fixed zombie resize handlers, stale scene data, and broken Settings→PauseScene return. All scene transitions now use remove+re-add cleanup pattern. Documented SceneManager vs ScenePlugin API differences in ARCHITECTURE.md
- ✅ **Art style consistency** - Winch anchors: rectangle-only cable hook, correct gray post, yellow number plate. Steep/avalanche zones: replaced emoji/polygon shapes with rectangle-only pixel art, localized risk labels, THEME fonts throughout
- ✅ **Form factor fixes** - Menu drops Fullscreen button on landscape phones; title bg clamped; Settings single-column on landscape phones; HUD colored dots in compact mode; Win/Fail font sizes increased for desktop
- ✅ **Auto-paginate long dialogues** - `splitTextToPages()` breaks dialogue text that exceeds 30% of screen height into multiple pages
- ✅ **Steep slope dialogue once only** - Warning dialogue no longer repeats after entering/exiting steep zones within the same level
- ✅ **Visor HUD redesign** - Replaced beveled panels with semi-transparent dark visor strip, pixel art touch button icons, winch hint moved to dialogue, dynamic dialogue box height for mobile
- ✅ **HUD & dialogue retro overhaul** - Replaced emoji icons with text labels (FUEL, STAM, WINCH, etc.), added 3D beveled panels, character portraits with colored initials, typewriter text effect, retro touch control styling
- ✅ **Styling consistency audit** - All 7 UI scenes now import centralized THEME; green CTA buttons for primary actions (Start, Resume, Next Level, Retry); SettingsScene/DialogueScene/HUDScene/MenuScene colors migrated from hardcoded to THEME references
- ✅ **Menu screen restyle** - Retro SkiFree aesthetic: stepped pixel mountains, side-view groomer, animated snow, 3D buttons, dark footer, aspect-ratio-aware layout
- ✅ **Changelog overlay** - Daily entries with localized dates, dynamic key discovery, font scaling for small screens
- ✅ **Full localization** - All 5 languages (FR/EN/DE/IT/ES) with ~170 keys each, coverage tests, hardcoded strings removed
- ✅ **HUD text crispness** - roundPixels config, integer positions, removed sub-pixel origins
- ✅ **Taunts overhaul** - 5 per failure type, character references, removed hardcoded FR fallbacks
- ✅ **Input method hints** - Keyboard/Touch/Gamepad indicators in footer with forbidden sign overlay for unavailable methods
- ✅ **Firefox touch detection** - Centralized touch detection utility (`touchDetect.ts`), force-enabled Phaser touch input to fix Firefox desktop touchscreen support
- ✅ **Depth layering audit** - Centralized all depth values in DEPTHS constants (gameConfig.ts). Fixed trees/chalets/markers rendering at wrong depth. Piste renders above access roads. Trees above cliffs with sparse clustered placement
- ✅ **French signage standards** - Cross-referenced against NF S52-102. Fixed orange cap side, danger pole colors (yellow/black), steep zone triangle signs, avalanche flag colors
- ✅ **Virtual joystick** - Replaced D-pad with stick + thumb, button press feedback
- ✅ **Keyboard-only menu navigation** - Arrow keys + Enter/Space across all scenes
- ✅ **Marker placement & pole sizing** - Markers skip cliffs, warning poles on snow, all poles standardized to 28×5px
- ✅ **Art style guide** - Comprehensive visual style documentation preventing future inconsistencies
- ✅ **Cliff system** - Shared CliffSegment architecture with physics/visual alignment, organic edges, variable offset/extent
- ✅ **Night rendering** - Night overlay with directional groomer headlights
- ✅ **Winch mechanics** - Anchor proximity detection, cable slack/tension physics
- ✅ **Gamepad support** - Nintendo/PlayStation/Xbox detection, D-pad, full test coverage
- ✅ **Touch controls** - Diagonal D-pad with multitouch support
- ✅ **Game progression** - Save/load level progress
- ✅ **rexUI migration** - Settings, Menu, LevelComplete scenes

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
- MenuScene (607 lines): terrain renderer, overlay manager, and wildlife controller extracted. Remaining UI layout/buttons/footer is inherently scene-specific.
- SettingsScene (918 lines): focus navigator and keybinding manager extracted. Remaining UI factories are tightly coupled to scene state — extraction deferred as net-negative.
- HazardSystem callback coupling: GameScene passes 6 closures to `createAvalancheZones()`. Replace with event emitter pattern via `game.events`.
- Timing magic numbers: various hardcoded delays (300/500/800/2000ms) in DialogueScene, SettingsScene, HazardSystem. Centralize incrementally into BALANCE.
- Color magic numbers: inline `0x...` colors in ObstacleBuilder, WinchSystem, WeatherSystem, HazardSystem. Centralize into THEME incrementally.
- Silent storage errors: `storage.ts` catch blocks have no user notification. Consider toast/banner for critical save failures (progress, bindings).
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests. E2E-only coverage. Add geometry query and collision logic tests.
- Bonus evaluation duplication: HUDScene.updateBonusObjectives() and LevelCompleteScene.evaluateBonusObjectives() both evaluate 5 bonus types with similar switch logic. Extract shared `evaluateBonusObjective()` and `getBonusLabel()` to `src/utils/bonusObjectives.ts`.
