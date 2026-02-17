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

// Mock Phaser.Math.RandomDataGenerator for SeededRNG
if (typeof globalThis.Phaser === 'undefined') {
    // Simple mulberry32 PRNG for deterministic testing
    function mulberry32(seed) {
        let s = seed | 0;
        return function() {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    globalThis.Phaser = {
        Math: {
            RandomDataGenerator: class {
                constructor(seeds) {
                    const seedStr = Array.isArray(seeds) ? seeds[0] : String(seeds);
                    let hash = 0;
                    for (let i = 0; i < seedStr.length; i++) {
                        hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
                    }
                    this._next = mulberry32(hash);
                }
                frac() { return this._next(); }
                integerInRange(min, max) { return min + Math.floor(this._next() * (max - min + 1)); }
                realInRange(min, max) { return min + this._next() * (max - min); }
                pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
                shuffle(arr) {
                    const a = [...arr];
                    for (let i = a.length - 1; i > 0; i--) {
                        const j = Math.floor(this._next() * (i + 1));
                        [a[i], a[j]] = [a[j], a[i]];
                    }
                    return a;
                }
            },
        },
        ScaleModes: { NEAREST: 0 },
    };
}

// Re-export from TypeScript modules
export { LEVELS, computeTimeLimit } from '../../../src/config/levels.ts';
export { TRANSLATIONS, t, setLanguage, getLanguage, detectLanguage } from '../../../src/config/localization.ts';
export { GAME_CONFIG, DIFFICULTY_MARKERS, FOOD_ITEMS, BALANCE, DEPTHS, yDepth } from '../../../src/config/gameConfig.ts';
export { getButtonName, getDefaultGamepadBindings, detectControllerType, isGamepadButtonPressed, captureGamepadButtons } from '../../../src/utils/gamepad.ts';
export { STORAGE_KEYS } from '../../../src/config/storageKeys.ts';
export { LevelGeometry } from '../../../src/systems/LevelGeometry.ts';
export { getKeyboardLayout, setKeyboardLayout, getLayoutDefaults, getMovementKeyNames, getMovementKeysString, getGroomKeyName, getWinchKeyName } from '../../../src/utils/keyboardLayout.ts';
export { getSavedProgress, saveProgress, markLevelCompleted, isLevelUnlocked, clearProgress, getLevelStats } from '../../../src/utils/gameProgress.ts';
export { generateContractLevel, generateValidContractLevel, validateLevel } from '../../../src/systems/LevelGenerator.ts';
