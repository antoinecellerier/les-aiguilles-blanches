/**
 * Gamepad menu navigation helper.
 *
 * Extracts the duplicated gamepad init/update pattern used across
 * PauseScene, MenuScene, LevelCompleteScene, and CreditsScene.
 * Each scene provides callbacks; this module handles debounce,
 * cooldown, phantom-press prevention, and button state tracking.
 */
import Phaser from 'phaser';
import { isConfirmPressed, isBackPressed } from './gamepad';

export interface GamepadMenuCallbacks {
  /** Called when D-pad/stick navigates. dir is -1 (up/left) or +1 (down/right). */
  onNavigate: (dir: number) => void;
  /** Called on confirm (A/Cross) press. */
  onConfirm: () => void;
  /** Called on back (B/Circle) press. Optional — some scenes handle back differently. */
  onBack?: () => void;
  /** If provided, called when navigation should be suppressed (e.g., overlay is open). */
  isBlocked?: () => boolean;
}

export interface GamepadMenuNav {
  /** Call in create() after gamepad is available. Captures current button state to prevent phantom presses. */
  initState(): void;
  /** Call in update(). Handles polling, debounce, and callbacks. */
  update(delta: number): void;
  /** Current state — exposed for scenes that need extra button tracking (e.g., Start button). */
  confirmPressed: boolean;
  backPressed: boolean;
}

/**
 * Create a gamepad menu navigation controller.
 *
 * @param scene       - The Phaser scene
 * @param orientation - 'vertical' for up/down (menus), 'horizontal' for left/right (level complete, credits)
 * @param callbacks   - Navigation callbacks
 * @param cooldownMs  - Navigation repeat delay in ms (default 200)
 */
export function createGamepadMenuNav(
  scene: Phaser.Scene,
  orientation: 'vertical' | 'horizontal',
  callbacks: GamepadMenuCallbacks,
  cooldownMs = 200,
): GamepadMenuNav {
  let confirmPressed = false;
  let backPressed = false;
  let navCooldown = 0;

  const nav: GamepadMenuNav = {
    get confirmPressed() { return confirmPressed; },
    get backPressed() { return backPressed; },

    initState(): void {
      navCooldown = 0;
      if (scene.input.gamepad && scene.input.gamepad.total > 0) {
        const pad = scene.input.gamepad.getPad(0);
        if (pad) {
          confirmPressed = isConfirmPressed(pad);
          backPressed = isBackPressed(pad);
        }
      } else {
        confirmPressed = false;
        backPressed = false;
      }
    },

    update(delta: number): void {
      if (!scene.input.gamepad || scene.input.gamepad.total === 0) return;
      const pad = scene.input.gamepad.getPad(0);
      if (!pad) return;

      if (callbacks.isBlocked?.()) {
        // Still track button state so we don't get phantom presses when unblocked
        confirmPressed = isConfirmPressed(pad);
        backPressed = isBackPressed(pad);
        return;
      }

      // Navigation with cooldown
      navCooldown = Math.max(0, navCooldown - delta);
      if (navCooldown <= 0) {
        if (orientation === 'vertical') {
          const stickY = pad.leftStick?.y ?? 0;
          if (pad.up || stickY < -0.5) {
            callbacks.onNavigate(-1);
            navCooldown = cooldownMs;
          } else if (pad.down || stickY > 0.5) {
            callbacks.onNavigate(1);
            navCooldown = cooldownMs;
          }
        } else {
          const stickX = pad.leftStick?.x ?? 0;
          if (pad.left || stickX < -0.5) {
            callbacks.onNavigate(-1);
            navCooldown = cooldownMs;
          } else if (pad.right || stickX > 0.5) {
            callbacks.onNavigate(1);
            navCooldown = cooldownMs;
          }
        }
      }

      // Confirm button (debounced)
      const nowConfirm = isConfirmPressed(pad);
      if (nowConfirm && !confirmPressed) {
        callbacks.onConfirm();
      }
      confirmPressed = nowConfirm;

      // Back button (debounced)
      const nowBack = isBackPressed(pad);
      if (nowBack && !backPressed && callbacks.onBack) {
        callbacks.onBack();
      }
      backPressed = nowBack;
    },
  };

  return nav;
}
