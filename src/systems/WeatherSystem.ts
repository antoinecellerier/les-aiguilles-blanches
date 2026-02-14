import Phaser from 'phaser';
import { Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { worldToOverlay, overlayFullScreen } from '../utils/cameraCoords';

export class WeatherSystem {
  private scene: Phaser.Scene;
  private nightOverlay: Phaser.GameObjects.Image | null = null;
  private nightTexKey = '__night_overlay';
  private nightCtx: CanvasRenderingContext2D | null = null;
  private nightDynTex: Phaser.Textures.DynamicTexture | null = null;
  private frostOverlay: Phaser.GameObjects.Image | null = null;
  private frostTexKey = '__frost_vignette';
  private frostTexSize = { w: 0, h: 0 };
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
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    if (this.nightOverlay) {
      this.nightOverlay.destroy();
      this.nightOverlay = null;
    }
    if (this.scene.textures.exists(this.nightTexKey)) {
      this.scene.textures.remove(this.nightTexKey);
    }
    this.nightDynTex = this.scene.textures.addDynamicTexture(this.nightTexKey, w, h)!;
    this.nightCtx = this.nightDynTex.context!;

    this.nightOverlay = this.scene.add.image(w / 2, h / 2, this.nightTexKey);
    this.nightOverlay.setDepth(DEPTHS.NIGHT_OVERLAY);
    this.nightOverlay.setScrollFactor(0);
  }

  /** Position overlay to cover full screen and map world coords to canvas pixels. */
  private prepareNightFrame(
    worldX: number, worldY: number
  ): { ctx: CanvasRenderingContext2D; w: number; h: number; zoom: number; screenX: number; screenY: number } | null {
    if (!this.nightCtx || !this.nightOverlay) return null;
    const cam = this.scene.cameras.main;
    const ctx = this.nightCtx;
    const w = cam.width;
    const h = cam.height;
    const zoom = cam.zoom || 1;

    const ofs = overlayFullScreen(cam);
    this.nightOverlay.setPosition(ofs.x + ofs.width / 2, ofs.y + ofs.height / 2);
    this.nightOverlay.setDisplaySize(ofs.width, ofs.height);

    const drawPos = worldToOverlay(cam, worldX, worldY);
    const screenX = (drawPos.x - ofs.x) * zoom;
    const screenY = (drawPos.y - ofs.y) * zoom;

    // Fill darkness
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = BALANCE.NIGHT_DARKNESS_ALPHA;
    ctx.fillStyle = '#000022';
    ctx.fillRect(0, 0, w, h);

    return { ctx, w, h, zoom, screenX, screenY };
  }

  updateNightOverlay(groomer: Phaser.Physics.Arcade.Sprite): void {
    if (!groomer) return;
    const frame = this.prepareNightFrame(groomer.x, groomer.y);
    if (!frame) return;
    const { ctx, zoom, screenX, screenY } = frame;

    this.updateFacing(groomer, 10);

    const radiusFront = this.tileSize * BALANCE.HEADLIGHT_FRONT_TILES * zoom;
    const radiusBack = this.tileSize * BALANCE.HEADLIGHT_REAR_TILES * zoom;
    const spreadAngle = BALANCE.HEADLIGHT_SPREAD;

    const groomerRadius = this.tileSize * 0.5 * zoom;
    const angle = Math.atan2(this.headlightDirection.y, this.headlightDirection.x);

    const frontX = screenX + Math.cos(angle) * groomerRadius;
    const frontY = screenY + Math.sin(angle) * groomerRadius;
    const rearX = screenX - Math.cos(angle) * groomerRadius;
    const rearY = screenY - Math.sin(angle) * groomerRadius;

    // Draw light circles on top (same approach as original Phaser Graphics)
    const steps = BALANCE.HEADLIGHT_STEPS;
    for (let i = steps - 1; i >= 0; i--) {
      const t = (i + 1) / steps;
      const stepAlpha = 0.1 * (steps - i) / steps;

      // Front work lights
      ctx.fillStyle = '#ffffee';
      this.drawLightConeCanvas(ctx, frontX, frontY, angle, radiusFront * t, spreadAngle,
        BALANCE.HEADLIGHT_DIST_STEPS, BALANCE.HEADLIGHT_ARC_STEPS, 0.4, 0.5, 6, stepAlpha);

      // Rear work lights
      ctx.fillStyle = '#ffddcc';
      this.drawLightConeCanvas(ctx, rearX, rearY, angle + Math.PI, radiusBack * t, spreadAngle * 0.9,
        BALANCE.HEADLIGHT_DIST_STEPS, BALANCE.HEADLIGHT_ARC_STEPS, 0.4, 0.5, 6, stepAlpha * 0.7);
    }

    ctx.globalAlpha = 1;
  }

  updateHeadlamp(skier: Phaser.Physics.Arcade.Sprite): void {
    if (!skier) return;
    const frame = this.prepareNightFrame(skier.x, skier.y);
    if (!frame) return;
    const { ctx, zoom, screenX, screenY } = frame;

    this.updateFacing(skier, 5);

    const radiusFront = this.tileSize * BALANCE.HEADLAMP_FRONT_TILES * zoom;
    const spreadAngle = BALANCE.HEADLAMP_SPREAD;
    const angle = Math.atan2(this.headlightDirection.y, this.headlightDirection.x);

    const headOffset = 10 * skier.scaleY * zoom;
    const forwardOffset = this.tileSize * 0.6 * zoom;
    const headX = screenX + Math.cos(angle) * forwardOffset;
    const headY = screenY - headOffset + Math.sin(angle) * forwardOffset;

    // Draw light circles on top
    ctx.fillStyle = '#ffffff';
    const steps = BALANCE.HEADLAMP_STEPS;
    for (let i = steps - 1; i >= 0; i--) {
      const t = (i + 1) / steps;
      const stepAlpha = 0.12 * (steps - i) / steps;
      this.drawLightConeCanvas(ctx, headX, headY, angle, radiusFront * t, spreadAngle,
        BALANCE.HEADLAMP_DIST_STEPS, BALANCE.HEADLAMP_ARC_STEPS, 0.2, 0.6, 3, stepAlpha);
    }

    // Ambient glow around skier
    ctx.fillStyle = '#ddeeff';
    const glowRadius = this.tileSize * 1.2 * zoom;
    for (let i = 3; i >= 0; i--) {
      const alpha = 0.04 * (4 - i) / 4;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(screenX, screenY, glowRadius * (i + 1) / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private updateFacing(sprite: Phaser.Physics.Arcade.Sprite, threshold: number): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body && (Math.abs(body.velocity.x) > threshold || Math.abs(body.velocity.y) > threshold)) {
      const len = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      this.headlightDirection = { x: body.velocity.x / len, y: body.velocity.y / len };
    }
  }

  /** Draw light cone circles directly to canvas, erasing darkness */
  private drawLightConeCanvas(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, angle: number, radius: number, spread: number,
    distSteps: number, arcSteps: number, sizeFactor: number, falloff: number,
    minSize: number, alpha: number
  ): void {
    ctx.globalAlpha = alpha;
    for (let d = 1; d <= distSteps; d++) {
      const dist = radius * (d / distSteps);
      const circleRadius = Math.max(radius * sizeFactor * (1 - d / distSteps * falloff), minSize);

      for (let a = -arcSteps / 2; a <= arcSteps / 2; a++) {
        const arcAngle = angle + (a / arcSteps) * spread;
        const px = cx + Math.cos(arcAngle) * dist;
        const py = cy + Math.sin(arcAngle) * dist;
        ctx.beginPath();
        ctx.arc(px, py, circleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  createFrostOverlay(): void {
    this.rebuildFrostTexture();
  }

  /** Build (or rebuild) the frost vignette texture at current screen size. */
  private rebuildFrostTexture(): void {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Skip if size hasn't changed (avoids expensive generateTexture on pause/resume)
    if (w === this.frostTexSize.w && h === this.frostTexSize.h && this.frostOverlay) return;
    this.frostTexSize = { w, h };

    // Draw frost vignette into an off-screen Graphics, then snapshot to texture
    const gfx = this.scene.make.graphics({ x: 0, y: 0 } as any, false);
    const frostColor = 0xc8e8ff;

    // Full-screen wash — visible even at low frost levels
    gfx.fillStyle(frostColor, 0.35);
    gfx.fillRect(0, 0, w, h);

    // Thick edge bands creating a vignette from edges toward center
    const maxInset = Math.min(w, h) * 0.35;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const d = maxInset * t;
      const alpha = (1 - t * 0.6) * 0.6;
      gfx.fillStyle(frostColor, alpha);
      gfx.fillRect(0, 0, w, d);             // Top
      gfx.fillRect(0, h - d, w, d);         // Bottom
      gfx.fillRect(0, 0, d, h);             // Left
      gfx.fillRect(w - d, 0, d, h);         // Right
    }

    // Convert to a static texture (single bitmap — zero per-frame cost)
    if (this.scene.textures.exists(this.frostTexKey)) {
      this.scene.textures.remove(this.frostTexKey);
    }
    gfx.generateTexture(this.frostTexKey, w, h);
    gfx.destroy();

    // Create or update the Image
    if (this.frostOverlay) {
      this.frostOverlay.setTexture(this.frostTexKey);
      this.frostOverlay.setDisplaySize(w, h);
    } else {
      this.frostOverlay = this.scene.add.image(w / 2, h / 2, this.frostTexKey);
      this.frostOverlay.setDepth(DEPTHS.FROST_OVERLAY);
      this.frostOverlay.setScrollFactor(0);
      this.frostOverlay.setAlpha(0);
    }
  }

  updateFrostOverlay(frostLevel: number): void {
    if (!this.frostOverlay) return;
    // Just update alpha — the texture is static, so Canvas blits one bitmap
    this.frostOverlay.setAlpha(frostLevel / 100);
  }

  /** Rebuild frost texture on window resize so it covers the new viewport. */
  handleFrostResize(): void {
    if (this.frostOverlay) {
      const alpha = this.frostOverlay.alpha;
      this.rebuildFrostTexture();
      this.frostOverlay!.setAlpha(alpha);
    }
  }

  /** Rebuild night overlay DynamicTexture on window resize. */
  handleNightResize(): void {
    if (!this.nightOverlay) return;
    this.createNightOverlay();
  }

  applyAccessibilitySettings(): void {
    Accessibility.applyDOMSettings();
    this.highContrastMode = Accessibility.settings.highContrast;
  }

  reset(): void {
    this.weatherParticles = null;
    this.windStreaks = null;
    this.nightOverlay = null;
    this.nightCtx = null;
    this.nightDynTex = null;
    this.frostOverlay = null;
    this.frostTexSize = { w: 0, h: 0 };
    this.headlightDirection = { x: 0, y: -1 };
  }
}
