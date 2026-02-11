import Phaser from 'phaser';
import { DEPTHS, yDepth } from '../config/gameConfig';
import { Accessibility } from '../setup';
import type { Level } from '../config/levels';
import type { LevelGeometry } from './LevelGeometry';
import type { ObstacleRect } from './WildlifeSystem';

/**
 * Creates obstacles, interactable buildings (restaurant, fuel station),
 * and decorative chalets. Returns building footprints for wildlife collision.
 */
export class ObstacleBuilder {
  private scene: Phaser.Scene;
  private geometry: LevelGeometry;

  buildingRects: ObstacleRect[] = [];

  constructor(scene: Phaser.Scene, geometry: LevelGeometry) {
    this.scene = scene;
    this.geometry = geometry;
  }

  /**
   * Create all obstacles and interactable buildings.
   * Call after physics groups are created.
   */
  create(
    level: Level, tileSize: number,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    interactables: Phaser.Physics.Arcade.StaticGroup,
    avoidPoints?: { x: number; y: number; radius: number }[]
  ): void {
    this.buildingRects = [];
    const obstacleTypes = level.obstacles || [];
    const worldWidth = level.width * tileSize;
    const worldHeight = level.height * tileSize;
    const isStorm = level.weather === 'storm';

    // Difficulty-scaled obstacle count — kept low for realistic pistes
    const baseCount = Math.floor(level.width * level.height / 100);
    let difficultyMultiplier: number;
    switch (level.difficulty) {
      case 'tutorial': difficultyMultiplier = 0.1; break;
      case 'green': difficultyMultiplier = 0.2; break;
      case 'blue': difficultyMultiplier = 0.3; break;
      case 'red': difficultyMultiplier = 0.5; break;
      case 'black': difficultyMultiplier = 0.6; break;
      case 'park': difficultyMultiplier = 0.2; break;
      default: difficultyMultiplier = 0.3;
    }
    const obstacleCount = Math.floor(baseCount * difficultyMultiplier);

    const placedPositions: { x: number; y: number }[] = [];
    const minSpacing = tileSize * 6; // comfortable gap for groomer to pass between any two
    const minSpacingSq = minSpacing * minSpacing;

    for (let i = 0; i < obstacleCount; i++) {
      const type = Phaser.Utils.Array.GetRandom(obstacleTypes);
      if (!type) continue;

      let x: number, y: number;
      let attempts = 0;
      const tooClose = (px: number, py: number) => {
        if (avoidPoints?.some(p => {
          const dx = px - p.x, dy = py - p.y;
          return dx * dx + dy * dy < p.radius * p.radius;
        })) return true;
        // Enforce minimum spacing between obstacles
        return placedPositions.some(p => {
          const dx = px - p.x, dy = py - p.y;
          return dx * dx + dy * dy < minSpacingSq;
        });
      };
      do {
        if (Math.random() < 0.9) {
          // Piste edges — where real obstacles naturally sit
          if (Math.random() < 0.5) {
            x = Phaser.Math.Between(tileSize * 3, tileSize * 6);
          } else {
            x = Phaser.Math.Between(worldWidth - tileSize * 6, worldWidth - tileSize * 3);
          }
          y = Phaser.Math.Between(tileSize * 5, worldHeight - tileSize * 5);
        } else {
          x = Phaser.Math.Between(tileSize * 8, worldWidth - tileSize * 8);
          y = Phaser.Math.Between(tileSize * 10, worldHeight - tileSize * 10);
        }
        attempts++;
      } while ((this.geometry.isOnAccessPath(x, y) || this.geometry.isOnCliff(x, y) || tooClose(x, y)) && attempts < 30);
      if (this.geometry.isOnAccessPath(x, y) || this.geometry.isOnCliff(x, y) || tooClose(x, y)) continue;

      let texture = 'tree';
      if (type === 'rocks') texture = 'rock';

      const obstacle = obstacles.create(x, y, texture);
      obstacle.setImmovable(true);
      obstacle.setScale(tileSize / 16);
      obstacle.setDepth(yDepth(y));
      placedPositions.push({ x, y });

      if (isStorm) {
        const s = tileSize / 16;
        const sg = this.scene.add.graphics().setDepth(yDepth(y) + 0.0001);
        sg.fillStyle(0xf0f5f8, 1);
        if (type === 'rocks') {
          sg.fillRect(x - 10 * s, y - 6 * s, 20 * s, 3 * s);
        } else {
          // Tree: snow on top two foliage tiers
          sg.fillRect(x - 5 * s, y - 20 * s, 10 * s, 2 * s);
          sg.fillRect(x - 9 * s, y - 12 * s, 18 * s, 2 * s);
        }
      }
    }

    // Restaurant at top of level
    const restaurant = interactables.create(
      worldWidth / 2 - tileSize * 4, tileSize * 2, 'restaurant'
    );
    restaurant.interactionType = 'food';
    restaurant.setScale(tileSize / 16);
    restaurant.setDepth(yDepth(restaurant.y));
    const rSize = tileSize * 2;
    this.addFootprint(restaurant.x, restaurant.y, rSize, rSize);

    if (isStorm) {
      const s = tileSize / 16;
      const rg = this.scene.add.graphics().setDepth(yDepth(restaurant.y) + 0.0001);
      rg.fillStyle(0xf0f5f8, 1);
      // Snow on restaurant roof
      rg.fillRect(restaurant.x - 28 * s, restaurant.y - 25 * s, 56 * s, 3 * s);
    }

    // Fuel station at bottom of level (shifted right on park levels to avoid features)
    const fuelX = level.difficulty === 'park'
      ? worldWidth - tileSize * 4
      : worldWidth / 2 + tileSize * 4;
    const fuelStation = interactables.create(
      fuelX, worldHeight - tileSize * 3, 'fuel'
    );
    fuelStation.interactionType = 'fuel';
    fuelStation.setScale(tileSize / 16);
    fuelStation.setDepth(yDepth(fuelStation.y));
    this.addFootprint(fuelStation.x, fuelStation.y, tileSize * 2, tileSize * 2);

    if (isStorm) {
      const s = tileSize / 16;
      const fg = this.scene.add.graphics().setDepth(yDepth(fuelStation.y) + 0.0001);
      fg.fillStyle(0xf0f5f8, 1);
      // Snow on fuel pump top
      fg.fillRect(fuelStation.x - 16 * s, fuelStation.y - 20 * s, 28 * s, 3 * s);
    }

    // Chalets on easier pistes
    if (['tutorial', 'green', 'blue'].includes(level.difficulty)) {
      this.createResortBuildings(level, tileSize, worldWidth);
    }
  }

  /** Register a building footprint (center-based) for wildlife collision avoidance. */
  private addFootprint(cx: number, cy: number, w: number, h: number): void {
    this.buildingRects.push({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  private createResortBuildings(level: Level, tileSize: number, worldWidth: number): void {
    let chaletCount: number;
    switch (level.difficulty) {
      case 'tutorial': chaletCount = 3; break;
      case 'green': chaletCount = 4; break;
      case 'blue': chaletCount = 2; break;
      default: chaletCount = 1;
    }

    const isTutorial = level.difficulty === 'tutorial';

    for (let i = 0; i < chaletCount; i++) {
      const side = i % 2 === 0 ? 'left' : 'right';

      let yPos: number;
      if (isTutorial) {
        yPos = tileSize * (4 + i * 2.5);
      } else {
        const bottomY = level.height * tileSize;
        yPos = bottomY - tileSize * (8 + i * 3);
      }

      const pathIndex = Math.floor(yPos / tileSize);
      const path = this.geometry.pistePath[pathIndex] ||
        { centerX: level.width / 2, width: level.width * 0.5 };

      const pisteEdge = side === 'left' ?
        (path.centerX - path.width / 2) * tileSize :
        (path.centerX + path.width / 2) * tileSize;

      const x = side === 'left' ?
        Math.max(tileSize * 3, pisteEdge - tileSize * 4) :
        Math.min(worldWidth - tileSize * 3, pisteEdge + tileSize * 4);

      // Skip if chalet would overlap an existing building
      const cSize = tileSize * 2;
      const cx = x - cSize / 2, cy = yPos - cSize * 0.4;
      const cw = cSize, ch = cSize * 0.65;
      const overlaps = this.buildingRects.some(b =>
        cx < b.x + b.w && cx + cw > b.x && cy < b.y + b.h && cy + ch > b.y
      );
      if (overlaps) continue;

      this.createChalet(x, yPos, tileSize, level.weather === 'storm');
    }
  }

  private createChalet(x: number, y: number, tileSize: number, isStorm?: boolean): void {
    const g = this.scene.add.graphics();
    g.setDepth(yDepth(y));
    const size = tileSize * 2;

    this.addFootprint(x, y - size * 0.4 + size * 0.325, size, size * 0.65);

    // Chalet body (wooden)
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - size / 2, y - size * 0.4, size, size * 0.6);

    // Stone foundation
    g.fillStyle(0x666666, 1);
    g.fillRect(x - size / 2 - 2, y + size * 0.15, size + 4, size * 0.1);

    // Roof (dark wood with snow)
    g.fillStyle(0x4a3728, 1);
    g.beginPath();
    g.moveTo(x - size * 0.7, y - size * 0.35);
    g.lineTo(x, y - size * 0.8);
    g.lineTo(x + size * 0.7, y - size * 0.35);
    g.closePath();
    g.fillPath();

    // Snow on roof
    g.fillStyle(0xFFFFFF, 0.9);
    g.beginPath();
    g.moveTo(x - size * 0.65, y - size * 0.4);
    g.lineTo(x, y - size * 0.75);
    g.lineTo(x + size * 0.65, y - size * 0.4);
    g.lineTo(x + size * 0.5, y - size * 0.35);
    g.lineTo(x, y - size * 0.6);
    g.lineTo(x - size * 0.5, y - size * 0.35);
    g.closePath();
    g.fillPath();

    // Storm: extra snow buildup on roof and chimney
    if (isStorm) {
      g.fillStyle(0xf0f5f8, 1);
      g.fillRect(x - size * 0.55, y - size * 0.42, size * 1.1, size * 0.06);
      g.fillRect(x + size * 0.24, y - size * 0.75, size * 0.14, size * 0.04);
    }

    // Windows
    g.fillStyle(0x87CEEB, 1);
    g.fillRect(x - size * 0.3, y - size * 0.25, size * 0.2, size * 0.2);
    g.fillRect(x + size * 0.1, y - size * 0.25, size * 0.2, size * 0.2);

    // Door
    g.fillStyle(0x4a3728, 1);
    g.fillRect(x - size * 0.1, y - size * 0.05, size * 0.2, size * 0.25);

    // Chimney with smoke
    g.fillStyle(0x555555, 1);
    g.fillRect(x + size * 0.25, y - size * 0.7, size * 0.12, size * 0.2);

    if (!Accessibility.settings.reducedMotion) {
      g.fillStyle(0xCCCCCC, 0.6);
      g.fillCircle(x + size * 0.31, y - size * 0.8, 3);
      g.fillCircle(x + size * 0.28, y - size * 0.9, 2);
    }
  }

  reset(): void {
    this.buildingRects = [];
  }
}
