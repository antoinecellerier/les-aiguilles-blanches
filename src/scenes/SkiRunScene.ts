import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { getGroomedTiles } from '../utils/skiRunState';
import { LevelGeometry } from '../systems/LevelGeometry';
import { PisteRenderer } from '../systems/PisteRenderer';
import { ObstacleBuilder } from '../systems/ObstacleBuilder';
import { WeatherSystem } from '../systems/WeatherSystem';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { isGamepadButtonPressed, captureGamepadButtons, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { playClick } from '../systems/UISounds';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { BINDINGS_VERSION } from '../config/storageKeys';

/**
 * SkiRunScene — Relaxed post-grooming descent.
 * Player skis/snowboards down the piste they just groomed.
 * No fail states; gravity-driven movement with lateral steering.
 */

interface SkiRunData {
  level: number;
}

export default class SkiRunScene extends Phaser.Scene {
  private level!: Level;
  private levelIndex = 0;
  private tileSize = 0;

  // Player
  private skier!: Phaser.Physics.Arcade.Sprite;
  private baseTexture = 'skier';
  private currentSpeed = 0;
  private bumpSlowdownUntil = 0;
  private terrainBlend = 1.0;

  // Geometry
  private geometry = new LevelGeometry();
  private groomedTiles = new Set<string>();
  private groomedGrid: boolean[][] = [];

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private brakeKey!: Phaser.Input.Keyboard.Key;
  private gamepadBindings: GamepadBindings = loadGamepadBindings();
  private hasTouch = false;
  private touchInputX = 0;
  private touchBraking = false;

  // HUD elements
  private speedText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private elapsedTime = 0;

  // State
  private isFinished = false;
  private isCrashed = false;
  private crashTimer = 0;
  private startX = 0;
  private startY = 0;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private weatherSystem: WeatherSystem | null = null;
  private nightUpdateHandler?: () => void;

  constructor() {
    super({ key: 'SkiRunScene' });
  }

  init(data: SkiRunData): void {
    this.levelIndex = data.level ?? 0;
    this.level = LEVELS[this.levelIndex];
    this.isFinished = false;
    this.isCrashed = false;
    this.crashTimer = 0;
    this.elapsedTime = 0;
    this.currentSpeed = 0;
    this.terrainBlend = 1.0;
    this.bumpSlowdownUntil = 0;
  }

  create(): void {
    this.hasTouch = detectTouch();
    this.groomedTiles = getGroomedTiles();

    const tileSize = Math.max(16, Math.min(
      this.scale.width / this.level.width,
      this.scale.height / this.level.height
    ));
    this.tileSize = tileSize;

    const worldWidth = this.level.width * tileSize;
    const worldHeight = this.level.height * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Generate geometry
    this.geometry.generate(this.level, tileSize);

    // Build the snow grid with groomed state from the completed level
    this.createSnowGrid(tileSize);

    // Piste renderer (boundaries, markers, cliffs, trees)
    const pisteRenderer = new PisteRenderer(this, this.geometry);
    const { boundaryWalls, dangerZones } = pisteRenderer.createBoundaryColliders(this.level, tileSize);
    pisteRenderer.createPisteBoundaries(this.level, tileSize, worldWidth);

    // Obstacles (reuse same system)
    this.obstacles = this.physics.add.staticGroup();
    const interactables = this.physics.add.staticGroup();
    const obstacleBuilder = new ObstacleBuilder(this, this.geometry);
    obstacleBuilder.create(this.level, tileSize, this.obstacles, interactables);

    // Weather (visual only)
    this.weatherSystem = new WeatherSystem(this, tileSize);
    if (this.level.isNight) {
      this.weatherSystem.createNightOverlay();
    }
    if (this.level.weather !== 'clear') {
      this.weatherSystem.createWeatherEffects(this.level);
    }
    this.weatherSystem?.applyAccessibilitySettings();

    // Create skier/snowboarder
    this.createSkier(tileSize);

    // Camera
    this.cameras.main.startFollow(this.skier, true, BALANCE.CAMERA_LERP, BALANCE.CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    // Zoom to match GameScene viewport
    const zoomX = this.scale.width / worldWidth;
    const zoomY = this.scale.height / worldHeight;
    const zoom = Math.max(zoomX, zoomY, BALANCE.SKI_MIN_ZOOM);
    this.cameras.main.setZoom(zoom);

    // Night headlight follows skier
    if (this.level.isNight) {
      this.nightUpdateHandler = () => this.weatherSystem?.updateNightOverlay(this.skier);
      this.events.on('update', this.nightUpdateHandler);
    }

    // Collisions
    this.physics.add.collider(this.skier, this.obstacles, () => this.onBump());
    this.physics.add.collider(this.skier, boundaryWalls, () => this.onBump());
    this.physics.add.overlap(this.skier, dangerZones, () => this.onWipeout());

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      const bindings = this.loadKeyBindings();
      this.wasd = {
        up: this.input.keyboard.addKey(bindings.up),
        down: this.input.keyboard.addKey(bindings.down),
        left: this.input.keyboard.addKey(bindings.left),
        right: this.input.keyboard.addKey(bindings.right),
      };
      this.brakeKey = this.input.keyboard.addKey(bindings.winch);
    }
    captureGamepadButtons(this, [14, 15, this.gamepadBindings.winch]);

    // Touch input — left/right half for steering, two-finger or top-quarter for brake
    if (this.hasTouch) {
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown) {
          const centerX = this.scale.width / 2;
          this.touchInputX = Phaser.Math.Clamp((p.x - centerX) / (centerX * 0.5), -1, 1);
        }
      });
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        // Brake when tapping the top quarter of screen
        if (p.y < this.scale.height * 0.25) this.touchBraking = true;
      });
      this.input.on('pointerup', () => { this.touchInputX = 0; this.touchBraking = false; });
    }

    // HUD overlay
    this.createHUD();

    // ESC aborts the run (returns to level complete without celebration)
    this.input.keyboard?.on('keydown-ESC', () => this.abortRun());

    this.events.once('shutdown', this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isFinished) return;

    const dt = delta / 1000;

    // Crash recovery: freeze movement, count down
    if (this.isCrashed) {
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        this.isCrashed = false;
        this.skier.setAlpha(1);
        this.skier.setPosition(this.startX, this.startY);
        this.currentSpeed = 0;
      }
      return;
    }

    this.elapsedTime += dt;

    // Lateral input
    let lateralInput = 0;
    if (this.cursors?.left?.isDown || this.wasd?.left?.isDown) lateralInput = -1;
    if (this.cursors?.right?.isDown || this.wasd?.right?.isDown) lateralInput = 1;

    // Gamepad
    const pad = this.input.gamepad?.getPad(0);
    if (pad) {
      const lx = pad.leftStick?.x ?? 0;
      if (Math.abs(lx) > BALANCE.GAMEPAD_DEADZONE) lateralInput = lx;
      // D-pad left/right (standard mapping buttons 14/15)
      if (isGamepadButtonPressed(pad, 14)) lateralInput = -1;
      if (isGamepadButtonPressed(pad, 15)) lateralInput = 1;
    }

    // Touch
    if (this.hasTouch && Math.abs(this.touchInputX) > 0.1) {
      lateralInput = this.touchInputX;
    }

    // Brake input (winch key / gamepad LB / touch)
    let braking = this.brakeKey?.isDown ?? false;
    if (pad && isGamepadButtonPressed(pad, this.gamepadBindings.winch)) braking = true;
    if (this.touchBraking) braking = true;

    // Terrain check — groomed vs ungroomed (smoothed transition)
    const tileX = Math.floor(this.skier.x / this.tileSize);
    const tileY = Math.floor(this.skier.y / this.tileSize);
    const onGroomed = this.groomedGrid[tileY]?.[tileX] ?? false;
    const rawTerrainMult = onGroomed
      ? BALANCE.SKI_GROOMED_MULTIPLIER
      : BALANCE.SKI_UNGROOMED_MULTIPLIER;
    // Lerp terrain blend for smooth groomed↔ungroomed transitions
    const blendRate = 3.0; // how fast terrain effect transitions (higher = faster)
    this.terrainBlend += (rawTerrainMult - this.terrainBlend) * Math.min(1, blendRate * dt);
    const terrainMultiplier = this.terrainBlend;

    // Slope detection — steeper sections = faster
    let slopeAngle: number = BALANCE.SKI_SLOPE_BASE;
    const skierY = this.skier.y;
    for (const zone of this.geometry.steepZoneRects) {
      if (skierY >= zone.startY && skierY <= zone.endY) {
        slopeAngle = zone.slope;
        break;
      }
    }
    const slopeMult = 1 + (slopeAngle - BALANCE.SKI_SLOPE_BASE) * BALANCE.SKI_SLOPE_SPEED_FACTOR;

    // Speed calculation — heading-aware gravity
    // When facing sideways (high lateral input), gravity pull is reduced
    const headingFactor = 1 - BALANCE.SKI_HEADING_FACTOR * Math.abs(lateralInput);
    const isBumped = this.game.getTime() < this.bumpSlowdownUntil;
    const bumpMult = isBumped ? BALANCE.SKI_BUMP_SLOWDOWN : 1.0;
    const targetSpeed = BALANCE.SKI_GRAVITY_SPEED * terrainMultiplier * slopeMult * bumpMult * headingFactor;
    const maxSpeed = BALANCE.SKI_MAX_SPEED * terrainMultiplier * slopeMult * bumpMult;

    // Progressive acceleration — slow buildup, slope-aware
    if (braking) {
      this.currentSpeed = Math.max(0, this.currentSpeed - BALANCE.SKI_BRAKE_DECELERATION * dt);
    } else if (this.currentSpeed < targetSpeed) {
      // Acceleration scales with slope and heading — pointing straight downhill = fastest buildup
      const accel = BALANCE.SKI_ACCELERATION * slopeMult * headingFactor;
      this.currentSpeed = Math.min(this.currentSpeed + accel * dt, targetSpeed);
    } else {
      // Decelerate toward target when overshooting (e.g. after turning into a flat section)
      this.currentSpeed = Math.max(this.currentSpeed - BALANCE.SKI_DRAG * dt, targetSpeed);
    }
    this.currentSpeed = Math.min(this.currentSpeed, maxSpeed);

    // Carving friction — turning bleeds speed proportional to lateral input
    if (Math.abs(lateralInput) > 0.1) {
      this.currentSpeed *= (1 - BALANCE.SKI_CARVE_DRAG * Math.abs(lateralInput) * dt);
    }

    // Apply movement — lateral speed scales with downhill speed (need momentum to carve)
    const vy = this.currentSpeed;
    const speedRatio = Math.min(this.currentSpeed / BALANCE.SKI_GRAVITY_SPEED, 1.5);
    const vx = lateralInput * BALANCE.SKI_LATERAL_SPEED * speedRatio;
    this.skier.setVelocity(vx, vy);

    // Directional sprite — brake takes priority, then lateral input
    const deadzone: number = BALANCE.SKI_SPRITE_DEADZONE;
    if (braking) {
      this.skier.setTexture(this.baseTexture + '_brake');
    } else if (lateralInput < -deadzone) {
      this.skier.setTexture(this.baseTexture + '_left');
    } else if (lateralInput > deadzone) {
      this.skier.setTexture(this.baseTexture + '_right');
    } else {
      this.skier.setTexture(this.baseTexture);
    }

    // HUD update
    const kmh = Math.round(this.currentSpeed * BALANCE.SKI_SPEED_SCALE);
    this.speedText.setText(`${t('skiRunSpeed') || 'Speed'}: ${kmh} km/h`);
    this.timeText.setText(`${t('skiRunTime') || 'Time'}: ${this.formatTime(this.elapsedTime)}`);

    // Check if reached bottom
    if (this.skier.y >= (this.level.height - BALANCE.SKI_FINISH_BUFFER) * this.tileSize) {
      this.finishRun();
    }
  }

  private createSnowGrid(tileSize: number): void {
    // Build groomed state lookup
    this.groomedGrid = [];
    for (let y = 0; y < this.level.height; y++) {
      this.groomedGrid[y] = [];
      for (let x = 0; x < this.level.width; x++) {
        const isGroomable = this.geometry.isInPiste(x, y, this.level);
        const wasGroomed = isGroomable && this.groomedTiles.has(`${x},${y}`);
        this.groomedGrid[y][x] = wasGroomed;

        const texture = wasGroomed ? 'snow_groomed' : (isGroomable ? 'snow_ungroomed' : 'snow_offpiste');
        const tile = this.add.image(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          texture
        );
        tile.setDisplaySize(tileSize, tileSize);
        if (isGroomable) tile.setDepth(DEPTHS.PISTE);
      }
    }
  }

  private createSkier(tileSize: number): void {
    // Start at top of piste
    const topYIndex = Math.max(3, Math.floor(this.level.height * 0.05));
    const topPath = this.geometry.pistePath[topYIndex] || { centerX: this.level.width / 2 };
    const startX = topPath.centerX * tileSize;
    const startY = topYIndex * tileSize;
    this.startX = startX;
    this.startY = startY;

    const mode = getString(STORAGE_KEYS.SKI_MODE) || 'ski';
    this.baseTexture = mode === 'snowboard' ? 'snowboarder' : 'skier';

    this.skier = this.physics.add.sprite(startX, startY, this.baseTexture);
    this.skier.setCollideWorldBounds(true);
    this.skier.setDrag(BALANCE.SKI_DRAG);
    this.skier.setScale(tileSize / 16);
    this.skier.setDepth(DEPTHS.PLAYER);
  }

  private createHUD(): void {
    const { width } = this.scale;
    const a11y = Accessibility.settings;
    const hc = a11y.highContrast;
    const cb = a11y.colorblindMode !== 'none';

    // Scale calculations matching HUDScene
    const refWidth = 1024;
    const uiScale = Math.max(0.6, Math.min(2.0, width / refWidth));
    const padding = Math.round(10 * uiScale);
    const fontSmall = Math.max(12, Math.round(14 * uiScale)) + 'px';
    const fontLarge = Math.max(18, Math.round(24 * uiScale)) + 'px';

    const a11yStroke = (hc || cb) ? '#000000' : undefined;
    const a11yStrokeThickness = (hc || cb) ? Math.max(2, Math.round(3 * uiScale)) : 0;
    const visorText = (x: number, y: number, content: string, fontSize: string, color = '#FFFFFF') =>
      this.add.text(x, y, content, {
        fontFamily: THEME.fonts.family, fontSize, fontStyle: 'bold', color,
        stroke: a11yStroke, strokeThickness: a11yStrokeThickness,
      }).setScrollFactor(0).setDepth(DEPTHS.FEEDBACK);

    // Visor strip
    const row1Y = padding;
    const row2Y = row1Y + Math.round(26 * uiScale);
    const visorHeight = row2Y + Math.round(18 * uiScale);
    const visorAlpha = (hc || cb) ? 0.8 : 0.55;
    this.add.rectangle(0, 0, width, visorHeight, 0x000000)
      .setOrigin(0).setScrollFactor(0).setAlpha(visorAlpha).setDepth(DEPTHS.FEEDBACK - 1);
    const accentHeight = hc ? 2 : 1;
    this.add.rectangle(0, visorHeight - accentHeight, width, accentHeight, THEME.colors.infoHex)
      .setOrigin(0).setScrollFactor(0).setAlpha(hc ? 0.8 : 0.4).setDepth(DEPTHS.FEEDBACK - 1);

    // Level name (left)
    const mode = getString(STORAGE_KEYS.SKI_MODE) || 'ski';
    const modeIcon = mode === 'snowboard' ? '🏂' : '⛷️';
    visorText(padding, row1Y, `${modeIcon} ${t(this.level.nameKey) || 'Ski Run'}`, fontSmall);

    // Speed (left, row 2)
    this.speedText = visorText(padding, row2Y, '', fontSmall);

    // Time (right-aligned)
    this.timeText = visorText(width - padding, row1Y, '', fontLarge)
      .setOrigin(1, 0);
  }

  private onBump(): void {
    // Cooldown: don't re-trigger during an active bump slowdown
    if (this.game.getTime() < this.bumpSlowdownUntil) return;
    this.bumpSlowdownUntil = this.game.getTime() + BALANCE.SKI_BUMP_DURATION;
    this.currentSpeed *= BALANCE.SKI_BUMP_SLOWDOWN;
    this.cameras.main.shake(BALANCE.SKI_BUMP_SHAKE.duration, BALANCE.SKI_BUMP_SHAKE.intensity);
  }

  private onWipeout(): void {
    if (this.isCrashed || this.isFinished) return;
    this.isCrashed = true;
    this.crashTimer = BALANCE.SKI_CRASH_DURATION;
    this.skier.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.skier.setAlpha(0.4);
    this.cameras.main.shake(300, 0.008);
  }

  private finishRun(): void {
    if (this.isFinished) return;
    this.isFinished = true;

    this.skier.setVelocity(0, 0);
    playClick();

    this.time.delayedCall(BALANCE.SKI_CELEBRATION_DELAY, () => {
      resetGameScenes(this.game, 'LevelCompleteScene', {
        won: true,
        level: this.levelIndex,
        coverage: 100,
        timeUsed: 0,
      });
    });
  }

  private abortRun(): void {
    if (this.isFinished) return;
    this.isFinished = true;
    this.skier.setVelocity(0, 0);
    resetGameScenes(this.game, 'LevelCompleteScene', {
      won: true,
      level: this.levelIndex,
      coverage: 100,
      timeUsed: 0,
    });
  }

  private formatTime(seconds: number): string {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  }

  private loadKeyBindings(): { up: number; down: number; left: number; right: number; groom: number; winch: number } {
    const defaults = getLayoutDefaults();
    const savedVersion = getString(STORAGE_KEYS.BINDINGS_VERSION);
    if (savedVersion !== String(BINDINGS_VERSION)) return defaults;
    const saved = getString(STORAGE_KEYS.BINDINGS);
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      const result = { ...defaults };
      for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) {
        if (typeof parsed[key] === 'number' && parsed[key] > 0) result[key] = parsed[key];
      }
      return result;
    } catch { return defaults; }
  }

  shutdown(): void {
    if (this.nightUpdateHandler) {
      this.events.off('update', this.nightUpdateHandler);
      this.nightUpdateHandler = undefined;
    }
    this.weatherSystem?.reset();
    this.weatherSystem = null;
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
  }
}
