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
import HUDScene from './scenes/HUDScene';
import MenuScene from './scenes/MenuScene';
import SettingsScene from './scenes/SettingsScene';
import GameScene from './scenes/GameScene';

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#1a2a3e',
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3, // Enable multitouch (D-pad + action buttons)
    gamepad: true, // Enable gamepad support
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

  // Handle fullscreen changes - resize game to match new screen size
  document.addEventListener('fullscreenchange', () => {
    setTimeout(() => {
      if (window.game && window.game.scale) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        window.game.scale.resize(width, height);
      }
    }, 100); // Small delay to let browser settle
  });

  // Handle window resize (including viewport changes in tests)
  const handleResize = () => {
    if (window.game && window.game.scale) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      window.game.scale.resize(width, height);
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  // Handle orientation changes on mobile
  window.addEventListener('orientationchange', () => {
    // Delay to let browser complete orientation change
    setTimeout(handleResize, 100);
  });
  
  // Also expose resize function for testing
  (window as unknown as { resizeGame: () => void }).resizeGame = handleResize;
});

export { config };
