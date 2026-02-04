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

export type ControllerType = 'xbox' | 'nintendo' | 'playstation' | 'generic';

export interface ButtonMapping {
  confirm: number;      // Button index for confirm action
  back: number;         // Button index for back action
  confirmLabel: string; // Label to show for confirm
  backLabel: string;    // Label to show for back
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

/**
 * Check if confirm button is pressed on any connected gamepad.
 * Handles Nintendo button swap automatically.
 */
export function isConfirmPressed(gamepad: Phaser.Input.Gamepad.Gamepad | null): boolean {
  if (!gamepad) return false;
  const mapping = getMappingFromGamepad(gamepad);
  return gamepad.buttons[mapping.confirm]?.pressed || false;
}

/**
 * Check if back button is pressed on any connected gamepad.
 * Handles Nintendo button swap automatically.
 */
export function isBackPressed(gamepad: Phaser.Input.Gamepad.Gamepad | null): boolean {
  if (!gamepad) return false;
  const mapping = getMappingFromGamepad(gamepad);
  return gamepad.buttons[mapping.back]?.pressed || false;
}
