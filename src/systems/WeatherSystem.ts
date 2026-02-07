import Phaser from 'phaser';
import { Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';

export class WeatherSystem {
  private scene: Phaser.Scene;
  private nightOverlay: Phaser.GameObjects.Graphics | null = null;
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
    const viewWidth = cam.width;
    const viewHeight = cam.height;

    // Convert groomer world position to screen position
    const screenX = groomer.x - cam.scrollX;
    const screenY = groomer.y - cam.scrollY;

    // Update facing direction based on velocity
    const body = groomer.body as Phaser.Physics.Arcade.Body;
    if (body && (Math.abs(body.velocity.x) > 10 || Math.abs(body.velocity.y) > 10)) {
      const len = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      this.headlightDirection = { x: body.velocity.x / len, y: body.velocity.y / len };
    }

    // Groomer work lights - wide flood pattern front and back
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

    this.nightOverlay.clear();

    // Draw darker overlay everywhere
    const darkness = 0x000022;
    const alpha = BALANCE.NIGHT_DARKNESS_ALPHA;

    this.nightOverlay.fillStyle(darkness, alpha);
    this.nightOverlay.fillRect(0, 0, viewWidth, viewHeight);

    // Draw wide fan-shaped work lights
    const steps = BALANCE.HEADLIGHT_STEPS;
    for (let i = steps - 1; i >= 0; i--) {
      const t = (i + 1) / steps;
      const stepAlpha = 0.1 * (steps - i) / steps;

      // Front work lights - wide flood pattern
      this.nightOverlay.fillStyle(0xffffee, stepAlpha);
      this.drawFloodLight(frontX, frontY, angle, radiusFront * t, spreadAngle);

      // Rear work lights - also wide
      this.nightOverlay.fillStyle(0xffddcc, stepAlpha * 0.7);
      this.drawFloodLight(rearX, rearY, angle + Math.PI, radiusBack * t, spreadAngle * 0.9);
    }
  }

  private drawFloodLight(cx: number, cy: number, angle: number, radius: number, spread: number): void {
    if (!this.nightOverlay) return;

    const distSteps = BALANCE.HEADLIGHT_DIST_STEPS;
    const arcSteps = BALANCE.HEADLIGHT_ARC_STEPS;

    for (let d = 1; d <= distSteps; d++) {
      const dist = radius * (d / distSteps);
      const circleRadius = radius * 0.25 * (1 - d / distSteps * 0.5);

      for (let a = -arcSteps / 2; a <= arcSteps / 2; a++) {
        const arcAngle = angle + (a / arcSteps) * spread;
        const px = cx + Math.cos(arcAngle) * dist;
        const py = cy + Math.sin(arcAngle) * dist;
        this.nightOverlay.fillCircle(px, py, Math.max(circleRadius, 4));
      }
    }
  }

  applyAccessibilitySettings(): void {
    const settings = Accessibility.settings;

    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
      this.highContrastMode = true;
    } else {
      document.body.classList.remove('high-contrast');
      this.highContrastMode = false;
    }

    const canvas = document.querySelector('#game-container canvas') as HTMLCanvasElement | null;
    if (canvas) {
      if (settings.colorblindMode && settings.colorblindMode !== 'none') {
        canvas.style.filter = `url(#${settings.colorblindMode}-filter)`;
        this.ensureColorblindFilters();
      } else {
        canvas.style.filter = '';
      }
    }
  }

  ensureColorblindFilters(): void {
    if (document.getElementById('colorblind-filters')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'colorblind-filters';
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.innerHTML = `
      <defs>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625 0.375 0 0 0
            0.7 0.3 0 0 0
            0 0.3 0.7 0 0
            0 0 0 1 0"/>
        </filter>
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567 0.433 0 0 0
            0.558 0.442 0 0 0
            0 0.242 0.758 0 0
            0 0 0 1 0"/>
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95 0.05 0 0 0
            0 0.433 0.567 0 0
            0 0.475 0.525 0 0
            0 0 0 1 0"/>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
  }

  reset(): void {
    this.weatherParticles = null;
    this.windStreaks = null;
    this.nightOverlay = null;
    this.headlightDirection = { x: 0, y: -1 };
  }
}
