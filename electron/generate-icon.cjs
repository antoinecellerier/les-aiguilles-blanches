/**
 * Generate app icon — pixel-art groomer on mountain backdrop.
 * Mirrors the in-game MenuTerrainRenderer groomer sprite.
 * Run: node electron/generate-icon.cjs
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Disable antialiasing for pixel-art crispness
ctx.imageSmoothingEnabled = false;

// Sky gradient
const skyGrad = ctx.createLinearGradient(0, 0, 0, SIZE);
skyGrad.addColorStop(0, '#1a2a3e');
skyGrad.addColorStop(0.5, '#3a6d8e');
skyGrad.addColorStop(0.75, '#5a9dbe');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, SIZE, SIZE);

// Stars
ctx.fillStyle = '#ffffff';
const stars = [[30,20],[80,35],[180,25],[220,50],[50,60],[150,15],[120,45],[200,10]];
for (const [sx, sy] of stars) {
  ctx.globalAlpha = 0.4 + Math.random() * 0.4;
  ctx.fillRect(sx, sy, 2, 2);
}
ctx.globalAlpha = 1;

// Mountains — triangular peaks
function drawMountain(peakX, peakY, baseWidth, colors) {
  const baseY = 195;
  const steps = colors.length;
  const stepH = (baseY - peakY) / steps;
  for (let i = 0; i < steps; i++) {
    ctx.fillStyle = colors[i];
    const y = peakY + i * stepH;
    const progress = (i + 1) / steps;
    const halfW = (baseWidth / 2) * progress;
    ctx.fillRect(Math.floor(peakX - halfW), Math.floor(y), Math.ceil(halfW * 2), Math.ceil(stepH + 1));
  }
}

drawMountain(185, 50, 220, ['#ffffff', '#e0e8ec', '#d8e4e8', '#8a7e6a', '#6a5e52', '#4a423a', '#3a3228']);
drawMountain(70, 75, 170, ['#ffffff', '#d8e4e8', '#7a6e5a', '#5a4e3a', '#3a3228']);
drawMountain(260, 85, 160, ['#ffffff', '#c8d4d8', '#6a5e52', '#4a423a']);

// Snow ground
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 195, SIZE, SIZE - 195);
// Corduroy grooming lines
ctx.fillStyle = '#d8e4e8';
for (let y = 200; y < SIZE; y += 5) {
  ctx.fillRect(0, y, SIZE, 2);
}
// Snow shadow at horizon
ctx.fillStyle = '#c0d0d8';
ctx.fillRect(0, 195, SIZE, 3);

// Groomer — slightly left of center so tiller fits
const gx = SIZE / 2 - 8;
const groundY = 200;
const s = 2.5;

// Tracks
ctx.fillStyle = '#333333';
ctx.fillRect(gx - 24 * s, groundY - 8 * s, 48 * s, 8 * s);
ctx.fillStyle = '#444444';
for (let tx = -22; tx < 24; tx += 6) {
  ctx.fillRect(gx + tx * s, groundY - 7 * s, 3 * s, 6 * s);
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
// Exhaust pipe
ctx.fillStyle = '#555555';
ctx.fillRect(gx + 10 * s, groundY - 38 * s, 3 * s, 8 * s);
// Tiller arm
ctx.fillStyle = '#777777';
ctx.fillRect(gx + 22 * s, groundY - 12 * s, 8 * s, 3 * s);
// Tiller drum
ctx.fillStyle = '#555555';
ctx.fillRect(gx + 28 * s, groundY - 14 * s, 6 * s, 8 * s);
ctx.fillStyle = '#666666';
for (let ty = -13; ty < -6; ty += 3) {
  ctx.fillRect(gx + 29 * s, groundY + ty * s, 4 * s, 2 * s);
}
// Finisher comb
ctx.fillStyle = '#888888';
ctx.fillRect(gx + 34 * s, groundY - 6 * s, 3 * s, 6 * s);
ctx.fillStyle = '#999999';
for (let ty = -5; ty < 0; ty += 2) {
  ctx.fillRect(gx + 34 * s, groundY + ty * s, 3 * s, 1 * s);
}

// Headlight glow
ctx.fillStyle = '#ffdd44';
ctx.fillRect(gx - 24 * s, groundY - 20 * s, 3 * s, 3 * s);

// Save
const outPath = path.join(__dirname, 'icon.png');
try {
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`✅ Icon saved: ${outPath} (${buf.length} bytes)`);
} catch (err) {
  console.error(`❌ Failed to save icon: ${err.message}`);
  process.exit(1);
}
