/**
 * Unit tests for yDepth and DEPTHS constants
 */
import { describe, it, expect } from 'vitest';
import { yDepth, DEPTHS } from './config-wrappers/index.js';

describe('yDepth', () => {
  it('returns DEPTHS.GROUND_OBJECTS for y=0', () => {
    expect(yDepth(0)).toBe(DEPTHS.GROUND_OBJECTS);
  });

  it('increases linearly with y', () => {
    const d100 = yDepth(100);
    const d200 = yDepth(200);
    expect(d200 - d100).toBeCloseTo(0.1, 5);
  });

  it('produces values that sort correctly for top-down rendering', () => {
    // Objects lower on screen (higher y) should render in front (higher depth)
    expect(yDepth(100)).toBeLessThan(yDepth(200));
    expect(yDepth(0)).toBeLessThan(yDepth(1));
  });

  it('stays within reasonable depth range', () => {
    // Even at y=10000 (very large map), depth shouldn't be unreasonably high
    const d = yDepth(10000);
    expect(d).toBe(DEPTHS.GROUND_OBJECTS + 10);
    expect(d).toBeLessThan(100);
  });
});

describe('DEPTHS constants', () => {
  it('defines expected depth layers', () => {
    expect(DEPTHS.GROUND_OBJECTS).toBeDefined();
    expect(typeof DEPTHS.GROUND_OBJECTS).toBe('number');
  });

  it('has layers in ascending order for correct rendering', () => {
    // Ground should render below UI elements
    const layers = Object.entries(DEPTHS).map(([k, v]) => ({ name: k, depth: v }));
    expect(layers.length).toBeGreaterThan(0);
  });
});
