/**
 * Les Aiguilles Blanches - Main Entry Point
 * Phaser 3 game initialization with Vite
 */

import Phaser from 'phaser';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Setup globals first (side-effect import)
import './setup';
import { STORAGE_KEYS } from './config/storageKeys';
import { getString } from './utils/storage';
import { isDesktopApp } from './types/electron';

// Scene transition registry (must be before scene imports to avoid circular deps)
import { registerGameScenes } from './utils/sceneTransitions';
import { attachCanvasTouchDetect } from './utils/touchDetect';
import { AudioSystem } from './systems/AudioSystem';
import { installRenderThrottle } from './utils/renderThrottle';

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
import SkiRunScene from './scenes/SkiRunScene';
import LevelSelectScene from './scenes/LevelSelectScene';
import ContractsScene from './scenes/ContractsScene';

// Register game scenes for centralized cleanup (single source of truth)
registerGameScenes([
  { key: 'MenuScene', ctor: MenuScene },
  { key: 'SettingsScene', ctor: SettingsScene },
  { key: 'GameScene', ctor: GameScene },
  { key: 'HUDScene', ctor: HUDScene },
  { key: 'DialogueScene', ctor: DialogueScene },
  { key: 'PauseScene', ctor: PauseScene },
  { key: 'LevelCompleteScene', ctor: LevelCompleteScene },
  { key: 'SkiRunScene', ctor: SkiRunScene },
  { key: 'LevelSelectScene', ctor: LevelSelectScene },
  { key: 'ContractsScene', ctor: ContractsScene },
  { key: 'CreditsScene', ctor: CreditsScene },
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
    SkiRunScene,
    LevelSelectScene,
    ContractsScene,
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

  // Install adaptive render throttle (60 Hz physics, 30 Hz render when FPS < 45)
  installRenderThrottle(window.game);

  // Initialize audio system
  AudioSystem.getInstance().init(window.game);

  // Sync background audio setting with Electron (default: on)
  if (isDesktopApp()) {
    const bgAudioOn = getString(STORAGE_KEYS.BACKGROUND_AUDIO) !== 'false';
    AudioSystem.getInstance().setBackgroundAudio(bgAudioOn);
    if (!bgAudioOn) {
      window.electronAPI!.setBackgroundAudio(false);
    }
  }

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

  // Global F key shortcut for fullscreen toggle (works in all browsers including Firefox with gamepad)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      // During gameplay, only toggle if F isn't bound to a game control
      if (window.game?.scene?.isActive('GameScene')) {
        try {
          const saved = getString(STORAGE_KEYS.BINDINGS);
          const codes = saved ? Object.values(JSON.parse(saved)) as number[] : [];
          if (codes.includes(e.keyCode)) return;
        } catch { /* use default bindings — F is not bound */ }
      }
      if (isDesktopApp()) {
        window.electronAPI!.toggleFullscreen();
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.fullscreenEnabled) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  });
});

export { config };
