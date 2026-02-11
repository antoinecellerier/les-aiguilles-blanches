/**
 * Procedural pixel art for skier and snowboarder sprites (top-down view).
 * Uses direct fillRect calls like the groomer texture in BootScene.
 *
 * Design: body-dominant at 20×28px. The suit color IS the sprite at game zoom.
 * Equipment (skis, board) are subtle accents. 90s retro ski clothing style
 * with neon color blocking (teal/magenta panels).
 *
 * 6 textures: skier, skier_left, skier_right,
 *             snowboarder, snowboarder_left, snowboarder_right
 */

// Color palette — 90s retro ski style
const C = {
  // Skier — teal/magenta 90s color block jacket
  skiTeal:    0x00aaaa,
  skiMagenta: 0xcc2288,
  skiDark:    0x007777,
  bonnet:     0xcc2200,    // knit bonnet body
  bonnetBand: 0xff4422,    // lighter band / ribbing
  pompom:     0xffdd00,    // bright yellow pompom (visible against snow)
  goggles:    0x87ceeb,
  ski:        0x666666,
  skiTip:     0x555555,
  boot:       0x333333,
  pole:       0x777777,
  // Snowboarder — hot pink/electric blue 90s style
  boardPink:   0xff3388,
  boardBlue:   0x3366ff,
  boardDark:   0xcc2266,
  boardBeanie: 0xff6600,    // orange beanie
  boardBand:   0xff8833,    // beanie ribbing
  board:       0x8b4513,
  boardEdge:   0x664422,
};

// ─── Skier (straight) ────────────────────────────────────────────────

export function createSkierTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Skis — subtle lines peeking past boots
  g.fillStyle(C.ski);
  g.fillRect(5, 22, 2, 6);
  g.fillRect(13, 22, 2, 6);

  // Poles — thin 1px lines from arm level
  g.fillStyle(C.pole);
  g.fillRect(2, 12, 1, 12);
  g.fillRect(17, 12, 1, 12);

  // Boots
  g.fillStyle(C.boot);
  g.fillRect(5, 20, 4, 4);
  g.fillRect(11, 20, 4, 4);

  // Legs
  g.fillStyle(C.skiDark);
  g.fillRect(5, 16, 4, 5);
  g.fillRect(11, 16, 4, 5);

  // Torso — 90s color block (teal body, magenta side panels)
  g.fillStyle(C.skiTeal);
  g.fillRect(4, 8, 12, 9);
  g.fillStyle(C.skiMagenta);
  g.fillRect(4, 8, 3, 9);    // left panel
  g.fillRect(13, 8, 3, 9);   // right panel

  // Arms
  g.fillStyle(C.skiDark);
  g.fillRect(3, 10, 2, 6);
  g.fillRect(15, 10, 2, 6);

  // Bonnet — tall knit cap
  g.fillStyle(C.bonnet);
  g.fillRect(6, 3, 8, 6);
  g.fillStyle(C.bonnetBand);
  g.fillRect(6, 7, 8, 2);     // ribbed band at forehead

  // Pompom — clearly sticks out on top
  g.fillStyle(C.pompom);
  g.fillRect(8, 0, 4, 4);

  // Goggles
  g.fillStyle(C.goggles);
  g.fillRect(7, 6, 6, 2);

  g.generateTexture('skier', 20, 28);
  g.destroy();
}

// ─── Skier turning left ──────────────────────────────────────────────

export function createSkierLeftTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Skis angled left
  g.fillStyle(C.ski);
  g.fillRect(3, 22, 2, 6);
  g.fillRect(10, 21, 2, 6);

  // Poles
  g.fillStyle(C.pole);
  g.fillRect(1, 11, 1, 12);
  g.fillRect(16, 13, 1, 12);

  // Boots
  g.fillStyle(C.boot);
  g.fillRect(4, 20, 4, 4);
  g.fillRect(10, 20, 4, 4);

  // Legs
  g.fillStyle(C.skiDark);
  g.fillRect(5, 16, 4, 5);
  g.fillRect(10, 16, 4, 5);

  // Torso
  g.fillStyle(C.skiTeal);
  g.fillRect(4, 8, 12, 9);
  g.fillStyle(C.skiMagenta);
  g.fillRect(4, 8, 3, 9);
  g.fillRect(13, 8, 3, 9);

  // Arms — left reaches into turn, right trails
  g.fillStyle(C.skiDark);
  g.fillRect(2, 9, 2, 6);
  g.fillRect(15, 11, 2, 6);

  // Bonnet (1px left shift)
  g.fillStyle(C.bonnet);
  g.fillRect(5, 3, 8, 6);
  g.fillStyle(C.bonnetBand);
  g.fillRect(5, 7, 8, 2);
  g.fillStyle(C.pompom);
  g.fillRect(7, 0, 4, 4);
  g.fillStyle(C.goggles);
  g.fillRect(6, 6, 6, 2);

  g.generateTexture('skier_left', 20, 28);
  g.destroy();
}

// ─── Skier turning right ─────────────────────────────────────────────

export function createSkierRightTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Skis angled right
  g.fillStyle(C.ski);
  g.fillRect(8, 21, 2, 6);
  g.fillRect(15, 22, 2, 6);

  // Poles
  g.fillStyle(C.pole);
  g.fillRect(3, 13, 1, 12);
  g.fillRect(18, 11, 1, 12);

  // Boots
  g.fillStyle(C.boot);
  g.fillRect(6, 20, 4, 4);
  g.fillRect(12, 20, 4, 4);

  // Legs
  g.fillStyle(C.skiDark);
  g.fillRect(6, 16, 4, 5);
  g.fillRect(11, 16, 4, 5);

  // Torso
  g.fillStyle(C.skiTeal);
  g.fillRect(4, 8, 12, 9);
  g.fillStyle(C.skiMagenta);
  g.fillRect(4, 8, 3, 9);
  g.fillRect(13, 8, 3, 9);

  // Arms — right reaches into turn, left trails
  g.fillStyle(C.skiDark);
  g.fillRect(3, 11, 2, 6);
  g.fillRect(16, 9, 2, 6);

  // Bonnet (1px right shift)
  g.fillStyle(C.bonnet);
  g.fillRect(7, 3, 8, 6);
  g.fillStyle(C.bonnetBand);
  g.fillRect(7, 7, 8, 2);
  g.fillStyle(C.pompom);
  g.fillRect(9, 0, 4, 4);
  g.fillStyle(C.goggles);
  g.fillRect(8, 6, 6, 2);

  g.generateTexture('skier_right', 20, 28);
  g.destroy();
}

// ─── Skier braking (snow plow / pizza stance) ────────────────────────

export function createSkierBrakeTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Skis in pizza / snow plow: tips close at bottom (downhill), tails spread at top
  g.fillStyle(C.ski);
  g.fillRect(3, 18, 2, 5);    // left ski tail (spread left, uphill)
  g.fillRect(15, 18, 2, 5);   // right ski tail (spread right, uphill)
  g.fillRect(7, 23, 2, 5);    // left ski tip (converging, downhill)
  g.fillRect(11, 23, 2, 5);   // right ski tip (converging, downhill)

  // Poles angled out
  g.fillStyle(C.pole);
  g.fillRect(1, 12, 1, 12);
  g.fillRect(18, 12, 1, 12);

  // Boots (wider apart)
  g.fillStyle(C.boot);
  g.fillRect(4, 20, 4, 4);
  g.fillRect(12, 20, 4, 4);

  // Legs (wider stance)
  g.fillStyle(C.skiDark);
  g.fillRect(5, 16, 4, 5);
  g.fillRect(12, 16, 4, 5);

  // Torso
  g.fillStyle(C.skiTeal);
  g.fillRect(4, 8, 12, 9);
  g.fillStyle(C.skiMagenta);
  g.fillRect(4, 8, 3, 9);
  g.fillRect(13, 8, 3, 9);

  // Arms (pushed out for balance)
  g.fillStyle(C.skiDark);
  g.fillRect(2, 10, 2, 6);
  g.fillRect(16, 10, 2, 6);

  // Bonnet
  g.fillStyle(C.bonnet);
  g.fillRect(6, 3, 8, 6);
  g.fillStyle(C.bonnetBand);
  g.fillRect(6, 7, 8, 2);
  g.fillStyle(C.pompom);
  g.fillRect(8, 0, 4, 4);
  g.fillStyle(C.goggles);
  g.fillRect(7, 6, 6, 2);

  g.generateTexture('skier_brake', 20, 28);
  g.destroy();
}

// ─── Snowboarder (straight) ─────────────────────────────────────────
// Snowboarder has a sideways stance (body narrower, board wide & prominent).
// Key visual difference from skier: single wide board, narrower body, orange beanie,
// hot pink/blue jacket.

export function createSnowboarderTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Board — vertical (nose pointing downhill), rider stands sideways
  g.fillStyle(C.board);
  g.fillRect(8, 16, 4, 12);
  g.fillStyle(C.boardEdge);
  g.fillRect(8, 16, 4, 2);   // tail (uphill)
  g.fillRect(8, 26, 4, 2);   // nose (downhill)

  // Boots (side by side on the vertical board)
  g.fillStyle(C.boot);
  g.fillRect(6, 19, 3, 3);
  g.fillRect(11, 19, 3, 3);

  // Legs
  g.fillStyle(C.boardDark);
  g.fillRect(6, 15, 3, 5);
  g.fillRect(11, 15, 3, 5);

  // Torso — hot pink / blue color block
  g.fillStyle(C.boardPink);
  g.fillRect(5, 6, 10, 10);
  g.fillStyle(C.boardBlue);
  g.fillRect(5, 6, 3, 10);
  g.fillRect(12, 6, 3, 10);

  // Arms spread wide for balance
  g.fillStyle(C.boardDark);
  g.fillRect(1, 8, 4, 4);
  g.fillRect(15, 8, 4, 4);

  // Orange beanie
  g.fillStyle(C.boardBeanie);
  g.fillRect(6, 1, 8, 5);
  g.fillStyle(C.boardBand);
  g.fillRect(6, 4, 8, 2);
  g.fillStyle(C.goggles);
  g.fillRect(7, 3, 6, 2);

  g.generateTexture('snowboarder', 20, 28);
  g.destroy();
}

// ─── Snowboarder turning left (toeside carve) ─────────────────────────

export function createSnowboarderLeftTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Board angled left (nose points down-left: diagonal staircase)
  g.fillStyle(C.board);
  g.fillRect(2, 24, 4, 4);
  g.fillRect(5, 21, 4, 4);
  g.fillRect(8, 18, 4, 4);
  g.fillRect(11, 15, 4, 4);
  g.fillStyle(C.boardEdge);
  g.fillRect(2, 26, 4, 2);   // nose (down-left)
  g.fillRect(11, 15, 4, 2);  // tail (up-right)

  // Boots
  g.fillStyle(C.boot);
  g.fillRect(4, 19, 3, 3);
  g.fillRect(10, 17, 3, 3);

  // Legs
  g.fillStyle(C.boardDark);
  g.fillRect(5, 14, 3, 5);
  g.fillRect(10, 13, 3, 5);

  // Torso (shifted left)
  g.fillStyle(C.boardPink);
  g.fillRect(4, 5, 10, 10);
  g.fillStyle(C.boardBlue);
  g.fillRect(4, 5, 3, 10);
  g.fillRect(11, 5, 3, 10);

  // Arms
  g.fillStyle(C.boardDark);
  g.fillRect(0, 7, 4, 4);
  g.fillRect(14, 9, 4, 4);

  // Orange beanie (left shift)
  g.fillStyle(C.boardBeanie);
  g.fillRect(5, 0, 8, 5);
  g.fillStyle(C.boardBand);
  g.fillRect(5, 3, 8, 2);
  g.fillStyle(C.goggles);
  g.fillRect(6, 2, 6, 2);

  g.generateTexture('snowboarder_left', 20, 28);
  g.destroy();
}

// ─── Snowboarder turning right (heelside carve) ──────────────────────

export function createSnowboarderRightTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Board angled right (nose points down-right: diagonal staircase)
  g.fillStyle(C.board);
  g.fillRect(5, 15, 4, 4);
  g.fillRect(8, 18, 4, 4);
  g.fillRect(11, 21, 4, 4);
  g.fillRect(14, 24, 4, 4);
  g.fillStyle(C.boardEdge);
  g.fillRect(5, 15, 4, 2);   // tail (up-left)
  g.fillRect(14, 26, 4, 2);  // nose (down-right)

  // Boots
  g.fillStyle(C.boot);
  g.fillRect(7, 17, 3, 3);
  g.fillRect(13, 19, 3, 3);

  // Legs
  g.fillStyle(C.boardDark);
  g.fillRect(7, 13, 3, 5);
  g.fillRect(12, 14, 3, 5);

  // Torso (shifted right)
  g.fillStyle(C.boardPink);
  g.fillRect(6, 5, 10, 10);
  g.fillStyle(C.boardBlue);
  g.fillRect(6, 5, 3, 10);
  g.fillRect(13, 5, 3, 10);

  // Arms
  g.fillStyle(C.boardDark);
  g.fillRect(3, 9, 4, 4);
  g.fillRect(16, 7, 4, 4);

  // Orange beanie (right shift)
  g.fillStyle(C.boardBeanie);
  g.fillRect(7, 0, 8, 5);
  g.fillStyle(C.boardBand);
  g.fillRect(7, 3, 8, 2);
  g.fillStyle(C.goggles);
  g.fillRect(8, 2, 6, 2);

  g.generateTexture('snowboarder_right', 20, 28);
  g.destroy();
}

// ─── Snowboarder braking (board perpendicular to fall line) ──────────

export function createSnowboarderBrakeTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 } as any, false);

  // Board — horizontal, under feet (perpendicular to fall line = braking)
  g.fillStyle(C.board);
  g.fillRect(1, 18, 18, 4);
  g.fillStyle(C.boardEdge);
  g.fillRect(1, 18, 2, 4);
  g.fillRect(17, 18, 2, 4);

  // Boots on board
  g.fillStyle(C.boot);
  g.fillRect(5, 16, 4, 4);
  g.fillRect(11, 16, 4, 4);

  // Legs (crouched, wider stance)
  g.fillStyle(C.boardDark);
  g.fillRect(5, 13, 4, 4);
  g.fillRect(11, 13, 4, 4);

  // Torso — crouched low
  g.fillStyle(C.boardPink);
  g.fillRect(4, 5, 12, 9);
  g.fillStyle(C.boardBlue);
  g.fillRect(4, 5, 3, 9);
  g.fillRect(13, 5, 3, 9);

  // Arms out wide for balance
  g.fillStyle(C.boardDark);
  g.fillRect(0, 7, 4, 4);
  g.fillRect(16, 7, 4, 4);

  // Orange beanie
  g.fillStyle(C.boardBeanie);
  g.fillRect(6, 0, 8, 5);
  g.fillStyle(C.boardBand);
  g.fillRect(6, 3, 8, 2);
  g.fillStyle(C.goggles);
  g.fillRect(7, 2, 6, 2);

  g.generateTexture('snowboarder_brake', 20, 28);
  g.destroy();
}
