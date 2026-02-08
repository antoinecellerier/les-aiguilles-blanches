import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, Level } from '../setup';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { STORAGE_KEYS, BINDINGS_VERSION } from '../config/storageKeys';
import { saveProgress } from '../utils/gameProgress';
import { isConfirmPressed, isGamepadButtonPressed, captureGamepadButtons, getMappingFromGamepad, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { GAME_EVENTS, type TouchInputEvent } from '../types/GameSceneInterface';
import { WeatherSystem } from '../systems/WeatherSystem';
import { HazardSystem } from '../systems/HazardSystem';
import { WildlifeSystem, type ObstacleRect } from '../systems/WildlifeSystem';
import { LevelGeometry, type PistePath } from '../systems/LevelGeometry';
import { PisteRenderer } from '../systems/PisteRenderer';
import { WinchSystem } from '../systems/WinchSystem';
import { ObstacleBuilder } from '../systems/ObstacleBuilder';
import DialogueScene from './DialogueScene';

/**
 * Les Aiguilles Blanches - Game Scene
 * Main gameplay scene with grooming mechanics
 */

interface GameSceneData {
  level?: number;
}

interface SnowCell {
  tile: Phaser.GameObjects.Image;
  groomed: boolean;
  groomable: boolean;
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

  // Stats tracking for bonus objectives
  private fuelUsed = 0;
  private tumbleCount = 0;
  private accessPathsVisited = new Set<number>();

  // Tutorial
  private tutorialStep = 0;
  private tutorialTriggered: TutorialTriggered = {};
  private hasMoved = false;
  private hasGroomed = false;

  // Game objects
  private groomer!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private interactables!: Phaser.Physics.Arcade.StaticGroup;
  private boundaryWalls!: Phaser.Physics.Arcade.StaticGroup;
  private dangerZones!: Phaser.Physics.Arcade.StaticGroup;
  private snowGrid: SnowCell[][] = [];
  private snowTiles!: Phaser.GameObjects.Group;
  private groomedCount = 0;
  private groomableTiles = 0;
  private totalTiles = 0;

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
  private buildingRects: ObstacleRect[] = [];

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


  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    console.log('GameScene.init:', data);
    this.levelIndex = data.level || 0;
    this.level = LEVELS[this.levelIndex];
    console.log('GameScene.init: loaded level', this.levelIndex, this.level?.nameKey);

    if (!this.level) {
      console.error('GameScene.init: LEVEL NOT FOUND!', this.levelIndex, 'LEVELS.length:', LEVELS.length);
    }

    // Reset all state
    this.isGameOver = false;
    this.isTransitioning = false;
    this.isTumbling = false;
    this.isFallingOffCliff = false;
    this.steepWarningShown = false;

    // Load movement sensitivity from settings
    const savedSensitivity = localStorage.getItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
    this.movementSensitivity = savedSensitivity ? parseFloat(savedSensitivity) : BALANCE.SENSITIVITY_DEFAULT;
    if (isNaN(this.movementSensitivity) || this.movementSensitivity < BALANCE.SENSITIVITY_MIN || this.movementSensitivity > BALANCE.SENSITIVITY_MAX) {
      this.movementSensitivity = BALANCE.SENSITIVITY_DEFAULT;
    }
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
  }

  private createLevel(): void {
    console.log('GameScene.createLevel starting for level', this.levelIndex);
    const { width: screenWidth, height: screenHeight } = this.cameras.main;

    const { worldWidth, worldHeight } = this.initWorldDimensions(screenWidth, screenHeight);
    this.createTerrain(screenWidth, screenHeight, worldWidth, worldHeight);

    // Create groomer
    this.createGroomer();
    console.log('Groomer created, setting up camera...');

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
    console.log('Camera set up, initializing game state...');

    this.initGameState();
    this.setupLevelSystems();
    this.setupInputAndScenes();
    this.setupEffectsAndWildlife(worldWidth, worldHeight);

    // Handle window resize - keep camera bounds updated and groomer visible
    this.scale.on('resize', this.handleResize, this);

    console.log('GameScene.createLevel complete!');
    // Pause on ESC (but not while dialogue is showing — ESC dismisses dialogue first)
    this.input.keyboard?.on('keydown-ESC', () => {
      const dlg = this.scene.get('DialogueScene') as DialogueScene;
      if (dlg?.isDialogueShowing()) return;
      this.pauseGame();
    });

    Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));
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
    console.log('Tile size:', this.tileSize, 'level size:', this.level.width, 'x', this.level.height);

    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    this.worldOffsetX = Math.max(0, (screenWidth - worldWidth) / 2);
    this.worldOffsetY = Math.max(marginY / 2, (screenHeight - worldHeight) / 2);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    console.log('World bounds set');

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
    console.log('Creating snow grid...');
    this.createSnowGrid();
    console.log('Snow grid created');

    this.pisteRenderer = new PisteRenderer(this, this.geometry);

    const { boundaryWalls, dangerZones } = this.pisteRenderer.createBoundaryColliders(this.level, this.tileSize);
    this.boundaryWalls = boundaryWalls;
    this.dangerZones = dangerZones;

    this.pisteRenderer.createExtendedBackground(
      screenWidth, screenHeight, worldWidth, worldHeight,
      this.worldOffsetX, this.worldOffsetY, this.level, this.tileSize
    );

    this.pisteRenderer.createPisteBoundaries(this.level, this.tileSize, worldWidth);
    console.log('Piste boundaries created, creating obstacles...');

    this.obstacles = this.physics.add.staticGroup();
    this.interactables = this.physics.add.staticGroup();
    this.obstacleBuilder = new ObstacleBuilder(this, this.geometry);
    this.obstacleBuilder.create(this.level, this.tileSize, this.obstacles, this.interactables);
    this.buildingRects = this.obstacleBuilder.buildingRects;
    console.log('Obstacles created, creating groomer...');
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
    this.hasMoved = false;
    this.hasGroomed = false;
    console.log('State initialized, creating winch/avalanche if needed...');
  }

  private setupLevelSystems(): void {
    if (this.level.hasWinch) {
      this.winchSystem.createAnchors(this.level, this.tileSize);
      console.log('Winch anchors created');
    }

    if (this.level.hazards && this.level.hazards.includes('avalanche')) {
      this.hazardSystem.createAvalancheZones(
        this.level,
        this.tileSize,
        this.groomer,
        () => this.isGameOver,
        () => this.isGrooming,
        (key: string) => this.showDialogue(key),
        (won: boolean, reason: string) => this.gameOver(won, reason),
        this.geometry.accessPathRects,
        this.winchSystem.anchors?.map(a => ({ x: a.x, y: a.baseY }))
      );
      console.log('Avalanche zones created');
    }
  }

  private setupInputAndScenes(): void {
    console.log('Setting up input...');
    this.setupInput();
    console.log('Input set up, registering event listeners...');

    // Cross-scene event listeners (use bound handlers for clean removal)
    // IMPORTANT: Register BEFORE launching HUDScene to avoid race condition
    // where HUDScene.create() emits events before we're listening
    this.game.events.on(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.game.events.on(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.on(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.on(GAME_EVENTS.SKIP_LEVEL, this.boundSkipHandler);
    this.game.events.on(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsTop, this);
    
    console.log('Launching HUD scene...');
    
    this.scene.launch('DialogueScene');
    console.log('Dialogue launched');

    this.scene.launch('HUDScene', {
      level: this.level,
    });
    this.scene.bringToTop('HUDScene');
    console.log('HUD launched on top');

    if (this.level.introDialogue) {
      this.time.delayedCall(500, () => {
        this.showDialogue(this.level.introDialogue!, this.level.introSpeaker);
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

    this.weatherSystem.applyAccessibilitySettings();

    if (this.level.wildlife && this.level.wildlife.length > 0) {
      const midPath = this.geometry.pistePath[Math.floor(this.level.height / 2)];
      const pisteLeft = midPath ? (midPath.centerX - midPath.width / 2) * this.tileSize : worldWidth * 0.3;
      const pisteRight = midPath ? (midPath.centerX + midPath.width / 2) * this.tileSize : worldWidth * 0.7;
      this.wildlifeSystem.spawn(this.level.wildlife, worldWidth, worldHeight, pisteLeft, pisteRight, this.geometry.accessPathRects);
      this.wildlifeSystem.setObstacles(
        (px, py) => this.geometry.isOnCliff(px, py),
        this.buildingRects,
      );
      this.wildlifeSystem.bootstrapTracks();
    }
  }


  private createSnowGrid(): void {
    this.snowTiles = this.add.group();
    const tileSize = this.tileSize;

    // Generate all geometry (piste path, access zones, cliffs)
    this.geometry.generate(this.level, tileSize);

    this.groomableTiles = 0;

    for (let y = 0; y < this.level.height; y++) {
      this.snowGrid[y] = [];
      for (let x = 0; x < this.level.width; x++) {
        const isGroomable = this.geometry.isInPiste(x, y, this.level);

        const tile = this.add.image(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          isGroomable ? 'snow_ungroomed' : 'snow_offpiste'
        );
        tile.setDisplaySize(tileSize, tileSize);
        if (isGroomable) tile.setDepth(DEPTHS.PISTE);

        this.snowGrid[y][x] = {
          tile: tile,
          groomed: !isGroomable,
          groomable: isGroomable
        };

        if (isGroomable) {
          this.groomableTiles++;
        }

        this.snowTiles.add(tile);
      }
    }

    this.totalTiles = this.groomableTiles;
  }




  private createGroomer(): void {
    const bottomYIndex = Math.min(this.level.height - 8, Math.floor(this.level.height * 0.9));
    const bottomPath = this.geometry.pistePath[bottomYIndex] || { centerX: this.level.width / 2 };
    const startX = bottomPath.centerX * this.tileSize;
    const startY = bottomYIndex * this.tileSize;

    console.log('Groomer spawn:', {
      startX, startY, bottomYIndex,
      pathCenter: bottomPath.centerX, pathWidth: (bottomPath as PistePath).width,
      levelWidth: this.level.width, tileSize: this.tileSize
    });

    this.groomer = this.physics.add.sprite(startX, startY, 'groomer');
    this.groomer.setCollideWorldBounds(true);
    this.groomer.setDrag(BALANCE.GROOMER_DRAG);
    this.groomer.setScale(this.tileSize / 16);
    this.groomer.setDepth(DEPTHS.PLAYER); // Above night overlay

    this.physics.add.collider(this.groomer, this.obstacles);
    this.physics.add.collider(this.groomer, this.boundaryWalls);

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

    this.winchSystem.detach();

    this.showDialogue('cliffFall');
    this.time.delayedCall(BALANCE.CLIFF_FALL_DELAY, () => {
      this.gameOver(false, 'cliff');
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
    const savedVersion = localStorage.getItem(STORAGE_KEYS.BINDINGS_VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.BINDINGS);
    
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
      this.winchSystem.update(isWinchPressed, this.groomer.x, this.groomer.y, this.tileSize, this.level.height);
    }
    this.checkSteepness();
    this.checkCliffFall();
    this.updateResources(delta);
    this.checkTutorialProgress();
    this.checkWinCondition();
    
    // Update night overlay with headlight position
    if (this.level.isNight) {
      this.weatherSystem.updateNightOverlay(this.groomer);
    }

    // Update wildlife (flee from groomer)
    this.wildlifeSystem.update(this.groomer.x, this.groomer.y, delta);

    // Emit game state for HUD
    this.game.events.emit(GAME_EVENTS.GAME_STATE, {
      fuel: this.fuel,
      stamina: this.stamina,
      coverage: this.getCoverage(),
      winchActive: this.winchSystem.active,
      levelIndex: this.levelIndex,
    });
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

  private triggerTumble(_slope: number): void {
    if (this.isTumbling) return;
    this.isTumbling = true;
    this.tumbleCount++;

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
    // Don't handle movement while dialogue is showing
    const dialogueScene = this.scene.get('DialogueScene') as DialogueScene;
    if (dialogueScene && dialogueScene.isDialogueShowing()) {
      this.groomer.setVelocity(0, 0);
      return;
    }

    const speed = GAME_CONFIG.GROOMER_SPEED * this.movementSensitivity * (this.buffs.speed ? BALANCE.SPEED_BUFF_MULTIPLIER : 1);

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
    }

    this.groomer.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.groomer.rotation = Math.atan2(vy, vx) + Math.PI / 2;
      this.hasMoved = true;
    }
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
    const radius = Math.max(1, Math.floor(baseRadius * staminaFactor));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;

        if (tx >= 0 && tx < this.level.width &&
          ty >= 0 && ty < this.level.height) {
          const cell = this.snowGrid[ty][tx];
          if (cell.groomable && !cell.groomed) {
            cell.groomed = true;
            cell.tile.setTexture('snow_groomed');
            if (this.weatherSystem.isHighContrast) {
              cell.tile.setTint(0xAADDFF);
            } else {
              cell.tile.clearTint();
            }
            this.groomedCount++;
            this.hasGroomed = true;
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
      const fuelCost = GAME_CONFIG.FUEL_CONSUMPTION * dt * 100;
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
      
      this.stamina -= staminaDrain * dt * 100;
    }

    this.fuel = Phaser.Math.Clamp(this.fuel, 0, 100);
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, 100);

    for (const buff in this.buffs) {
      this.buffs[buff] -= dt * 1000;
      if (this.buffs[buff] <= 0) {
        delete this.buffs[buff];
      }
    }

    if (this.buffs.staminaRegen) {
      this.stamina = Math.min(100, this.stamina + BALANCE.STAMINA_REGEN_RATE);
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
        this.showInteractionFeedback(feedbackX, feedbackY, '🛢️', 0x44aaff, 28);
      }
    } else if (interactable.interactionType === 'food') {
      // Restore stamina and give regen buff when visiting Chez Marie
      if (!this.buffs.staminaRegen) {
        this.stamina = 100;
        this.buffs.staminaRegen = BALANCE.FOOD_BUFF_DURATION; // 60 second regen buff
        Accessibility.announce(t('marieWelcome'));
        this.showInteractionFeedback(feedbackX, feedbackY, '🧀 Reblochon!', 0xffdd44, 32, true);
      } else if (this.stamina < 100) {
        // If already have buff, just top up stamina
        this.stamina = Math.min(100, this.stamina + BALANCE.FOOD_STAMINA_REFILL_RATE);
        this.showInteractionFeedback(feedbackX, feedbackY, '🧀', 0xffdd44, 24);
      }
    }
  }

  private lastFeedbackTime = 0;
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

  /** Expose for tests */
  get headlightDirection(): { x: number; y: number } {
    return this.weatherSystem?.headlight ?? { x: 0, y: -1 };
  }

  /** Expose for tests */
  get nightOverlay(): boolean | null {
    return this.weatherSystem?.hasNightOverlay ? true : null;
  }

  private checkTutorialProgress(): void {
    if (!this.level.isTutorial || !this.level.tutorialSteps) return;

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
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const hasTouch = detectTouch();
    const isTouchOnly = isMobile && hasTouch && !hasGamepad;
    
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
    }
  }

  pauseGame(): void {
    if (!this.scene.manager || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('PauseScene', { levelIndex: this.levelIndex });
    this.scene.bringToTop('PauseScene');
  }

  resumeGame(): void {
    if (!this.scene.manager) return;
    if (!this.scene.isActive() && !this.scene.isPaused()) return;
    // Reload sensitivity in case it was changed in Settings
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
    const val = saved ? parseFloat(saved) : BALANCE.SENSITIVITY_DEFAULT;
    this.movementSensitivity = (isNaN(val) || val < BALANCE.SENSITIVITY_MIN || val > BALANCE.SENSITIVITY_MAX) ? BALANCE.SENSITIVITY_DEFAULT : val;
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
    const origDiag = Math.sqrt(this.originalScreenWidth ** 2 + this.originalScreenHeight ** 2);
    const newDiag = Math.sqrt(width ** 2 + height ** 2);
    const zoom = Math.max(0.5, Math.min(newDiag / origDiag, 1.5));
    
    // If world fits in viewport at this zoom, use static camera
    if (worldWidth * zoom <= width && worldHeight * zoom <= height) {
      this.cameras.main.setZoom(zoom);
      this.cameras.main.stopFollow();
      this.cameras.main.removeBounds();
      const offsetX = Math.max(0, (width - worldWidth * zoom) / 2);
      const offsetY = Math.max(BALANCE.CAMERA_MIN_OFFSET_Y, (height - worldHeight * zoom) / 2);
      // Convert screen-space offset to camera-local (divide by zoom)
      this.cameras.main.setScroll(-offsetX / zoom, -offsetY / zoom);
      return;
    }
    
    // World doesn't fit — follow groomer with bounds
    this.cameras.main.setZoom(zoom);
    
    if (this.groomer) {
      this.cameras.main.startFollow(this.groomer, true, BALANCE.CAMERA_LERP, BALANCE.CAMERA_LERP);
      this.cameras.main.setFollowOffset(0, this.touchFollowOffsetY);
    }
    this.updateCameraBoundsForOffset();
    if (this.groomer) {
      this.cameras.main.centerOn(this.groomer.x, this.groomer.y);
    }
  }

  /** Camera follow offset to keep groomer above touch controls (world-space) */
  private touchFollowOffsetY = 0;

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
    const cam = this.cameras.main;
    if (!cam) return;
    
    // Only apply offset if camera is following
    if (!(cam as any)._follow) return;
    
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const aspect = screenW / screenH;

    // On wide aspect ratios (tablets, landscape), the joystick and buttons
    // sit in the bottom corners and don't overlap the centered play area.
    if (aspect > BALANCE.TOUCH_CONTROLS_WIDE_ASPECT_THRESHOLD) {
      this.touchFollowOffsetY = 0;
      cam.setFollowOffset(0, 0);
      this.updateCameraBoundsForOffset();
      return;
    }

    // Narrow/portrait: shift camera so groomer clears the touch controls
    const controlsHeight = screenH - topEdge;
    const zoom = cam.zoom || 1;
    this.touchFollowOffsetY = -(controlsHeight / 2) / zoom;
    cam.setFollowOffset(0, this.touchFollowOffsetY);
    this.updateCameraBoundsForOffset();
  }

  gameOver(won: boolean, failReason: string | null = null): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Emit final game state so HUD has correct values before stopping
    this.game.events.emit(GAME_EVENTS.GAME_STATE, {
      fuel: this.fuel,
      stamina: this.stamina,
      coverage: this.getCoverage(),
      winchActive: this.winchSystem.active,
      levelIndex: this.levelIndex,
    });

    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');

    const totalPaths = (this.level.accessPaths || []).length;

    this.scene.start('LevelCompleteScene', {
      won: won,
      level: this.levelIndex,
      coverage: this.getCoverage(),
      timeUsed: this.level.timeLimit - this.timeRemaining,
      failReason: failReason,
      fuelUsed: Math.round(this.fuelUsed),
      tumbleCount: this.tumbleCount,
      winchUseCount: this.winchSystem.useCount,
      pathsVisited: this.accessPathsVisited.size,
      totalPaths: totalPaths,
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

  shutdown(): void {
    console.log('GameScene.shutdown');

    this.game.events.off(GAME_EVENTS.TOUCH_INPUT, this.boundTouchHandler);
    this.game.events.off(GAME_EVENTS.PAUSE_REQUEST, this.boundPauseHandler);
    this.game.events.off(GAME_EVENTS.RESUME_REQUEST, this.boundResumeHandler);
    this.game.events.off(GAME_EVENTS.SKIP_LEVEL, this.boundSkipHandler);
    this.game.events.off(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsTop, this);

    this.scale.off('resize', this.handleResize, this);
    this.input.gamepad?.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();

    this.tweens.killAll();
    this.time.removeAllEvents();

    this.weatherSystem.reset();
    this.hazardSystem.reset();
    this.wildlifeSystem.reset();
    this.winchSystem.reset();
    this.obstacleBuilder.reset();
    this.geometry.reset();
    this.buildingRects = [];

    this.children.removeAll(true);
  }
}
