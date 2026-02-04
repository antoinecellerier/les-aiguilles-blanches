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

    // For very tall screens (21:9 phones), scale based on width to ensure UI fits
    const refWidth = 1024;
    const refHeight = 768;
    const scaleX = width / refWidth;
    const scaleY = height / refHeight;
    // Use smaller scale dimension to ensure everything fits
    let baseScale = Math.max(0.6, Math.min(2.0, Math.min(scaleX, scaleY)));
    
    // On high-DPI mobile devices, boost UI scale for better readability
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const dpr = window.devicePixelRatio || 1;
    if (isMobile && dpr > 1.5) {
      // Boost scale by ~20% on high-DPI mobile for larger, more readable UI
      baseScale = Math.min(2.0, baseScale * 1.2);
    }
    this.uiScale = baseScale;

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
    this.targetText = this.add.text(timerIconX + Math.round(25 * this.uiScale), Math.round(53 * this.uiScale), (t('target') || 'Target') + ': ' + this.level.targetCoverage + '%', {
      fontFamily: 'Courier New, monospace',
      fontSize: fontMed,
      color: '#FFD700',
    }).setOrigin(0, 0).setScrollFactor(0);

    // Touch detection for button sizing
    const phaserTouch = this.sys.game.device.input.touch;
    const browserTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasTouch = phaserTouch || browserTouch;
    // isMobile already defined at top of create()
    
    // Skip level button - larger and more visible on touch devices
    const skipFontSize = (hasTouch && isMobile) ? Math.max(14, Math.round(12 * this.uiScale)) + 'px' : fontTiny;
    const skipPadX = (hasTouch && isMobile) ? Math.max(10, Math.round(8 * this.uiScale)) : Math.round(6 * this.uiScale);
    const skipPadY = (hasTouch && isMobile) ? Math.max(6, Math.round(5 * this.uiScale)) : Math.round(3 * this.uiScale);
    const skipLabel = (hasTouch && isMobile) ? '⏭ Skip' : '⏭ Skip Level [N]';
    
    // Track Y position for stacked buttons
    let nextButtonY = rightPanelHeight + Math.round(5 * this.uiScale);
    
    const skipBtn = this.add.text(width - padding, nextButtonY, skipLabel, {
      fontFamily: 'Courier New',
      fontSize: skipFontSize,
      color: '#888888',
      backgroundColor: '#333333',
      padding: { x: skipPadX, y: skipPadY },
    }).setOrigin(1, 0).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => skipBtn.setStyle({ color: '#ffffff' }))
      .on('pointerout', () => skipBtn.setStyle({ color: '#888888' }))
      .on('pointerdown', () => this.skipLevel());
    
    nextButtonY += skipBtn.height + Math.round(5 * this.uiScale);

    this.input.keyboard?.on('keydown-N', () => this.skipLevel());
    
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

    // Touch-specific buttons (created AFTER touch controls so they render on top)
    const isFullscreen = !!document.fullscreenElement;
    
    // Larger font for touch buttons on mobile (minimum 24px for easy tapping)
    const touchBtnSize = isMobile ? Math.max(24, Math.round(20 * this.uiScale)) + 'px' : fontMed;
    const touchBtnPadX = isMobile ? Math.max(12, Math.round(10 * this.uiScale)) : Math.round(8 * this.uiScale);
    const touchBtnPadY = isMobile ? Math.max(8, Math.round(6 * this.uiScale)) : Math.round(4 * this.uiScale);
    const touchBtnAlpha = 0.6;
    
    // Pause/Menu button (touch devices)
    if (hasTouch) {
      const pauseBtn = this.add.text(width - padding, nextButtonY, '☰', {
        fontFamily: 'Courier New',
        fontSize: touchBtnSize,
        color: '#CCCCCC',
        backgroundColor: '#333333',
        padding: { x: touchBtnPadX, y: touchBtnPadY },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setAlpha(touchBtnAlpha)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openPauseMenu());
      nextButtonY += pauseBtn.height + Math.round(5 * this.uiScale);
    }

    // Fullscreen button (touch devices or when in fullscreen)
    if ((hasTouch || isFullscreen) && document.fullscreenEnabled) {
      const fsLabel = isFullscreen ? '✕' : '⛶';
      this.add.text(width - padding, nextButtonY, fsLabel, {
        fontFamily: 'Courier New',
        fontSize: touchBtnSize,
        color: isFullscreen ? '#FF6666' : '#CCCCCC',
        backgroundColor: '#333333',
        padding: { x: touchBtnPadX, y: touchBtnPadY },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setAlpha(touchBtnAlpha)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toggleFullscreen());
    }
  }

  private createTouchControls(startHidden = false): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Scale touch controls for high-DPI screens
    // On mobile, we want buttons to be at least ~15mm physical size for comfortable touch
    // devicePixelRatio helps approximate physical size
    const dpr = window.devicePixelRatio || 1;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    
    // Base size: larger on mobile, especially high-DPI screens
    // Minimum 60px on mobile, scale up with uiScale but cap the reduction from DPI
    const baseSize = isMobile ? Math.max(60, 50 * Math.max(1, this.uiScale)) : 50 * this.uiScale;
    const btnSize = Math.round(baseSize);
    const padding = Math.round(25 * this.uiScale);
    const alpha = 0.7;

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
      .on('pointerout', onUp)
      .on('pointercancel', onUp);  // Handle touch cancel events

    const text = this.add.text(x, y, label, {
      fontSize: Math.round(size * 0.5) + 'px',
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.9);

    // Add to container if it exists
    if (this.touchControlsContainer) {
      this.touchControlsContainer.add([bg, text]);
    }
  }

  private openPauseMenu(): void {
    // Launch pause scene (same as pressing ESC in GameScene)
    if (this.gameScene && !this.scene.isActive('PauseScene')) {
      this.scene.launch('PauseScene', { 
        returnScene: 'GameScene',
        levelIndex: this.level.id 
      });
      this.scene.bringToTop('PauseScene');
    }
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    }
    // Restart HUD to update button appearance after fullscreen change
    this.time.delayedCall(200, () => {
      if (this.scene.isActive()) {
        this.scene.restart({ level: this.level, gameScene: this.gameScene });
      }
    });
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

    // Safety: reset touch states if no active pointers (prevents stuck controls)
    const activePointers = this.input.manager.pointers.filter(p => p.isDown);
    if (activePointers.length === 0) {
      this.touchUp = false;
      this.touchDown = false;
      this.touchLeft = false;
      this.touchRight = false;
      this.touchGroom = false;
      this.touchWinch = false;
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
