import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle, titleStyle } from '../config/theme';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, ctaStyler, type MenuButtonNav } from '../utils/menuButtonNav';
import { resetGameScenes } from '../utils/sceneTransitions';
import { GAME_EVENTS } from '../types/GameSceneInterface';
import { hasTouch as detectTouch } from '../utils/touchDetect';

/**
 * Les Aiguilles Blanches - Pause Scene
 * Pause menu overlay
 */

interface PauseSceneData {
  levelIndex: number;
}

export default class PauseScene extends Phaser.Scene {
  private levelIndex = 0;
  private inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: PauseSceneData): void {
    this.levelIndex = data.levelIndex;
    this.inputReady = false;
  }

  create(): void {
    // Bring pause menu to top so it renders above dialogue and HUD
    this.scene.bringToTop();
    
    const { width, height } = this.cameras.main;
    const isTouch = detectTouch();
    const minTouchTarget = isTouch ? 44 : 28;

    // Responsive scaling
    const scaleX = width / 1024;
    const scaleY = height / 768;
    const scaleFactor = Math.max(0.55, Math.min(1.5, Math.min(scaleX, scaleY)));

    const panelWidth = Math.min(Math.round(300 * scaleFactor), width - 20);
    const fontSize = Math.max(14, Math.round(18 * scaleFactor));
    const titleFontSize = Math.max(18, Math.round(28 * scaleFactor));
    const buttonPadY = Math.max(Math.round(8 * scaleFactor), Math.ceil((minTouchTarget - fontSize) / 2));
    const buttonSpacing = Math.max(6, Math.round(12 * scaleFactor));
    const buttonH = fontSize + buttonPadY * 2;
    const panelHeight = Math.min(Math.round(titleFontSize + 30 * scaleFactor + (buttonH + buttonSpacing) * 4 + 20 * scaleFactor), height - 20);

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.overlayDim, THEME.opacity.overlay);

    // Panel
    this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, THEME.colors.panelBg, THEME.opacity.panelBg);

    // Title
    const tStyle = titleStyle();
    tStyle.fontSize = titleFontSize + 'px';
    this.add.text(width / 2, height / 2 - panelHeight / 2 + Math.round(20 * scaleFactor), t('pauseTitle') || 'Paused', tStyle)
      .setOrigin(0.5);

    // Buttons
    const btnStyle = buttonStyle();
    btnStyle.fontSize = fontSize + 'px';
    btnStyle.padding = { x: Math.round(40 * scaleFactor), y: buttonPadY };

    const buttonDefs = [
      { text: 'resume', callback: () => this.resumeGame(), isCTA: true },
      { text: 'restart', callback: () => this.restartLevel(), isCTA: false },
      { text: 'settings', callback: () => this.openSettings(), isCTA: false },
      { text: 'quit', callback: () => this.quitToMenu(), isCTA: false },
    ];

    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];

    const firstButtonY = height / 2 - panelHeight / 2 + titleFontSize + Math.round(40 * scaleFactor);

    buttonDefs.forEach((btn, i) => {
      const style = { ...btnStyle };
      if (btn.isCTA) style.backgroundColor = THEME.colors.buttonCTAHex;
      const button = this.add.text(width / 2, firstButtonY + i * (buttonH + buttonSpacing), t(btn.text) || btn.text, style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.buttonNav.select(i))
        .on('pointerout', () => this.buttonNav.refreshStyles())
        .on('pointerdown', btn.callback);
      
      this.menuButtons.push(button);
      this.buttonCallbacks.push(btn.callback);
      this.buttonIsCTA.push(btn.isCTA);
    });

    this.buttonNav = createMenuButtonNav(
      this.menuButtons, this.buttonCallbacks, ctaStyler(this.buttonIsCTA),
    );
    this.buttonNav.refreshStyles();

    // Keyboard navigation
    this.input.keyboard?.on('keydown-UP', () => this.buttonNav.navigate(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.buttonNav.navigate(1));
    this.input.keyboard?.on('keydown-ENTER', () => { if (this.inputReady) this.buttonNav.activate(); });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.inputReady) this.resumeGame(); });

    // Initialize gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => { if (this.inputReady) this.buttonNav.activate(); },
      onBack: () => { if (this.inputReady) this.resumeGame(); },
    });
    this.gamepadNav.initState();
    // Track Start button separately (also resumes)
    this.gamepadStartPressed = false;
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) this.gamepadStartPressed = pad.buttons[9]?.pressed || false;
    }

    Accessibility.announce(t('pauseTitle'));
    
    // Delay accepting input to prevent held ESC from immediately resuming
    this.inputReady = false;
    this.inputReadyTimer = this.time.delayedCall(300, () => { this.inputReady = true; });

    this.lastResizeWidth = width;
    this.lastResizeHeight = height;
    this.scale.on('resize', this.handleResize, this);
  }

  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private buttonNav!: MenuButtonNav;
  private gamepadNav!: GamepadMenuNav;
  private gamepadStartPressed = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastResizeWidth = 0;
  private lastResizeHeight = 0;

  /** Expose for tests */
  get selectedIndex(): number { return this.buttonNav?.selectedIndex ?? 0; }

  private handleResize(): void {
    if (!this.cameras?.main) return;
    const { width, height } = this.cameras.main;
    if (Math.abs(width - this.lastResizeWidth) < 10 && Math.abs(height - this.lastResizeHeight) < 10) {
      return;
    }
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      if (this.scene.isActive()) {
        this.lastResizeWidth = width;
        this.lastResizeHeight = height;
        this.scene.restart({ levelIndex: this.levelIndex });
      }
    }, 300);
  }

  update(_time: number, delta: number): void {
    this.gamepadNav.update(delta);
    // Start button also resumes (in addition to Back handled by gamepadNav)
    if (this.inputReady && this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        const startPressed = pad.buttons[9]?.pressed ?? false;
        if (startPressed && !this.gamepadStartPressed) {
          this.resumeGame();
        }
        this.gamepadStartPressed = startPressed;
      }
    }
  }

  private resumeGame(): void {
    this.scene.stop();
    this.game.events.emit(GAME_EVENTS.RESUME_REQUEST);
  }

  private restartLevel(): void {
    resetGameScenes(this.game, 'GameScene', { level: this.levelIndex });
  }

  private openSettings(): void {
    // Keep GameScene paused; just stop overlays and open Settings
    const game = this.game;
    const levelIndex = this.levelIndex;
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('PauseScene');
    game.scene.start('SettingsScene', { returnTo: 'PauseScene', levelIndex });
    game.scene.bringToTop('SettingsScene');
  }

  private quitToMenu(): void {
    resetGameScenes(this.game, 'MenuScene');
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    if (this.resizeTimer) { clearTimeout(this.resizeTimer); this.resizeTimer = null; }
    this.input.keyboard?.removeAllListeners();
    
    // Clean up inputReady timer if scene shutdown before it fires
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
  }
}
