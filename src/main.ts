/**
 * Les Aiguilles Blanches - Main Entry Point
 * Phaser 3 game initialization with Vite
 */

import Phaser from 'phaser';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Setup globals first (side-effect import)
import './setup';

// Scene transition registry (must be before scene imports to avoid circular deps)
import { registerGameScenes } from './utils/sceneTransitions';
import { attachCanvasTouchDetect } from './utils/touchDetect';

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

// Register game scenes for centralized cleanup (single source of truth)
registerGameScenes([
  { key: 'GameScene', ctor: GameScene },
  { key: 'HUDScene', ctor: HUDScene },
  { key: 'DialogueScene', ctor: DialogueScene },
  { key: 'PauseScene', ctor: PauseScene },
]);

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
    touch: true, // Force-enable — Phaser's auto-detect fails on Firefox desktop touchscreens
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

  // Attach canvas touch detection for Firefox desktop touchscreens
  if (window.game.canvas) {
    attachCanvasTouchDetect(window.game.canvas);
  }

  // Phaser Scale.RESIZE mode handles most window resize events, but Firefox
  // dev tools responsive mode and some mobile orientation changes can be missed.
  // Use ResizeObserver on the container as the most reliable resize detection.
  const resizeGame = () => {
    if (window.game && window.game.scale) {
      const container = document.getElementById('game-container');
      const w = container?.clientWidth || window.innerWidth;
      const h = container?.clientHeight || window.innerHeight;
      // Only resize if dimensions actually changed
      if (w !== window.game.scale.width || h !== window.game.scale.height) {
        window.game.scale.resize(w, h);
      }
    }
  };
  // ResizeObserver catches all container size changes (orientation, dev tools, address bar).
  // Debounce to avoid interfering with scene transitions.
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeGame, 150);
  };
  const container = document.getElementById('game-container');
  if (container && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(debouncedResize).observe(container);
  }
  // Fallback for browsers without ResizeObserver
  window.addEventListener('resize', debouncedResize);
  window.addEventListener('orientationchange', () => {
    // Orientation change fires before dimensions update; defer measurement
    setTimeout(resizeGame, 200);
    setTimeout(resizeGame, 500);
  });

  // Expose for test automation (Playwright viewport changes)
  (window as unknown as { resizeGame: () => void }).resizeGame = resizeGame;
});

export { config };
