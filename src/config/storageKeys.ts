/**
 * Centralized localStorage key constants.
 * All keys used by the game for persistence are defined here
 * to prevent typos and make key usage discoverable.
 */
export const STORAGE_KEYS = {
  PROGRESS: 'snowGroomer_progress',
  LANG: 'snowGroomer_lang',
  ACCESSIBILITY: 'snowGroomer_accessibility',
  KEYBOARD_LAYOUT: 'snowGroomer_keyboardLayout',
  LAYOUT_DETECTED: 'snowGroomer_layoutDetected',
  BINDINGS: 'snowGroomer_bindings',
  BINDINGS_VERSION: 'snowGroomer_bindingsVersion',
  DISPLAY_NAMES: 'snowGroomer_displayNames',
  GAMEPAD_BINDINGS: 'snowGroomer_gamepadBindings',
} as const;
