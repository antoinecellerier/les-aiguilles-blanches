import { DEPTHS, DIFFICULTY_MARKERS, yDepth } from '../config/gameConfig';
import { THEME } from '../config/theme';
import type { Level } from '../config/levels';
import type { LevelGeometry, CliffSegment } from './LevelGeometry';

/**
 * Handles all piste visual rendering: boundaries, markers, cliffs, trees,
 * access paths, steep zone indicators, and extended background.
 * 
 * Pure rendering system — creates Phaser GameObjects but owns no gameplay state.
 * Physics groups (boundaryWalls, dangerZones) are returned to GameScene for collision setup.
 */
export class PisteRenderer {
  private scene: Phaser.Scene;
  private geometry: LevelGeometry;

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

  constructor(scene: Phaser.Scene, geometry: LevelGeometry) {
    this.scene = scene;
    this.geometry = geometry;
  }

  createExtendedBackground(
    screenWidth: number, screenHeight: number,
    worldWidth: number, worldHeight: number,
    worldOffsetX: number, worldOffsetY: number,
    level: Level, tileSize: number
  ): void {
    const bgWidth = screenWidth * 1.3;
    const bgHeight = screenHeight * 1.3;
    const extraLeft = Math.max(worldOffsetX, (bgWidth - worldWidth) / 2);
    const extraTop = Math.max(worldOffsetY, (bgHeight - worldHeight) / 2);
    const extraRight = Math.max(0, bgWidth - worldWidth - extraLeft);
    const extraBottom = Math.max(0, bgHeight - worldHeight - extraTop);

    for (let x = Math.floor(-extraLeft / tileSize) - 1; x < Math.ceil((worldWidth + extraRight) / tileSize) + 1; x++) {
      for (let y = Math.floor(-extraTop / tileSize) - 1; y < Math.ceil((worldHeight + extraBottom) / tileSize) + 1; y++) {
        const isOutside = x < 0 || x >= level.width || y < 0 || y >= level.height;
        if (isOutside) {
          const tile = this.scene.add.image(
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2,
            'snow_offpiste'
          );
          tile.setDisplaySize(tileSize, tileSize);
          tile.setDepth(DEPTHS.BG_FOREST_TILES);
        }
      }
    }

    const treeSpacing = tileSize * 2;
    const margin = tileSize;

    const isStorm = level.weather === 'storm';

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.35) {
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

  private createRock(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.BG_FOREST_ROCKS);
    const size = 6 + Math.random() * 8;

    g.fillStyle(0x6B6B6B, 1);
    g.fillRect(x - size / 2, y - size / 3, size, size * 0.6);

    g.fillStyle(0x8B8B8B, 1);
    g.fillRect(x - size / 3, y - size / 3, size * 0.3, size * 0.2);

    g.fillStyle(0x4A4A4A, 1);
    g.fillRect(x, y + size * 0.1, size * 0.4, size * 0.15);
  }

  /**
   * Create boundary colliders and danger zones.
   * Returns physics groups for GameScene to use in collision setup.
   */
  createBoundaryColliders(
    level: Level, tileSize: number
  ): { boundaryWalls: Phaser.Physics.Arcade.StaticGroup; dangerZones: Phaser.Physics.Arcade.StaticGroup } {
    const scene = this.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics };
    const boundaryWalls = scene.physics.add.staticGroup();
    const dangerZones = scene.physics.add.staticGroup();

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
          if (isAccessZone(y, cliff.side)) continue;

          const pisteEdge = cliff.getX(y);
          const yEnd = Math.min(y + segmentHeight, cliff.endY);
          const height = yEnd - y;
          
          if (cliff.side === 'left') {
            const cliffEnd = pisteEdge - cliff.offset;
            const cliffStart = Math.max(0, cliffEnd - cliff.extent);
            const width = cliffEnd - cliffStart;
            if (width > 0) {
              const wall = this.scene.add.rectangle(
                cliffStart + width / 2, y + height / 2, width, height, 0x000000, 0
              );
              scene.physics.add.existing(wall, true);
              dangerZones.add(wall);
            }
            if (cliffStart > tileSize) {
              const forestWall = this.scene.add.rectangle(
                cliffStart / 2, y + height / 2, cliffStart, height, 0x000000, 0
              );
              scene.physics.add.existing(forestWall, true);
              boundaryWalls.add(forestWall);
            }
          } else {
            const cliffStart = pisteEdge + cliff.offset;
            const cliffEnd = Math.min(worldWidth, cliffStart + cliff.extent);
            const width = cliffEnd - cliffStart;
            if (width > 0) {
              const wall = this.scene.add.rectangle(
                cliffStart + width / 2, y + height / 2, width, height, 0x000000, 0
              );
              scene.physics.add.existing(wall, true);
              dangerZones.add(wall);
            }
            if (cliffEnd < worldWidth - tileSize) {
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
    } else {
      for (let y = 0; y < level.height; y += 4) {
        if (y >= level.height - 2) continue;

        const yPos = y * tileSize;
        const path = this.geometry.pistePath[y] || { centerX: level.width / 2, width: level.width * 0.5 };
        const leftEdge = (path.centerX - path.width / 2) * tileSize;
        const rightEdge = (path.centerX + path.width / 2) * tileSize;

        if (leftEdge > tileSize && !isAccessZone(yPos, 'left')) {
          const leftWall = this.scene.add.rectangle(
            leftEdge / 2, yPos + segmentHeight / 2, leftEdge, segmentHeight, 0x000000, 0
          );
          scene.physics.add.existing(leftWall, true);
          boundaryWalls.add(leftWall);
        }

        if (rightEdge < worldWidth - tileSize && !isAccessZone(yPos, 'right')) {
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

    return { boundaryWalls, dangerZones };
  }

  private createCliffEdgeVisuals(level: Level, tileSize: number): void {
    const worldWidth = level.width * tileSize;
    const isStorm = level.weather === 'storm';
    for (const cliff of this.geometry.cliffSegments) {
      this.drawContinuousCliff(cliff, tileSize, worldWidth, isStorm);
    }
  }

  private drawContinuousCliff(cliff: CliffSegment, tileSize: number, worldWidth: number, isStorm: boolean): void {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.CLIFFS);
    
    const { side, startY, endY, offset, extent, getX } = cliff;

    const rand = (i: number) => {
      const n = Math.sin(startY * 0.01 + i * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    
    if (endY <= startY) return;

    const detailSize = Math.max(2, Math.floor(tileSize * 0.2));
    const detailLarge = Math.max(3, Math.floor(tileSize * 0.3));
    
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
        
        g.fillStyle(this.CLIFF_COLORS.midRock, 1);
        g.fillRect(x, y, tileSize + 1, tileSize + 1);
        
        const seed = x * 0.1 + y * 0.07;
        
        g.fillStyle(this.CLIFF_COLORS.lightRock, 1);
        g.fillRect(x + detailSize, y + detailSize, detailLarge, detailSize);
        if (rand(seed + 1) > 0.4) {
          g.fillRect(x + tileSize * 0.5, y + detailSize * 2, detailLarge + detailSize, detailLarge);
        }
        if (rand(seed + 2) > 0.5) {
          g.fillRect(x + detailSize * 2, y + tileSize * 0.5, detailLarge, detailLarge);
        }
        
        g.fillStyle(this.CLIFF_COLORS.darkRock, 1);
        if (rand(seed + 3) > 0.3) {
          g.fillRect(x + tileSize * 0.3, y + detailSize, detailSize, detailSize);
        }
        if (rand(seed + 4) > 0.4) {
          g.fillRect(x + tileSize * 0.7, y + tileSize * 0.4, detailSize, detailLarge);
        }
        if (rand(seed + 5) > 0.5) {
          g.fillRect(x + tileSize * 0.5, y + tileSize * 0.7, detailSize, detailSize);
        }
      }
    }
  
    // Sparse trees on cliff
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
  
    // Snow patches on cliff — denser during storms
    const snowSpacing = isStorm ? tileSize : tileSize * 2;
    const snowThreshold = isStorm ? 0.35 : 0.65;
    for (let y = startY + snowSpacing; y < endY - snowSpacing; y += snowSpacing) {
      if (rand(y + 200) < snowThreshold) continue;
      
      const pisteEdge = getX(y);
      const snowDist = offset + rand(y + 201) * extent * 0.6;
      const snowX = side === 'left' 
        ? Math.max(tileSize, pisteEdge - snowDist)
        : Math.min(worldWidth - tileSize, pisteEdge + snowDist);
      
      g.fillStyle(this.CLIFF_COLORS.snow, 1);
      const patchW = isStorm ? detailLarge * 3 : detailLarge * 2;
      g.fillRect(snowX, y, patchW, detailSize);
      if (rand(y + 202) > 0.5) {
        g.fillRect(snowX + detailSize, y + detailSize, detailLarge, detailSize);
      }
    }
  
    // Warning poles
    for (let y = startY + tileSize * 2; y < endY - tileSize; y += tileSize * 4) {
      const pisteEdge = getX(y);
      const poleOffset = offset * 0.3;
      const poleX = side === 'left' ? pisteEdge - poleOffset : pisteEdge + poleOffset;
      const poleHeight = 28;
      const poleWidth = 5;
      
      g.fillStyle(0x000000, 1);
      g.fillRect(poleX - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
      
      const stripeH = poleHeight / 5;
      for (let j = 0; j < 5; j++) {
        g.fillStyle(j % 2 === 0 ? 0xffcc00 : 0x111111, 1);
        g.fillRect(poleX - poleWidth / 2 - 1, y - poleHeight + j * stripeH, poleWidth + 2, stripeH);
      }
    }
  }

  /**
   * Create all piste boundary visuals: markers, access paths, forests, steep zones.
   */
  createPisteBoundaries(level: Level, tileSize: number, worldWidth: number): void {
    this.createPisteMarkers(level, tileSize);
    this.createAccessPaths(tileSize);
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
    g.setDepth(DEPTHS.MARKERS);
    const poleHeight = 28;
    const poleWidth = 5;
    const orangeTopHeight = Math.floor(poleHeight * 0.15);

    if (side === 'left') {
      g.fillStyle(color, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + orangeTopHeight, poleWidth, poleHeight - orangeTopHeight);
      g.fillStyle(0xFF6600, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, orangeTopHeight);
    } else {
      g.fillStyle(color, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
    }

    g.fillStyle(0x222222, 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
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
    const g = this.scene.add.graphics();
    g.setDepth(depth ?? yDepth(y));
    const size = 8 + Math.random() * 6;

    g.fillStyle(0x4a3728, 1);
    g.fillRect(x - 2, y, 4, size * 0.4);

    g.fillStyle(0x1a4a2a, 1);
    g.fillRect(x - size / 2, y - size * 0.6, size, size * 0.5);
    g.fillRect(x - size / 3, y - size, size * 0.66, size * 0.5);

    if (isStorm) {
      g.fillStyle(0xf0f5f8, 1);
      g.fillRect(x - size / 3, y - size, size * 0.66, 2);
      g.fillRect(x - size / 2, y - size * 0.6, size, 2);
    }
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

      // Warning triangle sign (per NF S52-102 — yellow/black triangle)
      const markerX = (leftEdge + rightEdge) / 2;
      const markerY = startY - 15;
      const mg = this.scene.add.graphics();
      mg.setDepth(DEPTHS.SIGNAGE);
      const triSize = 12;
      mg.fillStyle(0xffcc00, 1);
      mg.beginPath();
      mg.moveTo(markerX, markerY - triSize);
      mg.lineTo(markerX - triSize, markerY + triSize * 0.6);
      mg.lineTo(markerX + triSize, markerY + triSize * 0.6);
      mg.closePath();
      mg.fillPath();
      mg.lineStyle(1, 0x000000, 0.8);
      mg.beginPath();
      mg.moveTo(markerX, markerY - triSize);
      mg.lineTo(markerX - triSize, markerY + triSize * 0.6);
      mg.lineTo(markerX + triSize, markerY + triSize * 0.6);
      mg.closePath();
      mg.strokePath();
      mg.fillStyle(0x000000, 1);
      mg.fillRect(markerX - 1, markerY - 5, 2, 6);
      mg.fillRect(markerX - 1, markerY + 2, 2, 2);
      mg.setAlpha(0.8);

      this.scene.add.text(markerX + 14, markerY, zone.slope + '°', {
        fontFamily: THEME.fonts.family,
        fontSize: '9px',
        color: '#FF6600',
        backgroundColor: '#000000',
        padding: { x: 3, y: 1 }
      }).setOrigin(0, 0.5).setAlpha(0.8).setDepth(DEPTHS.SIGNAGE);

      this.geometry.steepZoneRects.push({
        startY: startY,
        endY: endY,
        leftX: leftEdge,
        rightX: rightEdge,
        slope: zone.slope
      });
    });
  }

  private createAccessPaths(tileSize: number): void {
    if (this.geometry.accessPathCurves.length === 0) return;

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
              const tile = this.scene.add.image(
                tx * tileSize + tileSize / 2,
                ty * tileSize + tileSize / 2,
                'snow_packed'
              );
              tile.setDisplaySize(tileSize, tileSize);
              tile.setDepth(DEPTHS.ACCESS_ROAD);
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
  }

  private createServiceRoadPole(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.MARKERS);

    const poleHeight = 28;
    const poleWidth = 5;
    const stripeHeight = Math.floor(poleHeight / 5);

    for (let i = 0; i < poleHeight; i += stripeHeight) {
      const isAmber = (Math.floor(i / stripeHeight) % 2 === 0);
      g.fillStyle(isAmber ? 0xFFAA00 : 0x111111, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + i, poleWidth, stripeHeight);
    }

    g.fillStyle(0x222222, 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
  }
}
