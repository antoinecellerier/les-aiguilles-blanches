import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level } from '../setup';
import { THEME } from '../config/theme';
import { BALANCE, DEPTHS, DIFFICULTY_MARKERS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { getSavedProgress, isLevelCompleted, isLevelUnlocked, getLevelStats } from '../utils/gameProgress';
import { createMenuButtonNav, ctaStyler, type MenuButtonNav } from '../utils/menuButtonNav';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';
import { playClick } from '../systems/UISounds';
import { ResizeManager } from '../utils/resizeManager';

/**
 * Level Select Scene — browse and replay unlocked levels.
 * Shows difficulty marker, level name, star rating, and Groom/Ski buttons.
 */
export default class LevelSelectScene extends Phaser.Scene {
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private buttonNav!: MenuButtonNav;
  private gamepadNav!: GamepadMenuNav;
  private wildlife!: MenuWildlifeController;
  private resizeManager!: ResizeManager;
  private isNavigating = false;
  private resolvedSkiMode: 'ski' | 'snowboard' = 'ski';
  private inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;
  /** Maps each button index to its visual row (-1 = back button, 0..N = level rows) */
  private buttonRow: number[] = [];
  /** Lists button indices per row, keyed by row number */
  private rowButtons: Map<number, number[]> = new Map();

  // Scroll state (positive = scrolled down, matching MenuScene convention)
  private scrollY = 0;
  private maxScroll = 0;
  private listStartY = 0;
  private rowH = 0;
  private listContainer: Phaser.GameObjects.Container | null = null;
  private updateScrollHints: (() => void) | null = null;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.isNavigating = false;
    this.inputReady = false;
    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];
    this.buttonRow = [];
    this.rowButtons = new Map();

    // --- Alpine background ---
    const dpr = window.devicePixelRatio || 1;
    const scaleByH = height / 768;
    const scaleByW = width / 1024;
    const dprBoost = Math.sqrt(Math.min(dpr, 2));
    const scaleFactor = Math.min(scaleByH, scaleByW, 1.5) * dprBoost;
    const isPortrait = width / height < 0.9;
    const snowLinePct = isPortrait ? 0.82 : 0.78;
    const snowLineY = height * snowLinePct;
    const footerHeight = Math.round(36 * scaleFactor);

    createMenuTerrain(this, width, height, snowLineY, footerHeight, scaleFactor);
    this.wildlife = new MenuWildlifeController(this);
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, footerHeight, scaleFactor);

    const cx = width / 2;

    // --- Dark overlay behind level list for readability ---
    this.add.rectangle(cx, height / 2, width, height, THEME.colors.darkBg)
      .setAlpha(0.88).setDepth(DEPTHS.MENU_OVERLAY);

    // --- Title ---
    const titleSize = Math.max(16, Math.round(28 * scaleFactor));
    const title = this.add.text(cx, Math.round(height * 0.06), t('levelSelect') || 'Level Select', {
      fontFamily: THEME.fonts.family,
      fontSize: `${titleSize}px`,
      fontStyle: 'bold',
      color: THEME.colors.accent,
    }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_UI);

    // --- Back button (top-left, first in nav order) ---
    const btnFontSize = Math.max(10, Math.round(13 * scaleFactor));
    const backBtn = this.add.text(Math.round(width * 0.05), Math.round(height * 0.06), '← ' + (t('menu') || 'Menu'), {
      fontFamily: THEME.fonts.family,
      fontSize: `${btnFontSize}px`,
      color: THEME.colors.textPrimary,
      backgroundColor: THEME.colors.panelBgHex,
      padding: { x: 10, y: 6 },
    }).setOrigin(0, 0).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });

    const backIdx = 0;
    this.menuButtons.push(backBtn);
    this.buttonCallbacks.push(() => this.goBack());
    this.buttonIsCTA.push(false);
    this.buttonRow.push(-1);
    this.rowButtons.set(-1, [backIdx]);
    backBtn.on('pointerdown', () => { playClick(); this.goBack(); });
    backBtn.on('pointerover', () => { this.buttonNav.select(backIdx); });

    // --- Level rows ---
    const rowFontSize = Math.max(12, Math.round(15 * scaleFactor));
    const maxRowW = Math.min(width * 0.92, 600 * scaleFactor);
    const rowStartX = cx - maxRowW / 2;
    const compact = maxRowW < 450;  // two-line layout for narrow screens
    const rowH = compact
      ? Math.max(62, Math.round(74 * scaleFactor))   // two lines: name + buttons
      : Math.max(38, Math.round(48 * scaleFactor));   // single line
    const startY = title.y + title.height + Math.round(height * 0.02);
    const maxListH = height - startY - Math.round(height * 0.04);
    const totalListH = LEVELS.length * rowH;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, totalListH - maxListH);
    this.listStartY = startY;
    this.rowH = rowH;
    const needsScroll = totalListH > maxListH;

    const listContainer = this.add.container(0, startY).setDepth(DEPTHS.MENU_UI);
    this.listContainer = listContainer;

    const progress = getSavedProgress();

    // Pre-measure button labels for consistent sizing and alignment
    const groomLabelText = t('groom') || 'Groom';
    let skiModeVal = getString(STORAGE_KEYS.SKI_MODE) || 'random';
    if (skiModeVal === 'random') skiModeVal = Math.random() < 0.5 ? 'ski' : 'snowboard';
    this.resolvedSkiMode = skiModeVal as 'ski' | 'snowboard';
    const skiLabelText = skiModeVal === 'snowboard' ? (t('rideIt') || 'Ride it!') : (t('skiIt') || 'Ski it!');
    const btnStyle = { fontFamily: THEME.fonts.family, fontSize: `${btnFontSize}px`, padding: { x: 10, y: 10 } };
    const groomMeasure = this.add.text(-999, -999, groomLabelText, btnStyle);
    const skiMeasure = this.add.text(-999, -999, skiLabelText, btnStyle);
    const btnMinW = Math.max(groomMeasure.width, skiMeasure.width);
    groomMeasure.destroy();
    skiMeasure.destroy();
    const btnGap = 8;

    // Build rows
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i] as Level;
      const y = i * rowH;
      const unlocked = isLevelUnlocked(i);
      const completed = isLevelCompleted(i);
      const stats = getLevelStats(i);

      // Alternating row stripe for readability
      if (i % 2 === 0) {
        const stripe = this.add.rectangle(cx, y + rowH / 2, maxRowW + 20, rowH, 0xffffff, 0.04);
        listContainer.add(stripe);
      }

      // Vertical positions within the row
      const nameLineY = compact ? y + rowH * 0.35 : y + rowH / 2;
      const btnLineY = compact ? y + rowH * 0.72 : y + rowH / 2;

      // Difficulty marker
      const diffKey = level.difficulty === 'tutorial' ? 'green' : level.difficulty;
      const marker = DIFFICULTY_MARKERS[diffKey as keyof typeof DIFFICULTY_MARKERS];
      const markerColor = unlocked ? (marker?.color ?? 0x888888) : 0x666666;
      const markerSymbol = marker?.symbol ?? '●';
      const mg = this.add.text(rowStartX, nameLineY, markerSymbol, {
        fontFamily: THEME.fonts.family,
        fontSize: `${rowFontSize}px`,
        color: '#' + markerColor.toString(16).padStart(6, '0'),
        stroke: '#ffffff',
        strokeThickness: markerColor < 0x404040 ? 2 : 0,
      }).setOrigin(0, 0.5);
      listContainer.add(mg);

      // Level name
      const nameX = mg.x + mg.width + 8;
      const nameColor = unlocked ? THEME.colors.textPrimary : '#888888';
      // In compact mode, name gets full width; in wide mode, reserve space for buttons
      const nameClipW = compact
        ? maxRowW - (nameX - rowStartX) - 10
        : maxRowW - (nameX - rowStartX) - 2 * btnMinW - 2 * btnGap - 10;
      const nameText = this.add.text(nameX, nameLineY, t(level.nameKey) || level.nameKey, {
        fontFamily: THEME.fonts.family,
        fontSize: `${rowFontSize}px`,
        color: nameColor,
      }).setOrigin(0, 0.5);
      if (nameText.width > nameClipW) {
        nameText.setCrop(0, 0, nameClipW, nameText.height);
      }
      listContainer.add(nameText);

      // Stars (for completed levels)
      if (completed && stats) {
        const starsX = nameX + Math.min(nameText.width, nameClipW) + 6;
        const starsEndX = compact ? rowStartX + maxRowW : (cx + maxRowW / 2) - 2 * btnMinW - 2 * btnGap;
        if (starsEndX - starsX > 20) {
          const starStr = '⭐'.repeat(stats.bestStars) + '☆'.repeat(3 - stats.bestStars);
          const starText = this.add.text(starsX, nameLineY, starStr, {
            fontFamily: THEME.fonts.family,
            fontSize: `${Math.round(rowFontSize * 0.85)}px`,
            color: THEME.colors.accent,
          }).setOrigin(0, 0.5);
          listContainer.add(starText);
        }
      }

      // Buttons
      if (unlocked) {
        const btnAreaX = compact ? rowStartX + maxRowW : cx + maxRowW / 2;

        // Row touch zone — tapping the level name area activates Groom
        const rowZone = this.add.rectangle(cx, y + rowH / 2, maxRowW, rowH, 0xffffff, 0)
          .setInteractive({ useHandCursor: true });
        listContainer.add(rowZone);

        // Groom button — always in left slot
        const groomBtn = this.add.text(btnAreaX - btnMinW - btnGap, btnLineY, groomLabelText, {
          fontFamily: THEME.fonts.family,
          fontSize: `${btnFontSize}px`,
          color: '#ffffff',
          backgroundColor: THEME.colors.buttonCTAHex,
          padding: { x: 10, y: 10 },
          fixedWidth: btnMinW,
          align: 'center',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        listContainer.add(groomBtn);

        const groomIdx = this.menuButtons.length;
        this.menuButtons.push(groomBtn);
        this.buttonCallbacks.push(() => this.startLevel(i, 'groom'));
        this.buttonIsCTA.push(i === (progress?.currentLevel ?? 0));
        this.buttonRow.push(i);
        if (!this.rowButtons.has(i)) this.rowButtons.set(i, []);
        this.rowButtons.get(i)!.push(groomIdx);
        groomBtn.on('pointerdown', () => { playClick(); this.buttonCallbacks[groomIdx](); });
        groomBtn.on('pointerover', () => { this.buttonNav.select(groomIdx); });
        rowZone.on('pointerdown', () => { playClick(); this.buttonCallbacks[groomIdx](); });
        rowZone.on('pointerover', () => { this.buttonNav.select(groomIdx); });

        // Ski/Snowboard button (right of Groom, only for completed levels)
        if (completed) {
          const skiBtn = this.add.text(btnAreaX, btnLineY, skiLabelText, {
            fontFamily: THEME.fonts.family,
            fontSize: `${btnFontSize}px`,
            color: '#ffffff',
            backgroundColor: THEME.colors.buttonPrimaryHex,
            padding: { x: 10, y: 10 },
            fixedWidth: btnMinW,
            align: 'center',
          }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          listContainer.add(skiBtn);

          const skiIdx = this.menuButtons.length;
          this.menuButtons.push(skiBtn);
          this.buttonCallbacks.push(() => this.startLevel(i, 'ski'));
          this.buttonIsCTA.push(false);
          this.buttonRow.push(i);
          this.rowButtons.get(i)!.push(skiIdx);
          skiBtn.on('pointerdown', () => { playClick(); this.buttonCallbacks[skiIdx](); });
          skiBtn.on('pointerover', () => { this.buttonNav.select(skiIdx); });
        }
      } else {
        // Locked label
        const lockedText = this.add.text(rowStartX + maxRowW, compact ? btnLineY : y + rowH / 2,
          '🔒 ' + (t('locked') || 'Locked'), {
          fontFamily: THEME.fonts.family,
          fontSize: `${Math.round(btnFontSize * 0.9)}px`,
          color: '#888888',
        }).setOrigin(1, 0.5);
        listContainer.add(lockedText);
      }
    }

    // Always enable scroll (mask + wheel + touch drag)
    const mask = this.add.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRect(0, startY, width, maxListH);
    mask.setVisible(false);
    const geomMask = mask.createGeometryMask();
    listContainer.setMask(geomMask);

    // Scroll indicators (▲/▼)
    let scrollUpHint: Phaser.GameObjects.Text | null = null;
    let scrollDownHint: Phaser.GameObjects.Text | null = null;
    const updateScrollHints = () => {
      if (scrollUpHint) scrollUpHint.setAlpha(this.scrollY > 0 ? 0.7 : 0);
      if (scrollDownHint) scrollDownHint.setAlpha(this.scrollY < this.maxScroll ? 0.7 : 0);
    };
    this.updateScrollHints = updateScrollHints;
    if (needsScroll) {
      const hintSize = Math.round(Math.max(12, 16 * scaleFactor));
      scrollUpHint = this.add.text(cx, startY + 2, '▲', {
        fontFamily: THEME.fonts.family, fontSize: hintSize + 'px', color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_UI + 1).setAlpha(0);
      scrollDownHint = this.add.text(cx, startY + maxListH - 2, '▼', {
        fontFamily: THEME.fonts.family, fontSize: hintSize + 'px', color: '#ffffff',
      }).setOrigin(0.5, 1).setDepth(DEPTHS.MENU_UI + 1).setAlpha(0.7);
    }

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      listContainer.y = startY - this.scrollY;
      updateScrollHints();
    });

    // Touch drag scrolling for mobile
    let dragStartY = 0;
    let dragScrollStart = 0;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragScrollStart = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.maxScroll <= 0) return;
      const delta = dragStartY - pointer.y;
      if (Math.abs(delta) > 8) {
        this.scrollY = Phaser.Math.Clamp(dragScrollStart + delta, 0, this.maxScroll);
        listContainer.y = startY - this.scrollY;
        updateScrollHints();
      }
    });

    // Selection arrow indicator (gold ▶, like MenuScene)
    const arrowSize = Math.round(Math.max(12, 16 * scaleFactor));
    const selectionArrow = this.add.text(0, 0, '▶', {
      fontFamily: THEME.fonts.family,
      fontSize: arrowSize + 'px',
      color: '#FFD700',
      stroke: '#2d2822',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    listContainer.add(selectionArrow);

    // --- Navigation ---
    const buttonRowMap = this.buttonRow;
    const arrowX = rowStartX - arrowSize;
    this.buttonNav = createMenuButtonNav(
      this.menuButtons,
      this.buttonCallbacks,
      (buttons, selectedIndex) => {
        // Apply CTA-aware styling
        ctaStyler(this.buttonIsCTA)(buttons, selectedIndex);
        // Position arrow at the selected row
        const row = buttonRowMap[selectedIndex];
        if (row >= 0) {
          const rowCenterY = row * rowH + rowH / 2;
          selectionArrow.setPosition(arrowX, rowCenterY);
          selectionArrow.setVisible(true);
        } else {
          selectionArrow.setVisible(false);
        }
      },
    );

    // Select the current level's groom button by default
    const defaultIdx = this.buttonIsCTA.indexOf(true);
    if (defaultIdx >= 0) {
      this.buttonNav.select(defaultIdx);
      this.scrollToRow(this.buttonRow[defaultIdx]);
    }

    this.setupInput();
    this.inputReadyTimer = this.time.delayedCall(BALANCE.SCENE_INPUT_DELAY, () => { this.inputReady = true; });
    this.resizeManager = new ResizeManager(this);
    this.resizeManager.register();
    this.events.once('shutdown', this.shutdown, this);

    Accessibility.announce(t('levelSelect') || 'Level Select');
  }

  private setupInput(): void {
    // Grid navigation: UP/DOWN moves between rows, LEFT/RIGHT within a row
    this.input.keyboard?.on('keydown-UP', () => this.gridNavigate(0, -1));
    this.input.keyboard?.on('keydown-DOWN', () => this.gridNavigate(0, 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.gridNavigate(-1, 0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.gridNavigate(1, 0));
    this.input.keyboard?.on('keydown-ENTER', () => { if (this.inputReady) { playClick(); this.buttonNav.activate(); } });
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.inputReady) { playClick(); this.buttonNav.activate(); } });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.inputReady) this.goBack(); });

    // Custom gamepad polling for grid nav (vertical + horizontal)
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: () => {},  // unused — we poll manually in update
      onConfirm: () => { if (this.inputReady) { playClick(); this.buttonNav.activate(); } },
      onBack: () => { if (this.inputReady) this.goBack(); },
    });
  }

  /** Navigate the button grid. dx: horizontal within row, dy: vertical between rows. */
  private gridNavigate(dx: number, dy: number): void {
    const currentIdx = this.buttonNav.selectedIndex;
    const currentRow = this.buttonRow[currentIdx] ?? -1;

    if (dy !== 0) {
      // Move to adjacent row
      const sortedRows = [...this.rowButtons.keys()].sort((a, b) => a - b);
      const rowPos = sortedRows.indexOf(currentRow);
      if (rowPos < 0) return;
      const nextRowPos = rowPos + dy;
      if (nextRowPos < 0 || nextRowPos >= sortedRows.length) return;
      const nextRow = sortedRows[nextRowPos];
      const btns = this.rowButtons.get(nextRow)!;
      // Prefer same column position within the new row
      const colInCurrent = (this.rowButtons.get(currentRow) ?? []).indexOf(currentIdx);
      const targetIdx = btns[Math.min(colInCurrent, btns.length - 1)];
      this.buttonNav.select(targetIdx);
      this.scrollToRow(nextRow);
    } else if (dx !== 0) {
      // Move within current row
      const btns = this.rowButtons.get(currentRow);
      if (!btns || btns.length <= 1) return;
      const col = btns.indexOf(currentIdx);
      const nextCol = col + dx;
      if (nextCol < 0 || nextCol >= btns.length) return;
      this.buttonNav.select(btns[nextCol]);
    }
  }

  /** Scroll the list so the given level row is fully visible. */
  private scrollToRow(row: number): void {
    if (this.maxScroll <= 0 || !this.listContainer) return;
    // Back button (row -1) is outside the list — no scroll needed
    if (row < 0) return;

    const { height } = this.cameras.main;
    const maxListH = height - this.listStartY - Math.round(height * 0.04);
    const rowTop = row * this.rowH;
    const rowBottom = rowTop + this.rowH;

    if (rowTop < this.scrollY) {
      this.scrollY = Math.max(0, rowTop - 5);
    } else if (rowBottom > this.scrollY + maxListH) {
      this.scrollY = Math.min(this.maxScroll, rowBottom - maxListH + 5);
    } else {
      return; // already visible
    }

    this.listContainer.y = this.listStartY - this.scrollY;
    this.updateScrollHints?.();
  }

  private startLevel(level: number, mode: 'groom' | 'ski'): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
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

  private gamepadCooldown = 0;

  update(time: number, delta: number): void {
    this.wildlife?.update(time, delta);
    this.gamepadNav?.update(delta);

    // Gamepad grid navigation (d-pad + stick)
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.gamepadCooldown = Math.max(0, this.gamepadCooldown - delta);
        if (this.gamepadCooldown <= 0) {
          const sx = pad.leftStick?.x ?? 0;
          const sy = pad.leftStick?.y ?? 0;
          if (pad.up || sy < -0.5) {
            this.gridNavigate(0, -1); this.gamepadCooldown = 200;
          } else if (pad.down || sy > 0.5) {
            this.gridNavigate(0, 1); this.gamepadCooldown = 200;
          } else if (pad.left || sx < -0.5) {
            this.gridNavigate(-1, 0); this.gamepadCooldown = 200;
          } else if (pad.right || sx > 0.5) {
            this.gridNavigate(1, 0); this.gamepadCooldown = 200;
          }
        }
      }
    }
  }

  private shutdown(): void {
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
    this.input.off('wheel');
    this.resizeManager?.destroy();
    this.wildlife?.destroy();
    this.listContainer = null;
    this.updateScrollHints = null;
  }
}
