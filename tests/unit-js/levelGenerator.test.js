/**
 * Unit tests for LevelGenerator (procedural contract levels)
 */
import { describe, it, expect } from 'vitest';
import { generateContractLevel, generateValidContractLevel, validateLevel } from './config-wrappers/index.js';

describe('generateContractLevel', () => {
  it('should produce deterministic levels from the same seed', () => {
    const a = generateContractLevel(12345, 'blue');
    const b = generateContractLevel(12345, 'blue');
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(a.targetCoverage).toBe(b.targetCoverage);
    expect(a.timeLimit).toBe(b.timeLimit);
    expect(a.weather).toBe(b.weather);
    expect(a.isNight).toBe(b.isNight);
    expect(a.hasWinch).toBe(b.hasWinch);
  });

  it('should produce different levels from different seeds', () => {
    const a = generateContractLevel(100, 'green');
    const b = generateContractLevel(999, 'green');
    // At least one property should differ (statistically near-certain)
    const same = a.width === b.width && a.height === b.height && a.targetCoverage === b.targetCoverage;
    expect(same).toBe(false);
  });

  it('should set introDialogue and introSpeaker', () => {
    const level = generateContractLevel(42, 'red');
    expect(level.introDialogue).toBeDefined();
    expect(level.introDialogue).toMatch(/^contractBriefing/);
    expect(level.introSpeaker).toBeDefined();
    expect(['Jean-Pierre', 'Thierry', 'Marie', 'Émilie']).toContain(level.introSpeaker);
  });

  it('should assign level IDs >= 100', () => {
    for (const rank of ['green', 'blue', 'red', 'black']) {
      const level = generateContractLevel(500, rank);
      expect(level.id).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('rank difficulty scaling', () => {
  it('green should have no steep zones or winch', () => {
    const level = generateContractLevel(100, 'green');
    expect(level.steepZones.length).toBe(0);
    expect(level.hasWinch).toBe(false);
  });

  it('black should have steep zones and winch', () => {
    // Try multiple seeds to avoid park levels (which have no steep)
    let found = false;
    for (let seed = 1; seed < 50; seed++) {
      const level = generateContractLevel(seed, 'black');
      if (level.difficulty === 'black') {
        expect(level.steepZones.length).toBeGreaterThan(0);
        expect(level.hasWinch).toBe(true);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('higher ranks should have steeper slopes on average', () => {
    // Check structural property: black levels have steep zones, green levels don't
    let greenSteep = 0, blackSteep = 0;
    for (let s = 1; s <= 20; s++) {
      const gl = generateContractLevel(s, 'green');
      const bl = generateContractLevel(s, 'black');
      if (gl.difficulty !== 'park') greenSteep += gl.steepZones.length;
      if (bl.difficulty !== 'park') blackSteep += bl.steepZones.length;
    }
    expect(blackSteep).toBeGreaterThan(greenSteep);
  });
});

describe('validateLevel', () => {
  it('should return a level from generateValidContractLevel', () => {
    const { level, usedSeed } = generateValidContractLevel(42, 'blue');
    expect(level).toBeDefined();
    expect(level.id).toBeGreaterThanOrEqual(100);
    expect(usedSeed).toBeGreaterThanOrEqual(42);
  });
});

describe('park level generation', () => {
  it('should sometimes generate park levels', () => {
    let parkCount = 0;
    for (let seed = 0; seed < 100; seed++) {
      const level = generateContractLevel(seed, 'green');
      if (level.difficulty === 'park') parkCount++;
    }
    // Green has 30% park chance — expect at least a few
    expect(parkCount).toBeGreaterThan(0);
    expect(parkCount).toBeLessThan(100);
  });

  it('park levels should have special features', () => {
    for (let seed = 0; seed < 100; seed++) {
      const level = generateContractLevel(seed, 'green');
      if (level.difficulty === 'park') {
        expect(level.specialFeatures?.length).toBeGreaterThan(0);
        expect(level.steepZones.length).toBe(0);
        expect(level.hasWinch).toBe(false);
        return; // Found and verified one park level
      }
    }
    // If no park level found in 100 tries, that's also a failure
    expect(true).toBe(false);
  });
});
