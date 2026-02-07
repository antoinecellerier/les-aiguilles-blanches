import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle, titleStyle } from '../config/theme';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { resetGameScenes } from '../utils/sceneTransitions';

/**
 * Les Aiguilles Blanches - Pause Scene
 * Pause menu overlay
 */

interface PauseSceneData {
  gameScene: Phaser.Scene & { levelIndex: number; resumeGame: () => void };
}

export default class PauseScene extends Phaser.Scene {
  private gameScene!: PauseSceneData['gameScene'];

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: PauseSceneData): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    // Bring pause menu to top so it renders above dialogue and HUD
    this.scene.bringToTop();
    
    const { width, height } = this.cameras.main;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.overlayDim, THEME.opacity.overlay);

    // Panel
    this.add.rectangle(width / 2, height / 2, 300, 350, THEME.colors.panelBg, THEME.opacity.panelBg);

    // Title
    this.add.text(width / 2, height / 2 - 130, t('pauseTitle') || 'Paused', titleStyle())
      .setOrigin(0.5);

    // Buttons
    const btnStyle = buttonStyle();

    const buttonDefs = [
      { text: 'resume', callback: () => this.resumeGame(), isCTA: true },
      { text: 'restart', callback: () => this.restartLevel(), isCTA: false },
      { text: 'settings', callback: () => this.openSettings(), isCTA: false },
      { text: 'quit', callback: () => this.quitToMenu(), isCTA: false },
    ];

    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];
    this.selectedIndex = 0;

    buttonDefs.forEach((btn, i) => {
      const style = { ...btnStyle };
      if (btn.isCTA) style.backgroundColor = THEME.colors.buttonCTAHex;
      const button = this.add.text(width / 2, height / 2 - 50 + i * 55, t(btn.text) || btn.text, style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.selectButton(i))
        .on('pointerout', () => this.updateButtonStyles())
        .on('pointerdown', btn.callback);
      
      this.menuButtons.push(button);
      this.buttonCallbacks.push(btn.callback);
      this.buttonIsCTA.push(btn.isCTA);
    });

    this.updateButtonStyles();

    // Keyboard navigation
    this.input.keyboard?.on('keydown-UP', () => this.navigateMenu(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.navigateMenu(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.activateSelected());
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());

    // Initialize gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.navigateMenu(dir),
      onConfirm: () => this.activateSelected(),
      onBack: () => this.resumeGame(),
    });
    this.gamepadNav.initState();
    // Track Start button separately (also resumes)
    this.gamepadStartPressed = false;
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) this.gamepadStartPressed = pad.buttons[9]?.pressed || false;
    }

    Accessibility.announce(t('pauseTitle'));
  }

  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private selectedIndex = 0;
  private gamepadNav!: GamepadMenuNav;
  private gamepadStartPressed = false;

  private selectButton(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(index, this.menuButtons.length - 1));
    this.updateButtonStyles();
  }

  private navigateMenu(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + this.menuButtons.length) % this.menuButtons.length;
    this.updateButtonStyles();
  }

  private activateSelected(): void {
    if (this.buttonCallbacks[this.selectedIndex]) {
      this.buttonCallbacks[this.selectedIndex]();
    }
  }

  private updateButtonStyles(): void {
    this.menuButtons.forEach((btn, i) => {
      const isCTA = this.buttonIsCTA[i];
      const baseColor = isCTA ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
      const hoverColor = isCTA ? THEME.colors.buttonCTAHoverHex : THEME.colors.buttonHoverHex;
      if (i === this.selectedIndex) {
        btn.setStyle({ backgroundColor: hoverColor });
        btn.setScale(1.1);
      } else {
        btn.setStyle({ backgroundColor: baseColor });
        btn.setScale(1);
      }
    });
  }

  update(_time: number, delta: number): void {
    this.gamepadNav.update(delta);
    // Start button also resumes (in addition to Back handled by gamepadNav)
    if (this.input.gamepad && this.input.gamepad.total > 0) {
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
    this.gameScene.resumeGame();
  }

  private restartLevel(): void {
    const game = this.game;
    const levelIndex = this.gameScene.levelIndex;
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    resetGameScenes(game, 'GameScene', { level: levelIndex });
  }

  private openSettings(): void {
    // Keep GameScene paused; just stop overlays and open Settings
    const game = this.game;
    const levelIndex = this.gameScene.levelIndex;
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('PauseScene');
    game.scene.start('SettingsScene', { returnTo: 'PauseScene', levelIndex });
    game.scene.bringToTop('SettingsScene');
  }

  private quitToMenu(): void {
    const game = this.game;
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    resetGameScenes(game, 'MenuScene');
  }

  shutdown(): void {
    this.input.keyboard?.removeAllListeners();
  }
}
