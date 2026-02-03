# Les Aiguilles Blanches - Snow Groomer Simulation

## Quick Start

**Recommended - Phaser 3 Version:**
- Open `index-phaser.html` in any browser
- Works in Firefox, Chrome, Safari, Edge

**Legacy Versions (Vanilla JS):**
- `index-modular.html` - Modular vanilla JS version
- `index-standalone.html` - Single-file version (backup)

Test URL: http://localhost/~antoine/snow-groomer/index-phaser.html

---

A retro-style (SkiFree aesthetic) snow groomer simulation game set in a fictional Savoie ski resort.

## 🎮 Play the Game

**Recommended**: Open `index-phaser.html` in a modern web browser.

For local development:
```bash
# Already served via nginx user dirs
open http://localhost/~antoine/snow-groomer/index-phaser.html

# Or with Python
python3 -m http.server 8080
open http://localhost:8080/index-phaser.html
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
├── index-phaser.html   # Main game (Phaser 3, recommended)
├── index-modular.html  # Legacy modular vanilla JS version
├── index-standalone.html # Single-file version (backup)
├── tests.html          # Automated test suite
├── README.md           # This file
├── css/
│   └── style.css       # Styles for vanilla JS version
├── js/                 # Legacy vanilla JS modules
│   ├── config.js       # Game configuration, levels, food items
│   ├── localization.js # Translations (FR, EN, DE, IT, ES)
│   ├── input.js        # Input abstraction (keyboard, gamepad, touch)
│   ├── renderer.js     # Canvas rendering
│   ├── game.js         # Core game logic
│   └── main.js         # Entry point
├── src/                # Phaser 3 version
│   ├── config/         # Game config, levels, localization
│   ├── scenes/         # Phaser scenes (Boot, Menu, Game, etc.)
│   ├── utils/          # Accessibility utilities
│   └── main.js         # Phaser entry point
└── docs/
    ├── ARCHITECTURE.md # Technical architecture
    └── GAMEPLAY.md     # Detailed gameplay guide
```

## 🚀 Quick Start

1. Open `index-phaser.html` in a modern browser
2. Click "Commencer" (Start Game)
3. Use WASD/Arrows to move, Space to groom
4. Reach the coverage target before time runs out!

## 🧪 Testing

Open `tests.html` in a browser to run the automated test suite. Tests cover:

- Localization system
- Level configuration
- Game state management
- DOM structure
- Accessibility features
- CSS styling

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
