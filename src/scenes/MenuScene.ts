import Phaser from 'phaser';
import { t, Accessibility, TRANSLATIONS, getLanguage as getCurrentLanguage } from '../setup';
import { getMovementKeysString, getGroomKeyName } from '../utils/keyboardLayout';
import { getSavedProgress, clearProgress } from '../utils/gameProgress';
import { loadGamepadBindings, getButtonName, getConnectedControllerType } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, type MenuButtonNav } from '../utils/menuButtonNav';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch, onTouchAvailable, isMobile } from '../utils/touchDetect';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';
import { OverlayManager } from '../utils/overlayManager';

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
  private snowLineY = 0;
  private inputHintTexts: Phaser.GameObjects.GameObject[] = [];
  private gamepadConnectHandler: (() => void) | null = null;
  private footerGithubRight = 0;
  private footerHintStyle: Phaser.Types.GameObjects.Text.TextStyle = {};
  private footerHintY = 0;
  
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.overlay = new OverlayManager(this);
    this.wildlife = new MenuWildlifeController(this);
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
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, footerHeight + safeAreaBottom, scaleFactor);
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
      this.wildlife.menuZone = {
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

    const mobile = isMobile();
    const hasTouch = detectTouch();
    const hasGamepad = navigator.getGamepads && Array.from(navigator.getGamepads()).some(g => g !== null);

    // Define all hints: [icon, label, isAvailable] — always show all three
    const allHints: [string, string, boolean][] = [
      ['💻', 'Keyboard', !mobile],
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
    // Close any open overlay dialog before teardown
    if (this.overlay.open) this.overlay.close();
    this.input.keyboard?.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
    if (this.gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadConnectHandler);
      this.gamepadConnectHandler = null;
    }
    this.wildlife.destroy();
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
    const mobile = isMobile();
    const showTouchHints = hasTouch && mobile && !hasGamepad;
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

}
