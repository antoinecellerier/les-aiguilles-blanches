# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

- [ ] Nintendo B-button back navigation - Flaky in full test suite (timing-sensitive gamepad stick navigation)
- [ ] Forest not blocking groomer - Groomer can freely traverse off-piste forest areas (should be stopped by trees)
- [ ] Service road width vs piste width - Roads should be visibly narrower than piste; widen piste if needed to ensure contrast

## Polish (Medium Priority)

- [ ] Level differentiation - Varied objectives beyond coverage percentage
- [ ] Character avatars - Visual representations for Jean-Pierre, Marie, Thierry, Émilie
- [x] Service roads - Improved legibility and practical usability (packed snow texture, amber poles, tree clearing, boundary wall exemption, intro dialog)
- [x] Responsive design - All scenes handle resize/orientation change
- [ ] Gamepad button rebinding - Allow customizing controller buttons
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
- [ ] Code cleanup audit

## Recently Completed

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

3. **Scene transitions** - Remove and recreate scenes to avoid texture corruption

### Test Coverage Gaps

- Gamepad rebinding (feature not implemented)
- Nintendo B-button back navigation flaky under parallel test execution
