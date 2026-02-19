import Phaser from 'phaser';
import { DEPTHS } from '../config/gameConfig';
import { THEME } from '../config/theme';
import { STORAGE_KEYS } from '../config/storageKeys';
import { setString } from '../utils/storage';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MusicSystem } from '../systems/MusicSystem';
import { ResizeManager } from '../utils/resizeManager';
import { t } from '../setup';

/**
 * Cold-open prologue: a 12-second cinematic showing a groomer working
 * a night piste with headlights, establishing the game's atmosphere
 * before the tutorial begins. Shown once for first-time players.
 */
export default class PrologueScene extends Phaser.Scene {
  private trailTimer?: Phaser.Time.TimerEvent;
  private resizeManager?: ResizeManager;

  constructor() {
    super({ key: 'PrologueScene' });
  }

  create(): void {
    this.events.once('shutdown', this.shutdown, this);

    const { width, height } = this.cameras.main;
    const scaleFactor = Math.min(width / 800, height / 600);
    const snowLineY = Math.round(height * 0.78);

    // Night alpine backdrop (include groomer so the texture is freshly created)
    createMenuTerrain(this, width, height, snowLineY, 0, scaleFactor,
      { isNight: true, weather: 'clear' });

    // Night overlay — match MenuScene's night tint for visual consistency
    this.add.rectangle(width / 2, height / 2, width, height, 0x000022)
      .setAlpha(0.45).setDepth(DEPTHS.MENU_TREES);

    // Start night mood music
    MusicSystem.getInstance().start('night');

    // Find the groomer placed by createMenuTerrain and reposition it for animation
    const groomer = this.children.list.find(
      (c: any) => c.texture?.key === '_menu_groomer'
    ) as Phaser.GameObjects.Image;
    if (groomer) {
      groomer.setPosition(width * 0.85, snowLineY - 20 * scaleFactor);
      groomer.setDepth(DEPTHS.MENU_TREES + 1);
    }

    // Headlight glow — light pools on the snow ahead/behind the groomer
    const s = scaleFactor;
    // Groomer origin is top; tracks are near the bottom of the sprite
    const groomerH = groomer ? (groomer as Phaser.GameObjects.Image).displayHeight : 80 * s;
    const trackY = Math.round(groomerH * 0.85); // offset from groomer.y to track level
    const frontW = Math.max(60, Math.round(120 * s));
    const frontH = Math.max(8, Math.round(12 * s));
    const rearW = Math.max(30, Math.round(50 * s));
    const rearH = Math.max(6, Math.round(8 * s));
    // Front beam — illuminates snow ahead of groomer (above night overlay)
    const frontBeam = this.add.rectangle(0, 0, frontW, frontH, 0xffffee)
      .setAlpha(0.30).setDepth(DEPTHS.MENU_TREES + 1);
    // Rear glow — dimmer tail light on snow behind
    const rearGlow = this.add.rectangle(0, 0, rearW, rearH, 0xffddcc)
      .setAlpha(0.16).setDepth(DEPTHS.MENU_TREES + 1);
    // Small headlamp dot on the groomer cab
    const lampSize = Math.max(3, Math.round(4 * s));
    const lamp = this.add.rectangle(0, 0, lampSize, lampSize, 0xffee88)
      .setAlpha(0.9).setDepth(DEPTHS.MENU_TREES + 2);

    const updateLights = () => {
      const gx = (groomer as any).x ?? 0;
      const gy = (groomer as any).y ?? 0;
      const snowY = gy + trackY;
      // Front beam on snow ahead (left of groomer)
      frontBeam.setPosition(gx - frontW * 0.6, snowY);
      // Rear glow on snow behind (right of groomer)
      rearGlow.setPosition(gx + rearW * 0.4, snowY);
      // Lamp dot at front of groomer cab
      lamp.setPosition(gx - 12 * s, gy - 6 * s);
    };
    updateLights();

    // Animate groomer driving across the slope (bottom-right → upper-left)
    this.tweens.add({
      targets: groomer,
      x: width * 0.15,
      y: snowLineY - 60 * scaleFactor,
      duration: 10000,
      ease: 'Linear',
      onUpdate: updateLights,
    });

    // Groomed trail — horizontal corduroy marks on the snow behind the groomer
    const trail = this.add.graphics().setDepth(DEPTHS.MENU_SNOW + 1);
    let lastTrailX = (groomer as any).x;
    const trailH = Math.max(2, Math.round(3 * scaleFactor));
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

    // JP's line after a few seconds
    this.time.delayedCall(4000, () => {
      const fontSize = Math.max(12, Math.round(14 * scaleFactor));
      const text = this.add.text(width / 2, height * 0.2, t('prologueLine'), {
        fontFamily: THEME.fonts.family,
        fontSize: fontSize + 'px',
        color: THEME.colors.textSecondary,
        wordWrap: { width: width * 0.8 },
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setAlpha(0);

      this.tweens.add({ targets: text, alpha: 1, duration: 800 });
    });

    // "Skip" hint at bottom
    const skipFontSize = Math.max(10, Math.round(11 * scaleFactor));
    const skipText = this.add.text(width / 2, height * 0.92, t('prologueSkip'), {
      fontFamily: THEME.fonts.family,
      fontSize: skipFontSize + 'px',
      color: THEME.colors.textMuted,
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setAlpha(0);
    this.tweens.add({ targets: skipText, alpha: 0.6, duration: 1500, delay: 2000 });

    // Skip on any input (guard against double-fire)
    let advancing = false;
    const goToTutorial = () => {
      if (advancing) return;
      advancing = true;
      setString(STORAGE_KEYS.PROLOGUE_SEEN, '1');
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        resetGameScenes(this.game, 'GameScene', { level: 0 });
      });
    };

    this.input.on('pointerdown', goToTutorial);
    this.input.keyboard?.on('keydown', goToTutorial);
    if (this.input.gamepad) {
      this.input.gamepad.on('down', goToTutorial);
    }

    // Auto-advance after 12 seconds
    this.time.delayedCall(12000, goToTutorial);

    // Re-layout on orientation/resize changes
    this.resizeManager = new ResizeManager(this);
    this.resizeManager.register();
  }

  private shutdown(): void {
    this.resizeManager?.destroy();
    this.trailTimer?.destroy();
    this.input.off('pointerdown');
    this.input.keyboard?.removeAllListeners();
    if (this.input.gamepad) {
      this.input.gamepad.removeAllListeners();
    }
  }
}
