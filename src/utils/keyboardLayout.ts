/**
 * Keyboard layout detection and key binding utilities
 */

export type KeyboardLayout = 'qwerty' | 'azerty' | 'qwertz';

const LAYOUT_KEY = 'snowGroomer_keyboardLayout';
const LAYOUT_DETECTED_KEY = 'snowGroomer_layoutDetected';

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
  const stored = localStorage.getItem(LAYOUT_KEY);
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
      
      localStorage.setItem(LAYOUT_KEY, detected);
      localStorage.setItem(LAYOUT_DETECTED_KEY, 'true');
      return detected;
    } catch (e) {
      // API not available or failed, continue to fallback
    }
  }

  // Fallback: use default and let user change in settings
  return 'qwerty';
}

/**
 * Detect layout from a keyboard event (call on first key press)
 * Returns the detected layout if detection was successful
 */
export function detectLayoutFromEvent(event: KeyboardEvent): KeyboardLayout | null {
  // Only detect from movement-related keys
  const code = event.code;
  const key = event.key.toLowerCase();
  
  // If user presses physical Q position (KeyQ) and it produces 'a', it's AZERTY
  if (code === 'KeyQ' && key === 'a') {
    setKeyboardLayout('azerty');
    localStorage.setItem(LAYOUT_DETECTED_KEY, 'true');
    return 'azerty';
  }
  
  // If user presses physical W position (KeyW) and it produces 'z', it's QWERTZ
  if (code === 'KeyW' && key === 'z') {
    setKeyboardLayout('qwertz');
    localStorage.setItem(LAYOUT_DETECTED_KEY, 'true');
    return 'qwertz';
  }
  
  // If user presses physical Q and it produces 'q', it's QWERTY
  if (code === 'KeyQ' && key === 'q') {
    setKeyboardLayout('qwerty');
    localStorage.setItem(LAYOUT_DETECTED_KEY, 'true');
    return 'qwerty';
  }
  
  // If user presses physical A and it produces 'q', it's AZERTY
  if (code === 'KeyA' && key === 'q') {
    setKeyboardLayout('azerty');
    localStorage.setItem(LAYOUT_DETECTED_KEY, 'true');
    return 'azerty';
  }
  
  return null; // Could not detect from this event
}

/**
 * Get the stored keyboard layout synchronously (for use in game loop)
 * Returns cached value or default
 */
export function getKeyboardLayout(): KeyboardLayout {
  const stored = localStorage.getItem(LAYOUT_KEY);
  if (stored && isValidLayout(stored)) {
    return stored as KeyboardLayout;
  }
  return 'qwerty';
}

/**
 * Set the keyboard layout manually
 */
export function setKeyboardLayout(layout: KeyboardLayout): void {
  localStorage.setItem(LAYOUT_KEY, layout);
}

/**
 * Check if layout has been auto-detected
 */
export function isLayoutDetected(): boolean {
  return localStorage.getItem(LAYOUT_DETECTED_KEY) === 'true';
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
  const savedNames = localStorage.getItem('snowGroomer_displayNames');
  const savedBindings = localStorage.getItem('snowGroomer_bindings');
  
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
  const savedNames = localStorage.getItem('snowGroomer_displayNames');
  const savedBindings = localStorage.getItem('snowGroomer_bindings');
  
  if (savedNames && savedBindings) {
    try {
      const names = JSON.parse(savedNames);
      const bindings = JSON.parse(savedBindings);
      if (names[bindings.groom]) {
        return names[bindings.groom].toUpperCase();
      }
    } catch {
      // Fall through to default
    }
  }
  return 'SPACE';
}

/**
 * Get the display name for the winch key (default: SHIFT)
 */
export function getWinchKeyName(): string {
  const savedNames = localStorage.getItem('snowGroomer_displayNames');
  const savedBindings = localStorage.getItem('snowGroomer_bindings');
  
  if (savedNames && savedBindings) {
    try {
      const names = JSON.parse(savedNames);
      const bindings = JSON.parse(savedBindings);
      if (names[bindings.winch]) {
        return names[bindings.winch].toUpperCase();
      }
    } catch {
      // Fall through to default
    }
  }
  return 'SHIFT';
}

/**
 * Available layouts for the settings UI
 */
export const AVAILABLE_LAYOUTS: { id: KeyboardLayout; name: string }[] = [
  { id: 'qwerty', name: 'QWERTY (US/UK)' },
  { id: 'azerty', name: 'AZERTY (FR/BE)' },
  { id: 'qwertz', name: 'QWERTZ (DE/CH)' },
];
