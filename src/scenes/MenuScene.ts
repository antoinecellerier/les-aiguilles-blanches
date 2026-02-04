import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { getMovementKeysString } from '../utils/keyboardLayout';
import GameScene from './GameScene';
import HUDScene from './HUDScene';
import DialogueScene from './DialogueScene';
import PauseScene from './PauseScene';

/**
 * Les Aiguilles Blanches - Menu Scene
 * Main menu with game start, settings, and controls
 */

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Calculate scale factor for responsive text
    // On high DPI devices, use device pixel ratio to compensate for small CSS pixels
    const baseHeight = 768;
    const baseWidth = 1024;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x to avoid giant UI
    
    const scaleByHeight = Math.max(0.7, Math.min(height / baseHeight, 1.5));
    const scaleByWidth = Math.max(0.5, Math.min(width / baseWidth, 1.5));
    // Use smaller of height/width scaling to ensure content fits
    // But boost by sqrt(dpr) on high DPI to compensate for tiny CSS pixels
    const dprBoost = Math.sqrt(dpr);
    const scaleFactor = Math.min(scaleByHeight, scaleByWidth) * dprBoost;
    
    const titleSize = Math.round(40 * scaleFactor);
    const subtitleSize = Math.round(16 * scaleFactor);
    const buttonSize = Math.round(18 * scaleFactor);
    const buttonPadding = Math.round(12 * scaleFactor);

    // Gradient-like background
    this.add.rectangle(width / 2, 0, width, height * 0.4, 0x1a3a5c).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, height * 0.4, width, height * 0.3, 0x2d5a7b).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, height * 0.7, width, height * 0.3, 0x4a7a9b).setOrigin(0.5, 0);

    this.createMountains(width, height);

    // Snow ground
    this.add.rectangle(width / 2, height - 50, width, 100, 0xe8f4f8).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, height - 55, width, 10, 0xffffff, 0.5).setOrigin(0.5, 0);

    this.createSnowflakes(width, height);

    // Title - positioned proportionally
    const titleY = height * 0.18;
    const titleBgWidth = Math.round(520 * scaleFactor);
    const titleBgHeight = Math.round(80 * scaleFactor);
    this.add.rectangle(width / 2, titleY, titleBgWidth, titleBgHeight, 0x000000, 0.3).setOrigin(0.5);
    this.add.text(width / 2 + 3, titleY + 3, 'Les Aiguilles Blanches', {
      fontFamily: 'Courier New, monospace',
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#1a3a5c',
    }).setOrigin(0.5);
    this.add.text(width / 2, titleY, 'Les Aiguilles Blanches', {
      fontFamily: 'Courier New, monospace',
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const subtitleText = t('subtitle') || 'Snow Groomer Simulation';
    this.add.text(width / 2, titleY + titleBgHeight * 0.65, '❄️ ' + subtitleText + ' ❄️', {
      fontFamily: 'Courier New, monospace',
      fontSize: subtitleSize + 'px',
      color: '#87CEEB',
    }).setOrigin(0.5);

    // Menu - positioned proportionally
    const menuY = height * 0.55;
    const buttonSpacing = Math.round(55 * scaleFactor);
    const menuBgHeight = Math.round(280 * scaleFactor);
    this.add.rectangle(width / 2, menuY + menuBgHeight * 0.2, Math.round(280 * scaleFactor), menuBgHeight, 0x000000, 0.4).setOrigin(0.5);

    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: buttonSize + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: Math.round(50 * scaleFactor), y: buttonPadding },
    };

    const buttons = [
      { text: 'startGame', callback: () => this.startGame(), primary: true },
      { text: 'howToPlay', callback: () => this.showHowToPlay(), primary: false },
      { text: 'settings', callback: () => this.showSettings(), primary: false },
    ];

    buttons.forEach((btn, i) => {
      const btnText = t(btn.text) || btn.text;
      const yPos = menuY - buttonSpacing * 0.5 + i * buttonSpacing;

      const button = this.add.text(width / 2, yPos, btnText, {
        ...buttonStyle,
        backgroundColor: btn.primary ? '#CC2200' : '#2d5a7b',
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          button.setStyle({ backgroundColor: btn.primary ? '#FF3300' : '#3d7a9b' });
          button.setScale(1.05);
        })
        .on('pointerout', () => {
          button.setStyle({ backgroundColor: btn.primary ? '#CC2200' : '#2d5a7b' });
          button.setScale(1);
        })
        .on('pointerdown', btn.callback);
    });

    // Decorations - scaled
    const decoSize = Math.round(48 * scaleFactor);
    const decoOffset = Math.round(180 * scaleFactor);
    this.add.text(width / 2 - decoOffset, menuY + buttonSpacing, '🚜', { fontSize: decoSize + 'px' }).setOrigin(0.5);
    this.add.text(width / 2 + decoOffset, menuY + buttonSpacing, '⛷️', { fontSize: decoSize + 'px' }).setOrigin(0.5);

    // Footer: GitHub link with version on first line
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
    const githubLink = this.add.text(width / 2, height - 35, `📦 GitHub  •  v${version}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#87CEEB',
    }).setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => githubLink.setColor('#FFD700'))
      .on('pointerout', () => githubLink.setColor('#87CEEB'))
      .on('pointerdown', () => {
        window.open('https://github.com/antoinecellerier/les-aiguilles-blanches', '_blank');
      });

    // Made in Savoie credit on second line
    this.add.text(width / 2, height - 18, 'Made with ❄️ in Savoie', {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#4a6a7b',
    }).setOrigin(0.5, 0);

    // Fullscreen button (show on touch devices, or always show exit button when in fullscreen)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isFullscreen = !!document.fullscreenElement;
    if ((hasTouch || isFullscreen) && document.fullscreenEnabled) {
      const fsIcon = isFullscreen ? '⛶' : '⛶';  // Same icon, toggles action
      const fsLabel = isFullscreen ? '✕' : '⛶';
      const fsBtn = this.add.text(width - 15, 15, fsLabel, {
        fontSize: Math.round(28 * scaleFactor) + 'px',
        color: isFullscreen ? '#FF6666' : '#87CEEB',
        backgroundColor: '#1a2a3e',
        padding: { x: 8, y: 4 },
      }).setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toggleFullscreen());
    }

    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());

    // Handle resize - restart scene to reflow layout
    this.scale.on('resize', this.handleResize, this);

    Accessibility.announce((t('subtitle') || '') + ' - ' + (t('startGame') || ''));
  }

  private handleResize(): void {
    // Restart scene to recalculate all positions
    this.scene.restart();
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    }
    // Restart scene to update button appearance
    this.time.delayedCall(200, () => this.scene.restart());
  }

  private createMountains(width: number, height: number): void {
    const farMtnColor = 0x1a3a5c;

    this.add.rectangle(100, height - 100, 300, 250, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(100, height - 300, 200, 100, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(100, height - 370, 100, 80, farMtnColor).setOrigin(0.5, 1);

    this.add.rectangle(350, height - 100, 280, 300, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(350, height - 350, 180, 120, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(350, height - 430, 80, 80, farMtnColor).setOrigin(0.5, 1);

    this.add.rectangle(600, height - 100, 320, 350, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(600, height - 400, 200, 150, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(600, height - 500, 100, 100, farMtnColor).setOrigin(0.5, 1);

    this.add.rectangle(900, height - 100, 350, 280, farMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(900, height - 330, 200, 100, farMtnColor).setOrigin(0.5, 1);

    const nearMtnColor = 0x3d6a8b;
    this.add.rectangle(200, height - 50, 350, 180, nearMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(200, height - 190, 200, 80, nearMtnColor).setOrigin(0.5, 1);

    this.add.rectangle(750, height - 50, 400, 200, nearMtnColor).setOrigin(0.5, 1);
    this.add.rectangle(750, height - 200, 250, 100, nearMtnColor).setOrigin(0.5, 1);

    // Snow caps
    this.add.rectangle(350, height - 480, 60, 30, 0xffffff, 0.8).setOrigin(0.5, 1);
    this.add.rectangle(600, height - 560, 70, 40, 0xffffff, 0.8).setOrigin(0.5, 1);
    this.add.rectangle(100, height - 420, 50, 25, 0xffffff, 0.7).setOrigin(0.5, 1);
  }

  private createSnowflakes(width: number, height: number): void {
    const snowflakePositions = [
      { x: 50, y: 100 }, { x: 150, y: 200 }, { x: 80, y: 350 },
      { x: width - 50, y: 120 }, { x: width - 120, y: 250 }, { x: width - 80, y: 400 },
      { x: width / 2 - 200, y: 80 }, { x: width / 2 + 200, y: 90 },
    ];

    snowflakePositions.forEach((pos) => {
      this.add.text(pos.x, pos.y, '❄', {
        fontSize: Phaser.Math.Between(12, 24) + 'px',
        color: '#FFFFFF',
      }).setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
    });
  }

  private startGame(): void {
    const game = this.game;
    this.scene.stop('MenuScene');

    setTimeout(() => {
      ['GameScene', 'HUDScene', 'DialogueScene', 'PauseScene'].forEach((key) => {
        if (game.scene.getScene(key)) {
          game.scene.remove(key);
        }
      });

      game.scene.add('HUDScene', HUDScene, false);
      game.scene.add('DialogueScene', DialogueScene, false);
      game.scene.add('PauseScene', PauseScene, false);
      game.scene.add('GameScene', GameScene, true, { level: 0 });
    }, 100);
  }

  private showHowToPlay(): void {
    // On devices with both touch and keyboard, show keyboard (primary on desktop)
    // Only show touch-specific hints on touch-only devices (no physical keyboard)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const showTouchHints = hasTouch && isMobile;
    const keys = getMovementKeysString(); // e.g., "WASD" or "ZQSD"
    
    let moveHint: string;
    let groomHint: string;
    
    if (showTouchHints) {
      moveHint = '🚜 ' + (t('howToPlayMoveTouch') || 'Use the virtual D-pad');
      groomHint = '❄️ ' + (t('howToPlayGroomTouch') || 'Tap ❄️ to groom');
    } else if (hasTouch) {
      // PC with touchscreen - show both
      moveHint = `🚜 ${keys}/Arrows or touch D-pad`;
      groomHint = '❄️ ' + (t('howToPlayGroom') || 'SPACE or tap ❄️ to groom');
    } else {
      moveHint = `🚜 ${keys} or Arrows to move`;
      groomHint = '❄️ ' + (t('howToPlayGroom') || 'SPACE to groom snow');
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
    this.scene.start('SettingsScene');
  }

  private showControls(): void {
    // Detect capabilities
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
    const { width, height } = this.cameras.main;

    // Scale based on available height for optimal legibility
    const contentLines = lines.filter(l => l.trim()).length + 3; // +3 for title, spacing, back button
    const availableHeight = height * 0.7;
    const optimalLineHeight = availableHeight / contentLines;
    const optimalFontSize = optimalLineHeight / 2.2;
    const fontSize = Math.round(Math.max(16, Math.min(28, optimalFontSize)));
    const titleSize = Math.round(fontSize * 1.4);
    const scaleFactor = fontSize / 18;

    const panelWidth = Math.min(700 * scaleFactor, width - 40);
    const panelHeight = Math.min(500 * scaleFactor, height - 60);

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    const panelBorder = this.add.rectangle(width / 2, height / 2, panelWidth + 10, panelHeight + 10, 0x3d7a9b);
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1a2a3e);

    const title = this.add.text(width / 2, height / 2 - panelHeight / 2 + titleSize * 2, t(titleKey) || titleKey, {
      fontFamily: 'Courier New, monospace',
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#87CEEB',
    }).setOrigin(0.5);

    const content = this.add.text(width / 2, height / 2, lines.join('\n'), {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSize + 'px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: Math.round(fontSize * 0.6),
      wordWrap: { width: panelWidth - 60 },
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + panelHeight / 2 - fontSize * 3, '← ' + (t('back') || 'Back'), {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSize + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: Math.round(30 * scaleFactor), y: Math.round(10 * scaleFactor) },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setStyle({ backgroundColor: '#FF3300' }))
      .on('pointerout', () => backBtn.setStyle({ backgroundColor: '#CC2200' }))
      .on('pointerdown', () => {
        overlay.destroy();
        panelBorder.destroy();
        panel.destroy();
        title.destroy();
        content.destroy();
        backBtn.destroy();
      });

    this.input.keyboard?.once('keydown-ESC', () => {
      overlay.destroy();
      panelBorder.destroy();
      panel.destroy();
      title.destroy();
      content.destroy();
      backBtn.destroy();
    });
  }
}
