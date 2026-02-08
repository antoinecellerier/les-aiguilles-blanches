/**
 * Procedural pixel art for alpine wildlife.
 *
 * Each species is drawn on a Phaser Graphics object using a grid system,
 * following the same pattern as characterPortraits.ts.
 *
 * All animals are drawn in top-down view to match the game perspective.
 * Facing direction is controlled by the caller via Graphics.setScale(-1, 1) for flip.
 */

export type AnimalType = 'bouquetin' | 'chamois' | 'marmot' | 'bunny' | 'bird' | 'fox';

// Grid dimensions per species (width × height in grid cells)
export const ANIMAL_GRID = {
  bouquetin: { w: 10, h: 8 },
  chamois:   { w: 7, h: 6 },
  marmot:    { w: 5, h: 4 },
  bunny:     { w: 6, h: 5 },
  bird:      { w: 4, h: 3 },
  bird_flying: { w: 6, h: 3 },
  bird_perched: { w: 2, h: 3 },
  fox:       { w: 8, h: 5 },
} as const;

const C = {
  // Bouquetin (Alpine ibex)
  ibexBody: 0x6e6259,     // Gray-brown (more accurate)
  ibexBelly: 0xc4a35a,    // Light tan
  ibexHorn: 0x444444,     // Dark gray horns
  ibexLeg: 0x4a4038,      // Darker gray-brown legs
  ibexEye: 0x000000,

  // Chamois
  chamoisBody: 0x5c3d1e,  // Dark brown
  chamoisBelly: 0xd4b87a, // Cream underside
  chamoisLeg: 0x3a2510,   // Very dark legs
  chamoisHorn: 0x222222,  // Black horns
  chamoisEye: 0x000000,

  // Marmot
  marmotBody: 0x8b7355,   // Tawny brown
  marmotBelly: 0xc4a87a,  // Light belly
  marmotEye: 0x000000,
  marmotNose: 0x553333,

  // Snow bunny (Lièvre variable — winter coat)
  bunnyBody: 0xf0f0f0,    // Near-white fur
  bunnyInner: 0xffc0cb,   // Pink ear lining
  bunnyEye: 0x000000,
  bunnyNose: 0xffaaaa,
  bunnyShadow: 0xdcdcdc,  // Slight shadow to distinguish from snow

  // Birds (Chocards / Alpine choughs)
  birdBody: 0x111111,     // Black plumage
  birdBeak: 0xffcc00,     // Yellow beak
  birdEye: 0xffffff,
  birdLeg: 0xff3333,      // Red legs

  // Fox (Renard roux)
  foxBody: 0xcc6600,      // Orange-red fur
  foxBelly: 0xf0e0c0,     // Cream white underbelly
  foxTail: 0xcc6600,      // Orange tail
  foxTailTip: 0xf0f0f0,   // White tail tip
  foxLeg: 0x222222,       // Dark legs/paws
  foxEar: 0x1a1a1a,       // Dark ear tips
  foxEye: 0x000000,
  foxNose: 0x222222,
};

/**
 * Draw an animal sprite on a Graphics object.
 * @param g      Graphics object to draw on
 * @param type   Animal species
 * @param x      Center X position
 * @param y      Center Y position
 * @param scale  Pixel size multiplier (1 = 1px per grid cell)
 */
export function drawAnimal(
  g: Phaser.GameObjects.Graphics,
  type: AnimalType,
  x: number,
  y: number,
  scale: number,
): void {
  switch (type) {
    case 'bouquetin': drawBouquetin(g, x, y, scale); break;
    case 'chamois':   drawChamois(g, x, y, scale);   break;
    case 'marmot':    drawMarmot(g, x, y, scale);     break;
    case 'bunny':     drawBunny(g, x, y, scale);      break;
    case 'bird':      drawBird(g, x, y, scale);       break;
    case 'fox':       drawFox(g, x, y, scale);        break;
  }
}

// Helper: draw filled grid pixels (same pattern as characterPortraits.ts)
function px(g: Phaser.GameObjects.Graphics, ox: number, oy: number, s: number, cells: number[][], color: number): void {
  g.fillStyle(color, 1);
  for (const [gx, gy] of cells) {
    g.fillRect(ox + gx * s, oy + gy * s, s, s);
  }
}

// ── Bouquetin (Alpine ibex) ────────────────────────────────────────
// 10×8 grid, top-down facing right
// Large body, curved horns extending forward
function drawBouquetin(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.bouquetin;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Horns (large, curving back)
  px(g, ox, oy, s, [
    [7, 1], [6, 0], [5, 0], // Curve back
  ], C.ibexHorn);

  // Body (large oval-ish shape)
  px(g, ox, oy, s, [
    [3, 2], [4, 2], [5, 2], [6, 2],                         // Back
    [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],         // Mid body
    [1, 3],                                                  // Tail
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],         // Core
    [3, 5], [4, 5], [5, 5], [6, 5],                          // Lower body
  ], C.ibexBody);

  // Belly highlight
  px(g, ox, oy, s, [
    [4, 4], [5, 4],
    [4, 5], [5, 5],
  ], C.ibexBelly);

  // Head
  px(g, ox, oy, s, [
    [7, 2], [8, 2],
    [8, 3],
  ], C.ibexBody);

  // Eye
  px(g, ox, oy, s, [[8, 2]], C.ibexEye);

  // Legs (4 stubby legs visible in top-down)
  px(g, ox, oy, s, [
    [2, 5],              // Rear left
    [2, 2],              // Front left
    [6, 6], [7, 6],      // Rear right
    [7, 5],              // Front right
  ], C.ibexLeg);
}

// ── Chamois ────────────────────────────────────────────────────────
// 7×6 grid, top-down facing right
// Slender body, short upright horns
function drawChamois(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.chamois;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Horns (short, upright hooks)
  px(g, ox, oy, s, [
    [5, 0], [6, 0],
  ], C.chamoisHorn);

  // Body
  px(g, ox, oy, s, [
    [2, 1], [3, 1], [4, 1],                    // Back
    [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],    // Mid
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],    // Core
    [2, 4], [3, 4], [4, 4],                     // Lower
  ], C.chamoisBody);

  // Belly
  px(g, ox, oy, s, [
    [3, 3], [4, 3],
  ], C.chamoisBelly);

  // Head
  px(g, ox, oy, s, [
    [6, 1],
  ], C.chamoisBody);

  // Face mask (light stripe)
  px(g, ox, oy, s, [[5, 1]], C.chamoisBelly);

  // Eye
  px(g, ox, oy, s, [[6, 1]], C.chamoisEye);

  // Legs
  px(g, ox, oy, s, [
    [1, 4],              // Rear left
    [1, 1],              // Front left
    [4, 5],              // Rear right
    [5, 4],              // Front right
  ], C.chamoisLeg);
}

// ── Marmot ─────────────────────────────────────────────────────────
// 5×4 grid, top-down facing right
// Round body, small and compact
function drawMarmot(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.marmot;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Body (round blob)
  px(g, ox, oy, s, [
    [1, 0], [2, 0], [3, 0],          // Top
    [0, 1], [1, 1], [2, 1], [3, 1],  // Mid
    [0, 2], [1, 2], [2, 2], [3, 2],  // Core
    [1, 3], [2, 3],                   // Bottom
  ], C.marmotBody);

  // Belly
  px(g, ox, oy, s, [
    [2, 1], [2, 2],
  ], C.marmotBelly);

  // Head
  px(g, ox, oy, s, [
    [4, 0], [4, 1],
  ], C.marmotBody);

  // Eye and nose
  px(g, ox, oy, s, [[4, 0]], C.marmotEye);
  px(g, ox, oy, s, [[4, 1]], C.marmotNose);
}

// ── Snow bunny (Lièvre variable) ───────────────────────────────────
// 6×5 grid, top-down facing right
// White body with long ears, nearly invisible on snow
function drawBunny(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.bunny;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Shadow outline (so bunny is visible against white snow)
  px(g, ox, oy, s, [
    [2, 0],                                    // Ear tips shadow
    [0, 2],                                    // Tail shadow
    [1, 4], [2, 4], [3, 4],                    // Bottom shadow
  ], C.bunnyShadow);

  // Body
  px(g, ox, oy, s, [
    [2, 1], [3, 1],                            // Upper body
    [1, 2], [2, 2], [3, 2], [4, 2],            // Core
    [1, 3], [2, 3], [3, 3], [4, 3],            // Lower body
  ], C.bunnyBody);

  // Ears (long, upright with black tips)
  px(g, ox, oy, s, [
    [4, 0], [5, 0],          // Ear outers
    [4, 1],                  // Ear base
  ], C.bunnyBody);

  // Ear tips (black for winter coat)
  px(g, ox, oy, s, [[4, 0]], 0x000000);

  // Ear inner (pink)
  px(g, ox, oy, s, [
    [5, 0],
  ], C.bunnyInner);

  // Head
  px(g, ox, oy, s, [
    [5, 1], [5, 2],
  ], C.bunnyBody);

  // Eye
  px(g, ox, oy, s, [[5, 1]], C.bunnyEye);

  // Nose
  px(g, ox, oy, s, [[5, 2]], C.bunnyNose);

  // Tail (cotton puff)
  px(g, ox, oy, s, [[0, 3]], C.bunnyBody);
}

// ── Bird (Chocard à bec jaune / Alpine chough) ─────────────────────
// 4×3 grid, top-down facing right
// Tiny black silhouette with yellow beak, drawn in flight pose
function drawBird(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.bird;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Wings spread (top-down, V shape)
  px(g, ox, oy, s, [
    [0, 0], [1, 0],            // Left wingtip
    [1, 1], [2, 1],            // Body
    [0, 2], [1, 2],            // Right wingtip
  ], C.birdBody);

  // Beak
  px(g, ox, oy, s, [[3, 1]], C.birdBeak);

  // Eye
  px(g, ox, oy, s, [[2, 1]], C.birdEye);
}

// ── Bird side-view flying (for menu/profile view) ───────────────────
// 6×3 grid, side view soaring with wings raised
function drawBirdFlying(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.bird_flying;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Wing (raised above body — soaring profile)
  px(g, ox, oy, s, [[1, 0], [2, 0], [3, 0]], C.birdBody);

  // Body (tail to head)
  px(g, ox, oy, s, [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]], C.birdBody);

  // Beak
  px(g, ox, oy, s, [[5, 1]], C.birdBeak);

  // Eye (on head pixel)
  px(g, ox, oy, s, [[4, 1]], C.birdEye);

  // Tucked legs
  px(g, ox, oy, s, [[2, 2]], C.birdLeg);
}

/** Draw a side-view flying bird (soaring profile). Exported for menu use. */
export function drawBirdSideFlying(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, scale: number,
): void {
  drawBirdFlying(g, x, y, scale);
}

// ── Bird perched (wings folded, side view) ──────────────────────────
// 2×3 grid, compact upright sitting pose
function drawBirdPerched_(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.bird_perched;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Body (compact oval)
  px(g, ox, oy, s, [
    [0, 0], [1, 0],   // Head
    [0, 1], [1, 1],   // Body
    [0, 2],            // Tail
  ], C.birdBody);

  // Beak
  px(g, ox, oy, s, [[1, 0]], C.birdBeak);

  // Legs (Alpine chough red legs)
  px(g, ox, oy, s, [[1, 2]], C.birdLeg);
}

/** Draw a perched bird (wings folded). Exported for menu/game use. */
export function drawBirdPerched(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, scale: number,
): void {
  drawBirdPerched_(g, x, y, scale);
}

// ── Fox (Renard roux) ──────────────────────────────────────────────
// 8×5 grid, top-down facing right
// Slender orange body, bushy tail with white tip, dark paws
function drawFox(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  const grid = ANIMAL_GRID.fox;
  const ox = x - (grid.w / 2) * s;
  const oy = y - (grid.h / 2) * s;

  // Tail (bushy, trailing behind)
  px(g, ox, oy, s, [
    [0, 1], [0, 2], [0, 3],
    [1, 2],
  ], C.foxTail);

  // Tail tip (white)
  px(g, ox, oy, s, [[0, 2]], C.foxTailTip);

  // Body
  px(g, ox, oy, s, [
    [3, 1], [4, 1],                         // Upper body
    [2, 2], [3, 2], [4, 2], [5, 2],         // Core
    [3, 3], [4, 3],                         // Lower body
  ], C.foxBody);

  // Belly
  px(g, ox, oy, s, [
    [3, 2], [4, 2],
  ], C.foxBelly);

  // Head (pointed snout)
  px(g, ox, oy, s, [
    [5, 1], [6, 1],
    [5, 2], [6, 2], [7, 2],
    [5, 3], [6, 3],
  ], C.foxBody);

  // Ears (dark tips)
  px(g, ox, oy, s, [
    [6, 0], [7, 0],
  ], C.foxEar);

  // Eye
  px(g, ox, oy, s, [[6, 1]], C.foxEye);

  // Nose
  px(g, ox, oy, s, [[7, 2]], C.foxNose);

  // Legs (dark paws)
  px(g, ox, oy, s, [
    [2, 3],         // Rear left
    [2, 1],         // Front left
    [4, 4],         // Rear right
    [5, 4],         // Front right
  ], C.foxLeg);
}
