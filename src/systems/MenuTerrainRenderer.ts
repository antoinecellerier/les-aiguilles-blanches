import Phaser from 'phaser';

/**
 * Renders the static menu background: sky gradient, mountains, snow ground, trees, and groomer.
 * Sky + far mountains are consolidated into a single DynamicTexture (depth 0).
 * Ground + shadow lines are consolidated into a single DynamicTexture (depth 3).
 * Near mountains (depth 2), trees, and groomer (depth 5+) remain separate Images
 * so that bouquetins and ground animals can interleave with them.
 */
export function createMenuTerrain(scene: Phaser.Scene, width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, weather?: { isNight: boolean; weather: string }, skipGroomer = false): void {
  const isStorm = weather?.weather === 'storm';
  // Remove stale textures from prior scene lifecycle before recreating
  removeMenuTextures(scene);
  createSkyAndFarMountains(scene, width, snowLineY, scaleFactor, isStorm, weather);
  createNearMountains(scene, width, snowLineY, scaleFactor, isStorm);
  createSnowGround(scene, width, height, snowLineY, footerHeight);
  createTrees(scene, width, snowLineY, scaleFactor, isStorm);
  if (!skipGroomer) createGroomer(scene, width, snowLineY, scaleFactor, isStorm);

  scene.events.once('shutdown', () => removeMenuTextures(scene));
}

const MENU_TEX_KEYS = ['_menu_bg_sky', '_menu_bg_ground', '_menu_groomer', '_menu_near_mtn_0', '_menu_near_mtn_1'];
for (let i = 0; i < 9; i++) MENU_TEX_KEYS.push(`_menu_tree_${i}`);

function removeMenuTextures(scene: Phaser.Scene): void {
  for (const key of MENU_TEX_KEYS) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
}

function colorToCSS(c: number, a = 1): string {
  return `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`;
}

/** Paint sky gradient + far mountains onto a single DynamicTexture at depth 0. */
function createSkyAndFarMountains(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean, weather?: { isNight: boolean; weather: string }): void {
  const key = '_menu_bg_sky';
  const mtnScale = snowLineY / 600;
  // Far mountains extend below snowLineY by 2 steps
  const overshoot = 2 * 16;
  const dtH = snowLineY + overshoot;

  const dt = scene.textures.addDynamicTexture(key, width, dtH);
  if (!dt) return;
  dt.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
  const ctx = dt.context!;
  ctx.imageSmoothingEnabled = false;

  // Sky bands
  const skyBand1 = snowLineY * 0.4;
  const skyBand2 = snowLineY * 0.25;
  const isNight = weather?.isNight;
  const colors = isStorm
    ? [0x707478, 0x808488, 0x909498]
    : isNight
      ? [0x0a1628, 0x142240, 0x1e3050]
      : [0x5bb8e8, 0x87ceeb, 0xa8ddf0];
  ctx.fillStyle = colorToCSS(colors[0]);
  ctx.fillRect(0, 0, width, skyBand1);
  ctx.fillStyle = colorToCSS(colors[1]);
  ctx.fillRect(0, skyBand1, width, skyBand2);
  ctx.fillStyle = colorToCSS(colors[2]);
  ctx.fillRect(0, skyBand1 + skyBand2, width, snowLineY - skyBand1 - skyBand2);

  // Far mountains painted directly onto the texture
  const sx = width / 1024;
  const farMtns: [number, number, number, number, number, boolean][] = [
    [80 * sx, 180 * mtnScale, 220 * mtnScale, 0x4a423a, 0x6a5e52, true],
    [350 * sx, 200 * mtnScale, 320 * mtnScale, 0x2d2822, 0x4a423a, true],
    [512 * sx, 240 * mtnScale, 300 * mtnScale, 0x4a423a, 0x6a5e52, true],
    [600 * sx, 220 * mtnScale, 380 * mtnScale, 0x4a423a, 0x6a5e52, true],
    [900 * sx, 190 * mtnScale, 260 * mtnScale, 0x2d2822, 0x4a423a, true],
  ];
  for (const [cx, baseWidth, peakHeight, bodyColor, highlightColor, snowCap] of farMtns) {
    paintMountain(ctx, cx, snowLineY, baseWidth, peakHeight, bodyColor, highlightColor, snowCap, isStorm);
  }

  scene.add.image(width / 2, 0, key).setOrigin(0.5, 0).setDepth(0);
}

/** Paint a stepped mountain directly onto a Canvas 2D context. */
function paintMountain(ctx: CanvasRenderingContext2D, cx: number, baseY: number, baseWidth: number, peakHeight: number, bodyColor: number, highlightColor: number, snowCap: boolean, isStorm: boolean): void {
  const stepH = 16;
  const steps = Math.ceil(peakHeight / stepH);
  for (let i = -2; i < steps; i++) {
    const t = Math.max(0, i) / steps;
    const w = baseWidth * (1 - t * 0.85);
    ctx.fillStyle = colorToCSS(i % 3 === 0 ? highlightColor : bodyColor);
    ctx.fillRect(cx - w / 2, baseY - i * stepH, w, stepH);
  }
  const hasSnowCap = snowCap || isStorm;
  if (hasSnowCap && peakHeight > 100) {
    const baseCap = Math.max(2, Math.min(4, Math.floor(steps * 0.12)));
    const capSteps = isStorm ? Math.min(steps - 1, baseCap * 2) : baseCap;
    ctx.fillStyle = colorToCSS(0xf0f5f8);
    for (let i = 0; i < capSteps; i++) {
      const t = (steps - capSteps + i) / steps;
      const w = baseWidth * (1 - t * 0.85);
      ctx.fillRect(cx - w / 2, baseY - (steps - capSteps + i) * stepH, w, stepH);
    }
  }
}

/** Near mountains remain as separate baked Images at depth 2 (bouquetins interleave). */
function createNearMountains(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const mtnScale = snowLineY / 600;
  const nearMtns: [number, number, number, number, number, number, boolean][] = [
    [200 * sx, 240 * mtnScale, 160 * mtnScale, 0x6a5e52, 0x8a7e6a, 0, false],
    [750 * sx, 260 * mtnScale, 180 * mtnScale, 0x6a5e52, 0x8a7e6a, 1, false],
  ];
  for (const [cx, baseWidth, peakHeight, bodyColor, highlightColor, idx, snowCap] of nearMtns) {
    drawSteppedMountain(scene, cx, snowLineY, baseWidth, peakHeight, bodyColor, highlightColor, snowCap, 2, isStorm, idx as number);
  }
}

function drawSteppedMountain(scene: Phaser.Scene, cx: number, baseY: number, baseWidth: number, peakHeight: number, bodyColor: number, highlightColor: number, snowCap: boolean, depth: number, isStorm: boolean, idx: number): void {
  const stepH = 16;
  const steps = Math.ceil(peakHeight / stepH);
  const texH = (steps + 2) * stepH;
  const texW = Math.ceil(baseWidth) + 2;
  const texCx = texW / 2;

  const g = scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
  for (let i = -2; i < steps; i++) {
    const t = Math.max(0, i) / steps;
    const w = baseWidth * (1 - t * 0.85);
    const color = i % 3 === 0 ? highlightColor : bodyColor;
    const ry = texH - (i + 2) * stepH;
    g.fillStyle(color, 1);
    g.fillRect(texCx - w / 2, ry, w, stepH);
  }
  const hasSnowCap = snowCap || isStorm;
  if (hasSnowCap && peakHeight > 100) {
    const baseCap = Math.max(2, Math.min(4, Math.floor(steps * 0.12)));
    const capSteps = isStorm ? Math.min(steps - 1, baseCap * 2) : baseCap;
    g.fillStyle(0xf0f5f8, 1);
    for (let i = 0; i < capSteps; i++) {
      const t = (steps - capSteps + i) / steps;
      const w = baseWidth * (1 - t * 0.85);
      const ry = texH - (steps - capSteps + i + 2) * stepH;
      g.fillRect(texCx - w / 2, ry, w, stepH);
    }
  }
  const key = `_menu_near_mtn_${idx}`;
  g.generateTexture(key, texW, texH);
  g.destroy();
  const tex = scene.textures.get(key);
  if (tex?.source?.[0]) tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
  scene.add.image(cx, baseY + 2 * stepH, key).setOrigin(0.5, 1).setDepth(depth);
}

/** Consolidate snow ground + shadow lines + snowline border into one DynamicTexture at depth 3. */
function createSnowGround(scene: Phaser.Scene, width: number, height: number, snowLineY: number, footerHeight: number): void {
  const groundH = height - snowLineY;
  if (groundH <= 0) return;
  const key = '_menu_bg_ground';
  const dt = scene.textures.addDynamicTexture(key, width, groundH);
  if (!dt) return;
  dt.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
  const ctx = dt.context!;
  ctx.imageSmoothingEnabled = false;

  // White snow fill
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, groundH);
  // Shadow lines
  const linesH = groundH - footerHeight;
  if (linesH > 0) {
    ctx.fillStyle = colorToCSS(0xf0f6fa);
    for (let ly = 8; ly < linesH; ly += 10) {
      ctx.fillRect(0, ly, width, 1);
    }
  }
  // Snowline border
  ctx.fillStyle = colorToCSS(0xd8e4e8);
  ctx.fillRect(0, 0, width, 3);

  scene.add.image(width / 2, snowLineY, key).setOrigin(0.5, 0).setDepth(3);
}

function createTrees(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const treePositions = [
    40 * sx, 100 * sx, 130 * sx, 220 * sx, 310 * sx,
    width - 40 * sx, width - 110 * sx, width - 170 * sx, width - 260 * sx,
  ];
  for (let ti = 0; ti < treePositions.length; ti++) {
    const tx = treePositions[ti];
    const s = (0.7 + Math.random() * 0.7) * scaleFactor;
    const treeBaseY = snowLineY + 10 * s;
    // Draw tree at origin, bake to texture, place as Image
    const treeW = Math.ceil(26 * s) + 2;
    const treeH = Math.ceil(34 * s) + 2;
    const cx = treeW / 2;
    const g = scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
    g.fillStyle(0x228b22);
    g.fillRect(cx - 5 * s, treeH - 10 * s - 24 * s, 10 * s, 8 * s);
    g.fillRect(cx - 9 * s, treeH - 10 * s - 16 * s, 18 * s, 8 * s);
    g.fillRect(cx - 13 * s, treeH - 10 * s - 8 * s, 26 * s, 10 * s);
    if (isStorm) {
      g.fillStyle(0xf0f5f8);
      g.fillRect(cx - 5 * s, treeH - 10 * s - 24 * s, 10 * s, 3 * s);
      g.fillRect(cx - 9 * s, treeH - 10 * s - 16 * s, 18 * s, 3 * s);
      g.fillRect(cx - 13 * s, treeH - 10 * s - 8 * s, 26 * s, 3 * s);
    }
    g.fillStyle(0x8b4513);
    g.fillRect(cx - 3 * s, treeH - 10 * s, 6 * s, 10 * s);
    const key = `_menu_tree_${ti}`;
    g.generateTexture(key, treeW, treeH);
    g.destroy();
    const tex = scene.textures.get(key);
    if (tex?.source?.[0]) tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
    scene.add.image(tx, snowLineY + 10 * s, key)
      .setOrigin(0.5, 1)
      .setDepth(5 + treeBaseY * 0.001);
  }
}

function createGroomer(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const isLandscape = width > snowLineY * 1.5;
  const gx = isLandscape ? width * 0.82 : width / 2 + 140 * sx;
  const s = 2.0 * scaleFactor;
  // Draw groomer at origin, bake to texture
  // Bounding box: from blade left (-27*s) to finisher right (37*s), from exhaust top (-38*s) to tracks bottom (0)
  const leftEdge = 27 * s;
  const texW = Math.ceil((27 + 37) * s) + 2;
  const texH = Math.ceil(38 * s) + 2;
  const ox = leftEdge; // origin X offset within texture
  const oy = texH;     // origin Y = groundY in texture (bottom)
  const g = scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
  // Tracks
  g.fillStyle(0x333333);
  g.fillRect(ox - 24 * s, oy - 8 * s, 48 * s, 8 * s);
  g.fillStyle(0x444444);
  for (let tx = -22; tx < 24; tx += 6) {
    g.fillRect(ox + tx * s, oy - 7 * s, 3 * s, 6 * s);
  }
  // Body
  g.fillStyle(0xcc2200);
  g.fillRect(ox - 18 * s, oy - 22 * s, 36 * s, 14 * s);
  // Cabin
  g.fillStyle(0x1e90ff);
  g.fillRect(ox - 8 * s, oy - 32 * s, 20 * s, 11 * s);
  g.fillStyle(0x87ceeb);
  g.fillRect(ox - 5 * s, oy - 30 * s, 14 * s, 7 * s);
  g.fillStyle(0xaa1a00);
  g.fillRect(ox - 10 * s, oy - 34 * s, 24 * s, 3 * s);
  // Blade
  g.fillStyle(0x888888);
  g.fillRect(ox - 26 * s, oy - 14 * s, 10 * s, 10 * s);
  g.fillStyle(0xaaaaaa);
  g.fillRect(ox - 27 * s, oy - 16 * s, 4 * s, 12 * s);
  // Exhaust
  g.fillStyle(0x555555);
  g.fillRect(ox + 10 * s, oy - 38 * s, 3 * s, 8 * s);
  // Tiller
  g.fillStyle(0x777777);
  g.fillRect(ox + 22 * s, oy - 12 * s, 8 * s, 3 * s);
  g.fillStyle(0x555555);
  g.fillRect(ox + 28 * s, oy - 14 * s, 6 * s, 8 * s);
  g.fillStyle(0x666666);
  for (let ty = -13; ty < -6; ty += 3) {
    g.fillRect(ox + 29 * s, oy + ty * s, 4 * s, 2 * s);
  }
  // Finisher comb
  g.fillStyle(0x888888);
  g.fillRect(ox + 34 * s, oy - 6 * s, 3 * s, 6 * s);
  g.fillStyle(0x999999);
  for (let ty = -5; ty < 0; ty += 2) {
    g.fillRect(ox + 34 * s, oy + ty * s, 3 * s, 1 * s);
  }
  // Storm accumulation
  if (isStorm) {
    g.fillStyle(0xf0f5f8);
    g.fillRect(ox - 10 * s, oy - 37 * s, 24 * s, 3 * s);
    g.fillRect(ox - 18 * s, oy - 23 * s, 36 * s, 2 * s);
    g.fillRect(ox - 27 * s, oy - 17 * s, 10 * s, 2 * s);
  }
  const key = '_menu_groomer';
  g.generateTexture(key, texW, texH);
  g.destroy();
  const tex = scene.textures.get(key);
  if (tex?.source?.[0]) tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
  // Place image so that the origin maps to gx, snowLineY (ground level)
  scene.add.image(gx - leftEdge + texW / 2, snowLineY - texH, key)
    .setOrigin(0.5, 0)
    .setDepth(5 + snowLineY * 0.001);
}
