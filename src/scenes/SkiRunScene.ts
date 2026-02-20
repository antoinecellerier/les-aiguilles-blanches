import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, type Level } from '../setup';
import { BALANCE, DEPTHS, yDepth } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString } from '../utils/storage';
import { getGroomedTiles } from '../utils/skiRunState';
import { LevelGeometry } from '../systems/LevelGeometry';
import { PisteRenderer } from '../systems/PisteRenderer';
import { ObstacleBuilder } from '../systems/ObstacleBuilder';
import { WinchSystem } from '../systems/WinchSystem';
import { ParkFeatureSystem } from '../systems/ParkFeatureSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { THEME } from '../config/theme';
import { resetGameScenes } from '../utils/sceneTransitions';
import { isGamepadButtonPressed, captureGamepadButtons, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { formatTime } from '../utils/bonusObjectives';
import { playLevelWin } from '../systems/UISounds';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { BINDINGS_VERSION } from '../config/storageKeys';
import { NIGHT_SUFFIX, type ColorTransform, dayColors, nightColors } from '../utils/nightPalette';
import { cullOffscreenImages, emptyCullBounds, type CullBounds } from '../utils/cullImages';
import { overlayFullScreen } from '../utils/cameraCoords';
import { GAME_EVENTS, type TouchInputEvent } from '../types/GameSceneInterface';
import { SkiRunSounds } from '../systems/SkiRunSounds';
import { AmbienceSounds } from '../systems/AmbienceSounds';
import { MusicSystem } from '../systems/MusicSystem';
import { HazardSystem } from '../systems/HazardSystem';
import { SlalomGateSystem } from '../systems/SlalomGateSystem';
import { getDailyRunSession } from '../systems/DailyRunSession';
import { ResizeManager } from '../utils/resizeManager';
import { SCENE_KEYS } from '../config/sceneKeys';

/**
 * SkiRunScene — Post-grooming descent reward run.
 * Player skis/snowboards down the piste they just groomed.
 * Cliff wipeouts end the run with a fun fail screen.
 */

interface SkiRunData {
  level: number;
  mode?: 'ski' | 'snowboard';
}

export default class SkiRunScene extends Phaser.Scene {
  private level!: Level;
  private levelIndex = 0;
  private tileSize = 0;
  private lastCullBounds: CullBounds = emptyCullBounds();

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
  private boundPauseHandler = () => { this.pauseGame(); };
  private boundResumeHandler = () => { this.resumeGame(); };
  private boundHazardGameOverHandler = () => { this.onWipeout('avalanche'); };
  private gamepadStartPressed = false;

  // HUD elements
  private speedText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private elapsedTime = 0;

  // State
  private isFinished = false;
  private isCrashed = false;
  private startX = 0;
  private startY = 0;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private parkFeatures = new ParkFeatureSystem();
  private weatherSystem: WeatherSystem | null = null;
  private nightUpdateHandler?: () => void;
  private lastTrickTime = 0;
  private boundaryWalls!: Phaser.Physics.Arcade.StaticGroup;

  private debugGfx?: Phaser.GameObjects.Graphics;
  private trickActive = false;
  private pipeTrickActive = false; // halfpipe trick — apply rebound on landing
  private trickShadow: Phaser.GameObjects.Graphics | null = null;
  private trickShadowUpdater: (() => void) | null = null;
  private turnHoldTime = 0; // seconds of continuous lateral input
  private smoothedLateral = 0; // lerped lateral velocity for smooth carving
  private smoothedInput = 0;   // ramped lateral input (keyboard feels analog)
  private resolvedMode = 'ski'; // resolved from 'random' once per run
  private nightSfx = '';  // '_night' on night levels
  private nc: ColorTransform = dayColors;
  private skiSounds = new SkiRunSounds();
  private ambienceSounds = new AmbienceSounds();
  private hazardSystem: HazardSystem | null = null;
  private slalomSystem = new SlalomGateSystem();
  private gateText: Phaser.GameObjects.Text | null = null;

  // Trick scoring
  private trickCount = 0;
  private trickScore = 0;
  private trickCombo = 0;
  private bestCombo = 0;
  private lastTrickName = '';
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private lastTrackPos: { x: number; y: number } | null = null;
  private isAirborne = false;
  private jumpKey: Phaser.Input.Keyboard.Key | null = null;
  private resizeManager!: ResizeManager;
  private initData!: SkiRunData;

  constructor() {
    super({ key: SCENE_KEYS.SKI_RUN });
  }

  init(data: SkiRunData): void {
    this.initData = data;
    this.levelIndex = data.level ?? 0;
    const session = getDailyRunSession();
    this.level = session?.level || LEVELS[this.levelIndex];
    this.nightSfx = this.level.isNight ? NIGHT_SUFFIX : '';
    this.nc = this.level.isNight ? nightColors : dayColors;
    this.isFinished = false;
    this.isCrashed = false;
    this.elapsedTime = 0;
    this.currentSpeed = 0;
    this.terrainBlend = 1.0;
    this.bumpSlowdownUntil = 0;
    this.slalomSystem = new SlalomGateSystem();
    this.gateText = null;
    this.isAirborne = false;
    this.pipeTrickActive = false;
    this.trickCount = 0;
    this.trickScore = 0;
    this.trickCombo = 0;
    this.bestCombo = 0;
    this.lastTrickName = '';
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

    // If no grooming data (e.g. starting from level select), try localStorage
    if (this.groomedTiles.size === 0) {
      const saved = getString(STORAGE_KEYS.GROOMED_TILES + this.levelIndex);
      if (saved) {
        try {
          const arr = JSON.parse(saved) as string[];
          this.groomedTiles = new Set(arr);
        } catch { /* fall through to default */ }
      }
    }
    // Still empty — generate default grooming pattern
    if (this.groomedTiles.size === 0) {
      this.groomedTiles = this.generateDefaultGrooming();
    }

    // Build the snow grid with groomed state from the completed level
    this.createSnowGrid(tileSize);

    // Track marks layer — sits between snow tiles and ground objects
    this.trackGraphics = this.add.graphics().setDepth(DEPTHS.PISTE + 0.5);
    this.lastTrackPos = null;

    // Piste renderer (boundaries, markers, cliffs, trees)
    const pisteRenderer = new PisteRenderer(this, this.geometry, this.nightSfx);
    const { boundaryWalls } = pisteRenderer.createBoundaryColliders(this.level, tileSize);
    this.boundaryWalls = boundaryWalls;
    pisteRenderer.createPisteBoundaries(this.level, tileSize, worldWidth);

    // Obstacles (reuse same system)
    this.obstacles = this.physics.add.staticGroup();
    const interactables = this.physics.add.staticGroup();
    const obstacleBuilder = new ObstacleBuilder(this, this.geometry, this.nightSfx, this.nc);
    obstacleBuilder.create(this.level, tileSize, this.obstacles, interactables);
    // Buildings (fuel pump, restaurant) are solid obstacles during ski runs
    for (const child of interactables.getChildren()) {
      this.obstacles.add(child);
    }

    // Winch anchor poles are permanent fixtures — show them during ski runs too
    if (this.level.hasWinch) {
      WinchSystem.createAnchorVisuals(this, this.geometry, this.level, tileSize, this.nc);
      WinchSystem.createAnchorColliders(this, this.geometry, this.level, tileSize, this.obstacles);
    }

    // Shrink obstacle hitboxes to trunk/core for skiing (full sprite includes foliage/snow)
    const scale = tileSize / 16;
    for (const sprite of this.obstacles.getChildren()) {
      const s = sprite as Phaser.Physics.Arcade.Sprite;
      const body = s.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      if (s.texture.key === 'tree' || s.texture.key === 'tree_large') {
        // Tree trunk: 6px wide, 14px tall in 30×40 texture, at x=12 y=26
        body.setSize(6 * scale, 14 * scale);
        body.setOffset((s.displayWidth - 6 * scale) / 2, s.displayHeight - 14 * scale);
      } else if (s.texture.key === 'rock') {
        // Rock: shrink to core (60% of display size)
        body.setSize(s.displayWidth * 0.6, s.displayHeight * 0.6);
        body.setOffset(s.displayWidth * 0.2, s.displayHeight * 0.2);
      } else if (s.texture.key === 'fuel' || s.texture.key === 'restaurant') {
        // Buildings: use bottom half so skiers can pass behind
        body.setSize(s.displayWidth * 0.7, s.displayHeight * 0.4);
        body.setOffset(s.displayWidth * 0.15, s.displayHeight * 0.6);
      }
    }

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

    // Slalom gates
    if (this.level.slalomGates) {
      this.slalomSystem.create(this, this.level, this.geometry, tileSize, this.nightSfx);
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

    // Night headlamp follows skier
    if (this.level.isNight) {
      this.nightUpdateHandler = () => this.weatherSystem?.updateHeadlamp(this.skier);
      this.events.on('update', this.nightUpdateHandler);
    }

    // Collisions — skiers can go off-piste (powder drag slows them),
    // but cliff danger zones cause wipeouts
    this.physics.add.collider(this.skier, this.obstacles, () => this.onBump());
    if (this.parkFeatures.hasHalfpipe) {
      // Halfpipe wall hits trigger tricks, not boundary bounces
      this.physics.add.collider(this.skier, boundaryWalls, () => this.onBoundaryHit());
    }
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

    // Avalanche zones — skier can trigger avalanches on hazardous levels
    if (this.level.hazards?.includes('avalanche')) {
      this.hazardSystem = new HazardSystem(this, this.nc);
      this.hazardSystem.riskMultiplier = BALANCE.SKI_AVALANCHE_RISK_MULTIPLIER;
      this.hazardSystem.onAvalancheSound = (level: number) => {
        if (level === 1) this.skiSounds.playAvalancheWarning1();
        else if (level === 2) this.skiSounds.playAvalancheWarning2();
        else if (level === 3) this.skiSounds.playAvalancheTrigger();
      };
      this.hazardSystem.isGameOver = () => this.isCrashed || this.isFinished;
      this.hazardSystem.isGrooming = () => false;
      this.hazardSystem.createAvalancheZones(
        this.level,
        tileSize,
        this.skier,
        this.geometry.getCliffAvoidRects(tileSize),
        [],
        this.geometry.pistePath
      );
    }

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
      this.jumpKey = this.input.keyboard.addKey(bindings.groom);
    }
    captureGamepadButtons(this, [14, 15, this.gamepadBindings.winch, this.gamepadBindings.groom, this.gamepadBindings.pause]);
    // Capture initial Start button state to prevent phantom press on scene entry
    const pad = this.input.gamepad?.getPad(0);
    if (pad) this.gamepadStartPressed = isGamepadButtonPressed(pad, this.gamepadBindings.pause);

    // Launch HUDScene in ski mode for touch controls (joystick + brake)
    this.game.events.on(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.scene.launch(SCENE_KEYS.HUD, { level: this.level, mode: 'ski' });
    this.scene.bringToTop(SCENE_KEYS.HUD);

    // HUD overlay
    this.createHUD();

    // ESC opens pause menu
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());

    // Audio
    this.skiSounds.start();
    this.ambienceSounds.start(this.level.weather, this.level.isNight);
    MusicSystem.getInstance().start('intense');

    // Pause/resume
    this.game.events.on(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.on(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.on(GAME_EVENTS.HAZARD_GAME_OVER, this.boundHazardGameOverHandler);

    this.resizeManager = new ResizeManager(this, {
      restartData: () => ({ ...this.initData, mode: this.resolvedMode }),
    });
    this.resizeManager.register();
    this.events.once('shutdown', this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isFinished) return;

    const dt = delta / 1000;

    // Crash — waiting for transition to fail screen
    if (this.isCrashed) return;

    // Check gamepad Start button for pause (with debounce)
    {
      const gpad = this.input.gamepad?.getPad(0);
      if (gpad) {
        const startPressed = isGamepadButtonPressed(gpad, this.gamepadBindings.pause);
        if (startPressed && !this.gamepadStartPressed) {
          this.pauseGame();
        }
        this.gamepadStartPressed = startPressed;
      }
    }

    this.elapsedTime += dt;

    // Lateral input
    let lateralInput = 0;
    let isAnalog = false;
    if (this.cursors?.left?.isDown || this.wasd?.left?.isDown) lateralInput = -1;
    if (this.cursors?.right?.isDown || this.wasd?.right?.isDown) lateralInput = 1;

    // Gamepad
    const pad = this.input.gamepad?.getPad(0);
    if (pad) {
      const lx = pad.leftStick?.x ?? 0;
      if (Math.abs(lx) > BALANCE.GAMEPAD_DEADZONE) { lateralInput = lx; isAnalog = true; }
      // D-pad left/right (standard mapping buttons 14/15)
      if (isGamepadButtonPressed(pad, 14)) { lateralInput = -1; isAnalog = false; }
      if (isGamepadButtonPressed(pad, 15)) { lateralInput = 1; isAnalog = false; }
    }

    // Touch (via HUDScene TOUCH_INPUT event)
    if (this.touchInput.left) lateralInput = -1;
    if (this.touchInput.right) lateralInput = 1;

    // Ramp binary inputs so keyboard taps feel analog (quick tap = gentle turn)
    if (!isAnalog) {
      const rampRate = BALANCE.SKI_INPUT_RAMP_RATE; // reaches full input in ~0.2s
      const target = lateralInput;
      if (Math.abs(target) > 0.1) {
        this.smoothedInput += (target - this.smoothedInput) * Math.min(1, rampRate * dt);
      } else {
        // Decay quickly when released
        this.smoothedInput *= Math.max(0, 1 - rampRate * 2 * dt);
      }
      lateralInput = this.smoothedInput;
    } else {
      this.smoothedInput = lateralInput;
    }

    // Brake input (winch key / gamepad LB / touch brake mapped to winch)
    let braking = this.brakeKey?.isDown ?? false;
    if (pad && isGamepadButtonPressed(pad, this.gamepadBindings.winch)) braking = true;
    if (this.touchInput.winch) braking = true;

    // Tuck input (down key / D-pad down / touch down) — crouch for speed, reduced steering
    let tucking = this.cursors?.down?.isDown || this.wasd?.down?.isDown || false;
    if (pad) {
      const ly = pad.leftStick?.y ?? 0;
      if (ly > BALANCE.GAMEPAD_DEADZONE) tucking = true;
      if (isGamepadButtonPressed(pad, 13)) tucking = true;
    }
    if (this.touchInput.down) tucking = true;

    // Jump input (groom key / gamepad groom button / touch groom)
    if (!this.isAirborne && !this.trickActive && !this.isCrashed) {
      let jumpPressed = Phaser.Input.Keyboard.JustDown(this.jumpKey!) === true;
      if (pad && isGamepadButtonPressed(pad, this.gamepadBindings.groom)) jumpPressed = true;
      if (this.touchInput.groom) jumpPressed = true;
      if (jumpPressed && this.currentSpeed >= BALANCE.SKI_JUMP_MIN_SPEED) {
        this.doJump();
      }
    }

    // Terrain check — groomed vs ungroomed vs off-piste (smoothed transition)
    const tileX = Math.floor(this.skier.x / this.tileSize);
    const tileY = Math.floor(this.skier.y / this.tileSize);
    const onPiste = this.geometry.isInPiste(tileX, tileY, this.level);
    const onGroomed = this.groomedGrid[tileY]?.[tileX] ?? false;
    let rawTerrainMult: number;
    if (onPiste) {
      rawTerrainMult = onGroomed ? BALANCE.SKI_GROOMED_MULTIPLIER : BALANCE.SKI_UNGROOMED_MULTIPLIER;
    } else {
      // Check if near piste edge (packed snow shoulder, not deep powder)
      const nearPiste = this.geometry.isNearPiste(tileX, tileY, this.level, BALANCE.SKI_PISTE_BUFFER);
      rawTerrainMult = nearPiste ? BALANCE.SKI_UNGROOMED_MULTIPLIER : BALANCE.SKI_OFFPISTE_MULTIPLIER;
    }
    // Lerp terrain blend for smooth groomed↔ungroomed transitions
    const blendRate = BALANCE.SKI_TERRAIN_BLEND_RATE; // how fast terrain effect transitions (higher = faster)
    this.terrainBlend += (rawTerrainMult - this.terrainBlend) * Math.min(1, blendRate * dt);
    const terrainMultiplier = this.terrainBlend;

    // Draw ski/snowboard tracks on ungroomed / off-piste snow (not while airborne)
    if (!onGroomed && this.currentSpeed > 5 && !this.isAirborne && !this.trickActive) {
      const sx = this.skier.x;
      const sy = this.skier.y;
      const minDist = this.tileSize * 0.5;
      // Only record a new point when moved enough distance for smooth curves
      if (this.lastTrackPos) {
        const dx = sx - this.lastTrackPos.x;
        const dy = sy - this.lastTrackPos.y;
        if (dx * dx + dy * dy >= minDist * minDist) {
          const alpha = onPiste ? 0.15 : 0.25;
          const isBoard = this.resolvedMode === 'snowboard';
          if (isBoard) {
            this.trackGraphics.lineStyle(3, 0x8899aa, alpha);
            this.trackGraphics.beginPath();
            this.trackGraphics.moveTo(this.lastTrackPos.x, this.lastTrackPos.y);
            this.trackGraphics.lineTo(sx, sy);
            this.trackGraphics.strokePath();
          } else {
            const halfGap = this.tileSize * 0.15;
            // Perpendicular offset for parallel ski lines
            const len = Math.sqrt(dx * dx + dy * dy);
            const px = (-dy / len) * halfGap;
            const py = (dx / len) * halfGap;
            this.trackGraphics.lineStyle(1, 0x8899aa, alpha);
            this.trackGraphics.beginPath();
            this.trackGraphics.moveTo(this.lastTrackPos.x + px, this.lastTrackPos.y + py);
            this.trackGraphics.lineTo(sx + px, sy + py);
            this.trackGraphics.moveTo(this.lastTrackPos.x - px, this.lastTrackPos.y - py);
            this.trackGraphics.lineTo(sx - px, sy - py);
            this.trackGraphics.strokePath();
          }
          this.lastTrackPos = { x: sx, y: sy };
        }
      } else {
        this.lastTrackPos = { x: sx, y: sy };
      }
    } else {
      this.lastTrackPos = null;
    }

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
    // Tucking minimizes heading penalty (committed to the fall line)
    const headingPenalty = tucking ? BALANCE.SKI_HEADING_FACTOR * 0.2 : BALANCE.SKI_HEADING_FACTOR;
    const headingFactor = 1 - headingPenalty * Math.abs(lateralInput);
    const isBumped = this.game.getTime() < this.bumpSlowdownUntil;
    const bumpMult = isBumped ? BALANCE.SKI_BUMP_SLOWDOWN : 1.0;
    const tuckMult = tucking ? BALANCE.SKI_TUCK_SPEED_MULT : 1.0;
    const targetSpeed = BALANCE.SKI_GRAVITY_SPEED * terrainMultiplier * slopeMult * bumpMult * headingFactor * tuckMult;
    const maxSpeed = BALANCE.SKI_MAX_SPEED * terrainMultiplier * slopeMult * bumpMult * tuckMult;

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
    // Tucking minimizes carve drag (low crouch = less edge pressure)
    if (Math.abs(lateralInput) > 0.1) {
      const carveDrag = tucking ? BALANCE.SKI_CARVE_DRAG * 0.1 : BALANCE.SKI_CARVE_DRAG;
      this.currentSpeed *= (1 - carveDrag * dragRamp * Math.abs(lateralInput) * dt);
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
    const steerMult = tucking ? BALANCE.SKI_TUCK_STEER_MULT : 1.0;
    const targetVx = lateralInput * BALANCE.SKI_LATERAL_SPEED * speedRatio * turnRamp * steerMult;
    // Smooth lateral velocity — lerp toward target for carved turns, not instant zigzags
    // During tricks, suppress lateral input (ballistic arc — no air control)
    const lerpRate = BALANCE.SKI_LATERAL_LERP_RATE; // higher = more responsive, lower = smoother
    if (this.trickActive) {
      this.smoothedLateral += (0 - this.smoothedLateral) * Math.min(1, lerpRate * dt);
    } else {
      this.smoothedLateral += (targetVx - this.smoothedLateral) * Math.min(1, lerpRate * dt);
    }
    this.skier.setVelocity(this.smoothedLateral, vy);

    // Adaptive camera lerp: faster speeds need tighter follow to keep skier on screen
    const speedFrac = Math.min(this.currentSpeed / BALANCE.SKI_MAX_SPEED, 1);
    const camLerp = BALANCE.CAMERA_LERP + speedFrac * (1 - BALANCE.CAMERA_LERP);
    this.cameras.main.setLerp(camLerp, camLerp);

    // Y-sort depth so skier renders behind trees when above them
    this.skier.setDepth(yDepth(this.skier.y + this.skier.displayHeight / 2));

    // Directional sprite — skip during trick animation
    if (!this.trickActive) {
      const deadzone: number = BALANCE.SKI_SPRITE_DEADZONE;
      if (braking) {
        this.skier.setTexture(this.baseTexture + '_brake' + this.nightSfx);
      } else if (tucking) {
        this.skier.setTexture(this.baseTexture + '_tuck' + this.nightSfx);
      } else if (lateralInput < -deadzone) {
        this.skier.setTexture(this.baseTexture + '_left' + this.nightSfx);
      } else if (lateralInput > deadzone) {
        this.skier.setTexture(this.baseTexture + '_right' + this.nightSfx);
      } else {
        this.skier.setTexture(this.baseTexture + this.nightSfx);
      }
    }

    // HUD update
    const kmh = Math.round(this.currentSpeed * BALANCE.SKI_SPEED_SCALE);
    this.speedText.setText(`${t('skiRunSpeed') || 'Speed'}: ${kmh} km/h`);
    this.timeText.setText(`${t('skiRunTime') || 'Time'}: ${formatTime(this.elapsedTime)}`);

    // Audio update
    this.skiSounds.update(this.currentSpeed, braking, onGroomed, delta);

    // Slalom gate detection
    if (this.slalomSystem.totalGates > 0) {
      const gateResult = this.slalomSystem.update(this.skier.x, this.skier.y, this.tileSize, this);
      if (gateResult === 'hit') this.skiSounds.playGatePass();
      else if (gateResult === 'miss') this.skiSounds.playGateMiss();
      this.gateText?.setText(`${t('skiRunGates') || 'Gates'}: ${this.slalomSystem.gatesHit}/${this.slalomSystem.totalGates}`);
    }

    // Cull off-screen static Images (trees, rocks, cliff textures)
    this.lastCullBounds = cullOffscreenImages(this, this.tileSize * 3, this.tileSize, this.lastCullBounds);

    // Cliff wipeout — per-frame geometric check (same as GameScene)
    if (!this.isAirborne && !this.isCrashed && this.geometry.isOnCliff(this.skier.x, this.skier.y)) {
      this.onWipeout();
    }

    // Debug overlay (toggle in Settings)
    const showDebug = getString(STORAGE_KEYS.SHOW_DEBUG) === 'true';
    if (showDebug) {
      if (!this.debugGfx) {
        this.debugGfx = this.add.graphics();
        this.debugGfx.setDepth(999);
      }
      this.debugGfx.clear();
      // Skier hitbox (cyan) and depth-Y (red)
      const sb = this.skier.body as Phaser.Physics.Arcade.Body;
      this.debugGfx.lineStyle(1, 0x00ffff, 0.8);
      this.debugGfx.strokeRect(sb.x, sb.y, sb.width, sb.height);
      this.debugGfx.lineStyle(2, 0xff0000, 1);
      const skierBaseY = this.skier.y + this.skier.displayHeight / 2;
      this.debugGfx.lineBetween(sb.x, skierBaseY, sb.x + sb.width, skierBaseY);
      // Obstacle hitboxes (green)
      for (const sprite of this.obstacles.getChildren()) {
        const s = sprite as Phaser.Physics.Arcade.Sprite;
        const ob = s.body as Phaser.Physics.Arcade.StaticBody;
        this.debugGfx.lineStyle(1, 0x00ff00, 0.8);
        this.debugGfx.strokeRect(ob.x, ob.y, ob.width, ob.height);
      }
      // Boundary walls (blue)
      for (const child of this.boundaryWalls.getChildren()) {
        const b = (child as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
        this.debugGfx.fillStyle(0x0044ff, 0.10);
        this.debugGfx.fillRect(b.x, b.y, b.width, b.height);
      }
      // Park features (pink)
      if (this.parkFeatures.featureGroup) {
        for (const child of this.parkFeatures.featureGroup.getChildren()) {
          const b = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
          if (b) {
            this.debugGfx.fillStyle(0xff44aa, 0.15);
            this.debugGfx.fillRect(b.x, b.y, b.width, b.height);
            this.debugGfx.lineStyle(1, 0xff44aa, 0.7);
            this.debugGfx.strokeRect(b.x, b.y, b.width, b.height);
          }
        }
      }
      // Halfpipe walls (teal)
      if (this.parkFeatures.pipeWallGroup) {
        for (const child of this.parkFeatures.pipeWallGroup.getChildren()) {
          const b = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
          if (b) {
            this.debugGfx.fillStyle(0x00cccc, 0.15);
            this.debugGfx.fillRect(b.x, b.y, b.width, b.height);
            this.debugGfx.lineStyle(1, 0x00cccc, 0.7);
            this.debugGfx.strokeRect(b.x, b.y, b.width, b.height);
          }
        }
      }
      // Cliff zones (red)
      if (this.geometry.cliffSegments && this.geometry.cliffSegments.length > 0) {
        for (const cliff of this.geometry.cliffSegments) {
          const step = 4;
          for (let y = cliff.startY; y <= cliff.endY; y += step) {
            const { cliffStart, cliffEnd } = cliff.getBounds(y);
            const h = Math.min(step, cliff.endY - y);
            this.debugGfx.fillStyle(0xff0000, 0.18);
            this.debugGfx.fillRect(cliffStart, y, cliffEnd - cliffStart, h);
          }
        }
      }
    } else if (this.debugGfx) {
      this.debugGfx.destroy();
      this.debugGfx = undefined;
    }

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

        const sfx = this.nightSfx;
        const texture = wasGroomed ? ('snow_groomed' + sfx) : (isGroomable ? ('snow_ungroomed' + sfx) : ('snow_offpiste' + sfx));
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

    this.skier = this.physics.add.sprite(startX, startY, this.baseTexture + this.nightSfx);
    this.skier.setCollideWorldBounds(true);
    this.skier.setDrag(BALANCE.SKI_DRAG);
    const scale = tileSize / 16;
    this.skier.setScale(scale);
    this.skier.setDepth(DEPTHS.PLAYER);

    // Shrink body to feet/ski area (bottom 8px of 20×28 texture)
    // so upper body doesn't collide with trees visually behind the skier
    const body = this.skier.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 8);
    body.setOffset(0, 20);
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
    const zoom = cam.zoom || 1;
    const a11y = Accessibility.settings;
    const hc = a11y.highContrast;
    const cb = a11y.colorblindMode !== 'none';

    // All layout in screen-space, then convert to overlay-space for drawing.
    // Font sizes, gaps, and positions are computed in screen pixels first.
    const refWidth = 1024;
    const uiScale = Math.max(0.6, Math.min(2.0, width / refWidth));
    const padding = Math.round(10 * uiScale);
    const fontSize = (px: number) => Math.max(12, px) + 'px';

    const a11yStroke = (hc || cb) ? '#000000' : undefined;
    const a11yStrokeThickness = (hc || cb) ? Math.max(2, Math.round(3 * uiScale)) : 0;
    const visorText = (sx: number, sy: number, content: string, basePx: number, color = '#FFFFFF') => {
      const pos = this.screenToOverlay(sx, sy);
      return this.add.text(pos.x, pos.y, content, {
        fontFamily: THEME.fonts.family, fontSize: fontSize(basePx), fontStyle: 'bold', color,
        stroke: a11yStroke, strokeThickness: a11yStrokeThickness / zoom,
      }).setScrollFactor(0).setScale(1 / zoom).setDepth(DEPTHS.FEEDBACK);
    };

    // Visor strip — screen-space layout
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
    const skiLevelName = this.level.name
      ? `${t(this.level.nameKey)} - ${this.level.name}`
      : t(this.level.nameKey) || 'Ski Run';
    visorText(padding, row1Y, `${modeIcon} ${skiLevelName}`, Math.round(14 * uiScale));

    // Speed (left, row 2)
    this.speedText = visorText(padding, row2Y, '', Math.round(14 * uiScale));

    // Time (right-aligned)
    this.timeText = visorText(width - padding, row1Y, '', Math.round(24 * uiScale))
      .setOrigin(1, 0);

    // Gate counter (right-aligned, row 2) — only for levels with slalom gates
    if (this.level.slalomGates) {
      this.gateText = visorText(width - padding, row2Y, '', Math.round(14 * uiScale))
        .setOrigin(1, 0);
    }
  }

  private onBump(): void {
    // Airborne — skip ground-level collisions
    if (this.isAirborne) return;
    // Cooldown: don't re-trigger during an active bump slowdown
    if (this.game.getTime() < this.bumpSlowdownUntil) return;

    // High-speed collisions with obstacles are fatal (~50 km/h threshold)
    const kmh = this.currentSpeed * BALANCE.SKI_SPEED_SCALE;
    if (kmh >= BALANCE.SKI_FATAL_CRASH_KMH) {
      this.onWipeout();
      return;
    }

    this.bumpSlowdownUntil = this.game.getTime() + BALANCE.SKI_BUMP_DURATION;
    this.currentSpeed *= BALANCE.SKI_BUMP_SLOWDOWN;
    this.cameras.main.shake(BALANCE.SKI_BUMP_SHAKE.duration, BALANCE.SKI_BUMP_SHAKE.intensity);
    this.skiSounds.playBump();
  }

  /** Boundary wall hit — in halfpipe, launch a trick instead of bumping */
  private onBoundaryHit(): void {
    if (this.isAirborne) return;
    // Near the bottom — finish the run instead of crashing
    if (this.skier.y >= (this.level.height - BALANCE.SKI_FINISH_BUFFER - 1) * this.tileSize) {
      this.finishRun();
      return;
    }
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
    if (this.isAirborne) return;
    const now = this.game.getTime();
    if (now - this.lastTrickTime < 1500 || this.trickActive) return;
    this.lastTrickTime = now;
    this.trickActive = true;

    // Speed boost
    this.currentSpeed *= 1.3;

    // Halfpipe wall redirects lateral speed into vertical — zero out lateral drift
    if (type === 'halfpipe') {
      this.smoothedLateral = 0;
      this.pipeTrickActive = true;
    }

    const baseScale = this.tileSize / 16;

    let trickName: string;
    if (type === 'rail') {
      trickName = this.doGrindTrick(baseScale);
      this.skiSounds.playRailGrind();
    } else if (type === 'halfpipe') {
      trickName = this.doAirTrick(baseScale, true);
      this.skiSounds.playTrickLaunch();
    } else {
      trickName = this.doAirTrick(baseScale);
      this.skiSounds.playTrickLaunch();
    }

    // Trick scoring
    const basePoints = type === 'halfpipe' ? BALANCE.TRICK_BASE_HALFPIPE
      : type === 'rail' ? BALANCE.TRICK_BASE_RAIL : BALANCE.TRICK_BASE_KICKER;
    const speedMult = 1.0 + Math.max(0, this.currentSpeed - BALANCE.SKI_GRAVITY_SPEED)
      / (BALANCE.SKI_MAX_SPEED - BALANCE.SKI_GRAVITY_SPEED);
    if (trickName !== this.lastTrickName) {
      this.trickCombo++;
    } else {
      this.trickCombo = 1;
    }
    this.lastTrickName = trickName;
    const varietyMult = 1.0 + (this.trickCombo - 1) * BALANCE.TRICK_VARIETY_BONUS;
    const points = Math.round(basePoints * speedMult * varietyMult);
    this.trickScore += points;
    this.trickCount++;
    if (this.trickCombo > this.bestCombo) this.bestCombo = this.trickCombo;

    // Popup text — show trick name + points
    const isBoard = this.baseTexture.includes('snowboard');
    const icon = isBoard ? '🏂' : '🎿';
    const comboText = this.trickCombo > 1 ? ` ${this.trickCombo}×` : '';
    const popup = this.add.text(this.skier.x, this.skier.y - 30, `${icon} ${trickName}! +${points}${comboText}`, {
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

  /** Manual jump — groom key during ski run. Cliff jump if fast enough near danger zone. */
  private doJump(): void {
    this.isAirborne = true;
    const baseScale = this.tileSize / 16;
    const speedFrac = Math.min(1, this.currentSpeed / BALANCE.SKI_MAX_SPEED);

    // Check if near a cliff danger zone for cliff jump
    const kmh = (this.currentSpeed / BALANCE.SKI_MAX_SPEED) * 60;
    const isCliffJump = kmh >= BALANCE.SKI_CLIFF_JUMP_KMH;

    const peakScale = isCliffJump ? BALANCE.SKI_CLIFF_JUMP_SCALE : BALANCE.SKI_JUMP_SCALE;
    const airTime = isCliffJump
      ? BALANCE.SKI_CLIFF_JUMP_AIR
      : BALANCE.SKI_JUMP_AIR_BASE + speedFrac * (BALANCE.SKI_JUMP_AIR_MAX - BALANCE.SKI_JUMP_AIR_BASE);
    const launchDur = airTime * 0.55;
    const landDur = airTime * 0.45;

    // Shadow below skier during air
    const shadow = this.add.graphics().setDepth(DEPTHS.PLAYER - 1);
    this.trickShadow = shadow;
    const shadowY = this.skier.y + 10 * baseScale;
    const updateShadow = () => {
      if (!this.skier?.active) return;
      shadow.clear();
      shadow.fillStyle(0x1a1612, 0.25);
      const sw = 10 * this.skier.scaleX;
      const sh = 3 * this.skier.scaleX;
      shadow.fillRect(this.skier.x - sw / 2, shadowY, sw, sh);
    };
    this.events.on('update', updateShadow);
    this.trickShadowUpdater = updateShadow;

    this.skiSounds.playTrickLaunch();

    // Launch phase
    this.tweens.add({
      targets: this.skier,
      scaleX: baseScale * peakScale,
      scaleY: baseScale * peakScale,
      duration: launchDur,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Land phase
        this.tweens.add({
          targets: this.skier,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: landDur,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.isAirborne = false;
            this.cleanupTrickShadow();
            this.skiSounds.playTrickLand();

            // Clean landing boost on groomed snow
            const tx = Math.floor(this.skier.x / this.tileSize);
            const ty = Math.floor(this.skier.y / this.tileSize);
            if (this.groomedGrid[ty]?.[tx]) {
              this.currentSpeed *= BALANCE.SKI_JUMP_BOOST;
            }
          },
        });
      },
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
            // Halfpipe rebound — landing pushes skier toward pipe center
            if (this.pipeTrickActive) {
              this.pipeTrickActive = false;
              const tileY = Math.floor(this.skier.y / this.tileSize);
              const path = this.geometry.pistePath[tileY];
              if (path) {
                const centerPx = path.centerX * this.tileSize;
                const dir = this.skier.x < centerPx ? 1 : -1;
                const speedRatio = Math.min(this.currentSpeed / BALANCE.SKI_GRAVITY_SPEED, 1.5);
                this.smoothedLateral = dir * BALANCE.SKI_HALFPIPE_REBOUND * speedRatio;
              }
            }
            this.cleanupTrickShadow();
            this.skiSounds.playTrickLand();
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

  private onWipeout(reason: 'ski_wipeout' | 'avalanche' = 'ski_wipeout'): void {
    if (this.isCrashed || this.isFinished) return;
    this.isCrashed = true;
    this.skier.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.skier.setAlpha(0.4);
    this.cameras.main.shake(300, 0.008);
    this.skiSounds.playWipeout();

    // Wipeout ends the run — transition to fail screen after a brief pause
    this.time.delayedCall(BALANCE.SKI_CRASH_DURATION * 1000, () => {
      resetGameScenes(this.game, SCENE_KEYS.LEVEL_COMPLETE, {
        won: false,
        level: this.levelIndex,
        coverage: 0,
        timeUsed: this.elapsedTime,
        failReason: reason,
        skiMode: this.resolvedMode,
      });
    });
  }

  private pauseGame(): void {
    if (!this.scene.manager || !this.scene.isActive()) return;
    this.skiSounds.pause();
    this.ambienceSounds.pause();
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.PAUSE, {
      levelIndex: this.levelIndex,
      skiMode: true,
      skiRunMode: this.resolvedMode as 'ski' | 'snowboard',
    });
    this.scene.bringToTop(SCENE_KEYS.PAUSE);
  }

  private resumeGame(): void {
    if (!this.scene.manager) return;
    if (!this.scene.isActive() && !this.scene.isPaused()) return;
    this.gamepadBindings = loadGamepadBindings();
    this.reloadKeyBindings();
    this.skiSounds.resume();
    this.ambienceSounds.resume(this.level.weather, this.level.isNight);
    this.scene.resume();
  }

  private finishRun(): void {
    if (this.isFinished) return;
    this.isFinished = true;

    this.skier.setVelocity(0, 0);
    playLevelWin();

    this.time.delayedCall(BALANCE.SKI_CELEBRATION_DELAY, () => {
      resetGameScenes(this.game, SCENE_KEYS.LEVEL_COMPLETE, {
        won: true,
        level: this.levelIndex,
        coverage: 100,
        timeUsed: this.elapsedTime,
        skiMode: this.resolvedMode,
        skiGatesHit: this.slalomSystem.totalGates > 0 ? this.slalomSystem.gatesHit : undefined,
        skiGatesTotal: this.slalomSystem.totalGates > 0 ? this.slalomSystem.totalGates : undefined,
        skiTrickScore: this.trickCount > 0 ? this.trickScore : undefined,
        skiTrickCount: this.trickCount > 0 ? this.trickCount : undefined,
        skiBestCombo: this.trickCount > 0 ? this.bestCombo : undefined,
      });
    });
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

  private reloadKeyBindings(): void {
    if (!this.input.keyboard) return;
    const bindings = this.loadKeyBindings();
    for (const key of Object.values(this.wasd)) {
      this.input.keyboard.removeKey(key, true);
    }
    if (this.brakeKey) this.input.keyboard.removeKey(this.brakeKey, true);
    if (this.jumpKey) this.input.keyboard.removeKey(this.jumpKey, true);
    this.wasd = {
      up: this.input.keyboard.addKey(bindings.up),
      down: this.input.keyboard.addKey(bindings.down),
      left: this.input.keyboard.addKey(bindings.left),
      right: this.input.keyboard.addKey(bindings.right),
    };
    this.brakeKey = this.input.keyboard.addKey(bindings.winch);
    this.jumpKey = this.input.keyboard.addKey(bindings.groom);
  }

  /** Generate default grooming when starting ski run without prior grooming. */
  private generateDefaultGrooming(): Set<string> {
    const tiles = new Set<string>();
    const targetRatio = this.level.specialFeatures?.includes('halfpipe') ? 1.0 : this.level.targetCoverage / 100;
    for (let y = 3; y < this.level.height - 2; y++) {
      const path = this.geometry.pistePath[y];
      if (!path) continue;
      const halfW = path.width / 2;
      const leftEdge = Math.floor(path.centerX - halfW);
      const rightEdge = Math.ceil(path.centerX + halfW);
      const rowTiles: number[] = [];
      for (let x = leftEdge; x < rightEdge; x++) {
        if (this.geometry.isInPiste(x, y, this.level)) rowTiles.push(x);
      }
      // Sort by distance from center with jitter for organic feel
      rowTiles.sort((a, b) => {
        const distA = Math.abs(a - path.centerX) / halfW;
        const distB = Math.abs(b - path.centerX) / halfW;
        return (distA + Math.random() * 0.8) - (distB + Math.random() * 0.8);
      });
      const toGroom = Math.ceil(rowTiles.length * targetRatio);
      for (let i = 0; i < toGroom && i < rowTiles.length; i++) {
        tiles.add(`${rowTiles[i]},${y}`);
      }
    }
    return tiles;
  }

  shutdown(): void {
    this.skiSounds.stop();
    this.ambienceSounds.stop();
    this.hazardSystem?.destroy();
    this.hazardSystem = null;
    if (this.nightUpdateHandler) {
      this.events.off('update', this.nightUpdateHandler);
      this.nightUpdateHandler = undefined;
    }
    this.weatherSystem?.reset();
    this.weatherSystem = null;
    this.parkFeatures.destroy();
    this.slalomSystem.destroy();
    this.gateText = null;
    this.cleanupTrickShadow();
    this.trickActive = false;
    this.pipeTrickActive = false;
    this.isAirborne = false;
    if (this.skier?.active) this.tweens.killTweensOf(this.skier);
    // Don't stop HUDScene here — resetGameScenes handles all scene cleanup.
    // Stopping it during shutdown causes "duplicate key" errors when
    // resetGameScenes has already removed HUDScene before this shutdown fires.
    this.game.events.off(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.game.events.off(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.off(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.off(GAME_EVENTS.HAZARD_GAME_OVER, this.boundHazardGameOverHandler);
    this.resizeManager?.destroy();
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
  }
}
