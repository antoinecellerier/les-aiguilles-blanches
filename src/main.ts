/**
 * Les Aiguilles Blanches - Main Entry Point
 * Phaser 3 game initialization with Vite
 */

import Phaser from 'phaser';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Setup globals first (side-effect import)
import './setup';

// TypeScript scenes
import BootScene from './scenes/BootScene';
import DialogueScene from './scenes/DialogueScene';
import PauseScene from './scenes/PauseScene';
import CreditsScene from './scenes/CreditsScene';
import LevelCompleteScene from './scenes/LevelCompleteScene';
import HUDScene from './scenes/HUDScene';
import MenuScene from './scenes/MenuScene';
import SettingsScene from './scenes/SettingsScene';
import GameScene from './scenes/GameScene';

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

// Extend Phaser.Scene to include rexUI
declare module 'phaser' {
  interface Scene {
    rexUI: RexUIPlugin;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#1a2a3e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true, // Prevents sub-pixel rendering for crisp text
  },
  input: {
    activePointers: 3, // Enable multitouch (D-pad + action buttons)
    gamepad: true, // Enable gamepad support
  },
  plugins: {
    scene: [{
      key: 'rexUI',
      plugin: RexUIPlugin,
      mapping: 'rexUI'
    }]
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    SettingsScene,
    GameScene,
    HUDScene,
    DialogueScene,
    PauseScene,
    LevelCompleteScene,
    CreditsScene,
  ],
};

// Initialize game
window.addEventListener('load', () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }

  window.game = new Phaser.Game(config);

  // Phaser Scale.RESIZE mode handles window resize automatically.
  // We only expose resizeGame() for test automation (Playwright viewport changes
  // don't trigger real browser resize events).
  (window as unknown as { resizeGame: () => void }).resizeGame = () => {
    if (window.game && window.game.scale) {
      const container = document.getElementById('game-container');
      const w = container?.clientWidth || window.innerWidth;
      const h = container?.clientHeight || window.innerHeight;
      window.game.scale.resize(w, h);
    }
  };
});

export { config };
