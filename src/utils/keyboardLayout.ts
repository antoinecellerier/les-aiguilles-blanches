/**
 * Keyboard layout detection and key binding utilities
 */

import { loadGamepadBindings, getButtonName, getConnectedControllerType } from './gamepad';
import { STORAGE_KEYS } from '../config/storageKeys';

export type KeyboardLayout = 'qwerty' | 'azerty' | 'qwertz';

function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* Private browsing or quota exceeded */ }
}

// Movement key defaults per layout
const LAYOUT_DEFAULTS: Record<KeyboardLayout, { up: number; down: number; left: number; right: number }> = {
  qwerty: { up: 87, down: 83, left: 65, right: 68 },  // W, S, A, D
  azerty: { up: 90, down: 83, left: 81, right: 68 },  // Z, S, Q, D
  qwertz: { up: 87, down: 83, left: 65, right: 68 },  // W, S, A, D (same physical positions)
};

// Display names for movement keys per layout
const LAYOUT_NAMES: Record<KeyboardLayout, { up: string; down: string; left: string; right: string }> = {
  qwerty: { up: 'W', down: 'S', left: 'A', right: 'D' },
  azerty: { up: 'Z', down: 'S', left: 'Q', right: 'D' },
  qwertz: { up: 'W', down: 'S', left: 'A', right: 'D' },
};

/**
 * Detect keyboard layout using the Keyboard API or key event analysis
 */
export async function detectKeyboardLayout(): Promise<KeyboardLayout> {
  // Check if already detected and stored
  const stored = localStorage.getItem(STORAGE_KEYS.KEYBOARD_LAYOUT);
  if (stored && isValidLayout(stored)) {
    return stored as KeyboardLayout;
  }

  // Try Keyboard Layout Map API (Chrome/Edge, requires secure context)
  if ('keyboard' in navigator && 'getLayoutMap' in (navigator as any).keyboard) {
    try {
      const keyboard = (navigator as any).keyboard;
      const layoutMap = await keyboard.getLayoutMap();
      
      // Check what character is on the physical 'KeyQ' position
      const qKey = layoutMap.get('KeyQ');
      const wKey = layoutMap.get('KeyW');
      
      let detected: KeyboardLayout = 'qwerty';
      
      if (qKey === 'a' || qKey === 'A') {
        // AZERTY: Q position has A
        detected = 'azerty';
      } else if (wKey === 'z' || wKey === 'Z') {
        // QWERTZ: W position has Z  
        detected = 'qwertz';
      }
      
      safeSetItem(STORAGE_KEYS.KEYBOARD_LAYOUT, detected);
      safeSetItem(STORAGE_KEYS.LAYOUT_DETECTED, 'true');
      return detected;
    } catch (e) {
      console.warn('Keyboard Layout API unavailable:', e);
    }
  }

  // Fallback: use default and let user change in settings
  return 'qwerty';
}



/**
 * Get the stored keyboard layout synchronously (for use in game loop)
 * Returns cached value or default
 */
export function getKeyboardLayout(): KeyboardLayout {
  const stored = localStorage.getItem(STORAGE_KEYS.KEYBOARD_LAYOUT);
  if (stored && isValidLayout(stored)) {
    return stored as KeyboardLayout;
  }
  return 'qwerty';
}

/**
 * Set the keyboard layout manually
 */
export function setKeyboardLayout(layout: KeyboardLayout): void {
  safeSetItem(STORAGE_KEYS.KEYBOARD_LAYOUT, layout);
}

/**
 * Check if layout has been auto-detected
 */
export function isLayoutDetected(): boolean {
  return localStorage.getItem(STORAGE_KEYS.LAYOUT_DETECTED) === 'true';
}

/**
 * Check if a string is a valid layout
 */
function isValidLayout(layout: string): boolean {
  return ['qwerty', 'azerty', 'qwertz'].includes(layout);
}

/**
 * Get default key bindings for the current layout
 */
export function getLayoutDefaults(): { up: number; down: number; left: number; right: number; groom: number; winch: number } {
  const layout = getKeyboardLayout();
  const keys = LAYOUT_DEFAULTS[layout];
  return {
    ...keys,
    groom: 32,   // Space
    winch: 16,   // Shift
  };
}

/**
 * Get display names for movement keys based on saved bindings or layout
 */
export function getMovementKeyNames(): { up: string; down: string; left: string; right: string } {
  // First try to get from saved display names
  const savedNames = localStorage.getItem(STORAGE_KEYS.DISPLAY_NAMES);
  const savedBindings = localStorage.getItem(STORAGE_KEYS.BINDINGS);
  
  if (savedNames && savedBindings) {
    try {
      const names = JSON.parse(savedNames);
      const bindings = JSON.parse(savedBindings);
      
      // Check if we have display names for all movement keys
      if (names[bindings.up] && names[bindings.down] && names[bindings.left] && names[bindings.right]) {
        return {
          up: names[bindings.up],
          down: names[bindings.down],
          left: names[bindings.left],
          right: names[bindings.right],
        };
      }
    } catch {
      // Fall through to layout defaults
    }
  }
  
  // Fall back to layout defaults
  const layout = getKeyboardLayout();
  return LAYOUT_NAMES[layout];
}

/**
 * Get a formatted string showing movement keys (e.g., "ZQSD" or "WASD")
 */
export function getMovementKeysString(): string {
  const names = getMovementKeyNames();
  // Order: up, left, down, right -> standard format like WASD or ZQSD
  return `${names.up}${names.left}${names.down}${names.right}`.toUpperCase();
}

/**
 * Get the display name for the groom key (default: SPACE)
 */
export function getGroomKeyName(): string {
  const savedNames = localStorage.getItem(STORAGE_KEYS.DISPLAY_NAMES);
  const savedBindings = localStorage.getItem(STORAGE_KEYS.BINDINGS);
  
  let keyName = 'SPACE';
  if (savedNames && savedBindings) {
    try {
      const names = JSON.parse(savedNames);
      const bindings = JSON.parse(savedBindings);
      if (names[bindings.groom]) {
        keyName = names[bindings.groom].toUpperCase();
      }
    } catch {
      // Fall through to default
    }
  }

  const gpBindings = loadGamepadBindings();
  const gpBtn = getButtonName(gpBindings.groom, getConnectedControllerType());
  return keyName + ' / ' + gpBtn;
}

/**
 * Get the display name for the winch key (default: SHIFT)
 */
export function getWinchKeyName(): string {
  const savedNames = localStorage.getItem(STORAGE_KEYS.DISPLAY_NAMES);
  const savedBindings = localStorage.getItem(STORAGE_KEYS.BINDINGS);
  
  let keyName = 'SHIFT';
  if (savedNames && savedBindings) {
    try {
      const names = JSON.parse(savedNames);
      const bindings = JSON.parse(savedBindings);
      if (names[bindings.winch]) {
        keyName = names[bindings.winch].toUpperCase();
      }
    } catch {
      // Fall through to default
    }
  }

  const gpBindings = loadGamepadBindings();
  const gpBtn = getButtonName(gpBindings.winch, getConnectedControllerType());
  return keyName + ' / ' + gpBtn;
}

/**
 * Available layouts for the settings UI
 */
export const AVAILABLE_LAYOUTS: { id: KeyboardLayout; name: string }[] = [
  { id: 'qwerty', name: 'QWERTY (US/UK)' },
  { id: 'azerty', name: 'AZERTY (FR/BE)' },
  { id: 'qwertz', name: 'QWERTZ (DE/CH)' },
];
