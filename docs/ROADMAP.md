# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [ ] Firefox fullscreen button with gamepad - `requestFullscreen()` requires user-gesture; gamepad events don't qualify in Firefox
- [ ] Nintendo B-button back navigation - Flaky in full test suite (timing-sensitive gamepad stick navigation); passes in isolation

## Polish (Medium Priority)

- [ ] Directional slope traversal — Groomer should traverse intermediate-slope zones fine when facing up/down but tumble when moving sideways across the slope
- [ ] Advanced tiller mechanics — Tiller raise/lower, speed-dependent grooming quality for harder levels
- [ ] Adapt the menu scene to render weather from the current level (night, storm, etc.)
- [ ] Make the settings menu look nicer — visual polish pass
- [ ] Review in-game dialogue UI — better use of space on larger screens
- [ ] Review in-game dialogue content — check for excessive or inaccurate emoji use
- [ ] Chalet/tree depth layering on steep levels — investigate Y-based sorting for buildings vs trees

## Future (Backlog)

- [ ] Halfpipe scoring zones — Replace raw coverage with zone-quality scoring (clean edges, transitions, flat bottom)
- [ ] All characters have dialogue lines — Verify all 4 characters appear across levels where appropriate
- [ ] Sound effects and music
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, Candide Thovex cameo)
- [ ] Menu wildlife flees on multitouch inputs (currently only single pointer triggers flee)
- [ ] Publish as standalone game package

## Recently Completed

- ✅ **How to Play dialog fix** — Content text was invisible (rexUI background rendered on top). Fixed display list ordering with `bringToTop()`.

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
