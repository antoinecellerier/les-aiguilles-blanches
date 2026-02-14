import Phaser from 'phaser';
import { t, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { THEME } from '../config/theme';
import { GAME_EVENTS } from '../types/GameSceneInterface';

export interface AvalancheZone extends Phaser.GameObjects.Rectangle {
  avalancheRisk: number;
  zoneVisual: Phaser.GameObjects.Graphics;
  zonePoints: { x: number; y: number }[];
  warning1Fired?: boolean;
  warning2Fired?: boolean;
}

export class HazardSystem {
  private scene: Phaser.Scene;
  private avalancheZones: AvalancheZone[] = [];
  private avalancheTriggered = false;
  private avalancheTimer?: Phaser.Time.TimerEvent;

  /** Optional sound callback: 1 = warning1, 2 = warning2, 3 = trigger */
  onAvalancheSound: ((level: number) => void) | null = null;

  /** Query callbacks — set by owning scene before createAvalancheZones() */
  isGameOver: () => boolean = () => false;
  isGrooming: () => boolean = () => false;

  /** Multiplier for risk accumulation rate (default 1.0, higher = faster trigger). */
  riskMultiplier = 1.0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isTriggered(): boolean {
    return this.avalancheTriggered;
  }

  reset(): void {
    this.avalancheTriggered = false;
    this.avalancheZones = [];
  }

  destroy(): void {
    if (this.avalancheTimer) {
      this.avalancheTimer.destroy();
      this.avalancheTimer = undefined;
    }
  }

  createAvalancheZones(
    level: Level,
    tileSize: number,
    groomer: Phaser.Physics.Arcade.Sprite,
    avoidRects?: { startY: number; endY: number; leftX: number; rightX: number }[],
    avoidPoints?: { x: number; y: number }[],
    pistePath?: { centerX: number; width: number }[]
  ): Phaser.Physics.Arcade.StaticGroup {
    const worldWidth = level.width * tileSize;
    const worldHeight = level.height * tileSize;

    const avalancheGroup = this.scene.physics.add.staticGroup();

    const zoneCount = 3 + Math.floor(Math.random() * 2);
    // Track placed zones so subsequent zones spread out
    const placedRects: { startY: number; endY: number; leftX: number; rightX: number }[] = [];

    for (let i = 0; i < zoneCount; i++) {
      let zoneX: number, zoneY: number, zoneWidth: number, zoneHeight: number;
      let attempts = 0;
      let valid = false;

      // Try to place zone avoiding obstacles and previously placed zones
      do {
        zoneX = Phaser.Math.Between(tileSize * 5, worldWidth - tileSize * 5);
        zoneY = Phaser.Math.Between(worldHeight * 0.15, worldHeight * 0.65);
        zoneWidth = Phaser.Math.Between(tileSize * 4, tileSize * 8);
        zoneHeight = Phaser.Math.Between(tileSize * 6, tileSize * 12);

        // Shrink zones after many failed attempts to improve placement odds
        if (attempts > 30) {
          zoneWidth = Math.max(tileSize * 3, Math.round(zoneWidth * 0.7));
          zoneHeight = Math.max(tileSize * 4, Math.round(zoneHeight * 0.7));
        }

        attempts++;

        valid = true;
        const margin = tileSize * 2;
        const zLeft = zoneX - zoneWidth / 2 - margin;
        const zRight = zoneX + zoneWidth / 2 + margin;
        const zTop = zoneY - zoneHeight / 2 - margin;
        const zBottom = zoneY + zoneHeight / 2 + margin;

        // Check overlap with access paths and cliffs
        if (avoidRects) {
          for (const rect of avoidRects) {
            if (zRight > rect.leftX && zLeft < rect.rightX &&
                zBottom > rect.startY && zTop < rect.endY) {
              valid = false;
              break;
            }
          }
        }

        // Ensure zone doesn't overlap the piste path (should be off-piste)
        if (valid && pistePath) {
          const row = Math.floor(zoneY / tileSize);
          const path = pistePath[row];
          if (path) {
            const halfW = (path.width / 2) * tileSize;
            const pisteLeft = path.centerX * tileSize - halfW;
            const pisteRight = path.centerX * tileSize + halfW;
            if (zRight > pisteLeft && zLeft < pisteRight) {
              valid = false;
            }
          }
        }

        // Check overlap with previously placed zones (spread them out)
        if (valid) {
          for (const prev of placedRects) {
            if (zRight > prev.leftX && zLeft < prev.rightX &&
                zBottom > prev.startY && zTop < prev.endY) {
              valid = false;
              break;
            }
          }
        }

        // Check proximity to anchor points
        if (valid && avoidPoints) {
          for (const pt of avoidPoints) {
            if (pt.x >= zLeft && pt.x <= zRight &&
                pt.y >= zTop && pt.y <= zBottom) {
              valid = false;
              break;
            }
          }
        }
      } while (!valid && attempts < 50);

      if (!valid) {
        console.warn(`[hazard] Avalanche zone ${i + 1}/${zoneCount} skipped: no valid position after ${attempts} attempts`);
        continue;
      }

      // Register placed zone so subsequent zones don't overlap
      const margin = tileSize * 2;
      placedRects.push({
        startY: zoneY - zoneHeight / 2 - margin,
        endY: zoneY + zoneHeight / 2 + margin,
        leftX: zoneX - zoneWidth / 2 - margin,
        rightX: zoneX + zoneWidth / 2 + margin,
      });

      // Generate irregular polygon vertices from an ellipse
      const vertexCount = 8 + Math.floor(Math.random() * 5);
      const points: { x: number; y: number }[] = [];
      for (let v = 0; v < vertexCount; v++) {
        const angle = (v / vertexCount) * Math.PI * 2;
        const rx = zoneWidth / 2;
        const ry = zoneHeight / 2;
        // Randomize radius by ±25%
        const jitter = 0.75 + Math.random() * 0.5;
        points.push({
          x: zoneX + Math.cos(angle) * rx * jitter,
          y: zoneY + Math.sin(angle) * ry * jitter,
        });
      }

      const zoneVisual = this.scene.add.graphics();
      zoneVisual.setDepth(DEPTHS.CLIFFS + 0.5);
      this.drawZonePolygon(zoneVisual, points, THEME.colors.avalancheZone, 0.08);

      // Place sign above the topmost vertex
      const topY = Math.min(...points.map(p => p.y));
      const signY = topY - 10;
      this.createAvalancheSign(zoneX, signY);

      // Place barrier poles along the top edge
      const topPoints = points.filter(p => p.y < zoneY).sort((a, b) => a.x - b.x);
      const poleCount = Math.min(3, topPoints.length);
      for (let p = 0; p < poleCount; p++) {
        const idx = Math.floor(p * topPoints.length / poleCount);
        this.createBarrierPole(topPoints[idx].x, topPoints[idx].y + 5);
      }

      // Rope across top edge
      if (topPoints.length >= 2) {
        const ropeGraphics = this.scene.add.graphics();
        ropeGraphics.setDepth(DEPTHS.MARKERS);
        ropeGraphics.lineStyle(2, THEME.colors.black, 0.6);
        ropeGraphics.beginPath();
        ropeGraphics.moveTo(topPoints[0].x, topPoints[0].y + 5);
        for (let p = 1; p < topPoints.length; p++) {
          ropeGraphics.lineTo(topPoints[p].x, topPoints[p].y + 5);
        }
        ropeGraphics.strokePath();
      }

      const bottomY = Math.max(...points.map(p => p.y));
      this.createRiskIndicator(zoneX + zoneWidth / 2 + 15, topY + 20);

      this.scene.add.text(zoneX, bottomY + 8, t('zoneClosed'), {
        fontFamily: THEME.fonts.family,
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#CC0000',
        backgroundColor: '#FFFFFF',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5).setAlpha(0.9).setDepth(DEPTHS.SIGNAGE);

      const zone = this.scene.add.rectangle(
        zoneX, zoneY, zoneWidth, zoneHeight,
        0x000000, 0      ) as AvalancheZone;
      this.scene.physics.add.existing(zone, true);
      zone.avalancheRisk = 0;
      zone.zoneVisual = zoneVisual;
      zone.zonePoints = points;
      avalancheGroup.add(zone);
      this.avalancheZones.push(zone);
    }

    this.scene.physics.add.overlap(
      groomer,
      avalancheGroup,
      ((_groomer: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, zoneObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) => {
        this.handleAvalancheZone(groomer, zoneObj as Phaser.GameObjects.GameObject, level, tileSize);
      }) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    return avalancheGroup;
  }

  private handleAvalancheZone(
    groomer: Phaser.Physics.Arcade.Sprite,
    zoneObj: Phaser.GameObjects.GameObject,
    level: Level,
    tileSize: number
  ): void {
    if (this.isGameOver() || this.avalancheTriggered) return;

    const zone = zoneObj as AvalancheZone;

    // Precise point-in-polygon check (broad-phase rect already passed)
    if (!HazardSystem.pointInPolygon(groomer.x, groomer.y, zone.zonePoints)) return;

    zone.avalancheRisk += BALANCE.AVALANCHE_RISK_PER_FRAME * this.riskMultiplier;

    const riskAlpha = 0.05 + zone.avalancheRisk * 0.4;
    this.drawZonePolygon(zone.zoneVisual, zone.zonePoints, THEME.colors.avalancheDanger, Math.min(0.5, riskAlpha));

    if (this.isGrooming()) {
      zone.avalancheRisk += BALANCE.AVALANCHE_RISK_GROOMING * this.riskMultiplier;
    }

    if (zone.avalancheRisk > BALANCE.AVALANCHE_WARNING_1 && !zone.warning1Fired) {
      zone.warning1Fired = true;
      this.scene.cameras.main.shake(BALANCE.SHAKE_WARNING_1.duration, BALANCE.SHAKE_WARNING_1.intensity);
      this.onAvalancheSound?.(1);
    }
    if (zone.avalancheRisk > BALANCE.AVALANCHE_WARNING_2 && !zone.warning2Fired) {
      zone.warning2Fired = true;
      this.scene.cameras.main.shake(BALANCE.SHAKE_WARNING_2.duration, BALANCE.SHAKE_WARNING_2.intensity);
      this.onAvalancheSound?.(2);
      this.scene.game.events.emit(GAME_EVENTS.SHOW_DIALOGUE, 'avalancheWarning');
    }

    if (zone.avalancheRisk >= 1) {
      this.triggerAvalanche(level, tileSize);
    }
  }

  private triggerAvalanche(
    level: Level,
    tileSize: number
  ): void {
    if (this.avalancheTriggered) return;
    this.avalancheTriggered = true;

    this.onAvalancheSound?.(3);
    this.scene.cameras.main.shake(BALANCE.SHAKE_AVALANCHE.duration, BALANCE.SHAKE_AVALANCHE.intensity);

    const avalancheParticles = this.scene.add.particles(0, 0, 'snow_ungroomed', {
      x: { min: 0, max: level.width * tileSize },
      y: -50,
      lifespan: 2000,
      speedY: { min: 400, max: 600 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0.6 },
      alpha: { start: 1, end: 0.7 },
      quantity: 50,
      frequency: 20,
      tint: THEME.colors.snowflake
    });
    avalancheParticles.setDepth(DEPTHS.WEATHER + 1);

    this.scene.game.events.emit(GAME_EVENTS.SHOW_DIALOGUE, 'avalancheTrigger');

    this.avalancheTimer = this.scene.time.delayedCall(BALANCE.AVALANCHE_WIPEOUT_DELAY, () => {
      avalancheParticles.destroy();
      this.scene.game.events.emit(GAME_EVENTS.HAZARD_GAME_OVER, false, 'avalanche');
    });
  }

  private drawZonePolygon(g: Phaser.GameObjects.Graphics, points: { x: number; y: number }[], color: number, alpha: number): void {
    g.clear();
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();
  }

  /** Ray-casting point-in-polygon test. */
  static pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
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

  private createAvalancheSign(x: number, y: number): void {
    const signSize = 20;
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.SIGNAGE);
    const hs = signSize / 2;

    // Diamond shape built from two overlapping rotated rectangles
    g.fillStyle(THEME.colors.signYellow, 1);
    g.fillRect(x - hs, y - 2, hs, 4);
    g.fillRect(x - 2, y - hs, 4, hs);
    // Bottom-right half
    g.fillRect(x, y - 2, hs, 4);
    g.fillRect(x - 2, y, 4, hs);
    // Fill center
    g.fillRect(x - hs + 2, y - hs + 2, signSize - 4, signSize - 4);
    // Border
    g.lineStyle(1, THEME.colors.black, 1);
    g.strokeRect(x - hs + 1, y - hs + 1, signSize - 2, signSize - 2);

    // Avalanche symbol — exclamation mark (rectangles only)
    g.fillStyle(THEME.colors.black, 1);
    g.fillRect(x - 1, y - 4, 2, 6);
    g.fillRect(x - 1, y + 3, 2, 2);

    // Post — use rock palette brown
    g.fillStyle(THEME.colors.avalancheRock, 1);
    g.fillRect(x - 2, y + signSize / 2, 4, 12);
  }

  private createBarrierPole(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.MARKERS);

    // Pole — rock palette brown
    g.fillStyle(THEME.colors.avalancheRock, 1);
    g.fillRect(x - 2, y, 4, 25);

    // Flag — yellow per standard avalanche flag colors
    const flagWidth = 12;
    const flagHeight = 8;
    g.fillStyle(THEME.colors.signYellow, 1);
    g.fillRect(x + 2, y + 2, flagWidth, flagHeight);
    // Dark stripe on flag for detail
    g.fillStyle(THEME.colors.black, 0.4);
    g.fillRect(x + 2, y + 2 + flagHeight - 2, flagWidth, 2);
  }

  private createRiskIndicator(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTHS.SIGNAGE);
    const boxSize = 14;

    g.fillStyle(THEME.colors.snowflake, 0.9);
    g.fillRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);
    g.lineStyle(1, THEME.colors.black, 0.8);
    g.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);

    g.fillStyle(THEME.colors.hazardFire, 1);
    g.fillRect(x - boxSize / 2 + 2, y - boxSize / 2 + 2, boxSize - 4, boxSize - 4);

    this.scene.add.text(x, y, '4', {
      fontFamily: THEME.fonts.family,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#000000'
    }).setOrigin(0.5).setDepth(DEPTHS.SIGNAGE);

    this.scene.add.text(x, y + 10, t('riskLevelHigh'), {
      fontFamily: THEME.fonts.family,
      fontSize: '5px',
      color: '#000000'
    }).setOrigin(0.5).setDepth(DEPTHS.SIGNAGE);
  }
}
