# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [ ] Nintendo B-button back navigation - Flaky in full test suite (timing-sensitive gamepad stick navigation)
- [ ] Service road width vs piste width - Roads should be visibly narrower than piste; widen piste if needed to ensure contrast
- [ ] Avalanche zones overlap service roads - Avalanche zones should never overlap service roads
- [ ] Anchor point accessibility - Every winch anchor must be reachable via piste or service road without blocking avalanche/steep obstacles
- [ ] Groomer fall mechanics - Only fall when tracks (front) are over cliff/steep edge, not tiller (rear); add probability-based tip-over instead of instant fall
- [ ] Chalet placement overlap - Chalets should not overlap Marie's restaurant or the refuel point
- [ ] Firefox desktop touch detection - Touch availability should update on background tap, not just button presses

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

## Future (Backlog)

- [ ] Sound effects and music
- [ ] More character dialogues per level
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, wildlife, Candide Thovex cameo)
- [ ] Hide gamepad button hints in dialogues when no controller is connected
- [ ] Alpine wildlife (bouquetin, chamois, lapins, birds) as decorative features on menu screen and in-game — flee when groomer approaches

## Recently Completed

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

### Test Coverage Gaps

- Nintendo B-button back navigation flaky under parallel test execution
