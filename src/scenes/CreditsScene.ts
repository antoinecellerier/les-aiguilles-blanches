import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle } from '../config/theme';
import { isConfirmPressed, isBackPressed } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, simpleStyler, bindMenuKeys, type MenuButtonNav } from '../utils/menuButtonNav';
import { playClick } from '../systems/UISounds';
import { MusicSystem } from '../systems/MusicSystem';
import { resetGameScenes } from '../utils/sceneTransitions';
import { ResizeManager } from '../utils/resizeManager';
import { DEPTHS } from '../config/gameConfig';

/**
 * Les Aiguilles Blanches - Credits Scene
 * Shows end-game credits after completing all levels
 */

export default class CreditsScene extends Phaser.Scene {
  private creditsContainer!: Phaser.GameObjects.Container;
  private buttonsContainer!: Phaser.GameObjects.Container;
  private skipHint!: Phaser.GameObjects.Text;
  private creditsHeight = 0;
  
  // Keyboard navigation
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonNav!: MenuButtonNav;
  private buttonsShown = false;

  /** Expose for tests */
  get selectedIndex(): number { return this.buttonNav?.selectedIndex ?? 0; }
  
  // Gamepad state
  private gamepadNav!: GamepadMenuNav;
  private resizeManager!: ResizeManager;

  constructor() {
    super({ key: 'CreditsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Switch to credits music (singleton crossfade)
    MusicSystem.getInstance().start('credits');
    this.events.once('shutdown', this.shutdown, this);
    
    // Reset navigation state
    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonsShown = false;

    // Initialize gamepad navigation (blocked during scroll, active after buttons shown)
    this.gamepadNav = createGamepadMenuNav(this, 'horizontal', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => this.buttonNav.activate(),
      onBack: () => this.returnToMenu(),
      isBlocked: () => !this.buttonsShown,
    });
    this.gamepadNav.initState();

    this.cameras.main.setBackgroundColor(THEME.colors.darkBg);
    this.createStars();

    // Header zone background (covers scrolling credits)
    const headerBg = this.add.rectangle(width / 2, 100, width, 200, THEME.colors.darkBg);
    headerBg.setDepth(DEPTHS.MENU_UI);

    const trophy = this.add.text(width / 2, 60, '🏆', { font: `60px ${THEME.fonts.familyEmoji}` }).setOrigin(0.5);
    trophy.setDepth(DEPTHS.MENU_SCROLL_FADE);

    const title = this.add.text(width / 2, 120, t('creditsTitle') || 'Félicitations !', {
      fontFamily: THEME.fonts.family,
      fontSize: `${THEME.fonts.sizes.hero}px`,
      fontStyle: 'bold',
      color: THEME.colors.accent,
    }).setOrigin(0.5);
    title.setDepth(DEPTHS.MENU_SCROLL_FADE);

    const subtitle = this.add.text(width / 2, 160, t('creditsSubtitle') || 'Vous avez maîtrisé Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: `${THEME.fonts.sizes.medium}px`,
      color: THEME.colors.info,
    }).setOrigin(0.5);
    subtitle.setDepth(DEPTHS.MENU_SCROLL_FADE);

    // Footer zone background (covers scrolling credits at bottom)
    const footerBg = this.add.rectangle(width / 2, height - 50, width, 100, THEME.colors.darkBg);
    footerBg.setDepth(DEPTHS.MENU_UI);

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
    this.buttonsContainer.setDepth(DEPTHS.MENU_BADGES);

    const btnStyle = buttonStyle(THEME.fonts.sizes.medium, 20, 10);

    // Play Again button
    const playAgainBtn = this.add.text(
      width / 2 - 100,
      height - 60,
      t('playAgain') || 'Rejouer',
      btnStyle
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.setupButton(playAgainBtn, 0, () => this.restartGame());

    // Menu button
    const menuBtn = this.add.text(
      width / 2 + 100,
      height - 60,
      t('menu') || 'Menu',
      btnStyle
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.setupButton(menuBtn, 1, () => this.returnToMenu());

    this.buttonsContainer.add([playAgainBtn, menuBtn]);

    this.skipHint = this.add.text(
      width / 2,
      height - 20,
      t('skipCredits') || 'Appuyez sur une touche pour passer',
      { fontFamily: THEME.fonts.family, fontSize: `${THEME.fonts.sizes.tiny}px`, color: THEME.colors.disabled }
    ).setOrigin(0.5);
    this.skipHint.setDepth(DEPTHS.MENU_BADGES);

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

    this.resizeManager = new ResizeManager(this);
    this.resizeManager.register();
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
    this.buttonsShown = true;
    this.buttonsContainer.setVisible(true);
    this.skipHint.setVisible(false);

    this.buttonNav = createMenuButtonNav(
      this.menuButtons, this.buttonCallbacks, simpleStyler(),
    );

    this.input.keyboard?.removeAllListeners();
    bindMenuKeys(this, this.buttonNav, () => this.returnToMenu());
    this.input.keyboard?.on('keydown-LEFT', () => this.buttonNav.navigate(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.buttonNav.navigate(1));
    
    // Initialize selection highlight
    this.buttonNav.refreshStyles();
  }
  
  private setupButton(btn: Phaser.GameObjects.Text, index: number, callback: () => void): void {
    btn.on('pointerover', () => this.buttonNav?.select(index));
    btn.on('pointerout', () => this.buttonNav?.refreshStyles());
    btn.on('pointerdown', () => { playClick(); callback(); });
    this.menuButtons.push(btn);
    this.buttonCallbacks.push(callback);
  }

  private restartGame(): void {
    const game = this.game;
    this.scene.stop('CreditsScene');
    resetGameScenes(game, 'GameScene', { level: 0 });
  }

  update(_time: number, delta: number): void {
    if (!this.input.gamepad || this.input.gamepad.total === 0) return;
    const pad = this.input.gamepad.getPad(0);
    if (!pad) return;

    // During scroll, any button skips (before gamepadNav.update tracks state)
    if (!this.buttonsShown) {
      const confirmNow = isConfirmPressed(pad);
      const backNow = isBackPressed(pad);
      if ((confirmNow && !this.gamepadNav.confirmPressed) || (backNow && !this.gamepadNav.backPressed)) {
        this.skipCredits();
      }
    }

    // Handles nav/confirm/back when buttonsShown (isBlocked returns false)
    this.gamepadNav.update(delta);
  }

  shutdown(): void {
    // Music persists (singleton)
    this.resizeManager.destroy();
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();
    this.children.removeAll(true);
  }

  private returnToMenu(): void {
    const game = this.game;
    this.scene.stop('CreditsScene');
    resetGameScenes(game, 'MenuScene');
  }
}
