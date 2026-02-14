import Phaser from 'phaser';
import { t, LEVELS, type Level, type BonusObjective } from '../setup';
import { THEME } from '../config/theme';
import { DEPTHS, BALANCE } from '../config/gameConfig';
import { GAME_EVENTS, type GameStateEvent } from '../types/GameSceneInterface';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch, isMobile, onTouchAvailable } from '../utils/touchDetect';
import { captureGamepadButtons, isGamepadButtonPressed } from '../utils/gamepad';
import { ResizeManager } from '../utils/resizeManager';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { toggleFullscreen } from '../utils/fullscreen';
import { Accessibility } from '../utils/accessibility';
import { isRenderThrottled } from '../utils/renderThrottle';

/**
 * Les Aiguilles Blanches - HUD Scene
 * Displays fuel, stamina, coverage, and timer
 */

interface HUDSceneData {
  level: Level;
  mode?: 'groom' | 'ski';
}

export default class HUDScene extends Phaser.Scene {
  private level!: Level;
  private mode: 'groom' | 'ski' = 'groom';
  private gameState: GameStateEvent = { fuel: 100, stamina: 100, coverage: 0, winchActive: false, levelIndex: 0, activeBuff: null, buffTimeRemaining: 0, buffIcon: '', frostLevel: 0, tumbleCount: 0, fuelUsed: 0, winchUseCount: 0, pathsVisited: 0, totalPaths: 0, restartCount: 0 };
  private isSkipping = false;
  private gamepadSelectPressed = false;
  private uiScale = 1;
  private barWidth = 130;

  private fuelBar: Phaser.GameObjects.Rectangle | null = null;
  private fuelBarBg: Phaser.GameObjects.Rectangle | null = null;
  private fuelText: Phaser.GameObjects.Text | null = null;
  private staminaBar: Phaser.GameObjects.Rectangle | null = null;
  private staminaBarBg: Phaser.GameObjects.Rectangle | null = null;
  private staminaText: Phaser.GameObjects.Text | null = null;
  private buffIndicator: Phaser.GameObjects.Text | null = null;
  private frostIndicator: Phaser.GameObjects.Text | null = null;
  private coverageText: Phaser.GameObjects.Text | null = null;
  private coverageBar: Phaser.GameObjects.Rectangle | null = null;
  private coverageBarBg: Phaser.GameObjects.Rectangle | null = null;
  private covBarWidth = 0;
  private timerText: Phaser.GameObjects.Text | null = null;
  private winchStatus: Phaser.GameObjects.Text | null = null;
  private touchControlsContainer: Phaser.GameObjects.Container | null = null;
  
  // Virtual joystick components
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickPointer: Phaser.Input.Pointer | null = null;
  
  // Touch controls bounds (for dialogue positioning)
  private touchControlsTopEdge = 0;

  // Bonus objectives panel
  private bonusTexts: Phaser.GameObjects.Text[] = [];
  private bonusObjectives: BonusObjective[] = [];

  // FPS counter
  private fpsText: Phaser.GameObjects.Text | null = null;
  private showFps = false;
  private fpsUpdateTimer = 0;
  private fpsFrameTimes: number[] = []; // rolling window of recent frame deltas
  private bonusFailed: boolean[] = []; // irreversible failure tracking


  // Touch controls state (emitted via GAME_EVENTS.TOUCH_INPUT)
  private touchUp = false;
  private touchDown = false;
  private touchLeft = false;
  private touchRight = false;
  private touchGroom = false;
  private touchWinch = false;
  
  // Action button hit areas for multi-touch overlap detection
  private actionButtons: Array<{
    x: number; y: number; radius: number;
    onDown: () => void; onUp: () => void;
    bg: Phaser.GameObjects.Arc; pressedColor: number; color: number; alpha: number;
    wasPressed: boolean;
  }> = [];

  constructor() {
    super({ key: 'HUDScene' });
  }
  
  /** Get the Y coordinate of the top edge of touch controls (for dialogue positioning) */
  public getTouchControlsTopEdge(): number {
    return this.touchControlsTopEdge;
  }

  init(data: HUDSceneData): void {
    this.level = data.level;
    this.mode = data.mode || 'groom';
    this.isSkipping = false;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Capture current gamepad state to prevent phantom presses on scene transition
    const padState = captureGamepadButtons(this, [8]); // 8 = Select/Back
    this.gamepadSelectPressed = padState[8];

    // For very tall screens (21:9 phones), scale based on width to ensure UI fits
    const refWidth = 1024;
    const refHeight = 768;
    const scaleX = width / refWidth;
    const scaleY = height / refHeight;
    // Use smaller scale dimension to ensure everything fits
    let baseScale = Math.max(0.6, Math.min(2.0, Math.min(scaleX, scaleY)));
    
    // On high-DPI mobile devices, boost UI scale for better readability
    const mobile = isMobile();
    const dpr = window.devicePixelRatio || 1;
    if (mobile && dpr > 1.5) {
      baseScale = Math.min(2.0, baseScale * 1.2);
    }
    this.uiScale = baseScale;

    // Ski mode: only touch controls (joystick + brake), no grooming HUD
    if (this.mode === 'ski') {
      this.createSkiModeTouchControls(mobile);
      this.events.once('shutdown', this.shutdown, this);
      return;
    }

    const padding = Math.round(10 * this.uiScale);
    const isNarrow = width < 600; // Portrait phone or small screen
    const isShort = height < 500; // Landscape phone
    const isCompact = isNarrow || isShort; // Drop labels, tighten spacing
    const barWidth = Math.round((isCompact ? 60 : 80) * this.uiScale);
    const barHeight = Math.round(12 * this.uiScale);
    const barBorder = Math.max(1, Math.round(1.5 * this.uiScale));

    // Minimum readable font sizes (CSS pixels)
    const fontTiny = Math.max(11, Math.round(12 * this.uiScale)) + 'px';
    const fontSmall = Math.max(12, Math.round(14 * this.uiScale)) + 'px';
    const fontMed = Math.max(14, Math.round(16 * this.uiScale)) + 'px';
    const fontLarge = Math.max(18, Math.round(24 * this.uiScale)) + 'px';

    // Accessibility: boost contrast when high-contrast or colorblind modes are active
    const a11y = Accessibility.settings;
    const hc = a11y.highContrast;
    const cb = a11y.colorblindMode !== 'none';
    // Text stroke for readability in high-contrast/colorblind modes
    const a11yStroke = (hc || cb) ? '#000000' : undefined;
    const a11yStrokeThickness = (hc || cb) ? Math.max(2, Math.round(3 * this.uiScale)) : 0;
    // Helper: create text with visor styling (white, bold, accessibility stroke)
    const visorText = (x: number, y: number, content: string, fontSize: string, color = '#FFFFFF') =>
      this.add.text(x, y, content, {
        fontFamily: THEME.fonts.family, fontSize, fontStyle: 'bold', color,
        stroke: a11yStroke, strokeThickness: a11yStrokeThickness,
      }).setScrollFactor(0);

    // === VISOR: semi-transparent dark strip across top ===
    // Row 1: level name + timer
    // Row 2: fuel bar | stamina bar | coverage bar (all horizontal)
    // Row 3: bonus objectives (horizontal, if any)
    const row1Y = padding;
    const nameGap = isShort ? Math.round(22 * this.uiScale) : Math.round(26 * this.uiScale);
    const row2Y = row1Y + nameGap;
    const bonusCount = (this.level.bonusObjectives || []).length;
    const bonusLineHeight = Math.round(20 * this.uiScale);
    const row2BottomPad = Math.round(10 * this.uiScale);
    const row3Y = row2Y + barHeight + barBorder * 2 + row2BottomPad;
    const bonusExtraHeight = bonusCount > 0 ? bonusLineHeight + Math.round(6 * this.uiScale) : 0;
    const visorHeight = row3Y + bonusExtraHeight + (bonusCount > 0 ? 0 : Math.round(-4 * this.uiScale));

    // Higher alpha in accessibility modes for stronger background contrast
    const visorAlpha = (hc || cb) ? 0.8 : 0.55;
    this.add.rectangle(0, 0, width, visorHeight, 0x000000)
      .setOrigin(0).setScrollFactor(0).setAlpha(visorAlpha);
    // Thin bottom edge accent — thicker in high-contrast
    const accentHeight = hc ? 2 : 1;
    this.add.rectangle(0, visorHeight - accentHeight, width, accentHeight, THEME.colors.infoHex)
      .setOrigin(0).setScrollFactor(0).setAlpha(hc ? 0.8 : 0.4);

    // Level name
    const levelNameText = visorText(padding, row1Y, t(this.level.nameKey) || 'Level', fontSmall);

    // Buff indicator — shown right after level name on row 1
    const buffX = levelNameText.x + levelNameText.width + Math.round(12 * this.uiScale);
    this.buffIndicator = visorText(buffX, row1Y, '', fontSmall);
    if (this.buffIndicator) this.buffIndicator.setAlpha(0);

    // Frost indicator — shown after buff indicator on row 1
    const frostX = buffX + Math.round(60 * this.uiScale);
    this.frostIndicator = visorText(frostX, row1Y, '', fontSmall);
    if (this.frostIndicator) this.frostIndicator.setAlpha(0);

    // === ROW 2: All three bars side by side ===
    const dotSize = Math.round(6 * this.uiScale);
    const dotGap = Math.round(4 * this.uiScale);
    const barTextGap = Math.round(4 * this.uiScale);
    const sectionGap = Math.round(10 * this.uiScale);
    const barCenterY = row2Y + barHeight / 2 + barBorder;
    // Reserve space for "100%" text (4 chars in monospace fontTiny)
    const pctTextWidth = Math.round(30 * this.uiScale);
    // Coverage bar fills remaining space up to timer area, capped for readability
    const timerReserve = Math.round(80 * this.uiScale);
    // In colorblind mode, use text labels ("F"/"S") instead of colored dots
    const labelWidth = cb ? Math.round(12 * this.uiScale) : 0;
    const indicatorWidth = cb ? labelWidth : dotSize;
    const resourceSectionWidth = indicatorWidth + dotGap + barWidth + barBorder * 2 + barTextGap + pctTextWidth;
    const covBarStartX = padding + resourceSectionWidth * 2 + sectionGap * 2 + indicatorWidth + dotGap;
    const covBarRight = width - padding - timerReserve;
    const covBarWidthRaw = covBarRight - covBarStartX - barBorder * 2 - barTextGap - pctTextWidth;
    // Cap coverage bar: min 60, max 200 (scaled) to avoid giant bars on ultrawide
    const covBarWidth = Math.max(Math.round(60 * this.uiScale), Math.min(Math.round(200 * this.uiScale), covBarWidthRaw));
    // Bar border color — brighter in high-contrast mode
    const barBorderColor = hc ? 0x999999 : 0x555555;

    // --- Fuel bar ---
    let curX = padding;
    if (cb) {
      // Text label instead of colored dot for colorblind accessibility
      visorText(curX, barCenterY, 'F', fontTiny, '#FF6666').setOrigin(0, 0.5);
      curX += labelWidth + dotGap;
    } else {
      this.add.rectangle(curX + dotSize / 2, barCenterY, dotSize, dotSize, THEME.colors.dangerHex)
        .setScrollFactor(0);
      curX += dotSize + dotGap;
    }
    this.add.rectangle(curX, barCenterY, barWidth + barBorder * 2, barHeight + barBorder * 2, barBorderColor)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBarBg = this.add.rectangle(curX + barBorder, barCenterY, barWidth, barHeight, 0x222222)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBar = this.add.rectangle(curX + barBorder, barCenterY, barWidth, barHeight, THEME.colors.dangerHex)
      .setOrigin(0, 0.5).setScrollFactor(0);
    curX += barWidth + barBorder * 2 + barTextGap;
    this.fuelText = visorText(curX, row2Y, '100%', fontTiny);

    // --- Stamina bar ---
    curX += pctTextWidth + sectionGap;
    if (cb) {
      visorText(curX, barCenterY, 'S', fontTiny, '#66FF66').setOrigin(0, 0.5);
      curX += labelWidth + dotGap;
    } else {
      this.add.rectangle(curX + dotSize / 2, barCenterY, dotSize, dotSize, THEME.colors.successHex)
        .setScrollFactor(0);
      curX += dotSize + dotGap;
    }
    this.add.rectangle(curX, barCenterY, barWidth + barBorder * 2, barHeight + barBorder * 2, barBorderColor)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBarBg = this.add.rectangle(curX + barBorder, barCenterY, barWidth, barHeight, 0x222222)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBar = this.add.rectangle(curX + barBorder, barCenterY, barWidth, barHeight, THEME.colors.successHex)
      .setOrigin(0, 0.5).setScrollFactor(0);
    curX += barWidth + barBorder * 2 + barTextGap;
    this.staminaText = visorText(curX, row2Y, '100%', fontTiny);

    // --- Coverage bar with target marker ---
    curX += pctTextWidth + sectionGap;
    const covBarX = curX;
    this.add.rectangle(covBarX, barCenterY, covBarWidth + barBorder * 2, barHeight + barBorder * 2, barBorderColor)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.coverageBarBg = this.add.rectangle(covBarX + barBorder, barCenterY, covBarWidth, barHeight, 0x222222)
      .setOrigin(0, 0.5).setScrollFactor(0);
    this.coverageBar = this.add.rectangle(covBarX + barBorder, barCenterY, 0, barHeight, 0xffffff)
      .setOrigin(0, 0.5).setScrollFactor(0);
    // Target marker — gold vertical line at target % position
    const targetX = covBarX + barBorder + Math.round(covBarWidth * this.level.targetCoverage / 100);
    const markerHeight = barHeight + barBorder * 2 + Math.round(4 * this.uiScale);
    this.add.rectangle(targetX, barCenterY, Math.max(2, Math.round(2 * this.uiScale)), markerHeight, THEME.colors.accentHex)
      .setScrollFactor(0).setAlpha(0.9);
    curX = covBarX + covBarWidth + barBorder * 2 + barTextGap;
    this.coverageText = visorText(curX, row2Y, '0%', fontTiny);
    this.covBarWidth = covBarWidth;

    // === TOP-RIGHT: Timer ===
    const hasTimer = this.level.timeLimit > 0;
    const initMins = Math.floor(this.level.timeLimit / 60);
    const initSecs = this.level.timeLimit % 60;
    const initTimerStr = hasTimer
      ? initMins.toString().padStart(2, '0') + ':' + initSecs.toString().padStart(2, '0')
      : '';
    this.timerText = visorText(width - padding, row1Y, initTimerStr, fontLarge)
      .setOrigin(1, 0);
    if (!hasTimer) this.timerText.setVisible(false);

    // Touch detection for button sizing
    const phaserTouch = this.sys.game.device.input.touch;
    const browserTouch = detectTouch();
    const hasTouch = phaserTouch || browserTouch;
    // isMobile() already called at top of create() as `mobile`

    // Touch button sizing
    const touchBtnPad = Math.round(6 * this.uiScale);
    const minHitSize = 44; // Minimum touch target per ART_STYLE.md
    
    // Skip level button — below visor, right-aligned
    // On narrow mobile, use abbreviated ">>" to save space
    // On very narrow (<=360px), position skip on left to avoid crowding pause/fullscreen
    const skipFontSize = (hasTouch && mobile) ? Math.max(14, Math.round(12 * this.uiScale)) + 'px' : fontTiny;
    const isVeryNarrow = width <= 360;
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    const skipLabel = isNarrow ? '>>' : (hasTouch && mobile) ? '>> Skip' : hasGamepad ? '>> Skip [Select]' : '>> Skip [N]';
    const skipY = visorHeight + Math.round(4 * this.uiScale);
    let nextButtonY = skipY;
    
    const skipOriginX = (isVeryNarrow && hasTouch) ? 0 : 1;
    const skipX = (isVeryNarrow && hasTouch)
      ? padding + Math.round(8 * this.uiScale)
      : width - padding;
    const skipBtn = this.add.text(skipX, nextButtonY, skipLabel, {
      fontFamily: THEME.fonts.family,
      fontSize: skipFontSize,
      color: THEME.colors.textMuted,
    }).setOrigin(skipOriginX, 0).setScrollFactor(0);

    // Ensure skip button meets minimum touch target on mobile
    let skipHitBottom = skipBtn.y + skipBtn.height; // Default: text bottom
    if (hasTouch) {
      const skipHitW = Math.max(minHitSize, skipBtn.width + touchBtnPad * 2);
      const skipHitH = Math.max(minHitSize, skipBtn.height + touchBtnPad);
      const skipCenterY = skipBtn.y + skipBtn.height / 2;
      const skipHitX = skipOriginX === 0
        ? skipBtn.x + skipBtn.width / 2
        : skipBtn.x - skipBtn.width / 2;
      const skipHitZone = this.add.rectangle(
        skipHitX, skipCenterY,
        skipHitW, skipHitH, 0x000000, 0
      ).setScrollFactor(0).setDepth(DEPTHS.NIGHT_OVERLAY)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.skipLevel());
      skipBtn.on('pointerover', () => skipBtn.setStyle({ color: THEME.colors.textPrimary }));
      skipHitZone.on('pointerover', () => skipBtn.setStyle({ color: THEME.colors.textPrimary }));
      skipBtn.on('pointerout', () => skipBtn.setStyle({ color: THEME.colors.textMuted }));
      skipHitZone.on('pointerout', () => skipBtn.setStyle({ color: THEME.colors.textMuted }));
      skipHitBottom = skipCenterY + skipHitH / 2;
    } else {
      skipBtn.setInteractive({ useHandCursor: true })
        .on('pointerover', () => skipBtn.setStyle({ color: THEME.colors.textPrimary }))
        .on('pointerout', () => skipBtn.setStyle({ color: THEME.colors.textMuted }))
        .on('pointerdown', () => this.skipLevel());
    }
    
    // Position pause/fullscreen buttons below skip hit zone on touch, below visor otherwise
    if (hasTouch) {
      // Ensure pause bg top edge doesn't overlap skip bg bottom edge
      // Pause bg center is at nextButtonY + textHeight/2, so bg top = nextButtonY - (hitSize - textHeight)/2
      // We need: nextButtonY - hitSize/2 + textHeight/2 >= skipHitBottom + gap
      // Simplify: nextButtonY >= skipHitBottom + gap + hitSize/2 (conservative, works for any text height)
      nextButtonY = Math.max(visorHeight + Math.round(4 * this.uiScale), Math.round(skipHitBottom + minHitSize / 2 + 4 * this.uiScale));
    } else {
      nextButtonY = visorHeight + Math.round(4 * this.uiScale);
    }

    this.input.keyboard?.on('keydown-N', (e: KeyboardEvent) => {
      if (!this.isKeyBoundToGameControl(e.keyCode)) this.skipLevel();
    });
    this.input.keyboard?.on('keydown-P', (e: KeyboardEvent) => {
      if (!this.isKeyBoundToGameControl(e.keyCode)) this.prevLevel();
    });
    this.input.keyboard?.on('keydown-K', (e: KeyboardEvent) => {
      if (!this.isKeyBoundToGameControl(e.keyCode)) this.startSkiRun();
    });
    
    // Show keyboard hint on desktop (even with touchscreen), touch hint on mobile

    // Winch status indicator — row 1, right of level name (mode indicator)
    if (this.level.hasWinch) {
      const winchX = padding + levelNameText.width + Math.round(10 * this.uiScale);
      this.winchStatus = visorText(winchX, row1Y, '', fontSmall, '#00FF00')
        .setVisible(false);
    }

    // Bonus objectives in row 3 — horizontal layout with fixed-width columns
    this.bonusObjectives = this.level.bonusObjectives || [];
    this.bonusFailed = this.bonusObjectives.map(() => false);
    this.bonusTexts = [];
    if (this.bonusObjectives.length > 0) {
      // Divide available width evenly among objectives
      const availWidth = width - padding * 2;
      const colWidth = Math.floor(availWidth / this.bonusObjectives.length);
      this.bonusObjectives.forEach((obj, i) => {
        const label = this.getBonusLabel(obj);
        const txt = visorText(padding + i * colWidth, row3Y, '★ ' + label, fontSmall);
        this.bonusTexts.push(txt);
      });
    }

    this.barWidth = barWidth;

    // FPS counter — visor bottom-right, toggled in Settings (default: on)
    this.showFps = getString(STORAGE_KEYS.SHOW_FPS) !== 'false';
    const fpsFontSize = Math.max(10, Math.round(11 * this.uiScale)) + 'px';
    const fpsY = visorHeight - padding;
    this.fpsText = this.add.text(width - padding, fpsY, '', {
      fontFamily: 'monospace', fontSize: fpsFontSize, color: '#88ff88',
    }).setOrigin(1, 1).setScrollFactor(0).setAlpha(0.7).setVisible(this.showFps);
    this.fpsUpdateTimer = 0;

    this.game.events.on(GAME_EVENTS.GAME_STATE, this.handleGameState, this);
    this.game.events.on(GAME_EVENTS.TIMER_UPDATE, this.updateTimer, this);
    this.game.events.on(GAME_EVENTS.ACCESSIBILITY_CHANGED, this.handleAccessibilityChanged, this);
    this.resizeManager = new ResizeManager(this, {
      restartData: () => ({ level: this.level }),
    });
    this.resizeManager.register();

    // Create touch controls - show on mobile, or on first touch for PC with touchscreen
    if (mobile && hasTouch) {
      this.createTouchControls();
    } else if (hasTouch) {
      // PC with touchscreen: create controls but hidden, show on first touch
      this.createTouchControls(true);
    } else {
      // Firefox desktop: touch not detected yet — create controls on first touch
      onTouchAvailable(() => {
        if (this.scene?.manager && this.scene.isActive() && !this.touchControlsContainer) {
          this.createTouchControls();
        }
      });
    }

    // Touch-specific buttons (created AFTER touch controls so they render on top)
    const isFullscreen = !!document.fullscreenElement;
    
    // Larger font for touch buttons on mobile (minimum 24px for easy tapping)
    const touchBtnSize = mobile ? Math.max(24, Math.round(20 * this.uiScale)) + 'px' : fontMed;
    
    // Pause/Menu button (touch devices)
    if (hasTouch) {
      const pauseBtn = this.add.text(width - padding, nextButtonY, '||', {
        fontFamily: THEME.fonts.family,
        fontSize: touchBtnSize,
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTHS.PLAYER);
      const pbW = Math.max(minHitSize, pauseBtn.width + touchBtnPad * 2);
      const pbH = Math.max(minHitSize, pauseBtn.height + touchBtnPad);
      const pbBg = this.add.rectangle(
        pauseBtn.x - pauseBtn.width / 2, pauseBtn.y + pauseBtn.height / 2,
        pbW, pbH,
        0x000000
      ).setScrollFactor(0).setDepth(DEPTHS.NIGHT_OVERLAY).setAlpha(0.55);
      pbBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openPauseMenu());
      pauseBtn.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openPauseMenu());
      nextButtonY += pbH + Math.round(5 * this.uiScale);
    }

    // Fullscreen button (touch devices or when in fullscreen)
    if ((hasTouch || isFullscreen) && document.fullscreenEnabled) {
      const fsLabel = isFullscreen ? 'X' : '[]';
      const fsBtn = this.add.text(width - padding, nextButtonY, fsLabel, {
        fontFamily: THEME.fonts.family,
        fontSize: touchBtnSize,
        fontStyle: 'bold',
        color: isFullscreen ? '#FF6666' : '#FFFFFF',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTHS.PLAYER);
      const fsW = Math.max(minHitSize, fsBtn.width + touchBtnPad * 2);
      const fsH = Math.max(minHitSize, fsBtn.height + touchBtnPad);
      const fsBg = this.add.rectangle(
        fsBtn.x - fsBtn.width / 2, fsBtn.y + fsBtn.height / 2,
        fsW, fsH,
        0x000000
      ).setScrollFactor(0).setDepth(DEPTHS.NIGHT_OVERLAY).setAlpha(0.55);
      fsBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleFullscreen(this));
      fsBtn.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleFullscreen(this));
    }
  }

  private createTouchControls(startHidden = false): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Scale touch controls for high-DPI screens
    const mobile = isMobile();
    
    // Base size: larger on mobile
    const baseSize = mobile ? Math.max(60, 50 * Math.max(1, this.uiScale)) : 50 * this.uiScale;
    const btnSize = Math.round(baseSize);
    const padding = Math.round(25 * this.uiScale);
    const alpha = 0.7;

    // Create container for all touch controls
    this.touchControlsContainer = this.add.container(0, 0);
    this.touchControlsContainer.setScrollFactor(0);
    
    if (startHidden) {
      this.touchControlsContainer.setVisible(false);
      onTouchAvailable(() => {
        if (this.touchControlsContainer) {
          this.touchControlsContainer.setVisible(true);
          // Re-emit so DialogueScene repositions above controls
          this.game.events.emit(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.touchControlsTopEdge);
        }
      });
    }

    // Virtual joystick (bottom-left)
    // On narrow screens, cap joystick radius so it doesn't overlap action buttons
    const isNarrowTouch = width < 600;
    const actionBtnSpace = isNarrowTouch ? (btnSize * 2.4 + padding * 1.5) : 0;
    const maxJoystickRadius = isNarrowTouch
      ? Math.floor((width - actionBtnSpace - padding * 2 - 10) / 2) // 10px gap
      : Infinity;
    const joystickRadius = Math.min(Math.round(btnSize * 1.8), maxJoystickRadius);
    const thumbRadius = Math.round(btnSize * 0.6);
    const joystickX = Math.round(padding + joystickRadius);
    const joystickY = Math.round(height - padding - joystickRadius);
    
    // Calculate top edge of touch controls (joystick top + margin)
    // This is used by DialogueScene to position dialogues above touch controls
    const joystickTopEdge = joystickY - joystickRadius;
    const margin = 15; // Extra margin between dialogue and controls
    this.touchControlsTopEdge = joystickTopEdge - margin;

    // Notify GameScene so it can offset the camera to keep groomer above controls
    this.game.events.emit(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.touchControlsTopEdge);

    // Joystick base (outer circle) — beveled retro style
    this.joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0x222222, alpha * 0.7)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(3, Math.round(3 * this.uiScale)), 0x555555, alpha);
    
    // Direction indicators on base
    const indicatorDist = Math.round(joystickRadius * 0.7);
    const indicators = [
      { x: 0, y: -indicatorDist, label: '▲' },
      { x: 0, y: indicatorDist, label: '▼' },
      { x: -indicatorDist, y: 0, label: '◀' },
      { x: indicatorDist, y: 0, label: '▶' },
    ];
    indicators.forEach(ind => {
      this.add.text(joystickX + ind.x, joystickY + ind.y, ind.label, {
        fontSize: Math.round(btnSize * 0.35) + 'px',
        color: THEME.colors.textMuted,
      }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.6);
    });

    // Joystick thumb (inner circle that moves) — beveled
    this.joystickThumb = this.add.circle(joystickX, joystickY, thumbRadius, 0x555555, alpha)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(2, Math.round(2 * this.uiScale)), 0x888888, alpha);

    // Add to container
    this.touchControlsContainer.add([this.joystickBase, this.joystickThumb]);

    // Create interactive zone for joystick (larger than visual)
    const joystickZone = this.add.circle(joystickX, joystickY, joystickRadius * 1.2, 0x000000, 0)
      .setScrollFactor(0)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.joystickPointer = pointer;
        this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
      })
      .on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.joystickPointer === pointer) {
          this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
        }
      })
      .on('pointerup', () => this.resetJoystick(joystickX, joystickY))
      .on('pointerout', () => this.resetJoystick(joystickX, joystickY))
      .on('pointercancel', () => this.resetJoystick(joystickX, joystickY));
    
    this.touchControlsContainer.add(joystickZone);

    // Action buttons (bottom-right)
    const actionX = Math.round(width - padding - btnSize);
    const actionY = Math.round(height - padding - btnSize);

    // Groom button (SPACE equivalent) — action button for overlap detection
    this.createTouchButton(Math.round(actionX - btnSize - padding / 2), actionY, Math.round(btnSize * 1.2), 'GRM', alpha,
      () => { this.touchGroom = true; },
      () => { this.touchGroom = false; },
      0x1a4a7a, true
    );

    // Winch button (SHIFT equivalent) - only if level has winch
    if (this.level.hasWinch) {
      this.createTouchButton(actionX, Math.round(actionY - btnSize - padding / 2), Math.round(btnSize * 1.2), 'WCH', alpha,
        () => { this.touchWinch = true; },
        () => { this.touchWinch = false; },
        0x7a4a1a, true
      );
    }
  }

  /** Ski mode: joystick (left/right only) + brake button (reuses winch touch state) */
  private createSkiModeTouchControls(mobile: boolean): void {
    const phaserTouch = this.sys.game.device.input.touch;
    const browserTouch = detectTouch();
    const hasTouch = phaserTouch || browserTouch;
    if (mobile && hasTouch) {
      this.createSkiTouchUI(mobile);
    } else if (hasTouch) {
      // PC with touchscreen: create hidden, reveal on first real touch
      this.createSkiTouchUI(mobile, true);
    } else {
      // Firefox late-detect: create controls on first real touch
      onTouchAvailable(() => {
        if (this.scene?.manager && this.scene.isActive() && !this.touchControlsContainer) {
          this.createSkiTouchUI(mobile);
        }
      });
    }
  }

  private createSkiTouchUI(mobile: boolean, startHidden = false): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const baseSize = mobile ? Math.max(60, 50 * Math.max(1, this.uiScale)) : 50 * this.uiScale;
    const btnSize = Math.round(baseSize);
    const padding = Math.round(25 * this.uiScale);
    const alpha = 0.7;

    this.touchControlsContainer = this.add.container(0, 0);
    this.touchControlsContainer.setScrollFactor(0);

    if (startHidden) {
      this.touchControlsContainer.setVisible(false);
      onTouchAvailable(() => {
        if (this.touchControlsContainer) {
          this.touchControlsContainer.setVisible(true);
          this.game.events.emit(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.touchControlsTopEdge);
        }
      });
    }

    // Virtual joystick (bottom-left) — reuse same layout as groom mode
    const isNarrowTouch = width < 600;
    const actionBtnSpace = isNarrowTouch ? (btnSize * 2.4 + padding * 1.5) : 0;
    const maxJoystickRadius = isNarrowTouch
      ? Math.floor((width - actionBtnSpace - padding * 2 - 10) / 2)
      : Infinity;
    const joystickRadius = Math.min(Math.round(btnSize * 1.8), maxJoystickRadius);
    const thumbRadius = Math.round(btnSize * 0.6);
    const joystickX = Math.round(padding + joystickRadius);
    const joystickY = Math.round(height - padding - joystickRadius);

    this.joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0x222222, alpha * 0.7)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(3, Math.round(3 * this.uiScale)), 0x555555, alpha);

    // Left/right indicators only (skiing is lateral steering)
    for (const ind of [
      { x: -Math.round(joystickRadius * 0.7), y: 0, label: '◀' },
      { x: Math.round(joystickRadius * 0.7), y: 0, label: '▶' },
    ]) {
      this.add.text(joystickX + ind.x, joystickY + ind.y, ind.label, {
        fontSize: Math.round(btnSize * 0.35) + 'px',
        color: THEME.colors.textMuted,
      }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.6);
    }

    this.joystickThumb = this.add.circle(joystickX, joystickY, thumbRadius, 0x555555, alpha)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(2, Math.round(2 * this.uiScale)), 0x888888, alpha);

    this.touchControlsContainer.add([this.joystickBase, this.joystickThumb]);

    const joystickZone = this.add.circle(joystickX, joystickY, joystickRadius * 1.2, 0x000000, 0)
      .setScrollFactor(0)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.joystickPointer = pointer;
        this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
      })
      .on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.joystickPointer === pointer) {
          this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
        }
      })
      .on('pointerup', () => this.resetJoystick(joystickX, joystickY))
      .on('pointerout', () => this.resetJoystick(joystickX, joystickY))
      .on('pointercancel', () => this.resetJoystick(joystickX, joystickY));

    this.touchControlsContainer.add(joystickZone);

    // Brake button (bottom-right) — maps to touchWinch (same key binding as winch)
    const actionX = Math.round(width - padding - btnSize);
    const actionY = Math.round(height - padding - btnSize);
    this.createTouchButton(
      Math.round(actionX - btnSize - padding / 2), actionY, Math.round(btnSize * 1.2), 'BRK', alpha,
      () => { this.touchWinch = true; },
      () => { this.touchWinch = false; },
      0x7a1a1a, true
    );

    // Jump button (above brake) — maps to touchGroom
    this.createTouchButton(
      Math.round(actionX - btnSize - padding / 2), Math.round(actionY - btnSize * 1.2 - padding * 0.6),
      Math.round(btnSize * 1.2), 'JMP', alpha,
      () => { this.touchGroom = true; },
      () => { this.touchGroom = false; },
      0x1a5a7a, true
    );
  }

  /** Process action button overlaps and emit touch state for the consuming scene */
  private emitTouchState(): void {
    // Action button overlap detection
    if (this.actionButtons.length > 0) {
      const pointers = this.input.manager?.pointers;
      if (!pointers) return;
      for (const btn of this.actionButtons) {
        if (!btn.bg?.active) continue;
        let pressed = false;
        for (const p of pointers) {
          if (!p.isDown) continue;
          const dx = p.x - btn.x;
          const dy = p.y - btn.y;
          if (dx * dx + dy * dy <= btn.radius * btn.radius) {
            pressed = true;
            break;
          }
        }
        if (pressed && !btn.wasPressed) {
          btn.bg.setFillStyle(btn.pressedColor, btn.alpha + 0.2);
          btn.bg.setScale(1.1);
          btn.onDown();
        } else if (!pressed && btn.wasPressed) {
          btn.bg.setFillStyle(btn.color, btn.alpha);
          btn.bg.setScale(1);
          btn.onUp();
        }
        btn.wasPressed = pressed;
      }
    }

    // Safety: reset touch states if no active pointers
    const activePointers = this.input.manager?.pointers?.filter(p => p.isDown);
    if (!activePointers || activePointers.length === 0) {
      for (const btn of this.actionButtons) {
        if (btn.wasPressed && btn.bg?.active) {
          btn.bg.setFillStyle(btn.color, btn.alpha);
          btn.bg.setScale(1);
          btn.onUp();
          btn.wasPressed = false;
        }
      }
      this.touchUp = false;
      this.touchDown = false;
      this.touchLeft = false;
      this.touchRight = false;
      this.touchGroom = false;
      this.touchWinch = false;
    }

    this.game.events.emit(GAME_EVENTS.TOUCH_INPUT, {
      left: this.touchLeft,
      right: this.touchRight,
      up: this.touchUp,
      down: this.touchDown,
      groom: this.touchGroom,
      winch: this.touchWinch,
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer, centerX: number, centerY: number, maxRadius: number, thumbRadius: number): void {
    if (!this.joystickThumb) return;

    // Calculate offset from center
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp thumb position to joystick radius
    const clampedDist = Math.min(distance, maxRadius - thumbRadius);
    const angle = Math.atan2(dy, dx);
    
    const thumbX = centerX + Math.cos(angle) * clampedDist;
    const thumbY = centerY + Math.sin(angle) * clampedDist;
    
    this.joystickThumb.setPosition(thumbX, thumbY);
    
    // Update visual feedback - highlight thumb when active
    this.joystickThumb.setFillStyle(0x6688cc, 0.9);
    
    // Determine direction based on angle and distance
    // Dead zone: 20% of radius
    const deadZone = maxRadius * 0.2;
    
    // Reset all directions
    this.touchUp = false;
    this.touchDown = false;
    this.touchLeft = false;
    this.touchRight = false;
    
    if (distance > deadZone) {
      // Convert angle to 8-direction
      // Angle: 0 = right, PI/2 = down, PI = left, -PI/2 = up
      const deg = angle * 180 / Math.PI;
      
      // 8 directions with 45° sectors
      if (deg > -22.5 && deg <= 22.5) {
        this.touchRight = true;
      } else if (deg > 22.5 && deg <= 67.5) {
        this.touchRight = true;
        this.touchDown = true;
      } else if (deg > 67.5 && deg <= 112.5) {
        this.touchDown = true;
      } else if (deg > 112.5 && deg <= 157.5) {
        this.touchLeft = true;
        this.touchDown = true;
      } else if (deg > 157.5 || deg <= -157.5) {
        this.touchLeft = true;
      } else if (deg > -157.5 && deg <= -112.5) {
        this.touchLeft = true;
        this.touchUp = true;
      } else if (deg > -112.5 && deg <= -67.5) {
        this.touchUp = true;
      } else if (deg > -67.5 && deg <= -22.5) {
        this.touchRight = true;
        this.touchUp = true;
      }
    }
  }

  private resetJoystick(centerX: number, centerY: number): void {
    this.joystickPointer = null;
    
    if (this.joystickThumb) {
      this.joystickThumb.setPosition(centerX, centerY);
      this.joystickThumb.setFillStyle(0x666666, 0.7);
    }
    
    // Reset all directions
    this.touchUp = false;
    this.touchDown = false;
    this.touchLeft = false;
    this.touchRight = false;
  }

  private createTouchButton(
    x: number, y: number, size: number, label: string, alpha: number,
    onDown: () => void, onUp: () => void, color = 0x333333,
    isActionButton = false
  ): void {
    // Lighter color for pressed state
    const pressedColor = Phaser.Display.Color.ValueToColor(color).lighten(40).color;
    
    const bg = this.add.circle(x, y, size / 2, color, alpha)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(2, Math.round(2 * this.uiScale)), Phaser.Display.Color.ValueToColor(color).lighten(30).color, alpha);
    
    if (isActionButton) {
      // Action buttons use manual overlap detection in update() so a single
      // touch overlapping both groom and winch activates both simultaneously
      this.actionButtons.push({
        x, y, radius: size / 2, onDown, onUp, bg, pressedColor, color, alpha, wasPressed: false,
      });
    } else {
      bg.setInteractive()
        .on('pointerdown', () => {
          bg.setFillStyle(pressedColor, alpha + 0.2);
          bg.setScale(1.1);
          onDown();
        })
        .on('pointerup', () => {
          bg.setFillStyle(color, alpha);
          bg.setScale(1);
          onUp();
        })
        .on('pointerout', () => {
          bg.setFillStyle(color, alpha);
          bg.setScale(1);
          onUp();
        })
        .on('pointerover', (pointer: Phaser.Input.Pointer) => {
          if (pointer.isDown) {
            bg.setFillStyle(pressedColor, alpha + 0.2);
            bg.setScale(1.1);
            onDown();
          }
        })
        .on('pointercancel', () => {
          bg.setFillStyle(color, alpha);
          bg.setScale(1);
          onUp();
        });
    }

    // Draw pixel art icon instead of text label
    const icon = this.drawButtonIcon(x, y, size, label);

    // Add to container if it exists
    if (this.touchControlsContainer) {
      const items: Phaser.GameObjects.GameObject[] = [bg];
      if (icon) items.push(icon);
      this.touchControlsContainer.add(items);
    }
  }

  /** Draw a pixel art icon for touch buttons using Phaser Graphics */
  private drawButtonIcon(x: number, y: number, size: number, label: string): Phaser.GameObjects.Graphics | null {
    const g = this.add.graphics().setScrollFactor(0).setAlpha(0.9);
    const px = Math.max(2, Math.round(size * 0.06)); // pixel size
    const cx = x;
    const cy = y;

    if (label === 'GRM') {
      // Tiller/grooming icon: a rake-like pattern (3 teeth + handle)
      const color = 0xddddff;
      g.fillStyle(color);
      // Handle (vertical bar)
      g.fillRect(cx - px * 0.5, cy - px * 3, px, px * 6);
      // Crossbar
      g.fillRect(cx - px * 3, cy + px * 2, px * 6, px);
      // Teeth (3 prongs hanging down)
      for (const offset of [-2, 0, 2]) {
        g.fillRect(cx + offset * px - px * 0.5, cy + px * 3, px, px * 2);
      }
    } else if (label === 'WCH') {
      // Winch/anchor icon: simplified anchor shape
      const color = 0xffddaa;
      g.fillStyle(color);
      // Vertical shaft
      g.fillRect(cx - px * 0.5, cy - px * 3, px, px * 5);
      // Top crossbar (anchor ring)
      g.fillRect(cx - px * 2, cy - px * 3, px * 4, px);
      // Bottom curved arms (simplified as angled lines)
      // Left arm
      g.fillRect(cx - px * 3, cy + px * 1, px, px);
      g.fillRect(cx - px * 2, cy + px * 2, px, px);
      // Right arm
      g.fillRect(cx + px * 2, cy + px * 1, px, px);
      g.fillRect(cx + px * 1, cy + px * 2, px, px);
      // Bottom point
      g.fillRect(cx - px * 0.5, cy + px * 2, px, px * 2);
    } else if (label === 'BRK') {
      // Brake icon: two horizontal lines (stop/brake symbol)
      const color = 0xddddff;
      g.fillStyle(color);
      g.fillRect(cx - px * 3, cy - px * 2, px * 6, px);
      g.fillRect(cx - px * 3, cy + px, px * 6, px);
    } else {
      return null;
    }

    return g;
  }

  private openPauseMenu(): void {
    if (!this.scene.isActive('PauseScene')) {
      this.game.events.emit(GAME_EVENTS.PAUSE_REQUEST);
    }
  }

  private isKeyBoundToGameControl(keyCode: number): boolean {
    try {
      const saved = getString(STORAGE_KEYS.BINDINGS);
      const codes = saved ? Object.values(JSON.parse(saved)) as number[] : [];
      return codes.includes(keyCode);
    } catch { return false; }
  }

  private prevLevel(): void {
    const prevLevel = this.level.id - 1;
    if (prevLevel < 0 || this.isSkipping) return;
    this.isSkipping = true;
    this.game.events.emit(GAME_EVENTS.SKIP_LEVEL, prevLevel);
  }

  private skipLevel(): void {
    const nextLevel = this.level.id + 1;

    if (this.isSkipping) return;
    this.isSkipping = true;

    if (nextLevel < LEVELS.length) {
      this.game.events.emit(GAME_EVENTS.SKIP_LEVEL, nextLevel);
    } else {
      resetGameScenes(this.game, 'CreditsScene');
    }
  }

  private startSkiRun(): void {
    if (this.isSkipping) return;
    this.isSkipping = true;
    this.game.events.emit(GAME_EVENTS.START_SKI_RUN);
  }

  update(): void {
    if (!this.scene.isActive()) return;

    // Ski mode: only emit touch state, no bar updates
    if (this.mode === 'ski') {
      this.emitTouchState();
      return;
    }

    if (!this.fuelBar?.active || !this.fuelText?.active) return;

    const { fuel, stamina, coverage, winchActive } = this.gameState;
    const fuelPercent = fuel / 100;
    const staminaPercent = stamina / 100;

    this.fuelBar.width = this.barWidth * fuelPercent;
    if (this.staminaBar?.active) this.staminaBar.width = this.barWidth * staminaPercent;

    this.fuelText.setText(Math.round(fuel) + '%');
    if (this.staminaText?.active) this.staminaText.setText(Math.round(stamina) + '%');

    this.fuelBar.setFillStyle(fuelPercent > 0.3 ? THEME.colors.dangerHex : 0xff0000);
    if (this.staminaBar?.active) this.staminaBar.setFillStyle(staminaPercent > 0.3 ? THEME.colors.successHex : 0xffaa00);

    // Buff indicator
    if (this.buffIndicator?.active) {
      const { activeBuff, buffTimeRemaining, buffIcon } = this.gameState;
      if (activeBuff && buffTimeRemaining > 0) {
        const secs = Math.ceil(buffTimeRemaining / 1000);
        this.buffIndicator.setText(buffIcon + ' ' + secs + 's');
        // Flash when about to expire
        const shouldFlash = secs <= BALANCE.BUFF_FLASH_THRESHOLD;
        const flashAlpha = Math.sin(Date.now() / BALANCE.BUFF_FLASH_PERIOD) > 0 
          ? BALANCE.BUFF_FLASH_ALPHA_MAX 
          : BALANCE.BUFF_FLASH_ALPHA_MIN;
        this.buffIndicator.setAlpha(shouldFlash ? flashAlpha : 1);
      } else {
        this.buffIndicator.setText('');
        this.buffIndicator.setAlpha(0);
      }
    }

    // Frost indicator
    if (this.frostIndicator?.active) {
      const frost = this.gameState.frostLevel;
      if (frost > 5) {
        const pct = Math.round(frost);
        this.frostIndicator.setText('❄️ ' + pct + '%');
        // Color shifts from white to red at penalty thresholds
        if (pct >= BALANCE.FROST_SPEED_THRESHOLD_2) {
          this.frostIndicator.setColor('#FF4444');
        } else if (pct >= BALANCE.FROST_SPEED_THRESHOLD_1) {
          this.frostIndicator.setColor('#FFAA44');
        } else {
          this.frostIndicator.setColor('#88CCFF');
        }
        this.frostIndicator.setAlpha(1);
      } else {
        this.frostIndicator.setText('');
        this.frostIndicator.setAlpha(0);
      }
    }

    if (this.coverageText?.active) {
      this.coverageText.setText(coverage + '%');
      const targetMet = coverage >= this.level.targetCoverage;
      this.coverageText.setColor(targetMet ? '#00FF00' : '#FFFFFF');
      // Update coverage bar fill
      if (this.coverageBar?.active) {
        this.coverageBar.width = this.covBarWidth * (coverage / 100);
        this.coverageBar.setFillStyle(targetMet ? THEME.colors.successHex : 0xffffff);
      }
    }

    // Show/hide winch status indicator
    if (this.winchStatus?.active) {
      if (winchActive) {
        this.winchStatus.setText('🔗 ' + (t('winchActive') || 'WINCH'));
        this.winchStatus.setVisible(true);
      } else {
        this.winchStatus.setVisible(false);
      }
    }

    // Update bonus objectives display
    this.updateBonusObjectives();

    this.emitTouchState();

    // FPS counter — rolling 30-frame average, updated every ~500ms
    if (this.showFps && this.fpsText?.active) {
      this.fpsFrameTimes.push(this.game.loop.delta);
      if (this.fpsFrameTimes.length > 30) this.fpsFrameTimes.shift();
      this.fpsUpdateTimer += this.game.loop.delta;
      if (this.fpsUpdateTimer >= 500) {
        this.fpsUpdateTimer = 0;
        const avgDelta = this.fpsFrameTimes.reduce((a, b) => a + b, 0) / this.fpsFrameTimes.length;
        const fps = Math.round(1000 / avgDelta);
        const targetFps = this.game.loop.targetFps || 60;
        const simPct = Math.min(100, Math.round((fps / targetFps) * 100));
        const throttleFlag = isRenderThrottled() ? ' ⏬' : '';
        this.fpsText.setText('L' + this.gameState.levelIndex + ' · ' + fps + ' FPS · ' + simPct + '%' + throttleFlag);
      }
    }

    // Gamepad Select/Back button (button 8) for level skip
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        const selectPressed = isGamepadButtonPressed(pad, 8);
        if (selectPressed && !this.gamepadSelectPressed) {
          this.skipLevel();
        }
        this.gamepadSelectPressed = selectPressed;
      }
    }
  }

  private handleGameState(state: GameStateEvent): void {
    this.gameState = state;
  }

  private handleAccessibilityChanged(): void {
    if (!this.scene.isActive()) return;
    this.scene.restart({ level: this.level });
  }

  private getBonusLabel(obj: BonusObjective): string {
    switch (obj.type) {
      case 'fuel_efficiency': return (t('bonusFuel') || 'Fuel') + ' ≤' + obj.target + '%';
      case 'flawless': return t('bonusFlawless') || 'First try';
      case 'speed_run': {
        const m = Math.floor(obj.target / 60);
        const s = obj.target % 60;
        return (t('bonusSpeed') || 'Time') + ' ≤' + m + ':' + s.toString().padStart(2, '0');
      }
      case 'winch_mastery': return (t('bonusWinch') || 'Winch') + ' ×' + obj.target;
      case 'exploration': return (t('bonusExplore') || 'Roads') + ' ×' + obj.target;
      default: return '';
    }
  }

  private updateBonusObjectives(): void {
    if (this.bonusTexts.length === 0) return;
    const s = this.gameState;
    const timeLimit = this.level.timeLimit ?? 0;
    const timeUsed = timeLimit > 0
      ? timeLimit - (this.timerText?.active ? this.parseTimer() : 0)
      : 0;

    this.bonusObjectives.forEach((obj, i) => {
      const txt = this.bonusTexts[i];
      if (!txt?.active) return;

      let met = false;
      let suffix = '';

      switch (obj.type) {
        case 'fuel_efficiency':
          met = s.fuelUsed <= obj.target;
          suffix = ' ' + s.fuelUsed + '%';
          // Fuel can still go down — not irreversibly failed
          break;
        case 'flawless':
          met = s.restartCount === 0;
          // Already determined at level start — can't change mid-level
          if (s.restartCount > 0) this.bonusFailed[i] = true;
          break;
        case 'speed_run':
          met = timeUsed <= obj.target;
          if (timeUsed > obj.target) this.bonusFailed[i] = true;
          break;
        case 'winch_mastery':
          met = s.winchUseCount >= obj.target;
          suffix = ' ' + s.winchUseCount + '/' + obj.target;
          break;
        case 'exploration':
          met = s.pathsVisited >= obj.target;
          suffix = ' ' + s.pathsVisited + '/' + obj.target;
          break;
      }

      const label = '★ ' + this.getBonusLabel(obj);
      const prevText = txt.text;
      if (met) {
        txt.setText(label + ' ✓');
        txt.setColor(THEME.colors.success);
      } else if (this.bonusFailed[i]) {
        txt.setText(label + ' ✗');
        txt.setColor(THEME.colors.danger);
      } else {
        txt.setText(label + suffix);
        txt.setColor('#FFFFFF');
      }
    });
  }

  private parseTimer(): number {
    if (!this.timerText?.active) return 0;
    const text = this.timerText.text;
    const parts = text.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return mins * 60 + secs;
  }

  private updateTimer(seconds: number): void {
    if (!this.timerText || !this.timerText.active) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'));

    if (seconds <= Math.max(10, Math.round(this.level.timeLimit * 0.3))) {
      this.timerText.setStyle({ color: '#FF4444' });
    }
  }

  private resizing = false;
  private resizeManager!: ResizeManager;

  shutdown(): void {
    // Remove global event listeners FIRST to prevent callbacks on destroyed objects
    this.game.events.off(GAME_EVENTS.GAME_STATE, this.handleGameState, this);
    this.game.events.off(GAME_EVENTS.TIMER_UPDATE, this.updateTimer, this);
    this.game.events.off(GAME_EVENTS.ACCESSIBILITY_CHANGED, this.handleAccessibilityChanged, this);

    this.resizeManager?.destroy();
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();
    this.children.removeAll(true);

    this.fuelBar = null;
    this.fuelText = null;
    this.staminaBar = null;
    this.staminaText = null;
    this.buffIndicator = null;
    this.frostIndicator = null;
    this.coverageText = null;
    this.coverageBar = null;
    this.coverageBarBg = null;
    this.winchStatus = null;
    this.bonusTexts = [];
    this.bonusObjectives = [];
    this.bonusFailed = [];

    this.timerText = null;
    this.fpsText = null;
    this.fpsUpdateTimer = 0;
    this.fpsFrameTimes = [];
    this.actionButtons = [];
  }
}
