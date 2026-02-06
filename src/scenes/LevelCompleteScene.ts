import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level } from '../setup';
import { THEME } from '../config/theme';
import { isConfirmPressed, isBackPressed, getMappingFromGamepad } from '../utils/gamepad';

/**
 * Les Aiguilles Blanches - Level Complete Scene
 * Shows level results and next level option using rexUI Sizer
 */

interface LevelCompleteData {
  won: boolean;
  level: number;
  coverage: number;
  timeUsed: number;
  failReason?: string;
}

export default class LevelCompleteScene extends Phaser.Scene {
  private won = false;
  private levelIndex = 0;
  private coverage = 0;
  private timeUsed = 0;
  private failReason?: string;
  
  // Keyboard/gamepad navigation
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private selectedIndex = 0;

  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data: LevelCompleteData): void {
    this.won = data.won;
    this.levelIndex = data.level;
    this.coverage = data.coverage;
    this.timeUsed = data.timeUsed;
    this.failReason = data.failReason;
    
    // Reset navigation state
    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.selectedIndex = 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const level = LEVELS[this.levelIndex] as Level;
    const padding = Math.min(20, width * 0.03, height * 0.03);

    this.cameras.main.setBackgroundColor(this.won ? 0x1a3a2e : 0x3a1a1a);

    // Calculate responsive font sizes
    const baseFontSize = Math.min(16, width / 40, height / 35);
    const titleFontSize = Math.min(36, baseFontSize * 2.2);
    const iconFontSize = Math.min(80, baseFontSize * 4.5);
    const buttonFontSize = Math.min(18, baseFontSize * 1.1);

    const icon = this.won ? '🏆' : this.getFailIcon();
    const titleKey = this.won ? 'levelComplete' : 'levelFailed';

    // Build main content sizer
    const mainSizer = this.rexUI.add.sizer({
      x: width / 2,
      y: height / 2,
      width: width - padding * 2,
      orientation: 'vertical',
      space: { item: 10 },
    });

    // Icon
    mainSizer.add(this.add.text(0, 0, icon, { font: `${iconFontSize}px Arial` }), { align: 'center' });

    // Title
    mainSizer.add(this.add.text(0, 0, t(titleKey), {
      font: `bold ${titleFontSize}px Courier New`,
      color: '#ffffff',
    }), { align: 'center' });

    // Fail taunt if applicable - prominent styling with background
    if (!this.won && this.failReason) {
      const taunt = this.getFailTaunt();
      const tauntFontSize = Math.round(baseFontSize * 1.3); // 30% larger than base
      const tauntText = this.add.text(0, 0, `« ${taunt} »`, {
        font: `bold ${tauntFontSize}px ${THEME.fonts.family}`,
        color: '#ffdddd',
        align: 'center',
        wordWrap: { width: width * 0.75 },
      });
      tauntText.setOrigin(0.5, 0.5);
      
      // Size background to fit text with padding
      const bgWidth = Math.min(width * 0.9, tauntText.width + 40);
      const bgHeight = tauntText.height + 20;
      const tauntBg = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x442222, 0.95);
      tauntBg.setStrokeStyle(3, 0xff4444);
      
      // Container to hold both bg and text - set size for sizer layout
      const tauntContainer = this.add.container(0, 0, [tauntBg, tauntText]);
      tauntContainer.setSize(bgWidth, bgHeight);
      mainSizer.add(tauntContainer, { align: 'center', padding: { top: 10, bottom: 15 } });
    }

    // Level name
    mainSizer.add(this.add.text(0, 0, t(level.nameKey), {
      font: `${baseFontSize}px Courier New`,
      color: '#aaaaaa',
    }), { align: 'center', padding: { top: 10 } });

    // Stats
    const statsText = [
      t('coverage') + ': ' + this.coverage + '% / ' + level.targetCoverage + '%',
      '',
      t('timeUsed') + ': ' + this.formatTime(this.timeUsed),
      '',
      this.won ? this.getGrade() : '',
    ].join('\n');

    mainSizer.add(this.add.text(0, 0, statsText, {
      font: `${baseFontSize}px Courier New`,
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8,
    }), { align: 'center', padding: { top: 20 } });

    // Game complete message for final level win
    if (this.won && this.levelIndex === LEVELS.length - 1) {
      mainSizer.add(this.add.text(0, 0, '🎉 ' + (t('gameComplete') || 'Jeu terminé !') + ' 🎉', {
        font: `bold ${baseFontSize * 1.25}px Courier New`,
        color: '#FFD700',
      }), { align: 'center', padding: { top: 20 } });
    }

    // Button row
    const buttonSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 20 },
    });

    const buttonPadding = { x: Math.max(15, padding), y: Math.max(8, padding * 0.6) };

    // Check if gamepad is connected for button hints
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    const confirmHint = hasGamepad ? 'Ⓐ' : '↵';
    const backHint = hasGamepad ? 'Ⓑ' : 'ESC';

    if (this.won && this.levelIndex < LEVELS.length - 1) {
      // Won, more levels: Next Level + Menu
      this.addButton(buttonSizer, t('nextLevel') || 'Next Level', buttonFontSize, buttonPadding, 
        () => this.scene.start('GameScene', { level: this.levelIndex + 1 }));
      this.addButton(buttonSizer, t('menu') || 'Menu', buttonFontSize, buttonPadding,
        () => this.scene.start('MenuScene'));

    } else if (this.won && this.levelIndex === LEVELS.length - 1) {
      // Won final level: View Credits + Menu
      this.addButton(buttonSizer, t('viewCredits') || 'View Credits', buttonFontSize, buttonPadding,
        () => this.scene.start('CreditsScene'));
      this.addButton(buttonSizer, t('menu') || 'Menu', buttonFontSize, buttonPadding,
        () => this.scene.start('MenuScene'));

    } else {
      // Failed: Retry + Menu
      this.addButton(buttonSizer, t('retry') || 'Retry', buttonFontSize, buttonPadding,
        () => this.scene.start('GameScene', { level: this.levelIndex }));
      this.addButton(buttonSizer, t('menu') || 'Menu', buttonFontSize, buttonPadding,
        () => this.scene.start('MenuScene'));
    }
    
    // Keyboard navigation (horizontal layout)
    this.input.keyboard?.on('keydown-LEFT', () => this.navigateMenu(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.navigateMenu(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.activateSelected());
    this.input.keyboard?.on('keydown-SPACE', () => this.activateSelected());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    
    // Initialize selection
    this.updateButtonStyles();

    mainSizer.add(buttonSizer, { align: 'center', padding: { top: 30 } });
    mainSizer.layout();

    // Initialize gamepad state to prevent phantom presses from previous scene
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.gamepadAPressed = isConfirmPressed(pad);
        this.gamepadBPressed = isBackPressed(pad);
      }
    } else {
      this.gamepadAPressed = false;
      this.gamepadBPressed = false;
    }

    // Handle resize
    this.scale.on('resize', this.handleResize, this);

    Accessibility.announce(t(titleKey) + '. ' + t('coverage') + ' ' + this.coverage + '%');
  }

  private resizing = false;

  private handleResize(): void {
    if (this.resizing) return;
    this.resizing = true;
    requestAnimationFrame(() => {
      this.scene.restart(this.scene.settings.data);
      this.resizing = false;
    });
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }

  private gamepadAPressed = false;
  private gamepadBPressed = false;
  private gamepadNavCooldown = 0;

  update(_time: number, delta: number): void {
    // Gamepad navigation cooldown
    if (this.gamepadNavCooldown > 0) {
      this.gamepadNavCooldown -= delta;
    }
    
    // Gamepad support
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        // D-pad / stick navigation (horizontal layout)
        if (this.gamepadNavCooldown <= 0) {
          const stickX = pad.leftStick?.x ?? 0;
          if (pad.left || stickX < -0.5) {
            this.navigateMenu(-1);
            this.gamepadNavCooldown = 200;
          } else if (pad.right || stickX > 0.5) {
            this.navigateMenu(1);
            this.gamepadNavCooldown = 200;
          }
        }
        
        // Confirm button activates selected
        const confirmPressed = isConfirmPressed(pad);
        if (confirmPressed && !this.gamepadAPressed) {
          this.activateSelected();
        }
        this.gamepadAPressed = confirmPressed;

        // Back button to return to menu
        const backPressed = isBackPressed(pad);
        if (backPressed && !this.gamepadBPressed) {
          this.scene.start('MenuScene');
        }
        this.gamepadBPressed = backPressed;
      }
    }
  }
  
  private addButton(
    sizer: any,
    text: string,
    fontSize: number,
    padding: { x: number; y: number },
    callback: () => void
  ): void {
    const index = this.menuButtons.length;
    const btn = this.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
      fontSize: `${fontSize}px`,
      color: THEME.colors.textPrimary,
      backgroundColor: THEME.colors.buttonPrimaryHex,
      padding,
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.selectButton(index))
      .on('pointerout', () => this.updateButtonStyles())
      .on('pointerdown', callback);
    
    this.menuButtons.push(btn);
    this.buttonCallbacks.push(callback);
    sizer.add(btn);
  }
  
  private selectButton(index: number): void {
    this.selectedIndex = index;
    this.updateButtonStyles();
  }
  
  private navigateMenu(direction: number): void {
    if (this.menuButtons.length === 0) return;
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
      if (i === this.selectedIndex) {
        btn.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
        btn.setScale(1.05);
      } else {
        btn.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
        btn.setScale(1);
      }
    });
  }

  private createButton(
    text: string,
    fontSize: number,
    padding: { x: number; y: number },
    callback: () => void
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
      fontSize: `${fontSize}px`,
      color: THEME.colors.textPrimary,
      backgroundColor: THEME.colors.buttonPrimaryHex,
      padding,
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setStyle({ backgroundColor: THEME.colors.buttonHoverHex }))
      .on('pointerout', () => btn.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex }))
      .on('pointerdown', callback);
    return btn;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  }

  private getFailIcon(): string {
    switch (this.failReason) {
      case 'cliff': return '🏔️💀';
      case 'fuel': return '⛽💨';
      case 'time': return '⏰❌';
      case 'avalanche': return '🏔️❄️💨';
      case 'tumble': return '🔄💥';
      default: return '❌';
    }
  }

  private getFailTaunt(): string {
    const taunts: Record<string, string[]> = {
      cliff: [
        t('tauntCliff1'), t('tauntCliff2'), t('tauntCliff3'), t('tauntCliff4'), t('tauntCliff5'),
      ],
      fuel: [
        t('tauntFuel1'), t('tauntFuel2'), t('tauntFuel3'), t('tauntFuel4'), t('tauntFuel5'),
      ],
      time: [
        t('tauntTime1'), t('tauntTime2'), t('tauntTime3'), t('tauntTime4'), t('tauntTime5'),
      ],
      avalanche: [
        t('tauntAvalanche1'), t('tauntAvalanche2'), t('tauntAvalanche3'), t('tauntAvalanche4'), t('tauntAvalanche5'),
      ],
      tumble: [
        t('tauntTumble1'), t('tauntTumble2'), t('tauntTumble3'), t('tauntTumble4'), t('tauntTumble5'),
      ],
    };

    const options = taunts[this.failReason || ''] || [t('tryAgain')];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getGrade(): string {
    const level = LEVELS[this.levelIndex] as Level;
    const timePercent = this.timeUsed / level.timeLimit;
    const coverageBonus = this.coverage - level.targetCoverage;

    if (timePercent < 0.5 && coverageBonus >= 10) return '⭐⭐⭐ ' + t('excellent');
    if (timePercent < 0.75 && coverageBonus >= 5) return '⭐⭐ ' + t('good');
    return '⭐ ' + t('passed');
  }
}
