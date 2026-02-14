import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, Level } from '../setup';
import { BALANCE, DEPTHS, FOOD_ITEMS, selectFoodBuff, getFrostRate, getFrostSpeedMultiplier } from '../config/gameConfig';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { STORAGE_KEYS, BINDINGS_VERSION } from '../config/storageKeys';
import { getString, setString } from '../utils/storage';
import { saveProgress, getSavedProgress } from '../utils/gameProgress';
import { isConfirmPressed, isGamepadButtonPressed, captureGamepadButtons, getMappingFromGamepad, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch, isMobile } from '../utils/touchDetect';
import { GAME_EVENTS, type GameStateEvent, type TouchInputEvent } from '../types/GameSceneInterface';
import { WeatherSystem } from '../systems/WeatherSystem';
import { HazardSystem } from '../systems/HazardSystem';
import { WildlifeSystem, type ObstacleRect } from '../systems/WildlifeSystem';
import { LevelGeometry, type PistePath } from '../systems/LevelGeometry';
import { PisteRenderer } from '../systems/PisteRenderer';
import { WinchSystem } from '../systems/WinchSystem';
import { ObstacleBuilder } from '../systems/ObstacleBuilder';
import { ParkFeatureSystem } from '../systems/ParkFeatureSystem';
import { EngineSounds } from '../systems/EngineSounds';
import { playAnimalCall } from '../systems/WildlifeSounds';
import { AmbienceSounds } from '../systems/AmbienceSounds';
import { MusicSystem, getMoodForLevel } from '../systems/MusicSystem';
import { setGroomedTiles } from '../utils/skiRunState';
import DialogueScene from './DialogueScene';

/** Normalize angle difference to [-π, π] range */
function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Map quality value (0–1) to a groomed snow texture key */
function getGroomedTexture(quality: number): string {
  if (quality >= 0.8) return 'snow_groomed';       // excellent corduroy
  if (quality >= 0.5) return 'snow_groomed_med';   // decent but visible ridges
  return 'snow_groomed_rough';                      // choppy, uneven
}

/**
 * Les Aiguilles Blanches - Game Scene
 * Main gameplay scene with grooming mechanics
 */

interface GameSceneData {
  level?: number;
  restartCount?: number;
}

interface SnowCell {
  groomed: boolean;
  groomable: boolean;
  quality: number; // 0–1, grooming quality (0 = ungroomed, best-of-N passes)
}

interface Buffs {
  [key: string]: number;
}

interface TutorialTriggered {
  [key: string]: boolean;
}


export default class GameScene extends Phaser.Scene {
  // Level data
  private levelIndex = 0;
  private level!: Level;

  // World dimensions
  private tileSize = 16;
  private worldOffsetX = 0;
  private worldOffsetY = 0;
  private originalScreenWidth = 0;
  private originalScreenHeight = 0;

  // Game state
  private isGameOver = false;
  private isTransitioning = false;
  private isTumbling = false;
  private isStunned = false;
  private isFallingOffCliff = false;
  private steepWarningShown = false;
  private gamepadBindings: GamepadBindings = loadGamepadBindings();
  private touchInput: TouchInputEvent = { left: false, right: false, up: false, down: false, groom: false, winch: false };

  // Resources
  private fuel = 100;
  private stamina = 100;
  private timeRemaining = 0;
  private isGrooming = false;
  private dialogueWasShowing = false;
  private buffs: Buffs = {};
  private frostLevel = 0;
  private frostRate = 0;

  // Stats tracking for bonus objectives
  private fuelUsed = 0;
  private tumbleCount = 0;
  private restartCount = 0;
  private accessPathsVisited = new Set<number>();

  // Warning sound throttling
  private lastFuelWarnTime = 0;
  private lastStaminaWarnTime = 0;
  private lastTimeWarnTime = 0;
  private staminaDepletedPlayed = false;
  private dialogueDucked = false;

  // Tutorial
  private tutorialStep = 0;
  private tutorialTriggered: TutorialTriggered = {};
  private tutorialSkipped = false;
  private tutorialSkipPending = false;
  private hasMoved = false;
  private hasGroomed = false;

  // Game objects
  private groomer!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private interactables!: Phaser.Physics.Arcade.StaticGroup;
  private boundaryWalls!: Phaser.Physics.Arcade.StaticGroup;
  private dangerZones!: Phaser.Physics.Arcade.StaticGroup;
  private snowGrid: SnowCell[][] = [];
  private pisteDynTex!: Phaser.Textures.DynamicTexture;
  private groomedCount = 0;
  private groomableTiles = 0;
  private totalTiles = 0;
  private groomQualitySum = 0; // sum of quality values for groomed tiles
  private lastCullBounds = { x: 0, y: 0, w: 0, h: 0 };

  // Grooming quality tracking
  private rotationHistory: number[] = [];
  private rotationTimestamps: number[] = [];
  private steeringStability = 1.0; // 0–1, based on angular acceleration
  private fallLineAlignment = 1.0; // 0.3–1.0, based on direction vs fall line

  // Piste path & geometry (extracted to LevelGeometry system)
  private geometry = new LevelGeometry();
  private pisteRenderer!: PisteRenderer;

  // Winch
  private winchSystem!: WinchSystem;

  // Avalanche
  private hazardSystem!: HazardSystem;

  // Weather & environment
  private weatherSystem!: WeatherSystem;
  private wildlifeSystem!: WildlifeSystem;
  private obstacleBuilder!: ObstacleBuilder;
  private parkFeatures = new ParkFeatureSystem();
  private buildingRects: ObstacleRect[] = [];
  private engineSounds = new EngineSounds();
  private ambienceSounds = new AmbienceSounds();

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private groomKey!: Phaser.Input.Keyboard.Key;
  private winchKey!: Phaser.Input.Keyboard.Key;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;
  private movementSensitivity = 1.0;

  // Bound event handlers for clean game.events.off() removal
  private boundTouchHandler = (data: TouchInputEvent) => { this.touchInput = data; };
  private boundPauseHandler = () => {
    const dlg = this.scene.get('DialogueScene') as DialogueScene;
    if (!dlg?.isDialogueShowing()) this.pauseGame();
  };
  private boundResumeHandler = () => { this.resumeGame(); };
  private boundSkipHandler = (nextLevel: number) => { this.transitionToLevel(nextLevel); };
  private boundSkiRunHandler = () => { this.startSkiRun(); };
  private boundShowDialogueHandler = (key: string) => { this.showDialogue(key); };
  private boundHazardGameOverHandler = (won: boolean, reason: string) => { this.gameOver(won, reason); };


  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.levelIndex = data.level || 0;
    this.restartCount = data.restartCount || 0;
    this.level = LEVELS[this.levelIndex];

    if (!this.level) {
      console.error('GameScene.init: LEVEL NOT FOUND!', this.levelIndex, 'LEVELS.length:', LEVELS.length);
    }

    // Reset all state
    this.isGameOver = false;
    this.isTransitioning = false;
    this.isTumbling = false;
    this.isStunned = false;
    this.isFallingOffCliff = false;
    this.steepWarningShown = false;

    // Load movement sensitivity from settings
    const savedSensitivity = getString(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
    this.movementSensitivity = savedSensitivity ? parseFloat(savedSensitivity) : BALANCE.SENSITIVITY_DEFAULT;
    if (isNaN(this.movementSensitivity) || this.movementSensitivity < BALANCE.SENSITIVITY_MIN || this.movementSensitivity > BALANCE.SENSITIVITY_MAX) {
      this.movementSensitivity = BALANCE.SENSITIVITY_DEFAULT;
    }

    // Frost rate based on level weather (only on late-game levels)
    this.frostLevel = 0;
    this.frostRate = getFrostRate(this.levelIndex, !!this.level.isNight, this.level.weather || 'clear');
  }

  create(): void {
    try {
      this.createLevel();
    } catch (e) {
      console.error('GameScene create error:', e);
      console.error('Level:', this.levelIndex, this.level?.nameKey);
      if (e instanceof Error) {
        console.error('Stack:', e.stack);
      }
      throw e;
    }

    // Phaser emits 'shutdown' but doesn't auto-call the method
    this.events.once('shutdown', this.shutdown, this);

    // Expose performance stats for Playwright profiling
    this.exposePerfStats();
  }

  private exposePerfStats(): void {
    const scene = this;
    (window as unknown as Record<string, unknown>).__perfStats = {
      get totalObjects() { return scene.children?.length ?? 0; },
      get graphicsCount() {
        let n = 0;
        scene.children?.each((c: Phaser.GameObjects.GameObject) => {
          if (c.type === 'Graphics') n++;
        });
        return n;
      },
      get imageCount() {
        let n = 0;
        scene.children?.each((c: Phaser.GameObjects.GameObject) => {
          if (c.type === 'Image') n++;
        });
        return n;
      },
      get textCount() {
        let n = 0;
        scene.children?.each((c: Phaser.GameObjects.GameObject) => {
          if (c.type === 'Text') n++;
        });
        return n;
      },
      get tilespriteCount() {
        let n = 0;
        scene.children?.each((c: Phaser.GameObjects.GameObject) => {
          if (c.type === 'TileSprite') n++;
        });
        return n;
      },
      get fps() { return Math.round(scene.game.loop.actualFps); },
      get level() { return scene.levelIndex; },
    };
  }

  private createLevel(): void {
    const { width: screenWidth, height: screenHeight } = this.cameras.main;

    const { worldWidth, worldHeight } = this.initWorldDimensions(screenWidth, screenHeight);
    this.createTerrain(screenWidth, screenHeight, worldWidth, worldHeight);

    // Create groomer
    this.createGroomer();

    // Camera setup - if world fits on screen, don't follow
    if (worldWidth <= screenWidth && worldHeight <= screenHeight) {
      this.cameras.main.setScroll(-this.worldOffsetX, -this.worldOffsetY);
    } else {
      this.cameras.main.startFollow(this.groomer, true, BALANCE.CAMERA_LERP, BALANCE.CAMERA_LERP);
      this.cameras.main.setBounds(
        -this.worldOffsetX,
        -this.worldOffsetY,
        worldWidth + this.worldOffsetX * 2,
        worldHeight + this.worldOffsetY * 2
      );
    }

    this.initGameState();
    this.setupLevelSystems();
    this.setupInputAndScenes();
    this.setupEffectsAndWildlife(worldWidth, worldHeight);

    // Handle window resize - keep camera bounds updated and groomer visible
    this.scale.on('resize', this.handleResize, this);

    // Pause on ESC (but not while dialogue is showing — ESC dismisses dialogue first)
    this.input.keyboard?.on('keydown-ESC', () => {
      const dlg = this.scene.get('DialogueScene') as DialogueScene;
      if (dlg?.isDialogueShowing()) return;
      this.pauseGame();
    });

    Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));

    this.engineSounds.start();
    this.ambienceSounds.start(this.level.weather || 'clear', !!this.level.isNight);
    MusicSystem.getInstance().start(getMoodForLevel(this.level.weather || 'clear', !!this.level.isNight, this.level.difficulty));
  }

  private initWorldDimensions(screenWidth: number, screenHeight: number): { worldWidth: number; worldHeight: number } {
    const marginX = 50;
    const marginY = 100;
    const availableWidth = screenWidth - marginX * 2;
    const availableHeight = screenHeight - marginY;

    const tilesByWidth = Math.floor(availableWidth / this.level.width);
    const tilesByHeight = Math.floor(availableHeight / this.level.height);
    this.tileSize = Math.max(12, Math.min(tilesByWidth, tilesByHeight, 28));
    this.originalScreenWidth = screenWidth;
    this.originalScreenHeight = screenHeight;

    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    this.worldOffsetX = Math.max(0, (screenWidth - worldWidth) / 2);
    this.worldOffsetY = Math.max(marginY / 2, (screenHeight - worldHeight) / 2);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.cameras.main.setBackgroundColor(
      this.level.isNight ? GAME_CONFIG.COLORS.SKY_NIGHT : GAME_CONFIG.COLORS.SKY_DAY
    );

    return { worldWidth, worldHeight };
  }

  private createTerrain(
    screenWidth: number, screenHeight: number,
    worldWidth: number, worldHeight: number
  ): void {
    this.snowGrid = [];
    this.groomedCount = 0;
    this.groomQualitySum = 0;
    this.rotationHistory = [];
    this.rotationTimestamps = [];
    this.steeringStability = 1.0;
    this.fallLineAlignment = 1.0;
    this.createSnowGrid();

    this.pisteRenderer = new PisteRenderer(this, this.geometry);

    const { boundaryWalls, dangerZones } = this.pisteRenderer.createBoundaryColliders(this.level, this.tileSize);
    this.boundaryWalls = boundaryWalls;
    this.dangerZones = dangerZones;

    this.pisteRenderer.createExtendedBackground(
      screenWidth, screenHeight, worldWidth, worldHeight,
      this.worldOffsetX, this.worldOffsetY, this.level, this.tileSize
    );

    this.pisteRenderer.createPisteBoundaries(this.level, this.tileSize, worldWidth);
    this.applySteepZoneTints();

    this.obstacles = this.physics.add.staticGroup();
    this.interactables = this.physics.add.staticGroup();
    this.obstacleBuilder = new ObstacleBuilder(this, this.geometry);
    // Compute spawn position to create exclusion zone for obstacles
    const spawnYIndex = Math.min(this.level.height - 8, Math.floor(this.level.height * 0.9));
    const spawnPath = this.geometry.pistePath[spawnYIndex] || { centerX: this.level.width / 2 };
    const spawnX = spawnPath.centerX * this.tileSize;
    const spawnY = spawnYIndex * this.tileSize;
    this.obstacleBuilder.create(this.level, this.tileSize, this.obstacles, this.interactables,
      [{ x: spawnX, y: spawnY, radius: this.tileSize * 3 }]);
    this.buildingRects = this.obstacleBuilder.buildingRects;

    // Park features (kickers, rails, halfpipe)
    this.parkFeatures.destroy();
    this.parkFeatures.create(
      this, this.level, this.geometry, this.tileSize
    );
    // Halfpipe walls reduce groomable area
    if (this.parkFeatures.hasHalfpipe) {
      for (let y = 0; y < this.level.height; y++) {
        for (let x = 0; x < this.level.width; x++) {
          if (this.parkFeatures.isInHalfpipeWall(x, y) && this.snowGrid[y]?.[x]?.groomable) {
            const cell = this.snowGrid[y][x];
            cell.groomable = false;
            cell.groomed = true;
            // Clear this tile from the piste texture (off-piste TileSprite shows through)
            const ts = this.tileSize;
            const ctx = this.pisteDynTex.context!;
            ctx.clearRect(x * ts, y * ts, ts, ts);
            this.groomableTiles--;
          }
        }
      }
      this.totalTiles = this.groomableTiles;
    }
  }

  private initGameState(): void {
    this.fuel = 100;
    this.stamina = 100;
    this.timeRemaining = this.level.timeLimit;
    this.isGrooming = false;
    this.buffs = {};

    this.fuelUsed = 0;
    this.tumbleCount = 0;
    this.accessPathsVisited = new Set<number>();

    this.winchSystem = new WinchSystem(this, this.geometry);
    this.weatherSystem = new WeatherSystem(this, this.tileSize);
    this.hazardSystem = new HazardSystem(this);
    this.wildlifeSystem = new WildlifeSystem(this, this.tileSize);

    this.tutorialStep = 0;
    this.tutorialTriggered = {};
    this.tutorialSkipped = false;
    const tutorialDone = !!getString(STORAGE_KEYS.TUTORIAL_DONE) ||
      (getSavedProgress()?.currentLevel ?? 0) > 0;
    this.tutorialSkipPending = this.level.isTutorial === true && tutorialDone;
    this.hasMoved = false;
    this.hasGroomed = false;
  }

  private setupLevelSystems(): void {
    if (this.level.hasWinch) {
      this.winchSystem.createAnchors(this.level, this.tileSize);
    }

    if (this.level.hazards && this.level.hazards.includes('avalanche')) {
      this.hazardSystem.onAvalancheSound = (level: number) => {
        if (level === 1) this.engineSounds.playAvalancheWarning1();
        else if (level === 2) this.engineSounds.playAvalancheWarning2();
        else if (level === 3) this.engineSounds.playAvalancheTrigger();
      };
      this.hazardSystem.isGameOver = () => this.isGameOver;
      this.hazardSystem.isGrooming = () => this.isGrooming;
      this.hazardSystem.createAvalancheZones(
        this.level,
        this.tileSize,
        this.groomer,
        this.geometry.getCliffAvoidRects(this.tileSize),
        this.winchSystem.anchors?.map(a => ({ x: a.x, y: a.baseY })),
        this.geometry.pistePath
      );
    }
  }

  private setupInputAndScenes(): void {
    this.setupInput();

    // Cross-scene event listeners (use bound handlers for clean removal)
    // IMPORTANT: Register BEFORE launching HUDScene to avoid race condition
    // where HUDScene.create() emits events before we're listening
    this.game.events.on(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.game.events.on(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.on(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.on(GAME_EVENTS.SKIP_LEVEL, this.boundSkipHandler);
    this.game.events.on(GAME_EVENTS.START_SKI_RUN, this.boundSkiRunHandler);
    this.game.events.on(GAME_EVENTS.SHOW_DIALOGUE, this.boundShowDialogueHandler);
    this.game.events.on(GAME_EVENTS.HAZARD_GAME_OVER, this.boundHazardGameOverHandler);
    this.game.events.on(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsTop, this);
    
    
    this.scene.launch('DialogueScene', { weather: this.level.weather });

    this.scene.launch('HUDScene', {
      level: this.level,
    });
    this.scene.bringToTop('HUDScene');

    if (this.level.introDialogue) {
      const offerSkip = this.level.isTutorial && this.tutorialSkipPending;

      this.time.delayedCall(500, () => {
        if (offerSkip) {
          this.showDialogue('skipTutorial', this.level.introSpeaker);

          // Auto-skip after 3s: skip entire tutorial level → advance to level 1
          const skipDelay = 3000;
          const dlg = this.scene.get('DialogueScene') as DialogueScene | null;
          dlg?.showCountdown(skipDelay);
          const autoSkipTimer = this.time.delayedCall(skipDelay, () => {
            this.tutorialSkipped = true;
            this.tutorialSkipPending = false;
            dlg?.dismissAllDialogue();
            this.transitionToLevel(this.levelIndex + 1);
          });

          // If player advances/dismisses the dialogue before timeout → replay tutorial
          const checkClosed = this.time.addEvent({ delay: 200, loop: true, callback: () => {
            if (this.tutorialSkipped) { checkClosed.destroy(); return; }
            if (dlg && !dlg.isDialogueShowing()) {
              autoSkipTimer.destroy();
              this.tutorialSkipPending = false;
              checkClosed.destroy();
            }
          }});
        } else {
          this.showDialogue(this.level.introDialogue!, this.level.introSpeaker);
        }
      });
    }
  }

  private setupEffectsAndWildlife(worldWidth: number, worldHeight: number): void {
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });

    if (this.level.isNight) {
      this.weatherSystem.createNightOverlay();
      this.weatherSystem.updateNightOverlay(this.groomer);
    }

    if (this.level.weather !== 'clear') {
      this.weatherSystem.createWeatherEffects(this.level);
    }

    if (this.frostRate > 0) {
      this.weatherSystem.createFrostOverlay();
    }

    this.weatherSystem.applyAccessibilitySettings();

    if (this.level.wildlife && this.level.wildlife.length > 0) {
      const midPath = this.geometry.pistePath[Math.floor(this.level.height / 2)];
      const pisteLeft = midPath ? (midPath.centerX - midPath.width / 2) * this.tileSize : worldWidth * 0.3;
      const pisteRight = midPath ? (midPath.centerX + midPath.width / 2) * this.tileSize : worldWidth * 0.7;
      this.wildlifeSystem.setObstacles(
        (px, py) => this.geometry.isOnCliff(px, py),
        this.buildingRects,
      );
      this.wildlifeSystem.spawn(this.level.wildlife, worldWidth, worldHeight, pisteLeft, pisteRight, this.geometry.accessPathRects);
      this.wildlifeSystem.bootstrapTracks();
      this.wildlifeSystem.onAnimalFlee = (type) => {
        // Suppress flee sounds during dialogue to avoid drowning out voice
        const dlg = this.scene.get('DialogueScene') as { isDialogueShowing?: () => boolean } | undefined;
        if (dlg?.isDialogueShowing?.()) return;
        playAnimalCall(type);
      };
    }
  }


  /** Paint a single tile onto the piste DynamicTexture via its raw Canvas context. */
  private stampPisteTile(texKey: string, tx: number, ty: number, alpha = 1): void {
    const dt = this.pisteDynTex;
    const ctx = dt.context!;
    const frame = this.textures.getFrame(texKey);
    if (!frame) return;
    const src = frame.source.image as HTMLImageElement | HTMLCanvasElement;
    const cd = frame.canvasData as { x: number; y: number; width: number; height: number };
    const ts = this.tileSize;
    ctx.globalAlpha = alpha;
    ctx.drawImage(src, cd.x, cd.y, cd.width, cd.height, tx * ts, ty * ts, ts, ts);
    ctx.globalAlpha = 1;
  }

  private createSnowGrid(): void {
    const tileSize = this.tileSize;

    // Generate all geometry (piste path, access zones, cliffs)
    this.geometry.generate(this.level, tileSize);

    this.groomableTiles = 0;

    // Pre-rendered off-piste background — paint tile pattern once onto a DynamicTexture
    const bgW = this.level.width * tileSize;
    const bgH = this.level.height * tileSize;
    const offPisteKey = '__offpiste_bg';
    if (this.textures.exists(offPisteKey)) this.textures.remove(offPisteKey);
    const offPisteDt = this.textures.addDynamicTexture(offPisteKey, bgW, bgH)!;
    const offCtx = offPisteDt.context!;
    const offFrame = this.textures.getFrame('snow_offpiste');
    const offSrc = offFrame.source.image as HTMLImageElement | HTMLCanvasElement;
    const offCd = offFrame.canvasData as { x: number; y: number; width: number; height: number };
    const pat = offCtx.createPattern(offSrc, 'repeat');
    if (pat) {
      offCtx.fillStyle = pat;
      offCtx.fillRect(0, 0, bgW, bgH);
    } else {
      // Fallback: tile manually
      for (let ty = 0; ty < bgH; ty += offCd.height) {
        for (let tx = 0; tx < bgW; tx += offCd.width) {
          offCtx.drawImage(offSrc, offCd.x, offCd.y, offCd.width, offCd.height, tx, ty, offCd.width, offCd.height);
        }
      }
    }
    const offPisteBg = this.add.image(bgW / 2, bgH / 2, offPisteKey);
    offPisteBg.setDepth(DEPTHS.TERRAIN);

    // DynamicTexture for piste tiles — paints all snow as a single texture
    const dtKey = '__piste_snow';
    if (this.textures.exists(dtKey)) this.textures.remove(dtKey);
    this.pisteDynTex = this.textures.addDynamicTexture(dtKey, bgW, bgH)!;

    for (let y = 0; y < this.level.height; y++) {
      this.snowGrid[y] = [];
      for (let x = 0; x < this.level.width; x++) {
        const isGroomable = this.geometry.isInPiste(x, y, this.level);

        if (isGroomable) {
          this.snowGrid[y][x] = {
            groomed: false,
            groomable: true,
            quality: 0,
          };
          this.groomableTiles++;
          this.stampPisteTile('snow_ungroomed', x, y);
        } else {
          this.snowGrid[y][x] = {
            groomed: true,
            groomable: false,
            quality: 0,
          };
        }
      }
    }

    // Single Image displays the entire piste texture
    const pisteImg = this.add.image(bgW / 2, bgH / 2, dtKey);
    pisteImg.setDepth(DEPTHS.PISTE);

    this.totalTiles = this.groomableTiles;
  }




  private createGroomer(): void {
    const bottomYIndex = Math.min(this.level.height - 8, Math.floor(this.level.height * 0.9));
    const bottomPath = this.geometry.pistePath[bottomYIndex] || { centerX: this.level.width / 2 };
    const startX = bottomPath.centerX * this.tileSize;
    const startY = bottomYIndex * this.tileSize;

    const groomerTexture = this.level.weather === 'storm' ? 'groomer_storm' : 'groomer';
    this.groomer = this.physics.add.sprite(startX, startY, groomerTexture);
    this.groomer.setCollideWorldBounds(true);
    this.groomer.setDrag(BALANCE.GROOMER_DRAG);
    this.groomer.setScale(this.tileSize / 16);
    this.groomer.setDepth(DEPTHS.PLAYER); // Above night overlay
    // Shrink physics body to cab width (~67%) so tracks overhang without colliding
    const groomerBody = this.groomer.body as Phaser.Physics.Arcade.Body;
    groomerBody.setSize(24, 48, true);

    this.physics.add.collider(this.groomer, this.obstacles, () => this.onObstacleHit());
    this.physics.add.collider(this.groomer, this.boundaryWalls, () => this.onObstacleHit());

    // Park feature collision — driving onto a feature = instant fail
    // Uses overlap (not collider) so the groomer center must actually enter the hitbox
    if (this.parkFeatures.hasFeatures && this.parkFeatures.featureGroup) {
      this.physics.add.overlap(this.groomer, this.parkFeatures.featureGroup, (_groomer, featureSprite) => {
        const featureType = (featureSprite as Phaser.Physics.Arcade.Sprite).texture.key === 'park_kicker' ? 'kicker' : 'rail';
        this.triggerFeatureDestruction(featureType);
      });
    }

    // Cliff fall is checked per-frame via center-of-mass in checkCliffFall().
    // Danger zones exist as visual markers but have no physics interaction —
    // the groomer can extend its tracks/tiller over the edge safely until
    // its center of mass crosses onto cliff terrain.

    this.physics.add.overlap(
      this.groomer,
      this.interactables,
      this.handleInteraction as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  /**
   * Directional cliff stability check. Called every frame.
   *
   * Checks 4 points around the groomer (front, rear, left, right) based on
   * its facing direction. Tracked vehicles are stable along their length axis
   * (front/rear can overhang) but tip easily sideways:
   *
   * - Side point on cliff → immediate tip-over (no lateral grip)
   * - Only front or rear on cliff → safe (weight supported by tracks)
   * - Center of mass on cliff → fall (fully past the edge)
   */
  private checkCliffFall(): void {
    if (this.isGameOver || this.isFallingOffCliff || this.isTumbling) return;
    if (!this.geometry.cliffSegments || this.geometry.cliffSegments.length === 0) return;

    const scale = this.tileSize / 16;
    const rot = this.groomer.rotation;
    // Forward direction (along tracks): sprite local -Y rotated into world space
    const fwdX = -Math.sin(rot);
    const fwdY = Math.cos(rot);
    // Right direction (perpendicular to tracks)
    const rightX = Math.cos(rot);
    const rightY = Math.sin(rot);

    const cx = this.groomer.x;
    const cy = this.groomer.y;
    const halfLen = BALANCE.GROOMER_HALF_LENGTH * scale * 0.7;  // 70% — don't need full tip
    const halfWid = BALANCE.GROOMER_HALF_WIDTH * scale * 0.5;   // 50% — sides are more sensitive

    // Side points (left/right of tracks) — tip if either side is on cliff
    const leftOnCliff = this.geometry.isOnCliff(cx - rightX * halfWid, cy - rightY * halfWid);
    const rightOnCliff = this.geometry.isOnCliff(cx + rightX * halfWid, cy + rightY * halfWid);
    if (leftOnCliff || rightOnCliff) {
      this.triggerCliffFall();
      return;
    }

    // Center of mass — fall if center itself is on cliff
    if (this.geometry.isOnCliff(cx, cy)) {
      this.triggerCliffFall();
      return;
    }
  }

  private triggerCliffFall(): void {
    this.isFallingOffCliff = true;

    this.engineSounds.playCliffFall();
    this.winchSystem.detach();

    this.showDialogue('cliffFall');
    this.time.delayedCall(BALANCE.CLIFF_FALL_DELAY, () => {
      this.gameOver(false, 'cliff');
    });
  }

  private triggerFeatureDestruction(featureType: 'kicker' | 'rail'): void {
    if (this.isGameOver || this.isFallingOffCliff || this.isTumbling) return;
    this.isTumbling = true; // Reuse tumble flag to prevent double-fire

    this.cameras.main.shake(300, 0.01);
    this.groomer.setVelocity(0, 0);

    const msgKey = featureType === 'kicker' ? 'featureDestroyedKicker' : 'featureDestroyedRail';
    this.showDialogue(msgKey);
    this.time.delayedCall(BALANCE.GAME_OVER_DELAY, () => {
      this.gameOver(false, 'feature');
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // Load custom key bindings from localStorage (keyCodes are numbers)
    const bindings = this.loadKeyBindings();
    
    this.wasd = {
      up: this.input.keyboard!.addKey(bindings.up),
      down: this.input.keyboard!.addKey(bindings.down),
      left: this.input.keyboard!.addKey(bindings.left),
      right: this.input.keyboard!.addKey(bindings.right),
    };
    this.groomKey = this.input.keyboard!.addKey(bindings.groom);
    this.winchKey = this.input.keyboard!.addKey(bindings.winch);

    if (this.input.gamepad) {
      // Check for already connected gamepads
      if (this.input.gamepad.total > 0) {
        this.gamepad = this.input.gamepad.getPad(0);
        Accessibility.announce('Gamepad connected');
      }
      
      // Listen for new connections
      this.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        if (!this.gamepad) {
          this.gamepad = pad;
          Accessibility.announce('Gamepad connected');
        }
      });

      // Capture current button state to prevent phantom presses on scene transition
      if (this.gamepad) {
        const padState = captureGamepadButtons(this, [this.gamepadBindings.pause]);
        this.gamepadStartPressed = padState[this.gamepadBindings.pause];
      }
    }

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.input.activePointer.id !== 0) {
        // Touch joystick logic placeholder
      }
    });
  }

  private loadKeyBindings(): { up: number; down: number; left: number; right: number; groom: number; winch: number } {
    const savedVersion = getString(STORAGE_KEYS.BINDINGS_VERSION);
    const saved = getString(STORAGE_KEYS.BINDINGS);
    
    // Get layout-specific defaults
    const defaults = getLayoutDefaults();
    
    // If version doesn't match, use defaults
    if (savedVersion !== String(BINDINGS_VERSION)) {
      return defaults;
    }
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use saved values if they are valid numbers
        const result = { ...defaults };
        for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) {
          if (typeof parsed[key] === 'number' && parsed[key] > 0) {
            result[key] = parsed[key];
          }
        }
        return result;
      } catch {
        return defaults;
      }
    }
    return defaults;
  }

  private gamepadStartPressed = false;
  
  update(_time: number, delta: number): void {
    // Check gamepad Start button for pause (with debounce)
    if (this.gamepad) {
      const startPressed = isGamepadButtonPressed(this.gamepad, this.gamepadBindings.pause);
      if (startPressed && !this.gamepadStartPressed && !this.isGameOver) {
        const dlg = this.scene.get('DialogueScene') as DialogueScene;
        if (!dlg?.isDialogueShowing()) {
          this.pauseGame();
        }
      }
      this.gamepadStartPressed = startPressed;
    }
    
    if (this.scene.isPaused() || this.isGameOver || this.isTransitioning) return;

    this.handleMovement();
    this.handleGrooming();
    if (this.level.hasWinch) {
      const isWinchPressed = this.winchKey.isDown || this.touchInput.winch ||
        isGamepadButtonPressed(this.gamepad, this.gamepadBindings.winch);
      const wasActive = this.winchSystem.active;
      const snapped = this.winchSystem.update(isWinchPressed, this.groomer.x, this.groomer.y, this.tileSize, this.level.height);
      // Winch attach/detach one-shot sounds
      if (this.winchSystem.active && !wasActive) this.engineSounds.playWinchAttach();
      else if (!this.winchSystem.active && wasActive) this.engineSounds.playWinchDetach();
      // Cable snap: stun + stamina penalty
      if (snapped) {
        this.cameras.main.shake(BALANCE.SHAKE_WINCH_SNAP.duration, BALANCE.SHAKE_WINCH_SNAP.intensity);
        this.stamina = Math.max(0, this.stamina - BALANCE.WINCH_SNAP_STAMINA_COST);
        this.groomer.setVelocity(0, 0);
        this.isStunned = true;
        this.time.delayedCall(BALANCE.WINCH_SNAP_STUN_MS, () => { this.isStunned = false; });
      }
    }
    this.checkSteepness();
    this.checkCliffFall();
    this.updateResources(delta);
    this.checkTutorialProgress();
    this.checkWinCondition();
    this.cullOffscreen();
    
    // Update night overlay with headlight position
    if (this.level.isNight) {
      this.weatherSystem.updateNightOverlay(this.groomer);
    }

    // Update frost vignette
    if (this.frostRate > 0) {
      this.weatherSystem.updateFrostOverlay(this.frostLevel);
    }

    // Update wildlife (flee from groomer)
    this.wildlifeSystem.update(this.groomer.x, this.groomer.y, delta);

    // Update engine/movement sounds
    const speed = (this.groomer.body as Phaser.Physics.Arcade.Body).velocity.length();
    const winchTaut = this.winchSystem.active && this.winchSystem.isTaut(this.groomer.y);
    const tileX = Math.floor(this.groomer.x / this.tileSize);
    const tileY = Math.floor(this.groomer.y / this.tileSize);
    const onGroomed = this.snowGrid[tileY]?.[tileX]?.groomed ?? false;
    this.engineSounds.update(speed, this.isGrooming, winchTaut, onGroomed, delta);
    this.ambienceSounds.update(delta);

    // Duck ambience & engine during dialogue so voice is audible
    const dlg = this.scene.get('DialogueScene') as { isDialogueShowing?: () => boolean } | undefined;
    const dialogueActive = !!dlg?.isDialogueShowing?.();
    if (dialogueActive && !this.dialogueDucked) {
      this.dialogueDucked = true;
      this.ambienceSounds.setDuck(0.2);
      this.engineSounds.setDuck(0.3);
    } else if (!dialogueActive && this.dialogueDucked) {
      this.dialogueDucked = false;
      this.ambienceSounds.setDuck(1);
      this.engineSounds.setDuck(1);
    }

    // Emit game state for HUD
    this.game.events.emit(GAME_EVENTS.GAME_STATE, this.buildGameStatePayload());
  }

  private checkSteepness(): void {
    if (this.geometry.steepZoneRects.length === 0) return;
    if (this.isGameOver || this.isTumbling) return;

    const groomerY = this.groomer.y;
    const groomerX = this.groomer.x;

    for (const path of this.geometry.accessPathRects) {
      if (groomerY >= path.startY && groomerY <= path.endY &&
        groomerX >= path.leftX && groomerX <= path.rightX) {
        this.accessPathsVisited.add(path.pathIndex);
        return;
      }
    }

    for (const zone of this.geometry.steepZoneRects) {
      if (groomerY >= zone.startY && groomerY <= zone.endY &&
        groomerX >= zone.leftX && groomerX <= zone.rightX) {

        // Winch only prevents slide/tumble when cable is taut (groomer below anchor)
        if (!this.winchSystem.isTaut(groomerY)) {
          if (zone.slope >= BALANCE.TUMBLE_SLOPE_THRESHOLD) {
            this.triggerTumble(zone.slope);
            return;
          }
          else if (zone.slope >= BALANCE.SLIDE_SLOPE_THRESHOLD) {
            const slideSpeed = (zone.slope - BALANCE.SLIDE_GRAVITY_OFFSET) * BALANCE.SLIDE_GRAVITY_MULTIPLIER;
            this.groomer.setVelocityY((this.groomer.body as Phaser.Physics.Arcade.Body).velocity.y + slideSpeed);

            if (!this.steepWarningShown) {
              this.steepWarningShown = true;
              this.showDialogue('steepWarning');
            }
          }
        }
        return;
      }
    }
  }

  private getSlopeAtPosition(x: number, y: number): number {
    for (const zone of this.geometry.steepZoneRects) {
      if (y >= zone.startY && y <= zone.endY &&
        x >= zone.leftX && x <= zone.rightX) {
        return zone.slope;
      }
    }
    return 0;
  }

  private getSlopeAtY(y: number): number {
    for (const zone of this.geometry.steepZoneRects) {
      if (y >= zone.startY && y <= zone.endY) {
        return zone.slope;
      }
    }
    return 0;
  }

  /** Returns the nearest steep texture slope bucket (25–50 in steps of 5), or 0. */
  private getSteepTextureBucket(slope: number): number {
    if (slope < 25) return 0;
    return Math.min(50, Math.round(slope / 5) * 5);
  }

  /** Apply steep zone textures to all piste tiles within steep zones. */
  private applySteepZoneTints(): void {
    const ts = this.tileSize;
    for (const zone of this.geometry.steepZoneRects) {
      const bucket = this.getSteepTextureBucket(zone.slope);
      if (bucket === 0) continue;
      const texKey = `snow_steep_${bucket}`;
      if (!this.textures.exists(texKey)) continue;
      const yStart = Math.max(0, Math.floor(zone.startY / ts));
      const yEnd = Math.min(this.level.height - 1, Math.floor(zone.endY / ts));
      for (let y = yStart; y <= yEnd; y++) {
        for (let x = 0; x < this.level.width; x++) {
          const cell = this.snowGrid[y][x];
          if (cell.groomable) {
            this.stampPisteTile(texKey, x, y);
          }
        }
      }
    }
  }

  private triggerTumble(_slope: number): void {
    if (this.isTumbling) return;
    this.isTumbling = true;
    this.tumbleCount++;

    this.engineSounds.playTumble();
    this.cameras.main.shake(BALANCE.SHAKE_TUMBLE.duration, BALANCE.SHAKE_TUMBLE.intensity);

    this.tweens.add({
      targets: this.groomer,
      rotation: this.groomer.rotation + Math.PI * 4,
      duration: BALANCE.TUMBLE_ROTATION_DURATION,
      ease: 'Power2'
    });

    this.groomer.setVelocity(0, BALANCE.TUMBLE_SLIDE_SPEED);

    this.showDialogue('tumble');

    this.time.delayedCall(BALANCE.GAME_OVER_DELAY, () => {
      this.gameOver(false, 'tumble');
    });
  }

  private handleMovement(): void {
    // Don't handle movement while dialogue is showing or stunned
    const dialogueScene = this.scene.get('DialogueScene') as DialogueScene;
    if (dialogueScene && dialogueScene.isDialogueShowing()) {
      this.groomer.setVelocity(0, 0);
      return;
    }
    if (this.isStunned) {
      this.groomer.setVelocity(0, 0);
      return;
    }

    let speed = GAME_CONFIG.GROOMER_SPEED * this.movementSensitivity * (this.buffs.speed ? BALANCE.SPEED_BUFF_MULTIPLIER : 1);

    // Frost slows movement
    speed *= getFrostSpeedMultiplier(this.frostLevel);

    let vx = 0;
    let vy = 0;

    // Keyboard input
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Touch input (via event system)
    if (this.touchInput.left) vx = -speed;
    if (this.touchInput.right) vx = speed;
    if (this.touchInput.up) vy = -speed;
    if (this.touchInput.down) vy = speed;

    if (this.gamepad) {
      const threshold = BALANCE.GAMEPAD_DEADZONE;
      // Left stick movement
      if (Math.abs(this.gamepad.leftStick.x) > threshold) {
        vx = this.gamepad.leftStick.x * speed;
      }
      if (Math.abs(this.gamepad.leftStick.y) > threshold) {
        vy = this.gamepad.leftStick.y * speed;
      }
      // D-pad movement (overrides stick if pressed)
      if (this.gamepad.left) vx = -speed;
      if (this.gamepad.right) vx = speed;
      if (this.gamepad.up) vy = -speed;
      if (this.gamepad.down) vy = speed;
      // Use configurable groom button (default: south/A)
      if (isGamepadButtonPressed(this.gamepad, this.gamepadBindings.groom)) this.isGrooming = true;
    }

    if (this.winchSystem.active && this.winchSystem.anchor) {
      const dx = this.winchSystem.anchor.x - this.groomer.x;
      const dy = this.winchSystem.anchor.y - this.groomer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Only apply winch force when cable is taut (groomer below anchor)
      // In screen coords, groomer.y > anchor.y means groomer is lower/below
      const groomerY = this.groomer.y - 10;
      const isTaut = groomerY > this.winchSystem.anchor.y;

      if (dist > BALANCE.WINCH_MIN_DISTANCE && isTaut) {
        const winchForce = BALANCE.WINCH_FORCE;
        vx += (dx / dist) * speed * winchForce;
        vy += (dy / dist) * speed * winchForce;
      }

      // Cable tension drag — slow down when near snapping point
      const maxDist = BALANCE.WINCH_MAX_CABLE * this.tileSize;
      const tensionRatio = dist / maxDist;
      if (tensionRatio > 0.7) {
        // Moving away from anchor? Apply drag proportional to tension
        const dot = -(vx * dx + vy * dy); // positive = moving away
        if (dot > 0) {
          const drag = 1 - 0.7 * (tensionRatio - 0.7) / 0.3; // 1.0 at 70% → 0.3 at 100%
          vx *= drag;
          vy *= drag;
        }
      }
    }

    this.groomer.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.groomer.rotation = Math.atan2(vy, vx) + Math.PI / 2;
      this.hasMoved = true;
      this.updateGroomingQuality();
    }
  }

  /** Update steering stability and fall-line alignment for grooming quality. */
  private updateGroomingQuality(): void {
    const now = this.time.now;
    const rotation = this.groomer.rotation;

    // Track rotation history (rolling 500ms window)
    this.rotationHistory.push(rotation);
    this.rotationTimestamps.push(now);
    const windowMs = 500;
    while (this.rotationTimestamps.length > 0 && now - this.rotationTimestamps[0] > windowMs) {
      this.rotationTimestamps.shift();
      this.rotationHistory.shift();
    }

    // Compute angular acceleration (change in angular velocity)
    // Need at least 3 samples to compute acceleration
    if (this.rotationHistory.length >= 3) {
      const n = this.rotationHistory.length;
      // Angular velocities at two points
      const dt1 = (this.rotationTimestamps[n - 2] - this.rotationTimestamps[n - 3]) / 1000 || 0.016;
      const dt2 = (this.rotationTimestamps[n - 1] - this.rotationTimestamps[n - 2]) / 1000 || 0.016;
      const av1 = normalizeAngle(this.rotationHistory[n - 2] - this.rotationHistory[n - 3]) / dt1;
      const av2 = normalizeAngle(this.rotationHistory[n - 1] - this.rotationHistory[n - 2]) / dt2;
      const angularAccel = Math.abs(av2 - av1) / ((dt1 + dt2) / 2);
      // Max angular acceleration threshold (radians/s²) — tuned so smooth arcs pass
      const maxAccel = 15;
      this.steeringStability = Math.max(0.2, Math.min(1.0, 1.0 - angularAccel / maxAccel));
    }

    // Fall-line alignment: cos²(angle - π/2)
    // Fall line is straight down = π/2 in Phaser coords (after the +π/2 offset, driving down = rotation 0)
    // groomer.rotation = atan2(vy,vx) + π/2, so driving straight down → rotation = π
    // We want alignment with vertical axis: cos²(rotation) gives 1 for 0/π (vertical), 0 for ±π/2 (horizontal)
    const cos = Math.cos(this.groomer.rotation);
    this.fallLineAlignment = 0.3 + 0.7 * cos * cos;
  }

  private handleGrooming(): void {
    // Don't handle grooming while dialogue is showing
    const dialogueScene = this.scene.get('DialogueScene') as DialogueScene;
    if (dialogueScene && dialogueScene.isDialogueShowing()) {
      this.isGrooming = false;
      this.dialogueWasShowing = true;
      return;
    }
    // After dialogue closes, suppress grooming until groom key is released
    if (this.dialogueWasShowing) {
      const gamepadGroom = this.gamepad !== null && (this.gamepadBindings ? isGamepadButtonPressed(this.gamepad, this.gamepadBindings.groom) : false);
      if (this.groomKey.isDown || gamepadGroom) {
        this.isGrooming = false;
        return;
      }
      this.dialogueWasShowing = false;
    }

    // Check touch input (via event system)
    const touchGroom = this.touchInput.groom;

    // Use configurable groom button (default: south/A)
    const gamepadGroom = this.gamepad !== null && isGamepadButtonPressed(this.gamepad, this.gamepadBindings.groom);
    this.isGrooming = this.groomKey.isDown || gamepadGroom || touchGroom;

    if (this.isGrooming && this.fuel > 0) {
      this.groomAtPosition(this.groomer.x, this.groomer.y);
    }
  }

  private groomAtPosition(x: number, y: number): void {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    
    // Low stamina reduces grooming effectiveness (smaller radius)
    const staminaFactor = this.stamina > BALANCE.LOW_STAMINA_THRESHOLD ? 1 : (0.5 + this.stamina / (BALANCE.LOW_STAMINA_THRESHOLD * 2));
    const baseRadius = Math.ceil(GAME_CONFIG.GROOM_WIDTH / this.tileSize / 2) + 1;
    const precisionBonus = this.buffs.precision ? BALANCE.PRECISION_BUFF_RADIUS_BONUS : 0;
    const radius = Math.max(1, Math.floor(baseRadius * staminaFactor) + precisionBonus);

    // Compute current grooming quality from stability + alignment
    // In park zones, alignment uses the zone's optimal direction instead of fall-line
    let alignment = this.fallLineAlignment;
    const optDir = this.parkFeatures.getOptimalDirection(tileX, tileY);
    if (optDir !== null) {
      const cos = Math.cos(this.groomer.rotation - optDir);
      alignment = 0.3 + 0.7 * cos * cos;
    }
    const quality = this.steeringStability * 0.5 + alignment * 0.5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;

        if (tx >= 0 && tx < this.level.width &&
          ty >= 0 && ty < this.level.height) {
          const cell = this.snowGrid[ty][tx];
          if (cell.groomable) {
            if (!cell.groomed) {
              // First grooming pass
              cell.groomed = true;
              cell.quality = quality;
              this.groomQualitySum += quality;
              this.groomedCount++;
              this.hasGroomed = true;
            } else if (quality > cell.quality) {
              // Re-grooming at higher quality (best-of-N)
              this.groomQualitySum += quality - cell.quality;
              cell.quality = quality;
            } else {
              continue; // No change needed
            }
            // Steep zones use dedicated tinted textures; flat zones use quality-based textures
            const worldY = ty * this.tileSize + this.tileSize / 2;
            const slope = this.getSlopeAtY(worldY);
            const bucket = this.getSteepTextureBucket(slope);
            let texKey: string;
            let alpha = 1;
            if (this.weatherSystem.isHighContrast) {
              texKey = bucket > 0 ? `snow_groomed_steep_${bucket}` : 'snow_groomed';
            } else if (bucket > 0) {
              texKey = `snow_groomed_steep_${bucket}`;
              alpha = 0.7 + 0.3 * cell.quality;
            } else {
              texKey = getGroomedTexture(cell.quality);
            }
            this.stampPisteTile(texKey, tx, ty, alpha);
          }
        }
      }
    }
    // Erase animal tracks in the groomed area
    this.wildlifeSystem.eraseTracksAt(x, y, radius * this.tileSize);
  }

  private updateResources(delta: number): void {
    const dt = delta / 1000;
    const isMoving = (this.groomer.body as Phaser.Physics.Arcade.Body).velocity.length() > 0;

    if (isMoving) {
      // Fuel cost — speed buff increases consumption
      const fuelMultiplier = this.buffs.speed ? BALANCE.SPEED_BUFF_FUEL_MULTIPLIER : 1;
      const fuelCost = GAME_CONFIG.FUEL_CONSUMPTION * dt * 100 * fuelMultiplier;
      this.fuel -= fuelCost;
      this.fuelUsed += fuelCost;
      
      // Stamina drain varies based on work difficulty
      let staminaDrain = GAME_CONFIG.STAMINA_CONSUMPTION;
      
      // Check if on steep terrain
      const currentSlope = this.getSlopeAtPosition(this.groomer.x, this.groomer.y);
      const isOnSteep = currentSlope >= BALANCE.STEEP_STAMINA_THRESHOLD;
      
      // Check if winch is actually helping (taut, not slack)
      if (this.winchSystem.isTaut(this.groomer.y)) {
        // Winch does the work - minimal operator effort
        staminaDrain *= BALANCE.STAMINA_WINCH_MULTIPLIER;
      } else if (isOnSteep) {
        // Fighting gravity without winch - exhausting!
        staminaDrain *= BALANCE.STAMINA_STEEP_MULTIPLIER;
      }
      
      if (this.isGrooming) {
        // Operating the tiller adds effort
        staminaDrain *= BALANCE.STAMINA_GROOMING_MULTIPLIER;
      }

      // Warmth buff halves stamina drain
      if (this.buffs.warmth) {
        staminaDrain *= BALANCE.WARMTH_BUFF_STAMINA_MULTIPLIER;
      }
      
      this.stamina -= staminaDrain * dt * 100;
    }

    this.fuel = Phaser.Math.Clamp(this.fuel, 0, 100);
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, 100);

    // Resource warning sounds (throttled)
    const now = Date.now();
    if (this.fuel > 0 && this.fuel < 20 && now - this.lastFuelWarnTime > 2000) {
      this.lastFuelWarnTime = now;
      this.engineSounds.playFuelWarning();
    }
    if (this.stamina > 0 && this.stamina < BALANCE.LOW_STAMINA_THRESHOLD && now - this.lastStaminaWarnTime > 3000) {
      this.lastStaminaWarnTime = now;
      this.engineSounds.playStaminaWarning();
    }
    if (this.stamina <= 0 && !this.staminaDepletedPlayed) {
      this.staminaDepletedPlayed = true;
      this.engineSounds.playStaminaDepleted();
    }
    if (this.stamina > 10) {
      this.staminaDepletedPlayed = false;
    }

    for (const buff in this.buffs) {
      this.buffs[buff] -= dt * 1000;
      if (this.buffs[buff] <= 0) {
        delete this.buffs[buff];
      }
    }

    if (this.buffs.staminaRegen) {
      this.stamina = Math.min(100, this.stamina + BALANCE.STAMINA_REGEN_RATE);
    }

    // Frost accumulation — warmth buff pauses it
    if (this.frostRate > 0 && !this.buffs.warmth) {
      this.frostLevel = Math.min(100, this.frostLevel + (this.frostRate / 60) * dt);
    }

    if (this.isGameOver) return;

    if (this.fuel <= 0) {
      this.fuel = 0;
      this.showDialogue('fuelEmpty');
      this.time.delayedCall(BALANCE.FUEL_EMPTY_DELAY, () => {
        this.gameOver(false, 'fuel');
      });
    } else if (this.timeRemaining <= 0 && this.level.timeLimit > 0) {
      this.gameOver(false, 'time');
    }
  }

  private updateTimer(): void {
    if (this.level.timeLimit <= 0) return;
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      // Urgent ticks when time is running low (last 15% of time limit)
      const warnThreshold = Math.max(10, Math.round(this.level.timeLimit * 0.15));
      if (this.timeRemaining <= warnThreshold && this.timeRemaining > 0) {
        const now = Date.now();
        // Speed up: 2s interval at 30s, 0.5s interval at 5s
        const interval = this.timeRemaining <= 5 ? 500 :
                         this.timeRemaining <= 10 ? 1000 : 2000;
        if (now - this.lastTimeWarnTime > interval) {
          this.lastTimeWarnTime = now;
          this.engineSounds.playTimeWarning();
        }
      }
      this.game.events.emit(GAME_EVENTS.TIMER_UPDATE, this.timeRemaining);
    }
  }

  private handleInteraction(_groomer: Phaser.GameObjects.GameObject, interactableObj: Phaser.GameObjects.GameObject): void {
    const interactable = interactableObj as Phaser.Physics.Arcade.Sprite & { interactionType: string };
    // Use groomer position for feedback (where player is looking)
    const feedbackX = this.groomer.x;
    const feedbackY = this.groomer.y;
    
    if (interactable.interactionType === 'fuel') {
      if (this.fuel < 100) {
        this.fuel = Math.min(100, this.fuel + BALANCE.FUEL_REFILL_RATE);
        const now = Date.now();
        if (now - this.lastRefuelSoundTime > 2000) {
          this.lastRefuelSoundTime = now;
          this.engineSounds.playFuelRefill();
        }
        this.showInteractionFeedback(feedbackX, feedbackY, '🛢️', 0x44aaff, 28);
      }
    } else if (interactable.interactionType === 'food') {
      // Chez Marie — auto-select the best dish based on current situation
      this.frostLevel = 0; // Coming in from the cold
      const activeBuff = Object.keys(this.buffs).find(b => this.buffs[b] > 0);
      if (!activeBuff) {
        // No active buff — serve a new dish
        const dish = this.selectFoodBuff();
        const food = FOOD_ITEMS[dish];
        this.stamina = 100;
        // Clear any previous buffs, apply new one
        for (const b in this.buffs) delete this.buffs[b];
        if (food.buff) {
          this.buffs[food.buff] = food.buffDuration;
        }
        const now = Date.now();
        if (now - this.lastRestaurantSoundTime > 2000) {
          this.lastRestaurantSoundTime = now;
          this.engineSounds.playRestaurant();
        }
        Accessibility.announce(t('marieWelcome'));
        this.showInteractionFeedback(feedbackX, feedbackY, food.icon + ' ' + dish + '!', food.color, 32, true);
      } else if (this.stamina < 100) {
        // Already have a buff — just top up stamina
        this.stamina = Math.min(100, this.stamina + BALANCE.FOOD_STAMINA_REFILL_RATE);
        const now = Date.now();
        if (now - this.lastRefuelSoundTime > 2000) {
          this.lastRefuelSoundTime = now;
          this.engineSounds.playFuelRefill();
        }
        this.showInteractionFeedback(feedbackX, feedbackY, '🧀', 0xffdd44, 24);
      }
    }
  }

  /** Auto-select the best dish based on current game state */
  private selectFoodBuff(): string {
    return selectFoodBuff({
      isNight: !!this.level.isNight,
      weather: this.level.weather || 'clear',
      timeRemaining: this.timeRemaining,
      timeLimit: this.level.timeLimit,
      coverage: this.getCoverage(),
      activeBuffs: this.buffs,
    });
  }

  private lastFeedbackTime = 0;
  private lastBumpTime = 0;
  private lastRefuelSoundTime = 0;
  private lastRestaurantSoundTime = 0;

  private onObstacleHit(): void {
    const now = Date.now();
    if (now - this.lastBumpTime < 300) return; // Throttle
    this.lastBumpTime = now;
    this.engineSounds.playObstacleBump();
  }

  private showInteractionFeedback(x: number, y: number, text: string, color: number, fontSize = 24, forceShow = false): void {
    const now = Date.now();
    // Throttle feedback to avoid spam (except for forceShow)
    if (!forceShow && now - this.lastFeedbackTime < BALANCE.FEEDBACK_THROTTLE) return;
    this.lastFeedbackTime = now;

    const feedback = this.add.text(x, y - 30, text, {
      fontSize: fontSize + 'px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.FEEDBACK);

    this.tweens.add({
      targets: feedback,
      y: y - 70,
      alpha: 0,
      duration: BALANCE.FEEDBACK_FADE_DURATION,
      ease: 'Power2',
      onComplete: () => feedback.destroy(),
    });
  }

  getCoverage(): number {
    return Math.round((this.groomedCount / this.totalTiles) * 100);
  }

  /** Average grooming quality (0–100%) across all groomed tiles */
  getAverageGroomQuality(): number {
    if (this.groomedCount === 0) return 0;
    return Math.round((this.groomQualitySum / this.groomedCount) * 100);
  }

  /** Expose for tests */
  get headlightDirection(): { x: number; y: number } {
    return this.weatherSystem?.headlight ?? { x: 0, y: -1 };
  }

  /** Expose for tests */
  get nightOverlay(): boolean | null {
    return this.weatherSystem?.hasNightOverlay ? true : null;
  }

  private checkTutorialProgress(): void {
    if (!this.level.isTutorial || !this.level.tutorialSteps || this.tutorialSkipped || this.tutorialSkipPending) return;

    const step = this.level.tutorialSteps[this.tutorialStep];
    if (!step || this.tutorialTriggered[step.trigger]) return;

    let shouldTrigger = false;
    const coverage = this.getCoverage();

    switch (step.trigger) {
      case 'start':
        shouldTrigger = true;
        break;
      case 'welcomeDone':
      case 'controlsDone':
      case 'groomIntroDone':
      case 'hudDone':
        shouldTrigger = true;
        break;
      case 'moved':
        shouldTrigger = this.hasMoved;
        break;
      case 'groomed':
        shouldTrigger = this.hasGroomed;
        break;
      case 'coverage20':
        shouldTrigger = coverage >= 20;
        break;
      case 'coverage40':
        shouldTrigger = coverage >= 40;
        break;
      case 'complete':
        shouldTrigger = coverage >= this.level.targetCoverage;
        break;
    }

    if (shouldTrigger) {
      this.tutorialTriggered[step.trigger] = true;
      this.tutorialStep++;
      const delay = step.delay || 300;
      this.time.delayedCall(delay, () => {
        this.showDialogue(step.dialogue, this.level.introSpeaker);
      });
    }
  }

  private checkWinCondition(): void {
    if (this.getCoverage() >= this.level.targetCoverage) {
      this.triggerVictory();
    }
  }

  /** Hide objects outside camera view to reduce Canvas draw calls. */
  private cullOffscreen(): void {
    const cam = this.cameras.main;
    const margin = this.tileSize * 3; // Slightly larger margin for trees (taller than 1 tile)
    const left = cam.worldView.x - margin;
    const right = cam.worldView.right + margin;
    const top = cam.worldView.y - margin;
    const bottom = cam.worldView.bottom + margin;

    // Only recalculate when camera moves enough (1 tile)
    const b = this.lastCullBounds;
    if (Math.abs(left - b.x) < this.tileSize && Math.abs(top - b.y) < this.tileSize &&
        Math.abs(right - b.x - b.w) < this.tileSize && Math.abs(bottom - b.y - b.h) < this.tileSize) {
      return;
    }
    this.lastCullBounds = { x: left, y: top, w: right - left, h: bottom - top };

    // Cull all static Images (trees, rocks, tracks) by world position
    const children = this.children.list;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c.type === 'Image' && (c as Phaser.GameObjects.Image).scrollFactorX === 1) {
        const img = c as Phaser.GameObjects.Image;
        const d = img.depth;
        // Only cull objects at terrain/forest/tree depths (not UI, overlays, player)
        if (d <= DEPTHS.MARKERS) {
          // Use display bounds so large DynamicTexture backgrounds aren't culled by center point
          const hw = img.displayWidth * img.originX;
          const hh = img.displayHeight * img.originY;
          img.visible = img.x + hw > left && img.x - hw < right &&
                        img.y + hh > top && img.y - hh < bottom;
        }
      }
    }
  }

  private triggerVictory(): void {
    if (this.isGameOver || this.isTransitioning) return;
    this.isTransitioning = true; // Prevent further updates, but don't block gameOver

    // Stop groomer movement
    this.groomer.setVelocity(0, 0);

    // Celebratory camera flash
    this.cameras.main.flash(BALANCE.VICTORY_FLASH_DURATION, 255, 255, 255, false);

    // Brief camera zoom on groomer
    if (!Accessibility.settings.reducedMotion) {
      this.cameras.main.zoomTo(BALANCE.VICTORY_ZOOM, BALANCE.VICTORY_ZOOM_DURATION, 'Power2');
    }

    // Show victory message
    const victoryText = this.add.text(
      this.cameras.main.scrollX + this.cameras.main.width / 2,
      this.cameras.main.scrollY + this.cameras.main.height / 2 - 50,
      '✅ ' + (t('levelComplete') || 'Level Complete!'),
      {
        fontFamily: 'Courier New',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#00FF00',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setDepth(DEPTHS.VICTORY);

    // Fade in text
    victoryText.setAlpha(0);
    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // Delay before transitioning to level complete screen
    this.time.delayedCall(BALANCE.VICTORY_DELAY, () => {
      this.gameOver(true);
    });
  }

  private showDialogue(key: string, speaker?: string): void {
    // Check for gamepad first, then touch, then default
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    const hasTouch = detectTouch();
    const isTouchOnly = isMobile() && hasTouch && !hasGamepad;
    
    let dialogueKey = key;
    
    if (hasGamepad) {
      // Check if gamepad-specific version exists
      const gamepadKey = key + 'Gamepad';
      if (t(gamepadKey) !== gamepadKey) {
        dialogueKey = gamepadKey;
      }
    } else if (isTouchOnly) {
      // Check if touch-specific version exists
      const touchKey = key + 'Touch';
      if (t(touchKey) !== touchKey) {
        dialogueKey = touchKey;
      }
    }
    
    const dlg = this.scene.get('DialogueScene') as DialogueScene | null;
    if (dlg?.showDialogue) {
      dlg.showDialogue(dialogueKey, speaker);
      // Immediately duck engine/ambience so first voice blips are audible
      // (the update loop also manages this, but may lag a few frames)
      if (!this.dialogueDucked) {
        this.dialogueDucked = true;
        this.ambienceSounds.setDuck(0.2);
        this.engineSounds.setDuck(0.3);
      }
    }
  }

  pauseGame(): void {
    if (!this.scene.manager || !this.scene.isActive()) return;
    this.engineSounds.pause();
    this.ambienceSounds.pause();
    // Music keeps playing through pause/settings
    this.scene.pause();
    this.scene.launch('PauseScene', { levelIndex: this.levelIndex });
    this.scene.bringToTop('PauseScene');
  }

  resumeGame(): void {
    if (!this.scene.manager) return;
    if (!this.scene.isActive() && !this.scene.isPaused()) return;
    // Reload sensitivity in case it was changed in Settings
    const saved = getString(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
    const val = saved ? parseFloat(saved) : BALANCE.SENSITIVITY_DEFAULT;
    this.movementSensitivity = (isNaN(val) || val < BALANCE.SENSITIVITY_MIN || val > BALANCE.SENSITIVITY_MAX) ? BALANCE.SENSITIVITY_DEFAULT : val;
    this.engineSounds.resume();
    this.ambienceSounds.resume(this.level.weather || 'clear', !!this.level.isNight);
    this.scene.resume();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.cameras?.main || !this.level) return;

    const width = gameSize.width;
    const height = gameSize.height;
    
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    // Scale so world appears similarly sized regardless of orientation.
    // Use diagonal ratio — orientation-independent measure of viewport size.
    // Cap at 1.0: larger viewports show more world, not bigger pixels.
    const origDiag = Math.sqrt(this.originalScreenWidth ** 2 + this.originalScreenHeight ** 2);
    const newDiag = Math.sqrt(width ** 2 + height ** 2);
    const zoom = Math.max(0.5, Math.min(newDiag / origDiag, 1.0));

    // Resize screen-space overlays before camera branch
    this.weatherSystem.handleFrostResize();

    // Force culling recalc after camera changes
    this.lastCullBounds = { x: 0, y: 0, w: 0, h: 0 };
    
    // If world fits in viewport at this zoom, use static camera —
    // but account for touch controls reducing visible area in portrait.
    const aspect = width / height;
    const touchActive = this.touchControlsHeight > 0 && aspect <= BALANCE.TOUCH_CONTROLS_WIDE_ASPECT_THRESHOLD;
    const effectiveHeight = touchActive ? height - this.touchControlsHeight : height;
    if (worldWidth * zoom <= width && worldHeight * zoom + BALANCE.CAMERA_MIN_OFFSET_Y <= effectiveHeight) {
      this.cameras.main.setZoom(zoom);
      this.cameras.main.stopFollow();
      this.cameras.main.removeBounds();
      const offsetX = Math.max(0, (width - worldWidth * zoom) / 2);
      const minOffsetY = touchActive ? 0 : BALANCE.CAMERA_MIN_OFFSET_Y;
      const offsetY = Math.max(minOffsetY, (effectiveHeight - worldHeight * zoom) / 2);
      // Convert screen-space offset to camera-local (divide by zoom)
      this.cameras.main.setScroll(-offsetX / zoom, -offsetY / zoom);
      // Night overlay needs zoom to compute draw-space coverage
      this.weatherSystem.handleNightResize();
      return;
    }
    
    // World doesn't fit — follow groomer with bounds
    this.cameras.main.setZoom(zoom);
    
    if (this.groomer) {
      this.cameras.main.startFollow(this.groomer, true, BALANCE.CAMERA_LERP, BALANCE.CAMERA_LERP);
    }
    // Recalculate touch offset for new zoom/screen size before applying
    this.recalcTouchFollowOffset();
    if (this.groomer) {
      this.cameras.main.centerOn(this.groomer.x, this.groomer.y);
    }
    this.weatherSystem.handleNightResize();
  }

  /** Camera follow offset to keep groomer above touch controls (world-space) */
  private touchFollowOffsetY = 0;
  /** Height of touch controls area (screen px from bottom), cached for recalc on resize. */
  private touchControlsHeight = 0;

  /** Update camera bounds to include extra room for the touch follow offset */
  private updateCameraBoundsForOffset(): void {
    const cam = this.cameras.main;
    if (!cam || !(cam as any)._follow) return;
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;
    const zoom = cam.zoom || 1;
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const scaledWorldW = worldWidth * zoom;
    const scaledWorldH = worldHeight * zoom;
    const offsetX = Math.max(0, (screenW - scaledWorldW) / 2) / zoom;
    const offsetY = Math.max(BALANCE.CAMERA_MIN_OFFSET_Y, (screenH - scaledWorldH) / 2) / zoom;
    // Extend bounds downward by the follow offset so camera can scroll past world bottom
    const extraBottom = Math.abs(this.touchFollowOffsetY);
    cam.setBounds(
      -offsetX,
      -offsetY,
      worldWidth + offsetX * 2,
      worldHeight + offsetY * 2 + extraBottom
    );
  }

  private onTouchControlsTop(topEdge: number): void {
    const screenH = this.scale.height;
    this.touchControlsHeight = screenH - topEdge;
    this.recalcTouchFollowOffset();
  }

  /** Recalculate camera follow offset for touch controls using cached height. */
  private recalcTouchFollowOffset(): void {
    const cam = this.cameras.main;
    if (!cam || !this.touchControlsHeight) {
      return;
    }

    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const aspect = screenW / screenH;

    // Static camera (no follow) — check if world fits in visible area above controls
    if (!(cam as any)._follow) {
      if (!this.level) return;
      const worldWidth = this.level.width * this.tileSize;
      const worldHeight = this.level.height * this.tileSize;
      const zoom = cam.zoom || 1;
      const touchNarrow = aspect <= BALANCE.TOUCH_CONTROLS_WIDE_ASPECT_THRESHOLD;
      const effectiveHeight = touchNarrow ? screenH - this.touchControlsHeight : screenH;

      // Switch to follow if world barely fits — need at least MIN_OFFSET_Y margin
      const slack = effectiveHeight - worldHeight * zoom;
      if (slack < BALANCE.CAMERA_MIN_OFFSET_Y) {
        // World doesn't fit above controls — switch to follow mode
        if (this.groomer) {
          cam.startFollow(this.groomer, true, BALANCE.CAMERA_LERP, BALANCE.CAMERA_LERP);
          this.touchFollowOffsetY = -(this.touchControlsHeight / 2) / zoom;
          cam.setFollowOffset(0, this.touchFollowOffsetY);
          this.updateCameraBoundsForOffset();
          cam.centerOn(this.groomer.x, this.groomer.y);
        }
        return;
      }

      // World fits — re-center in visible area
      const offsetX = Math.max(0, (screenW - worldWidth * zoom) / 2);
      // When touch controls reduce visible area, don't enforce min offset — it would push world into controls
      const minOffsetY = touchNarrow ? 0 : BALANCE.CAMERA_MIN_OFFSET_Y;
      const offsetY = Math.max(minOffsetY, (effectiveHeight - worldHeight * zoom) / 2);
      cam.setScroll(-offsetX / zoom, -offsetY / zoom);
      return;
    }

    // On wide aspect ratios (tablets, landscape), the joystick and buttons
    // sit in the bottom corners and don't overlap the centered play area.
    if (aspect > BALANCE.TOUCH_CONTROLS_WIDE_ASPECT_THRESHOLD) {
      this.touchFollowOffsetY = 0;
      cam.setFollowOffset(0, 0);
      this.updateCameraBoundsForOffset();
      return;
    }

    // Narrow/portrait: shift camera so groomer clears the touch controls
    const zoom = cam.zoom || 1;
    this.touchFollowOffsetY = -(this.touchControlsHeight / 2) / zoom;
    cam.setFollowOffset(0, this.touchFollowOffsetY);
    this.updateCameraBoundsForOffset();
  }

  private buildGameStatePayload(): GameStateEvent {
    // Find the active buff with the most remaining time
    let activeBuff: string | null = null;
    let buffTimeRemaining = 0;
    let buffIcon = '';
    for (const b in this.buffs) {
      if (this.buffs[b] > buffTimeRemaining) {
        activeBuff = b;
        buffTimeRemaining = this.buffs[b];
        // Find matching food item icon
        for (const key in FOOD_ITEMS) {
          if (FOOD_ITEMS[key].buff === b) { buffIcon = FOOD_ITEMS[key].icon; break; }
        }
      }
    }
    return {
      fuel: this.fuel,
      stamina: this.stamina,
      coverage: this.getCoverage(),
      winchActive: this.winchSystem?.active ?? false,
      levelIndex: this.levelIndex,
      activeBuff,
      buffTimeRemaining,
      buffIcon,
      frostLevel: this.frostLevel,
      tumbleCount: this.tumbleCount,
      fuelUsed: Math.round(this.fuelUsed),
      winchUseCount: this.winchSystem?.useCount ?? 0,
      pathsVisited: this.accessPathsVisited.size,
      totalPaths: (this.level.accessPaths || []).length,
      restartCount: this.restartCount,
    };
  }

  gameOver(won: boolean, failReason: string | null = null): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (won && this.level.isTutorial) {
      setString(STORAGE_KEYS.TUTORIAL_DONE, '1');
    }

    // Stop gameplay sounds immediately — scene may linger without shutdown()
    this.engineSounds.stop();
    this.ambienceSounds.stop();
    // Music keeps playing through level complete screen

    // Save groomed tile state for optional ski run
    if (won) {
      const tiles = new Set<string>();
      for (let y = 0; y < this.level.height; y++) {
        for (let x = 0; x < this.level.width; x++) {
          const cell = this.snowGrid[y]?.[x];
          if (cell?.groomable && cell.groomed) tiles.add(`${x},${y}`);
        }
      }
      setGroomedTiles(tiles);
    }

    const timeUsed = this.level.timeLimit - this.timeRemaining;
    console.log(`[level-complete] ${this.level.nameKey} ${won ? 'WON' : 'FAIL'} — time: ${timeUsed}s / ${this.level.timeLimit}s, coverage: ${this.getCoverage()}%, quality: ${this.getAverageGroomQuality()}%`);

    // Emit final game state so HUD has correct values before stopping
    this.game.events.emit(GAME_EVENTS.GAME_STATE, this.buildGameStatePayload());

    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');

    this.scene.start('LevelCompleteScene', {
      won: won,
      level: this.levelIndex,
      coverage: this.getCoverage(),
      groomQuality: this.getAverageGroomQuality(),
      timeUsed: timeUsed,
      failReason: failReason,
      fuelUsed: Math.round(this.fuelUsed),
      tumbleCount: this.tumbleCount,
      winchUseCount: this.winchSystem.useCount,
      pathsVisited: this.accessPathsVisited.size,
      totalPaths: (this.level.accessPaths || []).length,
      restartCount: this.restartCount,
    });
  }

  transitionToLevel(nextLevel: number): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isGameOver = true;

    saveProgress(nextLevel);

    // Capture game ref — resetGameScenes defers all stops to next tick
    // so it's safe even when called from within another scene's update()
    resetGameScenes(this.game, 'GameScene', { level: nextLevel });
  }

  returnToMenu(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isGameOver = true;

    resetGameScenes(this.game, 'MenuScene');
  }

  /** Dev shortcut: auto-groom to target coverage, save state, launch ski run */
  private startSkiRun(): void {
    if (this.isTransitioning || this.isGameOver) return;
    this.isTransitioning = true;
    this.isGameOver = true;

    // Groom per-row: each row gets uniform coverage, biased toward center
    const targetRatio = this.level.targetCoverage / 100;
    for (let y = 0; y < this.level.height; y++) {
      const rowTiles: { x: number; y: number }[] = [];
      for (let x = 0; x < this.level.width; x++) {
        const cell = this.snowGrid[y]?.[x];
        if (cell?.groomable && !cell.groomed) rowTiles.push({ x, y });
      }
      if (rowTiles.length === 0) continue;
      const path = this.geometry.pistePath[y];
      // Sort by distance from center with random jitter for organic feel
      rowTiles.sort((a, b) => {
        const distA = path ? Math.abs(a.x - path.centerX) / (path.width / 2) : 1;
        const distB = path ? Math.abs(b.x - path.centerX) / (path.width / 2) : 1;
        return (distA + Math.random() * 0.8) - (distB + Math.random() * 0.8);
      });
      const rowTotal = rowTiles.length;
      const alreadyGroomed = this.snowGrid[y]
        .filter((c: SnowCell) => c.groomable && c.groomed).length;
      const rowGroomable = rowTotal + alreadyGroomed;
      const toGroom = Math.max(0, Math.ceil(rowGroomable * targetRatio) - alreadyGroomed);
      for (let i = 0; i < Math.min(toGroom, rowTiles.length); i++) {
        const { x } = rowTiles[i];
        const cell = this.snowGrid[y][x];
        cell.groomed = true;
        this.stampPisteTile('snow_groomed', x, y);
        this.groomedCount++;
      }
    }

    // Save groomed state and transition
    const tiles = new Set<string>();
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        const cell = this.snowGrid[y]?.[x];
        if (cell?.groomable && cell.groomed) tiles.add(`${x},${y}`);
      }
    }
    setGroomedTiles(tiles);

    this.engineSounds.stop();
    this.ambienceSounds.stop();
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');

    resetGameScenes(this.game, 'SkiRunScene', { level: this.levelIndex });
  }

  shutdown(): void {

    this.game.events.off(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.game.events.off(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.off(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.off(GAME_EVENTS.SKIP_LEVEL, this.boundSkipHandler);
    this.game.events.off(GAME_EVENTS.START_SKI_RUN, this.boundSkiRunHandler);
    this.game.events.off(GAME_EVENTS.SHOW_DIALOGUE, this.boundShowDialogueHandler);
    this.game.events.off(GAME_EVENTS.HAZARD_GAME_OVER, this.boundHazardGameOverHandler);
    this.game.events.off(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsTop, this);
    this.game.events.off(GAME_EVENTS.DIALOGUE_DISMISSED);

    this.scale.off('resize', this.handleResize, this);
    this.input.gamepad?.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();

    this.tweens.killAll();
    this.time.removeAllEvents();

    this.weatherSystem.reset();
    this.hazardSystem.destroy();
    this.wildlifeSystem.reset();
    this.winchSystem.reset();
    this.obstacleBuilder.reset();
    this.parkFeatures.destroy();
    this.geometry.reset();
    this.engineSounds.stop();
    this.ambienceSounds.stop();
    // Music persists across scene transitions (singleton)
    this.buildingRects = [];
    this.buffs = {};
    this.frostLevel = 0;
    this.frostRate = 0;

    delete (window as unknown as Record<string, unknown>).__perfStats;

    this.children.removeAll(true);
  }
}
