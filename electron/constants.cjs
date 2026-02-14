/**
 * Shared constants for Electron main process.
 * Centralizes IPC channels, display modes, and configuration values.
 */

// IPC Channel Names
const IPC_CHANNELS = {
  QUIT: 'quit',
  TOGGLE_FULLSCREEN: 'toggle-fullscreen',
  IS_FULLSCREEN: 'is-fullscreen',
  SET_DISPLAY_MODE: 'set-display-mode',
};

// Display Modes
const DISPLAY_MODES = {
  WINDOWED: 'windowed',
  FULLSCREEN: 'fullscreen',
  BORDERLESS: 'borderless',
};

const VALID_DISPLAY_MODES = [
  DISPLAY_MODES.WINDOWED,
  DISPLAY_MODES.FULLSCREEN,
  DISPLAY_MODES.BORDERLESS,
];

const DEFAULT_DISPLAY_MODE = DISPLAY_MODES.BORDERLESS;

// Window Configuration
const WINDOW_CONFIG = {
  TITLE: 'Les Aiguilles Blanches',
  BG_COLOR: '#1a2a3e',
  DEFAULT_WIDTH: 1280,
  DEFAULT_HEIGHT: 720,
  MIN_WIDTH: 800,
  MIN_HEIGHT: 500,
};

// File Paths
const CONFIG_FILENAME = 'display.json';

// Timing
const F11_DEBOUNCE_MS = 300;

module.exports = {
  IPC_CHANNELS,
  DISPLAY_MODES,
  VALID_DISPLAY_MODES,
  DEFAULT_DISPLAY_MODE,
  WINDOW_CONFIG,
  CONFIG_FILENAME,
  F11_DEBOUNCE_MS,
};
