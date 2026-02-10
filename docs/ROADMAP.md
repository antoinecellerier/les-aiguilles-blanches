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

- [ ] Gamepad diagnostic in settings — Live button readout to help users with Bluetooth controllers identify and rebind mismapped buttons
- [ ] Advanced tiller mechanics — Tiller raise/lower, speed-dependent grooming quality for harder levels
- [ ] Make the settings menu look nicer — visual polish pass
- [ ] Bundle size / load time optimization — Analyze bundle, consider async loading for heavy systems (e.g. audio) to speed up initial game load
- [x] Add a tool tip on mouse over / touch for menu screen controller availability icons to explain what they mean to the user
- [x] Review emojis in dialogues for consistency with in game UI. E.g. the grooming button on mobile no longer looks like a snowflake.
- [ ] Avalanche zones often overlap cliffs, they should be more distinct
- [x] Level durations should automatically be set based on difficulty level, area to groom, time to navigate access paths, etc.
- [x] Volume/mute indicator on menu screen bottom-left corner, analogous to controller hint icons
- [x] Tutorial dialogue fatigue — skip tutorial option on replay
- [ ] When running a browser cached version, check if a newer version is available and offer to update on the menu screen
- [ ] Winch cable should have infinite extension — currently limited, should only provide pulling force


## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- [x] Storm snow accumulation — Trees, mountains, groomer accumulate visible snow during storm weather
- [ ] Sound effects polish (character voice review, melody phrasing rests, piano legato sustain, pause menu mute toggle)
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Publish as standalone game package
- [ ] Optionally let players ski or snowboard down a piste on level completion
- [ ] After a few levels have been completed, add a persistant menu to the home screen with direct level selection

## Recently Completed

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
