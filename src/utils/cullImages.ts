/**
 * Shared off-screen culling for world-space Images.
 *
 * Hides Images whose display bounds are entirely outside the camera viewport
 * (plus a configurable margin). Only affects Images at terrain/forest/tree
 * depths (≤ DEPTHS.MARKERS) with scrollFactor 1.
 *
 * Used by GameScene and SkiRunScene to avoid rendering hundreds of off-screen
 * trees, rocks, and cliff textures every frame.
 */
import Phaser from 'phaser';
import { DEPTHS } from '../config/gameConfig';

export interface CullBounds { x: number; y: number; w: number; h: number }

const EMPTY_BOUNDS: CullBounds = { x: 0, y: 0, w: 0, h: 0 };

export function emptyCullBounds(): CullBounds {
  return { ...EMPTY_BOUNDS };
}

/**
 * Cull world-space Images in a scene based on camera viewport.
 *
 * @param scene    — the Phaser scene whose children to cull
 * @param margin   — extra pixels around viewport before culling (use tileSize * 3)
 * @param hysteresis — minimum camera movement before re-checking (use tileSize)
 * @param prev     — previous cull bounds (mutated in place for next call)
 * @returns the updated cull bounds
 */
export function cullOffscreenImages(
  scene: Phaser.Scene,
  margin: number,
  hysteresis: number,
  prev: CullBounds,
): CullBounds {
  const cam = scene.cameras.main;
  const left = cam.worldView.x - margin;
  const right = cam.worldView.right + margin;
  const top = cam.worldView.y - margin;
  const bottom = cam.worldView.bottom + margin;

  // Skip if camera hasn't moved enough
  if (
    Math.abs(left - prev.x) < hysteresis &&
    Math.abs(top - prev.y) < hysteresis &&
    Math.abs(right - prev.x - prev.w) < hysteresis &&
    Math.abs(bottom - prev.y - prev.h) < hysteresis
  ) {
    return prev;
  }

  const bounds: CullBounds = { x: left, y: top, w: right - left, h: bottom - top };

  const children = scene.children.list;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.type === 'Image' && (c as Phaser.GameObjects.Image).scrollFactorX === 1) {
      const img = c as Phaser.GameObjects.Image;
      if (img.depth <= DEPTHS.MARKERS) {
        const lx = img.x - img.displayWidth * img.originX;
        const rx = img.x + img.displayWidth * (1 - img.originX);
        const ty = img.y - img.displayHeight * img.originY;
        const by = img.y + img.displayHeight * (1 - img.originY);
        img.visible = rx > left && lx < right && by > top && ty < bottom;
      }
    }
  }

  return bounds;
}
