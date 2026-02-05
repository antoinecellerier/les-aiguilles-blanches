# Roadmap & Work Queue

This document tracks planned work, bugs, and feature ideas. Updated alongside development.

For technical implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Bugs

(None currently tracked)

## Polish (Medium Priority)

- [ ] Move speed consistency - Verify same speed across keyboard/touch/gamepad
- [ ] Gamepad button rebinding - Allow customizing controller buttons
- [ ] Keyboard-only menu navigation - Full menu access without mouse
- [ ] Level differentiation - Varied objectives beyond coverage percentage
- [ ] Character avatars - Visual representations for Jean-Pierre, Marie, Thierry, Émilie
- [ ] Marker placement validation - Ensure piste/danger markers only placed on snow, not rock
- [ ] Service roads - Improve legibility and practical usability
- [ ] Touch controls - Move dialogues so they don't overlap with D-pad
- [ ] Touch controls - Make direction controls more stick-like with visual feedback
- [ ] Taunts - Make failure taunts more topical and personal
- [ ] Changelog view - Accessible from main menu

## Future (Backlog)

- [ ] Localization audit - Verify all UI text uses t() function
- [ ] Sound effects and music
- [ ] More character dialogues per level
- [ ] Complete translations for DE/IT/ES
- [ ] Procedural level generation
- [ ] Leaderboards
- [ ] Easter eggs (5G towers, wildlife, Candide Thovex cameo)
- [ ] Code cleanup audit

## Recently Completed

- ✅ **Art style guide** - Comprehensive visual style documentation preventing future inconsistencies
- ✅ **Cliff system** - Shared CliffSegment architecture with physics/visual alignment, organic edges, variable offset/extent
- ✅ **Pre-commit checklist** - Workflow skill ensuring docs, tests, and commit quality
- ✅ **Night rendering** - Night overlay with directional groomer headlights
- ✅ **Winch mechanics** - Anchor proximity detection, cable slack/tension physics
- ✅ **Settings scene** - Scrollable layout with gamepad name display
- ✅ **Dynamic key placeholders** - {keys}, {groomKey}, {winchKey} in tutorials/HUD
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

- Pause menu settings access (blocked by render bug)
- Gamepad rebinding (feature not implemented)
- Full localization coverage verification
