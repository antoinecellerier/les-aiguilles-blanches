import { describe, it, expect } from 'vitest';

// Test the ParkFeatureSystem logic (zone detection, direction override, hitbox)
// We test the math and data structures without Phaser dependencies.

describe('ParkFeatureSystem zones', () => {
  // Simulate zone detection logic
  function isInZone(tileX, tileY, zone) {
    return tileX >= zone.minX && tileX < zone.maxX &&
           tileY >= zone.minY && tileY < zone.maxY;
  }

  const approachZone = {
    type: 'approach',
    minX: 10, minY: 5,
    maxX: 16, maxY: 9,
    optimalDirection: Math.PI / 2,
  };

  const landingZone = {
    type: 'landing',
    minX: 10, minY: 14,
    maxX: 16, maxY: 19,
    optimalDirection: Math.PI / 2,
  };

  it('detects tile inside approach zone', () => {
    expect(isInZone(12, 6, approachZone)).toBe(true);
  });

  it('rejects tile outside zone', () => {
    expect(isInZone(5, 6, approachZone)).toBe(false);
    expect(isInZone(12, 20, approachZone)).toBe(false);
  });

  it('detects tile inside landing zone', () => {
    expect(isInZone(13, 16, landingZone)).toBe(true);
  });

  it('zone boundary is exclusive on max side', () => {
    expect(isInZone(16, 6, approachZone)).toBe(false); // maxX exclusive
    expect(isInZone(12, 9, approachZone)).toBe(false); // maxY exclusive
  });
});

describe('direction override alignment', () => {
  // Replicate the alignment formula from GameScene
  function computeAlignment(groomerAngle, optimalDirection) {
    const cos = Math.cos(groomerAngle - optimalDirection);
    return 0.3 + 0.7 * cos * cos;
  }

  it('perfect alignment along zone axis', () => {
    // Grooming straight down (π/2) when zone optimal is π/2
    const alignment = computeAlignment(Math.PI / 2, Math.PI / 2);
    expect(alignment).toBeCloseTo(1.0, 2);
  });

  it('perfect alignment going up (opposite direction still aligned)', () => {
    // Grooming straight up (-π/2) — cos²(π) = 1
    const alignment = computeAlignment(-Math.PI / 2, Math.PI / 2);
    expect(alignment).toBeCloseTo(1.0, 2);
  });

  it('perpendicular to zone axis = minimum alignment', () => {
    // Grooming horizontally (0) when zone optimal is π/2
    const alignment = computeAlignment(0, Math.PI / 2);
    expect(alignment).toBeCloseTo(0.3, 2);
  });

  it('45-degree angle to zone axis', () => {
    const alignment = computeAlignment(Math.PI / 4, Math.PI / 2);
    // cos²(π/4) = 0.5, so alignment = 0.3 + 0.7 * 0.5 = 0.65
    expect(alignment).toBeCloseTo(0.65, 2);
  });
});

describe('forgiving hitbox', () => {
  // Simulate hitbox shrink (70% of visual)
  function makeHitbox(centerX, centerY, visualW, visualH) {
    const shrinkW = visualW * 0.15;
    const shrinkH = visualH * 0.15;
    return {
      minX: centerX - visualW / 2 + shrinkW,
      minY: centerY - visualH / 2 + shrinkH,
      maxX: centerX + visualW / 2 - shrinkW,
      maxY: centerY + visualH / 2 - shrinkH,
    };
  }

  function isOnFeature(px, py, hitbox) {
    return px >= hitbox.minX && px <= hitbox.maxX &&
           py >= hitbox.minY && py <= hitbox.maxY;
  }

  const kicker = makeHitbox(100, 200, 48, 80);

  it('center of feature = hit', () => {
    expect(isOnFeature(100, 200, kicker)).toBe(true);
  });

  it('edge of visual = miss (forgiving)', () => {
    // Visual edge at x=76, hitbox starts at 76 + 7.2 = 83.2
    expect(isOnFeature(77, 200, kicker)).toBe(false);
  });

  it('just inside hitbox = hit', () => {
    expect(isOnFeature(84, 200, kicker)).toBe(true);
  });

  it('hitbox is ~70% of visual size', () => {
    const w = kicker.maxX - kicker.minX;
    const h = kicker.maxY - kicker.minY;
    expect(w / 48).toBeCloseTo(0.7, 1);
    expect(h / 80).toBeCloseTo(0.7, 1);
  });
});

describe('halfpipe floor detection', () => {
  // Simulate halfpipe floor narrowing
  function isOnPipeFloor(tileX, tileY, floorLeft, floorRight) {
    const fl = floorLeft[tileY];
    const fr = floorRight[tileY];
    if (fl === undefined) return false;
    return tileX >= fl && tileX < fr;
  }

  function isInWall(tileX, tileY, floorLeft, floorRight) {
    const fl = floorLeft[tileY];
    const fr = floorRight[tileY];
    if (fl === undefined) return false;
    return tileX < fl || tileX >= fr;
  }

  // 20-wide piste, 3-tile walls on each side = 14-tile floor
  const floorLeft = Array(60).fill(3);
  const floorRight = Array(60).fill(17);

  it('center of pipe = floor', () => {
    expect(isOnPipeFloor(10, 30, floorLeft, floorRight)).toBe(true);
  });

  it('left wall = not floor', () => {
    expect(isOnPipeFloor(1, 30, floorLeft, floorRight)).toBe(false);
    expect(isInWall(1, 30, floorLeft, floorRight)).toBe(true);
  });

  it('right wall = not floor', () => {
    expect(isOnPipeFloor(18, 30, floorLeft, floorRight)).toBe(false);
    expect(isInWall(18, 30, floorLeft, floorRight)).toBe(true);
  });

  it('floor boundary left edge = floor', () => {
    expect(isOnPipeFloor(3, 30, floorLeft, floorRight)).toBe(true);
  });

  it('floor boundary right edge = wall (exclusive)', () => {
    expect(isOnPipeFloor(17, 30, floorLeft, floorRight)).toBe(false);
  });
});

describe('pipe_mastery bonus objective type', () => {
  it('pipe_mastery is a valid BonusObjectiveType', async () => {
    const { LEVELS } = await import('../../src/config/levels.ts');
    const tube = LEVELS.find(l => l.id === 6);
    expect(tube).toBeDefined();
    const pipeMastery = tube.bonusObjectives?.find(o => o.type === 'pipe_mastery');
    expect(pipeMastery).toBeDefined();
    expect(pipeMastery.target).toBe(80);
  });

  it('L6 has halfpipe special feature', async () => {
    const { LEVELS } = await import('../../src/config/levels.ts');
    const tube = LEVELS.find(l => l.id === 6);
    expect(tube.specialFeatures).toContain('halfpipe');
  });

  it('L3 has kickers and rails', async () => {
    const { LEVELS } = await import('../../src/config/levels.ts');
    const airZone = LEVELS.find(l => l.id === 3);
    expect(airZone.specialFeatures).toContain('kickers');
    expect(airZone.specialFeatures).toContain('rails');
  });
});

describe('localization strings', () => {
  it('all 14 locales have feature taunts and pipe mastery', async () => {
    const { TRANSLATIONS } = await import('../../src/config/localization.ts');
    
    const requiredKeys = [
      'featureDestroyedKicker',
      'featureDestroyedRail',
      'tauntFeature1', 'tauntFeature2', 'tauntFeature3', 'tauntFeature4', 'tauntFeature5',
      'bonusPipeMastery',
    ];

    for (const lang of Object.keys(TRANSLATIONS)) {
      const translations = TRANSLATIONS[lang];
      for (const key of requiredKeys) {
        expect(translations[key], `Missing ${key} in ${lang}`).toBeDefined();
        expect(typeof translations[key]).toBe('string');
        expect(translations[key].length).toBeGreaterThan(0);
      }
    }
  });
});
