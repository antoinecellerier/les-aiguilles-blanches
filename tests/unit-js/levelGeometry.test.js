/**
 * Unit tests for LevelGeometry pure functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LevelGeometry, LEVELS } from './config-wrappers/index.js';

/** Minimal Level fixture for testing */
function mockLevel(overrides = {}) {
  return {
    id: 1, nameKey: 'test', taskKey: 'test', difficulty: 'green',
    timeLimit: 120, targetCoverage: 80, width: 20, height: 30,
    hasWinch: false, isNight: false, weather: 'clear',
    obstacles: [], pisteShape: 'straight', pisteWidth: 10,
    steepZones: [], winchAnchors: [], ...overrides,
  };
}

describe('LevelGeometry', () => {
  let geo;

  beforeEach(() => {
    geo = new LevelGeometry();
  });

  describe('pathEdges', () => {
    it('computes left and right pixel edges from center and width', () => {
      const path = { centerX: 10, width: 6 };
      const result = geo.pathEdges(path, 32);
      expect(result.left).toBe((10 - 3) * 32);  // 224
      expect(result.right).toBe((10 + 3) * 32);  // 416
    });

    it('handles tileSize 1 (identity)', () => {
      const path = { centerX: 5, width: 4 };
      const result = geo.pathEdges(path, 1);
      expect(result.left).toBe(3);
      expect(result.right).toBe(7);
    });

    it('handles odd widths', () => {
      const path = { centerX: 10, width: 5 };
      const result = geo.pathEdges(path, 10);
      expect(result.left).toBe(75);
      expect(result.right).toBe(125);
    });
  });

  describe('isInPiste', () => {
    it('returns false for y in top boundary rows', () => {
      const level = mockLevel();
      geo.generate(level, 32);
      expect(geo.isInPiste(10, 0, level)).toBe(false);
      expect(geo.isInPiste(10, 1, level)).toBe(false);
      expect(geo.isInPiste(10, 2, level)).toBe(false);
    });

    it('returns false for y in bottom boundary rows', () => {
      const level = mockLevel({ height: 30 });
      geo.generate(level, 32);
      expect(geo.isInPiste(10, 28, level)).toBe(false);
      expect(geo.isInPiste(10, 29, level)).toBe(false);
    });

    it('returns true for coords inside the piste path', () => {
      const level = mockLevel({ width: 20, height: 30, pisteWidth: 10 });
      geo.generate(level, 32);
      // Mid-row should be in piste at center
      const midY = 15;
      const path = geo.pistePath[midY];
      expect(path).toBeDefined();
      expect(geo.isInPiste(path.centerX, midY, level)).toBe(true);
    });

    it('returns false for coords outside the piste path', () => {
      const level = mockLevel({ width: 20, height: 30, pisteWidth: 10 });
      geo.generate(level, 32);
      const midY = 15;
      // Far left should be outside
      expect(geo.isInPiste(0, midY, level)).toBe(false);
    });

    it('returns true when pistePath is not populated for a row', () => {
      const level = mockLevel();
      // Don't generate — pistePath is empty
      expect(geo.isInPiste(10, 5, level)).toBe(true);
    });
  });

  describe('isOnCliff', () => {
    it('returns false when no cliff segments exist', () => {
      expect(geo.isOnCliff(10, 10)).toBe(false);
    });

    it('detects left-side cliff', () => {
      geo.cliffSegments = [{
        side: 'left', startY: 5, endY: 15,
        offset: 2, extent: 3,
        getX: () => 10,
      }];
      // Cliff zone: cliffEnd = 10 - 2 = 8, cliffStart = 8 - 3 = 5
      expect(geo.isOnCliff(6, 10)).toBe(true);   // inside [5, 8]
      expect(geo.isOnCliff(5, 10)).toBe(true);    // at start
      expect(geo.isOnCliff(8, 10)).toBe(true);    // at end
      expect(geo.isOnCliff(4, 10)).toBe(false);   // outside left
      expect(geo.isOnCliff(9, 10)).toBe(false);   // outside right
    });

    it('detects right-side cliff', () => {
      geo.cliffSegments = [{
        side: 'right', startY: 5, endY: 15,
        offset: 2, extent: 3,
        getX: () => 10,
      }];
      // Cliff zone: cliffStart = 10 + 2 = 12, cliffEnd = 12 + 3 = 15
      expect(geo.isOnCliff(13, 10)).toBe(true);   // inside [12, 15]
      expect(geo.isOnCliff(12, 10)).toBe(true);    // at start
      expect(geo.isOnCliff(15, 10)).toBe(true);    // at end
      expect(geo.isOnCliff(11, 10)).toBe(false);   // outside left
      expect(geo.isOnCliff(16, 10)).toBe(false);   // outside right
    });

    it('rejects y outside cliff vertical range', () => {
      geo.cliffSegments = [{
        side: 'left', startY: 5, endY: 15,
        offset: 2, extent: 3,
        getX: () => 10,
      }];
      expect(geo.isOnCliff(6, 4)).toBe(false);   // above
      expect(geo.isOnCliff(6, 16)).toBe(false);  // below
      expect(geo.isOnCliff(6, 5)).toBe(true);    // at startY
      expect(geo.isOnCliff(6, 15)).toBe(true);   // at endY
    });
  });

  describe('isOnAccessPath', () => {
    it('returns false when no access paths exist', () => {
      expect(geo.isOnAccessPath(10, 10)).toBe(false);
    });

    it('detects coords inside an access path rect', () => {
      geo.accessPathRects = [{
        startY: 5, endY: 15, leftX: 10, rightX: 20,
        side: 'left', pathIndex: 0,
      }];
      expect(geo.isOnAccessPath(15, 10)).toBe(true);
      expect(geo.isOnAccessPath(10, 5)).toBe(true);   // at boundary
      expect(geo.isOnAccessPath(20, 15)).toBe(true);  // at boundary
    });

    it('rejects coords outside access path rect', () => {
      geo.accessPathRects = [{
        startY: 5, endY: 15, leftX: 10, rightX: 20,
        side: 'left', pathIndex: 0,
      }];
      expect(geo.isOnAccessPath(9, 10)).toBe(false);   // left of rect
      expect(geo.isOnAccessPath(21, 10)).toBe(false);  // right of rect
      expect(geo.isOnAccessPath(15, 4)).toBe(false);   // above rect
      expect(geo.isOnAccessPath(15, 16)).toBe(false);  // below rect
    });

    it('checks multiple rects', () => {
      geo.accessPathRects = [
        { startY: 0, endY: 5, leftX: 0, rightX: 10, side: 'left', pathIndex: 0 },
        { startY: 20, endY: 25, leftX: 30, rightX: 40, side: 'right', pathIndex: 1 },
      ];
      expect(geo.isOnAccessPath(5, 3)).toBe(true);    // first rect
      expect(geo.isOnAccessPath(35, 22)).toBe(true);   // second rect
      expect(geo.isOnAccessPath(15, 10)).toBe(false);  // between rects
    });
  });

  describe('reset', () => {
    it('clears all geometry arrays', () => {
      const level = mockLevel();
      geo.generate(level, 32);
      expect(geo.pistePath.length).toBeGreaterThan(0);

      geo.reset();
      expect(geo.pistePath).toEqual([]);
      expect(geo.steepZoneRects).toEqual([]);
      expect(geo.accessPathRects).toEqual([]);
      expect(geo.accessEntryZones).toEqual([]);
      expect(geo.accessPathCurves).toEqual([]);
      expect(geo.cliffSegments).toEqual([]);
    });
  });

  describe('generate with real levels', () => {
    it('generates piste path for tutorial level', () => {
      const tutorial = LEVELS[0];
      geo.generate(tutorial, 32);
      expect(geo.pistePath.length).toBe(tutorial.height);
      // Every row should have a valid path
      for (let y = 0; y < tutorial.height; y++) {
        expect(geo.pistePath[y]).toBeDefined();
        expect(geo.pistePath[y].centerX).toBeGreaterThan(0);
        expect(geo.pistePath[y].width).toBeGreaterThan(0);
      }
    });

    it('generates geometry for all levels without errors', () => {
      for (const level of LEVELS) {
        geo.reset();
        expect(() => geo.generate(level, 32)).not.toThrow();
        expect(geo.pistePath.length).toBe(level.height);
      }
    });
  });
});
