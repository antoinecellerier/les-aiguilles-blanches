import Phaser from 'phaser';
import { Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { worldToOverlay, overlayFullScreen } from '../utils/cameraCoords';

export class WeatherSystem {
  private scene: Phaser.Scene;
  private nightOverlay: Phaser.GameObjects.Graphics | null = null;
  private frostOverlay: Phaser.GameObjects.Graphics | null = null;
  private headlightDirection: { x: number; y: number } = { x: 0, y: -1 };
  private weatherParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private windStreaks: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private highContrastMode = false;
  private tileSize: number;

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
  }

  get isHighContrast(): boolean {
    return this.highContrastMode;
  }

  get headlight(): { x: number; y: number } {
    return this.headlightDirection;
  }

  get hasNightOverlay(): boolean {
    return this.nightOverlay !== null;
  }

  createWeatherEffects(level: Level): void {
    if (Accessibility.settings.reducedMotion) return;

    const isStorm = level.weather === 'storm';
    const isLightSnow = level.weather === 'light_snow';

    const config = {
      storm: {
        quantity: 8,
        frequency: 50,
        speedY: { min: 150, max: 300 },
        speedX: { min: -100, max: -30 },
        scale: { start: 0.4, end: 0.1 },
        alpha: { start: 1, end: 0.3 },
        lifespan: 3000,
        tint: 0xCCDDFF
      },
      light_snow: {
        quantity: 3,
        frequency: 150,
        speedY: { min: 30, max: 80 },
        speedX: { min: -15, max: 15 },
        scale: { start: 0.25, end: 0.1 },
        alpha: { start: 0.9, end: 0.4 },
        lifespan: 5000,
        tint: 0xFFFFFF
      },
      default: {
        quantity: 2,
        frequency: 200,
        speedY: { min: 20, max: 50 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.2, end: 0.08 },
        alpha: { start: 0.7, end: 0.2 },
        lifespan: 6000,
        tint: 0xFFFFFF
      }
    };

    const weatherConfig = isStorm ? config.storm :
      isLightSnow ? config.light_snow : config.default;

    this.weatherParticles = this.scene.add.particles(0, 0, 'snow_ungroomed', {
      x: { min: 0, max: this.scene.cameras.main.width * 1.5 },
      y: -20,
      lifespan: weatherConfig.lifespan,
      speedY: weatherConfig.speedY,
      speedX: weatherConfig.speedX,
      scale: weatherConfig.scale,
      alpha: weatherConfig.alpha,
      quantity: weatherConfig.quantity,
      frequency: weatherConfig.frequency,
      tint: weatherConfig.tint,
      blendMode: 'ADD'
    });
    this.weatherParticles.setScrollFactor(0);
    this.weatherParticles.setDepth(DEPTHS.WEATHER);

    if (isStorm) {
      this.windStreaks = this.scene.add.particles(0, 0, 'snow_ungroomed', {
        x: { min: this.scene.cameras.main.width, max: this.scene.cameras.main.width + 100 },
        y: { min: 0, max: this.scene.cameras.main.height },
        lifespan: 800,
        speedX: { min: -600, max: -400 },
        speedY: { min: 50, max: 100 },
        scale: { start: 0.15, end: 0.02 },
        alpha: { start: 0.6, end: 0 },
        quantity: 2,
        frequency: 80,
        tint: 0xAABBFF,
        blendMode: 'ADD'
      });
      this.windStreaks.setScrollFactor(0);
      this.windStreaks.setDepth(DEPTHS.WEATHER - 1);
    }
  }

  createNightOverlay(): void {
    this.nightOverlay = this.scene.add.graphics();
    this.nightOverlay.setDepth(DEPTHS.NIGHT_OVERLAY);
    this.nightOverlay.setScrollFactor(0);
  }

  updateNightOverlay(groomer: Phaser.Physics.Arcade.Sprite): void {
    if (!this.nightOverlay || !groomer) return;

    const cam = this.scene.cameras.main;
    const { x: screenX, y: screenY } = worldToOverlay(cam, groomer.x, groomer.y);

    this.updateFacing(groomer, 10);

    // Groomer work lights - world-space distances (camera zoom handles visual scaling)
    const radiusFront = this.tileSize * BALANCE.HEADLIGHT_FRONT_TILES;
    const radiusBack = this.tileSize * BALANCE.HEADLIGHT_REAR_TILES;
    const spreadAngle = BALANCE.HEADLIGHT_SPREAD;

    // Offset lights from groomer center (half the sprite size)
    const groomerRadius = this.tileSize * 0.5;
    const angle = Math.atan2(this.headlightDirection.y, this.headlightDirection.x);

    // Front and rear light origins
    const frontX = screenX + Math.cos(angle) * groomerRadius;
    const frontY = screenY + Math.sin(angle) * groomerRadius;
    const rearX = screenX - Math.cos(angle) * groomerRadius;
    const rearY = screenY - Math.sin(angle) * groomerRadius;

    this.drawDarkness(cam);

    // Draw wide fan-shaped work lights
    const steps = BALANCE.HEADLIGHT_STEPS;
    for (let i = steps - 1; i >= 0; i--) {
      const t = (i + 1) / steps;
      const stepAlpha = 0.1 * (steps - i) / steps;

      // Front work lights - wide flood pattern
      this.nightOverlay.fillStyle(0xffffee, stepAlpha);
      this.drawLightCone(frontX, frontY, angle, radiusFront * t, spreadAngle,
        BALANCE.HEADLIGHT_DIST_STEPS, BALANCE.HEADLIGHT_ARC_STEPS, 0.25, 0.5, 4);

      // Rear work lights - also wide
      this.nightOverlay.fillStyle(0xffddcc, stepAlpha * 0.7);
      this.drawLightCone(rearX, rearY, angle + Math.PI, radiusBack * t, spreadAngle * 0.9,
        BALANCE.HEADLIGHT_DIST_STEPS, BALANCE.HEADLIGHT_ARC_STEPS, 0.25, 0.5, 4);
    }
  }

  updateHeadlamp(skier: Phaser.Physics.Arcade.Sprite): void {
    if (!this.nightOverlay || !skier) return;

    const cam = this.scene.cameras.main;
    const { x: screenX, y: screenY } = worldToOverlay(cam, skier.x, skier.y);

    this.updateFacing(skier, 5);

    const radiusFront = this.tileSize * BALANCE.HEADLAMP_FRONT_TILES;
    const spreadAngle = BALANCE.HEADLAMP_SPREAD;
    const angle = Math.atan2(this.headlightDirection.y, this.headlightDirection.x);

    // Offset to head position (top of 20×28 sprite, ~10px above center)
    // then project forward in facing direction so beam is ahead of skier
    const zoom = cam.zoom || 1;
    const headOffset = 10 * skier.scaleY * zoom;
    const forwardOffset = this.tileSize * 0.6 * zoom;
    const headX = screenX + Math.cos(angle) * forwardOffset;
    const headY = screenY - headOffset + Math.sin(angle) * forwardOffset;

    this.drawDarkness(cam);

    // Single forward-facing headlamp cone from head
    const steps = BALANCE.HEADLAMP_STEPS;
    for (let i = steps - 1; i >= 0; i--) {
      const t = (i + 1) / steps;
      const stepAlpha = 0.12 * (steps - i) / steps;
      this.nightOverlay.fillStyle(0xffffff, stepAlpha);
      this.drawLightCone(headX, headY, angle, radiusFront * t, spreadAngle,
        BALANCE.HEADLAMP_DIST_STEPS, BALANCE.HEADLAMP_ARC_STEPS, 0.2, 0.6, 3);
    }

    // Small ambient glow around skier (reflected snow light)
    const glowRadius = this.tileSize * 1.2;
    for (let i = 3; i >= 0; i--) {
      this.nightOverlay.fillStyle(0xddeeff, 0.04 * (4 - i) / 4);
      this.nightOverlay.fillCircle(screenX, screenY, glowRadius * (i + 1) / 4);
    }
  }

  private updateFacing(sprite: Phaser.Physics.Arcade.Sprite, threshold: number): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body && (Math.abs(body.velocity.x) > threshold || Math.abs(body.velocity.y) > threshold)) {
      const len = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      this.headlightDirection = { x: body.velocity.x / len, y: body.velocity.y / len };
    }
  }

  private drawDarkness(cam: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.nightOverlay) return;
    this.nightOverlay.clear();
    this.nightOverlay.fillStyle(0x000022, BALANCE.NIGHT_DARKNESS_ALPHA);
    const fullScreen = overlayFullScreen(cam, 10);
    this.nightOverlay.fillRect(fullScreen.x, fullScreen.y, fullScreen.width, fullScreen.height);
  }

  private drawLightCone(
    cx: number, cy: number, angle: number, radius: number, spread: number,
    distSteps: number, arcSteps: number, sizeFactor: number, falloff: number, minSize: number
  ): void {
    if (!this.nightOverlay) return;

    for (let d = 1; d <= distSteps; d++) {
      const dist = radius * (d / distSteps);
      const circleRadius = radius * sizeFactor * (1 - d / distSteps * falloff);

      for (let a = -arcSteps / 2; a <= arcSteps / 2; a++) {
        const arcAngle = angle + (a / arcSteps) * spread;
        const px = cx + Math.cos(arcAngle) * dist;
        const py = cy + Math.sin(arcAngle) * dist;
        this.nightOverlay.fillCircle(px, py, Math.max(circleRadius, minSize));
      }
    }
  }

  createFrostOverlay(): void {
    this.frostOverlay = this.scene.add.graphics();
    this.frostOverlay.setDepth(DEPTHS.FROST_OVERLAY);
    this.frostOverlay.setScrollFactor(0);
  }

  updateFrostOverlay(frostLevel: number): void {
    if (!this.frostOverlay) return;
    this.frostOverlay.clear();
    if (frostLevel <= 0) return;

    const cam = this.scene.cameras.main;
    const fullScreen = overlayFullScreen(cam, 10);
    const { x, y, width, height } = fullScreen;

    // Frost vignette: icy border creeps inward from edges
    const maxInset = Math.min(width, height) * 0.3;
    const inset = maxInset * (frostLevel / 100);
    const steps = 12;
    const frostColor = 0xd0e8ff; // Icy blue-white

    for (let i = 0; i < steps; i++) {
      const outerT = i / steps;
      const innerT = (i + 1) / steps;
      const outerInset = inset * outerT;
      const innerInset = inset * innerT;
      const bandWidth = innerInset - outerInset;
      if (bandWidth < 1) continue;

      // Outer bands are most opaque, fading inward
      const alpha = (frostLevel / 100) * 0.7 * (1 - innerT * 0.85);
      if (alpha < 0.01) continue;

      this.frostOverlay.fillStyle(frostColor, alpha);
      // Top
      this.frostOverlay.fillRect(x, y + outerInset, width, bandWidth);
      // Bottom
      this.frostOverlay.fillRect(x, y + height - innerInset, width, bandWidth);
      // Left (between top and bottom bands)
      this.frostOverlay.fillRect(x + outerInset, y + innerInset, bandWidth, height - innerInset * 2);
      // Right
      this.frostOverlay.fillRect(x + width - innerInset, y + innerInset, bandWidth, height - innerInset * 2);
    }
  }

  applyAccessibilitySettings(): void {
    Accessibility.applyDOMSettings();
    this.highContrastMode = Accessibility.settings.highContrast;
  }

  reset(): void {
    this.weatherParticles = null;
    this.windStreaks = null;
    this.nightOverlay = null;
    this.frostOverlay = null;
    this.headlightDirection = { x: 0, y: -1 };
  }
}
