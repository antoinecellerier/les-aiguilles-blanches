import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level } from '../setup';
import { THEME } from '../config/theme';

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

  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data: LevelCompleteData): void {
    this.won = data.won;
    this.levelIndex = data.level;
    this.coverage = data.coverage;
    this.timeUsed = data.timeUsed;
    this.failReason = data.failReason;
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
      const tauntBg = this.add.rectangle(0, 0, width * 0.85, baseFontSize * 2.5, 0x442222, 0.9);
      tauntBg.setStrokeStyle(2, 0xff4444);
      const tauntText = this.add.text(0, 0, `« ${taunt} »`, {
        font: `bold ${baseFontSize}px ${THEME.fonts.family}`,
        color: '#ffcccc',
        align: 'center',
        wordWrap: { width: width * 0.75 },
      });
      tauntText.setOrigin(0.5, 0.5);
      
      // Container to hold both bg and text
      const tauntContainer = this.add.container(0, 0, [tauntBg, tauntText]);
      mainSizer.add(tauntContainer, { align: 'center', padding: { top: 10, bottom: 5 } });
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
    const confirmHint = hasGamepad ? 'Ⓐ' : 'ENTER';
    const backHint = hasGamepad ? 'Ⓑ' : 'ESC';

    if (this.won && this.levelIndex < LEVELS.length - 1) {
      // Won, more levels: Next Level + Menu
      buttonSizer.add(this.createButton(t('nextLevel') + ` [${confirmHint}]`, buttonFontSize, buttonPadding, () => {
        this.scene.start('GameScene', { level: this.levelIndex + 1 });
      }));
      buttonSizer.add(this.createButton(t('menu') + ` [${backHint}]`, buttonFontSize, buttonPadding, () => {
        this.scene.start('MenuScene');
      }));

      this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene', { level: this.levelIndex + 1 }));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene', { level: this.levelIndex + 1 }));
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));

    } else if (this.won && this.levelIndex === LEVELS.length - 1) {
      // Won final level: View Credits
      buttonSizer.add(this.createButton(t('viewCredits') + ` [${confirmHint}]`, buttonFontSize, buttonPadding, () => {
        this.scene.start('CreditsScene');
      }));

      this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('CreditsScene'));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('CreditsScene'));
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));

    } else {
      // Failed: Retry + Menu
      buttonSizer.add(this.createButton(t('retry') + ` [${confirmHint}]`, buttonFontSize, buttonPadding, () => {
        this.scene.start('GameScene', { level: this.levelIndex });
      }));
      buttonSizer.add(this.createButton(t('menu') + ` [${backHint}]`, buttonFontSize, buttonPadding, () => {
        this.scene.start('MenuScene');
      }));

      this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene', { level: this.levelIndex }));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene', { level: this.levelIndex }));
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));
    }

    mainSizer.add(buttonSizer, { align: 'center', padding: { top: 30 } });
    mainSizer.layout();

    // Setup gamepad tracking
    this.primaryAction = this.won && this.levelIndex < LEVELS.length - 1 
      ? () => this.scene.start('GameScene', { level: this.levelIndex + 1 })
      : this.won && this.levelIndex === LEVELS.length - 1
        ? () => this.scene.start('CreditsScene')
        : () => this.scene.start('GameScene', { level: this.levelIndex });
    
    // Initialize to current state to prevent phantom presses from previous scene
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.gamepadAPressed = pad.buttons[0]?.pressed || false;
        this.gamepadBPressed = pad.buttons[1]?.pressed || false;
      }
    } else {
      this.gamepadAPressed = false;
      this.gamepadBPressed = false;
    }

    Accessibility.announce(t(titleKey) + '. ' + t('coverage') + ' ' + this.coverage + '%');
  }

  private primaryAction: (() => void) | null = null;
  private gamepadAPressed = false;
  private gamepadBPressed = false;

  update(): void {
    // Gamepad support for level complete
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        // Accept both A (Xbox) and button 1 (Nintendo A) as confirm
        const confirmPressed = pad.buttons[0]?.pressed;
        if (confirmPressed && !this.gamepadAPressed && this.primaryAction) {
          this.primaryAction();
        }
        this.gamepadAPressed = confirmPressed;

        // Accept both B (Xbox) and button 0 (Nintendo B) as back
        const backPressed = pad.buttons[1]?.pressed;
        if (backPressed && !this.gamepadBPressed) {
          this.scene.start('MenuScene');
        }
        this.gamepadBPressed = backPressed;
      }
    }
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
        t('tauntCliff1') || "La gravité, c'est pas ton truc ?",
        t('tauntCliff2') || "Jean-Pierre va devoir expliquer ça à l'assurance...",
        t('tauntCliff3') || "Le ravin était pourtant bien visible !",
      ],
      fuel: [
        t('tauntFuel1') || "Tu as oublié où était la station-service ?",
        t('tauntFuel2') || "Même les marmottes savent faire le plein...",
        t('tauntFuel3') || "La prochaine fois, vérifie la jauge AVANT de partir !",
      ],
      time: [
        t('tauntTime1') || "Les skieurs arrivent... et la piste n'est pas prête !",
        t('tauntTime2') || "Tu damais quoi, des croissants ?",
        t('tauntTime3') || "Jean-Pierre est très déçu. Très, très déçu.",
      ],
      avalanche: [
        t('tauntAvalanche1') || "Tu as réveillé la montagne...",
        t('tauntAvalanche2') || "Les pisteurs t'avaient pourtant prévenu !",
        t('tauntAvalanche3') || "La neige, ça se respecte.",
      ],
      tumble: [
        t('tauntTumble1') || "La physique, ça s'apprend...",
        t('tauntTumble2') || "Le treuil existe pour une raison.",
        t('tauntTumble3') || "Jean-Pierre t'avait dit d'utiliser le câble !",
      ],
    };

    const options = taunts[this.failReason || ''] || [t('tryAgain') || "Réessaie !"];
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
