import Phaser from 'phaser';
import { t, LEVELS, type Level } from '../setup';

/**
 * Les Aiguilles Blanches - HUD Scene
 * Displays fuel, stamina, coverage, and timer
 */

interface HUDSceneData {
  level: Level;
  gameScene: Phaser.Scene & {
    fuel: number;
    stamina: number;
    winchActive: boolean;
    getCoverage: () => number;
    transitionToLevel: (level: number) => void;
  };
}

export default class HUDScene extends Phaser.Scene {
  private level!: Level;
  private gameScene!: HUDSceneData['gameScene'] | null;
  private isSkipping = false;
  private uiScale = 1;
  private barWidth = 130;

  private fuelBar: Phaser.GameObjects.Rectangle | null = null;
  private fuelBarBg: Phaser.GameObjects.Rectangle | null = null;
  private fuelText: Phaser.GameObjects.Text | null = null;
  private staminaBar: Phaser.GameObjects.Rectangle | null = null;
  private staminaBarBg: Phaser.GameObjects.Rectangle | null = null;
  private staminaText: Phaser.GameObjects.Text | null = null;
  private coverageText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private targetText: Phaser.GameObjects.Text | null = null;
  private winchHint: Phaser.GameObjects.Text | null = null;
  private touchControlsContainer: Phaser.GameObjects.Container | null = null;

  // Touch controls state (public for GameScene to read)
  public touchUp = false;
  public touchDown = false;
  public touchLeft = false;
  public touchRight = false;
  public touchGroom = false;
  public touchWinch = false;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: HUDSceneData): void {
    this.level = data.level;
    this.gameScene = data.gameScene;
    this.isSkipping = false;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const refWidth = 1024;
    const refHeight = 768;
    const scaleX = width / refWidth;
    const scaleY = height / refHeight;
    this.uiScale = Math.max(1.0, Math.min(2.5, Math.min(scaleX, scaleY)));

    const padding = Math.round(12 * this.uiScale);
    const barWidth = Math.round(130 * this.uiScale);
    const barHeight = Math.round(18 * this.uiScale);
    const leftPanelWidth = Math.round(220 * this.uiScale);
    const leftPanelHeight = Math.round(140 * this.uiScale);
    const rightPanelWidth = Math.round(150 * this.uiScale);
    const rightPanelHeight = Math.round(90 * this.uiScale);

    const fontTiny = Math.round(12 * this.uiScale) + 'px';
    const fontSmall = Math.round(14 * this.uiScale) + 'px';
    const fontMed = Math.round(16 * this.uiScale) + 'px';
    const fontIcon = Math.round(18 * this.uiScale) + 'px';
    const fontIconLg = Math.round(22 * this.uiScale) + 'px';
    const fontLarge = Math.round(26 * this.uiScale) + 'px';

    // Left panel
    this.add.rectangle(0, 0, leftPanelWidth, leftPanelHeight, 0x000000, 0.75).setOrigin(0).setScrollFactor(0);
    this.add.rectangle(0, 0, leftPanelWidth, 3, 0x87ceeb).setOrigin(0).setScrollFactor(0);
    this.add.rectangle(leftPanelWidth, 0, 2, leftPanelHeight, 0x87ceeb, 0.5).setOrigin(0).setScrollFactor(0);

    const row1Y = Math.round(8 * this.uiScale);
    const row2Y = Math.round(32 * this.uiScale);
    const row3Y = Math.round(58 * this.uiScale);
    const row4Y = Math.round(90 * this.uiScale);
    const barOffset = Math.round(35 * this.uiScale);

    this.add.text(padding, row1Y, t(this.level.nameKey) || 'Level', {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSmall,
      fontStyle: 'bold',
      color: '#87CEEB',
    }).setScrollFactor(0);

    this.add.text(padding, row2Y, '⛽', { fontSize: fontIcon }).setScrollFactor(0);
    this.fuelBarBg = this.add.rectangle(barOffset + padding, row2Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBar = this.add.rectangle(barOffset + padding, row2Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0xcc2200).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelText = this.add.text(barOffset + padding + barWidth + 5, row2Y + Math.round(8 * this.uiScale), '100%', {
      fontFamily: 'Courier New',
      fontSize: fontSmall,
      color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.add.text(padding, row3Y, '💪', { fontSize: fontIcon }).setScrollFactor(0);
    this.staminaBarBg = this.add.rectangle(barOffset + padding, row3Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBar = this.add.rectangle(barOffset + padding, row3Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x22aa22).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaText = this.add.text(barOffset + padding + barWidth + 5, row3Y + Math.round(8 * this.uiScale), '100%', {
      fontFamily: 'Courier New',
      fontSize: fontSmall,
      color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.add.text(padding, row4Y, '❄️', { fontSize: fontIcon }).setScrollFactor(0);
    this.coverageText = this.add.text(barOffset + padding, row4Y + Math.round(7 * this.uiScale), (t('coverage') || 'Coverage') + ': 0%', {
      fontFamily: 'Courier New, monospace',
      fontSize: fontMed,
      color: '#87CEEB',
    }).setOrigin(0, 0.5).setScrollFactor(0);

    // Right panel
    this.add.rectangle(width, 0, rightPanelWidth, rightPanelHeight, 0x000000, 0.75).setOrigin(1, 0).setScrollFactor(0);
    this.add.rectangle(width, 0, rightPanelWidth, 3, 0xffd700).setOrigin(1, 0).setScrollFactor(0);
    this.add.rectangle(width - rightPanelWidth, 0, 2, rightPanelHeight, 0xffd700, 0.5).setOrigin(0).setScrollFactor(0);

    const timerIconX = width - rightPanelWidth + padding;
    this.add.text(timerIconX, Math.round(15 * this.uiScale), '⏱️', { fontSize: fontIconLg }).setOrigin(0, 0).setScrollFactor(0);
    this.timerText = this.add.text(width - padding, Math.round(18 * this.uiScale), '00:00', {
      fontFamily: 'Courier New, monospace',
      fontSize: fontLarge,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(1, 0).setScrollFactor(0);

    this.add.text(timerIconX, Math.round(50 * this.uiScale), '🎯', { fontSize: fontIcon }).setOrigin(0, 0).setScrollFactor(0);
    this.targetText = this.add.text(width - padding, Math.round(53 * this.uiScale), (t('target') || 'Target') + ': ' + this.level.targetCoverage + '%', {
      fontFamily: 'Courier New, monospace',
      fontSize: fontMed,
      color: '#FFD700',
    }).setOrigin(1, 0).setScrollFactor(0);

    const skipBtn = this.add.text(width - padding, rightPanelHeight + Math.round(5 * this.uiScale), '⏭ Skip Level [N]', {
      fontFamily: 'Courier New',
      fontSize: fontTiny,
      color: '#888888',
      backgroundColor: '#333333',
      padding: { x: Math.round(6 * this.uiScale), y: Math.round(3 * this.uiScale) },
    }).setOrigin(1, 0).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => skipBtn.setStyle({ color: '#ffffff' }))
      .on('pointerout', () => skipBtn.setStyle({ color: '#888888' }))
      .on('pointerdown', () => this.skipLevel());

    this.input.keyboard?.on('keydown-N', () => this.skipLevel());

    // Detect touch capability
    const phaserTouch = this.sys.game.device.input.touch;
    const browserTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasTouch = phaserTouch || browserTouch;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    
    // Show keyboard hint on desktop (even with touchscreen), touch hint on mobile
    const showTouchHint = hasTouch && isMobile;

    if (this.level.hasWinch) {
      const winchHintText = showTouchHint
        ? '🔗 ' + (t('winchHintTouch') || 'Hold 🔗 for winch')
        : '🔗 ' + (t('winchHint') || 'SHIFT = Winch');
      this.winchHint = this.add.text(width / 2, Math.round(12 * this.uiScale), winchHintText, {
        fontFamily: 'Courier New',
        fontSize: fontSmall,
        color: '#FFD700',
        backgroundColor: '#000000',
        padding: { x: Math.round(8 * this.uiScale), y: Math.round(4 * this.uiScale) },
      }).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.8);
    }

    this.barWidth = barWidth;
    this.gameScene?.events.on('timerUpdate', this.updateTimer, this);

    // Create touch controls - show on mobile, or on first touch for PC with touchscreen
    if (isMobile && hasTouch) {
      this.createTouchControls();
    } else if (hasTouch) {
      // PC with touchscreen: create controls but hidden, show on first touch
      this.createTouchControls(true);
    }
  }

  private createTouchControls(startHidden = false): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const btnSize = Math.round(50 * this.uiScale);
    const padding = Math.round(20 * this.uiScale);
    const alpha = 0.6;

    // Create container for all touch controls
    this.touchControlsContainer = this.add.container(0, 0);
    this.touchControlsContainer.setScrollFactor(0);
    
    if (startHidden) {
      this.touchControlsContainer.setVisible(false);
      // Show on first touch anywhere
      this.input.once('pointerdown', () => {
        if (this.touchControlsContainer) {
          this.touchControlsContainer.setVisible(true);
        }
      });
    }

    // D-pad (bottom-left)
    const dpadX = padding + btnSize * 1.5;
    const dpadY = height - padding - btnSize * 1.5;

    // Up button
    this.createTouchButton(dpadX, dpadY - btnSize, btnSize, '▲', alpha,
      () => { this.touchUp = true; },
      () => { this.touchUp = false; }
    );

    // Down button
    this.createTouchButton(dpadX, dpadY + btnSize, btnSize, '▼', alpha,
      () => { this.touchDown = true; },
      () => { this.touchDown = false; }
    );

    // Left button
    this.createTouchButton(dpadX - btnSize, dpadY, btnSize, '◀', alpha,
      () => { this.touchLeft = true; },
      () => { this.touchLeft = false; }
    );

    // Right button
    this.createTouchButton(dpadX + btnSize, dpadY, btnSize, '▶', alpha,
      () => { this.touchRight = true; },
      () => { this.touchRight = false; }
    );

    // Action buttons (bottom-right)
    const actionX = width - padding - btnSize;
    const actionY = height - padding - btnSize;

    // Groom button (SPACE equivalent)
    this.createTouchButton(actionX - btnSize - padding / 2, actionY, btnSize * 1.2, '❄️', alpha,
      () => { this.touchGroom = true; },
      () => { this.touchGroom = false; },
      0x2266aa
    );

    // Winch button (SHIFT equivalent) - only if level has winch
    if (this.level.hasWinch) {
      this.createTouchButton(actionX, actionY - btnSize - padding / 2, btnSize * 1.2, '🔗', alpha,
        () => { this.touchWinch = true; },
        () => { this.touchWinch = false; },
        0xaa6622
      );
    }
  }

  private createTouchButton(
    x: number, y: number, size: number, label: string, alpha: number,
    onDown: () => void, onUp: () => void, color = 0x333333
  ): void {
    const bg = this.add.circle(x, y, size / 2, color, alpha)
      .setScrollFactor(0)
      .setInteractive()
      .on('pointerdown', onDown)
      .on('pointerup', onUp)
      .on('pointerout', onUp);

    const text = this.add.text(x, y, label, {
      fontSize: Math.round(size * 0.5) + 'px',
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.9);

    // Add to container if it exists
    if (this.touchControlsContainer) {
      this.touchControlsContainer.add([bg, text]);
    }
  }

  private skipLevel(): void {
    const nextLevel = this.level.id + 1;

    if (this.isSkipping) return;
    this.isSkipping = true;

    if (nextLevel < LEVELS.length) {
      if (this.gameScene && typeof this.gameScene.transitionToLevel === 'function') {
        this.gameScene.transitionToLevel(nextLevel);
      } else {
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.game.scene.stop('GameScene');
        this.game.scene.start('GameScene', { level: nextLevel });
      }
    } else {
      this.scene.stop('HUDScene');
      this.scene.stop('DialogueScene');
      this.scene.get('GameScene')?.scene.stop();
      this.game.scene.start('CreditsScene');
    }
  }

  update(): void {
    if (!this.gameScene || !this.scene.isActive()) return;
    if (!this.fuelBar || !this.fuelText) return;

    const fuelPercent = this.gameScene.fuel / 100;
    const staminaPercent = this.gameScene.stamina / 100;

    this.fuelBar.width = this.barWidth * fuelPercent;
    if (this.staminaBar) this.staminaBar.width = this.barWidth * staminaPercent;

    this.fuelText.setText(Math.round(this.gameScene.fuel) + '%');
    this.staminaText?.setText(Math.round(this.gameScene.stamina) + '%');

    this.fuelBar.setFillStyle(fuelPercent > 0.3 ? 0xcc2200 : 0xff0000);
    this.staminaBar?.setFillStyle(staminaPercent > 0.3 ? 0x22aa22 : 0xffaa00);

    const coverage = this.gameScene.getCoverage();
    if (this.coverageText) {
      this.coverageText.setText((t('coverage') || 'Coverage') + ': ' + coverage + '%');
      if (coverage >= this.level.targetCoverage) {
        this.coverageText.setStyle({ color: '#00FF00' });
      }
    }

    if (this.winchHint && this.gameScene.winchActive) {
      this.winchHint.setText('🔗 ' + (t('winchAttached') || 'Winch ACTIVE'));
      this.winchHint.setStyle({ color: '#00FF00' });
    } else if (this.winchHint) {
      this.winchHint.setText('🔗 ' + (t('winchHint') || 'SHIFT = Winch'));
      this.winchHint.setStyle({ color: '#FFD700' });
    }
  }

  private updateTimer(seconds: number): void {
    if (!this.timerText) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'));

    if (seconds <= 60) {
      this.timerText.setStyle({ color: '#FF4444' });
    }
  }

  shutdown(): void {
    this.tweens.killAll();
    this.children.removeAll(true);

    if (this.gameScene) {
      this.gameScene.events.off('timerUpdate', this.updateTimer, this);
    }

    this.gameScene = null;
    this.fuelBar = null;
    this.fuelText = null;
    this.staminaBar = null;
    this.staminaText = null;
    this.coverageText = null;
    this.winchHint = null;
    this.timerText = null;
  }
}
