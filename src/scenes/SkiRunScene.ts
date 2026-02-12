import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { getGroomedTiles } from '../utils/skiRunState';
import { LevelGeometry } from '../systems/LevelGeometry';
import { PisteRenderer } from '../systems/PisteRenderer';
import { ObstacleBuilder } from '../systems/ObstacleBuilder';
import { ParkFeatureSystem } from '../systems/ParkFeatureSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { isGamepadButtonPressed, captureGamepadButtons, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { playClick } from '../systems/UISounds';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { BINDINGS_VERSION } from '../config/storageKeys';
import { overlayFullScreen } from '../utils/cameraCoords';
import { GAME_EVENTS, type TouchInputEvent } from '../types/GameSceneInterface';

/**
 * SkiRunScene — Relaxed post-grooming descent.
 * Player skis/snowboards down the piste they just groomed.
 * No fail states; gravity-driven movement with lateral steering.
 */

interface SkiRunData {
  level: number;
  mode?: 'ski' | 'snowboard';
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
  private touchInput: TouchInputEvent = { left: false, right: false, up: false, down: false, groom: false, winch: false };
  private boundTouchHandler = (data: TouchInputEvent) => { this.touchInput = data; };

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
  private parkFeatures = new ParkFeatureSystem();
  private weatherSystem: WeatherSystem | null = null;
  private nightUpdateHandler?: () => void;
  private lastTrickTime = 0;
  private trickActive = false;
  private trickShadow: Phaser.GameObjects.Graphics | null = null;
  private trickShadowUpdater: (() => void) | null = null;
  private turnHoldTime = 0; // seconds of continuous lateral input
  private resolvedMode = 'ski'; // resolved from 'random' once per run

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
    // Resolve mode: use passed value, or resolve random here
    if (data.mode) {
      this.resolvedMode = data.mode;
    } else {
      let mode = getString(STORAGE_KEYS.SKI_MODE) || 'random';
      if (mode === 'random') mode = Math.random() < 0.5 ? 'ski' : 'snowboard';
      this.resolvedMode = mode;
    }
  }

  create(): void {
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

    // Park features (kickers, rails, halfpipe)
    if (this.level.specialFeatures?.length) {
      this.parkFeatures.create(this, this.level, this.geometry, tileSize);
      // Enlarge feature hitboxes for ski run — triggers tricks earlier
      if (this.parkFeatures.featureGroup) {
        for (const sprite of this.parkFeatures.featureGroup.getChildren()) {
          const body = (sprite as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
          const newW = body.width * 1.8;
          const newH = body.height * 1.8;
          body.setSize(newW, newH);
          // Re-center the enlarged body around the sprite's world position
          const s = sprite as Phaser.Physics.Arcade.Sprite;
          body.setOffset((s.displayWidth - newW) / 2, (s.displayHeight - newH) / 2);
        }
      }
    }

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
    this.physics.add.collider(this.skier, boundaryWalls, () => this.onBoundaryHit());
    if (this.parkFeatures.featureGroup) {
      this.physics.add.overlap(this.skier, this.parkFeatures.featureGroup, (_skier, feature) => {
        const type = (feature as Phaser.Physics.Arcade.Sprite).texture.key === 'park_kicker' ? 'kicker' : 'rail';
        this.onFeatureTrick(type);
      });
    }
    if (this.parkFeatures.pipeWallGroup) {
      this.physics.add.overlap(this.skier, this.parkFeatures.pipeWallGroup, () => {
        this.onFeatureTrick('halfpipe');
      });
    }
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

    // Launch HUDScene in ski mode for touch controls (joystick + brake)
    this.game.events.on(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.scene.launch('HUDScene', { level: this.level, mode: 'ski' });
    this.scene.bringToTop('HUDScene');

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

    // Touch (via HUDScene TOUCH_INPUT event)
    if (this.touchInput.left) lateralInput = -1;
    if (this.touchInput.right) lateralInput = 1;

    // Brake input (winch key / gamepad LB / touch brake mapped to winch)
    let braking = this.brakeKey?.isDown ?? false;
    if (pad && isGamepadButtonPressed(pad, this.gamepadBindings.winch)) braking = true;
    if (this.touchInput.winch) braking = true;

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

    // Progressive turning: holding a direction builds up turn intensity over time
    if (Math.abs(lateralInput) > 0.1) {
      this.turnHoldTime = Math.min(this.turnHoldTime + dt, BALANCE.SKI_TURN_RAMP_TIME);
    } else {
      this.turnHoldTime = 0;
    }
    const turnRamp = 1 + (this.turnHoldTime / BALANCE.SKI_TURN_RAMP_TIME) * BALANCE.SKI_TURN_RAMP_BOOST;
    // Drag ramps from 10% to 100% over the same hold time — initial turns barely slow you
    const dragRamp = 0.1 + 0.9 * (this.turnHoldTime / BALANCE.SKI_TURN_RAMP_TIME);

    // Carving friction — turning bleeds speed proportional to lateral input and hold time
    if (Math.abs(lateralInput) > 0.1) {
      this.currentSpeed *= (1 - BALANCE.SKI_CARVE_DRAG * dragRamp * Math.abs(lateralInput) * dt);
    }

    // Halfpipe wall pump — riding down the wall transition boosts speed
    if (this.parkFeatures.hasHalfpipe && !this.trickActive) {
      const wallDepth = this.parkFeatures.getWallDepth(this.skier.x, this.skier.y, this.tileSize);
      if (wallDepth !== null && wallDepth > 0) {
        this.currentSpeed += BALANCE.SKI_GRAVITY_SPEED * wallDepth * 2.0 * dt;
      }
    }
    const vy = this.currentSpeed;
    const speedRatio = Math.min(this.currentSpeed / BALANCE.SKI_GRAVITY_SPEED, 1.5);
    const vx = lateralInput * BALANCE.SKI_LATERAL_SPEED * speedRatio * turnRamp;
    this.skier.setVelocity(vx, vy);

    // Directional sprite — skip during trick animation
    if (!this.trickActive) {
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
        tile.setDisplaySize(tileSize + 1, tileSize + 1);
        if (isGroomable) tile.setDepth(DEPTHS.PISTE);
      }
    }

    // Force spawn area to be groomed so skier doesn't rumble on first second
    const spawnY = Math.max(3, Math.floor(this.level.height * 0.05));
    const spawnPath = this.geometry.pistePath[spawnY] || { centerX: this.level.width / 2 };
    const cx = Math.floor(spawnPath.centerX);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const ty = spawnY + dy, tx = cx + dx;
        if (ty >= 0 && ty < this.level.height && tx >= 0 && tx < this.level.width) {
          if (this.groomedGrid[ty]) this.groomedGrid[ty][tx] = true;
        }
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

    this.baseTexture = this.resolvedMode === 'snowboard' ? 'snowboarder' : 'skier';

    this.skier = this.physics.add.sprite(startX, startY, this.baseTexture);
    this.skier.setCollideWorldBounds(true);
    this.skier.setDrag(BALANCE.SKI_DRAG);
    this.skier.setScale(tileSize / 16);
    this.skier.setDepth(DEPTHS.PLAYER);
  }

  /** Convert screen position to draw-space for scrollFactor(0) objects under zoomed camera */
  private screenToOverlay(screenX: number, screenY: number): { x: number; y: number } {
    const cam = this.cameras.main;
    const zoom = cam.zoom || 1;
    const originX = cam.width * cam.originX;
    const originY = cam.height * cam.originY;
    return {
      x: (screenX - originX * (1 - zoom)) / zoom,
      y: (screenY - originY * (1 - zoom)) / zoom,
    };
  }

  /** Convert screen distance to draw-space distance */
  private screenDistToOverlay(dist: number): number {
    return dist / (this.cameras.main.zoom || 1);
  }

  private createHUD(): void {
    const { width } = this.scale;
    const cam = this.cameras.main;
    const a11y = Accessibility.settings;
    const hc = a11y.highContrast;
    const cb = a11y.colorblindMode !== 'none';

    // Scale calculations matching HUDScene
    const refWidth = 1024;
    const uiScale = Math.max(0.6, Math.min(2.0, width / refWidth));
    const padding = Math.round(10 * uiScale);
    const fontSize = (px: number) => Math.max(12, Math.round(px / (cam.zoom || 1))) + 'px';

    const a11yStroke = (hc || cb) ? '#000000' : undefined;
    const a11yStrokeThickness = (hc || cb) ? Math.max(2, Math.round(3 * uiScale / (cam.zoom || 1))) : 0;
    const visorText = (sx: number, sy: number, content: string, basePx: number, color = '#FFFFFF') => {
      const pos = this.screenToOverlay(sx, sy);
      return this.add.text(pos.x, pos.y, content, {
        fontFamily: THEME.fonts.family, fontSize: fontSize(basePx), fontStyle: 'bold', color,
        stroke: a11yStroke, strokeThickness: a11yStrokeThickness,
      }).setScrollFactor(0).setDepth(DEPTHS.FEEDBACK);
    };

    // Visor strip
    const row1Y = padding;
    const row2Y = row1Y + Math.round(26 * uiScale);
    const visorHeight = row2Y + Math.round(18 * uiScale);
    const visorAlpha = (hc || cb) ? 0.8 : 0.55;
    const overlay = overlayFullScreen(cam);
    this.add.rectangle(overlay.x, overlay.y, overlay.width, this.screenDistToOverlay(visorHeight), 0x000000)
      .setOrigin(0).setScrollFactor(0).setAlpha(visorAlpha).setDepth(DEPTHS.FEEDBACK - 1);
    const accentHeight = hc ? 2 : 1;
    const accentPos = this.screenToOverlay(0, visorHeight - accentHeight);
    this.add.rectangle(accentPos.x, accentPos.y, overlay.width, this.screenDistToOverlay(accentHeight), THEME.colors.infoHex)
      .setOrigin(0).setScrollFactor(0).setAlpha(hc ? 0.8 : 0.4).setDepth(DEPTHS.FEEDBACK - 1);

    // Level name (left)
    const modeIcon = this.resolvedMode === 'snowboard' ? '🏂' : '⛷️';
    visorText(padding, row1Y, `${modeIcon} ${t(this.level.nameKey) || 'Ski Run'}`, Math.round(14 * uiScale));

    // Speed (left, row 2)
    this.speedText = visorText(padding, row2Y, '', Math.round(14 * uiScale));

    // Time (right-aligned)
    this.timeText = visorText(width - padding, row1Y, '', Math.round(24 * uiScale))
      .setOrigin(1, 0);
  }

  private onBump(): void {
    // Cooldown: don't re-trigger during an active bump slowdown
    if (this.game.getTime() < this.bumpSlowdownUntil) return;
    this.bumpSlowdownUntil = this.game.getTime() + BALANCE.SKI_BUMP_DURATION;
    this.currentSpeed *= BALANCE.SKI_BUMP_SLOWDOWN;
    this.cameras.main.shake(BALANCE.SKI_BUMP_SHAKE.duration, BALANCE.SKI_BUMP_SHAKE.intensity);
  }

  /** Boundary wall hit — in halfpipe, launch a trick instead of bumping */
  private onBoundaryHit(): void {
    if (this.parkFeatures.hasHalfpipe && !this.trickActive) {
      const tileY = Math.floor(this.skier.y / this.tileSize);
      // Only in the walled section (not entry/exit margins)
      if (tileY >= 5 && tileY <= this.level.height - 5) {
        this.onFeatureTrick('halfpipe');
        return;
      }
    }
    this.onBump();
  }

  private onFeatureTrick(type: 'kicker' | 'rail' | 'halfpipe'): void {
    const now = this.game.getTime();
    if (now - this.lastTrickTime < 1500 || this.trickActive) return;
    this.lastTrickTime = now;
    this.trickActive = true;

    // Speed boost
    this.currentSpeed *= 1.3;

    const baseScale = this.tileSize / 16;

    let trickName: string;
    if (type === 'rail') {
      trickName = this.doGrindTrick(baseScale);
    } else if (type === 'halfpipe') {
      trickName = this.doAirTrick(baseScale, true);
    } else {
      trickName = this.doAirTrick(baseScale);
    }

    // Popup text — show trick name
    const isBoard = this.baseTexture.includes('snowboard');
    const icon = isBoard ? '🏂' : '🎿';
    const popup = this.add.text(this.skier.x, this.skier.y - 30, `${icon} ${trickName}!`, {
      fontFamily: THEME.fonts.family,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  /** Air trick (kicker or halfpipe): scale up, spin, shadow below, then land */
  private doAirTrick(baseScale: number, pipe = false): string {
    const shadow = this.add.graphics().setDepth(DEPTHS.PLAYER - 1);
    this.trickShadow = shadow;

    const shadowY = this.skier.y + (pipe ? 14 : 10) * baseScale;
    const updateShadow = () => {
      if (!this.skier?.active) return;
      shadow.clear();
      shadow.fillStyle(0x1a1612, pipe ? 0.25 : 0.3);
      const sw = (pipe ? 14 : 12) * this.skier.scaleX;
      const sh = (pipe ? 5 : 4) * this.skier.scaleX;
      shadow.fillRect(this.skier.x - sw / 2, shadowY, sw, sh);
    };
    this.events.on('update', updateShadow);
    this.trickShadowUpdater = updateShadow;

    const tricks = pipe
      ? [
          { angle: 540, name: 'McTwist' },
          { angle: -540, name: 'Crippler' },
          { angle: 900, name: '900' },
          { angle: 360, name: 'Alley-oop' },
          { angle: 0, name: 'Stalefish' },
        ]
      : [
          { angle: 360, name: '360' },
          { angle: 720, name: '720' },
          { angle: 180, name: 'Backflip' },
          { angle: -180, name: 'Frontflip' },
          { angle: 0, name: 'Method' },
        ];
    const trick = tricks[Math.floor(Math.random() * tricks.length)];

    const isGrab = trick.angle === 0;
    const scaleMult = pipe ? (isGrab ? 2.0 : 1.8) : (isGrab ? 1.8 : 1.5);
    const scaleMultY = pipe ? (isGrab ? 1.4 : 1.8) : (isGrab ? 1.2 : 1.5);
    const launchDur = pipe ? 700 : 500;
    const landDur = pipe ? 350 : 300;

    this.tweens.add({
      targets: this.skier,
      scaleX: baseScale * scaleMult,
      scaleY: baseScale * scaleMultY,
      angle: trick.angle,
      duration: launchDur,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.skier,
          scaleX: baseScale,
          scaleY: baseScale,
          angle: 0,
          duration: landDur,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.trickActive = false;
            this.cleanupTrickShadow();
          },
        });
      },
    });
    return trick.name;
  }

  /** Remove shadow graphics and update listener */
  private cleanupTrickShadow(): void {
    if (this.trickShadowUpdater) {
      this.events.off('update', this.trickShadowUpdater);
      this.trickShadowUpdater = null;
    }
    this.trickShadow?.destroy();
    this.trickShadow = null;
  }

  /** Rail grind: random grind style, sparks fly from contact point */
  private doGrindTrick(baseScale: number): string {
    const isBoard = this.baseTexture.includes('snowboard');

    // Pick a random grind style — distinct angle + spark color + scaleX for visual variety
    const grinds = [
      { angle: isBoard ? 90 : 70, scaleX: 1, name: 'Boardslide', sparkColor: 0xffdd44 },
      { angle: isBoard ? 15 : 10, scaleX: 1, name: '50-50', sparkColor: 0x44ddff },
      { angle: isBoard ? -90 : -70, scaleX: -1, name: 'Lipslide', sparkColor: 0xff6644 },
      { angle: isBoard ? 180 : 160, scaleX: 1, name: 'Tailslide', sparkColor: 0x66ff44 },
    ];
    const grind = grinds[Math.floor(Math.random() * grinds.length)];

    const origScaleX = this.skier.scaleX;
    this.tweens.add({
      targets: this.skier,
      angle: grind.angle,
      scaleX: origScaleX * grind.scaleX,
      duration: 150,
      ease: 'Power2',
    });

    // Sparks — bright rectangles that fall from skier
    const sparkSize = Math.max(3, Math.round(3 * baseScale));
    const sparkTimer = this.time.addEvent({
      delay: 80,
      repeat: 6,
      callback: () => {
        if (!this.skier?.active) return;
        const ox = (Math.random() - 0.5) * 8 * baseScale;
        const x = this.skier.x + ox;
        const y = this.skier.y;
        const color = Math.random() > 0.4 ? grind.sparkColor : 0xffffff;

        const spark = this.add.rectangle(x, y, sparkSize, sparkSize, color, 1)
          .setDepth(DEPTHS.PLAYER + 1);
        this.tweens.add({
          targets: spark,
          y: y + 12 * baseScale,
          alpha: 0,
          duration: 300,
          onComplete: () => spark.destroy(),
        });
      },
    });

    this.time.delayedCall(600, () => {
      sparkTimer.destroy();
      this.tweens.add({
        targets: this.skier,
        angle: 0,
        scaleX: Math.abs(origScaleX),
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.trickActive = false;
        },
      });
    });
    return grind.name;
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
    this.parkFeatures.destroy();
    this.cleanupTrickShadow();
    this.trickActive = false;
    // Don't stop HUDScene here — resetGameScenes handles all scene cleanup.
    // Stopping it during shutdown causes "duplicate key" errors when
    // resetGameScenes has already removed HUDScene before this shutdown fires.
    this.game.events.off(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
  }
}
