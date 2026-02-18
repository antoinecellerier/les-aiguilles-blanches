import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { BALANCE } from '../config/gameConfig';
import { THEME, buttonStyle, titleStyle } from '../config/theme';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, ctaStyler, type MenuButtonNav } from '../utils/menuButtonNav';
import { playClick } from '../systems/UISounds';
import { resetGameScenes } from '../utils/sceneTransitions';
import { saveProgress } from '../utils/gameProgress';
import { GAME_EVENTS } from '../types/GameSceneInterface';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { isGamepadButtonPressed, captureGamepadButtons } from '../utils/gamepad';
import { ResizeManager } from '../utils/resizeManager';
import { isDesktopApp, quitDesktopApp } from '../types/electron';
import { getContractSession, startContractSession } from '../systems/ContractSession';
import { generateValidContractLevel, rankSeed } from '../systems/LevelGenerator';
import { seedToCode, randomSeed } from '../utils/seededRNG';

/**
 * Les Aiguilles Blanches - Pause Scene
 * Pause menu overlay
 */

interface PauseSceneData {
  levelIndex: number;
  skiMode?: boolean;
  skiRunMode?: 'ski' | 'snowboard';
}

export default class PauseScene extends Phaser.Scene {
  private levelIndex = 0;
  private skiMode = false;
  private skiRunMode: 'ski' | 'snowboard' = 'ski';
  private inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: PauseSceneData): void {
    this.levelIndex = data.levelIndex;
    this.skiMode = data.skiMode ?? false;
    this.skiRunMode = data.skiRunMode ?? 'ski';
    this.inputReady = false;
  }

  create(): void {
    this.events.once('shutdown', this.shutdown, this);

    // Bring pause menu to top so it renders above dialogue and HUD
    this.scene.bringToTop();
    
    const { width, height } = this.cameras.main;
    const isTouch = detectTouch();
    const minTouchTarget = isTouch ? 44 : 28;

    // Responsive scaling
    const scaleX = width / 1024;
    const scaleY = height / 768;
    const scaleFactor = Math.max(0.55, Math.min(1.5, Math.min(scaleX, scaleY)));

    const fontSize = Math.max(14, Math.round(18 * scaleFactor));
    const titleFontSize = Math.max(18, Math.round(28 * scaleFactor));
    const buttonPadY = Math.max(Math.round(8 * scaleFactor), Math.ceil((minTouchTarget - fontSize) / 2));
    const buttonSpacing = Math.max(6, Math.round(10 * scaleFactor));
    const buttonH = fontSize + buttonPadY * 2;
    const panelPad = Math.round(20 * scaleFactor);
    const titleGap = Math.round(16 * scaleFactor);

    const session = getContractSession();
    const isRandomRun = !!session && !session.isDaily;

    const buttonDefs = this.skiMode
      ? [
          { text: 'resume', callback: () => this.resumeGame(), isCTA: true },
          { text: 'restart', callback: () => this.restartSkiRun(), isCTA: false },
          { text: 'skipRun', callback: () => this.skipSkiRun(), isCTA: false },
          { text: 'settings', callback: () => this.openSettings(), isCTA: false },
          { text: 'quit', callback: () => this.quitToMenu(), isCTA: false },
          ...(isDesktopApp() ? [{ text: 'quitGame', callback: () => quitDesktopApp(), isCTA: false }] : []),
        ]
      : [
          { text: 'resume', callback: () => this.resumeGame(), isCTA: true },
          { text: 'restart', callback: () => this.restartLevel(), isCTA: false },
          ...(isRandomRun ? [{ text: 'newRun', callback: () => this.startNewRandomRun(), isCTA: false }] : []),
          { text: 'settings', callback: () => this.openSettings(), isCTA: false },
          { text: 'quit', callback: () => this.quitToMenu(), isCTA: false },
          ...(isDesktopApp() ? [{ text: 'quitGame', callback: () => quitDesktopApp(), isCTA: false }] : []),
    ];

    const buttonCount = buttonDefs.length;
    const contentHeight = titleFontSize + titleGap + (buttonH + buttonSpacing) * buttonCount - buttonSpacing;
    const panelHeight = Math.min(contentHeight + panelPad * 2, height - 20);
    const buttonWidth = Math.round(220 * scaleFactor);
    const panelWidth = Math.min(buttonWidth + panelPad * 2, width - 20);

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.overlayDim, THEME.opacity.overlay);

    // Panel
    this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, THEME.colors.panelBg, THEME.opacity.panelBg);

    // Title
    const tStyle = titleStyle();
    tStyle.fontSize = titleFontSize + 'px';
    this.add.text(width / 2, height / 2 - panelHeight / 2 + panelPad, t('pauseTitle') || 'Paused', tStyle)
      .setOrigin(0.5, 0);

    // Buttons — uniform width, centered text
    const btnStyle = buttonStyle();
    btnStyle.fontSize = fontSize + 'px';
    btnStyle.padding = { x: 0, y: buttonPadY };
    btnStyle.fixedWidth = buttonWidth;
    btnStyle.align = 'center';

    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];

    const firstButtonY = height / 2 - panelHeight / 2 + panelPad + titleFontSize + titleGap;

    buttonDefs.forEach((btn, i) => {
      const style = { ...btnStyle };
      if (btn.isCTA) style.backgroundColor = THEME.colors.buttonCTAHex;
      const button = this.add.text(width / 2, firstButtonY + i * (buttonH + buttonSpacing), t(btn.text) || btn.text, style)
        .setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.buttonNav.select(i))
        .on('pointerout', () => this.buttonNav.refreshStyles())
        .on('pointerdown', () => { playClick(); btn.callback(); });
      
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
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.inputReady) this.buttonNav.activate(); });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.inputReady) this.resumeGame(); });

    // Initialize gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => { if (this.inputReady) this.buttonNav.activate(); },
      onBack: () => { if (this.inputReady) this.resumeGame(); },
    });
    this.gamepadNav.initState();
    // Track Start button separately (also resumes)
    const padState = captureGamepadButtons(this, [9]); // 9 = Start/Menu
    this.gamepadStartPressed = padState[9];

    Accessibility.announce(t('pauseTitle'));
    
    // Delay accepting input to prevent held ESC from immediately resuming
    this.inputReady = false;
    this.inputReadyTimer = this.time.delayedCall(BALANCE.SCENE_INPUT_DELAY, () => { this.inputReady = true; });

    this.resizeManager = new ResizeManager(this, {
      restartData: () => ({ levelIndex: this.levelIndex, skiMode: this.skiMode, skiRunMode: this.skiRunMode }),
    });
    this.resizeManager.register();
  }

  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private buttonNav!: MenuButtonNav;
  private gamepadNav!: GamepadMenuNav;
  private gamepadStartPressed = false;
  private resizeManager!: ResizeManager;

  /** Expose for tests */
  get selectedIndex(): number { return this.buttonNav?.selectedIndex ?? 0; }

  update(_time: number, delta: number): void {
    this.gamepadNav.update(delta);
    // Start button also resumes (in addition to Back handled by gamepadNav)
    if (this.inputReady && this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        const startPressed = isGamepadButtonPressed(pad, 9);
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

  private restartSkiRun(): void {
    resetGameScenes(this.game, 'SkiRunScene', { level: this.levelIndex, mode: this.skiRunMode });
  }

  private skipSkiRun(): void {
    resetGameScenes(this.game, 'LevelCompleteScene', {
      won: true,
      level: this.levelIndex,
      coverage: 100,
      timeUsed: 0,
      silent: true,
    });
  }

  private openSettings(): void {
    // Keep parent scene paused; just stop overlays and open Settings
    const game = this.game;
    const levelIndex = this.levelIndex;
    const skiMode = this.skiMode;
    const skiRunMode = this.skiRunMode;
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('PauseScene');
    game.scene.start('SettingsScene', { returnTo: 'PauseScene', levelIndex, skiMode, skiRunMode });
    game.scene.bringToTop('SettingsScene');
  }

  private quitToMenu(): void {
    const session = getContractSession();
    if (session) {
      resetGameScenes(this.game, 'DailyRunsScene');
    } else {
      saveProgress(this.levelIndex, this.skiMode ? 'SkiRunScene' : 'GameScene');
      resetGameScenes(this.game, 'MenuScene');
    }
  }

  private startNewRandomRun(): void {
    const session = getContractSession();
    if (!session) return;
    const seed = randomSeed();
    const { level, usedSeed } = generateValidContractLevel(rankSeed(seed, session.rank), session.rank);
    const code = seedToCode(usedSeed);
    startContractSession({ level, seedCode: code, rank: session.rank, isDaily: false });
    resetGameScenes(this.game, 'GameScene', { level: level.id });
  }

  shutdown(): void {
    this.resizeManager.destroy();
    this.input.keyboard?.removeAllListeners();
    
    // Clean up inputReady timer if scene shutdown before it fires
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
  }
}
