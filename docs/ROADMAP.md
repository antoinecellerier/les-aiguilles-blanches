# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [ ] Nintendo B-button back navigation - Flaky in full test suite (timing-sensitive gamepad stick navigation)
- [ ] Forest not blocking groomer - Groomer can freely traverse off-piste forest areas (should be stopped by trees)
- [ ] Service road width vs piste width - Roads should be visibly narrower than piste; widen piste if needed to ensure contrast

## Polish (Medium Priority)

- [x] Level differentiation - Bonus objectives (fuel efficiency, no tumble, speed run, winch mastery, exploration) with per-level assignments and grade integration
- [ ] Character avatars - Visual representations for Jean-Pierre, Marie, Thierry, Émilie
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
