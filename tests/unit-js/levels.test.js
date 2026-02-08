/**
 * Unit tests for level configuration
 */
import { describe, it, expect } from 'vitest';
import { LEVELS } from './config-wrappers/index.js';

describe('Level Configuration', () => {
    it('should have exactly 9 levels', () => {
        expect(LEVELS).toHaveLength(9);
    });

    it('all levels should have required properties', () => {
        const required = ['id', 'nameKey', 'taskKey', 'difficulty', 'timeLimit',
                         'targetCoverage', 'width', 'height'];
        
        LEVELS.forEach((level, i) => {
            required.forEach(prop => {
                expect(level, `Level ${i} missing ${prop}`).toHaveProperty(prop);
            });
        });
    });

    it('all levels should have piste configuration', () => {
        LEVELS.forEach((level, i) => {
            expect(level, `Level ${i} missing pisteShape`).toHaveProperty('pisteShape');
            expect(level, `Level ${i} missing pisteWidth`).toHaveProperty('pisteWidth');
            expect(level.pisteWidth).toBeGreaterThan(0);
            expect(level.pisteWidth).toBeLessThanOrEqual(1);
        });
    });

    it('all levels should have arrays for zones/anchors/obstacles', () => {
        LEVELS.forEach((level, i) => {
            expect(Array.isArray(level.steepZones ?? []), `Level ${i} steepZones`).toBe(true);
            expect(Array.isArray(level.winchAnchors ?? []), `Level ${i} winchAnchors`).toBe(true);
            expect(Array.isArray(level.obstacles ?? []), `Level ${i} obstacles`).toBe(true);
        });
    });

    it('level 0 should be tutorial', () => {
        expect(LEVELS[0].isTutorial).toBe(true);
        expect(LEVELS[0].difficulty).toBe('tutorial');
    });

    it('steep zones should have valid ranges', () => {
        LEVELS.forEach((level, i) => {
            (level.steepZones ?? []).forEach((zone, j) => {
                expect(zone, `Level ${i} zone ${j}`).toHaveProperty('startY');
                expect(zone, `Level ${i} zone ${j}`).toHaveProperty('endY');
                expect(zone, `Level ${i} zone ${j}`).toHaveProperty('slope');
                expect(zone.startY).toBeGreaterThanOrEqual(0);
                expect(zone.startY).toBeLessThanOrEqual(1);
                expect(zone.endY).toBeGreaterThanOrEqual(0);
                expect(zone.endY).toBeLessThanOrEqual(1);
                expect(zone.startY).toBeLessThan(zone.endY);
            });
        });
    });

    it('winch anchors should have valid y positions', () => {
        LEVELS.forEach((level, i) => {
            (level.winchAnchors ?? []).forEach((anchor, j) => {
                expect(anchor, `Level ${i} anchor ${j}`).toHaveProperty('y');
                expect(anchor.y).toBeGreaterThanOrEqual(0);
                expect(anchor.y).toBeLessThanOrEqual(1);
            });
        });
    });

    it('level 6 should be a night level with winch', () => {
        expect(LEVELS[6].isNight).toBe(true);
        expect(LEVELS[6].hasWinch).toBe(true);
        expect(LEVELS[6].winchAnchors?.length).toBeGreaterThan(0);
    });

    it('levels with hasWinch should have winch anchors', () => {
        LEVELS.forEach((level, i) => {
            if (level.hasWinch) {
                expect(level.winchAnchors?.length, `Level ${i} has hasWinch but no anchors`).toBeGreaterThan(0);
            }
        });
    });

    it('levels with introDialogue should have explicit introSpeaker', () => {
        const validSpeakers = ['Jean-Pierre', 'Émilie', 'Thierry', 'Marie'];
        LEVELS.forEach((level, i) => {
            if (level.introDialogue) {
                expect(level.introSpeaker, `Level ${i} has introDialogue but no introSpeaker`).toBeDefined();
                expect(validSpeakers, `Level ${i} introSpeaker '${level.introSpeaker}' not valid`).toContain(level.introSpeaker);
            }
        });
    });
});
