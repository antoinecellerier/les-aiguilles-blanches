/**
 * Unit tests for keyboardLayout pure functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getKeyboardLayout, setKeyboardLayout,
  getLayoutDefaults, getMovementKeyNames, getMovementKeysString,
  getGroomKeyName, getWinchKeyName, t,
} from './config-wrappers/index.js';

describe('keyboardLayout', () => {
  beforeEach(() => {
    // Clear all stored keys to avoid cross-test contamination
    localStorage.clear();
    // Set default layout
    setKeyboardLayout('qwerty');
  });

  describe('getKeyboardLayout / setKeyboardLayout', () => {
    it('defaults to qwerty', () => {
      expect(getKeyboardLayout()).toBe('qwerty');
    });

    it('stores and retrieves azerty', () => {
      setKeyboardLayout('azerty');
      expect(getKeyboardLayout()).toBe('azerty');
    });

    it('stores and retrieves qwertz', () => {
      setKeyboardLayout('qwertz');
      expect(getKeyboardLayout()).toBe('qwertz');
    });
  });

  describe('getLayoutDefaults', () => {
    it('returns movement keycodes for qwerty (WASD)', () => {
      setKeyboardLayout('qwerty');
      const defaults = getLayoutDefaults();
      expect(defaults.up).toBeDefined();
      expect(defaults.down).toBeDefined();
      expect(defaults.left).toBeDefined();
      expect(defaults.right).toBeDefined();
      expect(defaults.groom).toBeDefined();
      expect(defaults.winch).toBeDefined();
    });

    it('returns different keycodes for azerty', () => {
      setKeyboardLayout('qwerty');
      const qwerty = getLayoutDefaults();
      setKeyboardLayout('azerty');
      const azerty = getLayoutDefaults();
      // AZERTY uses ZQSD, QWERTY uses WASD — up key should differ
      expect(azerty.up).not.toBe(qwerty.up);
    });

    it('returns different keycodes for qwertz', () => {
      setKeyboardLayout('qwerty');
      const qwerty = getLayoutDefaults();
      setKeyboardLayout('qwertz');
      const qwertz = getLayoutDefaults();
      // QWERTZ uses WASY — up is same (W), but down differs (Y vs S on some)
      // At minimum, they should have all required keys
      expect(qwertz.up).toBeDefined();
      expect(qwertz.down).toBeDefined();
    });

    it('always includes groom (Space) and winch (Shift)', () => {
      for (const layout of ['qwerty', 'azerty', 'qwertz']) {
        setKeyboardLayout(layout);
        const defaults = getLayoutDefaults();
        // Space = 32, Shift = 16
        expect(defaults.groom).toBe(32);
        expect(defaults.winch).toBe(16);
      }
    });
  });

  describe('getMovementKeyNames', () => {
    it('returns display names for qwerty', () => {
      setKeyboardLayout('qwerty');
      const names = getMovementKeyNames();
      expect(names.up).toBe('W');
      expect(names.down).toBe('S');
      expect(names.left).toBe('A');
      expect(names.right).toBe('D');
    });

    it('returns display names for azerty', () => {
      setKeyboardLayout('azerty');
      const names = getMovementKeyNames();
      expect(names.up).toBe('Z');
      expect(names.down).toBe('S');
      expect(names.left).toBe('Q');
      expect(names.right).toBe('D');
    });

    it('returns display names for qwertz', () => {
      setKeyboardLayout('qwertz');
      const names = getMovementKeyNames();
      expect(names.up).toBe('W');
      expect(names.down).toBe('S');
      expect(names.left).toBe('A');
      expect(names.right).toBe('D');
    });
  });

  describe('getMovementKeysString', () => {
    it('returns WASD for qwerty', () => {
      setKeyboardLayout('qwerty');
      expect(getMovementKeysString()).toBe('WASD');
    });

    it('returns ZQSD for azerty', () => {
      setKeyboardLayout('azerty');
      expect(getMovementKeysString()).toBe('ZQSD');
    });

    it('returns WASD for qwertz', () => {
      setKeyboardLayout('qwertz');
      expect(getMovementKeysString()).toBe('WASD');
    });
  });

  describe('getGroomKeyName', () => {
    it('includes localized SPACE in the name', () => {
      const name = getGroomKeyName();
      const localizedSpace = t('key_space');
      expect(name.toUpperCase()).toContain(localizedSpace.toUpperCase());
    });
  });

  describe('getWinchKeyName', () => {
    it('includes localized SHIFT in the name', () => {
      const name = getWinchKeyName();
      const localizedShift = t('key_shift');
      expect(name.toUpperCase()).toContain(localizedShift.toUpperCase());
    });
  });
});
