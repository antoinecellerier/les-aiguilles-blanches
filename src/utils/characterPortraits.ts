import Phaser from 'phaser';

/**
 * Draw a pixel art portrait on a Phaser Graphics object.
 * 
 * Grid system: 12x12 grid
 * Scale: size / 12
 */

// Colors
const COLORS = {
  skin: 0xffccaa,
  eyes: 0x000000,
  mouth: 0x553333,
  
  // Jean-Pierre (Blue)
  jp: {
    primary: 0x2d5a7b,
    hair: 0xdddddd,
  },
  
  // Marie (Purple)
  marie: {
    primary: 0x7b2d5a,
    hair: 0x4a3b2a,
    hat: 0xffffff,
  },
  
  // Thierry (Green)
  thierry: {
    primary: 0x5a7b2d,
    helmet: 0xffd700, // Safety yellow
    cross: 0xffffff,
    crossBg: 0xcc2200, // Red background for cross
  },
  
  // Émilie (Orange/Brown)
  emilie: {
    primary: 0x7b5a2d,
    secondary: 0xd4a055, // Blonde hair
    beanie: 0xcc4400, // Rust/Red beanie
  }
};

/**
 * Main entry point to draw a character portrait by name
 */
export function drawPortrait(g: Phaser.GameObjects.Graphics, name: string, x: number, y: number, size: number): void {
  const n = name.toLowerCase();
  
  if (n.includes('jean') || n.includes('pierre')) {
    drawJeanPierre(g, x, y, size);
  } else if (n.includes('marie')) {
    drawMarie(g, x, y, size);
  } else if (n.includes('thierry')) {
    drawThierry(g, x, y, size);
  } else if (n.includes('emilie') || n.includes('émilie')) {
    drawEmilie(g, x, y, size);
  } else {
    // Fallback/Unknown - Simple face
    drawGeneric(g, x, y, size);
  }
}

// Helper to draw grid-based pixels
// gx, gy are grid coordinates (0-11) relative to top-left of the 12x12 box
function drawGridPixels(g: Phaser.GameObjects.Graphics, startX: number, startY: number, pixelSize: number, pixels: number[][], color: number) {
  g.fillStyle(color, 1);
  for (const [gx, gy] of pixels) {
    g.fillRect(startX + gx * pixelSize, startY + gy * pixelSize, pixelSize, pixelSize);
  }
}

export function drawJeanPierre(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const p = Math.floor(size / 12);
  const startX = x - 6 * p;
  const startY = y - 6 * p;
  
  // Background (Sky Blue / Ice)
  g.fillStyle(0xd0e4f7, 1);
  g.fillRect(startX, startY, 12 * p, 12 * p);
  
  // Outfit (Collar/Shoulders)
  drawGridPixels(g, startX, startY, p, [
    [2, 11], [3, 11], [4, 11], [7, 11], [8, 11], [9, 11], // Bottom row
    [1, 11], [10, 11],
    [2, 10], [3, 10], [8, 10], [9, 10] // Collar
  ], COLORS.jp.primary);
  
  // Face (Skin)
  drawGridPixels(g, startX, startY, p, [
    [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], // Forehead
    [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], // Eyes level
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], // Nose level
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], // Mustache level
    [4, 8], [5, 8], [6, 8], [7, 8], // Chin
    [5, 9], [6, 9], // Neck
    [5, 10], [6, 10] // Neck base
  ], COLORS.skin);

  // Hair (Grey) - Receding hairline, sides
  drawGridPixels(g, startX, startY, p, [
    [2, 3], [2, 4], [2, 5], // Left side
    [9, 3], [9, 4], [9, 5], // Right side
    [3, 2], [8, 2], // Top corners
  ], COLORS.jp.hair);

  // Eyes
  drawGridPixels(g, startX, startY, p, [
    [4, 5], [7, 5]
  ], COLORS.eyes);

  // Mustache (Grey/White) - Thick walrus style
  drawGridPixels(g, startX, startY, p, [
    [4, 7], [5, 7], [6, 7], [7, 7], // Main line
    [3, 8], [8, 8] // Drooping ends
  ], COLORS.jp.hair);

  // Nose highlight
  drawGridPixels(g, startX, startY, p, [[6, 6]], 0xddaa88);
}

export function drawMarie(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const p = Math.floor(size / 12);
  const startX = x - 6 * p;
  const startY = y - 6 * p;

  // Background (Pinkish/Warm)
  g.fillStyle(0xffeeff, 1);
  g.fillRect(startX, startY, 12 * p, 12 * p);

  // Outfit (Purple)
  drawGridPixels(g, startX, startY, p, [
    [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
    [1, 11], [10, 11],
    [2, 10], [3, 10], [8, 10], [9, 10]
  ], COLORS.marie.primary);
  
  // White apron/scarf
  drawGridPixels(g, startX, startY, p, [
     [4, 10], [5, 10], [6, 10], [7, 10]
  ], 0xffffff);

  // Face
  drawGridPixels(g, startX, startY, p, [
    [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
    [4, 8], [5, 8], [6, 8], [7, 8],
    [5, 9], [6, 9],
  ], COLORS.skin);

  // Hair (Dark Brown) - Buns/Sides
  drawGridPixels(g, startX, startY, p, [
    [2, 4], [2, 5], [2, 6], // Left
    [9, 4], [9, 5], [9, 6], // Right
    [3, 3], [8, 3] // Under hat
  ], COLORS.marie.hair);

  // Chef Hat (Tall, White)
  drawGridPixels(g, startX, startY, p, [
    [4, 1], [5, 1], [6, 1], [7, 1], // Top
    [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], // Middle
    [4, 3], [5, 3], [6, 3], [7, 3] // Brim
  ], COLORS.marie.hat);

  // Eyes
  drawGridPixels(g, startX, startY, p, [[4, 6], [7, 6]], COLORS.eyes);
  
  // Mouth (Smile)
  drawGridPixels(g, startX, startY, p, [[5, 8], [6, 8]], COLORS.mouth);
}

export function drawThierry(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const p = Math.floor(size / 12);
  const startX = x - 6 * p;
  const startY = y - 6 * p;

  // Background (Pale Green)
  g.fillStyle(0xeeffee, 1);
  g.fillRect(startX, startY, 12 * p, 12 * p);

  // Outfit (Green)
  drawGridPixels(g, startX, startY, p, [
    [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
    [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10]
  ], COLORS.thierry.primary);

  // Face
  drawGridPixels(g, startX, startY, p, [
    [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
    [4, 8], [5, 8], [6, 8], [7, 8],
    [5, 9], [6, 9]
  ], COLORS.skin);

  // Safety Helmet (Yellow)
  drawGridPixels(g, startX, startY, p, [
    [4, 1], [5, 1], [6, 1], [7, 1],
    [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2],
    [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
  ], COLORS.thierry.helmet);

  // Red cross badge on helmet
  drawGridPixels(g, startX, startY, p, [[5, 2], [6, 2]], COLORS.thierry.crossBg);
  drawGridPixels(g, startX, startY, p, [[5, 2]], COLORS.thierry.cross);
  drawGridPixels(g, startX, startY, p, [[4, 3], [5, 3], [6, 3], [7, 3]], COLORS.thierry.crossBg);

  // Eyes (Sunglasses? Or just eyes. He's "Cautious")
  drawGridPixels(g, startX, startY, p, [[4, 6], [7, 6]], COLORS.eyes);
  
  // Mouth (Straight line - serious)
  drawGridPixels(g, startX, startY, p, [[5, 8], [6, 8]], COLORS.mouth);
}

export function drawEmilie(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const p = Math.floor(size / 12);
  const startX = x - 6 * p;
  const startY = y - 6 * p;

  // Background (Beige/Warm)
  g.fillStyle(0xf7e4d0, 1);
  g.fillRect(startX, startY, 12 * p, 12 * p);

  // Outfit (Orange/Brown)
  drawGridPixels(g, startX, startY, p, [
    [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
    [1, 11], [10, 11],
    [2, 10], [3, 10], [8, 10], [9, 10],
    [4, 10], [5, 10], [6, 10], [7, 10] // Scarf/Collar
  ], COLORS.emilie.primary);

  // Face
  drawGridPixels(g, startX, startY, p, [
    [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
    [4, 8], [5, 8], [6, 8], [7, 8],
    [5, 9], [6, 9],
  ], COLORS.skin);

  // Hair (Blonde - sticking out)
  drawGridPixels(g, startX, startY, p, [
    [2, 5], [2, 6], [2, 7], // Left loose hair
    [9, 5], [9, 6], [9, 7], // Right loose hair
    [3, 4], [8, 4] // Bangs under beanie
  ], COLORS.emilie.secondary);

  // Beanie (Rust/Orange)
  drawGridPixels(g, startX, startY, p, [
    [4, 1], [5, 1], [6, 1], [7, 1], // Pom pom
    [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], // Top
    [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], // Rim
  ], COLORS.emilie.beanie);

  // Eyes
  drawGridPixels(g, startX, startY, p, [[4, 6], [7, 6]], COLORS.eyes);
  
  // Mouth (Open/Happy?)
  drawGridPixels(g, startX, startY, p, [[5, 8], [6, 8]], COLORS.mouth);
}

function drawGeneric(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const p = Math.floor(size / 12);
  const startX = x - 6 * p;
  const startY = y - 6 * p;
  g.fillStyle(0xcccccc, 1);
  g.fillRect(startX, startY, 12 * p, 12 * p);
  // Simple smiley
  g.fillStyle(0x000000, 1);
  g.fillRect(startX + 3*p, startY + 4*p, 2*p, 2*p);
  g.fillRect(startX + 7*p, startY + 4*p, 2*p, 2*p);
  g.fillRect(startX + 3*p, startY + 8*p, 6*p, 1*p);
}
