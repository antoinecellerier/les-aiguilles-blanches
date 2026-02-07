import Phaser from 'phaser';
import { t, type Level } from '../setup';
import { BALANCE } from '../config/gameConfig';
import { THEME } from '../config/theme';

export interface AvalancheZone extends Phaser.GameObjects.Rectangle {
  avalancheRisk: number;
  zoneVisual: Phaser.GameObjects.Rectangle;
}

export class HazardSystem {
  private scene: Phaser.Scene;
  private avalancheZones: AvalancheZone[] = [];
  private avalancheTriggered = false;

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

  createAvalancheZones(
    level: Level,
    tileSize: number,
    groomer: Phaser.Physics.Arcade.Sprite,
    isGameOver: () => boolean,
    isGrooming: () => boolean,
    showDialogue: (key: string) => void,
    gameOver: (won: boolean, reason: string) => void,
    avoidRects?: { startY: number; endY: number; leftX: number; rightX: number }[],
    avoidPoints?: { x: number; y: number }[]
  ): Phaser.Physics.Arcade.StaticGroup {
    const worldWidth = level.width * tileSize;
    const worldHeight = level.height * tileSize;

    const avalancheGroup = this.scene.physics.add.staticGroup();

    const zoneCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < zoneCount; i++) {
      let zoneX: number, zoneY: number, zoneWidth: number, zoneHeight: number;
      let attempts = 0;
      let valid = false;

      // Try to place zone avoiding access paths and anchor points
      do {
        zoneX = Phaser.Math.Between(tileSize * 5, worldWidth - tileSize * 5);
        zoneY = Phaser.Math.Between(worldHeight * 0.2, worldHeight * 0.6);
        zoneWidth = Phaser.Math.Between(tileSize * 4, tileSize * 8);
        zoneHeight = Phaser.Math.Between(tileSize * 6, tileSize * 12);
        attempts++;

        valid = true;
        const margin = tileSize * 2;
        const zLeft = zoneX - zoneWidth / 2 - margin;
        const zRight = zoneX + zoneWidth / 2 + margin;
        const zTop = zoneY - zoneHeight / 2 - margin;
        const zBottom = zoneY + zoneHeight / 2 + margin;

        // Check overlap with access paths
        if (avoidRects) {
          for (const rect of avoidRects) {
            if (zRight > rect.leftX && zLeft < rect.rightX &&
                zBottom > rect.startY && zTop < rect.endY) {
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
      } while (!valid && attempts < 20);

      if (!valid) continue; // Skip zone if no valid position found

      const zoneVisual = this.scene.add.rectangle(
        zoneX, zoneY, zoneWidth, zoneHeight,
        0xFFEEDD, 0.08
      );

      const signY = zoneY - zoneHeight / 2 - 10;
      this.createAvalancheSign(zoneX, signY);

      const poleSpacing = zoneWidth / 3;
      for (let p = 0; p < 3; p++) {
        const poleX = zoneX - zoneWidth / 2 + poleSpacing / 2 + p * poleSpacing;
        this.createBarrierPole(poleX, zoneY - zoneHeight / 2 + 10);
      }

      const ropeGraphics = this.scene.add.graphics();
      ropeGraphics.lineStyle(2, 0x000000, 0.6);
      ropeGraphics.beginPath();
      ropeGraphics.moveTo(zoneX - zoneWidth / 2 + 5, zoneY - zoneHeight / 2 + 15);
      ropeGraphics.lineTo(zoneX + zoneWidth / 2 - 5, zoneY - zoneHeight / 2 + 15);
      ropeGraphics.strokePath();

      this.createRiskIndicator(zoneX + zoneWidth / 2 + 15, zoneY - zoneHeight / 2 + 30);

      this.scene.add.text(zoneX, zoneY + zoneHeight / 2 + 8, t('zoneClosed'), {
        fontFamily: THEME.fonts.family,
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#CC0000',
        backgroundColor: '#FFFFFF',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5).setAlpha(0.9);

      const zone = this.scene.add.rectangle(
        zoneX, zoneY, zoneWidth * 0.8, zoneHeight * 0.8,
        0x000000, 0
      ) as AvalancheZone;
      this.scene.physics.add.existing(zone, true);
      zone.avalancheRisk = 0;
      zone.zoneVisual = zoneVisual;
      avalancheGroup.add(zone);
      this.avalancheZones.push(zone);
    }

    this.scene.physics.add.overlap(
      groomer,
      avalancheGroup,
      ((_groomer: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, zoneObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) => {
        this.handleAvalancheZone(zoneObj as Phaser.GameObjects.GameObject, isGameOver, isGrooming, showDialogue, level, tileSize, gameOver);
      }) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    return avalancheGroup;
  }

  private handleAvalancheZone(
    zoneObj: Phaser.GameObjects.GameObject,
    isGameOver: () => boolean,
    isGrooming: () => boolean,
    showDialogue: (key: string) => void,
    level: Level,
    tileSize: number,
    gameOver: (won: boolean, reason: string) => void
  ): void {
    if (isGameOver() || this.avalancheTriggered) return;

    const zone = zoneObj as AvalancheZone;
    zone.avalancheRisk += BALANCE.AVALANCHE_RISK_PER_FRAME;

    const riskAlpha = 0.05 + zone.avalancheRisk * 0.4;
    zone.zoneVisual.setFillStyle(0xFF2200, Math.min(0.5, riskAlpha));

    if (isGrooming()) {
      zone.avalancheRisk += BALANCE.AVALANCHE_RISK_GROOMING;
    }

    if (zone.avalancheRisk > BALANCE.AVALANCHE_WARNING_1 && zone.avalancheRisk < BALANCE.AVALANCHE_WARNING_1 + 0.05) {
      this.scene.cameras.main.shake(BALANCE.SHAKE_WARNING_1.duration, BALANCE.SHAKE_WARNING_1.intensity);
    }
    if (zone.avalancheRisk > BALANCE.AVALANCHE_WARNING_2 && zone.avalancheRisk < BALANCE.AVALANCHE_WARNING_2 + 0.05) {
      this.scene.cameras.main.shake(BALANCE.SHAKE_WARNING_2.duration, BALANCE.SHAKE_WARNING_2.intensity);
      showDialogue('avalancheWarning');
    }

    if (zone.avalancheRisk >= 1) {
      this.triggerAvalanche(level, tileSize, showDialogue, gameOver);
    }
  }

  private triggerAvalanche(
    level: Level,
    tileSize: number,
    showDialogue: (key: string) => void,
    gameOver: (won: boolean, reason: string) => void
  ): void {
    if (this.avalancheTriggered) return;
    this.avalancheTriggered = true;

    this.scene.cameras.main.shake(BALANCE.SHAKE_AVALANCHE.duration, BALANCE.SHAKE_AVALANCHE.intensity);

    const avalancheParticles = this.scene.add.particles(0, 0, 'snow_ungroomed', {
      x: { min: 0, max: level.width * tileSize },
      y: -50,
      lifespan: 2000,
      speedY: { min: 400, max: 600 },
      speedX: { min: -50, max: 50 },
      scale: { start: 0.8, end: 0.3 },
      alpha: { start: 1, end: 0.5 },
      quantity: 20,
      frequency: 30,
      tint: 0xFFFFFF
    });

    showDialogue('avalancheTrigger');

    this.scene.time.delayedCall(2000, () => {
      avalancheParticles.destroy();
      gameOver(false, 'avalanche');
    });
  }

  private createAvalancheSign(x: number, y: number): void {
    const signSize = 20;
    const g = this.scene.add.graphics();
    const hs = signSize / 2;

    // Diamond shape built from two overlapping rotated rectangles
    g.fillStyle(0xFFCC00, 1);
    // Top-left half
    g.fillRect(x - hs, y - 2, hs, 4);
    g.fillRect(x - 2, y - hs, 4, hs);
    // Bottom-right half
    g.fillRect(x, y - 2, hs, 4);
    g.fillRect(x - 2, y, 4, hs);
    // Fill center
    g.fillRect(x - hs + 2, y - hs + 2, signSize - 4, signSize - 4);
    // Border
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(x - hs + 1, y - hs + 1, signSize - 2, signSize - 2);

    // Avalanche symbol — exclamation mark (rectangles only)
    g.fillStyle(0x000000, 1);
    g.fillRect(x - 1, y - 4, 2, 6);
    g.fillRect(x - 1, y + 3, 2, 2);

    // Post — use rock palette brown
    g.fillStyle(0x4a423a, 1);
    g.fillRect(x - 2, y + signSize / 2, 4, 12);
  }

  private createBarrierPole(x: number, y: number): void {
    const g = this.scene.add.graphics();

    // Pole — rock palette brown
    g.fillStyle(0x4a423a, 1);
    g.fillRect(x - 2, y, 4, 25);

    // Flag — yellow per standard avalanche flag colors
    const flagWidth = 12;
    const flagHeight = 8;
    g.fillStyle(0xFFCC00, 1);
    g.fillRect(x + 2, y + 2, flagWidth, flagHeight);
    // Dark stripe on flag for detail
    g.fillStyle(0x000000, 0.4);
    g.fillRect(x + 2, y + 2 + flagHeight - 2, flagWidth, 2);
  }

  private createRiskIndicator(x: number, y: number): void {
    const g = this.scene.add.graphics();
    const boxSize = 14;

    g.fillStyle(0xFFFFFF, 0.9);
    g.fillRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);

    g.fillStyle(0xFF6600, 1);
    g.fillRect(x - boxSize / 2 + 2, y - boxSize / 2 + 2, boxSize - 4, boxSize - 4);

    this.scene.add.text(x, y, '4', {
      fontFamily: THEME.fonts.family,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#000000'
    }).setOrigin(0.5);

    this.scene.add.text(x, y + 10, t('riskLevelHigh'), {
      fontFamily: THEME.fonts.family,
      fontSize: '5px',
      color: '#000000'
    }).setOrigin(0.5);
  }
}
