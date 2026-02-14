/**
 * Generate app icon — pixel-art groomer on mountain backdrop.
 * Each resolution is rendered natively (no downscaling) for pixel-perfect quality.
 * Small sizes progressively drop fine details that would become noise.
 * Run: node electron/generate-icon.cjs
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// All coordinates designed for 256px base; U = size/256 scales to target.
function renderIcon(size) {
  const U = size / 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, size);
  skyGrad.addColorStop(0, '#1a2a3e');
  skyGrad.addColorStop(0.5, '#3a6d8e');
  skyGrad.addColorStop(0.75, '#5a9dbe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size, size);

  // Stars (skip below 64px — too small to see)
  if (size >= 64) {
    ctx.fillStyle = '#ffffff';
    const stars = [[30,20],[80,35],[180,25],[220,50],[50,60],[150,15],[120,45],[200,10]];
    const dot = Math.max(1, Math.round(2 * U));
    for (const [sx, sy] of stars) {
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.round(sx * U), Math.round(sy * U), dot, dot);
    }
    ctx.globalAlpha = 1;
  }

  // Mountains
  const groundLine = Math.round(195 * U);
  function drawMountain(peakX, peakY, baseWidth, colors) {
    const steps = colors.length;
    const stepH = (groundLine - peakY * U) / steps;
    for (let i = 0; i < steps; i++) {
      ctx.fillStyle = colors[i];
      const y = peakY * U + i * stepH;
      const progress = (i + 1) / steps;
      const halfW = (baseWidth * U / 2) * progress;
      ctx.fillRect(Math.floor(peakX * U - halfW), Math.floor(y), Math.ceil(halfW * 2), Math.ceil(stepH + 1));
    }
  }
  drawMountain(185, 50, 220, ['#ffffff', '#e0e8ec', '#d8e4e8', '#8a7e6a', '#6a5e52', '#4a423a', '#3a3228']);
  drawMountain(70, 75, 170, ['#ffffff', '#d8e4e8', '#7a6e5a', '#5a4e3a', '#3a3228']);
  drawMountain(260, 85, 160, ['#ffffff', '#c8d4d8', '#6a5e52', '#4a423a']);

  // Snow ground
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, groundLine, size, size - groundLine);
  const lineSpacing = Math.max(1, Math.round(5 * U));
  const lineH = Math.max(1, Math.round(2 * U));
  ctx.fillStyle = '#d8e4e8';
  for (let y = groundLine + lineSpacing; y < size; y += lineSpacing) {
    ctx.fillRect(0, y, size, lineH);
  }
  ctx.fillStyle = '#c0d0d8';
  ctx.fillRect(0, groundLine, size, Math.max(1, Math.round(3 * U)));

  // Groomer
  const gx = size / 2 - Math.round(8 * U);
  const groundY = Math.round(200 * U);
  const s = 2.5 * U;

  // Tracks
  ctx.fillStyle = '#333333';
  ctx.fillRect(gx - 24 * s, groundY - 8 * s, 48 * s, 8 * s);
  if (size >= 48) {
    ctx.fillStyle = '#444444';
    for (let tx = -22; tx < 24; tx += 6) {
      ctx.fillRect(gx + tx * s, groundY - 7 * s, 3 * s, 6 * s);
    }
  }
  // Body
  ctx.fillStyle = '#cc2200';
  ctx.fillRect(gx - 18 * s, groundY - 22 * s, 36 * s, 14 * s);
  // Cabin
  ctx.fillStyle = '#1e90ff';
  ctx.fillRect(gx - 8 * s, groundY - 32 * s, 20 * s, 11 * s);
  // Window glass
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(gx - 5 * s, groundY - 30 * s, 14 * s, 7 * s);
  // Cabin roof
  ctx.fillStyle = '#aa1a00';
  ctx.fillRect(gx - 10 * s, groundY - 34 * s, 24 * s, 3 * s);
  // Front blade
  ctx.fillStyle = '#888888';
  ctx.fillRect(gx - 26 * s, groundY - 14 * s, 10 * s, 10 * s);
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(gx - 27 * s, groundY - 16 * s, 4 * s, 12 * s);
  // Exhaust pipe (skip below 48px)
  if (size >= 48) {
    ctx.fillStyle = '#555555';
    ctx.fillRect(gx + 10 * s, groundY - 38 * s, 3 * s, 8 * s);
  }
  // Tiller arm + drum (skip below 32px)
  if (size >= 32) {
    ctx.fillStyle = '#777777';
    ctx.fillRect(gx + 22 * s, groundY - 12 * s, 8 * s, 3 * s);
    ctx.fillStyle = '#555555';
    ctx.fillRect(gx + 28 * s, groundY - 14 * s, 6 * s, 8 * s);
  }
  // Tiller detail + finisher comb (skip below 64px)
  if (size >= 64) {
    ctx.fillStyle = '#666666';
    for (let ty = -13; ty < -6; ty += 3) {
      ctx.fillRect(gx + 29 * s, groundY + ty * s, 4 * s, 2 * s);
    }
    ctx.fillStyle = '#888888';
    ctx.fillRect(gx + 34 * s, groundY - 6 * s, 3 * s, 6 * s);
    ctx.fillStyle = '#999999';
    for (let ty = -5; ty < 0; ty += 2) {
      ctx.fillRect(gx + 34 * s, groundY + ty * s, 3 * s, 1 * s);
    }
  }

  // Headlight glow
  ctx.fillStyle = '#ffdd44';
  ctx.fillRect(gx - 24 * s, groundY - 20 * s, 3 * s, 3 * s);

  return canvas;
}

// Generate all sizes natively — each rendered from scratch, not downscaled
const SIZES = [16, 32, 48, 64, 128, 256, 512];

for (const dir of ['icons', path.join('build', 'icons')]) {
  const outDir = path.join(__dirname, dir);
  fs.mkdirSync(outDir, { recursive: true });
  for (const size of SIZES) {
    const canvas = renderIcon(size);
    // icons/ uses N.png (bundled in asar for runtime xdg install)
    // build/icons/ uses NxN.png (electron-builder linux.icon convention)
    const name = dir === 'icons' ? `${size}.png` : `${size}x${size}.png`;
    fs.writeFileSync(path.join(outDir, name), canvas.toBuffer('image/png'));
  }
}

// Save 512px as the main icon.png (used by BrowserWindow on X11)
const mainCanvas = renderIcon(512);
fs.writeFileSync(path.join(__dirname, 'icon.png'), mainCanvas.toBuffer('image/png'));
console.log(`✅ Icons generated: ${SIZES.join(', ')}px → icons/, build/icons/, icon.png`);
