# Roadmap & Work Queue

This document tracks planned work, bugs, and future feature ideas.

For technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md). For design proposals, see [GAME_DESIGN.md](./GAME_DESIGN.md).

## Backlog

### Features

- [ ] **Leaderboards**
- [ ] **Publish to Steam** — Tauri desktop build exists (`./build-tauri.sh`). Requires: Steamworks partner account ($100), Steamworks SDK integration (achievements, overlay, cloud saves optional), store page (screenshots, description, capsule art), build upload via SteamPipe, content review
- [ ] **Publish to Google Play** — PWA exists with offline support. Requires: Google Play developer account ($25), TWA wrapper via Bubblewrap (~2 MB APK), Digital Asset Links on `cellerier.net/.well-known/assetlinks.json`, store listing + content rating, app signing. Updates are automatic — new web builds are picked up by the TWA without re-submission

### Known Issues

- **PipeWire/PulseAudio stream shows "Chromium"** — Electron/Chromium hardcodes the PulseAudio `application.name` in `pulse_util.cc`. No workaround exists. Tracking [electron/electron#49270](https://github.com/electron/electron/pull/49270).
