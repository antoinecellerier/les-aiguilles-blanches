/**
 * ParkFeatureSystem — Manages terrain park features (kickers, rails, halfpipe)
 *
 * Features are placed at fixed positions within the piste and act as obstacles.
 * Each feature defines surrounding zones (approach, landing, run-in, run-out, pipe_floor)
 * with optimal grooming directions that override the default fall-line alignment.
 *
 * Driving or grooming onto a feature = instant fail (feature destruction).
 * Hitboxes are forgiving (~70% of visual size).
 */

import { DEPTHS, yDepth } from '../config/gameConfig';
import type { Level, SpecialFeature } from '../config/levels';
import type { LevelGeometry } from './LevelGeometry';

export type ParkZoneType = 'approach' | 'landing' | 'run_in' | 'run_out' | 'pipe_floor';

export interface ParkFeatureDef {
  type: 'kicker' | 'rail';
  /** Center position in tile coordinates */
  tileX: number;
  tileY: number;
  /** Orientation angle in radians (0 = pointing down the fall line) */
  angle: number;
}

export interface ParkZone {
  type: ParkZoneType;
  /** Axis-aligned bounding box in tile coordinates */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Optimal grooming direction in radians (0 = right, π/2 = down) */
  optimalDirection: number;
}

interface FeatureInstance {
  def: ParkFeatureDef;
  /** Physics hitbox (forgiving, ~70% of visual) */
  hitboxMinX: number;
  hitboxMinY: number;
  hitboxMaxX: number;
  hitboxMaxY: number;
  /** Visual bounds in pixels */
  visualX: number;
  visualY: number;
  visualW: number;
  visualH: number;
  zones: ParkZone[];
}

interface HalfpipeData {
  /** Pipe floor boundaries in tile coordinates per row */
  floorLeft: number[];
  floorRight: number[];
  /** Optimal grooming direction (along pipe axis = vertical = π/2) */
  optimalDirection: number;
}

// Real terrain parks use parallel "lines" — a jump line and a jib line.
// Riders pick a line and follow it straight down. Features within a line
// share the same X offset, spaced vertically for approach/landing zones.
// tileX is offset from piste center; positive = right, negative = left
const KICKER_LINE_X = -5; // jump line on the left
const RAIL_LINE_X = 5;    // jib line on the right

const KICKER_LAYOUT: ParkFeatureDef[] = [
  { type: 'kicker', tileX: KICKER_LINE_X, tileY: 15, angle: 0 },
  { type: 'kicker', tileX: KICKER_LINE_X, tileY: 27, angle: 0 },
  { type: 'kicker', tileX: KICKER_LINE_X, tileY: 39, angle: 0 },
];

const RAIL_LAYOUT: ParkFeatureDef[] = [
  { type: 'rail', tileX: RAIL_LINE_X, tileY: 18, angle: 0 },
  { type: 'rail', tileX: RAIL_LINE_X, tileY: 30, angle: 0 },
  { type: 'rail', tileX: RAIL_LINE_X, tileY: 42, angle: 0 },
];

// Feature dimensions in tiles (kept small — features are obstacles, not terrain)
const KICKER_W = 3;
const KICKER_H = 2;
const RAIL_W = 1;
const RAIL_H = 3;
// Zone depth (tiles before/after a feature)
const APPROACH_DEPTH = 3;
const LANDING_DEPTH = 4;
const RUN_DEPTH = 2;
// Halfpipe wall thickness in tiles
const PIPE_WALL_TILES = 3;

export class ParkFeatureSystem {
  private features: FeatureInstance[] = [];
  private allZones: ParkZone[] = [];
  private halfpipe: HalfpipeData | null = null;
  private tileSize = 16;
  private gameObjects: Phaser.GameObjects.GameObject[] = [];
  private _featureGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private _pipeWallGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  /**
   * Generate and place park features based on level config.
   * Returns a physics static group for collision.
   */
  create(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry,
    tileSize: number
  ): void {
    this.tileSize = tileSize;
    this.features = [];
    this.allZones = [];
    this.halfpipe = null;
    this.gameObjects = [];

    const featureGroup = scene.physics.add.staticGroup();
    this._featureGroup = featureGroup;
    const specials = level.specialFeatures || [];

    if (specials.includes('kickers') || specials.includes('rails')) {
      this.placeFeatures(scene, level, geometry, featureGroup, specials);
    }

    if (specials.includes('halfpipe')) {
      this.createHalfpipe(scene, level, geometry);
      this.createPipeWallColliders(scene, level);
    }
  }

  private placeFeatures(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry,
    group: Phaser.Physics.Arcade.StaticGroup,
    specials: SpecialFeature[]
  ): void {
    const layouts: ParkFeatureDef[] = [];
    if (specials.includes('kickers')) layouts.push(...KICKER_LAYOUT);
    if (specials.includes('rails')) layouts.push(...RAIL_LAYOUT);

    // Render line corridors first (behind features)
    this.renderLineCorridors(scene, level, geometry, specials);

    for (const def of layouts) {
      const path = geometry.pistePath[def.tileY];
      if (!path) continue;

      const absTileX = path.centerX + def.tileX;
      const halfW = path.width / 2;
      // Ensure feature is within piste bounds (with margin)
      const featureHalfW = def.type === 'kicker' ? KICKER_W / 2 : RAIL_W / 2;
      if (absTileX - featureHalfW < path.centerX - halfW + 1) continue;
      if (absTileX + featureHalfW > path.centerX + halfW - 1) continue;

      const fw = def.type === 'kicker' ? KICKER_W : RAIL_W;
      const fh = def.type === 'kicker' ? KICKER_H : RAIL_H;

      const pixelX = absTileX * this.tileSize;
      const pixelY = def.tileY * this.tileSize;
      const pixelW = fw * this.tileSize;
      const pixelH = fh * this.tileSize;

      // Forgiving hitbox (~70% of visual)
      const shrinkW = pixelW * 0.15;
      const shrinkH = pixelH * 0.15;

      const inst: FeatureInstance = {
        def: { ...def, tileX: absTileX },
        hitboxMinX: pixelX - pixelW / 2 + shrinkW,
        hitboxMinY: pixelY - pixelH / 2 + shrinkH,
        hitboxMaxX: pixelX + pixelW / 2 - shrinkW,
        hitboxMaxY: pixelY + pixelH / 2 - shrinkH,
        visualX: pixelX - pixelW / 2,
        visualY: pixelY - pixelH / 2,
        visualW: pixelW,
        visualH: pixelH,
        zones: [],
      };

      // Create zones around the feature
      // Fall-line direction is vertical (π/2 in Phaser coords = straight down)
      const optDir = Math.PI / 2; // along fall line through the feature

      if (def.type === 'kicker') {
        // Approach zone: above the kicker
        inst.zones.push({
          type: 'approach',
          minX: absTileX - Math.ceil(fw / 2) - 1,
          minY: def.tileY - Math.ceil(fh / 2) - APPROACH_DEPTH,
          maxX: absTileX + Math.ceil(fw / 2) + 1,
          maxY: def.tileY - Math.ceil(fh / 2),
          optimalDirection: optDir,
        });
        // Landing zone: below the kicker
        inst.zones.push({
          type: 'landing',
          minX: absTileX - Math.ceil(fw / 2) - 1,
          minY: def.tileY + Math.ceil(fh / 2),
          maxX: absTileX + Math.ceil(fw / 2) + 1,
          maxY: def.tileY + Math.ceil(fh / 2) + LANDING_DEPTH,
          optimalDirection: optDir,
        });
      } else {
        // Rail: run-in (above) and run-out (below)
        inst.zones.push({
          type: 'run_in',
          minX: absTileX - Math.ceil(fw / 2) - 1,
          minY: def.tileY - Math.ceil(fh / 2) - RUN_DEPTH,
          maxX: absTileX + Math.ceil(fw / 2) + 1,
          maxY: def.tileY - Math.ceil(fh / 2),
          optimalDirection: optDir,
        });
        inst.zones.push({
          type: 'run_out',
          minX: absTileX - Math.ceil(fw / 2) - 1,
          minY: def.tileY + Math.ceil(fh / 2),
          maxX: absTileX + Math.ceil(fw / 2) + 1,
          maxY: def.tileY + Math.ceil(fh / 2) + RUN_DEPTH,
          optimalDirection: optDir,
        });
      }

      this.features.push(inst);
      this.allZones.push(...inst.zones);

      // Physics sprite for collision (invisible, forgiving hitbox)
      const texKey = def.type === 'kicker' ? 'park_kicker' : 'park_rail';
      const sprite = group.create(pixelX, pixelY, texKey) as Phaser.Physics.Arcade.Sprite;
      const hitW = pixelW * 0.7;
      const hitH = pixelH * 0.7;
      sprite.setDisplaySize(hitW, hitH);
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(hitW, hitH);
      sprite.setDepth(yDepth(pixelY));
      sprite.setAlpha(0); // invisible — we render separately

      // Render visible feature graphic
      this.renderFeature(scene, inst);
    }
  }

  private renderFeature(scene: Phaser.Scene, inst: FeatureInstance): void {
    const g = scene.add.graphics();
    g.setDepth(yDepth(inst.visualY + inst.visualH / 2));

    if (inst.def.type === 'kicker') {
      // Kicker: wide tabletop ramp (SkiFree pixel style)
      // Real kickers are wider than tall — a packed snow takeoff ramp
      const x = inst.visualX;
      const y = inst.visualY;
      const w = inst.visualW;
      const h = inst.visualH;
      const steps = 2;
      const stepH = Math.floor(h / steps);

      // Ground shadow (makes kicker pop against white snow)
      g.fillStyle(0xb0bcc8, 0.6);
      g.fillRect(x + 2, y + 2, w, h);

      // Base tier (full width, packed snow)
      g.fillStyle(0xdce4ee, 1);
      g.fillRect(x, y + stepH, w, stepH);
      // Base edge
      g.fillStyle(0xa8b8c8, 0.8);
      g.fillRect(x, y + h - 1, w, 1);

      // Top tier / lip (narrower, lighter)
      const lipW = Math.floor(w * 0.7);
      const lipX = x + Math.floor((w - lipW) / 2);
      g.fillStyle(0xeef2fa, 1);
      g.fillRect(lipX, y, lipW, stepH);
      // Lip edge (the takeoff edge — most visible part)
      g.fillStyle(0x8899aa, 1);
      g.fillRect(lipX, y + stepH - 1, lipW, 1);
      // Top highlight
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(lipX + 1, y, lipW - 2, 1);
    } else {
      // Rail: metallic bar on support posts
      const x = inst.visualX;
      const y = inst.visualY;
      const w = inst.visualW;
      const h = inst.visualH;
      const barW = Math.max(2, Math.floor(w * 0.35));
      const barX = x + Math.floor((w - barW) / 2);

      // Support posts (top, middle, bottom)
      const postW = Math.max(4, Math.floor(w * 0.6));
      const postH = 3;
      const postX = x + Math.floor((w - postW) / 2);
      g.fillStyle(0x444455, 1);
      g.fillRect(postX, y, postW, postH);
      g.fillRect(postX, y + Math.floor(h / 2) - 1, postW, postH);
      g.fillRect(postX, y + h - postH, postW, postH);

      // Main rail bar
      g.fillStyle(0x666677, 1);
      g.fillRect(barX, y, barW, h);

      // Highlight stripe (metallic sheen)
      g.fillStyle(0x9999bb, 0.8);
      g.fillRect(barX, y, 1, h);
    }

    this.gameObjects.push(g);

    // Render zone paint marks (takeoff/landing lines)
    this.renderZoneMarks(scene, inst);
  }

  /**
   * Render paint marks at feature takeoff and landing points.
   * Real parks paint solid colored lines at the lip and landing sweet-spot.
   */
  private renderZoneMarks(scene: Phaser.Scene, inst: FeatureInstance): void {
    const g = scene.add.graphics();
    g.setDepth(DEPTHS.PISTE + 0.5);
    const ts = this.tileSize;

    for (const zone of inst.zones) {
      const x = zone.minX * ts;
      const w = (zone.maxX - zone.minX) * ts;

      if (zone.type === 'approach' || zone.type === 'run_in') {
        // Paint line at the bottom of approach/run-in (takeoff mark)
        const lineY = zone.maxY * ts - 1;
        g.fillStyle(0x2266cc, 0.4);
        g.fillRect(x, lineY, w, 2);
      } else {
        // Paint line at the top of landing/run-out (landing mark)
        const lineY = zone.minY * ts;
        g.fillStyle(0xcc6622, 0.35);
        g.fillRect(x, lineY, w, 2);
      }
    }

    this.gameObjects.push(g);
  }

  /**
   * Render subtle lane corridors along each feature line.
   * Real parks have visually distinct lanes — here we use a light tint.
   */
  private renderLineCorridors(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry,
    specials: SpecialFeature[]
  ): void {
    const g = scene.add.graphics();
    g.setDepth(DEPTHS.PISTE + 0.3);
    const ts = this.tileSize;
    const lineHalfW = 3; // corridor half-width in tiles

    const lines: { offsetX: number; color: number; features: ParkFeatureDef[] }[] = [];
    if (specials.includes('kickers')) lines.push({ offsetX: KICKER_LINE_X, color: 0x4488cc, features: KICKER_LAYOUT });
    if (specials.includes('rails')) lines.push({ offsetX: RAIL_LINE_X, color: 0xcc8844, features: RAIL_LAYOUT });

    for (const line of lines) {
      // Corridor spans from first feature to last feature (with zone margin)
      const ys = line.features.map(f => f.tileY);
      const minY = Math.max(0, Math.min(...ys) - APPROACH_DEPTH - 1);
      const maxY = Math.min(level.height, Math.max(...ys) + LANDING_DEPTH + 2);

      for (let y = minY; y < maxY; y++) {
        const path = geometry.pistePath[y];
        if (!path) continue;
        const cx = (path.centerX + line.offsetX) * ts;
        const corridorW = lineHalfW * 2 * ts;
        g.fillStyle(line.color, 0.05);
        g.fillRect(cx - lineHalfW * ts, y * ts, corridorW, ts);
      }

      // Small paint dots at corridor edges (every 4 tiles)
      for (let y = minY; y < maxY; y += 4) {
        const path = geometry.pistePath[y];
        if (!path) continue;
        const cx = (path.centerX + line.offsetX) * ts;
        g.fillStyle(line.color, 0.15);
        g.fillRect(cx - lineHalfW * ts, y * ts, 2, 2);
        g.fillRect(cx + lineHalfW * ts - 2, y * ts, 2, 2);
      }
    }

    this.gameObjects.push(g);
  }

  private createHalfpipe(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry
  ): void {
    const floorLeft: number[] = [];
    const floorRight: number[] = [];

    // Halfpipe walls narrow the groomable area
    // Skip top/bottom margins for entry/exit
    const marginY = 3;
    for (let y = 0; y < level.height; y++) {
      const path = geometry.pistePath[y];
      if (!path || y < marginY || y > level.height - marginY) {
        floorLeft.push(path ? path.centerX - path.width / 2 : 0);
        floorRight.push(path ? path.centerX + path.width / 2 : level.width);
        continue;
      }
      const halfW = path.width / 2;
      floorLeft.push(path.centerX - halfW + PIPE_WALL_TILES);
      floorRight.push(path.centerX + halfW - PIPE_WALL_TILES);
    }

    this.halfpipe = {
      floorLeft,
      floorRight,
      optimalDirection: Math.PI / 2, // vertical = along the pipe
    };

    // Create pipe_floor zone covering the whole pipe
    this.allZones.push({
      type: 'pipe_floor',
      minX: Math.min(...floorLeft),
      minY: marginY,
      maxX: Math.max(...floorRight),
      maxY: level.height - marginY,
      optimalDirection: Math.PI / 2,
    });

    // Render halfpipe walls
    this.renderHalfpipeWalls(scene, level, geometry);
  }

  /** Create invisible physics colliders along halfpipe wall lips for trick detection */
  private createPipeWallColliders(scene: Phaser.Scene, level: Level): void {
    if (!this.halfpipe) return;
    const ts = this.tileSize;
    const group = scene.physics.add.staticGroup();
    this._pipeWallGroup = group;
    const marginY = 5;

    // Place colliders at the outer wall edge (piste boundary), not the inner floor edge.
    // floorLeft = centerX - halfW + PIPE_WALL_TILES, so outer left = floorLeft - PIPE_WALL_TILES
    // floorRight = centerX + halfW - PIPE_WALL_TILES, so outer right = floorRight + PIPE_WALL_TILES
    for (let y = marginY; y < level.height - marginY; y += 4) {
      const fl = this.halfpipe.floorLeft[y];
      const fr = this.halfpipe.floorRight[y];
      if (fl === undefined) continue;
      const segH = Math.min(4, level.height - marginY - y) * ts;
      const outerLeft = (fl - PIPE_WALL_TILES) * ts;
      const outerRight = (fr + PIPE_WALL_TILES) * ts;

      // Left wall — at the outer piste edge
      const leftWall = scene.add.rectangle(outerLeft, y * ts + segH / 2, ts * 0.5, segH, 0, 0);
      scene.physics.add.existing(leftWall, true);
      group.add(leftWall);

      // Right wall — at the outer piste edge
      const rightWall = scene.add.rectangle(outerRight, y * ts + segH / 2, ts * 0.5, segH, 0, 0);
      scene.physics.add.existing(rightWall, true);
      group.add(rightWall);
    }
  }

  private renderHalfpipeWalls(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry
  ): void {
    const g = scene.add.graphics();
    g.setDepth(DEPTHS.PISTE + 0.5);
    const ts = this.tileSize;
    const marginY = 3;

    for (let y = marginY; y < level.height - marginY; y++) {
      const path = geometry.pistePath[y];
      if (!path) continue;

      const halfW = path.width / 2;
      const leftEdge = (path.centerX - halfW) * ts;
      const rightEdge = (path.centerX + halfW) * ts;
      const wallWidth = PIPE_WALL_TILES * ts;

      // Left wall gradient (darker toward piste edge = wall curve illusion)
      for (let i = 0; i < PIPE_WALL_TILES; i++) {
        const t_val = i / PIPE_WALL_TILES;
        const alpha = 0.15 + 0.25 * (1 - t_val); // darker near edge
        g.fillStyle(0x8899bb, alpha);
        g.fillRect(leftEdge + i * ts, y * ts, ts, ts);
      }

      // Right wall gradient
      for (let i = 0; i < PIPE_WALL_TILES; i++) {
        const t_val = i / PIPE_WALL_TILES;
        const alpha = 0.15 + 0.25 * t_val; // darker near edge
        g.fillStyle(0x8899bb, alpha);
        g.fillRect(rightEdge - wallWidth + i * ts, y * ts, ts, ts);
      }

      // Wall edge lines (lip of the halfpipe) — 1px rect instead of lineStyle
      g.fillStyle(0x667799, 0.6);
      g.fillRect(leftEdge + wallWidth, y * ts, 1, ts);
      g.fillRect(rightEdge - wallWidth - 1, y * ts, 1, ts);
    }

    // Direction arrows along pipe floor (subtle chevrons using rects)
    for (let y = marginY + 5; y < level.height - marginY - 2; y += 8) {
      const path = geometry.pistePath[y];
      if (!path) continue;
      const cx = path.centerX * ts;
      const arrowSize = Math.floor(ts * 0.4);
      const ay = y * ts;
      g.fillStyle(0x2266cc, 0.2);
      g.fillRect(cx - arrowSize, ay - 1, arrowSize, 1);
      g.fillRect(cx, ay, arrowSize, 1);
    }

    this.gameObjects.push(g);
  }

  /**
   * Get the park zone at a given tile position, if any.
   */
  getZoneAt(tileX: number, tileY: number): ParkZone | null {
    // Check halfpipe floor first (most common on L6)
    if (this.halfpipe) {
      const fl = this.halfpipe.floorLeft[tileY];
      const fr = this.halfpipe.floorRight[tileY];
      if (fl !== undefined && tileX >= fl && tileX < fr) {
        // It's on the pipe floor
        for (const z of this.allZones) {
          if (z.type === 'pipe_floor') return z;
        }
      }
    }

    // Check feature zones
    for (const z of this.allZones) {
      if (z.type === 'pipe_floor') continue;
      if (tileX >= z.minX && tileX < z.maxX && tileY >= z.minY && tileY < z.maxY) {
        return z;
      }
    }
    return null;
  }

  /**
   * Get the optimal grooming direction at a tile position.
   * Returns radians if in a park zone, null otherwise.
   */
  getOptimalDirection(tileX: number, tileY: number): number | null {
    const zone = this.getZoneAt(tileX, tileY);
    return zone ? zone.optimalDirection : null;
  }

  /**
   * Check if a pixel position is on a feature (for fail condition).
   * Uses forgiving hitbox (~70% of visual).
   */
  isOnFeature(pixelX: number, pixelY: number): boolean {
    for (const f of this.features) {
      if (
        pixelX >= f.hitboxMinX && pixelX <= f.hitboxMaxX &&
        pixelY >= f.hitboxMinY && pixelY <= f.hitboxMaxY
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a tile is inside a halfpipe wall (not groomable floor).
   */
  isInHalfpipeWall(tileX: number, tileY: number): boolean {
    if (!this.halfpipe) return false;
    const fl = this.halfpipe.floorLeft[tileY];
    const fr = this.halfpipe.floorRight[tileY];
    if (fl === undefined) return false;
    return tileX < fl || tileX >= fr;
  }

  /** Whether this level has any park features */
  get hasFeatures(): boolean {
    return this.features.length > 0 || this.halfpipe !== null;
  }

  /** Whether this level has a halfpipe */
  get hasHalfpipe(): boolean {
    return this.halfpipe !== null;
  }

  /**
   * Returns 0–1 indicating how far into the wall the position is.
   * 0 = on the floor edge, 1 = at the outer piste edge. null = not on a wall.
   */
  getWallDepth(worldX: number, worldY: number, tileSize: number): number | null {
    if (!this.halfpipe) return null;
    const tileX = worldX / tileSize;
    const tileY = Math.floor(worldY / tileSize);
    if (tileY < 5 || tileY >= this.halfpipe.floorLeft.length - 5) return null;
    const fl = this.halfpipe.floorLeft[tileY];
    const fr = this.halfpipe.floorRight[tileY];
    if (fl === undefined) return null;
    if (tileX < fl) {
      // On left wall: fl is inner edge, fl - PIPE_WALL_TILES is outer edge
      return Math.min(1, (fl - tileX) / PIPE_WALL_TILES);
    }
    if (tileX > fr) {
      // On right wall
      return Math.min(1, (tileX - fr) / PIPE_WALL_TILES);
    }
    return null;
  }

  /** Physics group for collision setup (call after create()) */
  get featureGroup(): Phaser.Physics.Arcade.StaticGroup | null {
    return this._featureGroup;
  }

  /** Physics group for halfpipe wall lip colliders (for trick detection) */
  get pipeWallGroup(): Phaser.Physics.Arcade.StaticGroup | null {
    return this._pipeWallGroup;
  }

  /** All zones for testing/inspection */
  get zones(): readonly ParkZone[] {
    return this.allZones;
  }

  destroy(): void {
    for (const obj of this.gameObjects) {
      obj.destroy();
    }
    this._featureGroup?.destroy(true);
    this._featureGroup = null;
    this._pipeWallGroup?.destroy(true);
    this._pipeWallGroup = null;
    this.gameObjects = [];
    this.features = [];
    this.allZones = [];
    this.halfpipe = null;
  }
}
