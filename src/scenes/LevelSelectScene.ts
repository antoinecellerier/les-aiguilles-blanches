import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level } from '../setup';
import { THEME } from '../config/theme';
import { BALANCE, DEPTHS, DIFFICULTY_MARKERS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { getSavedProgress, isLevelCompleted, isLevelUnlocked, getLevelStats } from '../utils/gameProgress';
import { createMenuButtonNav, type MenuButtonNav } from '../utils/menuButtonNav';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuBackdrop, createMenuHeader, type MenuBackdrop } from '../systems/MenuTerrainRenderer';
import { playClick } from '../systems/UISounds';
import { ResizeManager } from '../utils/resizeManager';
import { formatTime } from '../utils/bonusObjectives';
import { getButtonName, getConnectedControllerType } from '../utils/gamepad';
import { setLaunchOrigin } from '../systems/LaunchOrigin';

// Run marker positions as % of map area (x, y). y=0 is summit, y=1 is base.
const RUN_POSITIONS: [number, number][] = [
  [0.50, 0.95],  // L0  Tutorial — base area
  [0.28, 0.82],  // L1  Les Marmottes — low-left
  [0.65, 0.74],  // L2  Le Chamois — low-right
  [0.20, 0.58],  // L3  Air Zone (park) — mid-left
  [0.74, 0.55],  // L4  L'Aigle — mid-right
  [0.55, 0.44],  // L5  Le Glacier — mid-center
  [0.26, 0.40],  // L6  Le Tube (park) — left-mid
  [0.80, 0.30],  // L7  La Verticale — upper-right
  [0.16, 0.24],  // L8  Col Dangereux — upper-left
  [0.38, 0.20],  // L9  Tempête — upper-center-left (spread from L10)
  [0.55, 0.08],  // L10 Coupe des Aiguilles — summit
];

// Run path waypoints: each run's descent from marker toward the base
const RUN_PATHS: [number, number][][] = [
  [[0.50, 0.95], [0.50, 1.00]],
  [[0.28, 0.82], [0.30, 0.88], [0.34, 0.94], [0.38, 1.00]],
  [[0.65, 0.74], [0.62, 0.80], [0.57, 0.88], [0.50, 0.95]],
  [[0.20, 0.58], [0.22, 0.65], [0.26, 0.72], [0.28, 0.82]],
  [[0.74, 0.55], [0.72, 0.62], [0.68, 0.68], [0.65, 0.74]],
  [[0.55, 0.44], [0.58, 0.52], [0.62, 0.60], [0.65, 0.70], [0.62, 0.80]],
  [[0.26, 0.40], [0.24, 0.48], [0.22, 0.55], [0.20, 0.58]],
  [[0.80, 0.30], [0.78, 0.38], [0.76, 0.46], [0.74, 0.55]],
  [[0.16, 0.24], [0.18, 0.32], [0.20, 0.40], [0.20, 0.50], [0.20, 0.58]],
  [[0.38, 0.20], [0.42, 0.28], [0.48, 0.36], [0.55, 0.44]],
  [[0.55, 0.08], [0.50, 0.12], [0.44, 0.16], [0.38, 0.20]],
];

/**
 * Level Select Scene — trail map style.
 * Shows the resort mountain with colored run paths and classic ski map markers.
 */
export default class LevelSelectScene extends Phaser.Scene {
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private buttonNav!: MenuButtonNav;
  private gamepadNav!: GamepadMenuNav;
  private resizeManager!: ResizeManager;
  private isNavigating = false;
  private userSelected = false;
  private resolvedSkiMode: 'ski' | 'snowboard' = 'ski';
  inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;
  private backdrop?: MenuBackdrop;
  // Info panel elements
  private infoName?: Phaser.GameObjects.Text;
  private infoDetails?: Phaser.GameObjects.Text;
  private groomBtn?: Phaser.GameObjects.Text;
  private skiBtn?: Phaser.GameObjects.Text;
  // Map state
  private mapLeft = 0;
  private mapTop = 0;
  private mapW = 0;
  private mapH = 0;
  private selectedLevel = 0;
  private selectionRing?: Phaser.GameObjects.Graphics;
  private markerNames: Phaser.GameObjects.Text[] = [];
  private markerStars: (Phaser.GameObjects.Text | null)[] = [];
  private scaleFactor = 1;
  private markerSize = 28;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.isNavigating = false;
    this.userSelected = false;
    this.inputReady = false;
    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];
    this.markerNames = [];
    this.markerStars = [];

    // --- Shared backdrop: sky, standard mountains, snow ground, trees, wildlife ---
    const isPortrait = height > width;
    const snowPct = isPortrait ? 0.82 : 0.78;
    this.backdrop = createMenuBackdrop(this, {
      overlayAlpha: 0,
      skipGroomer: true,
      skipMountains: true,
      snowLinePct: snowPct,
    });
    const sf = this.backdrop.scaleFactor;
    this.scaleFactor = sf;
    this.markerSize = Math.max(28, Math.round(36 * Math.min(sf, 1.3)));

    // Boost bird depth so they fly in front of the trail map
    this.children.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Image && child.depth === 11) {
        child.setDepth(DEPTHS.MENU_UI + 8);
      }
    });

    // Override bird perch spots with trail map landmarks
    if (this.backdrop?.wildlife) {
      const mt = this.mapTop;
      const ml = this.mapLeft;
      const mw = this.mapW;
      const mh = this.mapH;
      this.backdrop.wildlife.perchSpots = [
        { x: ml + mw * 0.50, y: mt + mh * 0.01 - 10 },  // summit cross
        { x: ml + mw * 0.86, y: mt + mh * 0.50 },        // mid chairlift pylon
        { x: ml + mw * 0.88, y: mt + mh * 0.72 },        // lower chairlift pylon
        { x: ml + mw * 0.15, y: mt + mh * 0.75 },        // left tree area
        { x: ml + mw * 0.70, y: mt + mh * 0.80 },        // right tree area
      ];
    }

    // --- Header ---
    const { title, backBtn } = createMenuHeader(this, 'levelSelect', () => this.goBack(), sf);

    this.menuButtons.push(backBtn);
    this.buttonCallbacks.push(() => this.goBack());
    this.buttonIsCTA.push(false);
    backBtn.on('pointerdown', () => { this.buttonNav.select(0); this.goBack(); });

    // --- Ski mode ---
    let skiModeVal = getString(STORAGE_KEYS.SKI_MODE) || 'random';
    if (skiModeVal === 'random') skiModeVal = Math.random() < 0.5 ? 'ski' : 'snowboard';
    this.resolvedSkiMode = skiModeVal as 'ski' | 'snowboard';

    // --- Map area bounds ---
    const headerBottom = title.y + title.height + Math.round(height * 0.01);
    const infoPanelH = Math.round(Math.max(height * 0.16, 80));
    this.mapLeft = 0;
    this.mapTop = headerBottom;
    this.mapW = width;
    this.mapH = height - headerBottom - infoPanelH;

    // --- Draw trail map elements (mountain, paths, markers, decorations) ---
    const progress = getSavedProgress();
    this.drawMountain(sf);
    this.drawChairlift(sf);
    this.drawRunPaths(sf);
    this.drawLodge(sf);
    this.drawMarkers(progress, sf);
    this.createInfoPanel(width, height, sf);

    // --- Navigation ---
    this.buttonNav = createMenuButtonNav(
      this.menuButtons,
      this.buttonCallbacks,
      (buttons, selectedIndex) => {
        // Only style the Back button (index 0) — hit zones (1+) stay invisible
        const back = buttons[0];
        if (back) {
          if (selectedIndex === 0) {
            back.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
            back.setScale(1.05);
          } else {
            back.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
            back.setScale(1);
          }
        }
        if (selectedIndex > 0) {
          this.selectedLevel = selectedIndex - 1;
          this.updateInfoPanel(this.selectedLevel);
          this.updateSelectionRing(this.selectedLevel);
          this.showMarkerLabel(this.selectedLevel);
        } else {
          this.selectionRing?.setVisible(false);
          this.hideAllMarkerLabels(); // hide stars only
        }
      },
    );

    const currentLevel = Math.min(progress?.currentLevel ?? 0, LEVELS.length - 1);
    this.buttonNav.select(currentLevel + 1);

    this.setupInput();
    this.inputReadyTimer = this.time.delayedCall(BALANCE.SCENE_INPUT_DELAY, () => { this.inputReady = true; });
    this.resizeManager = new ResizeManager(this);
    this.resizeManager.register();
    this.events.once('shutdown', this.shutdown, this);

    Accessibility.announce(t('levelSelect') || 'Level Select');
  }

  // ========================
  // Mountain Terrain
  // ========================

  private drawMountain(scale: number): void {
    const { mapLeft: ml, mapTop: mt, mapW: mw, mapH: mh } = this;

    const mg = this.add.graphics().setDepth(DEPTHS.MENU_SNOW - 0.5);
    const rockColors = [0x4a423a, 0x6a5e52, 0x8a7e6a];
    const steps = Math.max(18, Math.round(30 * Math.min(scale, 1.2)));

    // Main peak (center) — extends to bottom of map so mountains meet the snow ground
    this.drawPeak(mg, ml + mw * 0.50, mt + mh * 0.01, mt + mh * 1.02, mw * 0.48, steps, rockColors, 0.08);
    // Left shoulder
    this.drawPeak(mg, ml + mw * 0.18, mt + mh * 0.14, mt + mh * 1.02, mw * 0.24,
      Math.round(steps * 0.7), rockColors, 0.10);
    // Right ridge
    this.drawPeak(mg, ml + mw * 0.82, mt + mh * 0.18, mt + mh * 1.02, mw * 0.22,
      Math.round(steps * 0.65), rockColors, 0.10);

    // Summit cross — prominent landmark
    const crossX = ml + mw * 0.50;
    const crossY = mt + mh * 0.01 - Math.round(8 * scale);
    const crossG = this.add.graphics().setDepth(DEPTHS.MENU_UI);
    crossG.fillStyle(0x2d2822);
    const cs = Math.max(8, Math.round(12 * Math.min(scale, 1.2)));
    crossG.fillRect(crossX - 2, crossY - cs, 4, cs * 2 + 3);
    crossG.fillRect(crossX - Math.round(cs * 0.7), crossY - Math.round(cs * 0.3), Math.round(cs * 1.4), 4);
  }

  private drawPeak(g: Phaser.GameObjects.Graphics, peakX: number, peakY: number, baseY: number,
    baseHalfW: number, steps: number, colors: number[], topNarrow: number): void {
    const stepH = (baseY - peakY) / steps;
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      const y = peakY + s * stepH;
      const halfW = baseHalfW * (topNarrow + frac * (1 - topNarrow));
      g.fillStyle(colors[s % colors.length]);
      g.fillRect(peakX - halfW, y, halfW * 2, stepH + 1);
    }
    // Snow cap — top ~20% of peak, pure white
    const snowSteps = Math.max(2, Math.round(steps * 0.20));
    for (let s = 0; s < snowSteps; s++) {
      const frac = s / steps;
      const y = peakY + s * stepH;
      const halfW = baseHalfW * (topNarrow + frac * (1 - topNarrow));
      g.fillStyle(0xffffff);
      g.fillRect(peakX - halfW, y, halfW * 2, stepH + 1);
    }
    // Small snow patches — scattered white splotches using a simple hash
    for (let s = snowSteps; s < Math.round(steps * 0.50); s++) {
      const hash = ((s * 7 + 13) * 31) % 100;
      if (hash > 30) continue; // only ~30% of rows get a patch
      const frac = s / steps;
      const y = peakY + s * stepH;
      const halfW = baseHalfW * (topNarrow + frac * (1 - topNarrow));
      // Patch on left or right side, small
      const side = (hash % 2 === 0) ? -1 : 1;
      const patchW = halfW * (0.15 + (hash % 20) * 0.01);
      const offset = side * halfW * (0.1 + (hash % 30) * 0.015);
      g.fillStyle(0xe8eff3, 0.6);
      g.fillRect(peakX + offset, y, patchW, stepH + 1);
    }
  }

  // ==================
  // Run Paths & Markers
  // ==================

  private markerXY(levelIdx: number): { x: number; y: number } {
    const [px, py] = RUN_POSITIONS[levelIdx];
    return { x: this.mapLeft + px * this.mapW, y: this.mapTop + py * this.mapH };
  }

  private drawRunPaths(scale: number): void {
    const pathG = this.add.graphics().setDepth(DEPTHS.MENU_MOUNTAINS_NEAR + 1);

    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i] as Level;
      const unlocked = isLevelUnlocked(i);
      const diffKey = level.difficulty === 'tutorial' ? 'green' : level.difficulty;
      const marker = DIFFICULTY_MARKERS[diffKey as keyof typeof DIFFICULTY_MARKERS];
      const color = unlocked ? (marker?.color ?? 0x6a5e52) : 0x8a7e6a;
      const path = RUN_PATHS[i];
      if (!path || path.length < 2) continue;

      const lineW = Math.max(3, Math.round(4 * Math.min(scale, 1.2)));
      const alpha = unlocked ? 0.85 : 0.25;

      // Solid path: pixel-step between waypoints, overlapping rects for continuity
      for (let p = 0; p < path.length - 1; p++) {
        const x1 = Math.round(this.mapLeft + path[p][0] * this.mapW);
        const y1 = Math.round(this.mapTop + path[p][1] * this.mapH);
        const x2 = Math.round(this.mapLeft + path[p + 1][0] * this.mapW);
        const y2 = Math.round(this.mapTop + path[p + 1][1] * this.mapH);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.max(Math.abs(dx), Math.abs(dy), 1);
        // White outline pass
        pathG.fillStyle(0xffffff, alpha * 0.5);
        for (let s = 0; s <= dist; s += 2) {
          const t = s / dist;
          const sx = Math.round(x1 + dx * t);
          const sy = Math.round(y1 + dy * t);
          pathG.fillRect(sx - lineW, sy - lineW, lineW * 2, lineW * 2);
        }
        // Colored inner pass
        pathG.fillStyle(color, alpha);
        const inner = Math.max(1, lineW - 1);
        for (let s = 0; s <= dist; s += 2) {
          const t = s / dist;
          const sx = Math.round(x1 + dx * t);
          const sy = Math.round(y1 + dy * t);
          pathG.fillRect(sx - inner, sy - inner, inner * 2, inner * 2);
        }
      }
    }
  }

  private drawMarkers(progress: ReturnType<typeof getSavedProgress>, scale: number): void {
    const ms = this.markerSize;
    const symFont = Math.max(14, Math.round(18 * Math.min(scale, 1.3)));
    const nameFont = Math.max(11, Math.round(11 * Math.min(scale, 1.3)));

    // Selection ring drawn ABOVE everything on the map
    this.selectionRing = this.add.graphics().setDepth(DEPTHS.MENU_UI + 6);

    // Official French marker colors from ART_STYLE.md
    const BRIGHT_COLORS: Record<string, number> = {
      tutorial: 0x22c55e, green: 0x22c55e, blue: 0x3b82f6,
      red: 0xef4444, black: 0x1f2937, park: 0xf59e0b,
    };

    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i] as Level;
      const unlocked = isLevelUnlocked(i);
      const completed = isLevelCompleted(i);
      const stats = getLevelStats(i);
      const { x, y } = this.markerXY(i);
      const diffKey = level.difficulty === 'tutorial' ? 'green' : level.difficulty;
      const marker = DIFFICULTY_MARKERS[diffKey as keyof typeof DIFFICULTY_MARKERS];
      const bgColor = unlocked ? (BRIGHT_COLORS[diffKey] ?? 0x6a5e52) : 0x6a5e52;
      const isBlack = diffKey === 'black';

      // All markers are squares (rectangles-only rule). Color + symbol differentiate difficulty.
      const mg = this.add.graphics().setDepth(DEPTHS.MENU_UI + 1);
      // White border
      mg.fillStyle(0xffffff);
      mg.fillRect(x - ms / 2 - 2, y - ms / 2 - 2, ms + 4, ms + 4);
      // Colored fill
      mg.fillStyle(bgColor);
      mg.fillRect(x - ms / 2, y - ms / 2, ms, ms);

      // Symbol text — white on all colors with dark stroke for contrast
      this.add.text(x, y, unlocked ? (marker?.symbol ?? '●') : '🔒', {
        fontFamily: THEME.fonts.family, fontSize: symFont + 'px',
        color: '#ffffff', stroke: '#000000', strokeThickness: isBlack ? 0 : 2,
      }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI + 2);

      // Name label — always visible, also a click/touch target
      const fullName = level.name ? level.name : (t(level.nameKey) || level.nameKey);
      const shortName = fullName.includes(' - ') ? fullName.split(' - ').slice(1).join(' - ') : fullName;
      const labelAbove = y > this.mapTop + this.mapH * 0.12;
      const labelY = labelAbove ? y - ms / 2 - 6 : y + ms / 2 + 6;
      const labelOriginY = labelAbove ? 1 : 0;
      const clampedX = Math.max(shortName.length * nameFont * 0.3 + 8, Math.min(x, this.mapW - shortName.length * nameFont * 0.3 - 8));
      const nameLabel = this.add.text(clampedX, labelY, shortName, {
        fontFamily: THEME.fonts.family, fontSize: nameFont + 'px',
        color: '#ffffff', backgroundColor: '#1a1a2ecc',
        padding: { x: 4, y: 2 }, align: 'center',
      }).setOrigin(0.5, labelOriginY).setDepth(DEPTHS.MENU_UI + 7)
        .setInteractive({ useHandCursor: unlocked });
      nameLabel.on('pointerdown', () => this.onMarkerClick(i, btnIdx, unlocked));
      this.markerNames.push(nameLabel);

      // Stars — shown on selection
      let starLabel: Phaser.GameObjects.Text | null = null;
      if (completed && stats) {
        const starStr = '⭐'.repeat(stats.bestStars) + '☆'.repeat(3 - stats.bestStars);
        const starY = labelAbove ? y + ms / 2 + 4 : labelY + 20;
        starLabel = this.add.text(x, starY, starStr, {
          fontFamily: THEME.fonts.family, fontSize: Math.round(nameFont * 0.9) + 'px',
          backgroundColor: '#1a1a2ecc', padding: { x: 3, y: 1 },
        }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_UI + 7).setVisible(false);
      }
      this.markerStars.push(starLabel);

      // Invisible hit zone for marker square (min 44px touch target)
      const hitSize = Math.max(ms + 16, 44);
      const hitBtn = this.add.text(x, y, '', {
        fixedWidth: hitSize, fixedHeight: hitSize,
      }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI + 5).setAlpha(0.001).setInteractive({ useHandCursor: unlocked });
      hitBtn.setData('key', `level_${i}`);

      const btnIdx = this.menuButtons.length;
      this.menuButtons.push(hitBtn);
      this.buttonCallbacks.push(() => {
        if (unlocked) this.startLevel(i, 'groom');
      });
      this.buttonIsCTA.push(i === (progress?.currentLevel ?? 0));
      hitBtn.on('pointerdown', () => this.onMarkerClick(i, btnIdx, unlocked));
    }
  }

  private showMarkerLabel(levelIdx: number): void {
    this.hideAllMarkerLabels();
    // Stars shown only on selection
    if (this.markerStars[levelIdx]) this.markerStars[levelIdx].setVisible(true);
  }

  private onMarkerClick(levelIdx: number, btnIdx: number, unlocked: boolean): void {
    if (!this.inputReady || this.isNavigating) return;
    playClick();
    if (unlocked && this.userSelected && this.selectedLevel === levelIdx) {
      this.startLevel(levelIdx, 'groom');
    } else {
      this.userSelected = true;
      this.buttonNav.select(btnIdx);
    }
  }

  private hideAllMarkerLabels(): void {
    this.markerStars.forEach(s => s?.setVisible(false));
  }

  private updateSelectionRing(levelIdx: number): void {
    if (!this.selectionRing) return;
    this.selectionRing.clear();
    const { x, y } = this.markerXY(levelIdx);
    const ms = this.markerSize;
    const pad = 6;
    const outer = ms / 2 + pad;
    const border = 3;
    const unlocked = isLevelUnlocked(levelIdx);
    const ringColor = unlocked ? 0xffd700 : 0x8a7e6a;
    // Outer glow (wider translucent rect)
    this.selectionRing.fillStyle(ringColor, 0.4);
    this.selectionRing.fillRect(x - outer - border - 1, y - outer - border - 1, (outer + border + 1) * 2, (outer + border + 1) * 2);
    // Border — four fillRect edges
    this.selectionRing.fillStyle(ringColor, 1);
    this.selectionRing.fillRect(x - outer, y - outer, outer * 2, border);           // top
    this.selectionRing.fillRect(x - outer, y + outer - border, outer * 2, border);   // bottom
    this.selectionRing.fillRect(x - outer, y - outer, border, outer * 2);            // left
    this.selectionRing.fillRect(x + outer - border, y - outer, border, outer * 2);   // right
    this.selectionRing.setVisible(true);
  }

  // =====================
  // Ski Map Elements
  // =====================

  private drawChairlift(scale: number): void {
    const g = this.add.graphics().setDepth(DEPTHS.MENU_TREES);
    const s = Math.min(scale, 1.2);
    const lw = Math.max(3, Math.round(4 * s));

    // Cable from snow-level base station up the right ridge
    const sx = this.mapLeft + this.mapW * 0.88;
    const sy = this.mapTop + this.mapH * 0.95;
    const ex = this.mapLeft + this.mapW * 0.83;
    const ey = this.mapTop + this.mapH * 0.28;

    // Solid cable — pixel-step for continuity
    const dx = ex - sx;
    const dy = ey - sy;
    const cableLen = Math.max(Math.abs(dx), Math.abs(dy), 1);
    g.fillStyle(0x2d2822, 0.9);
    for (let ci = 0; ci <= cableLen; ci += 2) {
      const frac = ci / cableLen;
      const rx = Math.round(sx + dx * frac);
      const ry = Math.round(sy + dy * frac);
      g.fillRect(rx - 1, ry, lw + 1, lw);
    }

    // Pylons with cross-arm — prominent
    const pylonH = Math.round(18 * s);
    const pylonW = Math.max(3, Math.round(4 * s));
    for (let i = 0; i <= 3; i++) {
      const frac = i / 3;
      const px = Math.round(sx + (ex - sx) * frac);
      const py = Math.round(sy + (ey - sy) * frac);
      g.fillStyle(0x2d2822);
      g.fillRect(px - Math.round(pylonW / 2), py, pylonW, pylonH);
      // Cross-arm
      const armW = Math.round(10 * s);
      g.fillRect(px - Math.round(armW / 2), py, armW, Math.max(3, Math.round(3 * s)));
    }

    // Gondola cars — larger and more visible
    for (let i = 1; i <= 2; i++) {
      const frac = i / 3;
      const cx = Math.round(sx + (ex - sx) * frac);
      const cy = Math.round(sy + (ey - sy) * frac) + Math.round(6 * s);
      const cw = Math.max(12, Math.round(14 * s));
      const ch = Math.max(10, Math.round(12 * s));
      // Hanging cable
      g.fillStyle(0x2d2822);
      g.fillRect(cx - 1, cy - Math.round(6 * s), 3, Math.round(6 * s));
      // Car body
      g.fillStyle(0xcc2200);
      g.fillRect(cx - Math.round(cw / 2), cy, cw, ch);
      // Window
      g.fillStyle(0x87ceeb);
      g.fillRect(cx - Math.round(cw / 2) + 2, cy + 2, cw - 4, Math.round(ch * 0.45));
    }

    // Base station building
    const bw = Math.round(24 * s);
    const bh = Math.round(12 * s);
    g.fillStyle(0x4a423a);
    g.fillRect(sx - bw / 2, sy, bw, bh);
    g.fillStyle(0xcc2200);
    g.fillRect(sx - bw / 2, sy - Math.round(3 * s), bw, Math.round(3 * s));

    const lf = Math.max(9, Math.round(11 * s));
    this.add.text(sx, sy + bh + Math.round(3 * s), 'Télécabine', {
      fontFamily: THEME.fonts.family, fontSize: lf + 'px',
      color: '#2d2822', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_TREES + 1);
  }

  private drawLodge(scale: number): void {
    const g = this.add.graphics().setDepth(DEPTHS.MENU_UI - 1);
    const s = Math.min(scale, 1.2);
    const bx = this.mapLeft + this.mapW * 0.42;
    const by = this.mapTop + this.mapH * 0.90;
    const bw = Math.round(30 * s);
    const bh = Math.round(18 * s);

    // Body (warm brown from rock palette)
    g.fillStyle(0x8b4513);
    g.fillRect(bx - bw / 2, by - bh, bw, bh);

    // Stepped roof (dark red from menu ribbon palette)
    const rh = Math.round(10 * s);
    for (let r = 0; r < rh; r++) {
      const frac = r / rh;
      const rw = bw * (1 - frac * 0.6);
      g.fillStyle(0x8b1a1a);
      g.fillRect(bx - rw / 2, by - bh - r, rw, 1);
    }
    // Snow on roof
    g.fillStyle(0xffffff);
    g.fillRect(bx - bw * 0.35, by - bh - rh, bw * 0.7, Math.round(3 * s));

    // Windows (warm yellow — using gold from UI palette)
    g.fillStyle(0xffd700);
    const ws = Math.max(3, Math.round(4 * s));
    g.fillRect(bx - bw / 4, by - bh + Math.round(5 * s), ws, ws);
    g.fillRect(bx + bw / 4 - ws, by - bh + Math.round(5 * s), ws, ws);

    // Door (dark rock brown)
    g.fillStyle(0x2d2822);
    g.fillRect(bx - Math.round(2 * s), by - Math.round(8 * s), Math.round(4 * s), Math.round(8 * s));

    // Chimney with smoke
    g.fillStyle(0x4a423a);
    g.fillRect(bx + bw / 4, by - bh - rh - Math.round(6 * s), Math.round(4 * s), Math.round(6 * s));
    g.fillStyle(0xe8eff3, 0.5);
    g.fillRect(bx + bw / 4, by - bh - rh - Math.round(10 * s), Math.round(3 * s), Math.round(3 * s));
    g.fillRect(bx + bw / 4 + Math.round(2 * s), by - bh - rh - Math.round(14 * s), Math.round(2 * s), Math.round(2 * s));

    const lf = Math.max(8, Math.round(10 * s));
    this.add.text(bx, by + 3, 'Chez Marie', {
      fontFamily: THEME.fonts.family, fontSize: lf + 'px',
      color: '#2d2822', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_UI);
  }

  // ==========
  // Info Panel
  // ==========

  private createInfoPanel(width: number, height: number, scale: number): void {
    const panelH = Math.round(Math.max(height * 0.16, 80));
    const panelY = height - panelH;
    const dprBoost = Math.sqrt(Math.min(window.devicePixelRatio || 1, 2));
    const ts = Math.max(0.7, scale) * dprBoost;

    // Dark panel
    const bg = this.add.graphics().setDepth(DEPTHS.MENU_UI);
    bg.fillStyle(0x1a1a2e, 0.94);
    bg.fillRect(0, panelY, width, panelH);
    bg.fillStyle(0xffd700, 0.5);
    bg.fillRect(0, panelY, width, 2);

    const nameY = panelY + Math.round(panelH * 0.18);
    const detailY = panelY + Math.round(panelH * 0.50);
    const btnY = panelY + Math.round(panelH * 0.50);
    const leftX = Math.round(width * 0.04);

    this.infoName = this.add.text(leftX, nameY, '', {
      fontFamily: THEME.fonts.family, fontSize: Math.round(14 * ts) + 'px',
      fontStyle: 'bold', color: THEME.colors.accent,
    }).setDepth(DEPTHS.MENU_UI + 1);

    this.infoDetails = this.add.text(leftX, detailY, '', {
      fontFamily: THEME.fonts.family, fontSize: Math.max(9, Math.round(10 * ts)) + 'px',
      color: THEME.colors.textSecondary,
    }).setDepth(DEPTHS.MENU_UI + 1);

    // Groom button (min 44px height for touch)
    const btnFont = Math.round(12 * ts);
    const btnPadX = Math.round(12 * ts);
    const btnPadY = Math.max(Math.round(8 * ts), Math.round((44 - btnFont) / 2));
    const btnRightX = Math.round(width * 0.96);
    this.groomBtn = this.add.text(btnRightX, btnY, t('groom') || 'Groom', {
      fontFamily: THEME.fonts.family, fontSize: btnFont + 'px',
      color: '#ffffff', backgroundColor: THEME.colors.buttonCTAHex,
      padding: { x: btnPadX, y: btnPadY },
    }).setOrigin(1, 0.5).setDepth(DEPTHS.MENU_UI + 1).setInteractive({ useHandCursor: true });
    this.groomBtn.on('pointerdown', () => {
      if (this.inputReady && !this.isNavigating && isLevelUnlocked(this.selectedLevel)) {
        playClick(); this.startLevel(this.selectedLevel, 'groom');
      }
    });

    // Ski button (left of Groom)
    const skiLabel = this.resolvedSkiMode === 'snowboard'
      ? (t('rideIt') || 'Ride it!') : (t('skiIt') || 'Ski it!');
    this.skiBtn = this.add.text(0, btnY, skiLabel, {
      fontFamily: THEME.fonts.family, fontSize: btnFont + 'px',
      color: '#ffffff', backgroundColor: THEME.colors.buttonPrimaryHex,
      padding: { x: btnPadX, y: btnPadY },
    }).setOrigin(1, 0.5).setDepth(DEPTHS.MENU_UI + 1).setInteractive({ useHandCursor: true }).setVisible(false);
    this.skiBtn.on('pointerdown', () => {
      if (this.inputReady && !this.isNavigating && isLevelCompleted(this.selectedLevel)) {
        playClick(); this.startLevel(this.selectedLevel, 'ski');
      }
    });
  }

  private updateInfoPanel(levelIdx: number): void {
    if (levelIdx < 0 || levelIdx >= LEVELS.length) return;
    const level = LEVELS[levelIdx] as Level;
    const unlocked = isLevelUnlocked(levelIdx);
    const completed = isLevelCompleted(levelIdx);
    const stats = getLevelStats(levelIdx);
    const diffKey = level.difficulty === 'tutorial' ? 'green' : level.difficulty;
    const marker = DIFFICULTY_MARKERS[diffKey as keyof typeof DIFFICULTY_MARKERS];

    const displayName = level.name
      ? `${t(level.nameKey)} — ${level.name}` : t(level.nameKey) || level.nameKey;
    this.infoName?.setText(`${marker?.symbol ?? ''} ${displayName}`);

    if (!unlocked) {
      let lockMsg = `🔒 ${t('locked') || 'Locked'}`;
      if (levelIdx > 0) {
        const prevFull = t(LEVELS[levelIdx - 1].nameKey) || LEVELS[levelIdx - 1].nameKey;
        const prevShort = prevFull.includes(' - ') ? prevFull.split(' - ').slice(1).join(' - ') : prevFull;
        lockMsg += `  ·  ▶ ${prevShort}`;
      }
      this.infoDetails?.setText(lockMsg);
      this.groomBtn?.setVisible(false);
      this.skiBtn?.setVisible(false);
      Accessibility.announce(`${displayName}. ${t('locked') || 'Locked'}`);
    } else {
      const parts: string[] = [];
      parts.push(diffKey.charAt(0).toUpperCase() + diffKey.slice(1));
      if (level.targetCoverage) parts.push(`${level.targetCoverage}%`);
      if (level.timeLimit) {
        parts.push(formatTime(level.timeLimit));
      }
      if (completed && stats) {
        parts.push('⭐'.repeat(stats.bestStars) + '☆'.repeat(3 - stats.bestStars));
        if (stats.bestTime) {
          parts.push(`Best ${formatTime(stats.bestTime)}`);
        }
      }
      this.infoDetails?.setText(parts.join('  ·  '));

      const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
      const ctrlType = hasGamepad ? getConnectedControllerType() : undefined;
      const groomPrefix = ctrlType ? getButtonName(0, ctrlType) + ' ' : '';
      const skiPrefix = ctrlType ? getButtonName(2, ctrlType) + ' ' : '';

      this.groomBtn?.setText(groomPrefix + (t('groom') || 'Groom'));
      this.groomBtn?.setVisible(true);
      // Position ski button left of groom
      if (completed) {
        const skiLabel = this.resolvedSkiMode === 'snowboard'
          ? (t('rideIt') || 'Ride it!') : (t('skiIt') || 'Ski it!');
        this.skiBtn?.setText(skiPrefix + skiLabel);
        this.skiBtn?.setVisible(true);
        this.skiBtn?.setX((this.groomBtn?.x ?? 0) - (this.groomBtn?.width ?? 0) - 8);
      } else {
        this.skiBtn?.setVisible(false);
      }
      Accessibility.announce(`${marker?.symbol ?? ''} ${displayName}. ${diffKey}`);
    }
  }

  // ===========
  // Input
  // ===========

  private setupInput(): void {
    // Up = towards summit (higher index), Down = towards base (lower index)
    this.input.keyboard?.on('keydown-UP', () => this.navigateMarker(1));
    this.input.keyboard?.on('keydown-DOWN', () => this.navigateMarker(-1));
    this.input.keyboard?.on('keydown-LEFT', () => this.navigateMarker(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.navigateMarker(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.handleStartLevel('groom'));
    this.input.keyboard?.on('keydown-SPACE', () => this.handleStartLevel('groom'));
    this.input.keyboard?.on('keydown-S', () => this.handleStartLevel('ski'));
    this.input.keyboard?.on('keydown-ESC', () => { if (this.inputReady) this.goBack(); });

    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.navigateMarker(-dir),
      onConfirm: () => this.handleStartLevel('groom'),
      onSecondary: () => this.handleStartLevel('ski'),
      onBack: () => { if (this.inputReady) this.goBack(); },
    });
  }

  private handleStartLevel(mode: 'groom' | 'ski'): void {
    if (!this.inputReady || this.isNavigating) return;
    const lvl = this.selectedLevel;
    if (mode === 'ski' ? isLevelCompleted(lvl) : isLevelUnlocked(lvl)) {
      playClick(); this.startLevel(lvl, mode);
    }
  }

  private navigateMarker(dir: number): void {
    if (!this.inputReady) return;
    const cur = this.buttonNav.selectedIndex;
    let next = cur + dir;
    if (next < 1) next = 1;
    if (next > LEVELS.length) next = LEVELS.length;
    if (next !== cur) this.buttonNav.select(next);
  }

  private startLevel(level: number, mode: 'groom' | 'ski'): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    setLaunchOrigin('LevelSelectScene');
    if (mode === 'ski') {
      resetGameScenes(this.game, 'SkiRunScene', { level, mode: this.resolvedSkiMode });
    } else {
      resetGameScenes(this.game, 'GameScene', { level });
    }
  }

  private goBack(): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    resetGameScenes(this.game, 'MenuScene');
  }

  update(time: number, delta: number): void {
    this.gamepadNav?.update(delta);
    this.backdrop?.wildlife.update(time, delta);
  }

  private shutdown(): void {
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
    this.backdrop?.wildlife.destroy();
    this.resizeManager?.destroy();
    this.input.keyboard?.removeAllListeners();
  }
}
