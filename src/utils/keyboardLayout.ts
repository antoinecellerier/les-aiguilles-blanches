/**
 * Keyboard layout detection and key binding utilities
 */

import { loadGamepadBindings, getButtonName, getConnectedControllerType } from './gamepad';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString, setString, getJSON, setJSON } from './storage';
import { t } from '../config/localization';

export type KeyboardLayout = 'qwerty' | 'azerty' | 'qwertz';

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
export async function detectKeyboardLayout(force = false): Promise<KeyboardLayout> {
  // Check if already detected and stored
  if (!force) {
    const stored = getString(STORAGE_KEYS.KEYBOARD_LAYOUT);
    if (stored && isValidLayout(stored)) {
      return stored as KeyboardLayout;
    }
  }

  // Try Keyboard Layout Map API (Chrome/Edge, requires secure context)
  if (navigator.keyboard) {
    try {
      const layoutMap = await navigator.keyboard.getLayoutMap();
      
      // Read characters at physical WASD positions
      const qKey = layoutMap.get('KeyQ');
      const wKey = layoutMap.get('KeyW');
      const aKey = layoutMap.get('KeyA');
      const sKey = layoutMap.get('KeyS');
      const dKey = layoutMap.get('KeyD');
      
      // Classify into named layout for the layout selector UI
      let detected: KeyboardLayout = 'qwerty';
      if (qKey === 'a' || qKey === 'A') {
        detected = 'azerty';
      } else if (wKey === 'z' || wKey === 'Z') {
        detected = 'qwertz';
      }
      
      // Store the actual keyCodes for the physical WASD positions
      // so any layout (Dvorak, Colemak, etc.) gets correct movement keys
      if (wKey && aKey && sKey && dKey) {
        const up = wKey.toUpperCase().charCodeAt(0);
        const left = aKey.toUpperCase().charCodeAt(0);
        const down = sKey.toUpperCase().charCodeAt(0);
        const right = dKey.toUpperCase().charCodeAt(0);
        setJSON(STORAGE_KEYS.DETECTED_MOVEMENT_KEYS, { up, down, left, right });
      }
      
      setString(STORAGE_KEYS.KEYBOARD_LAYOUT, detected);
      setString(STORAGE_KEYS.LAYOUT_DETECTED, 'true');
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
  const stored = getString(STORAGE_KEYS.KEYBOARD_LAYOUT);
  if (stored && isValidLayout(stored)) {
    return stored as KeyboardLayout;
  }
  return 'qwerty';
}

/**
 * Set the keyboard layout manually
 */
export function setKeyboardLayout(layout: KeyboardLayout): void {
  setString(STORAGE_KEYS.KEYBOARD_LAYOUT, layout);
}

/**
 * Check if layout has been auto-detected
 */
export function isLayoutDetected(): boolean {
  return getString(STORAGE_KEYS.LAYOUT_DETECTED) === 'true';
}

/**
 * Check if a string is a valid layout
 */
function isValidLayout(layout: string): boolean {
  return ['qwerty', 'azerty', 'qwertz'].includes(layout);
}

/**
 * Get default key bindings for the current layout.
 * Prefers API-detected keyCodes (works for any layout), falls back to named layout.
 */
export function getLayoutDefaults(): { up: number; down: number; left: number; right: number; groom: number; winch: number } {
  const detected = getJSON<{ up: number; down: number; left: number; right: number }>(STORAGE_KEYS.DETECTED_MOVEMENT_KEYS, null as any);
  const keys = detected ?? LAYOUT_DEFAULTS[getKeyboardLayout()];
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
  const names = getJSON<Record<string, string>>(STORAGE_KEYS.DISPLAY_NAMES, {});
  const bindings = getJSON<Record<string, number>>(STORAGE_KEYS.BINDINGS, {});

  if (names[bindings.up] && names[bindings.down] && names[bindings.left] && names[bindings.right]) {
    return {
      up: names[bindings.up],
      down: names[bindings.down],
      left: names[bindings.left],
      right: names[bindings.right],
    };
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

/** Look up a single key's display name from saved bindings. */
function getSavedKeyName(bindingKey: string, fallbackKey: string): string {
  const names = getJSON<Record<string, string>>(STORAGE_KEYS.DISPLAY_NAMES, {});
  const bindings = getJSON<Record<string, number>>(STORAGE_KEYS.BINDINGS, {});
  const code = bindings[bindingKey];
  if (code != null && names[code]) return names[code].toUpperCase();
  // Special keys: resolve via locale (e.g. 'key_space' → 'ESPACE')
  const localeKeys: Record<number, string> = {
    32: 'key_space', 16: 'key_shift', 17: 'key_ctrl', 18: 'key_alt',
    13: 'key_enter', 9: 'key_tab', 27: 'key_esc', 46: 'key_del',
  };
  if (code != null && localeKeys[code]) return t(localeKeys[code]);
  return fallbackKey;
}

/**
 * Get the display name for the groom key (default: SPACE)
 */
export function getGroomKeyName(): string {
  const keyName = getSavedKeyName('groom', t('key_space'));
  const gamepads = navigator.getGamepads?.() || [];
  const hasGamepad = Array.from(gamepads).some(gp => gp !== null);
  if (!hasGamepad) return keyName;
  const gpBtn = getButtonName(loadGamepadBindings().groom, getConnectedControllerType());
  return keyName + ' / ' + gpBtn;
}

/**
 * Get the display name for the winch key (default: SHIFT)
 */
export function getWinchKeyName(): string {
  const keyName = getSavedKeyName('winch', t('key_shift'));
  const gamepads = navigator.getGamepads?.() || [];
  const hasGamepad = Array.from(gamepads).some(gp => gp !== null);
  if (!hasGamepad) return keyName;
  const gpBtn = getButtonName(loadGamepadBindings().winch, getConnectedControllerType());
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
