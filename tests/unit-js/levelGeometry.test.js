/**
 * Unit tests for LevelGeometry pure functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LevelGeometry, LEVELS } from './config-wrappers/index.js';

/** Ray-casting point-in-polygon (duplicated from HazardSystem for testing without Phaser). */
function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) &&
        px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

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

  describe('getCliffAvoidRects', () => {
    it('returns empty array when no cliff segments', () => {
      expect(geo.getCliffAvoidRects(16)).toEqual([]);
    });

    it('returns bounding rect for left cliff', () => {
      geo.cliffSegments = [{
        side: 'left', startY: 100, endY: 300,
        offset: 32, extent: 48,
        getX: () => 200,
      }];
      const rects = geo.getCliffAvoidRects(16);
      expect(rects).toHaveLength(1);
      // cliffEnd = 200 - 32 = 168, cliffStart = 168 - 48 = 120
      // leftX = 120 - 16 = 104, rightX = 168 + 16 = 184
      expect(rects[0].startY).toBe(100);
      expect(rects[0].endY).toBe(300);
      expect(rects[0].leftX).toBe(104);
      expect(rects[0].rightX).toBe(184);
    });

    it('returns bounding rect for right cliff', () => {
      geo.cliffSegments = [{
        side: 'right', startY: 50, endY: 250,
        offset: 20, extent: 60,
        getX: () => 400,
      }];
      const rects = geo.getCliffAvoidRects(16);
      expect(rects).toHaveLength(1);
      // cliffStart = 400 + 20 = 420, cliffEnd = 420 + 60 = 480
      // leftX = 420 - 16 = 404, rightX = 480 + 16 = 496
      expect(rects[0].leftX).toBe(404);
      expect(rects[0].rightX).toBe(496);
    });

    it('returns one rect per cliff segment', () => {
      geo.cliffSegments = [
        { side: 'left', startY: 10, endY: 50, offset: 5, extent: 10, getX: () => 100 },
        { side: 'right', startY: 60, endY: 120, offset: 5, extent: 10, getX: () => 300 },
      ];
      expect(geo.getCliffAvoidRects(16)).toHaveLength(2);
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

    it('cliff levels have segments with valid tile ranges', () => {
      // Level 7 (La Verticale) has cliffs
      geo.reset();
      geo.generate(LEVELS[7], 32);
      expect(geo.cliffSegments.length).toBeGreaterThan(0);
      for (const cliff of geo.cliffSegments) {
        const offsetTiles = cliff.offset / 32;
        const extentTiles = cliff.extent / 32;
        expect(offsetTiles).toBeGreaterThanOrEqual(1.4);
        expect(offsetTiles).toBeLessThanOrEqual(3.1);
        expect(extentTiles).toBeGreaterThanOrEqual(2.9);
        expect(extentTiles).toBeLessThanOrEqual(5.1);
      }
    });

    it('tutorial has no cliffs', () => {
      geo.reset();
      geo.generate(LEVELS[0], 32);
      expect(geo.cliffSegments.length).toBe(0);
    });

    it('levels with accessPaths generate rects with side field', () => {
      for (const level of LEVELS) {
        if (!level.accessPaths?.length) continue;
        geo.reset();
        geo.generate(level, 32);
        expect(geo.accessPathRects.length).toBeGreaterThan(0);
        for (const rect of geo.accessPathRects) {
          expect(rect.side).toMatch(/^(left|right)$/);
        }
      }
    });

    it('levels with accessPaths generate matching curve count', () => {
      for (const level of LEVELS) {
        if (!level.accessPaths?.length) continue;
        geo.reset();
        geo.generate(level, 32);
        expect(geo.accessPathCurves.length).toBe(level.accessPaths.length);
      }
    });
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ];

  it('detects point inside a square', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
  });

  it('rejects point outside a square', () => {
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(-1, 5, square)).toBe(false);
    expect(pointInPolygon(5, -1, square)).toBe(false);
    expect(pointInPolygon(5, 11, square)).toBe(false);
  });

  it('works with irregular polygon', () => {
    const triangle = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 },
    ];
    expect(pointInPolygon(5, 3, triangle)).toBe(true);
    expect(pointInPolygon(0, 10, triangle)).toBe(false);
    expect(pointInPolygon(9, 9, triangle)).toBe(false);
  });

  it('works with concave polygon', () => {
    // L-shape: concave polygon
    const lShape = [
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 },
      { x: 10, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    expect(pointInPolygon(2, 2, lShape)).toBe(true);   // top-left arm
    expect(pointInPolygon(7, 7, lShape)).toBe(true);    // bottom-right arm
    expect(pointInPolygon(7, 2, lShape)).toBe(false);   // concave notch
  });
});
