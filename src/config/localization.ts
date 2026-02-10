/**
 * Les Aiguilles Blanches - Localization
 * Multi-language support for Phaser 3 version
 *
 * Per-language translations live in src/config/locales/<lang>.ts.
 * Languages are ordered by ski market size (skier visits/year),
 * with French first as the game's home language.
 */

import { STORAGE_KEYS } from './storageKeys';
import { getString, setString } from '../utils/storage';
import fr from './locales/fr';
import en from './locales/en';
import de from './locales/de';
import it from './locales/it';
import es from './locales/es';
import sv from './locales/sv';
import nb from './locales/nb';
import fi from './locales/fi';
import cs from './locales/cs';
import pl from './locales/pl';
import tr from './locales/tr';
import sk from './locales/sk';

export type SupportedLanguage = 'fr' | 'en' | 'de' | 'it' | 'es' | 'sv' | 'nb' | 'fi' | 'cs' | 'pl' | 'tr' | 'sk';

let currentLang: SupportedLanguage = 'fr';

/**
 * All translations keyed by language code.
 * Order: French first (home), then by skier visits:
 * EN (US+CA 78M), DE (AT+DE 60M), IT (32M), SE (10.5M),
 * NO (7-9M), FI (5-6M), CZ (4-5M), PL (4-5M), TR (2-3M),
 * SK (2-3M), ES (2M)
 */
export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
    fr, en, de, it, sv, nb, fi, cs, pl, tr, sk, es,
};

export function setLanguage(lang: SupportedLanguage): void {
    if (TRANSLATIONS[lang]) {
        currentLang = lang;
        setString(STORAGE_KEYS.LANG, lang);
    }
}

export function getLanguage(): SupportedLanguage {
    return currentLang;
}

export function t(key: string): string {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

export function detectLanguage(): SupportedLanguage {
    const saved = getString(STORAGE_KEYS.LANG);
    if (saved && saved in TRANSLATIONS) {
        return saved as SupportedLanguage;
    }
    const browserLang = navigator.language.split('-')[0];
    return browserLang in TRANSLATIONS ? browserLang as SupportedLanguage : 'fr';
}

export function getSavedLanguage(): SupportedLanguage {
    return detectLanguage();
}
