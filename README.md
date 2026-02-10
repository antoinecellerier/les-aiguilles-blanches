# Les Aiguilles Blanches - Snow Groomer Simulation

## 🎮 Play Now

**[▶️ Play Online](https://cellerier.net/les-aiguilles-blanches/)** - No installation required!

## Quick Start (Local Development)

```bash
npm install
npm run dev    # Start dev server at http://localhost:3000
```

### Production Build
```bash
npm run build  # Build to dist/
./publish.sh   # Or use publish script
```

---

A retro-style (SkiFree aesthetic) snow groomer simulation game set in a fictional Savoie ski resort.

## 🏔️ About

You are a snow groomer operator at **Les Aiguilles Blanches**, a ski resort in the French Alps (Savoie). Your job is to prepare the pistes before skiers arrive each morning, using a PistenBully-style grooming machine.

### Features

- **11 Progressive Levels**: From guided tutorial through storm operations and night grooming
- **Authentic Grooming Mechanics**: Tiller, blade, and winch systems
- **Savoyard Culture**: Local food (tartiflette, fondue, génépi) that affects gameplay
- **Full Accessibility**: High contrast, colorblind modes, screen reader support, rebindable controls
- **Multi-Platform Input**: Keyboard, mouse, gamepad, and touch controls
- **Procedural Audio**: Chopin nocturne-style piano music, engine sounds, weather ambience, Celeste-style voice gibberish — all generated via Web Audio API
- **5 Languages**: French, English, German, Italian, Spanish

## 🎯 How to Play

### Controls

| Action | Keyboard | Gamepad | Touch (Mobile) |
|--------|----------|---------|----------------|
| Move | WASD / Arrows | D-pad / Left Stick | D-pad (◀▲▼▶) |
| Groom | Space | A (Xbox) / ✕ (PS) / A (Nintendo) | ❄️ Button |
| Winch | Shift | LB (Xbox) / L1 (PS) / L (Nintendo) | 🔗 Button |
| Pause | Escape | Start / Options / + | ☰ Button |

Touch controls appear automatically on mobile. Multitouch supported for simultaneous move + groom.

**Gamepad Support**: The game auto-detects Xbox, PlayStation, and Nintendo controllers, mapping buttons correctly for each. Tutorial and UI hints adapt to your controller type.

### Objectives

1. **Groom the piste** - Drive over ungroomed snow while holding the groom button
2. **Reach coverage target** - Each level requires a minimum coverage percentage
3. **Manage resources** - Watch your fuel and stamina
4. **Beat the clock** - Complete before time runs out

### Tips

- Visit **Chez Marie** 🏠 for food that restores stamina and grants buffs
- Refuel at the **fuel station** ⛽ when running low
- Use the **winch** on steep black pistes to prevent sliding
- Avoid obstacles: trees 🌲, rocks 🪨, and lift pylons

## 📁 Project Structure

```
snow-groomer/
├── index.html          # Entry point
├── vite.config.ts      # Vite bundler configuration
├── tsconfig.json       # TypeScript configuration
├── package.json        # npm dependencies and scripts
├── publish.sh          # Build script for deployment
├── run-tests.sh        # E2E test runner
├── pytest.ini          # Pytest configuration (parallel)
├── src/                # Game source (TypeScript)
│   ├── main.ts         # Phaser initialization
│   ├── setup.ts        # Global setup
│   ├── config/         # Config files
│   │   ├── gameConfig.ts   # Constants + BALANCE tuning
│   │   ├── levels.ts
│   │   ├── localization.ts
│   │   ├── storageKeys.ts
│   │   └── theme.ts
│   ├── systems/        # Extracted subsystems
│   │   ├── WeatherSystem.ts
│   │   └── HazardSystem.ts
│   ├── types/          # TypeScript declarations
│   │   ├── global.d.ts
│   │   └── GameSceneInterface.ts
│   ├── scenes/         # Phaser scenes
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── GameScene.ts
│   │   └── ...
│   └── utils/          # Utilities
│       ├── accessibility.ts
│       ├── characterPortraits.ts
│       ├── gamepad.ts
│       ├── gamepadMenu.ts
│       ├── gameProgress.ts
│       ├── keyboardLayout.ts
│       ├── menuButtonNav.ts
│       └── sceneTransitions.ts
├── tests/
│   ├── e2e/            # Playwright E2E tests
│   └── unit-js/        # Vitest unit tests
├── docs/
│   ├── ARCHITECTURE.md # Technical architecture
│   ├── GAMEPLAY.md     # Detailed gameplay guide
│   ├── ART_STYLE.md    # Visual style guide
│   ├── ROADMAP.md      # Work queue and backlog
│   └── TESTING.md      # Test helpers and debugging
└── .github/
    ├── copilot-instructions.md
    ├── agents/         # Custom Copilot agents
    └── skills/         # Auto-invoked Copilot skills
```

## 🚀 Quick Start

1. `npm install` (first time only)
2. `npm run dev` to start dev server
3. Open http://localhost:3000
4. Click "Commencer" (Start Game)
5. Use WASD/Arrows to move, Space to groom
6. Reach the coverage target before time runs out!

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm test
```

### E2E Tests (Playwright)
Automated browser tests using Playwright (Chromium + Firefox, parallel):

```bash
# Setup (first time only)
python3 -m venv .venv
source .venv/bin/activate
pip install playwright pytest-playwright pytest-xdist
python -m playwright install chromium firefox

# Run tests (requires Vite dev server running)
npm run dev &       # Start Vite in background
./run-tests.sh      # Parallel, headless (both browsers)
./run-tests.sh --headed           # Sequential, visible browser
./run-tests.sh --browser chromium # Single browser only
./run-tests.sh --smart            # Only tests affected by uncommitted changes
```

E2E tests cover: menu navigation, all 11 levels, tutorial flow, grooming, pause, credits, and restart cycle.

## 🌐 Localization

The game supports 5 languages:
- 🇫🇷 French (primary)
- 🇬🇧 English
- 🇩🇪 German
- 🇮🇹 Italian
- 🇪🇸 Spanish

Translations are in `src/config/localization.ts`. To add a new language, add a new key to the `TRANSLATIONS` object.

## ♿ Accessibility

- **Visual**: High contrast mode, 3 colorblind filters, scalable UI, reduced motion
- **Motor**: Fully rebindable controls, no simultaneous key requirements
- **Auditory**: Visual cues for all audio, subtitles for dialogue
- **Cognitive**: Clear objectives, progressive difficulty, pause anytime

## 📜 License

MIT License - Feel free to modify and share!

## 🧀 Credits

Inspired by the classic SkiFree game and the beautiful ski resorts of Savoie, France.

*Bonne glisse!* 🎿
