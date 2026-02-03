/**
 * Les Aiguilles Blanches - Main Entry Point
 * Phaser 3 game initialization with Vite
 */

import Phaser from 'phaser';

// Setup globals first (side-effect import)
import './setup';

// TypeScript scenes
import BootScene from './scenes/BootScene';
import DialogueScene from './scenes/DialogueScene';
import PauseScene from './scenes/PauseScene';
import CreditsScene from './scenes/CreditsScene';
import LevelCompleteScene from './scenes/LevelCompleteScene';

// JavaScript scenes (during migration)
// @ts-ignore
import MenuScene from './scenes/MenuScene.js';
// @ts-ignore
import SettingsScene from './scenes/SettingsScene.js';
// @ts-ignore
import GameScene from './scenes/GameScene.js';
// @ts-ignore
import HUDScene from './scenes/HUDScene.js';

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  width: 1024,
  height: 768,
  backgroundColor: '#1a2a3e',
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
});

export { config };
