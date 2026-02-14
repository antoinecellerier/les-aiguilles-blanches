/**
 * Unit tests for level configuration
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, computeTimeLimit } from './config-wrappers/index.js';

describe('Level Configuration', () => {
    it('should have exactly 11 levels', () => {
        expect(LEVELS).toHaveLength(11);
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

    it('level 7 should be a night level with winch', () => {
        expect(LEVELS[7].isNight).toBe(true);
        expect(LEVELS[7].hasWinch).toBe(true);
        expect(LEVELS[7].winchAnchors?.length).toBeGreaterThan(0);
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

    it('all non-tutorial levels have auto-computed timeLimit > 0', () => {
        LEVELS.forEach((level, i) => {
            if (level.isTutorial) {
                expect(level.timeLimit, `Tutorial timeLimit`).toBe(0);
            } else {
                expect(level.timeLimit, `Level ${i} timeLimit`).toBeGreaterThan(0);
            }
        });
    });

    it('all non-tutorial levels have speed_run target at 60% of timeLimit', () => {
        LEVELS.forEach((level, i) => {
            if (level.isTutorial) return;
            const speedRun = level.bonusObjectives?.find(b => b.type === 'speed_run');
            if (speedRun) {
                expect(speedRun.target, `Level ${i} speed_run target`).toBe(Math.round(level.timeLimit * 0.6));
            }
        });
    });

    it('winch anchors should not fall inside steep zones', () => {
        LEVELS.forEach((level, i) => {
            (level.winchAnchors ?? []).forEach((anchor, j) => {
                (level.steepZones ?? []).forEach((zone, k) => {
                    const inside = anchor.y >= zone.startY && anchor.y <= zone.endY;
                    expect(inside, `Level ${i} anchor ${j} (y=${anchor.y}) inside steep zone ${k} (${zone.startY}-${zone.endY})`).toBe(false);
                });
            });
        });
    });
});

describe('computeTimeLimit', () => {
    it('returns 0 for tutorial levels', () => {
        expect(computeTimeLimit({
            width: 30, height: 25, targetCoverage: 80,
            difficulty: 'green', hasWinch: false, isTutorial: true,
        })).toBe(0);
    });

    it('returns at least 60s for any non-tutorial level', () => {
        expect(computeTimeLimit({
            width: 10, height: 10, targetCoverage: 50,
            difficulty: 'green', hasWinch: false, isTutorial: false,
        })).toBeGreaterThanOrEqual(60);
    });

    it('result is always a multiple of 30', () => {
        const difficulties = ['green', 'blue', 'park', 'red', 'black'];
        for (const diff of difficulties) {
            const t = computeTimeLimit({
                width: 45, height: 35, targetCoverage: 85,
                difficulty: diff, hasWinch: false, isTutorial: false,
            });
            expect(t % 30, `${diff} level time ${t} not multiple of 30`).toBe(0);
        }
    });

    it('winch levels get more time than equivalent non-winch', () => {
        const base = { width: 50, height: 40, targetCoverage: 90, difficulty: 'red', isTutorial: false };
        const without = computeTimeLimit({ ...base, hasWinch: false });
        const withWinch = computeTimeLimit({ ...base, hasWinch: true });
        expect(withWinch).toBeGreaterThanOrEqual(without);
    });

    it('access paths add time', () => {
        const base = { width: 40, height: 30, targetCoverage: 85, difficulty: 'blue', hasWinch: false, isTutorial: false };
        const noPaths = computeTimeLimit({ ...base, accessPaths: [] });
        const twoPaths = computeTimeLimit({ ...base, accessPaths: [
            { startY: 0.2, endY: 0.4 },
            { startY: 0.6, endY: 0.8 },
        ] });
        expect(twoPaths).toBeGreaterThanOrEqual(noPaths);
    });

    it('larger levels get more time', () => {
        const base = { targetCoverage: 85, difficulty: 'blue', hasWinch: false, isTutorial: false };
        const small = computeTimeLimit({ ...base, width: 30, height: 25 });
        const large = computeTimeLimit({ ...base, width: 120, height: 100 });
        expect(large).toBeGreaterThan(small);
    });

    it('green levels get more time than black for same geometry', () => {
        const base = { width: 50, height: 40, targetCoverage: 90, hasWinch: false, isTutorial: false };
        const green = computeTimeLimit({ ...base, difficulty: 'green' });
        const black = computeTimeLimit({ ...base, difficulty: 'black' });
        expect(green).toBeGreaterThanOrEqual(black);
    });

    it('matches LEVELS auto-applied values', () => {
        LEVELS.forEach((level, i) => {
            if (level.timeLimitOverride) {
                expect(level.timeLimit, `Level ${i} timeLimit override`).toBe(level.timeLimitOverride);
            } else {
                const computed = computeTimeLimit(level);
                expect(level.timeLimit, `Level ${i} timeLimit mismatch`).toBe(computed);
            }
        });
    });
});
