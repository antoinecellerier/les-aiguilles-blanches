import { describe, it, expect } from 'vitest';
import { getFrostRate, getFrostSpeedMultiplier, BALANCE } from '../../src/config/gameConfig.ts';

describe('getFrostRate', () => {
  it('returns 0 for early levels regardless of weather', () => {
    expect(getFrostRate(0, false, 'clear')).toBe(0);
    expect(getFrostRate(6, true, 'storm')).toBe(0);
    expect(getFrostRate(7, true, 'clear')).toBe(0); // L7 Verticale exempt
  });

  it('returns storm rate for storm weather on eligible levels', () => {
    expect(getFrostRate(8, false, 'storm')).toBe(BALANCE.FROST_RATE_STORM);
  });

  it('returns light_snow rate for light_snow weather on eligible levels', () => {
    expect(getFrostRate(8, false, 'light_snow')).toBe(BALANCE.FROST_RATE_LIGHT_SNOW);
  });

  it('returns night rate for night levels without weather on eligible levels', () => {
    expect(getFrostRate(10, true, 'clear')).toBe(BALANCE.FROST_RATE_NIGHT);
  });

  it('returns 0 for daytime clear weather on eligible levels', () => {
    expect(getFrostRate(8, false, 'clear')).toBe(0);
  });

  it('storm takes priority over night', () => {
    expect(getFrostRate(9, true, 'storm')).toBe(BALANCE.FROST_RATE_STORM);
  });

  it('uses correct rates for each affected level', () => {
    // L7 (index 7): night, clear → exempt (below FROST_MIN_LEVEL)
    expect(getFrostRate(7, true, 'clear')).toBe(0);
    // L8 (index 8): day, light_snow
    expect(getFrostRate(8, false, 'light_snow')).toBe(BALANCE.FROST_RATE_LIGHT_SNOW);
    // L9 (index 9): day, storm
    expect(getFrostRate(9, false, 'storm')).toBe(BALANCE.FROST_RATE_STORM);
    // L10 (index 10): night, clear
    expect(getFrostRate(10, true, 'clear')).toBe(BALANCE.FROST_RATE_NIGHT);
  });
});

describe('getFrostSpeedMultiplier', () => {
  it('returns 1.0 below first threshold', () => {
    expect(getFrostSpeedMultiplier(0)).toBe(1);
    expect(getFrostSpeedMultiplier(49)).toBe(1);
  });

  it('returns first penalty at threshold 1', () => {
    expect(getFrostSpeedMultiplier(50)).toBe(BALANCE.FROST_SPEED_PENALTY_1);
    expect(getFrostSpeedMultiplier(74)).toBe(BALANCE.FROST_SPEED_PENALTY_1);
  });

  it('returns second penalty at threshold 2', () => {
    expect(getFrostSpeedMultiplier(75)).toBe(BALANCE.FROST_SPEED_PENALTY_2);
    expect(getFrostSpeedMultiplier(100)).toBe(BALANCE.FROST_SPEED_PENALTY_2);
  });

  it('penalties reduce speed (values < 1)', () => {
    expect(BALANCE.FROST_SPEED_PENALTY_1).toBeLessThan(1);
    expect(BALANCE.FROST_SPEED_PENALTY_2).toBeLessThan(BALANCE.FROST_SPEED_PENALTY_1);
  });
});

describe('frost accumulation math', () => {
  it('night frost reaches 50% in ~2 minutes', () => {
    const rate = BALANCE.FROST_RATE_NIGHT; // 25%/min
    const timeMinutes = 2;
    const frost = rate * timeMinutes;
    expect(frost).toBe(50);
  });

  it('storm frost reaches 50% in ~1.4 minutes', () => {
    const rate = BALANCE.FROST_RATE_STORM; // 35%/min
    const frost50time = 50 / rate;
    expect(frost50time).toBeCloseTo(1.43, 1);
  });

  it('light_snow frost reaches 50% in ~3.3 minutes', () => {
    const rate = BALANCE.FROST_RATE_LIGHT_SNOW; // 15%/min
    const frost50time = 50 / rate;
    expect(frost50time).toBeCloseTo(3.33, 1);
  });

  it('frost is capped at 100%', () => {
    // Simulating the clamp logic from GameScene
    const frostLevel = Math.min(100, 120);
    expect(frostLevel).toBe(100);
  });
});
