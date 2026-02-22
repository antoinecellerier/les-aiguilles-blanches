/**
 * SlalomGateSystem — Generates and manages slalom gates for ski reward runs.
 * 
 * Gates are pairs of poles (red/blue alternating) placed along the piste.
 * The skier passes between them for a hit, or misses if outside the corridor.
 * Detection triggers when the skier's Y passes the gate row.
 */

import Phaser from 'phaser';
import type { Level } from '../config/levels';
import { LevelGeometry } from './LevelGeometry';
import { BALANCE, DEPTHS } from '../config/gameConfig';

export interface SlalomGate {
  y: number;           // tile row
  leftX: number;       // world X of left pole
  rightX: number;      // world X of right pole
  color: 'red' | 'blue';
  triggered: boolean;
  hit: boolean;
  leftPole: Phaser.GameObjects.Image;
  rightPole: Phaser.GameObjects.Image;
  feedbackText?: Phaser.GameObjects.Text;
}

export class SlalomGateSystem {
  gates: SlalomGate[] = [];
  gatesHit = 0;
  gatesMissed = 0;
  private scene: Phaser.Scene | null = null;

  /** Create gates and add pole sprites to the scene. */
  create(
    scene: Phaser.Scene,
    level: Level,
    geometry: LevelGeometry,
    tileSize: number,
    nightSfx = '',
  ): void {
    if (!level.slalomGates) return;
    this.scene = scene;

    const { count, width } = level.slalomGates;
    const usableStart = Math.round(level.height * 0.05) + 3;
    const usableEnd = level.height - BALANCE.SKI_FINISH_BUFFER - 1;
    const spacing = Math.floor((usableEnd - usableStart) / (count + 1));

    // Max lateral px the skier can traverse between gates (conservative: direction-reversal case)
    const gateTimeSec = (spacing * tileSize) / BALANCE.SKI_GRAVITY_SPEED;
    const maxLateralPx = BALANCE.SKI_LATERAL_SPEED * gateTimeSec * 0.65;
    let prevCenterX: number | null = null;

    for (let i = 0; i < count; i++) {
      const tileY = usableStart + spacing * (i + 1);
      const path = geometry.pistePath[tileY];
      if (!path) continue;

      const halfW = (width / 2) * tileSize;
      const baseOffset = Math.min(width * 0.3, path.width * 0.15);
      const offsetDir = i % 2 === 0 ? -1 : 1;

      // Ideal position follows piste center with alternating offset
      let centerX = (path.centerX + offsetDir * baseOffset) * tileSize;

      // Piste boundaries for the gate center (poles must fit inside the piste)
      const pisteLeft = (path.centerX - path.width / 2 + width / 2) * tileSize;
      const pisteRight = (path.centerX + path.width / 2 - width / 2) * tileSize;

      // Clamp lateral distance from previous gate to what's physically achievable
      if (prevCenterX !== null) {
        const dist = Math.abs(centerX - prevCenterX);
        if (dist > maxLateralPx + halfW) {
          const dir = Math.sign(centerX - prevCenterX) || 1;
          centerX = prevCenterX + dir * (maxLateralPx + halfW);
          centerX = Math.max(pisteLeft, Math.min(pisteRight, centerX));
        }
      }

      const color = i % 2 === 0 ? 'red' : 'blue';
      const texKey = (color === 'red' ? 'slalom_red' : 'slalom_blue') + nightSfx;
      const worldY = tileY * tileSize;

      const leftPole = scene.add.image(centerX - halfW, worldY, texKey).setOrigin(0.5, 1).setDepth(DEPTHS.MARKERS);
      const rightPole = scene.add.image(centerX + halfW, worldY, texKey).setOrigin(0.5, 1).setDepth(DEPTHS.MARKERS);
      // No scaling — texture is already at world-coordinate size (3×36px)

      prevCenterX = centerX;

      this.gates.push({
        y: tileY,
        leftX: centerX - halfW,
        rightX: centerX + halfW,
        color,
        triggered: false,
        hit: false,
        leftPole,
        rightPole,
      });
    }
  }

  /** Call each frame with the skier's world position. Returns 'hit' | 'miss' | null. */
  update(skierX: number, skierY: number, tileSize: number, scene: Phaser.Scene): 'hit' | 'miss' | null {
    let result: 'hit' | 'miss' | null = null;
    for (const gate of this.gates) {
      if (gate.triggered) continue;

      const gateWorldY = gate.y * tileSize;
      // Trigger when skier passes the gate row (going downhill)
      if (skierY >= gateWorldY - tileSize * 0.5 && skierY <= gateWorldY + tileSize * 1.5) {
        gate.triggered = true;

        // Check if skier is between the poles
        const isHit = skierX >= gate.leftX && skierX <= gate.rightX;
        gate.hit = isHit;

        if (isHit) {
          this.gatesHit++;
          this.showFeedback(scene, gate, '✓', 0x44ff44);
          result = 'hit';
        } else {
          this.gatesMissed++;
          this.showFeedback(scene, gate, '✗', 0xff4444);
          // Dim missed gate poles
          gate.leftPole.setAlpha(0.3);
          gate.rightPole.setAlpha(0.3);
          result = 'miss';
        }
      }
    }
    return result;
  }

  private showFeedback(scene: Phaser.Scene, gate: SlalomGate, symbol: string, color: number): void {
    const midX = (gate.leftX + gate.rightX) / 2;
    const worldY = gate.leftPole.y;
    const colorStr = '#' + color.toString(16).padStart(6, '0');

    const text = scene.add.text(midX, worldY - 20, symbol, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: colorStr,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTHS.MARKERS + 1);

    gate.feedbackText = text;

    // Float up and fade
    scene.tweens.add({
      targets: text,
      y: worldY - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
        gate.feedbackText = undefined;
      },
    });
  }

  /** Total gate count. */
  get totalGates(): number {
    return this.gates.length;
  }

  /** Clean up all sprites. */
  destroy(): void {
    for (const gate of this.gates) {
      if (gate.feedbackText && this.scene) {
        this.scene.tweens.killTweensOf(gate.feedbackText);
      }
      gate.leftPole.destroy();
      gate.rightPole.destroy();
      gate.feedbackText?.destroy();
    }
    this.gates = [];
    this.gatesHit = 0;
    this.gatesMissed = 0;
    this.scene = null;
  }
}
