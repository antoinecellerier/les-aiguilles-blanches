import { describe, it, expect } from 'vitest';
import './config-wrappers/index.js';
import { seedToCode, codeToSeed, dailySeed, randomSeed, SeededRNG } from '../../src/utils/seededRNG.ts';

describe('seededRNG helpers', () => {
  it('round-trips numeric seeds through share codes', () => {
    const seeds = [0, 1, 35, 36, 123456789, 0xFFFFFFFF];
    for (const seed of seeds) {
      const code = seedToCode(seed);
      expect(code.length).toBeGreaterThanOrEqual(4);
      expect(codeToSeed(code)).toBe(seed >>> 0);
    }
  });

  it('decodes case-insensitively and ignores non-base36 chars', () => {
    expect(codeToSeed('abc123')).toBe(codeToSeed('ABC123'));
    expect(codeToSeed('A-B C')).toBe(codeToSeed('ABC'));
  });

  it('produces deterministic daily seeds from the same date', () => {
    const d1 = new Date('2026-02-21T00:00:00Z');
    const d2 = new Date('2026-02-22T00:00:00Z');
    expect(dailySeed(d1)).toBe(dailySeed(d1));
    expect(dailySeed(d1)).not.toBe(dailySeed(d2));
  });

  it('randomSeed returns a uint32', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

describe('SeededRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRNG(12345);
    const b = new SeededRNG(12345);

    expect(a.frac()).toBeCloseTo(b.frac(), 10);
    expect(a.integerInRange(1, 10)).toBe(b.integerInRange(1, 10));
    expect(a.realInRange(-5, 5)).toBeCloseTo(b.realInRange(-5, 5), 10);
    expect(a.pick(['a', 'b', 'c', 'd'])).toBe(b.pick(['a', 'b', 'c', 'd']));
    expect(a.shuffle([1, 2, 3, 4])).toEqual(b.shuffle([1, 2, 3, 4]));
  });

  it('fromCode uses the decoded seed and canonical code', () => {
    const rng = SeededRNG.fromCode('abc123');
    const expectedSeed = codeToSeed('ABC123');
    expect(rng.seed).toBe(expectedSeed);
    expect(rng.code).toBe(seedToCode(expectedSeed));
  });
});
