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
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';
import { SCENE_KEYS } from '../config/sceneKeys';

/**
 * Les Aiguilles Blanches - Credits Scene
 * Cinematic night-slope credits that bookend the prologue:
 * groomer drives across the piste while credits scroll,
 * JP delivers a farewell when the groomer stops.
 */

export default class CreditsScene extends Phaser.Scene {
  private creditsContainer!: Phaser.GameObjects.Container;
  private buttonsContainer!: Phaser.GameObjects.Container;
  private skipHint!: Phaser.GameObjects.Text;
  private creditsHeight = 0;
  private scrollTop = 0;
  
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
  private wildlife?: MenuWildlifeController;
  private trailTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: SCENE_KEYS.CREDITS });
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

    const scaleFactor = Math.min(width / 800, height / 600);
    const snowLineY = Math.round(height * 0.78);
    const nightWeather = { isNight: true, weather: 'light_snow' as const };

    // Night alpine backdrop
    createMenuTerrain(this, width, height, snowLineY, 0, scaleFactor, nightWeather);

    // Night overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000022)
      .setAlpha(0.45).setDepth(DEPTHS.MENU_TREES);

    // Sleeping wildlife + light snow particles
    this.wildlife = new MenuWildlifeController(this);
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, 0, scaleFactor, nightWeather);

    // Groomer animation (same technique as PrologueScene)
    this.setupGroomer(width, snowLineY, scaleFactor);

    // Text shadow for readability over terrain
    const textShadow = { offsetX: 2, offsetY: 2, color: '#1a1612', blur: 0, stroke: false, fill: false };

    // Header: congratulations (fixed position, no opaque background)
    const headerScale = Math.min(1, width / 420);
    const heroSize = Math.max(20, Math.round(THEME.fonts.sizes.hero * headerScale));

    const title = this.add.text(width / 2, 40, t('creditsTitle') || 'Félicitations !', {
      fontFamily: THEME.fonts.family,
      fontSize: `${heroSize}px`,
      fontStyle: 'bold',
      color: THEME.colors.accent,
      shadow: textShadow,
    }).setOrigin(0.5);
    title.setDepth(DEPTHS.MENU_SCROLL_FADE);

    const subtitle = this.add.text(width / 2, 80, t('creditsSubtitle') || 'Vous avez maîtrisé Les Aiguilles Blanches', {
      fontFamily: THEME.fonts.family,
      fontSize: `${THEME.fonts.sizes.medium}px`,
      color: THEME.colors.info,
      wordWrap: { width: width - 40 },
      align: 'center',
      shadow: textShadow,
    }).setOrigin(0.5);
    subtitle.setDepth(DEPTHS.MENU_SCROLL_FADE);

    // Viewport zone where scrolling credits are visible (between header and footer)
    this.scrollTop = subtitle.y + subtitle.height / 2 + 10;
    const scrollBottom = height - 40;

    // Scrolling credits
    const credits = [
      '',
      '🎿 LES AIGUILLES BLANCHES 🎿',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      t('creditsCreatedBy') || 'Créé par',
      'Antoine Cellerier',
      '',
      t('creditsDevelopedWith') || 'Développé avec',
      'GitHub Copilot CLI',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      t('creditsArtDirection') || 'Direction Artistique',
      t('creditsRetroInspiration') || 'A nod to retro classics like SkiFree',
      '',
      t('creditsInspiredBy') || 'Inspiré par',
      t('creditsGroomers') || 'Les dameurs de Savoie',
      'PistenBully 600',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      t('creditsDedication') || 'For the night crews who prepare the slopes while we sleep',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      t('creditsThanks') || 'Merci d\'avoir joué !',
      '',
      '🏔️ ' + (t('creditsSeeYou') || 'À bientôt sur les pistes !') + ' 🏔️',
    ];

    this.creditsContainer = this.add.container(0, height);
    this.creditsContainer.setDepth(DEPTHS.MENU_UI);

    // Geometry mask clips scrolling text to the viewport zone (no opaque bars needed)
    const maskShape = this.make.graphics();
    maskShape.fillRect(0, this.scrollTop, width, scrollBottom - this.scrollTop);
    this.creditsContainer.setMask(maskShape.createGeometryMask());

    let yOffset = 0;
    credits.forEach((line) => {
      const isTitle = line.includes('━') || line.includes('🎿') || line.includes('🏔️');
      const style: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: THEME.fonts.family,
        fontSize: `${THEME.fonts.sizes.small}px`,
        fontStyle: isTitle ? 'bold' : 'normal',
        color: isTitle ? THEME.colors.accent : THEME.colors.textPrimary,
        align: 'center',
        shadow: textShadow,
      };

      const text = this.add.text(width / 2, yOffset, line, style).setOrigin(0.5);
      this.creditsContainer.add(text);
      yOffset += line === '' ? 15 : 25;
    });

    this.creditsHeight = yOffset;

    // Scroll from below the viewport to above it
    this.tweens.add({
      targets: this.creditsContainer,
      y: this.scrollTop - this.creditsHeight,
      duration: 15000,
      ease: 'Linear',
      onComplete: () => this.showButtons(),
    });

    this.buttonsContainer = this.add.container(0, 0);
    this.buttonsContainer.setVisible(false);
    this.buttonsContainer.setDepth(DEPTHS.MENU_BADGES);

    const btnStyle = buttonStyle(THEME.fonts.sizes.medium, 20, 10);
    const btnSpacing = Math.min(100, width * 0.15);
    const btnY = height - Math.max(40, Math.round(60 * scaleFactor));

    // Play Again button
    const playAgainBtn = this.add.text(
      width / 2 - btnSpacing,
      btnY,
      t('playAgain') || 'Rejouer',
      btnStyle
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.setupButton(playAgainBtn, 0, () => this.restartGame(), 'playAgain');

    // Menu button
    const menuBtn = this.add.text(
      width / 2 + btnSpacing,
      btnY,
      t('menu') || 'Menu',
      btnStyle
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.setupButton(menuBtn, 1, () => this.returnToMenu(), 'menu');

    this.buttonsContainer.add([playAgainBtn, menuBtn]);

    this.skipHint = this.add.text(
      width / 2,
      btnY + 30,
      t('skipCredits') || 'Appuyez sur une touche pour passer',
      { fontFamily: THEME.fonts.family, fontSize: `${THEME.fonts.sizes.tiny}px`, color: THEME.colors.disabled, shadow: textShadow }
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

  private setupGroomer(width: number, snowLineY: number, scaleFactor: number): void {
    const s = scaleFactor;

    // Find the groomer placed by createMenuTerrain
    const groomer = this.children.list.find(
      (c: any) => c.texture?.key === '_menu_groomer'
    ) as Phaser.GameObjects.Image;
    if (!groomer) return;

    groomer.setPosition(width * 0.85, snowLineY - 20 * s);
    groomer.setDepth(DEPTHS.MENU_TREES + 1);

    const groomerH = groomer.displayHeight || 80 * s;
    const trackY = Math.round(groomerH * 0.85);

    // Headlight glow (same colors as PrologueScene)
    const frontW = Math.max(60, Math.round(120 * s));
    const frontH = Math.max(8, Math.round(12 * s));
    const rearW = Math.max(30, Math.round(50 * s));
    const rearH = Math.max(6, Math.round(8 * s));
    const frontBeam = this.add.rectangle(0, 0, frontW, frontH, 0xffffee)
      .setAlpha(0.30).setDepth(DEPTHS.MENU_TREES + 1);
    const rearGlow = this.add.rectangle(0, 0, rearW, rearH, 0xffddcc)
      .setAlpha(0.16).setDepth(DEPTHS.MENU_TREES + 1);
    const lampSize = Math.max(3, Math.round(4 * s));
    const lamp = this.add.rectangle(0, 0, lampSize, lampSize, 0xffee88)
      .setAlpha(0.9).setDepth(DEPTHS.MENU_TREES + 2);

    const updateLights = () => {
      const gx = (groomer as any).x ?? 0;
      const gy = (groomer as any).y ?? 0;
      const snowY = gy + trackY;
      frontBeam.setPosition(gx - frontW * 0.6, snowY);
      rearGlow.setPosition(gx + rearW * 0.4, snowY);
      lamp.setPosition(gx - 12 * s, gy - 6 * s);
    };
    updateLights();

    // Groomer drives across the slope, matching the 15s credits scroll
    this.tweens.add({
      targets: groomer,
      x: width * 0.15,
      y: snowLineY - 60 * s,
      duration: 15000,
      ease: 'Linear',
      onUpdate: updateLights,
    });

    // Corduroy trail behind the groomer
    const trail = this.add.graphics().setDepth(DEPTHS.MENU_SNOW + 1);
    let lastTrailX = groomer.x;
    const trailH = Math.max(2, Math.round(3 * s));
    this.trailTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const gx = (groomer as any).x;
        const gy = (groomer as any).y;
        const trailSurfaceY = gy + trackY;
        const segW = Math.abs(gx - lastTrailX) || 1;
        trail.fillStyle(0xc8dce8, 0.25);
        trail.fillRect(Math.min(lastTrailX, gx), trailSurfaceY - 1, segW, trailH);
        lastTrailX = gx;
      },
    });
  }

  private skipCredits(): void {
    if (this.buttonsShown) return;
    this.tweens.killAll();
    this.creditsContainer.setY(this.scrollTop - this.creditsHeight);
    this.showButtons();
  }

  private showButtons(): void {
    this.buttonsShown = true;
    this.buttonsContainer.setVisible(true);
    this.skipHint.setVisible(false);
    this.trailTimer?.destroy();

    // JP's farewell line — the groomer has stopped, the shift is ending
    const { width, height } = this.cameras.main;
    const scaleFactor = Math.min(width / 800, height / 600);
    const fontSize = Math.max(12, Math.round(14 * scaleFactor));
    const jpLine = this.add.text(width / 2, height * 0.55, t('creditsLine') || 'Allez, petit. Le soleil se lève. La montagne est prête.', {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: THEME.colors.textSecondary,
      wordWrap: { width: width * 0.8 },
      align: 'center',
      shadow: { offsetX: 2, offsetY: 2, color: '#1a1612', blur: 0, stroke: false, fill: false },
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setAlpha(0);
    this.tweens.add({ targets: jpLine, alpha: 1, duration: 800 });

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
  
  private setupButton(btn: Phaser.GameObjects.Text, index: number, callback: () => void, key?: string): void {
    btn.on('pointerover', () => this.buttonNav?.select(index));
    btn.on('pointerout', () => this.buttonNav?.refreshStyles());
    btn.on('pointerdown', () => { playClick(); callback(); });
    if (key) btn.setData('key', key);
    this.menuButtons.push(btn);
    this.buttonCallbacks.push(callback);
  }

  private restartGame(): void {
    const game = this.game;
    this.scene.stop(SCENE_KEYS.CREDITS);
    resetGameScenes(game, SCENE_KEYS.GAME, { level: 0 });
  }

  update(time: number, delta: number): void {
    this.wildlife?.update(time, delta);

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
    this.wildlife?.destroy();
    this.trailTimer?.destroy();
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();
    this.children.removeAll(true);
  }

  private returnToMenu(): void {
    const game = this.game;
    this.scene.stop(SCENE_KEYS.CREDITS);
    resetGameScenes(game, SCENE_KEYS.MENU);
  }
}
