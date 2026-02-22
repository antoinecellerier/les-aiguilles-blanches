# Roadmap & Work Queue

This document tracks planned work, bugs, and future feature ideas.

For technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md). For design proposals, see [GAME_DESIGN.md](./GAME_DESIGN.md).

## Backlog

### Features

- [ ] **Leaderboards**
- [ ] **Publish to game stores** — Electron desktop wrapper exists (`./build-desktop.sh`); store distribution (Steam, itch.io) TBD

### Known Issues

- **PipeWire/PulseAudio stream shows "Chromium"** — Electron/Chromium hardcodes the PulseAudio `application.name` in `pulse_util.cc`. No workaround exists. Tracking [electron/electron#49270](https://github.com/electron/electron/pull/49270).

### Test Coverage Gaps

- Nintendo B-button back navigation flaky under parallel test execution
- Y-depth sorting and collision hitbox changes lack dedicated E2E regression tests
- Unit tests for extracted systems: LevelGeometry, WinchSystem, ObstacleBuilder have no vitest unit tests (E2E-only coverage)
- HUDScene event listener leak (ski mode): no regression test verifying listeners don't accumulate across level transitions
- Text truncation at 360px mobile portrait: no E2E test for MenuScene/CreditsScene title overflow
- Settings overlay depth: no test verifying settings panel renders above menu after depth changes
- Keybinding reload on resume: no test for rebinding keys in settings then resuming gameplay

### Deferred Refactors

- Wildlife behavior duplication between MenuScene and WildlifeSystem (bird soaring, track aging, same-species repulsion). Same patterns, different coordinate systems (side-view vs top-down) — extraction non-trivial.
- Static Graphics to textures: ~26 pole/marker Graphics remaining (11-20 commands each, diminishing returns).
