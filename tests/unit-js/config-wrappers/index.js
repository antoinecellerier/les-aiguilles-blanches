/**
 * Re-export TypeScript config modules for unit testing.
 * Now that configs are in TypeScript, we can import them directly.
 */

// Mock browser globals for modules that need them (only if not already defined)
if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
    };
}

if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { getGamepads: () => [] };
}

// Re-export from TypeScript modules
export { LEVELS } from '../../../src/config/levels.ts';
export { TRANSLATIONS, t, setLanguage, getLanguage, detectLanguage } from '../../../src/config/localization.ts';
export { GAME_CONFIG, DIFFICULTY_MARKERS, FOOD_ITEMS } from '../../../src/config/gameConfig.ts';
export { getButtonName, getDefaultGamepadBindings, detectControllerType, isGamepadButtonPressed } from '../../../src/utils/gamepad.ts';
