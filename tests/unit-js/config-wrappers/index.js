/**
 * Re-export TypeScript config modules for unit testing.
 * Now that configs are in TypeScript, we can import them directly.
 */

// Mock browser globals for modules that need them (only if not already defined)
if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] ?? null,
    };
}

if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { getGamepads: () => [] };
}

// Re-export from TypeScript modules
export { LEVELS } from '../../../src/config/levels.ts';
export { TRANSLATIONS, t, setLanguage, getLanguage, detectLanguage } from '../../../src/config/localization.ts';
export { GAME_CONFIG, DIFFICULTY_MARKERS, FOOD_ITEMS, BALANCE, DEPTHS, yDepth } from '../../../src/config/gameConfig.ts';
export { getButtonName, getDefaultGamepadBindings, detectControllerType, isGamepadButtonPressed, captureGamepadButtons } from '../../../src/utils/gamepad.ts';
export { STORAGE_KEYS } from '../../../src/config/storageKeys.ts';
export { LevelGeometry } from '../../../src/systems/LevelGeometry.ts';
export { getKeyboardLayout, setKeyboardLayout, getLayoutDefaults, getMovementKeyNames, getMovementKeysString, getGroomKeyName, getWinchKeyName } from '../../../src/utils/keyboardLayout.ts';
