import Phaser from 'phaser';
import { t, Accessibility } from '../setup';

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
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Panel
    this.add.rectangle(width / 2, height / 2, 300, 350, 0x222222, 0.95);

    // Title
    this.add.text(width / 2, height / 2 - 130, t('pauseTitle') || 'Paused', {
      font: 'bold 28px Courier New',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Buttons
    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      font: '18px Courier New',
      color: '#ffffff',
      backgroundColor: '#2d5a7b',
      padding: { x: 30, y: 12 },
    };

    const buttons = [
      { text: 'resume', callback: () => this.resumeGame() },
      { text: 'restart', callback: () => this.restartLevel() },
      { text: 'settings', callback: () => this.openSettings() },
      { text: 'quit', callback: () => this.quitToMenu() },
    ];

    buttons.forEach((btn, i) => {
      const button = this.add.text(width / 2, height / 2 - 50 + i * 55, t(btn.text) || btn.text, buttonStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => button.setStyle({ backgroundColor: '#3d7a9b' }))
        .on('pointerout', () => button.setStyle({ backgroundColor: '#2d5a7b' }))
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
