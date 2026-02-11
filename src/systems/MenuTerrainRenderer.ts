import Phaser from 'phaser';

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
  scene.add.rectangle(width / 2, snowLineY, width, height - snowLineY, 0xffffff).setOrigin(0.5, 0).setDepth(3);
  const g = scene.add.graphics().setDepth(3);
  g.fillStyle(0xf0f6fa, 1);
  for (let ly = snowLineY + 8; ly < height - footerHeight; ly += 10) {
    g.fillRect(0, ly, width, 1);
  }
  scene.add.rectangle(width / 2, snowLineY, width, 3, 0xd8e4e8).setOrigin(0.5, 0).setDepth(3);
}

function createMountains(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const mtnScale = snowLineY / 600;
  // Far mountains — dark rock, tall (depth 1)
  drawSteppedMountain(scene, 80 * sx, snowLineY, 180 * mtnScale, 220 * mtnScale, 0x4a423a, 0x6a5e52, true, 1, isStorm);
  drawSteppedMountain(scene, 350 * sx, snowLineY, 200 * mtnScale, 320 * mtnScale, 0x2d2822, 0x4a423a, true, 1, isStorm);
  drawSteppedMountain(scene, 512 * sx, snowLineY, 240 * mtnScale, 300 * mtnScale, 0x4a423a, 0x6a5e52, true, 1, isStorm);
  drawSteppedMountain(scene, 600 * sx, snowLineY, 220 * mtnScale, 380 * mtnScale, 0x4a423a, 0x6a5e52, true, 1, isStorm);
  drawSteppedMountain(scene, 900 * sx, snowLineY, 190 * mtnScale, 260 * mtnScale, 0x2d2822, 0x4a423a, true, 1, isStorm);

  // Near mountains — lighter, shorter, partial overlap (depth 2)
  drawSteppedMountain(scene, 200 * sx, snowLineY, 240 * mtnScale, 160 * mtnScale, 0x6a5e52, 0x8a7e6a, false, 2, isStorm);
  drawSteppedMountain(scene, 750 * sx, snowLineY, 260 * mtnScale, 180 * mtnScale, 0x6a5e52, 0x8a7e6a, false, 2, isStorm);
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
  // Clustered, varied positions — not evenly spaced
  const treePositions = [
    40 * sx, 100 * sx, 130 * sx, 220 * sx, 310 * sx,
    width - 40 * sx, width - 110 * sx, width - 170 * sx, width - 260 * sx,
  ];
  for (const tx of treePositions) {
    const s = (0.7 + Math.random() * 0.7) * scaleFactor;
    // Y-based depth: trunk base at snowLineY + 10*s
    const treeBaseY = snowLineY + 10 * s;
    const g = scene.add.graphics().setDepth(5 + treeBaseY * 0.001);
    g.fillStyle(0x228b22);
    g.fillRect(tx - 5 * s, snowLineY - 24 * s, 10 * s, 8 * s);
    g.fillRect(tx - 9 * s, snowLineY - 16 * s, 18 * s, 8 * s);
    g.fillRect(tx - 13 * s, snowLineY - 8 * s, 26 * s, 10 * s);
    // Storm: snow on each foliage tier
    if (isStorm) {
      g.fillStyle(0xf0f5f8);
      g.fillRect(tx - 5 * s, snowLineY - 24 * s, 10 * s, 3 * s);
      g.fillRect(tx - 9 * s, snowLineY - 16 * s, 18 * s, 3 * s);
      g.fillRect(tx - 13 * s, snowLineY - 8 * s, 26 * s, 3 * s);
    }
    g.fillStyle(0x8b4513);
    g.fillRect(tx - 3 * s, snowLineY, 6 * s, 10 * s);
  }
}

function createGroomer(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const isLandscape = width > snowLineY * 1.5;
  const gx = isLandscape ? width * 0.82 : width / 2 + 140 * sx;
  const s = 2.0 * scaleFactor;
  const g = scene.add.graphics().setDepth(5 + snowLineY * 0.001);
  // Side-view groomer sitting on snow — wide and low
  const groundY = snowLineY;
  // Tracks (bottom) — wide horizontal treads
  g.fillStyle(0x333333);
  g.fillRect(gx - 24 * s, groundY - 8 * s, 48 * s, 8 * s);
  // Track detail — lighter tread lines
  g.fillStyle(0x444444);
  for (let tx = -22; tx < 24; tx += 6) {
    g.fillRect(gx + tx * s, groundY - 7 * s, 3 * s, 6 * s);
  }
  // Body — red, sits on tracks
  g.fillStyle(0xcc2200);
  g.fillRect(gx - 18 * s, groundY - 22 * s, 36 * s, 14 * s);
  // Cabin / window frame — on top of body, slightly back
  g.fillStyle(0x1e90ff);
  g.fillRect(gx - 8 * s, groundY - 32 * s, 20 * s, 11 * s);
  // Window glass
  g.fillStyle(0x87ceeb);
  g.fillRect(gx - 5 * s, groundY - 30 * s, 14 * s, 7 * s);
  // Cabin roof
  g.fillStyle(0xaa1a00);
  g.fillRect(gx - 10 * s, groundY - 34 * s, 24 * s, 3 * s);
  // Front blade — extends forward from body
  g.fillStyle(0x888888);
  g.fillRect(gx - 26 * s, groundY - 14 * s, 10 * s, 10 * s);
  g.fillStyle(0xaaaaaa);
  g.fillRect(gx - 27 * s, groundY - 16 * s, 4 * s, 12 * s);
  // Exhaust pipe
  g.fillStyle(0x555555);
  g.fillRect(gx + 10 * s, groundY - 38 * s, 3 * s, 8 * s);
  // Rear tiller — behind the tracks
  // Tiller arm connecting to body
  g.fillStyle(0x777777);
  g.fillRect(gx + 22 * s, groundY - 12 * s, 8 * s, 3 * s);
  // Tiller drum with teeth
  g.fillStyle(0x555555);
  g.fillRect(gx + 28 * s, groundY - 14 * s, 6 * s, 8 * s);
  g.fillStyle(0x666666);
  for (let ty = -13; ty < -6; ty += 3) {
    g.fillRect(gx + 29 * s, groundY + ty * s, 4 * s, 2 * s);
  }
  // Finisher comb trailing behind
  g.fillStyle(0x888888);
  g.fillRect(gx + 34 * s, groundY - 6 * s, 3 * s, 6 * s);
  // Comb teeth (horizontal lines = corduroy pattern)
  g.fillStyle(0x999999);
  for (let ty = -5; ty < 0; ty += 2) {
    g.fillRect(gx + 34 * s, groundY + ty * s, 3 * s, 1 * s);
  }
  // Storm: snow accumulation on roof, body, and blade
  if (isStorm) {
    g.fillStyle(0xf0f5f8);
    g.fillRect(gx - 10 * s, groundY - 37 * s, 24 * s, 3 * s);  // roof top
    g.fillRect(gx - 18 * s, groundY - 23 * s, 36 * s, 2 * s);  // body top
    g.fillRect(gx - 27 * s, groundY - 17 * s, 10 * s, 2 * s);  // blade top
  }
}
