/**
 * Global setup - sets window globals for use by scene JS files
 * This module must be imported before any scene modules
 */

import { GAME_CONFIG, DIFFICULTY_MARKERS, FOOD_ITEMS } from './config/gameConfig';
import { LEVELS, type Level } from './config/levels';
import { TRANSLATIONS, t, setLanguage, getLanguage, detectLanguage, getSavedLanguage, type SupportedLanguage } from './config/localization';
import { Accessibility, type ColorblindMode } from './utils/accessibility';

// Make globals available on window for JS scene files
(window as any).GAME_CONFIG = GAME_CONFIG;
(window as any).DIFFICULTY_MARKERS = DIFFICULTY_MARKERS;
(window as any).FOOD_ITEMS = FOOD_ITEMS;
(window as any).LEVELS = LEVELS;
(window as any).TRANSLATIONS = TRANSLATIONS;
(window as any).t = t;
(window as any).setLanguage = setLanguage;
(window as any).getLanguage = getLanguage;
(window as any).detectLanguage = detectLanguage;
(window as any).getSavedLanguage = getSavedLanguage;
(window as any).Accessibility = Accessibility;

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
export type { SupportedLanguage };
export type { ColorblindMode };
