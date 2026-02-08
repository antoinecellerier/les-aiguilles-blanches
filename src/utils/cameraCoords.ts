/**
 * Camera coordinate conversion utilities for scrollFactor(0) objects.
 *
 * Phaser 3 cameras apply both scroll AND zoom to all game objects.
 * `setScrollFactor(0)` only disables scroll — zoom still applies.
 *
 * For a Graphics with scrollFactor(0), the rendering pipeline is:
 *   calcMatrix = cameraMatrix * spriteMatrix
 * where cameraMatrix = translate(origin) * scale(zoom) * translate(-origin)
 * and spriteMatrix.e/f = 0 (scroll contribution is zero).
 *
 * So a drawn coordinate (dx, dy) maps to screen pixel:
 *   screenX = dx * zoom + originX * (1 - zoom)
 *   screenY = dy * zoom + originY * (1 - zoom)
 *
 * These helpers convert between world-space and the "draw-space"
 * that scrollFactor(0) Graphics objects need.
 */

/**
 * Convert a world position to draw-space for a scrollFactor(0) object.
 *
 * Derivation: a world object at (wx,wy) renders on screen at
 *   screenX = (wx - scrollX) * zoom + originX * (1 - zoom)
 * An overlay draw coord (dx) lands on screen at
 *   screenX = dx * zoom + originX * (1 - zoom)
 * Setting equal: dx = wx - scrollX
 */
export function worldToOverlay(
  cam: Phaser.Cameras.Scene2D.Camera,
  worldX: number,
  worldY: number
): { x: number; y: number } {
  return {
    x: worldX - cam.scrollX,
    y: worldY - cam.scrollY,
  };
}

/**
 * Get the draw-space rectangle that covers the entire screen.
 * Returns { x, y, width, height } suitable for fillRect().
 *
 * Inverts the camera transform for screen corners (0,0) and (W,H):
 *   dx = (screenX - originX * (1 - zoom)) / zoom
 * Start: dx = -originX * (1 - zoom) / zoom
 * Width: screenW / zoom
 */
export function overlayFullScreen(
  cam: Phaser.Cameras.Scene2D.Camera,
  margin = 0
): { x: number; y: number; width: number; height: number } {
  const zoom = cam.zoom || 1;
  const originX = cam.width * cam.originX;
  const originY = cam.height * cam.originY;
  const x = -originX * (1 - zoom) / zoom - margin;
  const y = -originY * (1 - zoom) / zoom - margin;
  const width = cam.width / zoom + margin * 2;
  const height = cam.height / zoom + margin * 2;
  return { x, y, width, height };
}

/**
 * Convert a world-space distance to draw-space.
 * No scaling needed — draw distances map 1:1 to world distances
 * because both are scaled equally by the camera zoom.
 */
export function worldDistToOverlay(dist: number): number {
  return dist;
}
