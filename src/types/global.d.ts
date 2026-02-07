/**
 * Global type declarations for window properties and browser APIs
 */

import type { GameConfigType, DifficultyMarker, FoodItem } from '../config/gameConfig';
import type { Level } from '../config/levels';
import type { SupportedLanguage } from '../config/localization';
import type { AccessibilityModule } from '../utils/accessibility';

declare global {
  interface Window {
    GAME_CONFIG: GameConfigType;
    DIFFICULTY_MARKERS: Record<string, DifficultyMarker>;
    FOOD_ITEMS: Record<string, FoodItem>;
    LEVELS: Level[];
    TRANSLATIONS: Record<string, Record<string, string>>;
    t: (key: string, replacements?: Record<string, string>) => string;
    setLanguage: (lang: SupportedLanguage) => void;
    getLanguage: () => SupportedLanguage;
    detectLanguage: () => SupportedLanguage;
    getSavedLanguage: () => SupportedLanguage | null;
    Accessibility: AccessibilityModule;
  }

  /** Keyboard API (experimental, incomplete in lib.dom.d.ts) */
  interface NavigatorKeyboard {
    getLayoutMap(): Promise<KeyboardLayoutMap>;
  }

  interface KeyboardLayoutMap {
    get(key: string): string | undefined;
    has(key: string): boolean;
    entries(): IterableIterator<[string, string]>;
  }

  interface Navigator {
    keyboard?: NavigatorKeyboard;
  }
}

export {};
