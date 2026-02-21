/**
 * Unit tests for localization configuration
 */
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, LEVELS } from './config-wrappers/index.js';

const ALL_LANGS = ['fr', 'en', 'de', 'it', 'es', 'sv', 'nb', 'fi', 'cs', 'pl', 'tr', 'sk', 'ja', 'ko'];

describe('Localization', () => {
    it('should have all 14 supported languages', () => {
        ALL_LANGS.forEach(lang => {
            expect(TRANSLATIONS, `Missing ${lang}`).toHaveProperty(lang);
        });
    });

    it('all level names should be translated in all languages', () => {
        const missing = [];
        LEVELS.forEach((level) => {
            const key = level.nameKey;
            ALL_LANGS.forEach(lang => {
                if (!TRANSLATIONS[lang]?.[key]) {
                    missing.push(`${lang}.${key}`);
                }
            });
        });
        expect(missing, `Missing level name translations:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('all level tasks should be translated in all languages', () => {
        const missing = [];
        LEVELS.forEach((level) => {
            const key = level.taskKey;
            ALL_LANGS.forEach(lang => {
                if (!TRANSLATIONS[lang]?.[key]) {
                    missing.push(`${lang}.${key}`);
                }
            });
        });
        expect(missing, `Missing level task translations:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('hazard messages should exist in all languages', () => {
        const hazards = ['cliffFall', 'fuelEmpty', 'avalancheWarning', 
                        'avalancheTrigger', 'steepWarning', 'tumble'];
        const missing = [];
        hazards.forEach(key => {
            ALL_LANGS.forEach(lang => {
                if (!TRANSLATIONS[lang]?.[key]) {
                    missing.push(`${lang}.${key}`);
                }
            });
        });
        expect(missing, `Missing hazard translations:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('menu strings should exist in all languages', () => {
        const menuKeys = ['startGame', 'settings', 'howToPlay', 'back', 'resume', 
                          'quitToMenu', 'levelComplete', 'levelFailed', 'tryAgain'];
        const missing = [];
        menuKeys.forEach(key => {
            ALL_LANGS.forEach(lang => {
                if (!TRANSLATIONS[lang]?.[key]) {
                    missing.push(`${lang}.${key}`);
                }
            });
        });
        expect(missing, `Missing menu translations:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('all taunt keys from FR should exist in all languages', () => {
        // Dynamically find all taunt keys from French (primary locale)
        const tauntKeys = Object.keys(TRANSLATIONS.fr).filter(key => key.startsWith('taunt'));
        
        const missing = [];
        ALL_LANGS.forEach(lang => {
            tauntKeys.forEach(key => {
                if (!TRANSLATIONS[lang]?.[key]) {
                    missing.push(`${lang}.${key}`);
                }
            });
        });
        
        expect(missing, `Missing taunt translations:\n${missing.join('\n')}`).toHaveLength(0);
    });

    it('all languages should have the same keys as FR (primary locale)', () => {
        const frKeys = Object.keys(TRANSLATIONS.fr);
        const missingByLang = {};
        
        ALL_LANGS.forEach(lang => {
            if (lang === 'fr') return;
            const missing = frKeys.filter(key => !TRANSLATIONS[lang].hasOwnProperty(key));
            if (missing.length > 0) {
                missingByLang[lang] = missing;
            }
        });
        
        const totalMissing = Object.values(missingByLang).flat();
        const report = Object.entries(missingByLang)
            .map(([lang, keys]) => `${lang}: ${keys.length} missing\n  ${keys.join('\n  ')}`)
            .join('\n\n');
        
        expect(totalMissing, `Missing translations:\n\n${report}`).toHaveLength(0);
    });

    it('changelog dates should have no duplicates within any language', () => {
        const duplicates = [];
        ALL_LANGS.forEach(lang => {
            const dateKeys = Object.keys(TRANSLATIONS[lang])
                .filter(key => key.match(/^changelog_\d{8}_date$/));
            const dates = dateKeys.map(key => TRANSLATIONS[lang][key]);
            const seen = new Set();
            dates.forEach((date, i) => {
                if (seen.has(date)) {
                    duplicates.push(`${lang}: "${date}" appears multiple times (${dateKeys[i]})`);
                }
                seen.add(date);
            });
        });
        expect(duplicates, `Duplicate changelog dates:\n${duplicates.join('\n')}`).toHaveLength(0);
    });

    it('changelog keys should not reference future dates', () => {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const futureKeys = Object.keys(TRANSLATIONS.fr)
            .filter(key => key.match(/^changelog_\d{8}_date$/))
            .map(key => key.match(/^changelog_(\d{8})_date$/)[1])
            .filter(dateStr => dateStr > today);
        expect(futureKeys, `Changelog keys with future dates: ${futureKeys.join(', ')}`).toHaveLength(0);
    });
});
