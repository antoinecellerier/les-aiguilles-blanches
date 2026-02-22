# Roadmap & Work Queue

This document tracks planned work, bugs, and future feature ideas.

For technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md). For design proposals, see [GAME_DESIGN.md](./GAME_DESIGN.md).

## Backlog

### Features

- [ ] **Leaderboards**
- [ ] **Publish to game stores** — Electron desktop wrapper exists (`./build-desktop.sh`); store distribution (Steam, itch.io) TBD

### Known Issues

- **PipeWire/PulseAudio stream shows "Chromium"** — Electron/Chromium hardcodes the PulseAudio `application.name` in `pulse_util.cc`. No workaround exists. Tracking [electron/electron#49270](https://github.com/electron/electron/pull/49270).
