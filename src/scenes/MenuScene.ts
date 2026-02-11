import Phaser from 'phaser';
import { t, Accessibility, TRANSLATIONS, getLanguage as getCurrentLanguage } from '../setup';
import { getMovementKeysString, getGroomKeyName, getWinchKeyName } from '../utils/keyboardLayout';
import { getSavedProgress, clearProgress } from '../utils/gameProgress';
import { setString } from '../utils/storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import { loadGamepadBindings, getButtonName, getConnectedControllerType } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, type MenuButtonNav } from '../utils/menuButtonNav';
import { THEME } from '../config/theme';
import { playClick, playDeviceChime, playToggle } from '../systems/UISounds';
import { MusicSystem } from '../systems/MusicSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch, onTouchAvailable, isMobile } from '../utils/touchDetect';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';
import { OverlayManager } from '../utils/overlayManager';
import { toggleFullscreen } from '../utils/fullscreen';
import { LEVELS } from '../config/levels';

/**
 * Les Aiguilles Blanches - Menu Scene
 * Main menu with game start, settings, and controls
 */

export default class MenuScene extends Phaser.Scene {
  private overlay: OverlayManager = null!;
  /** Exposed for E2E test access — delegates to OverlayManager. */
  get overlayOpen(): boolean { return this.overlay?.open ?? false; }
  private wildlife: MenuWildlifeController = null!;
  private selectionArrow: Phaser.GameObjects.Text | null = null;
  private menuContainer: Phaser.GameObjects.Container | null = null;
  private menuScrollY = 0;
  private menuMaxScroll = 0;
  private menuScrollMask: Phaser.GameObjects.Graphics | null = null;
  private menuDragStartY = 0;
  private menuDragStartScroll = 0;
  private menuScrollUpHint: Phaser.GameObjects.Text | null = null;
  private menuScrollDownHint: Phaser.GameObjects.Text | null = null;
  private menuUpdateScrollHints: (() => void) | null = null;
  private snowLineY = 0;
  private inputHintTexts: Phaser.GameObjects.GameObject[] = [];
  private lastInputKey: string | null = null;
  private gamepadConnectHandler: (() => void) | null = null;
  private footerGithubRight = 0;
  private footerHintStyle: Phaser.Types.GameObjects.Text.TextStyle = {};
  private footerHintY = 0;
  private volumeIndicator: Phaser.GameObjects.Text | null = null;
  private volumeMuteOverlay: Phaser.GameObjects.Graphics | null = null;
  private volumeSliderObjects: Phaser.GameObjects.GameObject[] = [];
  private volumeSliderVisible = false;
  private volumeIconZone: Phaser.GameObjects.Zone | null = null;
  private volumeSliderTimer: Phaser.Time.TimerEvent | null = null;
  private volumeSliderListeners: { onMove: Function; onUp: Function } | null = null;
  private inputTooltipObjects: Phaser.GameObjects.GameObject[] = [];
   
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.overlay = new OverlayManager(this);
    this.wildlife = new MenuWildlifeController(this);
    this.inputHintTexts = [];
    // Start menu music (singleton — crossfades if mood differs)
    MusicSystem.getInstance().start('menu');
    // Phaser emits 'shutdown' but doesn't auto-call the method
    this.events.once('shutdown', this.shutdown, this);
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

    // Determine weather from player's current level progress
    const progress = getSavedProgress();
    const currentLevel = progress ? LEVELS[progress.currentLevel] : null;
    const levelWeather = currentLevel
      ? { isNight: currentLevel.isNight, weather: currentLevel.weather }
      : undefined;

    this.createSkyAndGround(width, height, snowLineY, footerHeight, scaleFactor, safeAreaBottom, levelWeather);
    const isStorm = levelWeather?.weather === 'storm';
    const subtitleBottom = this.createTitle(width, height, snowLineY, scaleFactor, isPortrait, titleSize, subtitleSize, isStorm);
    this.createMenuButtons(width, height, snowLineY, scaleFactor, isPortrait, buttonSize, buttonPadding, footerHeight, safeAreaBottom, subtitleBottom, isStorm);
    this.createFooter(width, height, scaleFactor, footerHeight, safeAreaBottom);
    this.createMenuWeather(width, height, levelWeather);
    this.setupInput();

    Accessibility.announce((t('subtitle') || '') + ' - ' + (t('startGame') || ''));
  }

  private createSkyAndGround(width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, safeAreaBottom: number, weather?: { isNight: boolean; weather: string }): void {
    createMenuTerrain(this, width, height, snowLineY, footerHeight, scaleFactor, weather);
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, footerHeight + safeAreaBottom, scaleFactor, weather);
  }

  /** Add night overlay and snow particles if the player's current level has weather. */
  private createMenuWeather(width: number, height: number, weather?: { isNight: boolean; weather: string }): void {
    if (!weather) return;

    // Night overlay — subtle tint so menu stays readable
    if (weather.isNight) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000022)
        .setAlpha(0.45).setDepth(5);
    }

    // Storm overlay — grey-blue haze for low visibility
    if (weather.weather === 'storm') {
      this.add.rectangle(width / 2, height / 2, width, height, 0x667788)
        .setAlpha(0.25).setDepth(5);
    }

    // Snow particles for storm or light_snow
    if (weather.weather !== 'clear' && this.textures.exists('snow_ungroomed')) {
      const isStorm = weather.weather === 'storm';
      this.add.particles(0, 0, 'snow_ungroomed', {
        x: { min: 0, max: width },
        y: -10,
        quantity: isStorm ? 6 : 2,
        frequency: isStorm ? 50 : 200,
        speedY: isStorm ? { min: 120, max: 280 } : { min: 20, max: 60 },
        speedX: isStorm ? { min: -100, max: -30 } : { min: -10, max: 10 },
        scale: isStorm ? { start: 0.4, end: 0.1 } : { start: 0.3, end: 0.08 },
        alpha: { start: 0.8, end: 0.3 },
        lifespan: isStorm ? 2500 : 5000,
        blendMode: Phaser.BlendModes.ADD,
        tint: isStorm ? 0xCCDDFF : 0xFFFFFF,
      }).setDepth(200);
    }
  }

  /** Returns the Y coordinate of the subtitle ribbon bottom edge. */
  private createTitle(width: number, height: number, snowLineY: number, scaleFactor: number, isPortrait: boolean, titleSize: number, subtitleSize: number, isStorm?: boolean): number {
    const titleY = isPortrait ? height * 0.08 : height * 0.12;
    const titleText = 'Les Aiguilles Blanches';
    // Measure title text to size the background box
    const titleMeasure = this.add.text(0, -100, titleText, {
      fontFamily: THEME.fonts.family, fontSize: titleSize + 'px', fontStyle: 'bold',
    });
    const titleTextW = titleMeasure.width;
    titleMeasure.destroy();
    const titleBgWidth = Math.round(Math.min(Math.max(titleTextW + 40, 520 * scaleFactor), width - 20));
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

    // Storm: snow on title box and subtitle ribbon
    if (isStorm) {
      const snowG = this.add.graphics().setDepth(10);
      snowG.fillStyle(0xf0f5f8, 0.85);
      const titleTop = titleY - titleBgHeight / 2;
      for (let sx = -titleBgWidth / 2; sx < titleBgWidth / 2; sx += 5) {
        const h = 2 + Math.abs(Math.sin(sx * 0.2)) * 2;
        snowG.fillRect(width / 2 + sx, titleTop - h + 1, 5, h);
      }
      for (let sx = -ribbonW / 2; sx < ribbonW / 2; sx += 5) {
        const h = 1 + Math.abs(Math.sin(sx * 0.25 + 1)) * 2;
        snowG.fillRect(cx + sx, rTop - h + 1, 5, h);
      }
    }

    return subtitleY + ribbonH / 2;
  }

  private createMenuButtons(width: number, height: number, snowLineY: number, scaleFactor: number, isPortrait: boolean, buttonSize: number, buttonPadding: number, footerHeight: number, safeAreaBottom: number, subtitleBottom: number, isStorm?: boolean): void {
    const savedProgress = getSavedProgress();
    const hasProgress = savedProgress !== null && savedProgress.currentLevel > 0;
    const hasCompletedLevels = savedProgress?.levelStats != null &&
      Object.values(savedProgress.levelStats).some(s => s.completed);

    const buttonDefs: Array<{ text: string; callback: () => void; primary: boolean }> = [];
    if (hasProgress) {
      buttonDefs.push({ text: 'resumeGame', callback: () => this.startGame(savedProgress.currentLevel), primary: true });
    }
    if (!hasProgress && !hasCompletedLevels) {
      buttonDefs.push({ text: 'startGame', callback: () => this.startGame(0), primary: true });
    } else if (!hasProgress) {
      buttonDefs.push({ text: 'startGame', callback: () => this.startGame(0), primary: true });
    }
    if (hasProgress) {
      buttonDefs.push({ text: 'newGame', callback: () => this.confirmNewGame(), primary: false });
    }
    if (hasProgress || hasCompletedLevels) {
      buttonDefs.push({ text: 'levelSelect', callback: () => this.showLevelSelect(), primary: false });
    }
    buttonDefs.push({ text: 'howToPlay', callback: () => this.showHowToPlay(), primary: false });
    buttonDefs.push({ text: 'changelog', callback: () => this.showChangelog(), primary: false });
    buttonDefs.push({ text: 'settings', callback: () => this.showSettings(), primary: false });
    if (document.fullscreenEnabled) {
      const isFullscreen = !!document.fullscreenElement;
      buttonDefs.push({ 
        text: isFullscreen ? 'exitFullscreen' : 'fullscreen', 
        callback: () => toggleFullscreen(this), 
        primary: false 
      });
    }

    const menuStartY = subtitleBottom + 15 * scaleFactor;
    const menuEndY = height - footerHeight - safeAreaBottom - 10 * scaleFactor;
    const menuAvailableH = menuEndY - menuStartY;
    const minButtonHeight = buttonSize + buttonPadding * 2;
    const minSpacing = minButtonHeight + (isPortrait ? 4 : 10);
    if (buttonDefs.length * minSpacing > menuAvailableH) {
      const fsIdx = buttonDefs.findIndex(b => b.text === 'fullscreen' || b.text === 'exitFullscreen');
      if (fsIdx !== -1) buttonDefs.splice(fsIdx, 1);
    }
    const buttonSpacing = Math.max(minSpacing, Math.min(Math.round(46 * scaleFactor), Math.round(menuAvailableH / (buttonDefs.length + 0.5))));
    const totalMenuH = buttonDefs.length * buttonSpacing;
    const needsScroll = totalMenuH > menuAvailableH;
    const localMenuY = buttonSpacing * 0.5;

    this.menuButtons = [];
    this.buttonShadows = [];
    this.buttonCallbacks = [];

    // Container for all menu buttons — enables scrolling when needed
    this.menuContainer = this.add.container(0, menuStartY).setDepth(10);

    const arrowSize = Math.round(22 * scaleFactor);
    this.selectionArrow = this.add.text(0, 0, '▶', {
      fontFamily: THEME.fonts.family,
      fontSize: arrowSize + 'px',
      color: '#FFD700',
      stroke: '#2d2822',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.menuContainer.add(this.selectionArrow);

    buttonDefs.forEach((btn, i) => {
      const btnText = t(btn.text) || btn.text;
      const yPos = localMenuY + i * buttonSpacing;
      const shadowOffset = Math.round(4 * scaleFactor);
      const bgColor = btn.primary ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
      const shadowColor = btn.primary ? '#115511' : '#1a3a5c';

      const shadow = this.add.text(width / 2 + shadowOffset, yPos + shadowOffset, btnText, {
        fontFamily: THEME.fonts.family,
        fontSize: buttonSize + 'px',
        color: '#ffffff',
        backgroundColor: shadowColor,
        padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
      }).setOrigin(0.5).setAlpha(0.6);
      this.menuContainer.add(shadow);

      const button = this.add.text(width / 2, yPos, btnText, {
        fontFamily: THEME.fonts.family,
        fontSize: buttonSize + 'px',
        color: '#ffffff',
        backgroundColor: bgColor,
        padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.buttonNav.select(i);
        })
        .on('pointerout', () => {
          this.buttonNav.refreshStyles();
        })
        .on('pointerup', () => {
          playClick();
          btn.callback();
        });
      this.menuContainer.add(button);

      this.menuButtons.push(button);
      this.buttonShadows.push(shadow);
      this.buttonCallbacks.push(btn.callback);
    });

    // Storm: snow accumulation on top of each button
    if (isStorm) {
      this.menuButtons.forEach(btn => {
        const bw = btn.width;
        const bx = btn.x - bw / 2;
        const by = btn.y - btn.height / 2;
        const sg = this.add.graphics();
        sg.fillStyle(0xf0f5f8, 0.8);
        for (let sx = 0; sx < bw; sx += 5) {
          const h = 1 + Math.abs(Math.sin(sx * 0.3 + btn.y * 0.1)) * 2;
          sg.fillRect(bx + sx, by - h + 1, 5, h);
        }
        this.menuContainer!.add(sg);
      });
    }

    // Scroll support when buttons overflow
    this.menuScrollY = 0;
    this.menuMaxScroll = Math.max(0, totalMenuH - menuAvailableH);

    if (needsScroll) {
      const maskGfx = this.add.graphics().setDepth(10);
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillRect(0, menuStartY, width, menuAvailableH);
      maskGfx.setVisible(false);
      this.menuScrollMask = maskGfx;
      this.menuContainer.setMask(maskGfx.createGeometryMask());

      // Scroll indicators
      const hintSize = Math.round(Math.max(12, 16 * scaleFactor));
      this.menuScrollUpHint = this.add.text(width / 2, menuStartY + 2, '▲', {
        fontFamily: THEME.fonts.family, fontSize: hintSize + 'px', color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(11).setAlpha(0);
      this.menuScrollDownHint = this.add.text(width / 2, menuEndY - 2, '▼', {
        fontFamily: THEME.fonts.family, fontSize: hintSize + 'px', color: '#ffffff',
      }).setOrigin(0.5, 1).setDepth(11).setAlpha(0.7);

      const updateScrollHints = () => {
        if (this.menuScrollUpHint) this.menuScrollUpHint.setAlpha(this.menuScrollY > 0 ? 0.7 : 0);
        if (this.menuScrollDownHint) this.menuScrollDownHint.setAlpha(this.menuScrollY < this.menuMaxScroll ? 0.7 : 0);
      };
      updateScrollHints();

      // Wheel scroll
      this.input.on('wheel', (_p: unknown, _gos: unknown, _dx: number, dy: number) => {
        if (this.overlay.open) return;
        this.menuScrollY = Phaser.Math.Clamp(this.menuScrollY + dy * 0.5, 0, this.menuMaxScroll);
        this.menuContainer!.y = menuStartY - this.menuScrollY;
        updateScrollHints();
      });

      // Touch drag scroll
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.overlay.open) return;
        this.menuDragStartY = p.y;
        this.menuDragStartScroll = this.menuScrollY;
      });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (!p.isDown || this.overlay.open) return;
        const delta = this.menuDragStartY - p.y;
        if (Math.abs(delta) > 8) {
          this.menuScrollY = Phaser.Math.Clamp(this.menuDragStartScroll + delta, 0, this.menuMaxScroll);
          this.menuContainer!.y = menuStartY - this.menuScrollY;
          updateScrollHints();
        }
      });

      this.menuUpdateScrollHints = updateScrollHints;
    }

    const shadows = this.buttonShadows;
    const arrow = this.selectionArrow;
    const scrollMenuStartY = menuStartY;
    const scrollMenuAvailH = menuAvailableH;
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
            // Scroll into view if needed
            if (this.menuMaxScroll > 0) {
              const btnTop = btn.y - btn.height / 2;
              const btnBottom = btn.y + btn.height / 2;
              if (btnTop - this.menuScrollY < 0) {
                this.menuScrollY = Math.max(0, btnTop - 5);
              } else if (btnBottom - this.menuScrollY > scrollMenuAvailH) {
                this.menuScrollY = Math.min(this.menuMaxScroll, btnBottom - scrollMenuAvailH + 5);
              }
              this.menuContainer!.y = scrollMenuStartY - this.menuScrollY;
              this.menuUpdateScrollHints?.();
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
      const containerY = menuStartY;
      this.wildlife.menuZone = {
        left: width / 2 - btnHalfW,
        right: width / 2 + btnHalfW,
        top: containerY + firstBtn.y - firstBtn.height / 2 - 20,
        bottom: containerY + lastBtn.y + lastBtn.height / 2 + 20,
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
    this.createVolumeIndicator(scaleFactor);
  }

  private setupInput(): void {
    this.gamepadConnectHandler = (e?: Event) => {
      // Use the event type when available for immediate correct state (Firefox compat)
      if (e?.type === 'gamepadconnected' || e?.type === 'gamepaddisconnected') {
        const connected = e.type === 'gamepadconnected';
        playDeviceChime(connected);
        this.updateInputHints(connected);
      } else {
        this.updateInputHints();
      }
    };
    window.addEventListener('gamepadconnected', this.gamepadConnectHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadConnectHandler);

    onTouchAvailable(() => {
      if (this.scene?.manager && this.scene.isActive()) this.updateInputHints();
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

  private createVolumeIndicator(scaleFactor: number): void {
    if (this.volumeIndicator) { this.volumeIndicator.destroy(); this.volumeIndicator = null; }
    if (this.volumeMuteOverlay) { this.volumeMuteOverlay.destroy(); this.volumeMuteOverlay = null; }
    if (this.volumeIconZone) { this.volumeIconZone.destroy(); this.volumeIconZone = null; }
    this.destroyVolumeSlider();

    const audio = AudioSystem.getInstance();
    const muted = audio.isMuted();
    const leftMargin = Math.round(12 * scaleFactor);
    const activeAlpha = 0.6;
    const inactiveAlpha = 0.2;

    const volumeIcon = (): string => {
      if (audio.isMuted()) return '🔊';
      const vol = audio.getVolume('master');
      if (vol === 0) return '🔈';
      if (vol <= 0.5) return '🔉';
      return '🔊';
    };

    this.volumeIndicator = this.add.text(leftMargin, this.footerHintY, volumeIcon(), this.footerHintStyle)
      .setOrigin(0, 0.5)
      .setAlpha(muted ? inactiveAlpha : activeAlpha)
      .setDepth(10);

    // Use a zone for reliable hit detection and hand cursor (48px min touch target)
    const minHit = 48;
    const bounds = this.volumeIndicator.getBounds();
    const hitW = Math.max(bounds.width, minHit);
    const hitH = Math.max(bounds.height, minHit);
    const hitZoneIcon = this.add.zone(
      bounds.centerX, bounds.centerY, hitW, hitH
    ).setDepth(13).setInteractive({ useHandCursor: true });
    this.volumeIconZone = hitZoneIcon;

    hitZoneIcon
      .on('pointerover', (p: Phaser.Input.Pointer) => {
        if (p.wasTouch) return;
        this.volumeIndicator?.setAlpha(1);
        this.showVolumeSlider(scaleFactor);
      })
      .on('pointermove', () => {
        // Continuously re-assert hand cursor while pointer is over the icon zone.
        // Phaser resets cursor when overlapping objects are destroyed (slider refresh).
        this.game.canvas.style.cursor = 'pointer';
      })
      .on('pointerdown', (p: Phaser.Input.Pointer) => {
        const a = AudioSystem.getInstance();
        const nowMuted = !a.isMuted();
        a.setMuted(nowMuted);
        playToggle(!nowMuted);
        this.volumeIndicator?.setText(volumeIcon());
        this.volumeIndicator?.setAlpha(nowMuted ? inactiveAlpha : activeAlpha);
        this.updateMuteOverlay();
        if (!p.wasTouch) {
          this.showVolumeSlider(scaleFactor);
          this.refreshVolumeSlider(scaleFactor);
        }
      });

    this.updateMuteOverlay();
  }

  /** Draw or clear the forbidden-circle overlay on the volume icon (matches controller hint style). */
  private updateMuteOverlay(): void {
    if (this.volumeMuteOverlay) { this.volumeMuteOverlay.destroy(); this.volumeMuteOverlay = null; }
    if (!AudioSystem.getInstance().isMuted() || !this.volumeIndicator) return;

    const iconMeasure = this.add.text(0, 0, '🔊', this.footerHintStyle).setVisible(false);
    const iconWidth = iconMeasure.width;
    iconMeasure.destroy();

    const r = Math.round(this.volumeIndicator.height * 0.7);
    const cx = this.volumeIndicator.x + iconWidth / 2;
    const cy = this.footerHintY;

    this.volumeMuteOverlay = this.add.graphics().setDepth(10);
    this.volumeMuteOverlay.lineStyle(1.5, 0xcc2200, 0.6);
    this.volumeMuteOverlay.strokeCircle(cx, cy, r);
    const dx = r * Math.cos(Math.PI / 4);
    const dy = r * Math.sin(Math.PI / 4);
    this.volumeMuteOverlay.lineBetween(cx + dx, cy - dy, cx - dx, cy + dy);
  }

  private destroyVolumeSlider(): void {
    if (this.volumeSliderTimer) {
      this.volumeSliderTimer.remove(false);
      this.volumeSliderTimer = null;
    }
    if (this.volumeSliderListeners) {
      this.input.off('pointermove', this.volumeSliderListeners.onMove as any);
      this.input.off('pointerup', this.volumeSliderListeners.onUp as any);
      this.volumeSliderListeners = null;
    }
    this.volumeSliderObjects.forEach(o => { if (o.active) o.destroy(); });
    this.volumeSliderObjects = [];
    this.volumeSliderVisible = false;
  }

  private refreshVolumeSlider(scaleFactor: number): void {
    if (!this.volumeSliderVisible) return;
    this.destroyVolumeSlider();
    this.showVolumeSlider(scaleFactor);
  }

  private showVolumeSlider(scaleFactor: number): void {
    if (this.volumeSliderVisible || !this.volumeIndicator) return;
    this.volumeSliderVisible = true;

    const audio = AudioSystem.getInstance();
    const trackWidth = Math.round(Math.max(60, 80 * scaleFactor));
    const trackHeight = 6;
    const thumbW = 10;
    const thumbH = 16;
    const padding = 6;

    // Position slider above the icon
    const sliderX = this.volumeIndicator.x;
    const sliderY = this.footerHintY - this.volumeIndicator.height - padding - thumbH / 2;

    // Background panel
    const labelSpace = 20;
    const panelW = trackWidth + padding * 2;
    const panelH = thumbH + padding * 3 + labelSpace;
    const panelY = sliderY - thumbH / 2 - padding * 2 - labelSpace;
    const bg = this.add.graphics().setDepth(11);
    bg.fillStyle(0x1a2a3a, 0.9);
    bg.fillRoundedRect(sliderX - padding, panelY, panelW, panelH, 4);
    bg.lineStyle(1, 0x4a6a8a, 0.5);
    bg.strokeRoundedRect(sliderX - padding, panelY, panelW, panelH, 4);
    this.volumeSliderObjects.push(bg);

    // Volume percentage label
    const vol = Math.round(audio.getVolume('master') * 100);
    const pctLabel = this.add.text(sliderX + trackWidth / 2, sliderY - thumbH / 2 - padding, `${vol}%`, {
      fontFamily: this.footerHintStyle.fontFamily as string,
      fontSize: this.footerHintStyle.fontSize as string,
      color: THEME.colors.textPrimary,
    }).setOrigin(0.5, 1).setDepth(12);
    this.volumeSliderObjects.push(pctLabel);

    // Track
    const track = this.add.graphics().setDepth(12);
    track.fillStyle(0x2a4a5e, 1);
    track.fillRect(sliderX, sliderY - trackHeight / 2, trackWidth, trackHeight);
    this.volumeSliderObjects.push(track);

    // Fill
    const fill = this.add.graphics().setDepth(12);
    const drawFill = (t: number) => {
      fill.clear();
      fill.fillStyle(0x87CEEB, 1);
      fill.fillRect(sliderX, sliderY - trackHeight / 2, t * trackWidth, trackHeight);
    };
    drawFill(audio.getVolume('master'));
    this.volumeSliderObjects.push(fill);

    // Thumb
    const thumb = this.add.graphics().setDepth(12);
    const drawThumb = (t: number) => {
      const x = sliderX + t * trackWidth;
      thumb.clear();
      thumb.fillStyle(0xffffff, 1);
      thumb.fillRect(x - thumbW / 2, sliderY - thumbH / 2, thumbW, thumbH);
    };
    drawThumb(audio.getVolume('master'));
    this.volumeSliderObjects.push(thumb);

    // Hit zone covers the slider panel only — NOT the icon below (icon handles its own click at depth 10)
    const hitX = sliderX - padding;
    const hitY = panelY;
    const hitW = panelW;
    const hitH = panelH;
    const hitZone = this.add.zone(hitX, hitY, hitW, hitH)
      .setOrigin(0, 0).setDepth(11).setInteractive({ useHandCursor: true });
    this.volumeSliderObjects.push(hitZone);

    // Dismissal check area includes both panel and icon
    const dismissX = hitX;
    const dismissY = hitY;
    const dismissW = hitW;
    const dismissH = hitH + padding + this.volumeIndicator.height;

    let dragging = false;

    const applyFromPointer = (px: number) => {
      const t = Math.max(0, Math.min(1, (px - sliderX) / trackWidth));
      const newVal = Math.round(t * 20) / 20; // 5% steps
      audio.setVolume('master', newVal);
      drawFill(newVal);
      drawThumb(newVal);
      pctLabel.setText(`${Math.round(newVal * 100)}%`);
      const icon = newVal === 0 ? '🔈' : newVal <= 0.5 ? '🔉' : '🔊';
      this.volumeIndicator?.setText(icon);
    };

    hitZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true;
      applyFromPointer(p.x);
    });

    const onMove = (p: Phaser.Input.Pointer) => { if (dragging) applyFromPointer(p.x); };
    const onUp = () => { dragging = false; };
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.volumeSliderListeners = { onMove, onUp };

    // Dismiss when pointer leaves the panel + icon area
    this.volumeSliderTimer = this.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        if (dragging) return;
        const p = this.input.activePointer;
        if (p.x < dismissX || p.x > dismissX + dismissW || p.y < dismissY || p.y > dismissY + dismissH) {
          this.destroyVolumeSlider();
          const m = AudioSystem.getInstance().isMuted();
          this.volumeIndicator?.setAlpha(m ? 0.2 : 0.6);
        }
      },
    });
  }

  private updateInputHints(gamepadOverride?: boolean): void {
    // Destroy previous hint objects
    this.inputHintTexts.forEach(t => { if (t.active) t.destroy(); });
    this.inputHintTexts = [];
    this.destroyInputTooltip();

    const mobile = isMobile();
    const hasTouch = detectTouch();
    const hasGamepad = gamepadOverride ?? (navigator.getGamepads && Array.from(navigator.getGamepads()).some(g => g !== null));

    // Track input state for touch detection chime
    const key = `${!mobile}|${hasTouch}|${hasGamepad}`;
    if (this.lastInputKey && key !== this.lastInputKey) {
      // Only chime for touch changes (gamepad is handled by event listener)
      const prevTouch = this.lastInputKey.split('|')[1] === 'true';
      if (hasTouch !== prevTouch) playDeviceChime(hasTouch);
    }
    this.lastInputKey = key;

    // Define all hints: [icon, label, isAvailable, tooltipKeyOn, tooltipKeyOff]
    const allHints: [string, string, boolean, string, string][] = [
      ['💻', 'Keyboard', !mobile, 'inputKeyboard', 'inputKeyboardOff'],
      ['✋', 'Touch', hasTouch, 'inputTouch', 'inputTouchOff'],
      ['🎮', 'Gamepad', hasGamepad, 'inputGamepad', 'inputGamepadOff'],
    ];

    const width = this.scale.width;
    const scaleFactor = Math.min(width / 960, 1);
    const rightMargin = Math.round(12 * scaleFactor);
    const gap = Math.round(12 * scaleFactor);
    const activeAlpha = 0.6;
    const inactiveAlpha = 0.2;

    // Build full labels first to check if they fit
    const fullLabels = allHints.map(([icon, label]) => `${icon} ${label}`);
    const measureText = this.add.text(0, 0, fullLabels.join('   '), this.footerHintStyle).setVisible(false);
    const totalWidth = measureText.width;
    measureText.destroy();

    const hintsLeftEdge = width - rightMargin - totalWidth;
    const useCompact = hintsLeftEdge < this.footerGithubRight + 16;
    
    // Place hints right-to-left
    let cursorX = width - rightMargin;
    let hintsLeftX = cursorX;
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
        const iconMeasure = this.add.text(0, 0, icon, this.footerHintStyle).setVisible(false);
        const iconWidth = iconMeasure.width;
        iconMeasure.destroy();
        const r = Math.round(hint.height * 0.7);
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
      hintsLeftX = cursorX + gap; // left edge of last placed hint
    }

    // Single tooltip zone spanning all hints
    const tooltipData = allHints.map(([icon, , avail, keyOn, keyOff]) => ({
      text: `${icon}  ${t(avail ? keyOn : keyOff)}`,
      available: avail,
    }));
    // Tight zone for mouse hover (matches visual hint area)
    const hoverX = hintsLeftX;
    const hoverW = width - rightMargin - hintsLeftX;
    const hoverH = 32;
    const hoverZone = this.add.zone(hoverX, this.footerHintY, hoverW, hoverH)
      .setOrigin(0, 0.5).setDepth(13).setInteractive({ useHandCursor: false });
    this.inputHintTexts.push(hoverZone);

    // Large padded zone for touch/click
    const zonePad = 48;
    const zoneX = hintsLeftX - zonePad;
    const zoneW = width - rightMargin - hintsLeftX + zonePad * 2;
    const zoneH = hoverH + zonePad * 2;
    const touchZone = this.add.zone(zoneX, this.footerHintY, zoneW, zoneH)
      .setOrigin(0, 0.5).setDepth(12).setInteractive({ useHandCursor: false });
    this.inputHintTexts.push(touchZone);

    const tooltipAboveY = this.footerHintY - hoverH / 2;
    let touchShowTime = 0;

    hoverZone.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) return;
      this.showInputTooltip(tooltipData, width - rightMargin, tooltipAboveY);
    });
    hoverZone.on('pointerout', () => { this.destroyInputTooltip(); });

    touchZone.on('pointerdown', () => {
      touchShowTime = Date.now();
      this.showInputTooltip(tooltipData, width - rightMargin, tooltipAboveY);
    });
    touchZone.on('pointerup', () => {
      const elapsed = Date.now() - touchShowTime;
      const minDisplay = 1500;
      if (elapsed >= minDisplay) {
        this.destroyInputTooltip();
      } else {
        this.time.delayedCall(minDisplay - elapsed, () => this.destroyInputTooltip());
      }
    });
  }

  private showInputTooltip(items: { text: string; available: boolean }[], rightX: number, aboveY: number): void {
    this.destroyInputTooltip();
    const padding = 10;
    const lineGap = 6;
    const style = {
      fontFamily: this.footerHintStyle.fontFamily as string,
      fontSize: this.footerHintStyle.fontSize as string,
    };

    // Measure lines to get actual text height and max width
    const measured: { text: string; available: boolean; w: number; h: number }[] = [];
    let maxW = 0;
    for (const item of items) {
      const m = this.add.text(0, 0, item.text, style).setVisible(false);
      measured.push({ ...item, w: m.width, h: m.height });
      maxW = Math.max(maxW, m.width);
      m.destroy();
    }

    const totalTextH = measured.reduce((s, m) => s + m.h, 0) + lineGap * (measured.length - 1);
    const panelW = maxW + padding * 2;
    const panelH = totalTextH + padding * 2;
    const panelX = rightX - panelW;
    const panelY = aboveY - panelH - 4;

    // Background
    const bg = this.add.graphics().setDepth(11);
    bg.fillStyle(0x1a2a3a, 0.92);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 4);
    bg.lineStyle(1, 0x4a6a8a, 0.5);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);
    this.inputTooltipObjects.push(bg);

    // Lines with availability-based styling
    let y = panelY + padding;
    for (const item of measured) {
      const label = this.add.text(panelX + padding, y, item.text, {
        ...style,
        color: item.available ? THEME.colors.textPrimary : '#667788',
      }).setOrigin(0, 0).setDepth(12);
      this.inputTooltipObjects.push(label);
      y += item.h + lineGap;
    }
  }

  private destroyInputTooltip(): void {
    this.inputTooltipObjects.forEach(o => { if (o.active) o.destroy(); });
    this.inputTooltipObjects = [];
  }

  update(time: number, delta: number): void {
    this.wildlife.update(time, delta);
    this.gamepadNav.update(delta);
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
    // Music persists across scenes (singleton) — no stop here
    // Close any open overlay dialog before teardown
    if (this.overlay.open) this.overlay.close();
    this.input.keyboard?.removeAllListeners();
    this.input.off('wheel');
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.scale.off('resize', this.handleResize, this);
    if (this.gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadConnectHandler);
      this.gamepadConnectHandler = null;
    }
    this.wildlife.destroy();
  }




  private startGame(level: number = 0): void {
    const game = this.game;
    this.scene.stop('MenuScene');
    resetGameScenes(game, 'GameScene', { level });
  }

  private showLevelSelect(): void {
    const game = this.game;
    this.scene.stop('MenuScene');
    resetGameScenes(game, 'LevelSelectScene');
  }

  private confirmNewGame(): void {
    // Mark tutorial as done before clearing progress (for skip prompt on replay)
    setString(STORAGE_KEYS.TUTORIAL_DONE, '1');
    clearProgress();
    this.startGame(0);
  }

  private showHowToPlay(): void {
    // Check for gamepad
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    
    // On devices with both touch and keyboard, show keyboard (primary on desktop)
    // Only show touch-specific hints on touch-only devices (no physical keyboard)
    const hasTouch = detectTouch();
    const mobile = isMobile();
    const showTouchHints = hasTouch && mobile && !hasGamepad;
    const keys = getMovementKeysString(); // e.g., "WASD" or "ZQSD"
    const groomKey = getGroomKeyName(); // e.g., "SPACE" or rebound key
    const winchKey = getWinchKeyName(); // e.g., "SHIFT" or rebound key
    
    let moveHint: string;
    let groomHint: string;
    let winchHint: string;
    
    if (hasGamepad) {
      // Gamepad connected - show gamepad controls
      moveHint = '🎮 ' + (t('howToPlayMoveGamepad') || 'Left stick or D-pad to move');
      groomHint = `❄️ ${getButtonName(loadGamepadBindings().groom, getConnectedControllerType())} ` + (t('howToPlayGroomGamepad') || 'to groom snow');
      winchHint = `🔗 ${getButtonName(loadGamepadBindings().winch, getConnectedControllerType())} ` + (t('howToPlayWinchGamepad') || 'near an anchor for winch');
    } else if (showTouchHints) {
      moveHint = '🚜 ' + (t('howToPlayMoveTouch') || 'Use the virtual D-pad');
      groomHint = '❄️ ' + (t('howToPlayGroomTouch') || 'Tap the groom button');
      winchHint = '🔗 ' + (t('howToPlayWinchTouch') || 'Hold 🔗 near an anchor for winch');
    } else if (hasTouch) {
      // PC with touchscreen - show both (use localized string with key placeholder)
      const moveText = t('howToPlayMoveHybrid') || `${keys}/Arrows or touch D-pad`;
      moveHint = '🚜 ' + moveText.replace('{keys}', keys);
      const groomText = t('howToPlayGroomHybrid') || `${groomKey} or tap the groom button`;
      groomHint = '❄️ ' + groomText.replace('{groomKey}', groomKey);
      const winchText = t('howToPlayWinchHybrid') || `${winchKey} or hold 🔗 near an anchor`;
      winchHint = '🔗 ' + winchText.replace('{winchKey}', winchKey);
    } else {
      // Keyboard only - use localized string with key placeholder
      const moveText = t('howToPlayMove') || `${keys} or Arrows to move`;
      moveHint = '🚜 ' + moveText.replace('{keys}', keys);
      const groomText = t('howToPlayGroom') || `${groomKey} to groom snow`;
      groomHint = '❄️ ' + groomText.replace('{groomKey}', groomKey);
      const winchText = t('howToPlayWinch') || `${winchKey} near an anchor for winch`;
      winchHint = '🔗 ' + winchText.replace('{winchKey}', winchKey);
    }
    
    this.overlay.show('howToPlay', [
      moveHint,
      '',
      groomHint,
      '',
      winchHint,
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

}
