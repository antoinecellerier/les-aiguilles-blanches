/**
 * Unit tests for localization configuration
 */
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, LEVELS } from './config-wrappers/index.js';

describe('Localization', () => {
    it('should have all 5 languages', () => {
        const langs = ['fr', 'en', 'de', 'it', 'es'];
        langs.forEach(lang => {
            expect(TRANSLATIONS, `Missing ${lang}`).toHaveProperty(lang);
        });
    });

    it('all level names should be translated in FR and EN', () => {
        LEVELS.forEach((level, i) => {
            const key = level.nameKey;
            expect(TRANSLATIONS.fr, `Missing FR: ${key}`).toHaveProperty(key);
            expect(TRANSLATIONS.en, `Missing EN: ${key}`).toHaveProperty(key);
        });
    });

    it('all level tasks should be translated in FR and EN', () => {
        LEVELS.forEach((level, i) => {
            const key = level.taskKey;
            expect(TRANSLATIONS.fr, `Missing FR: ${key}`).toHaveProperty(key);
            expect(TRANSLATIONS.en, `Missing EN: ${key}`).toHaveProperty(key);
        });
    });

    it('hazard messages should exist in FR and EN', () => {
        const hazards = ['cliffFall', 'fuelEmpty', 'avalancheWarning', 
                        'avalancheTrigger', 'steepWarning', 'tumble'];
        hazards.forEach(key => {
            expect(TRANSLATIONS.fr, `Missing FR: ${key}`).toHaveProperty(key);
            expect(TRANSLATIONS.en, `Missing EN: ${key}`).toHaveProperty(key);
        });
    });

    it('menu strings should exist in FR and EN', () => {
        const menuKeys = ['startGame', 'settings', 'howToPlay', 'back'];
        menuKeys.forEach(key => {
            expect(TRANSLATIONS.fr, `Missing FR: ${key}`).toHaveProperty(key);
            expect(TRANSLATIONS.en, `Missing EN: ${key}`).toHaveProperty(key);
        });
    });
});
