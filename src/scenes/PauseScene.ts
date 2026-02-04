import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle, titleStyle } from '../config/theme';

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

    const buttons = [
      { text: 'resume', callback: () => this.resumeGame() },
      { text: 'restart', callback: () => this.restartLevel() },
      { text: 'settings', callback: () => this.openSettings() },
      { text: 'quit', callback: () => this.quitToMenu() },
    ];

    buttons.forEach((btn, i) => {
      const button = this.add.text(width / 2, height / 2 - 50 + i * 55, t(btn.text) || btn.text, btnStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => button.setStyle({ backgroundColor: THEME.colors.buttonHoverHex }))
        .on('pointerout', () => button.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex }))
        .on('pointerdown', btn.callback);
    });

    // ESC to resume
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());

    Accessibility.announce(t('pauseTitle'));
  }

  private resumeGame(): void {
    this.scene.stop();
    this.gameScene.resumeGame();
  }

  private restartLevel(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('GameScene', { level: this.gameScene.levelIndex });
  }

  private openSettings(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('SettingsScene', { returnTo: 'GameScene', levelIndex: this.gameScene.levelIndex });
  }

  private quitToMenu(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('MenuScene');
  }
}
