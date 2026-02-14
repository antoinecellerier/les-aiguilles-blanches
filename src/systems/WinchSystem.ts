import Phaser from 'phaser';
import { DEPTHS, yDepth, BALANCE } from '../config/gameConfig';
import { THEME } from '../config/theme';
import { Accessibility } from '../setup';
import { t } from '../setup';
import type { Level } from '../config/levels';
import type { LevelGeometry } from './LevelGeometry';

export interface WinchAnchor {
  x: number;
  y: number;      // Hook position (top) - for cable attachment
  baseY: number;  // Base position - for proximity detection
  number: number;
}

/**
 * Manages winch anchors, cable rendering, and attachment state.
 * GameScene queries isActive/isTaut/anchorPosition for movement and gameplay.
 */
export class WinchSystem {
  private scene: Phaser.Scene;
  private geometry: LevelGeometry;

  anchors: WinchAnchor[] = [];
  private cableGraphics: Phaser.GameObjects.Graphics | null = null;

  active = false;
  anchor: WinchAnchor | null = null;
  useCount = 0;

  constructor(scene: Phaser.Scene, geometry: LevelGeometry) {
    this.scene = scene;
    this.geometry = geometry;
  }

  /** Whether the cable is taut (groomer is below the anchor). */
  isTaut(groomerY: number): boolean {
    return this.active && this.anchor != null && (groomerY - 10) > this.anchor.y;
  }

  createAnchors(level: Level, tileSize: number): void {
    const anchorDefs = level.winchAnchors || [];
    this.anchors = [];

    this.cableGraphics = this.scene.add.graphics();
    this.cableGraphics.setDepth(DEPTHS.WINCH_CABLE);

    if (anchorDefs.length === 0) {
      const defaultYIndex = Math.min(4, this.geometry.pistePath.length - 1);
      const anchorY = tileSize * 4;
      const path = this.geometry.pistePath[defaultYIndex] || { centerX: level.width / 2 };
      this.createAnchorPost(path.centerX * tileSize, anchorY, 1);
      return;
    }

    anchorDefs.forEach((def, i) => {
      const yIndex = Math.min(Math.floor(def.y * level.height), this.geometry.pistePath.length - 1);
      const path = this.geometry.pistePath[yIndex] || { centerX: level.width / 2 };
      const x = path.centerX * tileSize;
      const y = yIndex * tileSize;
      this.createAnchorPost(x, y, i + 1);
    });
  }

  private createAnchorPost(x: number, y: number, number: number): void {
    const g = this.scene.add.graphics();
    g.setDepth(yDepth(y));

    // Base plate
    g.fillStyle(THEME.colors.anchorBase, 1);
    g.fillRect(x - 10, y + 5, 20, 8);

    // Vertical pole
    g.fillStyle(THEME.colors.signPole, 1);
    g.fillRect(x - 4, y - 20, 8, 28);

    // Cable hook ring (rectangle, no circles)
    g.fillStyle(THEME.colors.metalLight, 1);
    g.fillRect(x - 6, y - 28, 12, 3);
    g.fillRect(x - 6, y - 22, 12, 3);
    g.fillRect(x - 6, y - 28, 3, 9);
    g.fillRect(x + 3, y - 28, 3, 9);

    // Yellow number plate with black text
    g.fillStyle(THEME.colors.signPlate, 1);
    g.fillRect(x - 8, y + 14, 16, 10);
    g.fillStyle(THEME.colors.black, 1);
    this.scene.add.text(x, y + 19, '' + number, {
      fontFamily: 'Courier New, monospace',
      fontSize: '8px',
      color: '#000000',
    }).setOrigin(0.5).setDepth(DEPTHS.GROUND_LABELS);

    this.anchors.push({ x, y: y - 22, baseY: y + 8, number });
  }

  getNearestAnchor(groomerX: number, groomerY: number, tileSize: number): WinchAnchor | null {
    if (this.anchors.length === 0) return null;

    let nearest: WinchAnchor | null = null;
    let nearestDist = Infinity;
    const maxAttachDistance = tileSize * 3;

    this.anchors.forEach(anchor => {
      const dist = Phaser.Math.Distance.Between(groomerX, groomerY, anchor.x, anchor.baseY);
      if (dist < nearestDist && dist <= maxAttachDistance) {
        nearestDist = dist;
        nearest = anchor;
      }
    });

    return nearest;
  }

  /**
   * Update winch state and draw cable.
   * @param isWinchPressed Whether the winch input is currently held
   * @param groomerX Current groomer X position
   * @param groomerY Current groomer Y position
   * @param tileSize Current tile size
   * @param levelHeight Level height in tiles
   */
  update(isWinchPressed: boolean, groomerX: number, groomerY: number, tileSize: number, levelHeight: number): boolean {
    if (isWinchPressed && !this.active) {
      this.anchor = this.getNearestAnchor(groomerX, groomerY, tileSize);
      if (this.anchor) {
        this.active = true;
        this.useCount++;
        Accessibility.announce(t('winchAttached') || 'Winch attached');
      }
    } else if (!isWinchPressed && this.active) {
      this.detach();
    }

    if (this.active && this.anchor && this.cableGraphics) {
      this.cableGraphics.clear();
      
      const anchorX = this.anchor.x;
      const anchorY = this.anchor.y;
      const cableGroomerY = groomerY - 10;
      
      const dist = Phaser.Math.Distance.Between(groomerX, cableGroomerY, anchorX, anchorY);
      const maxDist = BALANCE.WINCH_MAX_CABLE * tileSize;

      // Snap cable if groomer exceeds max length
      if (dist > maxDist) {
        Accessibility.announce(t('winchSnapped') || 'Cable snapped!');
        this.detach();
        return true;
      }

      const hasSlack = cableGroomerY <= anchorY;
      
      if (hasSlack) {
        const midX = (anchorX + groomerX) / 2;
        const dist = Math.abs(groomerX - anchorX);
        const sag = Math.max(30, dist * 0.3);
        const midY = Math.max(anchorY, cableGroomerY) + sag;
        
        this.cableGraphics.lineStyle(2, THEME.colors.cableGrey, 0.7);
        this.cableGraphics.beginPath();
        this.cableGraphics.moveTo(anchorX, anchorY);
        const segments = 12;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const px = (1 - t) * (1 - t) * anchorX + 2 * (1 - t) * t * midX + t * t * groomerX;
          const py = (1 - t) * (1 - t) * anchorY + 2 * (1 - t) * t * midY + t * t * cableGroomerY;
          this.cableGraphics.lineTo(px, py);
        }
        this.cableGraphics.strokePath();
      } else {
        const tension = Math.min(1, dist / maxDist);
        const cableColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(136, 136, 136),
          new Phaser.Display.Color(255, 100, 100),
          100,
          tension * 100
        );
        this.cableGraphics.lineStyle(3,
          Phaser.Display.Color.GetColor(cableColor.r, cableColor.g, cableColor.b), 1);
        this.cableGraphics.beginPath();
        this.cableGraphics.moveTo(anchorX, anchorY);
        this.cableGraphics.lineTo(groomerX, cableGroomerY);
        this.cableGraphics.strokePath();
      }
    }
    return false;
  }

  /** Detach winch and clear cable visual. */
  detach(): void {
    this.active = false;
    this.anchor = null;
    if (this.cableGraphics) {
      this.cableGraphics.clear();
    }
  }

  reset(): void {
    this.anchors = [];
    this.active = false;
    this.anchor = null;
    this.useCount = 0;
    this.cableGraphics = null;
  }
}
