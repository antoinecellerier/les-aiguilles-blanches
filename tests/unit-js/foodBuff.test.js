import { describe, it, expect } from 'vitest';
import { selectFoodBuff, FOOD_ITEMS } from '../../src/config/gameConfig';

const baseOpts = {
  isNight: false,
  weather: 'clear',
  timeRemaining: 200,
  timeLimit: 300,
  coverage: 50,
  activeBuffs: {},
};

describe('selectFoodBuff', () => {
  it('returns fondue as default fallback', () => {
    expect(selectFoodBuff(baseOpts)).toBe('fondue');
    expect(FOOD_ITEMS.fondue.buff).toBe('staminaRegen');
  });

  it('returns vinChaud on night levels', () => {
    expect(selectFoodBuff({ ...baseOpts, isNight: true })).toBe('vinChaud');
    expect(FOOD_ITEMS.vinChaud.buff).toBe('warmth');
  });

  it('returns vinChaud on storm levels', () => {
    expect(selectFoodBuff({ ...baseOpts, weather: 'storm' })).toBe('vinChaud');
  });

  it('does not repeat vinChaud if warmth already active', () => {
    const result = selectFoodBuff({
      ...baseOpts,
      isNight: true,
      activeBuffs: { warmth: 10000 },
    });
    expect(result).not.toBe('vinChaud');
  });

  it('returns croziflette when time is tight (< 40%)', () => {
    expect(selectFoodBuff({ ...baseOpts, timeRemaining: 100, timeLimit: 300 })).toBe('croziflette');
    expect(FOOD_ITEMS.croziflette.buff).toBe('speed');
  });

  it('returns genepi when coverage > 70%', () => {
    expect(selectFoodBuff({ ...baseOpts, coverage: 75 })).toBe('genepi');
    expect(FOOD_ITEMS.genepi.buff).toBe('precision');
  });

  it('warmth takes priority over speed when both conditions met', () => {
    const result = selectFoodBuff({
      ...baseOpts,
      isNight: true,
      timeRemaining: 50,
      timeLimit: 300,
    });
    expect(result).toBe('vinChaud');
  });

  it('speed takes priority over precision when both conditions met', () => {
    const result = selectFoodBuff({
      ...baseOpts,
      timeRemaining: 50,
      timeLimit: 300,
      coverage: 80,
    });
    expect(result).toBe('croziflette');
  });

  it('returns fondue when timeLimit is 0 (tutorial)', () => {
    expect(selectFoodBuff({ ...baseOpts, timeLimit: 0, timeRemaining: 0 })).toBe('fondue');
  });

  it('all returned dishes exist in FOOD_ITEMS', () => {
    const scenarios = [
      baseOpts,
      { ...baseOpts, isNight: true },
      { ...baseOpts, weather: 'storm' },
      { ...baseOpts, timeRemaining: 50, timeLimit: 300 },
      { ...baseOpts, coverage: 80 },
    ];
    for (const opts of scenarios) {
      const dish = selectFoodBuff(opts);
      expect(FOOD_ITEMS[dish]).toBeDefined();
      expect(FOOD_ITEMS[dish].buff).toBeTruthy();
    }
  });
});
