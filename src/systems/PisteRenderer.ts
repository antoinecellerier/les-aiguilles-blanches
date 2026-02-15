import { BALANCE, DEPTHS, DIFFICULTY_MARKERS, yDepth } from '../config/gameConfig';
import type { Level } from '../config/levels';
import type { LevelGeometry, CliffSegment } from './LevelGeometry';
import { getString } from '../utils/storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import { nightColor } from '../utils/nightPalette';

/**
 * Handles all piste visual rendering: boundaries, markers, cliffs, trees,
 * access paths, steep zone indicators, and extended background.
 * 
 * Pure rendering system — creates Phaser GameObjects but owns no gameplay state.
 * Physics groups (boundaryWalls) are returned to the scene for collision setup.
 */
export class PisteRenderer {
  private scene: Phaser.Scene;
  private geometry: LevelGeometry;
  private nightSfx = '';  // '_night' on night levels

  // Natural alpine rock colors - increased contrast
  private readonly CLIFF_COLORS = {
    darkRock: 0x2d2822,
    midRock: 0x4a423a,
    lightRock: 0x6a5e52,
    shadowRock: 0x1a1612,
    highlight: 0x8a7e6a,
    accent: 0x5a4a3a,
    snow: 0xf0f5f8,
    snowShadow: 0xd8e0e8,
  };

  constructor(scene: Phaser.Scene, geometry: LevelGeometry, nightSfx = '') {
    this.scene = scene;
    this.geometry = geometry;
    this.nightSfx = nightSfx;
  }

  /** Apply night color transform if on a night level */
  private nc(color: number): number {
    return this.nightSfx ? nightColor(color) : color;
  }

  createExtendedBackground(
    screenWidth: number, screenHeight: number,
    worldWidth: number, worldHeight: number,
    worldOffsetX: number, worldOffsetY: number,
    level: Level, tileSize: number
  ): void {
    // Use max dimension for both axes so background covers any orientation
    const maxScreen = Math.max(screenWidth, screenHeight);
    const bgWidth = maxScreen * 1.3;
    const bgHeight = maxScreen * 1.3;
    const extraLeft = Math.max(worldOffsetX, (bgWidth - worldWidth) / 2);
    const extraTop = Math.max(worldOffsetY, (bgHeight - worldHeight) / 2);
    const extraRight = Math.max(0, bgWidth - worldWidth - extraLeft);
    const extraBottom = Math.max(0, bgHeight - worldHeight - extraTop);

    // Single TileSprite for the extended snow background (replaces thousands of tiles)
    const totalW = worldWidth + extraLeft + extraRight;
    const totalH = worldHeight + extraTop + extraBottom;
    const bg = this.scene.add.tileSprite(
      worldWidth / 2 + (extraRight - extraLeft) / 2,
      worldHeight / 2 + (extraBottom - extraTop) / 2,
      totalW + tileSize * 2, totalH + tileSize * 2,
      'snow_offpiste' + this.nightSfx
    );
    bg.setDepth(DEPTHS.BG_FOREST_TILES);

    const treeSpacing = tileSize * 3; // Sparser padding trees for performance
    const margin = tileSize;
    const isStorm = level.weather === 'storm';

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.4) {
          const offsetX = (Math.random() - 0.5) * treeSpacing * 0.8;
          const offsetY = (Math.random() - 0.5) * treeSpacing * 0.8;
          const tx = x + offsetX, ty = y + offsetY;
          if (this.geometry.isOnAccessPath(tx, ty)) continue;
          this.createTree(tx, ty, DEPTHS.BG_FOREST_ROCKS, isStorm);
        }
      }
    }

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing * 2) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing * 2) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.85) {
          const offsetX = (Math.random() - 0.5) * treeSpacing;
          const offsetY = (Math.random() - 0.5) * treeSpacing;
          const tx = x + offsetX, ty = y + offsetY;
          if (this.geometry.isOnAccessPath(tx, ty)) continue;
          this.createRock(tx, ty);
        }
      }
    }
  }

  /**
   * Create boundary colliders for off-piste areas.
   * Cliff wipeouts are handled per-frame via LevelGeometry.isOnCliff().
   */
  createBoundaryColliders(
    level: Level, tileSize: number
  ): { boundaryWalls: Phaser.Physics.Arcade.StaticGroup } {
    const scene = this.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics };
    const boundaryWalls = scene.physics.add.staticGroup();

    const worldWidth = level.width * tileSize;
    const worldHeight = level.height * tileSize;
    const isDangerous = level.hasDangerousBoundaries;

    const isAccessZone = (yPos: number, side: string): boolean => {
      if (this.geometry.accessEntryZones) {
        const segmentTop = yPos;
        const segmentBottom = yPos + tileSize * 4;
        for (const zone of this.geometry.accessEntryZones) {
          if (zone.side === side &&
            segmentTop < zone.endY && segmentBottom > zone.startY) {
            return true;
          }
        }
      }
      if (this.geometry.accessPathRects) {
        const segmentTop = yPos;
        const segmentBottom = yPos + tileSize * 4;
        for (const rect of this.geometry.accessPathRects) {
          if (segmentTop < rect.endY && segmentBottom > rect.startY) {
            if (rect.side === side) return true;
          }
        }
      }
      return false;
    };

    const segmentHeight = tileSize * 4;

    if (isDangerous && this.geometry.cliffSegments.length > 0) {
      for (const cliff of this.geometry.cliffSegments) {
        for (let y = cliff.startY; y < cliff.endY; y += segmentHeight) {
          const pisteEdge = cliff.getX(y);
          const yEnd = Math.min(y + segmentHeight, cliff.endY);
          const height = yEnd - y;
          const inAccessZone = isAccessZone(y, cliff.side);
          
          if (cliff.side === 'left') {
            const cliffStart = Math.max(0, pisteEdge - cliff.offset - cliff.extent);
            if (!inAccessZone && cliffStart > tileSize) {
              const forestWall = this.scene.add.rectangle(
                cliffStart / 2, y + height / 2, cliffStart, height, 0x000000, 0
              );
              scene.physics.add.existing(forestWall, true);
              boundaryWalls.add(forestWall);
            }
          } else {
            const cliffEnd = Math.min(worldWidth, pisteEdge + cliff.offset + cliff.extent);
            if (!inAccessZone && cliffEnd < worldWidth - tileSize) {
              const forestWidth = worldWidth - cliffEnd;
              const forestWall = this.scene.add.rectangle(
                cliffEnd + forestWidth / 2, y + height / 2, forestWidth, height, 0x000000, 0
              );
              scene.physics.add.existing(forestWall, true);
              boundaryWalls.add(forestWall);
            }
          }
        }
      }
      // Fill gaps: add boundary walls for Y-ranges not covered by any cliff segment
      for (let y = 0; y < level.height; y += 4) {
        if (y >= level.height - 2) continue;
        const yPos = y * tileSize;
        const yEnd = yPos + segmentHeight;
        let leftCovered = false;
        let rightCovered = false;
        for (const cliff of this.geometry.cliffSegments) {
          if (yPos < cliff.endY && yEnd > cliff.startY) {
            if (cliff.side === 'left') leftCovered = true;
            if (cliff.side === 'right') rightCovered = true;
          }
        }
        const path = this.geometry.pistePath[y] || { centerX: level.width / 2, width: level.width * 0.5 };
        const leftEdge = (path.centerX - path.width / 2) * tileSize;
        const rightEdge = (path.centerX + path.width / 2) * tileSize;
        if (!leftCovered && leftEdge > tileSize && !isAccessZone(yPos, 'left')) {
          const wall = this.scene.add.rectangle(
            leftEdge / 2, yPos + segmentHeight / 2, leftEdge, segmentHeight, 0x000000, 0
          );
          scene.physics.add.existing(wall, true);
          boundaryWalls.add(wall);
        }
        if (!rightCovered && rightEdge < worldWidth - tileSize && !isAccessZone(yPos, 'right')) {
          const wall = this.scene.add.rectangle(
            rightEdge + (worldWidth - rightEdge) / 2, yPos + segmentHeight / 2,
            worldWidth - rightEdge, segmentHeight, 0x000000, 0
          );
          scene.physics.add.existing(wall, true);
          boundaryWalls.add(wall);
        }
      }
    } else {
      const hasHalfpipe = level.specialFeatures?.includes('halfpipe');
      for (let y = 0; y < level.height; y += 4) {
        if (y >= level.height - 2) continue;

        const yPos = y * tileSize;
        const path = this.geometry.pistePath[y] || { centerX: level.width / 2, width: level.width * 0.5 };
        const leftEdge = (path.centerX - path.width / 2) * tileSize;
        const rightEdge = (path.centerX + path.width / 2) * tileSize;

        // Halfpipe levels: no lateral walls inside the pipe (rows 3..height-3)
        const inPipe = hasHalfpipe && y >= 3 && y < level.height - 3;

        if (leftEdge > tileSize && !isAccessZone(yPos, 'left') && !inPipe) {
          const leftWall = this.scene.add.rectangle(
            leftEdge / 2, yPos + segmentHeight / 2, leftEdge, segmentHeight, 0x000000, 0
          );
          scene.physics.add.existing(leftWall, true);
          boundaryWalls.add(leftWall);
        }

        if (rightEdge < worldWidth - tileSize && !isAccessZone(yPos, 'right') && !inPipe) {
          const rightWall = this.scene.add.rectangle(
            rightEdge + (worldWidth - rightEdge) / 2, yPos + segmentHeight / 2,
            worldWidth - rightEdge, segmentHeight, 0x000000, 0
          );
          scene.physics.add.existing(rightWall, true);
          boundaryWalls.add(rightWall);
        }
      }
    }

    const topWall = this.scene.add.rectangle(
      worldWidth / 2, tileSize * 1.5, worldWidth, tileSize * 3, 0x000000, 0
    );
    scene.physics.add.existing(topWall, true);
    boundaryWalls.add(topWall);

    const bottomWall = this.scene.add.rectangle(
      worldWidth / 2, worldHeight - tileSize, worldWidth, tileSize * 2, 0x000000, 0
    );
    scene.physics.add.existing(bottomWall, true);
    boundaryWalls.add(bottomWall);
    
    if (isDangerous) {
      this.createCliffEdgeVisuals(level, tileSize);
    }

    return { boundaryWalls };
  }

  private createCliffEdgeVisuals(level: Level, tileSize: number): void {
    // Remove stale cliff textures from previous level loads
    const existingKeys = this.scene.textures.getTextureKeys().filter(k => k.startsWith('cliff_'));
    for (const key of existingKeys) {
      this.scene.textures.remove(key);
    }
    this.cliffTextureIndex = 0;

    const worldWidth = level.width * tileSize;
    const isStorm = level.weather === 'storm';
    for (const cliff of this.geometry.cliffSegments) {
      this.drawContinuousCliff(cliff, tileSize, worldWidth, isStorm);
    }
  }

  private cliffTextureIndex = 0;

  private drawContinuousCliff(cliff: CliffSegment, tileSize: number, worldWidth: number, isStorm: boolean): void {
    const { side, startY, endY, offset, extent, getX } = cliff;

    const rand = (i: number) => {
      const n = Math.sin(startY * 0.01 + i * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    
    if (endY <= startY) return;

    const detailSize = Math.max(2, Math.floor(tileSize * 0.2));
    const detailLarge = Math.max(3, Math.floor(tileSize * 0.3));

    // Iterate cliff rock tiles, calling visitor for each non-skipped tile
    const forEachTile = (visit: (x: number, y: number) => void) => {
      for (let y = startY; y <= endY; y += tileSize) {
        const pisteEdge = getX(y);
        const rowVariation = Math.abs(rand(y * 0.3 + 55) - 0.5) * tileSize;
        let cliffStart: number, cliffEnd: number;
        if (side === 'left') {
          cliffEnd = pisteEdge - offset - rowVariation * 0.3;
          cliffStart = Math.max(0, cliffEnd - extent - rowVariation);
        } else {
          cliffStart = pisteEdge + offset + rowVariation * 0.3;
          cliffEnd = Math.min(worldWidth, cliffStart + extent + rowVariation);
        }
        for (let x = cliffStart; x < cliffEnd; x += tileSize) {
          const isEdgeTile = (side === 'left' && x < cliffStart + tileSize * 1.5) ||
                            (side === 'right' && x > cliffEnd - tileSize * 1.5) ||
                            (y < startY + tileSize * 1.5) ||
                            (y > endY - tileSize * 1.5);
          if (isEdgeTile && rand(x * 0.1 + y * 0.2 + 33) > 0.7) continue;
          visit(x, y);
        }
      }
    };

    // First pass: compute bounding box of all cliff geometry
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const expandBB = (x: number, y: number, w: number, h: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    };

    forEachTile((x, y) => expandBB(x, y, tileSize + 1, tileSize + 1));
    // Snow patches
    const snowSpacing = isStorm ? tileSize : tileSize * 2;
    const snowThreshold = isStorm ? 0.35 : 0.65;
    for (let y = startY + snowSpacing; y < endY - snowSpacing; y += snowSpacing) {
      if (rand(y + 200) < snowThreshold) continue;
      const pisteEdge = getX(y);
      const snowDist = offset + rand(y + 201) * extent * 0.6;
      const snowX = side === 'left'
        ? Math.max(tileSize, pisteEdge - snowDist)
        : Math.min(worldWidth - tileSize, pisteEdge + snowDist);
      const patchW = isStorm ? detailLarge * 3 : detailLarge * 2;
      expandBB(snowX, y, patchW + detailLarge, detailSize * 2);
    }

    if (minX >= Infinity) return;

    // Origin offset: all drawing is relative to (minX, minY) so texture starts at (0,0)
    const ox = minX;
    const oy = minY;
    const texW = Math.ceil(maxX - minX);
    const texH = Math.ceil(maxY - minY);

    const g = this.scene.make.graphics({} as any, false);

    // Rock tiles (second pass — uses same iteration as bounding box)
    forEachTile((x, y) => {
        
        g.fillStyle(this.nc(this.CLIFF_COLORS.midRock), 1);
        g.fillRect(x - ox, y - oy, tileSize + 1, tileSize + 1);
        
        const seed = x * 0.1 + y * 0.07;
        
        g.fillStyle(this.nc(this.CLIFF_COLORS.lightRock), 1);
        g.fillRect(x - ox + detailSize, y - oy + detailSize, detailLarge, detailSize);
        if (rand(seed + 1) > 0.4) {
          g.fillRect(x - ox + tileSize * 0.5, y - oy + detailSize * 2, detailLarge + detailSize, detailLarge);
        }
        if (rand(seed + 2) > 0.5) {
          g.fillRect(x - ox + detailSize * 2, y - oy + tileSize * 0.5, detailLarge, detailLarge);
        }
        
        g.fillStyle(this.nc(this.CLIFF_COLORS.darkRock), 1);
        if (rand(seed + 3) > 0.3) {
          g.fillRect(x - ox + tileSize * 0.3, y - oy + detailSize, detailSize, detailSize);
        }
        if (rand(seed + 4) > 0.4) {
          g.fillRect(x - ox + tileSize * 0.7, y - oy + tileSize * 0.4, detailSize, detailLarge);
        }
        if (rand(seed + 5) > 0.5) {
          g.fillRect(x - ox + tileSize * 0.5, y - oy + tileSize * 0.7, detailSize, detailSize);
        }
    });
  
    // Snow patches on cliff
    for (let y = startY + snowSpacing; y < endY - snowSpacing; y += snowSpacing) {
      if (rand(y + 200) < snowThreshold) continue;
      
      const pisteEdge = getX(y);
      const snowDist = offset + rand(y + 201) * extent * 0.6;
      const snowX = side === 'left' 
        ? Math.max(tileSize, pisteEdge - snowDist)
        : Math.min(worldWidth - tileSize, pisteEdge + snowDist);
      
      g.fillStyle(this.nc(this.CLIFF_COLORS.snow), 1);
      const patchW = isStorm ? detailLarge * 3 : detailLarge * 2;
      g.fillRect(snowX - ox, y - oy, patchW, detailSize);
      if (rand(y + 202) > 0.5) {
        g.fillRect(snowX - ox + detailSize, y - oy + detailSize, detailLarge, detailSize);
      }
    }
  
    // Cliff danger poles — created as separate y-sorted Graphics (not baked into cliff texture)
    for (let y = startY + tileSize * 2; y < endY - tileSize; y += tileSize * 4) {
      const pisteEdge = getX(y);
      const poleOffset = offset * 0.3;
      const poleX = side === 'left' ? pisteEdge - poleOffset : pisteEdge + poleOffset;
      const pg = this.scene.add.graphics();
      pg.setDepth(yDepth(y - 14));
      const poleHeight = 28;
      const poleWidth = 5;

      pg.fillStyle(this.nc(0x000000), 1);
      pg.fillRect(poleX - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);

      const stripeH = poleHeight / 5;
      for (let j = 0; j < 5; j++) {
        pg.fillStyle(this.nc(j % 2 === 0 ? 0xffcc00 : 0x111111), 1);
        pg.fillRect(poleX - poleWidth / 2 - 1, y - poleHeight + j * stripeH, poleWidth + 2, stripeH);
      }
      // Debug: depth reference line (magenta) — toggled in Settings
      if (getString(STORAGE_KEYS.SHOW_DEBUG) === 'true') {
        pg.lineStyle(2, 0xff00ff, 1);
        pg.lineBetween(poleX - 10, y - 14, poleX + 10, y - 14);
      }
    }

    // Bake to texture and replace with Image at world position
    const key = `cliff_${this.cliffTextureIndex++}`;
    g.generateTexture(key, texW, texH);
    g.destroy();

    // Nearest-neighbor for crisp pixel art when zoomed
    const cliffTex = this.scene.textures.get(key);
    if (cliffTex?.source?.[0]) cliffTex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;

    const img = this.scene.add.image(ox, oy, key);
    img.setOrigin(0, 0);
    img.setDepth(DEPTHS.CLIFFS);

    // Sparse trees on cliff (separate Images, not part of cliff texture)
    const treeSpacing = tileSize * 4;
    for (let y = startY + treeSpacing; y < endY - treeSpacing; y += treeSpacing) {
      if (rand(y + 300) < 0.95) continue;
      
      const offsetY = (rand(y + 301) - 0.5) * treeSpacing * 0.5;
      const pisteEdge = getX(y + offsetY);
      const treeDist = offset + rand(y + 302) * extent * 0.8;
      const treeX = side === 'left' 
        ? Math.max(tileSize, pisteEdge - treeDist)
        : Math.min(worldWidth - tileSize, pisteEdge + treeDist);
      this.createTree(treeX, y + offsetY, undefined, isStorm);
      
      if (rand(y + 303) > 0.6) {
        const clusterCount = rand(y + 304) > 0.5 ? 2 : 1;
        for (let c = 0; c < clusterCount; c++) {
          const cx = treeX + (rand(y + 305 + c) - 0.5) * tileSize * 1.5;
          const cy = y + offsetY + (rand(y + 306 + c) - 0.5) * tileSize * 1.5;
          this.createTree(cx, cy, undefined, isStorm);
        }
      }
    }
  }

  /**
   * Create all piste boundary visuals: markers, access paths, forests, steep zones.
   */
  createPisteBoundaries(level: Level, tileSize: number, worldWidth: number): void {
    this.createPisteMarkers(level, tileSize);
    this.createAccessPaths(level, tileSize);
    this.createForestBoundaries(level, tileSize, worldWidth);
    this.createSteepZoneIndicators(level, tileSize);
  }

  private createPisteMarkers(level: Level, tileSize: number): void {
    const markerSpacing = Math.max(6, Math.floor(level.height / 10));
    const markerColor = this.getDifficultyColor(level);
    const markerSymbol = this.getDifficultySymbol(level);

    for (let yi = 0; yi < level.height; yi += markerSpacing) {
      if (yi < 4 || yi >= level.height - 3) continue;

      const path = this.geometry.pistePath[yi];
      if (!path) continue;

      const leftX = (path.centerX - path.width / 2) * tileSize;
      const rightX = (path.centerX + path.width / 2) * tileSize;
      const y = yi * tileSize;

      const leftMarkerX = leftX - tileSize * 0.5;
      const rightMarkerX = rightX + tileSize * 0.5;
      
      if (!this.geometry.isOnCliff(leftMarkerX, y)) {
        this.createMarkerPole(leftMarkerX, y, markerColor, markerSymbol, 'left');
      }
      if (!this.geometry.isOnCliff(rightMarkerX, y)) {
        this.createMarkerPole(rightMarkerX, y, markerColor, markerSymbol, 'right');
      }
    }
  }

  private createMarkerPole(x: number, y: number, color: number, _symbol: string, side: string): void {
    const g = this.scene.add.graphics();
    g.setDepth(yDepth(y - 14));
    const poleHeight = 28;
    const poleWidth = 5;
    const orangeTopHeight = Math.floor(poleHeight * 0.15);

    if (side === 'left') {
      g.fillStyle(this.nc(color), 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + orangeTopHeight, poleWidth, poleHeight - orangeTopHeight);
      g.fillStyle(this.nc(0xFF6600), 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, orangeTopHeight);
    } else {
      g.fillStyle(this.nc(color), 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
    }

    g.fillStyle(this.nc(0x222222), 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
    // Debug: depth reference line (magenta) — toggled in Settings
    if (getString(STORAGE_KEYS.SHOW_DEBUG) === 'true') {
      g.lineStyle(2, 0xff00ff, 1);
      g.lineBetween(x - 10, y - 14, x + 10, y - 14);
    }
  }

  private getDifficultySymbol(level: Level): string {
    switch (level.difficulty) {
      case 'tutorial':
      case 'green': return '●';
      case 'blue': return '■';
      case 'red': return '◆';
      case 'black': return '◆◆';
      case 'park': return '▲';
      default: return '●';
    }
  }

  private getDifficultyColor(level: Level): number {
    const key = level.difficulty === 'tutorial' ? 'green' : level.difficulty;
    const marker = DIFFICULTY_MARKERS[key as keyof typeof DIFFICULTY_MARKERS];
    return marker?.color ?? 0x888888;
  }

  private createForestBoundaries(level: Level, tileSize: number, worldWidth: number): void {
    const isStorm = level.weather === 'storm';
    for (let yi = 3; yi < level.height - 2; yi += 2) {
      const path = this.geometry.pistePath[yi];
      if (!path) continue;

      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;
      const y = yi * tileSize;

      for (let tx = tileSize; tx < leftEdge - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (this.geometry.isOnAccessPath(treeX, treeY)) continue;
        if (this.geometry.isOnCliff(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY, undefined, isStorm);
        }
      }

      for (let tx = rightEdge + tileSize; tx < worldWidth - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (this.geometry.isOnAccessPath(treeX, treeY)) continue;
        if (this.geometry.isOnCliff(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY, undefined, isStorm);
        }
      }
    }
  }

  private createTree(x: number, y: number, depth?: number, isStorm?: boolean): void {
    const sizes = [8, 10, 12, 14]; // must match BootScene tree textures
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const key = (isStorm ? `tree_${size}_storm` : `tree_${size}`) + this.nightSfx;
    const img = this.scene.add.image(x, y, key);
    img.setOrigin(0.5, 1); // anchor at trunk base
    img.setDepth(depth ?? yDepth(y));
  }

  private createRock(x: number, y: number): void {
    const sizes = [6, 10, 14]; // must match BootScene rock textures
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const img = this.scene.add.image(x, y, `rock_${size}${this.nightSfx}`);
    img.setOrigin(0.5, 0.5);
    img.setDepth(DEPTHS.BG_FOREST_ROCKS);
  }

  private createSteepZoneIndicators(level: Level, tileSize: number): void {
    const steepZones = level.steepZones || [];
    const worldHeight = level.height * tileSize;

    this.geometry.steepZoneRects = [];

    steepZones.forEach(zone => {
      const startY = zone.startY * worldHeight;
      const endY = zone.endY * worldHeight;

      const midYIndex = Math.floor((zone.startY + zone.endY) / 2 * level.height);
      const path = this.geometry.pistePath[midYIndex] || { centerX: level.width / 2, width: level.width * 0.5 };
      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;

      // Steep zone warning pole on piste border for tumble-danger zones (NF S52-102)
      if (zone.slope >= BALANCE.TUMBLE_SLOPE_THRESHOLD) {
        const startYIndex = Math.floor(zone.startY * level.height);
        const edgePath = this.geometry.pistePath[startYIndex] || path;
        const edgeLeftX = (edgePath.centerX - edgePath.width / 2) * tileSize;
        let markerX = edgeLeftX - tileSize * 0.5;
        const markerY = startY;
        // If left border falls on a cliff, try the right border
        if (this.geometry.isOnCliff(markerX, markerY)) {
          const edgeRightX = (edgePath.centerX + edgePath.width / 2) * tileSize;
          const rightMarkerX = edgeRightX + tileSize * 0.5;
          if (!this.geometry.isOnCliff(rightMarkerX, markerY)) {
            markerX = rightMarkerX;
          }
        }
        const mg = this.scene.add.graphics();
        mg.setDepth(yDepth(markerY - 14));
        const poleHeight = 28;
        const poleWidth = 5;
        const triSize = 12;
        const triMid = markerY - poleHeight;
        const triTop = triMid - triSize * 0.8;
        const triBase = triMid + triSize * 0.8;
        // Pole shaft (yellow/black steep zone warning pole per NF S52-102)
        mg.fillStyle(this.nc(0xddaa00), 1);
        mg.fillRect(markerX - poleWidth / 2, markerY - poleHeight, poleWidth, poleHeight);
        // Ground base
        mg.fillStyle(this.nc(0x222222), 1);
        mg.fillRect(markerX - poleWidth / 2 - 1, markerY - 3, poleWidth + 2, 6);
        // Yellow warning triangle
        mg.fillStyle(this.nc(0xffcc00), 1);
        mg.beginPath();
        mg.moveTo(markerX, triTop);
        mg.lineTo(markerX - triSize, triBase);
        mg.lineTo(markerX + triSize, triBase);
        mg.closePath();
        mg.fillPath();
        // Triangle border
        mg.lineStyle(1, 0x000000, 0.8);
        mg.beginPath();
        mg.moveTo(markerX, triTop);
        mg.lineTo(markerX - triSize, triBase);
        mg.lineTo(markerX + triSize, triBase);
        mg.closePath();
        mg.strokePath();
        // Exclamation mark
        const exclY = triTop + triSize * 0.45;
        mg.fillStyle(0x000000, 1);
        mg.fillRect(markerX - 1, exclY, 2, 6);
        mg.fillRect(markerX - 1, exclY + 8, 2, 2);
        // Debug: depth reference line (magenta) — toggled in Settings
        if (getString(STORAGE_KEYS.SHOW_DEBUG) === 'true') {
          mg.lineStyle(2, 0xff00ff, 1);
          mg.lineBetween(markerX - 10, markerY - 14, markerX + 10, markerY - 14);
        }
      }

      // Per-row bounds following piste path, with inward margin for leniency
      const margin = tileSize * 2;
      const geometry = this.geometry;
      const levelHeight = level.height;
      const getBounds = (y: number): { leftX: number; rightX: number } => {
        // Y margin: return empty bounds near edges
        if (y < startY + margin || y > endY - margin) {
          return { leftX: 0, rightX: 0 };
        }
        const rowIndex = Math.floor(y / tileSize);
        const p = geometry.pistePath[Math.min(rowIndex, levelHeight - 1)] || path;
        const lx = (p.centerX - p.width / 2) * tileSize + margin;
        const rx = (p.centerX + p.width / 2) * tileSize - margin;
        return { leftX: lx, rightX: rx };
      };

      this.geometry.steepZoneRects.push({
        startY: startY,
        endY: endY,
        leftX: leftEdge,
        rightX: rightEdge,
        slope: zone.slope,
        getBounds,
      });
    });
  }

  private createAccessPaths(level: Level, tileSize: number): void {
    if (this.geometry.accessPathCurves.length === 0) return;

    const worldW = level.width * tileSize;
    const worldH = level.height * tileSize;

    // DynamicTexture for access road tiles (replaces hundreds of individual Images)
    const dtKey = '__access_road';
    if (this.scene.textures.exists(dtKey)) this.scene.textures.remove(dtKey);
    const dt = this.scene.textures.addDynamicTexture(dtKey, worldW, worldH)!;
    dt.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
    const ctx = dt.context!;
    ctx.imageSmoothingEnabled = false;
    const frame = this.scene.textures.getFrame('snow_packed' + this.nightSfx);
    const src = frame.source.image as HTMLImageElement | HTMLCanvasElement;
    const cd = frame.canvasData as { x: number; y: number; width: number; height: number };

    const poleSpacing = tileSize * 15;

    this.geometry.accessPathCurves.forEach(({ leftEdge, rightEdge }) => {
      const placedTiles = new Set<string>();
      for (let p = 0; p < leftEdge.length - 1; p++) {
        const l1 = leftEdge[p], l2 = leftEdge[p + 1];
        const r1 = rightEdge[p], r2 = rightEdge[p + 1];
        const minY = Math.min(l1.y, l2.y, r1.y, r2.y);
        const maxY = Math.max(l1.y, l2.y, r1.y, r2.y);
        for (let ty = Math.floor(minY / tileSize); ty <= Math.floor(maxY / tileSize); ty++) {
          const t = maxY > minY ? ((ty * tileSize + tileSize / 2) - minY) / (maxY - minY) : 0.5;
          const lx = l1.x + (l2.x - l1.x) * t;
          const rx = r1.x + (r2.x - r1.x) * t;
          const minX = Math.min(lx, rx);
          const maxX = Math.max(lx, rx);
          for (let tx = Math.floor(minX / tileSize); tx <= Math.floor(maxX / tileSize); tx++) {
            const key = `${tx},${ty}`;
            if (!placedTiles.has(key)) {
              placedTiles.add(key);
              ctx.drawImage(src, cd.x, cd.y, cd.width, cd.height,
                tx * tileSize, ty * tileSize, tileSize, tileSize);
            }
          }
        }
      }

      const minPoleDist = tileSize * 12;
      const minPoleDistSq = minPoleDist * minPoleDist;
      const placedPoles: { x: number; y: number }[] = [];
      
      let distanceTraveled = 0;
      for (let p = 1; p < leftEdge.length; p++) {
        const prevL = leftEdge[p - 1];
        const currL = leftEdge[p];
        const currR = rightEdge[p];

        const segLen = Math.sqrt(
          Math.pow(currL.x - prevL.x, 2) + Math.pow(currL.y - prevL.y, 2)
        );
        distanceTraveled += segLen;

        if (distanceTraveled >= poleSpacing) {
          const tooClose = placedPoles.some(pp => {
            const dx = pp.x - currL.x;
            const dy = pp.y - currL.y;
            return dx * dx + dy * dy < minPoleDistSq;
          });
          if (!tooClose) {
            distanceTraveled = 0;
            this.createServiceRoadPole(currL.x, currL.y);
            this.createServiceRoadPole(currR.x, currR.y);
            placedPoles.push({ x: currL.x, y: currL.y });
            placedPoles.push({ x: currR.x, y: currR.y });
          }
        }
      }
    });

    // Display the access road DynamicTexture as a single Image
    const roadImg = this.scene.add.image(worldW / 2, worldH / 2, dtKey);
    roadImg.setDepth(DEPTHS.ACCESS_ROAD);
  }

  private createServiceRoadPole(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(yDepth(y - 14));

    const poleHeight = 28;
    const poleWidth = 5;
    const stripeHeight = Math.floor(poleHeight / 5);

    for (let i = 0; i < poleHeight; i += stripeHeight) {
      const isAmber = (Math.floor(i / stripeHeight) % 2 === 0);
      g.fillStyle(this.nc(isAmber ? 0xFFAA00 : 0x111111), 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + i, poleWidth, stripeHeight);
    }

    g.fillStyle(this.nc(0x222222), 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
    // Debug: depth reference line (magenta) — toggled in Settings
    if (getString(STORAGE_KEYS.SHOW_DEBUG) === 'true') {
      g.lineStyle(2, 0xff00ff, 1);
      g.lineBetween(x - 10, y - 14, x + 10, y - 14);
    }
  }
}
