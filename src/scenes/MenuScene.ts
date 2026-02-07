import Phaser from 'phaser';
import { t, Accessibility, TRANSLATIONS, getLanguage as getCurrentLanguage } from '../setup';
import { getMovementKeysString, getGroomKeyName } from '../utils/keyboardLayout';
import { getSavedProgress, clearProgress } from '../utils/gameProgress';
import { loadGamepadBindings, getButtonName, getConnectedControllerType } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, type MenuButtonNav } from '../utils/menuButtonNav';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch } from '../utils/touchDetect';

/**
 * Les Aiguilles Blanches - Menu Scene
 * Main menu with game start, settings, and controls
 */

export default class MenuScene extends Phaser.Scene {
  private overlayOpen = false;
  private overlayCloseCallback: (() => void) | null = null;
  private snowflakes: { rect: Phaser.GameObjects.Rectangle; speed: number; wobbleOffset: number }[] = [];
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
    this.overlayOpen = false;
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
    
    const titleSize = Math.round(40 * scaleFactor);
    // Ensure subtitle is legible on mobile (boost on portrait)
    const subtitleSize = isPortrait
      ? Math.max(14, Math.round(20 * scaleFactor))
      : Math.max(12, Math.round(16 * scaleFactor));
    const buttonSize = Math.round(18 * scaleFactor);
    // Ensure buttons meet 44px minimum touch target height
    const minTouchTarget = 44;
    // Tighter padding on portrait to save vertical space
    const basePadding = isPortrait ? 8 : 12;
    const buttonPadding = Math.max(Math.round(basePadding * scaleFactor), Math.ceil((minTouchTarget - buttonSize) / 2));

    // Snow line adapts to aspect ratio
    const snowLinePct = isPortrait ? 0.82 : 0.78;
    const snowLineY = height * snowLinePct;
    this.snowLineY = snowLineY;
    const footerHeight = Math.round(36 * scaleFactor);
    // Safe area padding for modern phones with gesture bars
    const safeAreaBottom = isPortrait ? Math.round(20 * scaleFactor) : 0;

    // Sky gradient — bands proportional to snow line
    const skyBand1 = snowLineY * 0.4;
    const skyBand2 = snowLineY * 0.25;
    this.add.rectangle(width / 2, 0, width, skyBand1, 0x5bb8e8).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, skyBand1, width, skyBand2, 0x87ceeb).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, skyBand1 + skyBand2, width, snowLineY - skyBand1 - skyBand2, 0xa8ddf0).setOrigin(0.5, 0);

    // Mountains — stepped pixel pyramids with rock colors
    this.createMountains(width, height, snowLineY, scaleFactor);

    // Snow ground — white with grooming texture
    this.add.rectangle(width / 2, snowLineY, width, height - snowLineY, 0xffffff).setOrigin(0.5, 0);
    // Subtle grooming lines
    const g = this.add.graphics();
    g.fillStyle(0xf0f6fa, 1);
    for (let ly = snowLineY + 8; ly < height - footerHeight; ly += 10) {
      g.fillRect(0, ly, width, 1);
    }
    // Snow edge highlight
    this.add.rectangle(width / 2, snowLineY, width, 3, 0xd8e4e8).setOrigin(0.5, 0);

    // Trees on snow line
    this.createTrees(width, snowLineY, scaleFactor);

    // Parked groomer on the snow
    this.createGroomer(width, snowLineY, scaleFactor);

    // Animated snow particles
    this.createSnowParticles(width, snowLineY);

    // Title — adapts to aspect ratio
    const titleY = isPortrait ? height * 0.08 : height * 0.12;
    const titleBgWidth = Math.round(Math.min(520 * scaleFactor, width - 20));
    const titleBgHeight = Math.round(80 * scaleFactor);
    // Title background — softer semi-transparent with pixel border
    this.add.rectangle(width / 2, titleY, titleBgWidth + 8, titleBgHeight + 8, 0x2d2822, 0.45).setOrigin(0.5);
    this.add.rectangle(width / 2, titleY, titleBgWidth, titleBgHeight, 0x1a2a3e, 0.4).setOrigin(0.5);
    // Light pixel border for definition
    const tbg = this.add.graphics();
    tbg.lineStyle(2, 0x87ceeb, 0.5);
    tbg.strokeRect(width / 2 - titleBgWidth / 2, titleY - titleBgHeight / 2, titleBgWidth, titleBgHeight);
    // Shadow text
    this.add.text(width / 2 + 3, titleY + 3, 'Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#2d2822',
    }).setOrigin(0.5);
    this.add.text(width / 2, titleY, 'Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const subtitleText = t('subtitle') || 'Snow Groomer Simulation';
    // Ribbon hangs below the title box, slightly overlapping its bottom edge
    const subtitleY = titleY + titleBgHeight / 2 + Math.round(12 * scaleFactor);
    // Measure subtitle text width for ribbon sizing
    const subtitleMeasure = this.add.text(0, -100, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
    });
    const stw = subtitleMeasure.width;
    subtitleMeasure.destroy();
    // Ribbon banner behind subtitle
    const ribbonH = Math.round(subtitleSize * 1.8);
    const ribbonW = stw + Math.round(40 * scaleFactor);
    const ribbonTabW = Math.round(14 * scaleFactor);
    const notchH = Math.round(ribbonH * 0.2);
    const foldW = Math.round(4 * scaleFactor);
    const stripe = Math.round(3 * scaleFactor);
    const ribbonG = this.add.graphics();
    const cx = width / 2;
    const rTop = subtitleY - ribbonH / 2;
    const rBot = subtitleY + ribbonH / 2;
    const tabInset = Math.round(ribbonH * 0.12);
    // Back tabs (darker, slightly inset vertically)
    ribbonG.fillStyle(0x8b1a1a, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - ribbonTabW, rTop + tabInset, ribbonTabW, ribbonH - tabInset * 2);
    ribbonG.fillRect(cx + ribbonW / 2, rTop + tabInset, ribbonTabW, ribbonH - tabInset * 2);
    // V-notch cuts on tab ends (use sky color to punch out notch)
    ribbonG.fillStyle(0x87ceeb, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - ribbonTabW, subtitleY - notchH / 2, foldW, notchH);
    ribbonG.fillRect(cx + ribbonW / 2 + ribbonTabW - foldW, subtitleY - notchH / 2, foldW, notchH);
    // Fold shadows (small dark rects where ribbon folds behind — no fillTriangle for Firefox)
    ribbonG.fillStyle(0x550000, 1);
    ribbonG.fillRect(cx - ribbonW / 2 - foldW, rTop + tabInset, foldW, ribbonH - tabInset * 2);
    ribbonG.fillRect(cx + ribbonW / 2, rTop + tabInset, foldW, ribbonH - tabInset * 2);
    // Drop shadow under ribbon for depth
    ribbonG.fillStyle(0x000000, 0.15);
    ribbonG.fillRect(cx - ribbonW / 2 + 3, rBot + 1, ribbonW, Math.round(3 * scaleFactor));
    // Main ribbon body
    ribbonG.fillStyle(0xcc2200, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rTop, ribbonW, ribbonH);
    // Ribbon highlight stripe (top edge)
    ribbonG.fillStyle(0xe63e1a, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rTop, ribbonW, stripe);
    // Ribbon shadow stripe (bottom edge)
    ribbonG.fillStyle(0x991a00, 1);
    ribbonG.fillRect(cx - ribbonW / 2, rBot - stripe, ribbonW, stripe);
    // Inner border (gold lines)
    ribbonG.fillStyle(0xFFD700, 0.35);
    ribbonG.fillRect(cx - ribbonW / 2 + stripe, rTop + stripe + 1, ribbonW - stripe * 2, 1);
    ribbonG.fillRect(cx - ribbonW / 2 + stripe, rBot - stripe - 2, ribbonW - stripe * 2, 1);
    // Subtitle text with shadow
    this.add.text(cx + 2, subtitleY + 2, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
      color: '#660000',
    }).setOrigin(0.5);
    this.add.text(cx, subtitleY, subtitleText, {
      fontFamily: THEME.fonts.family,
      fontSize: subtitleSize + 'px',
      color: '#FFD700',
    }).setOrigin(0.5);

    // Check for saved progress
    const savedProgress = getSavedProgress();
    const hasProgress = savedProgress !== null && savedProgress.currentLevel > 0;

    // Build button list
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

    // Menu buttons — positioned between title and footer/snow line
    const menuStartY = subtitleY + ribbonH / 2 + 15 * scaleFactor;
    const menuEndY = Math.min(snowLineY, height - footerHeight - safeAreaBottom) - 10 * scaleFactor;
    const menuAvailableH = menuEndY - menuStartY;
    const minButtonHeight = buttonSize + buttonPadding * 2;
    const minSpacing = minButtonHeight + (isPortrait ? 4 : 10); // comfortable gap between buttons
    // Drop fullscreen button if all buttons can't fit in available vertical space
    if (buttonDefs.length * minSpacing > menuAvailableH) {
      const fsIdx = buttonDefs.findIndex(b => b.text === 'fullscreen' || b.text === 'exitFullscreen');
      if (fsIdx !== -1) buttonDefs.splice(fsIdx, 1);
    }
    const buttonSpacing = Math.max(minSpacing, Math.min(Math.round(46 * scaleFactor), Math.round(menuAvailableH / (buttonDefs.length + 0.5))));
    const menuY = menuStartY + buttonSpacing * 0.5;

    // Store buttons for gamepad navigation
    this.menuButtons = [];
    this.buttonShadows = [];
    this.buttonCallbacks = [];

    // Selection arrow
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
      
      // Uniform blue theme with slight emphasis on primary
      const bgColor = btn.primary ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
      const shadowColor = btn.primary ? '#115511' : '#1a3a5c';

      // Shadow rectangle (darker offset)
      const shadow = this.add.text(width / 2 + shadowOffset, yPos + shadowOffset, btnText, {
        fontFamily: THEME.fonts.family,
        fontSize: buttonSize + 'px',
        color: '#ffffff',
        backgroundColor: shadowColor,
        padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
      }).setOrigin(0.5).setAlpha(0.6);

      // Main button
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
          btn.callback();
        });
      
      this.menuButtons.push(button);
      this.buttonShadows.push(shadow);
      this.buttonCallbacks.push(btn.callback);
    });

    // Create button nav with custom styler for shadows + arrow
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
      { canNavigate: () => !this.overlayOpen },
    );
    this.buttonNav.refreshStyles();

    // Footer — dark panel strip (lifted by safe area on portrait mobile)
    const footerTop = height - footerHeight - safeAreaBottom;
    this.add.rectangle(width / 2, footerTop, width, footerHeight + safeAreaBottom, THEME.colors.dialogBg).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, footerTop, width, 2, THEME.colors.border).setOrigin(0.5, 0);
    
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
    const footerFontSize = Math.round(Math.max(11, 13 * scaleFactor));
    const githubLink = this.add.text(width / 2, footerTop + footerHeight / 2 - Math.round(7 * scaleFactor), `GitHub  ·  v${version}`, {
      fontFamily: THEME.fonts.family,
      fontSize: footerFontSize + 'px',
      color: THEME.colors.info,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => githubLink.setColor(THEME.colors.accent))
      .on('pointerout', () => githubLink.setColor(THEME.colors.info))
      .on('pointerdown', () => {
        window.open('https://github.com/antoinecellerier/les-aiguilles-blanches', '_blank');
      });

    this.add.text(width / 2, footerTop + footerHeight / 2 + Math.round(7 * scaleFactor), t('madeIn'), {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(Math.max(10, 12 * scaleFactor)) + 'px',
      color: THEME.colors.accent,
    }).setOrigin(0.5);

    // Input method hints — individual text objects for per-hint alpha
    this.footerGithubRight = githubLink.x + githubLink.width / 2;
    this.footerHintY = footerTop + footerHeight / 2;
    this.footerHintStyle = {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(Math.max(11, 13 * scaleFactor)) + 'px',
      color: THEME.colors.info,
    };
    this.updateInputHints();

    // Update hints when gamepad connects/disconnects
    this.gamepadConnectHandler = () => this.updateInputHints();
    window.addEventListener('gamepadconnected', this.gamepadConnectHandler);
    window.addEventListener('gamepaddisconnected', this.gamepadConnectHandler);

    // Keyboard navigation
    this.input.keyboard?.on('keydown-UP', () => this.buttonNav.navigate(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.buttonNav.navigate(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.buttonNav.activate());
    this.input.keyboard?.on('keydown-SPACE', () => this.buttonNav.activate());

    // Initialize gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => {
        if (this.overlayOpen) { this.overlayCloseCallback?.(); return; }
        this.buttonNav.activate();
      },
      onBack: () => { if (this.overlayOpen) this.overlayCloseCallback?.(); },
    });
    this.gamepadNav.initState();

    this.scale.on('resize', this.handleResize, this);

    Accessibility.announce((t('subtitle') || '') + ' - ' + (t('startGame') || ''));
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
        .setAlpha(available ? activeAlpha : inactiveAlpha);
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
        const gfx = this.add.graphics();
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
    // Animate snow particles
    for (const flake of this.snowflakes) {
      flake.rect.y += flake.speed * (delta / 16);
      flake.rect.x += Math.sin(time / 1000 + flake.wobbleOffset) * 0.3;
      if (flake.rect.y > this.snowLineY) {
        flake.rect.y = -4;
        flake.rect.x = Phaser.Math.Between(0, this.cameras.main.width);
      }
    }

    // Gamepad support for menu
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
    this.input.keyboard?.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
    if (this.gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this.gamepadConnectHandler);
      window.removeEventListener('gamepaddisconnected', this.gamepadConnectHandler);
      this.gamepadConnectHandler = null;
    }
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

  private createMountains(width: number, height: number, snowLineY: number, scaleFactor: number): void {
    const sx = width / 1024;
    // Mountain heights scale with available sky space so they fill on all aspect ratios
    const mtnScale = snowLineY / 600;
    // Far mountains — dark rock, tall
    this.drawSteppedMountain(80 * sx, snowLineY, 180 * mtnScale, 220 * mtnScale, 0x4a423a, 0x6a5e52, true);
    this.drawSteppedMountain(350 * sx, snowLineY, 200 * mtnScale, 320 * mtnScale, 0x2d2822, 0x4a423a, true);
    this.drawSteppedMountain(512 * sx, snowLineY, 240 * mtnScale, 300 * mtnScale, 0x4a423a, 0x6a5e52, true);
    this.drawSteppedMountain(600 * sx, snowLineY, 220 * mtnScale, 380 * mtnScale, 0x4a423a, 0x6a5e52, true);
    this.drawSteppedMountain(900 * sx, snowLineY, 190 * mtnScale, 260 * mtnScale, 0x2d2822, 0x4a423a, true);

    // Near mountains — lighter, shorter, partial overlap
    this.drawSteppedMountain(200 * sx, snowLineY, 240 * mtnScale, 160 * mtnScale, 0x6a5e52, 0x8a7e6a, false);
    this.drawSteppedMountain(750 * sx, snowLineY, 260 * mtnScale, 180 * mtnScale, 0x6a5e52, 0x8a7e6a, false);
  }

  private drawSteppedMountain(cx: number, baseY: number, baseWidth: number, peakHeight: number, bodyColor: number, highlightColor: number, snowCap: boolean): void {
    const stepH = 16;
    const steps = Math.ceil(peakHeight / stepH);
    // Start 2 steps below baseY to overlap with snow ground (no gap)
    for (let i = -2; i < steps; i++) {
      const t = Math.max(0, i) / steps;
      const w = baseWidth * (1 - t * 0.85);
      const y = baseY - i * stepH;
      const color = i % 3 === 0 ? highlightColor : bodyColor;
      this.add.rectangle(cx, y, w, stepH, color).setOrigin(0.5, 1);
    }
    if (snowCap && peakHeight > 150) {
      const capSteps = Math.max(2, Math.min(4, Math.floor(steps * 0.12)));
      for (let i = 0; i < capSteps; i++) {
        const t = (steps - capSteps + i) / steps;
        const w = baseWidth * (1 - t * 0.85);
        const y = baseY - (steps - capSteps + i) * stepH;
        this.add.rectangle(cx, y, w, stepH, 0xf0f5f8).setOrigin(0.5, 1);
      }
    }
  }

  private createTrees(width: number, snowLineY: number, scaleFactor: number): void {
    const sx = width / 1024;
    // Clustered, varied positions — not evenly spaced
    const treePositions = [
      40 * sx, 100 * sx, 130 * sx, 220 * sx, 310 * sx,
      width - 40 * sx, width - 110 * sx, width - 170 * sx, width - 260 * sx,
    ];
    for (const tx of treePositions) {
      const s = (0.7 + Math.random() * 0.7) * scaleFactor;
      const g = this.add.graphics();
      g.fillStyle(0x228b22);
      g.fillRect(tx - 5 * s, snowLineY - 24 * s, 10 * s, 8 * s);
      g.fillRect(tx - 9 * s, snowLineY - 16 * s, 18 * s, 8 * s);
      g.fillRect(tx - 13 * s, snowLineY - 8 * s, 26 * s, 10 * s);
      g.fillStyle(0x8b4513);
      g.fillRect(tx - 3 * s, snowLineY, 6 * s, 10 * s);
    }
  }

  private createGroomer(width: number, snowLineY: number, scaleFactor: number): void {
    const sx = width / 1024;
    const gx = width / 2 + 140 * sx;
    const s = 2.0 * scaleFactor;
    const g = this.add.graphics();
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
    
    this.showOverlay('howToPlay', [
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
    this.showOverlay('changelog', entries);
  }

  private showControls(): void {
    // Detect capabilities
    const hasTouch = detectTouch();
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const keys = getMovementKeysString(); // e.g., "WASD" or "ZQSD"
    
    if (isMobile && hasTouch) {
      // Mobile-only: show touch controls
      this.showOverlay('controls', [
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
      this.showOverlay('controls', [
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
      this.showOverlay('controls', [
        `⬆️ ${keys} / Arrows - Move`,
        '⏺️ SPACE - Groom',
        '🔗 SHIFT - Winch',
        '⏸️ ESC - Pause',
        '',
        '🎮 Gamepad supported',
      ]);
    }
  }

  private showOverlay(titleKey: string, lines: string[]): void {
    this.overlayOpen = true;
    const { width, height } = this.cameras.main;

    // Count actual rendered lines (entries may contain \n)
    const fullText = lines.join('\n');
    const renderedLines = fullText.split('\n').filter(l => l.trim()).length + 3;
    const availableHeight = height * 0.85;
    const optimalLineHeight = availableHeight / renderedLines;
    const optimalFontSize = optimalLineHeight / 2.2;
    const fontSize = Math.round(Math.max(10, Math.min(28, optimalFontSize)));
    const titleSize = Math.round(fontSize * 1.4);
    const scaleFactor = fontSize / 18;

    const panelWidth = Math.min(700 * scaleFactor, width - 40);

    // Create dialog using rexUI
    const dialog = this.rexUI.add.dialog({
      x: width / 2,
      y: height / 2,
      width: panelWidth,
      background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1a2a3e).setStrokeStyle(4, 0x3d7a9b),
      title: this.add.text(0, 0, t(titleKey) || titleKey, {
        fontFamily: THEME.fonts.family,
        fontSize: titleSize + 'px',
        fontStyle: 'bold',
        color: '#87CEEB',
      }),
      content: this.add.text(0, 0, lines.join('\n'), {
        fontFamily: THEME.fonts.family,
        fontSize: fontSize + 'px',
        color: '#cccccc',
        align: 'center',
        lineSpacing: Math.round(fontSize * 0.6),
        wordWrap: { width: panelWidth - 60 },
      }),
      actions: [
        this.createDialogButton('← ' + (t('back') || 'Back'), fontSize, scaleFactor)
      ],
      space: {
        title: Math.round(fontSize * 1.5),
        content: Math.round(fontSize * 1.5),
        action: Math.round(fontSize * 0.8),
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
      align: { actions: 'center' },
      expand: { content: false },
    }).layout();

    // Dark overlay behind dialog — setInteractive() to block pointer events on buttons underneath
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    overlay.setInteractive();
    overlay.setDepth(dialog.depth - 1);

    // ESC, ENTER, or SPACE to close
    const closeOverlay = () => {
      this.overlayOpen = false;
      this.overlayCloseCallback = null;
      this.input.keyboard?.off('keydown-ESC', closeOverlay);
      this.input.keyboard?.off('keydown-ENTER', closeOverlay);
      this.input.keyboard?.off('keydown-SPACE', closeOverlay);
      overlay.destroy();
      dialog.destroy();
    };
    this.overlayCloseCallback = closeOverlay;
    this.input.keyboard?.on('keydown-ESC', closeOverlay);
    this.input.keyboard?.on('keydown-ENTER', closeOverlay);
    this.input.keyboard?.on('keydown-SPACE', closeOverlay);

    // Handle button click
    dialog.on('button.click', closeOverlay);
  }

  private createDialogButton(text: string, fontSize: number, scaleFactor: number): Phaser.GameObjects.Text {
    const btn = this.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: Math.round(30 * scaleFactor), y: Math.round(10 * scaleFactor) },
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#FF3300' }))
      .on('pointerout', () => btn.setStyle({ backgroundColor: '#CC2200' }));
    return btn;
  }
}
