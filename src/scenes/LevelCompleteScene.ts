import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level } from '../setup';

/**
 * Les Aiguilles Blanches - Level Complete Scene
 * Shows level results and next level option
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

    this.cameras.main.setBackgroundColor(this.won ? 0x1a3a2e : 0x3a1a1a);

    const icon = this.won ? '🏆' : this.getFailIcon();
    const titleKey = this.won ? 'levelComplete' : 'levelFailed';

    this.add.text(width / 2, height / 4 - 20, icon, { font: '80px Arial' }).setOrigin(0.5);

    this.add.text(width / 2, height / 4 + 50, t(titleKey), {
      font: 'bold 36px Courier New',
      color: '#ffffff',
    }).setOrigin(0.5);

    if (!this.won && this.failReason) {
      const taunt = this.getFailTaunt();
      this.add.text(width / 2, height / 4 + 95, taunt, {
        font: 'italic 14px Courier New',
        color: '#ff8888',
        align: 'center',
        wordWrap: { width: width * 0.8 },
      }).setOrigin(0.5);
    }

    this.add.text(width / 2, height / 4 + 130, t(level.nameKey), {
      font: '18px Courier New',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const statsY = height / 2 + 40;
    this.add.text(width / 2, statsY, [
      t('coverage') + ': ' + this.coverage + '% / ' + level.targetCoverage + '%',
      '',
      t('timeUsed') + ': ' + this.formatTime(this.timeUsed),
      '',
      this.won ? this.getGrade() : '',
    ].join('\n'), {
      font: '16px Courier New',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      font: '18px Courier New',
      color: '#ffffff',
      backgroundColor: '#2d5a7b',
      padding: { x: 30, y: 12 },
    };

    const buttonY = height - 100;

    if (this.won && this.levelIndex < LEVELS.length - 1) {
      this.createButton(width / 2 - 100, buttonY, 'nextLevel', buttonStyle, () => {
        this.scene.start('GameScene', { level: this.levelIndex + 1 });
      }, '[ENTER]');

      this.createButton(width / 2 + 100, buttonY, 'menu', buttonStyle, () => {
        this.scene.start('MenuScene');
      }, '[ESC]');

      this.input.keyboard?.once('keydown-ENTER', () => {
        this.scene.start('GameScene', { level: this.levelIndex + 1 });
      });
      this.input.keyboard?.once('keydown-SPACE', () => {
        this.scene.start('GameScene', { level: this.levelIndex + 1 });
      });
      this.input.keyboard?.once('keydown-ESC', () => {
        this.scene.start('MenuScene');
      });
    } else if (this.won && this.levelIndex === LEVELS.length - 1) {
      this.add.text(width / 2, height / 2 + 100, '🎉 ' + (t('gameComplete') || 'Jeu terminé !') + ' 🎉', {
        font: 'bold 20px Courier New',
        color: '#FFD700',
      }).setOrigin(0.5);

      this.createButton(width / 2, buttonY, 'viewCredits', buttonStyle, () => {
        this.scene.start('CreditsScene');
      }, '[ENTER]');

      this.input.keyboard?.once('keydown-ENTER', () => {
        this.scene.start('CreditsScene');
      });
      this.input.keyboard?.once('keydown-SPACE', () => {
        this.scene.start('CreditsScene');
      });
      this.input.keyboard?.once('keydown-ESC', () => {
        this.scene.start('MenuScene');
      });
    } else {
      this.createButton(width / 2 - 80, buttonY, 'retry', buttonStyle, () => {
        this.scene.start('GameScene', { level: this.levelIndex });
      }, '[ENTER]');

      this.createButton(width / 2 + 80, buttonY, 'menu', buttonStyle, () => {
        this.scene.start('MenuScene');
      }, '[ESC]');

      this.input.keyboard?.once('keydown-ENTER', () => {
        this.scene.start('GameScene', { level: this.levelIndex });
      });
      this.input.keyboard?.once('keydown-SPACE', () => {
        this.scene.start('GameScene', { level: this.levelIndex });
      });
      this.input.keyboard?.once('keydown-ESC', () => {
        this.scene.start('MenuScene');
      });
    }

    Accessibility.announce(t(titleKey) + '. ' + t('coverage') + ' ' + this.coverage + '%');
  }

  private createButton(
    x: number,
    y: number,
    textKey: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    callback: () => void,
    hint = ''
  ): Phaser.GameObjects.Text {
    const label = hint ? t(textKey) + ' ' + hint : t(textKey);
    return this.add.text(x, y, label, style)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: '#3d7a9b' });
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: '#2d5a7b' });
      })
      .on('pointerdown', callback);
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
