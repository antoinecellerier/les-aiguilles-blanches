import Phaser from 'phaser';

/**
 * Renders the static menu background: sky gradient, mountains, snow ground, trees, and groomer.
 * Pure rendering — no state, no updates. Created once per scene lifecycle.
 */
export function createMenuTerrain(scene: Phaser.Scene, width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, weather?: { isNight: boolean; weather: string }, skipGroomer = false): void {
  const isStorm = weather?.weather === 'storm';
  mtnIndex = 0;
  createSky(scene, width, snowLineY, weather);
  createMountains(scene, width, snowLineY, scaleFactor, isStorm);
  createSnowGround(scene, width, height, snowLineY, footerHeight);
  createTrees(scene, width, snowLineY, scaleFactor, isStorm);
  if (!skipGroomer) createGroomer(scene, width, snowLineY, scaleFactor, isStorm);

  // Clean up baked textures when scene shuts down to avoid key collisions on restart
  const mtnCount = mtnIndex;
  scene.events.once('shutdown', () => {
    const keys = ['_menu_ground_lines', '_menu_groomer'];
    for (let i = 0; i < 9; i++) keys.push(`_menu_tree_${i}`);
    for (let i = 0; i < mtnCount; i++) keys.push(`_menu_mtn_${i}`);
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
  scene.add.rectangle(width / 2, snowLineY, width, height - snowLineY, 0xffffff).setOrigin(0.5, 0).setDepth(3);
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
    scene.add.image(width / 2, snowLineY, key).setOrigin(0.5, 0).setDepth(3);
  }
  scene.add.rectangle(width / 2, snowLineY, width, 3, 0xd8e4e8).setOrigin(0.5, 0).setDepth(3);
}

function createMountains(scene: Phaser.Scene, width: number, snowLineY: number, scaleFactor: number, isStorm: boolean): void {
  const sx = width / 1024;
  const mtnScale = snowLineY / 600;
  // Define all mountains: [cx, baseWidth, peakHeight, bodyColor, highlightColor, snowCap, depth]
  const mtns: { cx: number; baseY: number; baseWidth: number; peakHeight: number; bodyColor: number; highlightColor: number; snowCap: boolean; depth: number }[] = [
    // Far mountains (depth 1)
    { cx: 80 * sx, baseY: snowLineY, baseWidth: 180 * mtnScale, peakHeight: 220 * mtnScale, bodyColor: 0x4a423a, highlightColor: 0x6a5e52, snowCap: true, depth: 1 },
    { cx: 350 * sx, baseY: snowLineY, baseWidth: 200 * mtnScale, peakHeight: 320 * mtnScale, bodyColor: 0x2d2822, highlightColor: 0x4a423a, snowCap: true, depth: 1 },
    { cx: 512 * sx, baseY: snowLineY, baseWidth: 240 * mtnScale, peakHeight: 300 * mtnScale, bodyColor: 0x4a423a, highlightColor: 0x6a5e52, snowCap: true, depth: 1 },
    { cx: 600 * sx, baseY: snowLineY, baseWidth: 220 * mtnScale, peakHeight: 380 * mtnScale, bodyColor: 0x4a423a, highlightColor: 0x6a5e52, snowCap: true, depth: 1 },
    { cx: 900 * sx, baseY: snowLineY, baseWidth: 190 * mtnScale, peakHeight: 260 * mtnScale, bodyColor: 0x2d2822, highlightColor: 0x4a423a, snowCap: true, depth: 1 },
    // Near mountains (depth 2)
    { cx: 200 * sx, baseY: snowLineY, baseWidth: 240 * mtnScale, peakHeight: 160 * mtnScale, bodyColor: 0x6a5e52, highlightColor: 0x8a7e6a, snowCap: false, depth: 2 },
    { cx: 750 * sx, baseY: snowLineY, baseWidth: 260 * mtnScale, peakHeight: 180 * mtnScale, bodyColor: 0x6a5e52, highlightColor: 0x8a7e6a, snowCap: false, depth: 2 },
  ];

  // For each mountain, compute world-space coverage for occlusion testing.
  // A mountain covers [cx - w/2, cx + w/2] at each world y, where w depends on step.
  const stepH = 16;
  for (let mi = 0; mi < mtns.length; mi++) {
    const m = mtns[mi];
    drawSteppedMountain(scene, m, isStorm, mtns, mi, stepH);
  }
}

let mtnIndex = 0;

interface MtnDef {
  cx: number; baseY: number; baseWidth: number; peakHeight: number;
  bodyColor: number; highlightColor: number; snowCap: boolean; depth: number;
}

/** Get the world-space half-width of a mountain at a given world y */
function mtnHalfWidthAtY(m: MtnDef, worldY: number, stepH: number): number {
  const steps = Math.ceil(m.peakHeight / stepH);
  const i = (m.baseY - worldY) / stepH;
  if (i < -2 || i >= steps) return 0;
  const t = Math.max(0, i) / steps;
  return (m.baseWidth * (1 - t * 0.85)) / 2;
}

function drawSteppedMountain(scene: Phaser.Scene, m: MtnDef, isStorm: boolean, allMtns: MtnDef[], myIndex: number, stepH: number): void {
  const steps = Math.ceil(m.peakHeight / stepH);
  const texH = (steps + 2) * stepH;
  const texW = Math.ceil(m.baseWidth) + 2;
  const texCx = texW / 2;

  const g = scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
  // Draw body steps
  for (let i = -2; i < steps; i++) {
    const t = Math.max(0, i) / steps;
    const w = m.baseWidth * (1 - t * 0.85);
    const color = i % 3 === 0 ? m.highlightColor : m.bodyColor;
    const ry = texH - (i + 3) * stepH;
    g.fillStyle(color, 1);
    g.fillRect(texCx - w / 2, ry, w, stepH);
  }
  // Snow cap setup — compute range before drawing gap lines to avoid overlap
  const hasSnowCap = m.snowCap || isStorm;
  let capStartStep = steps; // step index where caps begin (default: none)
  let capSteps = 0;
  if (hasSnowCap && m.peakHeight > 100) {
    const baseCap = Math.max(2, Math.min(4, Math.floor(steps * 0.12)));
    capSteps = isStorm ? Math.min(steps - 1, baseCap * 2) : baseCap;
    capStartStep = steps - capSteps;
  }
  // 1px gap lines between steps — skip rows that fall in the snow cap region
  for (let i = 0; i < steps - 1; i++) {
    if (i >= capStartStep) continue;
    const t = i / steps;
    const w = m.baseWidth * (1 - t * 0.85);
    const worldY = m.baseY - i * stepH;
    const myLeft = m.cx - w / 2;
    const myRight = m.cx + w / 2;
    const ry = texH - (i + 3) * stepH;
    const colored = getGapSegments(myLeft, myRight, worldY, m.depth, allMtns, myIndex, stepH);
    for (const seg of colored) {
      g.fillStyle(seg.color, seg.alpha);
      const texLeft = texCx + (seg.left - m.cx);
      g.fillRect(texLeft, ry, seg.right - seg.left, 1);
    }
  }
  // Snow caps
  if (capSteps > 0) {
    g.fillStyle(0xf0f5f8, 1);
    for (let i = 0; i < capSteps; i++) {
      const t = (capStartStep + i) / steps;
      const w = m.baseWidth * (1 - t * 0.85);
      const ry = texH - (capStartStep + i + 3) * stepH;
      g.fillRect(texCx - w / 2, ry, w, stepH);
    }
    // Dark outlines between cap layers
    for (let i = 1; i < capSteps; i++) {
      const t = (capStartStep + i) / steps;
      const w = m.baseWidth * (1 - t * 0.85);
      const ry = texH - (capStartStep + i + 3) * stepH;
      g.fillStyle(m.bodyColor, 0.2);
      g.fillRect(texCx - w / 2, ry + stepH - 1, w, 1);
    }
  }
  const key = `_menu_mtn_${mtnIndex++}`;
  g.generateTexture(key, texW, texH);
  g.destroy();
  const tex = scene.textures.get(key);
  if (tex?.source?.[0]) tex.source[0].scaleMode = Phaser.ScaleModes.NEAREST;
  scene.add.image(m.cx, m.baseY + 2 * stepH, key).setOrigin(0.5, 1).setDepth(m.depth);
}

interface GapSegment { left: number; right: number; color: number; alpha: number }

/** Get colored gap segments across a step line. Each segment is colored by what's
 *  behind: sky blue for exposed sky, or the behind-mountain's rock color. */
function getGapSegments(left: number, right: number, worldY: number, myDepth: number, allMtns: MtnDef[], myIndex: number, stepH: number): GapSegment[] {
  // Collect behind-mountains (lower depth, or same depth drawn earlier)
  const behind: { left: number; right: number; color: number; depth: number }[] = [];
  for (let oi = 0; oi < allMtns.length; oi++) {
    if (oi === myIndex) continue;
    const o = allMtns[oi];
    if (o.depth < myDepth || (o.depth === myDepth && oi < myIndex)) {
      const hw = mtnHalfWidthAtY(o, worldY, stepH);
      if (hw > 0) {
        const oI = Math.floor((o.baseY - worldY) / stepH);
        const oColor = oI % 3 === 0 ? o.highlightColor : o.bodyColor;
        behind.push({ left: o.cx - hw, right: o.cx + hw, color: oColor, depth: o.depth });
      }
    }
  }

  const skyColor = 0x8ab4d0;
  const skyAlpha = 0.3;
  const mtnAlpha = 0.1;

  if (behind.length === 0) return [{ left, right, color: skyColor, alpha: skyAlpha }];

  // Collect cut points and split [left, right] into sub-segments
  const cuts = new Set<number>();
  cuts.add(left);
  cuts.add(right);
  for (const b of behind) {
    if (b.left > left && b.left < right) cuts.add(b.left);
    if (b.right > left && b.right < right) cuts.add(b.right);
  }
  const sorted = [...cuts].sort((a, b) => a - b);

  const result: GapSegment[] = [];
  for (let ci = 0; ci < sorted.length - 1; ci++) {
    const sl = sorted[ci];
    const sr = sorted[ci + 1];
    if (sr - sl < 1) continue;
    const mid = (sl + sr) / 2;
    // Find the frontmost (highest depth) behind-mountain at this x
    let bestColor = skyColor;
    let bestAlpha = skyAlpha;
    let bestDepth = -1;
    for (const b of behind) {
      if (b.left <= mid && b.right >= mid && b.depth > bestDepth) {
        bestDepth = b.depth;
        bestColor = b.color;
        bestAlpha = mtnAlpha;
      }
    }
    result.push({ left: sl, right: sr, color: bestColor, alpha: bestAlpha });
  }
  return result;
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
