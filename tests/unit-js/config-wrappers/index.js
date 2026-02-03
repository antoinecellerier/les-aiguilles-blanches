/**
 * Wrapper to load browser-global JS config files for testing.
 * Executes the JS in a sandboxed context and extracts globals.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcConfig = join(__dirname, '../../../src/config');

// Create a sandbox with browser-like globals
function createSandbox() {
    return {
        console,
        navigator: { language: 'en-US' },
        localStorage: {
            getItem: () => null,
            setItem: () => {},
        },
    };
}

// Load and execute a JS file, returning the sandbox with globals
function loadConfig(filename) {
    let code = readFileSync(join(srcConfig, filename), 'utf8');
    // Replace const/let with var so declarations become sandbox properties
    code = code.replace(/^(const|let) /gm, 'var ');
    const sandbox = createSandbox();
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox;
}

// Export loaded configs
const levelsContext = loadConfig('levels.js');
export const LEVELS = levelsContext.LEVELS;

const localizationContext = loadConfig('localization.js');
export const TRANSLATIONS = localizationContext.TRANSLATIONS;
export const getText = localizationContext.getText;
export const setLanguage = localizationContext.setLanguage;
export const getLanguage = localizationContext.getLanguage;

const gameConfigContext = loadConfig('gameConfig.js');
export const GAME_CONFIG = gameConfigContext.GAME_CONFIG;
export const DIFFICULTY_MARKERS = gameConfigContext.DIFFICULTY_MARKERS;
export const FOOD_ITEMS = gameConfigContext.FOOD_ITEMS;
