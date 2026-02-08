/**
 * Gamepad utilities for controller detection and button mapping.
 * 
 * Standard gamepad button layout (indices):
 * 0 = South (Xbox A, Nintendo B, PlayStation Cross)
 * 1 = East (Xbox B, Nintendo A, PlayStation Circle)
 * 2 = West (Xbox X, Nintendo Y, PlayStation Square)
 * 3 = North (Xbox Y, Nintendo X, PlayStation Triangle)
 * 4 = L1/LB/L
 * 5 = R1/RB/R
 * 6 = L2/LT/ZL
 * 7 = R2/RT/ZR
 * 8 = Select/Back/Minus
 * 9 = Start/Menu/Plus
 * 10 = Left Stick Press
 * 11 = Right Stick Press
 * 12-15 = D-pad (Up, Down, Left, Right)
 * 16 = Home/Guide
 * 
 * Nintendo controllers have A/B in swapped positions vs Xbox:
 * - Xbox: A=south(0), B=east(1)
 * - Nintendo: B=south(0), A=east(1)
 * 
 * To ensure "A" always confirms on all controllers, we swap button mappings for Nintendo.
 */

import { STORAGE_KEYS } from '../config/storageKeys';
import { getJSON, setJSON } from './storage';

export type ControllerType = 'xbox' | 'nintendo' | 'playstation' | 'generic';

export interface ButtonMapping {
  confirm: number;      // Button index for confirm action
  back: number;         // Button index for back action
  confirmLabel: string; // Label to show for confirm
  backLabel: string;    // Label to show for back
}

export interface GamepadBindings {
  groom: number;   // Button index for groom action
  winch: number;   // Button index for winch action
  pause: number;   // Button index for pause
}



const BUTTON_NAMES_GENERIC: Record<number, string> = {
  0: 'Ⓐ', 1: 'Ⓑ', 2: 'Ⓧ', 3: 'Ⓨ',
  4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
  8: 'Select', 9: 'Start',
  10: 'L3', 11: 'R3',
};

const BUTTON_NAMES_NINTENDO: Record<number, string> = {
  0: 'Ⓑ', 1: 'Ⓐ', 2: 'Ⓨ', 3: 'Ⓧ',
  4: 'L', 5: 'R', 6: 'ZL', 7: 'ZR',
  8: '⊖', 9: '⊕',
  10: 'L3', 11: 'R3',
};

const BUTTON_NAMES_PLAYSTATION: Record<number, string> = {
  0: '✕', 1: '○', 2: '□', 3: '△',
  4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
  8: 'Share', 9: 'Options',
  10: 'L3', 11: 'R3',
};

const BUTTON_NAMES_XBOX: Record<number, string> = {
  0: 'Ⓐ', 1: 'Ⓑ', 2: 'Ⓧ', 3: 'Ⓨ',
  4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'View', 9: 'Menu',
  10: 'L3', 11: 'R3',
};

export function getDefaultGamepadBindings(): GamepadBindings {
  return { groom: 0, winch: 4, pause: 9 };
}

export function loadGamepadBindings(): GamepadBindings {
  const defaults = getDefaultGamepadBindings();
  const parsed = getJSON<Partial<GamepadBindings>>(STORAGE_KEYS.GAMEPAD_BINDINGS, {});
  return {
    groom: typeof parsed.groom === 'number' ? parsed.groom : defaults.groom,
    winch: typeof parsed.winch === 'number' ? parsed.winch : defaults.winch,
    pause: typeof parsed.pause === 'number' ? parsed.pause : defaults.pause,
  };
}

export function saveGamepadBindings(bindings: GamepadBindings): void {
  setJSON(STORAGE_KEYS.GAMEPAD_BINDINGS, bindings);
}

/** Get display name for a button index, adapted to the connected controller type. */
export function getButtonName(index: number, controllerType?: ControllerType): string {
  const names = controllerType === 'nintendo' ? BUTTON_NAMES_NINTENDO
    : controllerType === 'playstation' ? BUTTON_NAMES_PLAYSTATION
    : controllerType === 'xbox' ? BUTTON_NAMES_XBOX
    : BUTTON_NAMES_GENERIC;
  return names[index] || 'Btn ' + index;
}

/** Detect controller type from the first connected gamepad (if any). */
export function getConnectedControllerType(): ControllerType {
  const gamepads = navigator.getGamepads?.() || [];
  for (const gp of gamepads) {
    if (gp) return detectControllerType(gp.id);
  }
  return 'generic';
}

/**
 * Detect controller type from gamepad ID string.
 */
export function detectControllerType(gamepadId: string): ControllerType {
  const id = gamepadId.toLowerCase();
  
  // Nintendo controllers
  if (id.includes('nintendo') || id.includes('switch') || id.includes('joy-con') || id.includes('pro controller')) {
    return 'nintendo';
  }
  
  // PlayStation controllers
  if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense') || id.includes('sony')) {
    return 'playstation';
  }
  
  // Xbox controllers (including generic XInput)
  if (id.includes('xbox') || id.includes('xinput') || id.includes('microsoft')) {
    return 'xbox';
  }
  
  return 'generic';
}

/**
 * Get button mapping for a specific controller type.
 * Ensures physical "A" button always confirms.
 */
export function getButtonMapping(type: ControllerType): ButtonMapping {
  switch (type) {
    case 'nintendo':
      // Nintendo: A is at index 1 (east), B is at index 0 (south)
      // Swap so A=confirm, B=back
      return {
        confirm: 1,         // Physical A button on Nintendo
        back: 0,            // Physical B button on Nintendo
        confirmLabel: 'Ⓐ',
        backLabel: 'Ⓑ',
      };
    
    case 'playstation':
      // PlayStation: Cross(0)=confirm, Circle(1)=back (Western convention)
      return {
        confirm: 0,
        back: 1,
        confirmLabel: '✕',
        backLabel: '○',
      };
    
    case 'xbox':
    case 'generic':
    default:
      // Xbox/Generic: A(0)=confirm, B(1)=back
      return {
        confirm: 0,
        back: 1,
        confirmLabel: 'Ⓐ',
        backLabel: 'Ⓑ',
      };
  }
}

/**
 * Get button mapping from a Phaser gamepad object.
 */
export function getMappingFromGamepad(gamepad: Phaser.Input.Gamepad.Gamepad | null): ButtonMapping {
  if (!gamepad) {
    return getButtonMapping('generic');
  }
  const type = detectControllerType(gamepad.id);
  return getButtonMapping(type);
}

// Firefox reports Xbox LT/RT (indices 6,7) as axes instead of buttons.
// Map trigger button indices to the axis index used as fallback.
const TRIGGER_AXIS_FALLBACK: Record<number, number> = { 6: 4, 7: 5 };
const TRIGGER_AXIS_THRESHOLD = 0.5;

/**
 * Check if a gamepad button is pressed, with Firefox trigger-as-axis fallback.
 * For buttons 6 (LT) and 7 (RT), also checks the corresponding axis value
 * in case the browser reports triggers as axes instead of buttons.
 */
export function isGamepadButtonPressed(pad: Phaser.Input.Gamepad.Gamepad | null, index: number): boolean {
  if (!pad) return false;
  if (pad.buttons[index]?.pressed) return true;
  const axisIdx = TRIGGER_AXIS_FALLBACK[index];
  if (axisIdx !== undefined && pad.axes[axisIdx]) {
    return pad.axes[axisIdx].getValue() > TRIGGER_AXIS_THRESHOLD;
  }
  return false;
}

/**
 * Check if confirm button is pressed on any connected gamepad.
 * Handles Nintendo button swap automatically.
 */
export function isConfirmPressed(gamepad: Phaser.Input.Gamepad.Gamepad | null): boolean {
  if (!gamepad) return false;
  const mapping = getMappingFromGamepad(gamepad);
  return isGamepadButtonPressed(gamepad, mapping.confirm);
}

/**
 * Check if back button is pressed on any connected gamepad.
 * Handles Nintendo button swap automatically.
 */
export function isBackPressed(gamepad: Phaser.Input.Gamepad.Gamepad | null): boolean {
  if (!gamepad) return false;
  const mapping = getMappingFromGamepad(gamepad);
  return isGamepadButtonPressed(gamepad, mapping.back);
}

/**
 * Capture the current pressed state of specific gamepad buttons.
 * Call in create()/init() to prevent phantom presses when a button
 * is already held during a scene transition.
 *
 * @returns Map from button index to pressed state, or all-false if no pad.
 */
export function captureGamepadButtons(
  scene: Phaser.Scene,
  buttonIndices: number[],
): Record<number, boolean> {
  const state: Record<number, boolean> = {};
  for (const idx of buttonIndices) state[idx] = false;

  if (scene.input.gamepad && scene.input.gamepad.total > 0) {
    const pad = scene.input.gamepad.getPad(0);
    if (pad) {
      for (const idx of buttonIndices) {
        state[idx] = isGamepadButtonPressed(pad, idx);
      }
    }
  }
  return state;
}
