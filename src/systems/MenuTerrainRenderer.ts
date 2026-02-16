import Phaser from 'phaser';
import { DEPTHS } from '../config/gameConfig';
import { THEME } from '../config/theme';
import { MenuWildlifeController } from './MenuWildlifeController';
import { playClick } from './UISounds';
import { t } from '../setup';

export interface MenuBackdropOptions {
  weather?: { isNight: boolean; weather: string };
  skipGroomer?: boolean;
  /** Darken overlay alpha (0 = no overlay). Default 0.88 */
  overlayAlpha?: number;
  /** Depth for the dark overlay. Default MENU_BACKDROP */
  overlayDepth?: number;
  /** Snow line as fraction of height. Default: 0.78 landscape, 0.82 portrait */
  snowLinePct?: number;
}

export interface MenuBackdrop {
  wildlife: MenuWildlifeController;
  snowLineY: number;
  scaleFactor: number;
}

/**
 * One-call setup for the standard menu background: sky, mountains, snow,
 * trees, wildlife, and dark readability overlay. Returns the wildlife
 * controller (caller must forward update/destroy).
 */
export function createMenuBackdrop(scene: Phaser.Scene, opts: MenuBackdropOptions = {}): MenuBackdrop {
  const { width, height } = scene.cameras.main;
  const scaleFactor = Math.min(width / 800, height / 600);
  const isPortrait = height > width;
  const snowLinePct = opts.snowLinePct ?? (isPortrait ? 0.82 : 0.78);
  const snowLineY = Math.round(height * snowLinePct);

  createMenuTerrain(scene, width, height, snowLineY, 0, scaleFactor, opts.weather, opts.skipGroomer);

  const wildlife = new MenuWildlifeController(scene);
  wildlife.snowLineY = snowLineY;

  const alpha = opts.overlayAlpha ?? 0.88;
  if (alpha > 0) {
    wildlife.behindBackdrop = true;
  }

  wildlife.create(width, height, snowLineY, 0, scaleFactor, opts.weather);

  if (alpha > 0) {
    const depth = opts.overlayDepth ?? DEPTHS.MENU_BACKDROP;
    scene.add.rectangle(width / 2, height / 2, width, height, THEME.colors.darkBg)
      .setAlpha(alpha).setDepth(depth);
  }

  return { wildlife, snowLineY, scaleFactor };
}

export interface MenuHeader {
  title: Phaser.GameObjects.Text;
  backBtn: Phaser.GameObjects.Text;
}

/**
 * Standard sub-menu header: centered title + top-left "← Menu" back button.
 * Both are placed at height*0.06 with MENU_UI depth.
 */
export function createMenuHeader(scene: Phaser.Scene, titleKey: string, onBack: () => void, scaleFactor: number): MenuHeader {
  const { width, height } = scene.cameras.main;
  const titleSize = Math.max(16, Math.round(28 * scaleFactor));
  const title = scene.add.text(width / 2, Math.round(height * 0.06), t(titleKey), {
    fontFamily: THEME.fonts.family,
    fontSize: `${titleSize}px`,
    fontStyle: 'bold',
    color: THEME.colors.accent,
  }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_UI);

  const btnFontSize = Math.max(10, Math.round(13 * scaleFactor));
  const backBtn = scene.add.text(Math.round(width * 0.05), Math.round(height * 0.06), '← ' + (t('menu') || 'Menu'), {
    fontFamily: THEME.fonts.family,
    fontSize: `${btnFontSize}px`,
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.buttonPrimaryHex,
    padding: { x: 10, y: 6 },
  }).setOrigin(0, 0).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });
  backBtn.on('pointerdown', () => { playClick(); onBack(); });

  return { title, backBtn };
}

/**
 * Renders the static menu background: sky gradient, mountains, snow ground, trees, and groomer.
 * Pure rendering — no state, no updates. Created once per scene lifecycle.
 */
export function createMenuTerrain(scene: Phaser.Scene, width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, weather?: { isNight: boolean; weather: string }, skipGroomer = false): void {
  const isStorm = weather?.weather === 'storm';
  createSky(scene, width, snowLineY, weather);
  createMountains(scene, width, snowLineY, scaleFactor, isStorm);
  createSnowGround(scene, width, height, snowLineY, footerHeight);
  createTrees(scene, width, snowLineY, scaleFactor, isStorm);
  if (!skipGroomer) createGroomer(scene, width, snowLineY, scaleFactor, isStorm);

  // Clean up baked textures when scene shuts down to avoid key collisions on restart
  scene.events.once('shutdown', () => {
    const keys = ['_menu_ground_lines', '_menu_groomer'];
    for (let i = 0; i < 9; i++) keys.push(`_menu_tree_${i}`);
    for (const key of keys) {
      if (scene.textures.exists(key)) scene.textures.remove(key);
    }
  });
}

function createSky(scene: Phaser.Scene, width: number, snowLineY: number, weather?: { isNight: boolean; weather: string }): void {
  const skyBand1 = snowLineY * 0.4;
  const skyBand2 = snowLineY * 0.25;
  const isStorm = weather?.weather === 'storm';
  const isNight = weather?.isNight;
  // Storm: grey-white overcast; Night: deep blue; Default: sunny blue gradient
  const colors = isStorm
    ? [0x707478, 0x808488, 0x909498]
    : isNight
      ? [0x0a1628, 0x142240, 0x1e3050]
      : [0x5bb8e8, 0x87ceeb, 0xa8ddf0];
  scene.add.rectangle(width / 2, 0, width, skyBand1, colors[0]).setOrigin(0.5, 0);
  scene.add.rectangle(width / 2, skyBand1, width, skyBand2, colors[1]).setOrigin(0.5, 0);
  scene.add.rectangle(width / 2, skyBand1 + skyBand2, width, snowLineY - skyBand1 - skyBand2, colors[2]).setOrigin(0.5, 0);
}

function createSnowGround(scene: Phaser.Scene, width: number, height: number, snowLineY: number, footerHeight: number): void {
  scene.add.rectangle(width / 2, snowLineY, width, height - snowLineY, 0xffffff).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_SNOW);
  // Bake shadow lines into a texture to avoid per-frame Graphics command replay
  const groundH = height - snowLineY - footerHeight;
  if (groundH > 0) {
    const g = scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
    g.fillStyle(0xf0f6fa, 1);
    for (let ly = 8; ly < groundH; ly += 10) {
      g.fillRect(0, ly, width, 1);
    }
    const key = '_menu_ground_lines';
    g.generateTexture(key, width, groundH);
    g.destroy();
    const tex = scene.textures.get(key);
    if (tex?.source?.[0]) tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
    scene.add.image(width / 2, snowLineY, key).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_SNOW);
  }
  scene.add.rectangle(width / 2, snowLineY, width, 3, 0xd8e4e8).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_SNOW);
}

function createMountains(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const mtnScale = snowLineY / 600;
  // Far mountains — dark rock, tall
  drawSteppedMountain(scene, 80 * sx, snowLineY, 180 * mtnScale, 220 * mtnScale, 0x4a423a, 0x6a5e52, true, DEPTHS.MENU_MOUNTAINS_FAR, isStorm);
  drawSteppedMountain(scene, 350 * sx, snowLineY, 200 * mtnScale, 320 * mtnScale, 0x2d2822, 0x4a423a, true, DEPTHS.MENU_MOUNTAINS_FAR, isStorm);
  drawSteppedMountain(scene, 512 * sx, snowLineY, 240 * mtnScale, 300 * mtnScale, 0x4a423a, 0x6a5e52, true, DEPTHS.MENU_MOUNTAINS_FAR, isStorm);
  drawSteppedMountain(scene, 600 * sx, snowLineY, 220 * mtnScale, 380 * mtnScale, 0x4a423a, 0x6a5e52, true, DEPTHS.MENU_MOUNTAINS_FAR, isStorm);
  drawSteppedMountain(scene, 900 * sx, snowLineY, 190 * mtnScale, 260 * mtnScale, 0x2d2822, 0x4a423a, true, DEPTHS.MENU_MOUNTAINS_FAR, isStorm);

  // Near mountains — lighter, shorter, partial overlap
  drawSteppedMountain(scene, 200 * sx, snowLineY, 240 * mtnScale, 160 * mtnScale, 0x6a5e52, 0x8a7e6a, false, DEPTHS.MENU_MOUNTAINS_NEAR, isStorm);
  drawSteppedMountain(scene, 750 * sx, snowLineY, 260 * mtnScale, 180 * mtnScale, 0x6a5e52, 0x8a7e6a, false, DEPTHS.MENU_MOUNTAINS_NEAR, isStorm);
}

function drawSteppedMountain(scene: Phaser.Scene, cx: number, baseY: number, baseWidth: number, peakHeight: number, bodyColor: number, highlightColor: number, snowCap: boolean, depth: number, isStorm: boolean): void {
  const stepH = 16;
  const steps = Math.ceil(peakHeight / stepH);
  // Start 2 steps below baseY to overlap with snow ground (no gap)
  for (let i = -2; i < steps; i++) {
    const t = Math.max(0, i) / steps;
    const w = baseWidth * (1 - t * 0.85);
    const y = baseY - i * stepH;
    const color = i % 3 === 0 ? highlightColor : bodyColor;
    scene.add.rectangle(cx, y, w, stepH, color).setOrigin(0.5, 1).setDepth(depth);
  }
  // Snow caps: storms double the cap depth and add caps to all mountains
  const hasSnowCap = snowCap || isStorm;
  if (hasSnowCap && peakHeight > 100) {
    const baseCap = Math.max(2, Math.min(4, Math.floor(steps * 0.12)));
    const capSteps = isStorm ? Math.min(steps - 1, baseCap * 2) : baseCap;
    for (let i = 0; i < capSteps; i++) {
      const t = (steps - capSteps + i) / steps;
      const w = baseWidth * (1 - t * 0.85);
      const y = baseY - (steps - capSteps + i) * stepH;
      scene.add.rectangle(cx, y, w, stepH, 0xf0f5f8).setOrigin(0.5, 1).setDepth(depth);
    }
  }
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
      .setDepth(DEPTHS.MENU_TREES + treeBaseY * 0.001);
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
    .setDepth(DEPTHS.MENU_TREES + snowLineY * 0.001);
}
