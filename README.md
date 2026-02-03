# Les Aiguilles Blanches - Snow Groomer Simulation

## Quick Start

Open `index.html` in any modern browser (Firefox, Chrome, Safari, Edge).

Test URL: http://localhost/~antoine/snow-groomer/index.html

---

A retro-style (SkiFree aesthetic) snow groomer simulation game set in a fictional Savoie ski resort.

## 🎮 Play the Game

Open `index.html` in a modern web browser.

For local development:
```bash
# Already served via nginx user dirs
open http://localhost/~antoine/snow-groomer/index.html

# Or with Python
python3 -m http.server 8080
open http://localhost:8080/index.html
```

## 🏔️ About

You are a snow groomer operator at **Les Aiguilles Blanches**, a ski resort in the French Alps (Savoie). Your job is to prepare the pistes before skiers arrive each morning, using a PistenBully-style grooming machine.

### Features

- **8 Progressive Levels + Tutorial**: From guided tutorial to black diamond night operations
- **Authentic Grooming Mechanics**: Tiller, blade, and winch systems
- **Savoyard Culture**: Local food (tartiflette, fondue, génépi) that affects gameplay
- **Full Accessibility**: High contrast, colorblind modes, screen reader support, rebindable controls
- **Multi-Platform Input**: Keyboard, mouse, gamepad, and touch controls
- **5 Languages**: French, English, German, Italian, Spanish

## 🎯 How to Play

### Controls

| Action | Keyboard | Gamepad | Touch |
|--------|----------|---------|-------|
| Move | WASD / Arrows | D-pad / Left Stick | Virtual Joystick |
| Groom | Space | A Button | GROOM Button |
| Winch | Shift | B Button | WINCH Button |
| Pause | Escape | Start | Menu Button |

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
├── index.html   # Main game (Phaser 3, recommended)
├── index.html          # Main game entry point
├── tests.html          # Browser-based unit tests
├── README.md           # This file
├── run-tests.sh        # E2E test runner
├── pytest.ini          # Pytest configuration
├── src/                # Game source (Phaser 3)
│   ├── config/         # Game config, levels, localization
│   ├── scenes/         # Phaser scenes (Boot, Menu, Game, etc.)
│   ├── utils/          # Accessibility utilities
│   └── main.js         # Entry point
├── tests/              # E2E tests (Playwright)
│   └── e2e/            # Navigation, rendering tests
└── docs/
    ├── ARCHITECTURE.md # Technical architecture
    └── GAMEPLAY.md     # Detailed gameplay guide
```

## 🚀 Quick Start

1. Open `index.html` in a modern browser
2. Click "Commencer" (Start Game)
3. Use WASD/Arrows to move, Space to groom
4. Reach the coverage target before time runs out!

## 🧪 Testing

### Unit Tests (Browser)
Open `tests.html` in a browser to run the unit test suite covering localization, level config, etc.

### E2E Tests (Playwright)
Automated browser tests using Playwright (Chromium + Firefox):

```bash
# Setup (first time only)
python3 -m venv .venv
source .venv/bin/activate
pip install playwright pytest-playwright pytest-xdist
python -m playwright install chromium firefox

# Run tests
./run-tests.sh                    # Parallel, headless (both browsers)
./run-tests.sh --headed           # Sequential, visible browser
./run-tests.sh --browser chromium # Single browser only
./run-tests.sh -k "credits"       # Run specific tests
```

E2E tests cover: menu navigation, all 9 levels, tutorial flow, grooming, pause, credits, and restart cycle.

## 🌐 Localization

The game supports 5 languages:
- 🇫🇷 French (primary)
- 🇬🇧 English
- 🇩🇪 German
- 🇮🇹 Italian
- 🇪🇸 Spanish

Translations are in `js/localization.js`. To add a new language, add a new key to the `TRANSLATIONS` object.

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
