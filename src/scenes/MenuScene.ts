import Phaser from 'phaser';
import { t, Accessibility, TRANSLATIONS, getLanguage as getCurrentLanguage } from '../setup';
import { getMovementKeysString, getGroomKeyName } from '../utils/keyboardLayout';
import { getSavedProgress, clearProgress } from '../utils/gameProgress';
import { loadGamepadBindings, getButtonName, getConnectedControllerType } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, type MenuButtonNav } from '../utils/menuButtonNav';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch, onTouchAvailable } from '../utils/touchDetect';
import { drawAnimal, drawBirdPerched, drawBirdSideFlying, ANIMAL_GRID } from '../utils/animalSprites';
import { FOX, foxHuntDecision } from '../utils/foxBehavior';
import { drawTrackShape } from '../utils/animalTracks';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { OverlayManager } from '../utils/overlayManager';

/**
 * Les Aiguilles Blanches - Menu Scene
 * Main menu with game start, settings, and controls
 */

export default class MenuScene extends Phaser.Scene {
  private overlay: OverlayManager = null!;
  /** Exposed for E2E test access — delegates to OverlayManager. */
  get overlayOpen(): boolean { return this.overlay?.open ?? false; }
  private snowflakes: { rect: Phaser.GameObjects.Rectangle; speed: number; wobbleOffset: number }[] = [];
  private selectionArrow: Phaser.GameObjects.Text | null = null;
  private snowLineY = 0;
  private snowBottomY = 0;
  private menuAnimals: {
    graphics: Phaser.GameObjects.Graphics;
    x: number; y: number;
    homeX: number; homeY: number;
    vx: number; vy: number;
    wanderTimer: number;
    type: 'ground' | 'bird' | 'climber';
    species?: string;
    boundLeft: number; boundRight: number;
    state?: 'flying' | 'perched' | 'climbing' | 'landing' | 'hiding';
    hideTimer?: number;
    hideDuration?: number;
    burrowY?: number;
    burrowMask?: Phaser.Display.Masks.GeometryMask;
    burrowMaskShape?: Phaser.GameObjects.Graphics;
    spriteH?: number;
    perchTarget?: { x: number; y: number };
    climbPath?: { x: number; y: number }[];
    climbIndex?: number;
    hopPhase?: number;
    trackTimer?: number;
    feetOffsetY?: number;
  }[] = [];
  private inputHintTexts: Phaser.GameObjects.GameObject[] = [];
  private gamepadConnectHandler: (() => void) | null = null;
  private footerGithubRight = 0;
  private footerHintStyle: Phaser.Types.GameObjects.Text.TextStyle = {};
  private footerHintY = 0;
  // Button zone: animals should avoid this area
  private menuZone = { left: 0, right: 0, top: 0, bottom: 0 };
  private perchSpots: { x: number; y: number }[] = [];
  private menuTracks: { graphics: Phaser.GameObjects.Graphics; age: number }[] = [];
  private readonly MENU_TRACK_LIFETIME = 12000;
  private readonly MENU_MAX_TRACKS = 40;
  
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.overlay = new OverlayManager(this);
    this.snowflakes = [];
    this.inputHintTexts = [];
    // Clean up previous gamepad/touch handlers if scene is restarting
    if (this.gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadConnectHandler);
      this.gamepadConnectHandler = null;
    }
    const { width, height } = this.cameras.main;

    // Calculate scale factor for responsive text
    const baseHeight = 768;
    const baseWidth = 1024;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    const scaleByHeight = Math.max(0.7, Math.min(height / baseHeight, 1.5));
    const scaleByWidth = Math.max(0.5, Math.min(width / baseWidth, 1.5));
    const dprBoost = Math.sqrt(dpr);
    const scaleFactor = Math.min(scaleByHeight, scaleByWidth) * dprBoost;

    // Aspect-ratio-aware layout
    const aspect = width / height;
    const isPortrait = aspect < 0.9;
    
    const titleSize = Math.max(20, Math.round(40 * scaleFactor));
    const subtitleSize = isPortrait
      ? Math.max(14, Math.round(20 * scaleFactor))
      : Math.max(12, Math.round(16 * scaleFactor));
    const buttonSize = Math.max(12, Math.round(18 * scaleFactor));
    const minTouchTarget = 44;
    const basePadding = isPortrait ? 8 : 12;
    const buttonPadding = Math.max(Math.round(basePadding * scaleFactor), Math.ceil((minTouchTarget - buttonSize) / 2));

    const snowLinePct = isPortrait ? 0.82 : 0.78;
    const snowLineY = height * snowLinePct;
    this.snowLineY = snowLineY;
    const footerHeight = Math.round(36 * scaleFactor);
    const safeAreaBottom = isPortrait ? Math.round(20 * scaleFactor) : 0;

    this.createSkyAndGround(width, height, snowLineY, footerHeight, scaleFactor, safeAreaBottom);
    const subtitleBottom = this.createTitle(width, height, snowLineY, scaleFactor, isPortrait, titleSize, subtitleSize);
    this.createMenuButtons(width, height, snowLineY, scaleFactor, isPortrait, buttonSize, buttonPadding, footerHeight, safeAreaBottom, subtitleBottom);
    this.createFooter(width, height, scaleFactor, footerHeight, safeAreaBottom);
    this.setupInput();

    Accessibility.announce((t('subtitle') || '') + ' - ' + (t('startGame') || ''));
  }

  private createSkyAndGround(width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, safeAreaBottom: number): void {
    createMenuTerrain(this, width, height, snowLineY, footerHeight, scaleFactor);
    this.createMenuWildlife(width, height, snowLineY, footerHeight + safeAreaBottom, scaleFactor);
    this.createSnowParticles(width, snowLineY);
  }

  /** Returns the Y coordinate of the subtitle ribbon bottom edge. */
  private createTitle(width: number, height: number, snowLineY: number, scaleFactor: number, isPortrait: boolean, titleSize: number, subtitleSize: number): number {
    const titleY = isPortrait ? height * 0.08 : height * 0.12;
    const titleBgWidth = Math.round(Math.min(520 * scaleFactor, width - 20));
    const titleBgHeight = Math.round(80 * scaleFactor);
    this.add.rectangle(width / 2, titleY, titleBgWidth + 8, titleBgHeight + 8, 0x2d2822, 0.45).setOrigin(0.5).setDepth(10);
    this.add.rectangle(width / 2, titleY, titleBgWidth, titleBgHeight, 0x1a2a3e, 0.4).setOrigin(0.5).setDepth(10);
    const tbg = this.add.graphics().setDepth(10);
    tbg.lineStyle(2, 0x87ceeb, 0.5);
    tbg.strokeRect(width / 2 - titleBgWidth / 2, titleY - titleBgHeight / 2, titleBgWidth, titleBgHeight);
    this.add.text(width / 2 + 3, titleY + 3, 'Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#2d2822',
    }).setOrigin(0.5).setDepth(10);
    this.add.text(width / 2, titleY, 'Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);

    const subtitleText = t('subtitle') || 'Snow Groomer Simulation';
    const subtitleY = titleY + titleBgHeight / 2 + Math.round(12 * scaleFactor);
    const subtitleMeasure = this.add.text(0, -100, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
    });
    const stw = subtitleMeasure.width;
    subtitleMeasure.destroy();
    const ribbonH = Math.round(subtitleSize * 1.8);
    const ribbonW = stw + Math.round(40 * scaleFactor);
    const ribbonTabW = Math.round(14 * scaleFactor);
    const notchH = Math.round(ribbonH * 0.2);
    const foldW = Math.round(4 * scaleFactor);
    const stripe = Math.round(3 * scaleFactor);
    const ribbonG = this.add.graphics().setDepth(10);
    const cx = width / 2;
    const rTop = subtitleY - ribbonH / 2;
    const rBot = subtitleY + ribbonH / 2;
    const tabInset = Math.round(ribbonH * 0.12);
    ribbonG.fillStyle(0x8b1a1a, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - ribbonTabW, rTop + tabInset, ribbonTabW, ribbonH - tabInset * 2);
    ribbonG.fillRect(cx + ribbonW / 2, rTop + tabInset, ribbonTabW, ribbonH - tabInset * 2);
    ribbonG.fillStyle(0x87ceeb, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - ribbonTabW, subtitleY - notchH / 2, foldW, notchH);
    ribbonG.fillRect(cx + ribbonW / 2 + ribbonTabW - foldW, subtitleY - notchH / 2, foldW, notchH);
    ribbonG.fillStyle(0x550000, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - foldW, rTop + tabInset, foldW, ribbonH - tabInset * 2);
    ribbonG.fillRect(cx + ribbonW / 2, rTop + tabInset, foldW, ribbonH - tabInset * 2);
    ribbonG.fillStyle(0x000000, 0.15);
    ribbonG.fillRect(cx - ribbonW / 2 + 3, rBot + 1, ribbonW, Math.round(3 * scaleFactor));
    ribbonG.fillStyle(0xcc2200, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rTop, ribbonW, ribbonH);
    ribbonG.fillStyle(0xe63e1a, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rTop, ribbonW, stripe);
    ribbonG.fillStyle(0x991a00, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rBot - stripe, ribbonW, stripe);
    ribbonG.fillStyle(0xFFD700, 0.35);
    ribbonG.fillRect(cx - ribbonW / 2 + stripe, rTop + stripe + 1, ribbonW - stripe * 2, 1);
    ribbonG.fillRect(cx - ribbonW / 2 + stripe, rBot - stripe - 2, ribbonW - stripe * 2, 1);
    this.add.text(cx + 2, subtitleY + 2, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
      color: '#660000',
    }).setOrigin(0.5).setDepth(10);
    this.add.text(cx, subtitleY, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
      color: '#FFD700',
    }).setOrigin(0.5).setDepth(10);

    return subtitleY + ribbonH / 2;
  }

  private createMenuButtons(width: number, height: number, snowLineY: number, scaleFactor: number, isPortrait: boolean, buttonSize: number, buttonPadding: number, footerHeight: number, safeAreaBottom: number, subtitleBottom: number): void {
    const savedProgress = getSavedProgress();
    const hasProgress = savedProgress !== null && savedProgress.currentLevel > 0;

    const buttonDefs: Array<{ text: string; callback: () => void; primary: boolean }> = [];
    if (hasProgress) {
      buttonDefs.push({ text: 'resumeGame', callback: () => this.startGame(savedProgress.currentLevel), primary: true });
      buttonDefs.push({ text: 'newGame', callback: () => this.confirmNewGame(), primary: false });
    } else {
      buttonDefs.push({ text: 'startGame', callback: () => this.startGame(0), primary: true });
    }
    buttonDefs.push({ text: 'howToPlay', callback: () => this.showHowToPlay(), primary: false });
    buttonDefs.push({ text: 'changelog', callback: () => this.showChangelog(), primary: false });
    buttonDefs.push({ text: 'settings', callback: () => this.showSettings(), primary: false });
    if (document.fullscreenEnabled) {
      const isFullscreen = !!document.fullscreenElement;
      buttonDefs.push({ 
        text: isFullscreen ? 'exitFullscreen' : 'fullscreen', 
        callback: () => this.toggleFullscreen(), 
        primary: false 
      });
    }

    const menuStartY = subtitleBottom + 15 * scaleFactor;
    const menuEndY = Math.min(snowLineY, height - footerHeight - safeAreaBottom) - 10 * scaleFactor;
    const menuAvailableH = menuEndY - menuStartY;
    const minButtonHeight = buttonSize + buttonPadding * 2;
    const minSpacing = minButtonHeight + (isPortrait ? 4 : 10);
    if (buttonDefs.length * minSpacing > menuAvailableH) {
      const fsIdx = buttonDefs.findIndex(b => b.text === 'fullscreen' || b.text === 'exitFullscreen');
      if (fsIdx !== -1) buttonDefs.splice(fsIdx, 1);
    }
    const buttonSpacing = Math.max(minSpacing, Math.min(Math.round(46 * scaleFactor), Math.round(menuAvailableH / (buttonDefs.length + 0.5))));
    const menuY = menuStartY + buttonSpacing * 0.5;

    this.menuButtons = [];
    this.buttonShadows = [];
    this.buttonCallbacks = [];

    const arrowSize = Math.round(22 * scaleFactor);
    this.selectionArrow = this.add.text(0, 0, '▶', {
      fontFamily: THEME.fonts.family,
      fontSize: arrowSize + 'px',
      color: '#FFD700',
      stroke: '#2d2822',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    buttonDefs.forEach((btn, i) => {
      const btnText = t(btn.text) || btn.text;
      const yPos = menuY + i * buttonSpacing;
      const shadowOffset = Math.round(4 * scaleFactor);
      const bgColor = btn.primary ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
      const shadowColor = btn.primary ? '#115511' : '#1a3a5c';

      const shadow = this.add.text(width / 2 + shadowOffset, yPos + shadowOffset, btnText, {
        fontFamily: THEME.fonts.family,
        fontSize: buttonSize + 'px',
        color: '#ffffff',
        backgroundColor: shadowColor,
        padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
      }).setOrigin(0.5).setAlpha(0.6).setDepth(10);

      const button = this.add.text(width / 2, yPos, btnText, {
        fontFamily: THEME.fonts.family,
        fontSize: buttonSize + 'px',
        color: '#ffffff',
        backgroundColor: bgColor,
        padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
      })
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.buttonNav.select(i);
        })
        .on('pointerout', () => {
          this.buttonNav.refreshStyles();
        })
        .on('pointerup', () => {
          btn.callback();
        });
      
      this.menuButtons.push(button);
      this.buttonShadows.push(shadow);
      this.buttonCallbacks.push(btn.callback);
    });

    const shadows = this.buttonShadows;
    const arrow = this.selectionArrow;
    this.buttonNav = createMenuButtonNav(
      this.menuButtons, this.buttonCallbacks,
      (buttons, selectedIndex) => {
        buttons.forEach((btn, i) => {
          const isCTA = btn.style.backgroundColor === THEME.colors.buttonCTAHex || btn.style.backgroundColor === THEME.colors.buttonCTAHoverHex;
          if (i === selectedIndex) {
            btn.setStyle({ backgroundColor: isCTA ? THEME.colors.buttonCTAHoverHex : THEME.colors.buttonHoverHex });
            if (shadows[i]) shadows[i].setVisible(false);
            if (arrow) {
              arrow.setPosition(btn.x - btn.width / 2 - 20, btn.y);
              arrow.setVisible(true);
            }
          } else {
            btn.setStyle({ backgroundColor: isCTA ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex });
            if (shadows[i]) shadows[i].setVisible(true);
          }
          btn.setScale(1);
        });
      },
      { canNavigate: () => !this.overlay.open },
    );
    this.buttonNav.refreshStyles();

    if (this.menuButtons.length > 0) {
      const firstBtn = this.menuButtons[0];
      const lastBtn = this.menuButtons[this.menuButtons.length - 1];
      const btnHalfW = firstBtn.width / 2 + 30;
      this.menuZone = {
        left: width / 2 - btnHalfW,
        right: width / 2 + btnHalfW,
        top: firstBtn.y - firstBtn.height / 2 - 20,
        bottom: lastBtn.y + lastBtn.height / 2 + 20,
      };
    }
  }

  private createFooter(width: number, height: number, scaleFactor: number, footerHeight: number, safeAreaBottom: number): void {
    const footerTop = height - footerHeight - safeAreaBottom;
    this.add.rectangle(width / 2, footerTop, width, footerHeight + safeAreaBottom, THEME.colors.dialogBg).setOrigin(0.5, 0).setDepth(10);
    this.add.rectangle(width / 2, footerTop, width, 2, THEME.colors.border).setOrigin(0.5, 0).setDepth(10);
    
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
    const footerFontSize = Math.round(Math.max(11, 13 * scaleFactor));
    const githubLink = this.add.text(width / 2, footerTop + footerHeight / 2 - Math.round(7 * scaleFactor), `GitHub  ·  v${version}`, {
      fontFamily: THEME.fonts.family,
      fontSize: footerFontSize + 'px',
      color: THEME.colors.info,
    }).setOrigin(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => githubLink.setColor(THEME.colors.accent))
      .on('pointerout', () => githubLink.setColor(THEME.colors.info))
      .on('pointerdown', () => {
        window.open('https://github.com/antoinecellerier/les-aiguilles-blanches', '_blank', 'noopener,noreferrer');
      });

    if (import.meta.env.DEV) {
      fetch('/api/version')
        .then(r => r.json())
        .then(data => {
          if (data.version && githubLink.active) {
            githubLink.setText(`GitHub  ·  v${data.version}`);
          }
        })
        .catch(() => { /* Dev-only version fetch — ignore network errors */ });
    }

    this.add.text(width / 2, footerTop + footerHeight / 2 + Math.round(7 * scaleFactor), t('madeIn'), {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(Math.max(10, 12 * scaleFactor)) + 'px',
      color: THEME.colors.accent,
    }).setOrigin(0.5).setDepth(10);

    this.footerGithubRight = githubLink.x + githubLink.width / 2;
    this.footerHintY = footerTop + footerHeight / 2;
    this.footerHintStyle = {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(Math.max(11, 13 * scaleFactor)) + 'px',
      color: THEME.colors.info,
    };
    this.updateInputHints();
  }

  private setupInput(): void {
    this.gamepadConnectHandler = () => this.updateInputHints();
    window.addEventListener('gamepadconnected', this.gamepadConnectHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadConnectHandler);

    onTouchAvailable(() => {
      if (this.scene.isActive()) this.updateInputHints();
    });

    this.input.keyboard?.on('keydown-UP', () => this.buttonNav.navigate(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.buttonNav.navigate(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.buttonNav.activate());
    this.input.keyboard?.on('keydown-SPACE', () => this.buttonNav.activate());

    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => {
        if (this.overlay.open) { this.overlay.close(); return; }
        this.buttonNav.activate();
      },
      onBack: () => { if (this.overlay.open) this.overlay.close(); },
    });
    this.gamepadNav.initState();

    this.scale.on('resize', this.handleResize, this);
  }

  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonShadows: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonNav!: MenuButtonNav;
  private gamepadNav!: GamepadMenuNav;

  /** Expose for tests */
  get selectedIndex(): number { return this.buttonNav?.selectedIndex ?? 0; }

  private updateInputHints(): void {
    // Destroy previous hint objects
    this.inputHintTexts.forEach(t => { if (t.active) t.destroy(); });
    this.inputHintTexts = [];

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const hasTouch = detectTouch();
    const hasGamepad = navigator.getGamepads && Array.from(navigator.getGamepads()).some(g => g !== null);

    // Define all hints: [icon, label, isAvailable] — always show all three
    const allHints: [string, string, boolean][] = [
      ['💻', 'Keyboard', !isMobile],
      ['✋', 'Touch', hasTouch],
      ['🎮', 'Gamepad', hasGamepad],
    ];

    const width = this.scale.width;
    const scaleFactor = Math.min(width / 960, 1);
    const rightMargin = Math.round(12 * scaleFactor);
    const gap = Math.round(12 * scaleFactor);
    const activeAlpha = 0.6;
    const inactiveAlpha = 0.2;

    // Build full labels first to check if they fit
    const fullLabels = allHints.map(([icon, label]) => `${icon} ${label}`);
    // Measure total width with full labels
    const measureText = this.add.text(0, 0, fullLabels.join('   '), this.footerHintStyle).setVisible(false);
    const totalWidth = measureText.width;
    measureText.destroy();

    const hintsLeftEdge = width - rightMargin - totalWidth;
    const useCompact = hintsLeftEdge < this.footerGithubRight + 16;
    
    // Place hints right-to-left
    let cursorX = width - rightMargin;
    for (let i = allHints.length - 1; i >= 0; i--) {
      const [icon, label, available] = allHints[i];
      const text = useCompact ? icon : `${icon} ${label}`;
      const hint = this.add.text(cursorX, this.footerHintY, text, this.footerHintStyle)
        .setOrigin(1, 0.5)
        .setAlpha(available ? activeAlpha : inactiveAlpha)
        .setDepth(10);
      this.inputHintTexts.push(hint);
      // Forbidden sign overlay centered on the icon
      if (!available) {
        // Measure just the icon to find its center
        const iconMeasure = this.add.text(0, 0, icon, this.footerHintStyle).setVisible(false);
        const iconWidth = iconMeasure.width;
        iconMeasure.destroy();
        const r = Math.round(hint.height * 0.7);
        // Icon is at the left edge of the hint text
        const cx = cursorX - hint.width + iconWidth / 2;
        const cy = this.footerHintY;
        const gfx = this.add.graphics().setDepth(10);
        gfx.lineStyle(1.5, 0xcc2200, 0.6);
        gfx.strokeCircle(cx, cy, r);
        const dx = r * Math.cos(Math.PI / 4);
        const dy = r * Math.sin(Math.PI / 4);
        gfx.lineBetween(cx + dx, cy - dy, cx - dx, cy + dy);
        this.inputHintTexts.push(gfx);
      }
      cursorX -= hint.width + gap;
    }
  }

  update(time: number, delta: number): void {
    this.updateSnowflakes(time, delta);
    this.updateWildlife(time, delta);
    this.updateTracks(delta);
    this.gamepadNav.update(delta);
  }

  private updateSnowflakes(time: number, delta: number): void {
    for (const flake of this.snowflakes) {
      flake.rect.y += flake.speed * (delta / 16);
      flake.rect.x += Math.sin(time / 1000 + flake.wobbleOffset) * 0.3;
      if (flake.rect.y > this.snowLineY) {
        flake.rect.y = -4;
        flake.rect.x = Phaser.Math.Between(0, this.cameras.main.width);
      }
    }
  }

  private updateWildlife(time: number, delta: number): void {
    const dt = delta / 1000;
    const width = this.cameras.main.width;
    const pointer = this.input.activePointer;
    for (const a of this.menuAnimals) {
      const pdx = a.x - pointer.worldX;
      const pdy = a.y - pointer.worldY;
      const pointerDist = Math.sqrt(pdx * pdx + pdy * pdy);
      const fleeRadius = a.type === 'bird' ? 50 : 60;

      if (a.type === 'bird') {
        this.updateBird(a, time, delta, dt, width, pointerDist, pdx, pdy, fleeRadius);
      } else if (a.type === 'climber') {
        this.updateClimber(a, time, delta, dt, pointerDist, fleeRadius);
      } else {
        this.updateGroundAnimal(a, time, delta, dt, width, pointerDist, pdx, pdy, fleeRadius);
      }
    }
  }

  private updateBird(a: typeof this.menuAnimals[0], time: number, delta: number, dt: number, width: number, pointerDist: number, pdx: number, pdy: number, fleeRadius: number): void {
    // Pointer scares birds — set flee velocity, transition perched→flying
    if (pointerDist < fleeRadius) {
      const fleeAngle = Math.atan2(pdy, pdx);
      if (a.state === 'perched' || a.state === 'landing') {
        a.state = 'flying';
        a.graphics.clear();
        drawBirdSideFlying(a.graphics, 0, 0, a.spriteH || 2);
      }
      a.vx = Math.cos(fleeAngle) * 60;
      a.vy = Math.sin(fleeAngle) * 30 - 10;
      if (a.vx > 0.5) a.graphics.setScale(1, 1);
      else if (a.vx < -0.5) a.graphics.setScale(-1, 1);
      a.wanderTimer = 2000 + Math.random() * 3000;
    }

    if (a.state === 'perched') {
      // Perched: sit still with tiny bob, take off after timer
      a.wanderTimer -= delta;
      const bob = Math.sin(time / 400 + a.homeX) * 0.3;
      a.graphics.setPosition(a.x, a.y + bob);
      a.graphics.setRotation(0);
      if (a.wanderTimer <= 0) {
        a.state = 'flying';
        a.graphics.clear();
        drawBirdSideFlying(a.graphics, 0, 0, a.spriteH || 2);
        const takeoffAngle = (Math.random() - 0.5) * Math.PI * 0.8;
        const takeoffSpeed = 8 + Math.random() * 6;
        a.vx = Math.cos(takeoffAngle) * takeoffSpeed;
        a.vy = -2 - Math.random() * 3;
        if (a.vx > 0.5) a.graphics.setScale(1, 1);
        else if (a.vx < -0.5) a.graphics.setScale(-1, 1);
        a.wanderTimer = 2000 + Math.random() * 3000;
      }
    } else if (a.state === 'landing' && a.perchTarget) {
      // Glide toward perch target
      const ldx = a.perchTarget.x - a.x;
      const ldy = (a.perchTarget.y - 4) - a.y;
      const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
      if (ldist < 4) {
        a.x = a.perchTarget.x;
        a.y = a.perchTarget.y - 4;
        a.state = 'perched';
        a.vx = 0; a.vy = 0;
        a.graphics.setRotation(0);
        a.graphics.setScale(1, 1);
        a.graphics.clear();
        drawBirdPerched(a.graphics, 0, 0, a.spriteH || 2);
        a.wanderTimer = 3000 + Math.random() * 5000;
      } else {
        a.vx += (ldx / ldist * 50 - a.vx) * dt * 2;
        a.vy += (ldy / ldist * 50 - a.vy) * dt * 2;
        if (a.vx > 0.5) a.graphics.setScale(1, 1);
        else if (a.vx < -0.5) a.graphics.setScale(-1, 1);
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.wanderTimer -= delta;
        if (a.wanderTimer <= 0) {
          a.state = 'flying';
          a.vx = 8; a.vy = -2;
          a.graphics.setScale(1, 1);
          a.wanderTimer = 3000 + Math.random() * 3000;
        }
      }
      a.graphics.setPosition(a.x, a.y);
    } else {
      // Flying: alpine chough soaring
      a.wanderTimer -= delta;
      if (a.wanderTimer <= 0) {
        if (Math.random() < 0.4 && this.perchSpots.length > 0) {
          let bestPerch: { x: number; y: number } | null = null;
          let bestDist = 150;
          for (const p of this.perchSpots) {
            if (p.x > this.menuZone.left && p.x < this.menuZone.right &&
                p.y > this.menuZone.top && p.y < this.menuZone.bottom) continue;
            const bdx = p.x - a.x;
            const bdy = (p.y - 4) - a.y;
            const bd = Math.sqrt(bdx * bdx + bdy * bdy);
            if (bd < bestDist) { bestDist = bd; bestPerch = p; }
          }
          if (bestPerch) {
            a.state = 'landing';
            a.perchTarget = bestPerch;
            const ldx2 = bestPerch.x - a.x;
            const ldy2 = (bestPerch.y - 4) - a.y;
            const ldist2 = Math.sqrt(ldx2 * ldx2 + ldy2 * ldy2);
            a.vx = (ldx2 / ldist2) * 40;
            a.vy = (ldy2 / ldist2) * 40;
            a.wanderTimer = 5000;
          }
        }
        if (a.state !== 'landing') {
          const prevAngle = Math.atan2(a.vy, a.vx || 1);
          const turnRate = (Math.random() - 0.5) * 0.6;
          const newAngle = prevAngle + turnRate;
          const speed = 6 + Math.random() * 10;
          a.vx = Math.cos(newAngle) * speed;
          a.vy = Math.sin(newAngle) * speed * 0.6;
          a.wanderTimer = 1500 + Math.random() * 2500;
        }
      }
      if (a.state === 'flying') {
        const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        if (speed < 5) {
          const boost = 8 / Math.max(speed, 0.1);
          a.vx *= boost;
          a.vy *= boost;
        }
        const turnRate = Math.sin(time / 3000 + a.homeX * 0.2) * 0.4;
        const heading = Math.atan2(a.vy, a.vx);
        const newHeading = heading + turnRate * dt;
        const curSpeed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        a.vx = Math.cos(newHeading) * curSpeed;
        a.vy = Math.sin(newHeading) * curSpeed;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.vx > 0.5) a.graphics.setScale(1, 1);
        else if (a.vx < -0.5) a.graphics.setScale(-1, 1);
        const skyMin = this.snowLineY * 0.08;
        const skyMax = this.snowLineY * 0.55;
        if (a.y < skyMin) a.vy += 20 * dt;
        else if (a.y > skyMax) a.vy -= 30 * dt;
        if (a.x > width + 30) { a.x = -30; }
        else if (a.x < -30) { a.x = width + 30; }
      }
      a.graphics.setPosition(a.x, a.y);
    }
  }

  private updateClimber(a: typeof this.menuAnimals[0], time: number, delta: number, dt: number, pointerDist: number, fleeRadius: number): void {
    // Bouquetin climbing mountain: deliberate hop pattern
    if (pointerDist < fleeRadius && a.climbPath && a.climbIndex !== undefined) {
      a.climbIndex = (a.climbIndex + 1) % a.climbPath.length;
      a.wanderTimer = 0;
    }
    if (a.climbPath && a.climbIndex !== undefined) {
      const target = a.climbPath[a.climbIndex];
      const cdx = target.x - a.x;
      const cdy = target.y - a.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      const scared = pointerDist < 100;

      if (cdist < 3) {
        // At waypoint: stand still, slight head bob
        a.wanderTimer -= delta;
        a.hopPhase = 0;
        const graze = Math.sin(time / 400 + a.homeX) * 0.3;
        a.graphics.setPosition(a.x, a.y + graze);
        a.graphics.setDepth(1 + a.y * 0.001);
        if (a.wanderTimer <= 0) {
          a.climbIndex = (a.climbIndex + 1) % a.climbPath.length;
          a.wanderTimer = scared ? 200 : (800 + Math.random() * 2000);
          const next = a.climbPath[a.climbIndex];
          if (next.x > a.x) a.graphics.setScale(1, 1);
          else if (next.x < a.x) a.graphics.setScale(-1, 1);
        }
      } else {
        // Hop toward waypoint: fast burst with vertical arc
        const hopSpeed = scared ? 55 : 30;
        a.hopPhase = (a.hopPhase || 0) + dt * 6;
        const hopArc = -Math.abs(Math.sin(a.hopPhase)) * 4;
        a.x += (cdx / cdist) * hopSpeed * dt;
        a.y += (cdy / cdist) * hopSpeed * dt;
        if (a.y > this.snowLineY - 2) a.y = this.snowLineY - 2;
        a.graphics.setPosition(a.x, a.y + hopArc);
        a.graphics.setDepth(1 + a.y * 0.001);
      }
    }
  }

  private updateGroundAnimal(a: typeof this.menuAnimals[0], time: number, delta: number, dt: number, width: number, pointerDist: number, pdx: number, pdy: number, fleeRadius: number): void {
    // Marmots: dive into burrow when scared — slide down behind mask
    if (a.species === 'marmot' && a.state === 'hiding') {
      a.hideTimer = (a.hideTimer || 0) - delta;
      const sH = a.spriteH || 16;
      const dur = a.hideDuration || 3000;
      const progress = Math.min(1, Math.max(0, 1 - (a.hideTimer || 0) / dur));
      if (progress < 0.2) {
        const t = progress / 0.2;
        a.graphics.setPosition(a.x, a.homeY + t * sH);
      } else if (progress > 0.8) {
        const t = (progress - 0.8) / 0.2;
        a.graphics.setPosition(a.x, a.homeY + (1 - t) * sH);
      } else {
        a.graphics.setPosition(a.x, a.homeY + sH);
      }
      if ((a.hideTimer || 0) <= 0) {
        a.state = undefined;
        a.graphics.setPosition(a.x, a.y);
        a.wanderTimer = 1000 + Math.random() * 2000;
      }
      return; // skip normal updates while hiding
    } else if (pointerDist < fleeRadius) {
      const fleeAngle = Math.atan2(pdy, pdx);
      if (a.species === 'bunny') {
        a.vx = Math.cos(fleeAngle) * 120;
        a.vy = Math.sin(fleeAngle) * 50;
        a.wanderTimer = 300;
      } else if (a.species === 'chamois') {
        a.vx = Math.cos(fleeAngle) * 100;
        a.vy = Math.sin(fleeAngle) * 20;
        a.wanderTimer = 600;
      } else if (a.species === 'marmot') {
        a.vx = 0; a.vy = 0;
        a.state = 'hiding';
        a.hideDuration = 3000 + Math.random() * 2000;
        a.hideTimer = a.hideDuration;
      } else if (a.species === 'fox') {
        a.vx = Math.cos(fleeAngle) * 90;
        a.vy = Math.sin(fleeAngle) * 25;
        a.wanderTimer = 500;
      }
      if (a.vx > 0) a.graphics.setScale(1, 1);
      else a.graphics.setScale(-1, 1);
    } else {
      a.wanderTimer -= delta;
    }

    if (a.wanderTimer <= 0) {
      this.wanderDecision(a);
    }

    // Physics: position, boundary, depth
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const sw = this.scale.width;
    if (a.species === 'marmot') {
      if (a.x < a.boundLeft || a.x > a.boundRight) {
        a.vx = -a.vx;
        a.x = Phaser.Math.Clamp(a.x, a.boundLeft, a.boundRight);
      }
    } else {
      if (a.x < -20) { a.x = sw + 18; a.homeX = a.x; }
      else if (a.x > sw + 20) { a.x = -18; a.homeX = a.x; }
    }
    if (a.y < this.snowLineY + 5) { a.y = this.snowLineY + 5; a.vy = Math.abs(a.vy) * 0.5; }
    if (a.y > this.snowBottomY) { a.y = this.snowBottomY; a.vy = -Math.abs(a.vy) * 0.5; }
    const homePull = a.species === 'marmot' ? 0.5 : 0.08;
    if (Math.abs(a.y - a.homeY) > 30) a.vy += (a.homeY - a.y) * homePull * dt;
    if (a.vx > 0.5) a.graphics.setScale(1, 1);
    else if (a.vx < -0.5) a.graphics.setScale(-1, 1);
    a.graphics.setDepth(5 + (a.y + (a.feetOffsetY || 0)) * 0.001);

    // Update burrow mask to follow marmot position
    if (a.burrowMaskShape) {
      a.burrowMaskShape.clear();
      a.burrowMaskShape.fillStyle(0xffffff);
      a.burrowMaskShape.fillRect(a.x - 30, a.y - 100, 60, 100 + (a.spriteH || 16) / 2 + 1);
      a.burrowY = a.y;
    }

    // Soft repulsion: nudge apart from nearby same-species animals
    const minDist = 12;
    for (const b of this.menuAnimals) {
      if (b === a || b.type !== 'ground' || b.species !== a.species) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist > 0.1) {
        const push = (minDist - dist) * 0.3;
        a.x += (dx / dist) * push;
        a.y += (dy / dist) * push * 0.3;
      }
    }

    // Species-specific idle animation
    this.animateGroundAnimal(a, time, dt);

    // Fox scares nearby ground animals
    if (a.species === 'fox') {
      for (const prey of this.menuAnimals) {
        if (prey === a || prey.type !== 'ground' || prey.species === 'fox') continue;
        if (prey.state === 'hiding') continue;
        const fdx = prey.x - a.x;
        const fdy = prey.y - a.y;
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fdist < FOX.SCARE_RADIUS) {
          if (prey.species === 'marmot') {
            prey.vx = 0; prey.vy = 0;
            prey.state = 'hiding';
            prey.hideDuration = 4000 + Math.random() * 2000;
            prey.hideTimer = prey.hideDuration;
          } else {
            const fleeAngle = Math.atan2(fdy, fdx);
            prey.vx = Math.cos(fleeAngle) * 140;
            prey.vy = Math.sin(fleeAngle) * 40;
            prey.wanderTimer = 600;
          }
        }
      }
    }

    // Leave tracks on snow when moving
    if (Math.abs(a.vx) > 1 || Math.abs(a.vy) > 1) {
      a.trackTimer = (a.trackTimer || 0) - delta;
      if (a.trackTimer <= 0) {
        this.placeMenuTrack(a.x, a.y, a.species || 'marmot', a.vx, a.vy);
        a.trackTimer = 400;
      }
    }
  }

  private animateGroundAnimal(a: typeof this.menuAnimals[0], time: number, dt: number): void {
    if (a.species === 'bunny') {
      if (Math.abs(a.vx) > 5) {
        a.hopPhase = (a.hopPhase || 0) + dt * 10;
        const hop = -Math.abs(Math.sin(a.hopPhase)) * 3;
        a.graphics.setPosition(a.x, a.y + hop);
      } else {
        const twitch = Math.sin(time / 200 + a.homeX) * 0.3;
        a.graphics.setPosition(a.x, a.y + twitch);
      }
    } else if (a.species === 'chamois') {
      if (Math.abs(a.vx) > 3) {
        const stride = Math.sin(time / 250 + a.homeX) * 0.8;
        a.graphics.setPosition(a.x, a.y + stride);
      } else {
        const alert = Math.sin(time / 800 + a.homeX) * 0.4;
        a.graphics.setPosition(a.x, a.y + alert);
      }
    } else if (a.species === 'fox') {
      if (Math.abs(a.vx) > FOX.LUNGE_ANIM_THRESHOLD) {
        const leap = -Math.abs(Math.sin(time / 100 + a.homeX)) * 3;
        a.graphics.setPosition(a.x, a.y + leap);
      } else if (Math.abs(a.vx) > 3) {
        const trot = Math.sin(time / 200 + a.homeX) * 0.5;
        a.graphics.setPosition(a.x, a.y + trot);
      } else {
        const sniff = Math.sin(time / 400 + a.homeX) * 0.6;
        a.graphics.setPosition(a.x + sniff * 0.4, a.y);
      }
    } else {
      if (Math.abs(a.vx) > 2) {
        const waddle = Math.sin(time / 150 + a.homeX) * 0.6;
        a.graphics.setPosition(a.x + waddle * 0.3, a.y);
      } else {
        const sentinel = Math.sin(time / 600 + a.homeX) * 0.5;
        a.graphics.setPosition(a.x, a.y + sentinel);
      }
    }
  }

  private wanderDecision(a: typeof this.menuAnimals[0]): void {
    if (a.species === 'bunny') {
      if (Math.random() < 0.65) {
        const prevAngle = Math.atan2(a.vy || 0.1, a.vx || (Math.random() - 0.5));
        const newAngle = prevAngle + (Math.random() - 0.5) * 1.2;
        const speed = 40 + Math.random() * 70;
        a.vx = Math.cos(newAngle) * speed;
        a.vy = Math.sin(newAngle) * speed * 0.3;
        a.wanderTimer = 400 + Math.random() * 600;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 200 + Math.random() * 500;
      }
    } else if (a.species === 'chamois') {
      if (Math.random() < 0.1) {
        const newHomeX = 50 + Math.random() * (this.scale.width - 100);
        const newHomeY = this.snowLineY + 10 + Math.random() * (this.snowBottomY - this.snowLineY - 20);
        for (const c of this.menuAnimals) {
          if (c.species !== 'chamois') continue;
          c.homeX = newHomeX + (Math.random() - 0.5) * 40;
          c.homeY = newHomeY + (Math.random() - 0.5) * 20;
        }
        const angle = Math.atan2(newHomeY - a.y, newHomeX - a.x);
        a.vx = Math.cos(angle) * 45;
        a.vy = Math.sin(angle) * 15;
        a.wanderTimer = 1500 + Math.random() * 1500;
      } else if (Math.random() < 0.45) {
        a.vx = (Math.random() - 0.5) * 35;
        a.vy = (Math.random() - 0.5) * 8;
        a.wanderTimer = 1000 + Math.random() * 2000;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 1500 + Math.random() * 3000;
      }
    } else if (a.species === 'fox') {
      let nearestDist = Infinity;
      let huntAngle = 0;
      for (const prey of this.menuAnimals) {
        if (prey === a || prey.type !== 'ground' || prey.species === 'fox') continue;
        if (prey.state === 'hiding') continue;
        const d = Math.sqrt((prey.x - a.x) ** 2 + (prey.y - a.y) ** 2);
        if (d < nearestDist) {
          nearestDist = d;
          huntAngle = Math.atan2(prey.y - a.y, prey.x - a.x);
        }
      }
      const decision = foxHuntDecision(nearestDist, huntAngle, a.vx, a.vy);
      a.vx = decision.vx;
      a.vy = decision.vy;
      a.wanderTimer = decision.wanderTimer;
    } else {
      if (Math.random() < 0.35) {
        a.vx = (Math.random() - 0.5) * 20;
        a.vy = (Math.random() - 0.5) * 6;
        a.wanderTimer = 400 + Math.random() * 800;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 2000 + Math.random() * 4000;
      }
    }
  }

  private updateTracks(delta: number): void {
    for (let i = this.menuTracks.length - 1; i >= 0; i--) {
      const t = this.menuTracks[i];
      t.age += delta;
      const fade = 1 - t.age / this.MENU_TRACK_LIFETIME;
      if (fade <= 0) {
        t.graphics.destroy();
        this.menuTracks.splice(i, 1);
      } else {
        t.graphics.setAlpha(fade * 0.5);
      }
    }
  }

  private resizing = false;

  private handleResize(): void {
    if (this.resizing || !this.scene.isActive()) return;
    this.resizing = true;
    requestAnimationFrame(() => {
      this.scene.restart();
      this.resizing = false;
    });
  }

  shutdown(): void {
    // Close any open overlay dialog before teardown
    if (this.overlay.open) this.overlay.close();
    this.input.keyboard?.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
    if (this.gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadConnectHandler);
      this.gamepadConnectHandler = null;
    }
    for (const a of this.menuAnimals) {
      if (a.burrowMask) a.graphics.clearMask(true);
      if (a.burrowMaskShape) a.burrowMaskShape.destroy();
      a.graphics.destroy();
    }
    this.menuAnimals.length = 0;
    for (const t of this.menuTracks) t.graphics.destroy();
    this.menuTracks.length = 0;
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch((e) => {
        console.warn('Fullscreen request denied:', e);
      });
    }
    // Resize handler will restart scene to update button layout
  }

  private placeMenuTrack(x: number, y: number, species: string, vx: number, vy: number): void {
    if (this.menuTracks.length >= this.MENU_MAX_TRACKS) {
      const oldest = this.menuTracks.shift();
      if (oldest) oldest.graphics.destroy();
    }
    const g = this.add.graphics().setDepth(3.5);
    const s = 2;
    const angle = Math.atan2(vy, vx);
    drawTrackShape(g, species, s);
    g.setPosition(x, y);
    g.setRotation(angle);
    g.setAlpha(0.5);
    this.menuTracks.push({ graphics: g, age: 0 });
  }

  private createMenuWildlife(width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number): void {
    const sx = width / 1024;
    const s = Math.max(2, 3 * scaleFactor);
    const mtnScale = snowLineY / 600;
    this.menuAnimals = [];

    // Foreground snow area: from snowLineY to bottom minus footer
    const snowTop = snowLineY + 5;
    const snowBottom = height - footerHeight - 20;
    this.snowBottomY = snowBottom;

    // Feet offset: depth is based on bottom of sprite (feet), not center
    const feetOffset = (species: string) => {
      const grid = ANIMAL_GRID[species as keyof typeof ANIMAL_GRID];
      return grid ? (grid.h / 2) * s : 0;
    };

    const addGroundAnimal = (g: Phaser.GameObjects.Graphics, x: number, y: number, rangeX: number, species: string) => {
      const fo = feetOffset(species);
      g.setDepth(5 + (y + fo) * 0.001);
      this.menuAnimals.push({
        graphics: g, x, y, homeX: x, homeY: y,
        vx: 0, vy: 0, wanderTimer: Math.random() * 3000,
        type: 'ground', species,
        boundLeft: x - rangeX, boundRight: x + rangeX,
        hopPhase: 0,
        feetOffsetY: fo,
      });
    };

    // Perch spots: tree tops and mountain peaks (matching createMountains/createTrees positions)
    const treePerches = [
      { x: 100 * sx, y: snowLineY - 24 * scaleFactor },
      { x: 220 * sx, y: snowLineY - 22 * scaleFactor },
      { x: (width - 110 * sx), y: snowLineY - 24 * scaleFactor },
      { x: (width - 260 * sx), y: snowLineY - 20 * scaleFactor },
    ];
    const mountainPerches = [
      { x: 80 * sx,  y: snowLineY - 220 * mtnScale },   // Far left peak
      { x: 512 * sx, y: snowLineY - 300 * mtnScale },   // Center peak
      { x: 900 * sx, y: snowLineY - 260 * mtnScale },   // Far right peak
    ];
    const allPerches = [...treePerches, ...mountainPerches];
    this.perchSpots = allPerches;

    // Ground animal placement zones — left and right sides, avoiding center buttons
    // Randomized positions within zones
    const leftZone = { min: 60 * sx, max: 280 * sx };
    const rightZone = { min: width - 280 * sx, max: width - 60 * sx };
    const randInZone = (zone: { min: number; max: number }) =>
      zone.min + Math.random() * (zone.max - zone.min);

    // Marmots: colony of 2-3, clustered together (family group near burrow)
    const marmotCount = 2 + Math.floor(Math.random() * 2);
    const marmotZone = Math.random() < 0.5 ? rightZone : leftZone;
    const marmotClusterX = randInZone(marmotZone);
    for (let i = 0; i < marmotCount; i++) {
      const mg = this.add.graphics();
      drawAnimal(mg, 'marmot', 0, 0, s);
      const mx = marmotClusterX + (i - marmotCount / 2) * 18 * scaleFactor + (Math.random() - 0.5) * 10;
      const my = snowTop + Math.random() * (snowBottom - snowTop);
      mg.setPosition(mx, my).setDepth(5 + (my + feetOffset('marmot')) * 0.001);
      // Burrow mask: clips marmot at ground level so it can slide down out of view
      const maskShape = this.make.graphics({ x: 0, y: 0 });
      const halfH = 2 * s;   // sprite is centered; extends halfH above and below origin
      maskShape.fillStyle(0xffffff);
      // Mask: large above, bottom edge at sprite feet (homeY + halfH)
      maskShape.fillRect(mx - 30, my - 100, 60, 100 + halfH + 1);
      const burrowMask = maskShape.createGeometryMask();
      mg.setMask(burrowMask);
      const slideDistance = 4 * s + 4; // full sprite height + margin
      const animal = {
        graphics: mg, x: mx, y: my, homeX: mx, homeY: my,
        vx: 0, vy: 0, wanderTimer: Math.random() * 3000,
        type: 'ground' as const, species: 'marmot',
        boundLeft: mx - 20 * sx, boundRight: mx + 20 * sx,
        hopPhase: 0,
        burrowY: my,
        burrowMask,
        burrowMaskShape: maskShape,
        spriteH: slideDistance,
        feetOffsetY: feetOffset('marmot'),
      };
      this.menuAnimals.push(animal);
    }

    // Chamois: small herd of 2-3
    const chamoisCount = 2 + Math.floor(Math.random() * 2);
    const chamoisZone = marmotZone === rightZone ? leftZone : rightZone;
    const chamoisClusterX = randInZone(chamoisZone);
    for (let i = 0; i < chamoisCount; i++) {
      const cg = this.add.graphics();
      drawAnimal(cg, 'chamois', 0, 0, s);
      const cx = chamoisClusterX + (i - chamoisCount / 2) * 25 * scaleFactor + (Math.random() - 0.5) * 15;
      const cy = snowTop + Math.random() * (snowBottom - snowTop);
      cg.setPosition(cx, cy).setDepth(5 + cy * 0.001);
      addGroundAnimal(cg, cx, cy, width * 0.4, 'chamois');
    }

    // Bunny: solitary (mountain hares are loners), random side
    const bunnyZone = Math.random() < 0.5 ? leftZone : rightZone;
    const bunnyG = this.add.graphics();
    drawAnimal(bunnyG, 'bunny', 0, 0, s);
    const bunnyX = randInZone(bunnyZone);
    const bunnyY = snowTop + Math.random() * (snowBottom - snowTop);
    bunnyG.setPosition(bunnyX, bunnyY).setDepth(5 + bunnyY * 0.001);
    addGroundAnimal(bunnyG, bunnyX, bunnyY, width * 0.45, 'bunny');

    // Fox: rare (~30% chance), solitary, roams wide
    if (Math.random() < 0.3) {
      const foxZone = Math.random() < 0.5 ? leftZone : rightZone;
      const foxG = this.add.graphics();
      drawAnimal(foxG, 'fox', 0, 0, s);
      const foxX = randInZone(foxZone);
      const foxY = snowTop + Math.random() * (snowBottom - snowTop);
      foxG.setPosition(foxX, foxY).setDepth(5 + foxY * 0.001);
      addGroundAnimal(foxG, foxX, foxY, width * 0.4, 'fox');
    }

    // Bouquetin and birds
    this.createMenuClimbers(width, snowLineY, sx, mtnScale, s);
    this.createMenuBirds(width, snowLineY, scaleFactor, allPerches);
  }

  private createMenuClimbers(width: number, snowLineY: number, sx: number, mtnScale: number, s: number): void {
    const climbMtnX = 900 * sx;
    const climbMtnBaseW = 190 * mtnScale;
    const climbMtnPeakH = 260 * mtnScale;
    const climbBase = snowLineY - 4;
    const climbPeak = snowLineY - climbMtnPeakH * 0.85;
    for (let ib = 0; ib < 2; ib++) {
      const ibexG = this.add.graphics().setDepth(1.5);
      drawAnimal(ibexG, 'bouquetin', 0, 0, s);
      const climbPath: { x: number; y: number }[] = [];
      const climbSteps = 8;
      const flankOffset = 0.12 + ib * 0.12;
      for (let i = 0; i <= climbSteps; i++) {
        const t = i / climbSteps;
        const mtnWidthAtT = climbMtnBaseW * (1 - t * 0.85);
        const offset = mtnWidthAtT * (flankOffset + (i % 2) * 0.1);
        climbPath.push({
          x: climbMtnX + offset,
          y: climbBase - t * (climbBase - climbPeak),
        });
      }
      const startIdx = ib * 2;
      const startPt = climbPath[startIdx % climbPath.length];
      ibexG.setPosition(startPt.x, startPt.y);
      this.menuAnimals.push({
        graphics: ibexG, x: startPt.x, y: startPt.y,
        homeX: startPt.x, homeY: startPt.y,
        vx: 0, vy: 0, wanderTimer: ib * 1500,
        type: 'climber',
        boundLeft: 0, boundRight: width,
        state: 'climbing', climbPath, climbIndex: startIdx % climbPath.length,
      });
    }
  }

  private createMenuBirds(width: number, snowLineY: number, scaleFactor: number, allPerches: { x: number; y: number }[]): void {
    const birdScale = Math.max(1.5, 2 * scaleFactor);
    const birdCount = 4 + Math.floor(Math.random() * 4);
    const perchedCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < birdCount; i++) {
      const birdG = this.add.graphics().setDepth(11);

      const startPerched = i < perchedCount;
      let bx: number, by: number;
      let state: 'flying' | 'perched';

      if (startPerched) {
        const perch = allPerches[i % allPerches.length];
        bx = perch.x;
        by = perch.y - 4;
        state = 'perched';
        drawBirdPerched(birdG, 0, 0, birdScale);
      } else {
        bx = Math.random() * width;
        by = snowLineY * (0.1 + Math.random() * 0.4);
        state = 'flying';
        drawBirdSideFlying(birdG, 0, 0, birdScale);
      }

      const initAngle = (Math.random() - 0.5) * Math.PI * 0.8;
      const initSpeed = 6 + Math.random() * 10;
      birdG.setPosition(bx, by);
      this.menuAnimals.push({
        graphics: birdG, x: bx, y: by, homeX: bx, homeY: by,
        vx: state === 'flying' ? Math.cos(initAngle) * initSpeed : 0,
        vy: state === 'flying' ? Math.sin(initAngle) * initSpeed * 0.5 : 0,
        wanderTimer: state === 'perched' ? 3000 + Math.random() * 5000 : 1500 + Math.random() * 2000,
        type: 'bird',
        boundLeft: -20, boundRight: width + 20,
        state,
        perchTarget: allPerches[i % allPerches.length],
        spriteH: birdScale,
      });
    }
  }

  private createSnowParticles(width: number, snowLineY: number): void {
    for (let i = 0; i < 40; i++) {
      const size = Phaser.Math.Between(2, 4);
      const rect = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-20, snowLineY),
        size, size, 0xffffff
      ).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
      this.snowflakes.push({
        rect,
        speed: Phaser.Math.FloatBetween(0.3, 1.2),
        wobbleOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }
  }

  private startGame(level: number = 0): void {
    const game = this.game;
    this.scene.stop('MenuScene');
    resetGameScenes(game, 'GameScene', { level });
  }

  private confirmNewGame(): void {
    // Clear progress and start fresh
    clearProgress();
    this.startGame(0);
  }

  private showHowToPlay(): void {
    // Check for gamepad
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    
    // On devices with both touch and keyboard, show keyboard (primary on desktop)
    // Only show touch-specific hints on touch-only devices (no physical keyboard)
    const hasTouch = detectTouch();
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const showTouchHints = hasTouch && isMobile && !hasGamepad;
    const keys = getMovementKeysString(); // e.g., "WASD" or "ZQSD"
    const groomKey = getGroomKeyName(); // e.g., "SPACE" or rebound key
    
    let moveHint: string;
    let groomHint: string;
    
    if (hasGamepad) {
      // Gamepad connected - show gamepad controls
      moveHint = '🎮 ' + (t('howToPlayMoveGamepad') || 'Left stick or D-pad to move');
      groomHint = `❄️ ${getButtonName(loadGamepadBindings().groom, getConnectedControllerType())} ` + (t('howToPlayGroomGamepad') || 'to groom snow');
    } else if (showTouchHints) {
      moveHint = '🚜 ' + (t('howToPlayMoveTouch') || 'Use the virtual D-pad');
      groomHint = '❄️ ' + (t('howToPlayGroomTouch') || 'Tap ❄️ to groom');
    } else if (hasTouch) {
      // PC with touchscreen - show both (use localized string with key placeholder)
      const moveText = t('howToPlayMoveHybrid') || `${keys}/Arrows or touch D-pad`;
      moveHint = '🚜 ' + moveText.replace('{keys}', keys);
      const groomText = t('howToPlayGroomHybrid') || `${groomKey} or tap ❄️ to groom`;
      groomHint = '❄️ ' + groomText.replace('{groomKey}', groomKey);
    } else {
      // Keyboard only - use localized string with key placeholder
      const moveText = t('howToPlayMove') || `${keys} or Arrows to move`;
      moveHint = '🚜 ' + moveText.replace('{keys}', keys);
      const groomText = t('howToPlayGroom') || `${groomKey} to groom snow`;
      groomHint = '❄️ ' + groomText.replace('{groomKey}', groomKey);
    }
    
    this.overlay.show('howToPlay', [
      moveHint,
      '',
      groomHint,
      '',
      '⛽ ' + (t('howToPlayFuel') || 'Watch your fuel and stamina!'),
    ]);
  }

  private showSettings(): void {
    this.scene.start('SettingsScene', { returnTo: null });
  }

  private showChangelog(): void {
    // Discover changelog entries by scanning for changelog_YYYYMMDD_date keys
    const lang = TRANSLATIONS[getCurrentLanguage()] || TRANSLATIONS.fr;
    const dateKeys = Object.keys(lang)
      .filter(k => k.match(/^changelog_\d{8}_date$/))
      .sort(); // chronological order (YYYYMMDD sorts naturally)

    const entries: string[] = [];
    for (const dk of dateKeys) {
      const contentKey = dk.replace('_date', '');
      const date = t(dk);
      const day = t(contentKey);
      if (date && date !== dk && day && day !== contentKey) {
        entries.push(`━━ ${date} ━━`, day, '');
      }
    }
    entries.reverse(); // newest first
    if (entries.length > 0 && entries[0] === '') entries.shift();
    this.overlay.show('changelog', entries);
  }

  private showControls(): void {
    // Detect capabilities
    const hasTouch = detectTouch();
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const keys = getMovementKeysString(); // e.g., "WASD" or "ZQSD"
    
    if (isMobile && hasTouch) {
      // Mobile-only: show touch controls
      this.overlay.show('controls', [
        '🎮 ' + (t('touchSupported') || 'Touch controls'),
        '',
        '◀▲▼▶ D-pad - Move',
        '❄️ Button - Groom',
        '🔗 Button - Winch',
        '',
        '🎮 Gamepad also supported',
      ]);
    } else if (hasTouch) {
      // PC with touchscreen: show both
      this.overlay.show('controls', [
        `⬆️ ${keys} / Arrows - Move`,
        '⏺️ SPACE - Groom',
        '🔗 SHIFT - Winch',
        '⏸️ ESC - Pause',
        '',
        '🎮 Gamepad supported',
        '📱 Touch D-pad available',
      ]);
    } else {
      // Keyboard only
      this.overlay.show('controls', [
        `⬆️ ${keys} / Arrows - Move`,
        '⏺️ SPACE - Groom',
        '🔗 SHIFT - Winch',
        '⏸️ ESC - Pause',
        '',
        '🎮 Gamepad supported',
      ]);
    }
  }

}
