import { getLayoutDefaults, setKeyboardLayout, type KeyboardLayout } from './keyboardLayout';
import { isGamepadButtonPressed, loadGamepadBindings, saveGamepadBindings, getDefaultGamepadBindings, getButtonName, getConnectedControllerType, captureGamepadButtons, type GamepadBindings } from './gamepad';
import { STORAGE_KEYS, BINDINGS_VERSION } from '../config/storageKeys';
import { getString, setString } from './storage';
import { playClick, playCancel } from '../systems/UISounds';
import { t } from '../config/localization';

export interface KeyBindings {
  up: number;
  down: number;
  left: number;
  right: number;
  groom: number;
  winch: number;
}

/**
 * Manages keyboard and gamepad binding state: load, save, rebind, reset.
 * UI side-effects (button text, status messages) are handled via callbacks.
 */
export class KeybindingManager {
  bindings: KeyBindings;
  displayNames: Record<number, string> = {};
  gamepadBindings: GamepadBindings;
  rebindingAction: string | null = null;
  rebindingGamepadAction: string | null = null;

  private rebindButtons: Record<string, { setText: (t: string) => void; setStyle: (s: any) => void }> = {};
  private gamepadRebindButtons: Record<string, { setText: (t: string) => void; setStyle: (s: any) => void }> = {};
  private gamepadRebindSnapshot: Record<number, boolean> = {};
  private scene: Phaser.Scene;

  /** Callbacks for UI updates. Set by SettingsScene after construction. */
  onStatus: (msg: string) => void = () => {};
  onLayout: () => void = () => {};
  onRestart: () => void = () => {};
  accentColor = '#87CEEB';
  buttonBgColor = '#CC2200';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bindings = getLayoutDefaults();
    this.gamepadBindings = loadGamepadBindings();
  }

  load(): void {
    const savedVersion = getString(STORAGE_KEYS.BINDINGS_VERSION);
    const saved = getString(STORAGE_KEYS.BINDINGS);
    const savedNames = getString(STORAGE_KEYS.DISPLAY_NAMES);
    const defaults = getLayoutDefaults();

    if (savedVersion !== String(BINDINGS_VERSION)) {
      this.bindings = defaults;
      this.displayNames = {};
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.bindings = { ...defaults };
        for (const key of Object.keys(defaults) as Array<keyof KeyBindings>) {
          if (typeof parsed[key] === 'number' && parsed[key] > 0) {
            this.bindings[key] = parsed[key];
          }
        }
      } catch (e) {
        console.warn('Failed to parse key bindings:', e);
        this.bindings = defaults;
      }
    } else {
      this.bindings = defaults;
    }

    if (savedNames) {
      try {
        this.displayNames = JSON.parse(savedNames);
      } catch (e) {
        console.warn('Failed to parse display names:', e);
        this.displayNames = {};
      }
    }
  }

  save(): void {
    try {
      setString(STORAGE_KEYS.BINDINGS_VERSION, String(BINDINGS_VERSION));
      setString(STORAGE_KEYS.BINDINGS, JSON.stringify(this.bindings));
      setString(STORAGE_KEYS.DISPLAY_NAMES, JSON.stringify(this.displayNames));
    } catch { /* Private browsing or quota exceeded */ }
  }

  getKeyName(keyCode: number): string {
    if (!keyCode) return '?';
    if (this.displayNames[keyCode]) return this.displayNames[keyCode];

    const specialKeys: Record<number, string> = {
      38: '↑', 40: '↓', 37: '←', 39: '→',
      32: 'SPACE', 16: 'SHIFT', 17: 'CTRL', 18: 'ALT',
      13: 'ENTER', 9: 'TAB', 27: 'ESC', 8: '⌫', 46: 'DEL',
    };
    if (specialKeys[keyCode]) return specialKeys[keyCode];
    if (keyCode >= 65 && keyCode <= 90) return String.fromCharCode(keyCode);
    if (keyCode >= 48 && keyCode <= 57) return String.fromCharCode(keyCode);
    return keyCode.toString();
  }

  // ── Keyboard rebinding ─────────────────────────────────────────

  startRebind(actionId: string, btn: { setText: (t: string) => void; setStyle: (s: any) => void }): void {
    if (this.rebindingAction) return;
    this.rebindingAction = actionId;
    this.rebindButtons[actionId] = btn;
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.onStatus(t('pressKey'));
    this.onLayout();
  }

  finishRebind(keyCode: number, keyChar: string, eventCode: string): void {
    if (!this.rebindingAction) return;
    if (eventCode === 'Escape') {
      this.cancelRebind();
      return;
    }

    const actionId = this.rebindingAction as keyof KeyBindings;
    this.bindings[actionId] = keyCode;
    if (keyChar.length === 1) {
      this.displayNames[keyCode] = keyChar.toUpperCase();
    } else {
      this.displayNames[keyCode] = keyChar;
    }
    this.save();

    const btn = this.rebindButtons[actionId];
    btn.setText(this.getKeyName(keyCode) + ' *');
    btn.setStyle({ backgroundColor: '#5a5a2d', color: this.accentColor });

    this.rebindingAction = null;
    playClick();
    this.onStatus(t('saved'));
    this.onLayout();
    this.scene.time.delayedCall(800, () => this.onRestart());
  }

  cancelRebind(): void {
    if (!this.rebindingAction) return;
    const btn = this.rebindButtons[this.rebindingAction];
    btn.setText(this.getKeyName(this.bindings[this.rebindingAction as keyof KeyBindings]));
    btn.setStyle({ backgroundColor: this.buttonBgColor });
    this.rebindingAction = null;
    playCancel();
    this.onStatus('');
    this.onLayout();
  }

  // ── Gamepad rebinding ──────────────────────────────────────────

  startGamepadRebind(actionId: string, btn: { setText: (t: string) => void; setStyle: (s: any) => void }): void {
    if (this.rebindingGamepadAction || this.rebindingAction) return;
    if (!this.scene.input.gamepad || this.scene.input.gamepad.total === 0) {
      this.onStatus(t('noGamepad'));
      return;
    }
    this.rebindingGamepadAction = actionId;
    this.gamepadRebindButtons[actionId] = btn;
    this.gamepadRebindSnapshot = captureGamepadButtons(this.scene, Array.from({ length: 16 }, (_, i) => i));
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.onStatus(t('pressGamepadButton'));
    this.onLayout();
  }

  checkGamepadRebind(): void {
    if (!this.rebindingGamepadAction) return;
    if (!this.scene.input.gamepad || this.scene.input.gamepad.total === 0) return;

    const pad = this.scene.input.gamepad.getPad(0);
    if (!pad) return;

    const maxBtn = Math.min(Math.max(pad.buttons.length, 8), 16);
    for (let i = 0; i < maxBtn; i++) {
      const now = isGamepadButtonPressed(pad, i);
      const was = this.gamepadRebindSnapshot[i] ?? false;
      if (now && !was) {
        this.acceptGamepadRebind(i);
        return;
      }
      this.gamepadRebindSnapshot[i] = now;
    }
  }

  private acceptGamepadRebind(buttonIndex: number): void {
    const actionId = this.rebindingGamepadAction as keyof GamepadBindings;
    this.gamepadBindings[actionId] = buttonIndex;
    saveGamepadBindings(this.gamepadBindings);

    const btn = this.gamepadRebindButtons[actionId];
    const isCustom = buttonIndex !== getDefaultGamepadBindings()[actionId];
    btn.setText(getButtonName(buttonIndex, getConnectedControllerType()) + (isCustom ? ' *' : ''));
    btn.setStyle({ backgroundColor: isCustom ? '#5a5a2d' : this.buttonBgColor,
                    color: isCustom ? this.accentColor : '#87CEEB' });

    this.rebindingGamepadAction = null;
    playClick();
    this.onStatus(t('saved'));
    this.onLayout();
    this.scene.time.delayedCall(800, () => this.onRestart());
  }

  // ── Reset ──────────────────────────────────────────────────────

  reset(): void {
    setKeyboardLayout('qwerty');
    this.bindings = getLayoutDefaults();
    this.displayNames = {};
    this.save();
    this.gamepadBindings = getDefaultGamepadBindings();
    saveGamepadBindings(this.gamepadBindings);
    this.onStatus(t('controlsReset'));
    this.scene.time.delayedCall(800, () => this.onRestart());
  }

  setLayout(layout: KeyboardLayout): void {
    setKeyboardLayout(layout);
    this.bindings = getLayoutDefaults();
    this.displayNames = {};
    this.save();
    this.onRestart();
  }
}
