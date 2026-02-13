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
  MOVEMENT_SENSITIVITY: 'snowGroomer_movementSensitivity',
  MASTER_VOLUME: 'snowGroomer_masterVolume',
  MUSIC_VOLUME: 'snowGroomer_musicVolume',
  SFX_VOLUME: 'snowGroomer_sfxVolume',
  ENGINE_VOLUME: 'snowGroomer_engineVolume',
  VOICE_VOLUME: 'snowGroomer_voiceVolume',
  AMBIENCE_VOLUME: 'snowGroomer_ambienceVolume',
  AUDIO_MUTED: 'snowGroomer_audioMuted',
  TUTORIAL_DONE: 'snowGroomer_tutorialDone',
  SKI_MODE: 'snowGroomer_skiMode',
  SHOW_FPS: 'snowGroomer_showFps',
} as const;

/** Increment when key binding schema changes to invalidate saved bindings. */
export const BINDINGS_VERSION = 2;
