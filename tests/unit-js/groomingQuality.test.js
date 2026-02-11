import { describe, it, expect } from 'vitest';

/**
 * Grooming quality unit tests.
 * Pure math functions duplicated from GameScene since they can't be imported
 * (GameScene depends on Phaser). Same pattern as pointInPolygon tests.
 */

/** Normalize angle difference to [-π, π] range */
function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Map quality value (0–1) to a groomed snow texture key */
function getGroomedTexture(quality) {
  if (quality >= 0.8) return 'snow_groomed';
  if (quality >= 0.5) return 'snow_groomed_med';
  return 'snow_groomed_rough';
}

/** Compute steering stability from angular acceleration */
function computeStability(angularAccel) {
  const maxAccel = 15;
  return Math.max(0.2, Math.min(1.0, 1.0 - angularAccel / maxAccel));
}

/** Compute fall-line alignment from groomer rotation */
function computeFallLineAlignment(rotation) {
  const cos = Math.cos(rotation);
  return 0.3 + 0.7 * cos * cos;
}

/** Compute combined grooming quality */
function computeQuality(stability, alignment) {
  return stability * 0.5 + alignment * 0.5;
}

describe('normalizeAngle', () => {
  it('returns 0 for 0', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
  });

  it('normalizes 2π to 0', () => {
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0);
  });

  it('normalizes -2π to 0', () => {
    expect(normalizeAngle(-2 * Math.PI)).toBeCloseTo(0);
  });

  it('normalizes 3π to π', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
  });

  it('normalizes -3π to -π', () => {
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI);
  });

  it('passes through π/2', () => {
    expect(normalizeAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });
});

describe('getGroomedTexture', () => {
  it('returns high quality texture for quality >= 0.8', () => {
    expect(getGroomedTexture(0.8)).toBe('snow_groomed');
    expect(getGroomedTexture(1.0)).toBe('snow_groomed');
    expect(getGroomedTexture(0.95)).toBe('snow_groomed');
  });

  it('returns medium quality texture for 0.5 <= quality < 0.8', () => {
    expect(getGroomedTexture(0.5)).toBe('snow_groomed_med');
    expect(getGroomedTexture(0.65)).toBe('snow_groomed_med');
    expect(getGroomedTexture(0.79)).toBe('snow_groomed_med');
  });

  it('returns rough texture for quality < 0.5', () => {
    expect(getGroomedTexture(0.0)).toBe('snow_groomed_rough');
    expect(getGroomedTexture(0.3)).toBe('snow_groomed_rough');
    expect(getGroomedTexture(0.49)).toBe('snow_groomed_rough');
  });
});

describe('computeStability', () => {
  it('returns 1.0 for zero angular acceleration (straight line)', () => {
    expect(computeStability(0)).toBe(1.0);
  });

  it('returns 0.2 for very high angular acceleration (zigzag)', () => {
    expect(computeStability(20)).toBe(0.2);
    expect(computeStability(100)).toBe(0.2);
  });

  it('returns intermediate values for moderate acceleration', () => {
    const val = computeStability(7.5);
    expect(val).toBeCloseTo(0.5);
  });

  it('clamps minimum to 0.2', () => {
    expect(computeStability(15)).toBe(0.2);
    expect(computeStability(30)).toBe(0.2);
  });
});

describe('computeFallLineAlignment', () => {
  it('returns 1.0 when driving straight up (rotation = 0)', () => {
    // rotation=0 means driving up (cos(0)=1, cos²=1)
    expect(computeFallLineAlignment(0)).toBeCloseTo(1.0);
  });

  it('returns 1.0 when driving straight down (rotation = π)', () => {
    // cos(π)=-1, cos²=1
    expect(computeFallLineAlignment(Math.PI)).toBeCloseTo(1.0);
  });

  it('returns 0.3 when driving perpendicular (rotation = π/2)', () => {
    // cos(π/2)=0, 0.3 + 0.7*0 = 0.3
    expect(computeFallLineAlignment(Math.PI / 2)).toBeCloseTo(0.3);
  });

  it('returns 0.3 when driving perpendicular left (rotation = -π/2)', () => {
    expect(computeFallLineAlignment(-Math.PI / 2)).toBeCloseTo(0.3);
  });

  it('returns intermediate for 45° angle', () => {
    // cos(π/4)=√2/2, cos²=0.5, result = 0.3 + 0.7*0.5 = 0.65
    expect(computeFallLineAlignment(Math.PI / 4)).toBeCloseTo(0.65);
  });
});

describe('computeQuality', () => {
  it('returns 1.0 for perfect stability and alignment', () => {
    expect(computeQuality(1.0, 1.0)).toBe(1.0);
  });

  it('returns minimum for worst stability and alignment', () => {
    // stability floor is 0.2, alignment floor is 0.3
    expect(computeQuality(0.2, 0.3)).toBeCloseTo(0.25);
  });

  it('50/50 weighting', () => {
    expect(computeQuality(0.8, 0.4)).toBeCloseTo(0.6);
    expect(computeQuality(0.4, 0.8)).toBeCloseTo(0.6);
  });

  it('high stability compensates for poor alignment', () => {
    const q = computeQuality(1.0, 0.3);
    expect(q).toBeCloseTo(0.65);
  });

  it('high alignment compensates for poor stability', () => {
    const q = computeQuality(0.2, 1.0);
    expect(q).toBeCloseTo(0.6);
  });
});

describe('best-of-N re-grooming', () => {
  it('upgrades quality when re-groomed at higher quality', () => {
    let cellQuality = 0.4;
    let qualitySum = 0.4;
    const newQuality = 0.8;

    if (newQuality > cellQuality) {
      qualitySum += newQuality - cellQuality;
      cellQuality = newQuality;
    }

    expect(cellQuality).toBe(0.8);
    expect(qualitySum).toBeCloseTo(0.8);
  });

  it('does not downgrade quality when re-groomed at lower quality', () => {
    let cellQuality = 0.8;
    let qualitySum = 0.8;
    const newQuality = 0.4;

    if (newQuality > cellQuality) {
      qualitySum += newQuality - cellQuality;
      cellQuality = newQuality;
    }

    expect(cellQuality).toBe(0.8);
    expect(qualitySum).toBeCloseTo(0.8);
  });

  it('averages correctly over multiple tiles', () => {
    const qualities = [0.9, 0.5, 0.7, 0.3];
    const sum = qualities.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / qualities.length) * 100);
    expect(avg).toBe(60);
  });
});
