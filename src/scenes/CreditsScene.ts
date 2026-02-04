import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle } from '../config/theme';
import GameScene from './GameScene';
import HUDScene from './HUDScene';
import DialogueScene from './DialogueScene';

/**
 * Les Aiguilles Blanches - Credits Scene
 * Shows end-game credits after completing all levels
 */

export default class CreditsScene extends Phaser.Scene {
  private creditsContainer!: Phaser.GameObjects.Container;
  private buttonsContainer!: Phaser.GameObjects.Container;
  private skipHint!: Phaser.GameObjects.Text;
  private creditsHeight = 0;

  constructor() {
    super({ key: 'CreditsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor(THEME.colors.darkBg);
    this.createStars();

    // Header zone background (covers scrolling credits)
    const headerBg = this.add.rectangle(width / 2, 100, width, 200, THEME.colors.darkBg);
    headerBg.setDepth(10);

    const trophy = this.add.text(width / 2, 60, '🏆', { font: `60px ${THEME.fonts.familyEmoji}` }).setOrigin(0.5);
    trophy.setDepth(11);

    const title = this.add.text(width / 2, 120, t('creditsTitle') || 'Félicitations !', {
      fontFamily: THEME.fonts.family,
      fontSize: `${THEME.fonts.sizes.hero}px`,
      fontStyle: 'bold',
      color: THEME.colors.accent,
    }).setOrigin(0.5);
    title.setDepth(11);

    const subtitle = this.add.text(width / 2, 160, t('creditsSubtitle') || 'Vous avez maîtrisé Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: `${THEME.fonts.sizes.medium}px`,
      color: THEME.colors.info,
    }).setOrigin(0.5);
    subtitle.setDepth(11);

    // Footer zone background (covers scrolling credits at bottom)
    const footerBg = this.add.rectangle(width / 2, height - 50, width, 100, THEME.colors.darkBg);
    footerBg.setDepth(10);

    const credits = [
      '',
      '🎿 LES AIGUILLES BLANCHES 🎿',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Créé par',
      'Antoine',
      '',
      'Développé avec',
      'GitHub Copilot',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Direction Artistique',
      'Style "SkiFree" classique',
      '',
      'Inspiré par',
      'Les dameurs de Savoie',
      'PistenBully 600',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Gastronomie Savoyarde',
      'Tartiflette • Fondue • Raclette',
      'Génépi • Vin Chaud',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Merci d\'avoir joué !',
      '',
      '🏔️ À bientôt sur les pistes ! 🏔️',
    ];

    this.creditsContainer = this.add.container(0, height);

    let yOffset = 0;
    credits.forEach((line) => {
      const isTitle = line.includes('━') || line.includes('🎿') || line.includes('🏔️');
      const style: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: THEME.fonts.family,
        fontSize: `${THEME.fonts.sizes.small}px`,
        fontStyle: isTitle ? 'bold' : 'normal',
        color: isTitle ? THEME.colors.accent : THEME.colors.textPrimary,
        align: 'center',
      };

      const text = this.add.text(width / 2, yOffset, line, style).setOrigin(0.5);
      this.creditsContainer.add(text);
      yOffset += line === '' ? 15 : 25;
    });

    this.creditsHeight = yOffset;

    this.tweens.add({
      targets: this.creditsContainer,
      y: -this.creditsHeight + 100,
      duration: 15000,
      ease: 'Linear',
      onComplete: () => this.showButtons(),
    });

    this.buttonsContainer = this.add.container(0, 0);
    this.buttonsContainer.setVisible(false);
    this.buttonsContainer.setDepth(12);

    const btnStyle = buttonStyle(THEME.fonts.sizes.medium, 20, 10);

    const playAgainBtn = this.add.text(
      width / 2 - 100,
      height - 60,
      (t('playAgain') || 'Rejouer') + ' [ENTER]',
      btnStyle
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
      })
      .on('pointerdown', () => this.restartGame());

    const menuBtn = this.add.text(
      width / 2 + 100,
      height - 60,
      (t('menu') || 'Menu') + ' [ESC]',
      btnStyle
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
      })
      .on('pointerdown', () => this.returnToMenu());

    this.buttonsContainer.add([playAgainBtn, menuBtn]);

    this.skipHint = this.add.text(
      width / 2,
      height - 20,
      t('skipCredits') || 'Appuyez sur une touche pour passer',
      { fontFamily: THEME.fonts.family, fontSize: `${THEME.fonts.sizes.tiny}px`, color: THEME.colors.disabled }
    ).setOrigin(0.5);
    this.skipHint.setDepth(12);

    this.input.keyboard?.once('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        this.returnToMenu();
      } else if (event.code === 'Enter' || event.code === 'Space') {
        this.restartGame();
      } else {
        this.skipCredits();
      }
    });
    this.input.once('pointerdown', () => this.skipCredits());

    Accessibility.announce(t('creditsTitle') || 'Félicitations! Vous avez terminé le jeu.');
  }

  private createStars(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);

      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(x, y, size);
    }
  }

  private skipCredits(): void {
    this.tweens.killAll();
    this.creditsContainer.setY(-this.creditsHeight + 100);
    this.showButtons();
  }

  private showButtons(): void {
    this.buttonsContainer.setVisible(true);
    this.skipHint.setVisible(false);

    this.input.keyboard?.removeAllListeners();
    this.input.keyboard?.on('keydown-ENTER', () => this.restartGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.restartGame());
    this.input.keyboard?.on('keydown-ESC', () => this.returnToMenu());
  }

  private restartGame(): void {
    const game = this.game;
    this.scene.stop('CreditsScene');

    setTimeout(() => {
      // Remove and re-add all game scenes for clean restart
      try {
        game.scene.remove('HUDScene');
        game.scene.remove('DialogueScene');
        game.scene.remove('GameScene');
      } catch (e) {
        // Scenes may not exist
      }

      game.scene.add('GameScene', GameScene, false);
      game.scene.add('HUDScene', HUDScene, false);
      game.scene.add('DialogueScene', DialogueScene, false);

      game.scene.start('GameScene', { level: 0 });
    }, 100);
  }

  private returnToMenu(): void {
    const game = this.game;
    this.scene.stop('CreditsScene');

    setTimeout(() => {
      // Remove game scenes for clean state
      try {
        game.scene.remove('HUDScene');
        game.scene.remove('DialogueScene');
        game.scene.remove('GameScene');
      } catch (e) {
        // Scenes may not exist
      }

      game.scene.add('GameScene', GameScene, false);
      game.scene.add('HUDScene', HUDScene, false);
      game.scene.add('DialogueScene', DialogueScene, false);

      game.scene.start('MenuScene');
    }, 100);
  }
}
