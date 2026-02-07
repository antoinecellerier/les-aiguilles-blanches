/**
 * Global setup - sets window globals for use by scene JS files
 * This module must be imported before any scene modules
 */

import { GAME_CONFIG, DIFFICULTY_MARKERS, FOOD_ITEMS } from './config/gameConfig';
import { LEVELS, type Level, type BonusObjective, type BonusObjectiveType } from './config/levels';
import { TRANSLATIONS, t, setLanguage, getLanguage, detectLanguage, getSavedLanguage, type SupportedLanguage } from './config/localization';
import { Accessibility, type ColorblindMode } from './utils/accessibility';

// Make globals available on window for JS scene files
window.GAME_CONFIG = GAME_CONFIG;
window.DIFFICULTY_MARKERS = DIFFICULTY_MARKERS;
window.FOOD_ITEMS = FOOD_ITEMS;
window.LEVELS = LEVELS;
window.TRANSLATIONS = TRANSLATIONS;
window.t = t;
window.setLanguage = setLanguage;
window.getLanguage = getLanguage;
window.detectLanguage = detectLanguage;
window.getSavedLanguage = getSavedLanguage;
window.Accessibility = Accessibility;

// Export for TypeScript scene files
export {
  GAME_CONFIG,
  DIFFICULTY_MARKERS,
  FOOD_ITEMS,
  LEVELS,
  TRANSLATIONS,
  t,
  setLanguage,
  getLanguage,
  detectLanguage,
  getSavedLanguage,
  Accessibility,
};

export type { Level };
export type { BonusObjective, BonusObjectiveType };
export type { SupportedLanguage };
export type { ColorblindMode };
