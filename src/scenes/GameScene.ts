import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, Level } from '../setup';
import { BALANCE, DEPTHS, DIFFICULTY_MARKERS } from '../config/gameConfig';
import { THEME } from '../config/theme';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { STORAGE_KEYS } from '../config/storageKeys';
import { saveProgress } from '../utils/gameProgress';
import { isConfirmPressed, isGamepadButtonPressed, captureGamepadButtons, getMappingFromGamepad, loadGamepadBindings, type GamepadBindings } from '../utils/gamepad';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { GAME_EVENTS, type TouchInputEvent } from '../types/GameSceneInterface';
import { WeatherSystem } from '../systems/WeatherSystem';
import { HazardSystem } from '../systems/HazardSystem';
import { WildlifeSystem, type ObstacleRect } from '../systems/WildlifeSystem';
import DialogueScene from './DialogueScene';

/**
 * Les Aiguilles Blanches - Game Scene
 * Main gameplay scene with grooming mechanics
 */

interface GameSceneData {
  level?: number;
}

interface PistePath {
  centerX: number;
  width: number;
}

interface SnowCell {
  tile: Phaser.GameObjects.Image;
  groomed: boolean;
  groomable: boolean;
}

interface SteepZoneRect {
  startY: number;
  endY: number;
  leftX: number;
  rightX: number;
  slope: number;
}

interface AccessPathRect {
  startY: number;
  endY: number;
  leftX: number;
  rightX: number;
  side: 'left' | 'right';
  pathIndex: number;
}

interface AccessEntryZone {
  y: number;
  side: string;
  startY: number;
  endY: number;
}

interface WinchAnchor {
  x: number;
  y: number;      // Hook position (top) - for cable attachment
  baseY: number;  // Base position - for proximity detection
  number: number;
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
  private winchActive = false;
  private winchAnchor: WinchAnchor | null = null;
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
  private winchUseCount = 0;
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

  // Piste path
  private pistePath: PistePath[] = [];
  private steepZoneRects: SteepZoneRect[] = [];
  private accessPathRects: AccessPathRect[] = [];
  private accessEntryZones: AccessEntryZone[] = [];
  private accessPathCurves: { leftEdge: {x:number,y:number}[]; rightEdge: {x:number,y:number}[] }[] = [];
  
  // Cliff data - shared between physics and visuals for consistency
  private cliffSegments: {
    side: 'left' | 'right';
    startY: number;
    endY: number;
    offset: number;  // Distance from piste edge where cliff starts
    extent: number;  // Width of cliff
    getX: (y: number) => number;  // Piste edge position at Y
  }[] = [];

  // Winch
  private winchAnchors: WinchAnchor[] = [];
  private winchCableGraphics: Phaser.GameObjects.Graphics | null = null;

  // Avalanche
  private hazardSystem!: HazardSystem;

  // Weather & environment
  private weatherSystem!: WeatherSystem;
  private wildlifeSystem!: WildlifeSystem;
  private buildingRects: ObstacleRect[] = [];

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private groomKey!: Phaser.Input.Keyboard.Key;
  private winchKey!: Phaser.Input.Keyboard.Key;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

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
    this.winchActive = false;
    this.winchAnchor = null;
  }

  create(): void {
    try {
      this._createLevel();
    } catch (e) {
      console.error('GameScene create error:', e);
      console.error('Level:', this.levelIndex, this.level?.nameKey);
      if (e instanceof Error) {
        console.error('Stack:', e.stack);
      }
      throw e;
    }
  }

  private _createLevel(): void {
    console.log('GameScene._createLevel starting for level', this.levelIndex);
    const { width: screenWidth, height: screenHeight } = this.cameras.main;

    // Calculate tile size to fit level on screen with some margin
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

    // Calculate world size and center offset
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    // Center the world on screen
    this.worldOffsetX = Math.max(0, (screenWidth - worldWidth) / 2);
    this.worldOffsetY = Math.max(marginY / 2, (screenHeight - worldHeight) / 2);

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    console.log('World bounds set');

    // Sky background
    this.cameras.main.setBackgroundColor(
      this.level.isNight ? GAME_CONFIG.COLORS.SKY_NIGHT : GAME_CONFIG.COLORS.SKY_DAY
    );

    // Create snow grid (sets totalTiles based on groomable area, builds pistePath)
    this.snowGrid = [];
    this.groomedCount = 0;
    console.log('Creating snow grid...');
    this.createSnowGrid();
    console.log('Snow grid created');

    // Pre-calculate access path geometry so boundaries and background can avoid them
    this.calculateAccessPathGeometry();

    // Create boundary colliders after access path geometry is available
    this.createBoundaryColliders();

    // Create extended background to cover full visible window
    // Must be after snow grid + access path geometry so trees avoid roads
    this.createExtendedBackground(screenWidth, screenHeight, worldWidth, worldHeight);

    // Create piste boundaries (for visual definition)
    this.createPisteBoundaries(worldWidth, worldHeight);
    console.log('Piste boundaries created, creating obstacles...');

    // Create obstacles
    this.obstacles = this.physics.add.staticGroup();
    this.interactables = this.physics.add.staticGroup();
    this.createObstacles();
    console.log('Obstacles created, creating groomer...');

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

    // Game state
    this.fuel = 100;
    this.stamina = 100;
    this.timeRemaining = this.level.timeLimit;
    this.isGrooming = false;
    this.buffs = {};

    // Stats tracking
    this.fuelUsed = 0;
    this.tumbleCount = 0;
    this.winchUseCount = 0;
    this.accessPathsVisited = new Set<number>();

    // Winch state
    this.winchActive = false;
    this.winchCableGraphics = null;
    this.winchAnchor = null;

    // Night state
    this.weatherSystem = new WeatherSystem(this, this.tileSize);

    // Avalanche state
    this.hazardSystem = new HazardSystem(this);

    // Wildlife
    this.wildlifeSystem = new WildlifeSystem(this, this.tileSize);

    // Tutorial state
    this.tutorialStep = 0;
    this.tutorialTriggered = {};
    this.hasMoved = false;
    this.hasGroomed = false;
    console.log('State initialized, creating winch/avalanche if needed...');

    // Create winch anchor points for levels that have winch
    if (this.level.hasWinch) {
      this.createWinchAnchors();
      console.log('Winch anchors created');
    }

    // Create avalanche zones for levels with avalanche hazard
    if (this.level.hazards && this.level.hazards.includes('avalanche')) {
      this.hazardSystem.createAvalancheZones(
        this.level,
        this.tileSize,
        this.groomer,
        () => this.isGameOver,
        () => this.isGrooming,
        (key: string) => this.showDialogue(key),
        (won: boolean, reason: string) => this.gameOver(won, reason),
        this.accessPathRects,
        this.winchAnchors?.map(a => ({ x: a.x, y: a.baseY }))
      );
      console.log('Avalanche zones created');
    }

    // Input
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
    
    // Launch overlay scenes directly (no delayedCall — avoids race with rapid level transitions)
    this.scene.launch('DialogueScene');
    console.log('Dialogue launched');

    this.scene.launch('HUDScene', {
      level: this.level,
    });
    this.scene.bringToTop('HUDScene');
    console.log('HUD launched on top');

    // Show intro dialogue after a short delay to let scenes initialize
    if (this.level.introDialogue) {
      this.time.delayedCall(500, () => {
        this.showDialogue(this.level.introDialogue!, this.level.introSpeaker);
      });
    }

    // Timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });

    // Night overlay
    if (this.level.isNight) {
      this.weatherSystem.createNightOverlay();
      this.weatherSystem.updateNightOverlay(this.groomer);
    }

    // Weather effects
    if (this.level.weather !== 'clear') {
      this.weatherSystem.createWeatherEffects(this.level);
    }

    // Apply accessibility settings
    this.weatherSystem.applyAccessibilitySettings();

    // Spawn wildlife
    if (this.level.wildlife && this.level.wildlife.length > 0) {
      const worldW = this.level.width * this.tileSize;
      const worldH = this.level.height * this.tileSize;
      // Use mid-level piste path to estimate left/right edges
      const midPath = this.pistePath[Math.floor(this.level.height / 2)];
      const pisteLeft = midPath ? (midPath.centerX - midPath.width / 2) * this.tileSize : worldW * 0.3;
      const pisteRight = midPath ? (midPath.centerX + midPath.width / 2) * this.tileSize : worldW * 0.7;
      this.wildlifeSystem.spawn(this.level.wildlife, worldW, worldH, pisteLeft, pisteRight, this.accessPathRects);
      this.wildlifeSystem.setObstacles(
        (px, py) => this.isOnCliff(px, py),
        this.buildingRects,
      );
      this.wildlifeSystem.bootstrapTracks();
    }

    // Handle window resize - keep camera bounds updated and groomer visible
    this.scale.on('resize', this.handleResize, this);

    console.log('GameScene._createLevel complete!');
    // Pause on ESC (but not while dialogue is showing — ESC dismisses dialogue first)
    this.input.keyboard?.on('keydown-ESC', () => {
      const dlg = this.scene.get('DialogueScene') as DialogueScene;
      if (dlg?.isDialogueShowing()) return;
      this.pauseGame();
    });

    Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));
  }

  private createExtendedBackground(screenWidth: number, screenHeight: number, worldWidth: number, worldHeight: number): void {
    // Moderate oversizing to cover minor viewport changes (URL bar, orientation)
    // without creating thousands of unnecessary game objects on mobile
    const bgWidth = screenWidth * 1.3;
    const bgHeight = screenHeight * 1.3;
    const extraLeft = Math.max(this.worldOffsetX, (bgWidth - worldWidth) / 2);
    const extraTop = Math.max(this.worldOffsetY, (bgHeight - worldHeight) / 2);
    const extraRight = Math.max(0, bgWidth - worldWidth - extraLeft);
    const extraBottom = Math.max(0, bgHeight - worldHeight - extraTop);
    const tileSize = this.tileSize;

    // Use same snow_offpiste tiles as the off-piste areas inside the level
    // This ensures visual consistency
    for (let x = Math.floor(-extraLeft / tileSize) - 1; x < Math.ceil((worldWidth + extraRight) / tileSize) + 1; x++) {
      for (let y = Math.floor(-extraTop / tileSize) - 1; y < Math.ceil((worldHeight + extraBottom) / tileSize) + 1; y++) {
        const isOutside = x < 0 || x >= this.level.width || y < 0 || y >= this.level.height;
        if (isOutside) {
          const tile = this.add.image(
            x * tileSize + tileSize / 2,
            y * tileSize + tileSize / 2,
            'snow_offpiste'
          );
          tile.setDisplaySize(tileSize, tileSize);
          tile.setDepth(DEPTHS.BG_FOREST_TILES);
        }
      }
    }

    // Add dense forest of trees on top (avoid access paths)
    const treeSpacing = this.tileSize * 2;
    const margin = this.tileSize;

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.35) {
          const offsetX = (Math.random() - 0.5) * treeSpacing * 0.8;
          const offsetY = (Math.random() - 0.5) * treeSpacing * 0.8;
          const tx = x + offsetX, ty = y + offsetY;
          if (this.isOnAccessPath(tx, ty)) continue;
          this.createTree(tx, ty);
        }
      }
    }

    // Add occasional rocks (avoid access paths)
    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing * 2) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing * 2) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.85) {
          const offsetX = (Math.random() - 0.5) * treeSpacing;
          const offsetY = (Math.random() - 0.5) * treeSpacing;
          const tx = x + offsetX, ty = y + offsetY;
          if (this.isOnAccessPath(tx, ty)) continue;
          this.createRock(tx, ty);
        }
      }
    }
  }

  private createRock(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.BG_FOREST_ROCKS);
    const size = 6 + Math.random() * 8;

    g.fillStyle(0x6B6B6B, 1);
    g.fillRect(x - size / 2, y - size / 3, size, size * 0.6);

    g.fillStyle(0x8B8B8B, 1);
    g.fillRect(x - size / 3, y - size / 3, size * 0.3, size * 0.2);

    g.fillStyle(0x4A4A4A, 1);
    g.fillRect(x, y + size * 0.1, size * 0.4, size * 0.15);
  }

  private generatePistePath(): void {
    const shape = this.level.pisteShape || 'straight';
    const pisteWidth = this.level.pisteWidth || 0.5;
    const worldWidth = this.level.width;
    const worldHeight = this.level.height;
    const halfWidth = Math.floor(worldWidth * pisteWidth / 2);

    this.pistePath = [];

    for (let y = 0; y < worldHeight; y++) {
      const progress = y / worldHeight;
      let centerX = worldWidth / 2;
      let width = halfWidth * 2;

      switch (shape) {
        case 'straight':
          break;
        case 'gentle_curve':
          centerX += Math.sin(progress * Math.PI * 2) * (worldWidth * 0.15);
          break;
        case 'winding':
          centerX += Math.sin(progress * Math.PI * 3) * (worldWidth * 0.2);
          width = halfWidth * 2 * (0.8 + 0.2 * Math.cos(progress * Math.PI * 3));
          break;
        case 'serpentine':
          centerX += Math.sin(progress * Math.PI * 4) * (worldWidth * 0.25);
          width = halfWidth * 2 * (0.7 + 0.3 * Math.abs(Math.cos(progress * Math.PI * 4)));
          break;
        case 'wide':
          width = halfWidth * 2.5;
          break;
      }

      this.pistePath.push({
        centerX: Math.max(halfWidth + 3, Math.min(worldWidth - halfWidth - 3, centerX)),
        width: Math.max(6, Math.floor(width))
      });
    }
  }

  private isInPiste(x: number, y: number): boolean {
    if (y < 3 || y >= this.level.height - 2) return false;
    if (!this.pistePath || !this.pistePath[y]) return true;

    const path = this.pistePath[y];
    const halfWidth = path.width / 2;
    return x >= path.centerX - halfWidth && x < path.centerX + halfWidth;
  }

  /**
   * Check if a position (in pixels) falls within a cliff area.
   * Used to avoid placing markers on rocks.
   */
  private isOnCliff(x: number, y: number): boolean {
    if (!this.cliffSegments || this.cliffSegments.length === 0) return false;
    
    for (const cliff of this.cliffSegments) {
      // Check if y is within this cliff segment's vertical range
      if (y < cliff.startY || y > cliff.endY) continue;
      
      const pisteEdge = cliff.getX(y);
      
      if (cliff.side === 'left') {
        // Left cliff extends from (pisteEdge - offset - extent) to (pisteEdge - offset)
        const cliffEnd = pisteEdge - cliff.offset;
        const cliffStart = cliffEnd - cliff.extent;
        if (x >= cliffStart && x <= cliffEnd) return true;
      } else {
        // Right cliff extends from (pisteEdge + offset) to (pisteEdge + offset + extent)
        const cliffStart = pisteEdge + cliff.offset;
        const cliffEnd = cliffStart + cliff.extent;
        if (x >= cliffStart && x <= cliffEnd) return true;
      }
    }
    
    return false;
  }

  private createSnowGrid(): void {
    this.snowTiles = this.add.group();
    const tileSize = this.tileSize;

    this.generatePistePath();

    this.groomableTiles = 0;

    for (let y = 0; y < this.level.height; y++) {
      this.snowGrid[y] = [];
      for (let x = 0; x < this.level.width; x++) {
        const isGroomable = this.isInPiste(x, y);

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

    this.calculateAccessPathZones();
    this.calculateCliffSegments();  // Calculate cliff data before physics/visuals
  }

  private calculateAccessPathZones(): void {
    const accessPaths = this.level.accessPaths || [];
    this.accessEntryZones = [];

    if (accessPaths.length === 0) return;

    const tileSize = this.tileSize;
    const worldHeight = this.level.height * tileSize;
    const gapWidth = tileSize * 8;

    accessPaths.forEach(path => {
      const entryY = path.endY * worldHeight;
      const exitY = path.startY * worldHeight;

      this.accessEntryZones.push({
        y: entryY,
        side: path.side,
        startY: entryY - gapWidth,
        endY: entryY + gapWidth
      });

      this.accessEntryZones.push({
        y: exitY,
        side: path.side,
        startY: exitY - gapWidth,
        endY: exitY + gapWidth
      });
    });
  }

  /**
   * Calculate cliff segments with variable offset and extent.
   * Called before createBoundaryColliders so both physics and visuals use same data.
   */
  private calculateCliffSegments(): void {
    if (!this.level.hasDangerousBoundaries) return;
    
    this.cliffSegments = [];
    const tileSize = this.tileSize;
    const worldWidth = this.level.width * tileSize;
    
    // Seeded random for consistent cliff appearance
    const rand = (seed: number) => {
      const n = Math.sin(seed * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    
    // Build continuous cliff segments for each side
    type EdgeData = { y: number; x: number };
    const leftEdges: EdgeData[] = [];
    const rightEdges: EdgeData[] = [];
    let leftStart: number | null = null;
    let rightStart: number | null = null;
    
    for (let y = 3; y < this.level.height - 2; y++) {
      const path = this.pistePath[y];
      if (!path) continue;
      
      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;
      const yPos = y * tileSize;
      
      // Check access paths - cliffs should not overlap service roads
      // Check both entry/exit zones AND full road geometry (switchback area)
      const isLeftAccess = (this.accessEntryZones?.some(z => 
        z.side === 'left' && yPos >= z.startY - tileSize * 2 && yPos <= z.endY + tileSize * 2
      )) || (this.accessPathRects?.some(r =>
        r.side === 'left' && yPos >= r.startY && yPos <= r.endY
      ));
      const isRightAccess = (this.accessEntryZones?.some(z => 
        z.side === 'right' && yPos >= z.startY - tileSize * 2 && yPos <= z.endY + tileSize * 2
      )) || (this.accessPathRects?.some(r =>
        r.side === 'right' && yPos >= r.startY && yPos <= r.endY
      ));
      
      // Left cliff segments - anywhere piste doesn't touch left edge
      const hasLeftCliff = leftEdge > tileSize && !isLeftAccess;
      if (hasLeftCliff) {
        if (leftStart === null) leftStart = yPos;
        leftEdges.push({ y: yPos, x: leftEdge });
      } else if (leftStart !== null) {
        this.finalizeCliffSegmentWithParams(leftStart, (y - 1) * tileSize, leftEdges, 'left', rand, tileSize, worldWidth);
        leftStart = null;
        leftEdges.length = 0;
      }
      
      // Right cliff segments - anywhere piste doesn't touch right edge
      const hasRightCliff = rightEdge < worldWidth - tileSize && !isRightAccess;
      if (hasRightCliff) {
        if (rightStart === null) rightStart = yPos;
        rightEdges.push({ y: yPos, x: rightEdge });
      } else if (rightStart !== null) {
        this.finalizeCliffSegmentWithParams(rightStart, (y - 1) * tileSize, rightEdges, 'right', rand, tileSize, worldWidth);
        rightStart = null;
        rightEdges.length = 0;
      }
    }
    
    // Close remaining segments
    if (leftStart !== null) {
      this.finalizeCliffSegmentWithParams(leftStart, (this.level.height - 3) * tileSize, leftEdges, 'left', rand, tileSize, worldWidth);
    }
    if (rightStart !== null) {
      this.finalizeCliffSegmentWithParams(rightStart, (this.level.height - 3) * tileSize, rightEdges, 'right', rand, tileSize, worldWidth);
    }
  }
  
  private finalizeCliffSegmentWithParams(
    startY: number,
    endY: number,
    edges: { y: number; x: number }[],
    side: 'left' | 'right',
    rand: (seed: number) => number,
    tileSize: number,
    worldWidth: number
  ): void {
    if (edges.length < 2) return;
    
    // CRITICAL: Copy edges array since caller clears it after this call
    // The closure needs its own copy to work correctly
    const edgesCopy = edges.map(e => ({ y: e.y, x: e.x }));
    
    // Variable offset from piste edge: 1.5-3 tiles minimum
    // Ensures cliffs never overlap with piste area
    const offsetVariation = rand(startY * 0.5 + 77);
    const offset = tileSize * (1.5 + offsetVariation * 1.5);
    
    // Finite extent: 3-5 tiles wide
    const extent = tileSize * (3 + rand(startY * 0.3 + 99) * 2);
    
    // Interpolation function for edge position using copied edges
    const getX = (y: number): number => {
      const idx = edgesCopy.findIndex(e => e.y >= y);
      if (idx <= 0) return edgesCopy[0].x;
      if (idx >= edgesCopy.length) return edgesCopy[edgesCopy.length - 1].x;
      const prev = edgesCopy[idx - 1];
      const next = edgesCopy[idx];
      const t = (y - prev.y) / (next.y - prev.y || 1);
      return prev.x + (next.x - prev.x) * t;
    };
    
    this.cliffSegments.push({ side, startY, endY, offset, extent, getX });
  }

  private createBoundaryColliders(): void {
    this.boundaryWalls = this.physics.add.staticGroup();
    this.dangerZones = this.physics.add.staticGroup();

    const tileSize = this.tileSize;
    const worldWidth = this.level.width * tileSize;
    const worldHeight = this.level.height * tileSize;
    const isDangerous = this.level.hasDangerousBoundaries;

    const isAccessZone = (yPos: number, side: string): boolean => {
      // Check entry/exit zones
      if (this.accessEntryZones) {
        const segmentTop = yPos;
        const segmentBottom = yPos + tileSize * 4;

        for (const zone of this.accessEntryZones) {
          if (zone.side === side &&
            segmentTop < zone.endY && segmentBottom > zone.startY) {
            return true;
          }
        }
      }
      // Check full road path rects (switchback area)
      if (this.accessPathRects) {
        const segmentTop = yPos;
        const segmentBottom = yPos + tileSize * 4;
        for (const rect of this.accessPathRects) {
          if (segmentTop < rect.endY && segmentBottom > rect.startY) {
            if (rect.side === side) return true;
          }
        }
      }
      return false;
    };

    const segmentHeight = tileSize * 4;

    // For dangerous levels, use cliff segments with offset for physics
    // For non-dangerous levels, use piste edge directly
    if (isDangerous && this.cliffSegments.length > 0) {
      // Create danger zones based on cliff segments (with offset from piste)
      // Skip segments that overlap access paths (belt-and-suspenders with calculateCliffSegments)
      for (const cliff of this.cliffSegments) {
        // Create physics bodies for each segment of the cliff
        for (let y = cliff.startY; y < cliff.endY; y += segmentHeight) {
          if (isAccessZone(y, cliff.side)) continue;

          const pisteEdge = cliff.getX(y);
          const yEnd = Math.min(y + segmentHeight, cliff.endY);
          const height = yEnd - y;
          
          if (cliff.side === 'left') {
            // Left cliff: danger zone from (pisteEdge - offset - extent) to (pisteEdge - offset)
            const cliffEnd = pisteEdge - cliff.offset;
            const cliffStart = Math.max(0, cliffEnd - cliff.extent);
            const width = cliffEnd - cliffStart;
            if (width > 0) {
              const wall = this.add.rectangle(
                cliffStart + width / 2,
                y + height / 2,
                width,
                height,
                0x000000, 0
              );
              this.physics.add.existing(wall, true);
              this.dangerZones.add(wall);
            }
            // Forest wall beyond cliff
            if (cliffStart > tileSize) {
              const forestWall = this.add.rectangle(
                cliffStart / 2, y + height / 2, cliffStart, height, 0x000000, 0
              );
              this.physics.add.existing(forestWall, true);
              this.boundaryWalls.add(forestWall);
            }
          } else {
            // Right cliff: danger zone from (pisteEdge + offset) to (pisteEdge + offset + extent)
            const cliffStart = pisteEdge + cliff.offset;
            const cliffEnd = Math.min(worldWidth, cliffStart + cliff.extent);
            const width = cliffEnd - cliffStart;
            if (width > 0) {
              const wall = this.add.rectangle(
                cliffStart + width / 2,
                y + height / 2,
                width,
                height,
                0x000000, 0
              );
              this.physics.add.existing(wall, true);
              this.dangerZones.add(wall);
            }
            // Forest wall beyond cliff
            if (cliffEnd < worldWidth - tileSize) {
              const forestWidth = worldWidth - cliffEnd;
              const forestWall = this.add.rectangle(
                cliffEnd + forestWidth / 2, y + height / 2, forestWidth, height, 0x000000, 0
              );
              this.physics.add.existing(forestWall, true);
              this.boundaryWalls.add(forestWall);
            }
          }
        }
      }
    } else {
      // Non-dangerous or no cliff segments: use original piste edge physics
      for (let y = 0; y < this.level.height; y += 4) {
        if (y >= this.level.height - 2) continue;

        const yPos = y * tileSize;
        const path = this.pistePath[y] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
        const leftEdge = (path.centerX - path.width / 2) * tileSize;
        const rightEdge = (path.centerX + path.width / 2) * tileSize;

        if (leftEdge > tileSize && !isAccessZone(yPos, 'left')) {
          const leftWall = this.add.rectangle(
            leftEdge / 2,
            yPos + segmentHeight / 2,
            leftEdge,
            segmentHeight,
            0x000000, 0
          );
          this.physics.add.existing(leftWall, true);
          this.boundaryWalls.add(leftWall);
        }

        if (rightEdge < worldWidth - tileSize && !isAccessZone(yPos, 'right')) {
          const rightWall = this.add.rectangle(
            rightEdge + (worldWidth - rightEdge) / 2,
            yPos + segmentHeight / 2,
            worldWidth - rightEdge,
            segmentHeight,
            0x000000, 0
          );
          this.physics.add.existing(rightWall, true);
          this.boundaryWalls.add(rightWall);
        }
      }
    }

    const topWall = this.add.rectangle(
      worldWidth / 2,
      tileSize * 1.5,
      worldWidth,
      tileSize * 3,
      0x000000, 0
    );
    this.physics.add.existing(topWall, true);
    this.boundaryWalls.add(topWall);

    const bottomWall = this.add.rectangle(
      worldWidth / 2,
      worldHeight - tileSize,
      worldWidth,
      tileSize * 2,
      0x000000, 0
    );
    this.physics.add.existing(bottomWall, true);
    // Bottom is always a boundary wall (not a danger zone) - just stops the player
    this.boundaryWalls.add(bottomWall);
    
    // Draw cliff edge visuals if level has dangerous boundaries (side cliffs only)
    if (isDangerous) {
      this.createCliffEdgeVisuals();
    }
  }

  private createCliffEdgeVisuals(): void {
    // Use pre-calculated cliff segments (same data as physics)
    for (const cliff of this.cliffSegments) {
      this.drawContinuousCliff(cliff);
    }
  }

  // Natural alpine rock colors - increased contrast
  private readonly CLIFF_COLORS = {
    darkRock: 0x2d2822,      // Very dark base (darker)
    midRock: 0x4a423a,       // Medium brown-gray
    lightRock: 0x6a5e52,     // Lighter brown-gray
    shadowRock: 0x1a1612,    // Deep shadow (almost black)
    highlight: 0x8a7e6a,     // Rock highlight (tan)
    accent: 0x5a4a3a,        // Warm brown accent
    snow: 0xf0f5f8,          // Snow white
    snowShadow: 0xd8e0e8,    // Shadowed snow
  };

  private drawContinuousCliff(
    cliff: { side: 'left' | 'right'; startY: number; endY: number; offset: number; extent: number; getX: (y: number) => number }
  ): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.CLIFFS);
    
    const tileSize = this.tileSize;
    const { side, startY, endY, offset, extent, getX } = cliff;

    // Seeded random for consistent look
    const rand = (i: number) => {
      const n = Math.sin(startY * 0.01 + i * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    
    if (endY > startY) {
      // Draw cliff using tile-sized cells matching snow texture style
      const detailSize = Math.max(2, Math.floor(tileSize * 0.2));
      const detailLarge = Math.max(3, Math.floor(tileSize * 0.3));
      const worldWidth = this.level.width * tileSize;
      
      // Fill cliff area tile by tile with rock texture - organic edges
      for (let y = startY; y <= endY; y += tileSize) {
        const pisteEdge = getX(y);
        
        // Per-row edge variation for organic look - only AWAY from piste, never into it
        const rowVariation = Math.abs(rand(y * 0.3 + 55) - 0.5) * tileSize;
        
        // Calculate cliff bounds using shared offset and extent (matches physics)
        // Cliffs must NEVER overlap piste - variation only extends them further out
        let cliffStart: number, cliffEnd: number;
        if (side === 'left') {
          // Left cliff: edge at pisteEdge - offset, can only go further left (smaller x)
          cliffEnd = pisteEdge - offset - rowVariation * 0.3;
          cliffStart = Math.max(0, cliffEnd - extent - rowVariation);
        } else {
          // Right cliff: edge at pisteEdge + offset, can only go further right (larger x)
          cliffStart = pisteEdge + offset + rowVariation * 0.3;
          cliffEnd = Math.min(worldWidth, cliffStart + extent + rowVariation);
        }
        
        for (let x = cliffStart; x < cliffEnd; x += tileSize) {
          // Skip some edge tiles for organic look
          const isEdgeTile = (side === 'left' && x < cliffStart + tileSize * 1.5) ||
                            (side === 'right' && x > cliffEnd - tileSize * 1.5) ||
                            (y < startY + tileSize * 1.5) ||
                            (y > endY - tileSize * 1.5);
          if (isEdgeTile && rand(x * 0.1 + y * 0.2 + 33) > 0.7) continue;
          
          // Base rock color
          g.fillStyle(this.CLIFF_COLORS.midRock, 1);
          g.fillRect(x, y, tileSize + 1, tileSize + 1);
          
          // Detail rectangles matching snow texture pattern
          const seed = x * 0.1 + y * 0.07;
          
          // Lighter patches
          g.fillStyle(this.CLIFF_COLORS.lightRock, 1);
          g.fillRect(x + detailSize, y + detailSize, detailLarge, detailSize);
          if (rand(seed + 1) > 0.4) {
            g.fillRect(x + tileSize * 0.5, y + detailSize * 2, detailLarge + detailSize, detailLarge);
          }
          if (rand(seed + 2) > 0.5) {
            g.fillRect(x + detailSize * 2, y + tileSize * 0.5, detailLarge, detailLarge);
          }
          
          // Shadow details
          g.fillStyle(this.CLIFF_COLORS.darkRock, 1);
          if (rand(seed + 3) > 0.3) {
            g.fillRect(x + tileSize * 0.3, y + detailSize, detailSize, detailSize);
          }
          if (rand(seed + 4) > 0.4) {
            g.fillRect(x + tileSize * 0.7, y + tileSize * 0.4, detailSize, detailLarge);
          }
          if (rand(seed + 5) > 0.5) {
            g.fillRect(x + tileSize * 0.5, y + tileSize * 0.7, detailSize, detailSize);
          }
        }
      }
    
      // Sparse trees on cliff (sparser than off-piste — rocky terrain)
      // When a tree spawns, 40% chance of a small cluster (2-3 trees)
      const treeSpacing = tileSize * 4;
      for (let y = startY + treeSpacing; y < endY - treeSpacing; y += treeSpacing) {
        if (rand(y + 300) < 0.95) continue;
        
        const offsetY = (rand(y + 301) - 0.5) * treeSpacing * 0.5;
        const pisteEdge = getX(y + offsetY);
        const treeDist = offset + rand(y + 302) * extent * 0.8;
        const treeX = side === 'left' 
          ? Math.max(tileSize, pisteEdge - treeDist)
          : Math.min(worldWidth - tileSize, pisteEdge + treeDist);
        this.createTree(treeX, y + offsetY);
        
        // Cluster: add 1-2 nearby trees
        if (rand(y + 303) > 0.6) {
          const clusterCount = rand(y + 304) > 0.5 ? 2 : 1;
          for (let c = 0; c < clusterCount; c++) {
            const cx = treeX + (rand(y + 305 + c) - 0.5) * tileSize * 1.5;
            const cy = y + offsetY + (rand(y + 306 + c) - 0.5) * tileSize * 1.5;
            this.createTree(cx, cy);
          }
        }
      }
    
      // Sparse snow patches (similar size to snow texture details)
      const snowSpacing = tileSize * 2;
      for (let y = startY + snowSpacing; y < endY - snowSpacing; y += snowSpacing) {
        if (rand(y + 200) < 0.65) continue;
        
        const pisteEdge = getX(y);
        // Place snow patches within the cliff area
        const snowDist = offset + rand(y + 201) * extent * 0.6;
        const snowX = side === 'left' 
          ? Math.max(tileSize, pisteEdge - snowDist)
          : Math.min(worldWidth - tileSize, pisteEdge + snowDist);
        
        // Snow patch sizes matching texture detail scale
        g.fillStyle(this.CLIFF_COLORS.snow, 1);
        g.fillRect(snowX, y, detailLarge * 2, detailSize);
        if (rand(y + 202) > 0.5) {
          g.fillRect(snowX + detailSize, y + detailSize, detailLarge, detailSize);
        }
      }
    
      // Warning poles on snow BEFORE the cliff (between piste edge and danger zone)
      // Place poles slightly away from piste edge but NOT on the cliff
      for (let y = startY + tileSize * 2; y < endY - tileSize; y += tileSize * 4) {
        const pisteEdge = getX(y);
        // Place poles in the snow zone between piste and cliff (at 1/3 of offset distance)
        const poleOffset = offset * 0.3;  // Pole is 30% of the way from piste to cliff
        const poleX = side === 'left' ? pisteEdge - poleOffset : pisteEdge + poleOffset;
        // Match piste marker sizing (28px height, 5px width)
        const poleHeight = 28;
        const poleWidth = 5;
        
        g.fillStyle(0x000000, 1);
        g.fillRect(poleX - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
        
        // Yellow/black danger stripes (per NF S52-102)
        const stripeH = poleHeight / 5;
        for (let j = 0; j < 5; j++) {
          g.fillStyle(j % 2 === 0 ? 0xffcc00 : 0x111111, 1);
          g.fillRect(poleX - poleWidth / 2 - 1, y - poleHeight + j * stripeH, poleWidth + 2, stripeH);
        }
      }
    }
  }

  private createPisteBoundaries(_worldWidth: number, _worldHeight: number): void {
    this.createPisteMarkers();
    this.createAccessPaths();
    this.createForestBoundaries(_worldWidth, _worldHeight);
    this.createSteepZoneIndicators();
  }

  private createPisteMarkers(): void {
    const tileSize = this.tileSize;
    const markerSpacing = Math.max(6, Math.floor(this.level.height / 10));
    const markerColor = this.getDifficultyColor();
    const markerSymbol = this.getDifficultySymbol();

    for (let yi = 0; yi < this.level.height; yi += markerSpacing) {
      if (yi < 4 || yi >= this.level.height - 3) continue;

      const path = this.pistePath[yi];
      if (!path) continue;

      const leftX = (path.centerX - path.width / 2) * tileSize;
      const rightX = (path.centerX + path.width / 2) * tileSize;
      const y = yi * tileSize;

      // Only place markers if position is not on a cliff
      const leftMarkerX = leftX - tileSize * 0.5;
      const rightMarkerX = rightX + tileSize * 0.5;
      
      if (!this.isOnCliff(leftMarkerX, y)) {
        this.createMarkerPole(leftMarkerX, y, markerColor, markerSymbol, 'left');
      }
      if (!this.isOnCliff(rightMarkerX, y)) {
        this.createMarkerPole(rightMarkerX, y, markerColor, markerSymbol, 'right');
      }
    }
  }

  private createMarkerPole(x: number, y: number, color: number, _symbol: string, side: string): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.MARKERS);
    const poleHeight = 28;
    const poleWidth = 5;
    const orangeTopHeight = Math.floor(poleHeight * 0.15);

    // French piste marker style (NF S52-102):
    // Right (droite) going downhill has orange top cap for visibility.
    // Since camera faces uphill, downhill-right = screen-left.
    if (side === 'left') {
      // Orange top on left markers (= right side going downhill per NF S52-102)
      g.fillStyle(color, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + orangeTopHeight, poleWidth, poleHeight - orangeTopHeight);

      g.fillStyle(0xFF6600, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, orangeTopHeight);
    } else {
      // Full piste color on right markers (= left side going downhill)
      g.fillStyle(color, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, poleHeight);
    }

    g.fillStyle(0x222222, 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
  }

  private getDifficultySymbol(): string {
    switch (this.level.difficulty) {
      case 'tutorial':
      case 'green': return '●';
      case 'blue': return '■';
      case 'red': return '◆';
      case 'black': return '◆◆';
      case 'park': return '▲';
      default: return '●';
    }
  }

  private isOnAccessPath(x: number, y: number): boolean {
    if (!this.accessPathRects) return false;
    for (const rect of this.accessPathRects) {
      if (y >= rect.startY && y <= rect.endY &&
        x >= rect.leftX && x <= rect.rightX) {
        return true;
      }
    }
    return false;
  }

  private createForestBoundaries(worldWidth: number, _worldHeight: number): void {
    const tileSize = this.tileSize;

    for (let yi = 3; yi < this.level.height - 2; yi += 2) {
      const path = this.pistePath[yi];
      if (!path) continue;

      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;
      const y = yi * tileSize;

      for (let tx = tileSize; tx < leftEdge - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (this.isOnAccessPath(treeX, treeY)) continue;
        if (this.isOnCliff(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY);
        }
      }

      for (let tx = rightEdge + tileSize; tx < worldWidth - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (this.isOnAccessPath(treeX, treeY)) continue;
        if (this.isOnCliff(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY);
        }
      }
    }
  }

  private createTree(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.TREES);
    const size = 8 + Math.random() * 6;

    g.fillStyle(0x4a3728, 1);
    g.fillRect(x - 2, y, 4, size * 0.4);

    g.fillStyle(0x1a4a2a, 1);
    g.fillRect(x - size / 2, y - size * 0.6, size, size * 0.5);
    g.fillRect(x - size / 3, y - size, size * 0.66, size * 0.5);
  }

  private createSteepZoneIndicators(): void {
    const steepZones = this.level.steepZones || [];
    const tileSize = this.tileSize;
    const worldHeight = this.level.height * tileSize;

    this.steepZoneRects = [];

    steepZones.forEach(zone => {
      const startY = zone.startY * worldHeight;
      const endY = zone.endY * worldHeight;

      const midYIndex = Math.floor((zone.startY + zone.endY) / 2 * this.level.height);
      const path = this.pistePath[midYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;

      const g = this.add.graphics();
      g.setDepth(DEPTHS.SIGNAGE);
      g.lineStyle(1, 0x4a423a, 0.3);

      for (let ly = startY; ly < endY; ly += tileSize) {
        g.beginPath();
        g.moveTo(leftEdge, ly);
        g.lineTo(leftEdge + 10, ly + 10);
        g.strokePath();

        g.beginPath();
        g.moveTo(rightEdge, ly);
        g.lineTo(rightEdge - 10, ly + 10);
        g.strokePath();
      }

      // Warning triangle sign (per NF S52-102 — yellow/black triangle)
      const markerX = (leftEdge + rightEdge) / 2;
      const markerY = startY - 15;
      const mg = this.add.graphics();
      mg.setDepth(DEPTHS.SIGNAGE);
      // Yellow triangle (pointing up)
      const triSize = 12;
      mg.fillStyle(0xffcc00, 1);
      mg.beginPath();
      mg.moveTo(markerX, markerY - triSize);
      mg.lineTo(markerX - triSize, markerY + triSize * 0.6);
      mg.lineTo(markerX + triSize, markerY + triSize * 0.6);
      mg.closePath();
      mg.fillPath();
      mg.lineStyle(1, 0x000000, 0.8);
      mg.beginPath();
      mg.moveTo(markerX, markerY - triSize);
      mg.lineTo(markerX - triSize, markerY + triSize * 0.6);
      mg.lineTo(markerX + triSize, markerY + triSize * 0.6);
      mg.closePath();
      mg.strokePath();
      // Black exclamation mark inside triangle
      mg.fillStyle(0x000000, 1);
      mg.fillRect(markerX - 1, markerY - 5, 2, 6);
      mg.fillRect(markerX - 1, markerY + 2, 2, 2);
      mg.setAlpha(0.8);

      this.add.text(markerX + 14, markerY, zone.slope + '°', {
        fontFamily: THEME.fonts.family,
        fontSize: '9px',
        color: '#FF6600',
        backgroundColor: '#000000',
        padding: { x: 3, y: 1 }
      }).setOrigin(0, 0.5).setAlpha(0.8).setDepth(DEPTHS.SIGNAGE);

      this.steepZoneRects.push({
        startY: startY,
        endY: endY,
        leftX: leftEdge,
        rightX: rightEdge,
        slope: zone.slope
      });
    });
  }

  /**
   * Pre-calculate access path geometry (curves, edges, rects).
   * Called early so boundary colliders and background trees can avoid road areas.
   */
  private calculateAccessPathGeometry(): void {
    const accessPaths = this.level.accessPaths || [];
    this.accessPathRects = [];
    this.accessPathCurves = [];
    if (accessPaths.length === 0) return;

    const tileSize = this.tileSize;
    const worldHeight = this.level.height * tileSize;
    const worldWidth = this.level.width * tileSize;
    const roadWidth = tileSize * 5;

    accessPaths.forEach((path, pathIdx) => {
      const entryY = path.endY * worldHeight;
      const exitY = path.startY * worldHeight;
      const onLeft = path.side === 'left';

      const entryYIndex = Math.floor(path.endY * this.level.height);
      const exitYIndex = Math.floor(path.startY * this.level.height);
      const entryPath = this.pistePath[entryYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
      const exitPath = this.pistePath[exitYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };

      const entryPisteX = onLeft ?
        (entryPath.centerX - entryPath.width / 2) * tileSize :
        (entryPath.centerX + entryPath.width / 2) * tileSize;
      const exitPisteX = onLeft ?
        (exitPath.centerX - exitPath.width / 2) * tileSize :
        (exitPath.centerX + exitPath.width / 2) * tileSize;

      const roadExtent = tileSize * 12;
      const outerX = onLeft ?
        Math.max(tileSize * 3, Math.min(entryPisteX, exitPisteX) - roadExtent) :
        Math.min(worldWidth - tileSize * 3, Math.max(entryPisteX, exitPisteX) + roadExtent);

      const numTurns = 3;
      const segmentHeight = (entryY - exitY) / (numTurns + 1);

      const curvePoints: { x: number; y: number }[] = [];
      const stepsPerSegment = 12;

      curvePoints.push({ x: entryPisteX, y: entryY });

      for (let t = 0; t <= numTurns; t++) {
        const targetY = entryY - (t + 0.5) * segmentHeight;
        const atOuter = (t % 2 === 0);
        const innerX = onLeft ?
          Math.min(entryPisteX, exitPisteX) - tileSize * 2 :
          Math.max(entryPisteX, exitPisteX) + tileSize * 2;
        const targetX = atOuter ? outerX : innerX;

        const prevPoint = curvePoints[curvePoints.length - 1];

        for (let s = 1; s <= stepsPerSegment; s++) {
          const progress = s / stepsPerSegment;
          const eased = progress < 0.5 ?
            2 * progress * progress :
            1 - Math.pow(-2 * progress + 2, 2) / 2;

          const x = prevPoint.x + (targetX - prevPoint.x) * eased;
          const y = prevPoint.y + (targetY - prevPoint.y) * progress;
          curvePoints.push({ x, y });
        }
      }

      const lastPoint = curvePoints[curvePoints.length - 1];
      for (let s = 1; s <= stepsPerSegment; s++) {
        const progress = s / stepsPerSegment;
        const eased = progress < 0.5 ?
          2 * progress * progress :
          1 - Math.pow(-2 * progress + 2, 2) / 2;

        const x = lastPoint.x + (exitPisteX - lastPoint.x) * eased;
        const y = lastPoint.y + (exitY - lastPoint.y) * progress;
        curvePoints.push({ x, y });
      }

      const leftEdge: { x: number; y: number }[] = [];
      const rightEdge: { x: number; y: number }[] = [];

      for (let p = 0; p < curvePoints.length; p++) {
        const curr = curvePoints[p];
        const next = curvePoints[Math.min(p + 1, curvePoints.length - 1)];
        const prev = curvePoints[Math.max(p - 1, 0)];

        const dx = (next.x - prev.x) / 2;
        const dy = (next.y - prev.y) / 2;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        const nx = -dy / len * (roadWidth / 2);
        const ny = dx / len * (roadWidth / 2);

        leftEdge.push({ x: curr.x + nx, y: curr.y + ny });
        rightEdge.push({ x: curr.x - nx, y: curr.y - ny });
      }

      this.accessPathCurves.push({ leftEdge, rightEdge });

      // Build collision-exempt rects — one per curve point for full coverage
      // Margin covers road half-width plus buffer for curve interpolation
      const margin = roadWidth * 1.2;
      for (let p = 0; p < curvePoints.length - 1; p++) {
        const p1 = curvePoints[p];
        const p2 = curvePoints[p + 1];
        this.accessPathRects.push({
          startY: Math.min(p1.y, p2.y) - margin,
          endY: Math.max(p1.y, p2.y) + margin,
          leftX: Math.min(p1.x, p2.x) - margin,
          rightX: Math.max(p1.x, p2.x) + margin,
          side: onLeft ? 'left' : 'right',
          pathIndex: pathIdx,
        });
      }
    });
  }

  /**
   * Render access path visuals (road surface tiles + poles).
   * Uses pre-computed geometry from calculateAccessPathGeometry().
   */
  private createAccessPaths(): void {
    if (this.accessPathCurves.length === 0) return;

    const tileSize = this.tileSize;
    const poleSpacing = tileSize * 15;

    this.accessPathCurves.forEach(({ leftEdge, rightEdge }) => {
      // Place road surface tiles along the curve
      const placedTiles = new Set<string>();
      for (let p = 0; p < leftEdge.length - 1; p++) {
        const l1 = leftEdge[p], l2 = leftEdge[p + 1];
        const r1 = rightEdge[p], r2 = rightEdge[p + 1];
        const minY = Math.min(l1.y, l2.y, r1.y, r2.y);
        const maxY = Math.max(l1.y, l2.y, r1.y, r2.y);
        for (let ty = Math.floor(minY / tileSize); ty <= Math.floor(maxY / tileSize); ty++) {
          const t = maxY > minY ? ((ty * tileSize + tileSize / 2) - minY) / (maxY - minY) : 0.5;
          const lx = l1.x + (l2.x - l1.x) * t;
          const rx = r1.x + (r2.x - r1.x) * t;
          const minX = Math.min(lx, rx);
          const maxX = Math.max(lx, rx);
          for (let tx = Math.floor(minX / tileSize); tx <= Math.floor(maxX / tileSize); tx++) {
            const key = `${tx},${ty}`;
            if (!placedTiles.has(key)) {
              placedTiles.add(key);
              const tile = this.add.image(
                tx * tileSize + tileSize / 2,
                ty * tileSize + tileSize / 2,
                'snow_packed'
              );
              tile.setDisplaySize(tileSize, tileSize);
              tile.setDepth(DEPTHS.ACCESS_ROAD);
            }
          }
        }
      }

      // Poles — sparse, matching piste marker size (28×5)
      // Use minimum screen distance between any two poles to avoid clustering at turns
      const minPoleDist = tileSize * 12;
      const minPoleDistSq = minPoleDist * minPoleDist;
      const placedPoles: { x: number; y: number }[] = [];
      
      let distanceTraveled = 0;
      for (let p = 1; p < leftEdge.length; p++) {
        const prevL = leftEdge[p - 1];
        const currL = leftEdge[p];
        const currR = rightEdge[p];

        const segLen = Math.sqrt(
          Math.pow(currL.x - prevL.x, 2) + Math.pow(currL.y - prevL.y, 2)
        );
        distanceTraveled += segLen;

        if (distanceTraveled >= poleSpacing) {
          // Check minimum screen distance to all existing poles
          const tooClose = placedPoles.some(pp => {
            const dx = pp.x - currL.x;
            const dy = pp.y - currL.y;
            return dx * dx + dy * dy < minPoleDistSq;
          });
          if (!tooClose) {
            distanceTraveled = 0;
            this.createServiceRoadPole(currL.x, currL.y);
            this.createServiceRoadPole(currR.x, currR.y);
            placedPoles.push({ x: currL.x, y: currL.y });
            placedPoles.push({ x: currR.x, y: currR.y });
          }
        }
      }
    });
  }

  private createServiceRoadPole(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.MARKERS);

    // Match piste marker sizing (28×5)
    const poleHeight = 28;
    const poleWidth = 5;
    const stripeHeight = Math.floor(poleHeight / 5);

    // Amber-yellow/black stripes (distinct from red piste markers)
    for (let i = 0; i < poleHeight; i += stripeHeight) {
      const isAmber = (Math.floor(i / stripeHeight) % 2 === 0);
      g.fillStyle(isAmber ? 0xFFAA00 : 0x111111, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + i, poleWidth, stripeHeight);
    }

    // Base anchor
    g.fillStyle(0x222222, 1);
    g.fillRect(x - poleWidth / 2 - 1, y - 3, poleWidth + 2, 6);
  }

  private createWinchAnchors(): void {
    const tileSize = this.tileSize;
    const anchorDefs = this.level.winchAnchors || [];

    this.winchAnchors = [];

    this.winchCableGraphics = this.add.graphics();
    this.winchCableGraphics.setDepth(DEPTHS.WINCH_CABLE);

    if (anchorDefs.length === 0) {
      const anchorY = tileSize * 4;
      const path = this.pistePath[4] || { centerX: this.level.width / 2 };
      this.createAnchorPost(path.centerX * tileSize, anchorY, 1);
      return;
    }

    anchorDefs.forEach((def, i) => {
      const yIndex = Math.floor(def.y * this.level.height);
      const path = this.pistePath[yIndex] || { centerX: this.level.width / 2 };
      const x = path.centerX * tileSize;
      const y = yIndex * tileSize;

      this.createAnchorPost(x, y, i + 1);
    });
  }

  private createAnchorPost(x: number, y: number, number: number): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.GROUND_OBJECTS);

    // Base plate
    g.fillStyle(0x888888, 1);
    g.fillRect(x - 10, y + 5, 20, 8);

    // Vertical pole
    g.fillStyle(0xFFAA00, 1);
    g.fillRect(x - 4, y - 20, 8, 28);

    // Cable hook ring (rectangle, no circles)
    g.fillStyle(0xCCCCCC, 1);
    g.fillRect(x - 6, y - 28, 12, 3);
    g.fillRect(x - 6, y - 22, 12, 3);
    g.fillRect(x - 6, y - 28, 3, 9);
    g.fillRect(x + 3, y - 28, 3, 9);

    // Yellow number plate with black text
    g.fillStyle(0xffff00, 1);
    g.fillRect(x - 8, y + 14, 16, 10);
    g.fillStyle(0x000000, 1);
    this.add.text(x, y + 19, '' + number, {
      fontFamily: 'Courier New, monospace',
      fontSize: '8px',
      color: '#000000',
    }).setOrigin(0.5).setDepth(DEPTHS.GROUND_LABELS);

    // Store hook position (y - 22) for cable, base position (y + 8) for proximity
    this.winchAnchors.push({ x, y: y - 22, baseY: y + 8, number });
  }

  private getNearestAnchor(): WinchAnchor | null {
    if (!this.winchAnchors || this.winchAnchors.length === 0) return null;

    let nearest: WinchAnchor | null = null;
    let nearestDist = Infinity;
    
    // Max distance to attach winch (about 3 tiles from the base)
    const maxAttachDistance = this.tileSize * 3;

    this.winchAnchors.forEach(anchor => {
      // Use baseY for proximity check (where groomer would physically attach)
      const dist = Phaser.Math.Distance.Between(
        this.groomer.x, this.groomer.y,
        anchor.x, anchor.baseY
      );
      if (dist < nearestDist && dist <= maxAttachDistance) {
        nearestDist = dist;
        nearest = anchor;
      }
    });

    return nearest;
  }

  private updateWinch(): void {
    if (!this.level.hasWinch) return;

    // Check touch input (via event system)
    const touchWinch = this.touchInput.winch;

    // Gamepad winch button (configurable, default L1)
    const gamepadWinch = isGamepadButtonPressed(this.gamepad, this.gamepadBindings.winch);

    const isWinchPressed = this.winchKey.isDown || touchWinch || gamepadWinch;

    if (isWinchPressed && !this.winchActive) {
      this.winchAnchor = this.getNearestAnchor();
      if (this.winchAnchor) {
        this.winchActive = true;
        this.winchUseCount++;
        Accessibility.announce(t('winchAttached') || 'Winch attached');
      }
    } else if (!isWinchPressed && this.winchActive) {
      this.winchActive = false;
      this.winchAnchor = null;
      if (this.winchCableGraphics) {
        this.winchCableGraphics.clear();
      }
    }

    if (this.winchActive && this.winchAnchor && this.winchCableGraphics) {
      this.winchCableGraphics.clear();
      
      const anchorX = this.winchAnchor.x;
      const anchorY = this.winchAnchor.y;
      const groomerX = this.groomer.x;
      const groomerY = this.groomer.y - 10;
      
      // Check if cable has slack (groomer is above or at same level as anchor)
      // In screen coords, lower Y = higher altitude
      const hasSlack = groomerY <= anchorY;
      
      if (hasSlack) {
        // Draw sagging cable - quadratic curve drooping down
        const midX = (anchorX + groomerX) / 2;
        const dist = Math.abs(groomerX - anchorX);
        const sag = Math.max(30, dist * 0.3); // Sag amount based on horizontal distance
        const midY = Math.max(anchorY, groomerY) + sag;
        
        this.winchCableGraphics.lineStyle(2, 0x666666, 0.7); // Thinner, grayer for slack
        this.winchCableGraphics.beginPath();
        this.winchCableGraphics.moveTo(anchorX, anchorY);
        // Draw curved line using segments
        const segments = 12;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          // Quadratic bezier: P = (1-t)²P0 + 2(1-t)tP1 + t²P2
          const px = (1 - t) * (1 - t) * anchorX + 2 * (1 - t) * t * midX + t * t * groomerX;
          const py = (1 - t) * (1 - t) * anchorY + 2 * (1 - t) * t * midY + t * t * groomerY;
          this.winchCableGraphics.lineTo(px, py);
        }
        this.winchCableGraphics.strokePath();
      } else {
        // Taut cable - straight line with tension coloring
        const dist = Phaser.Math.Distance.Between(groomerX, groomerY, anchorX, anchorY);
        const maxDist = this.level.height * this.tileSize * 0.8;
        const tension = Math.min(1, dist / maxDist);
        const cableColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(136, 136, 136),
          new Phaser.Display.Color(255, 100, 100),
          100,
          tension * 100
        );
        this.winchCableGraphics.lineStyle(3,
          Phaser.Display.Color.GetColor(cableColor.r, cableColor.g, cableColor.b), 1);
        this.winchCableGraphics.beginPath();
        this.winchCableGraphics.moveTo(anchorX, anchorY);
        this.winchCableGraphics.lineTo(groomerX, groomerY);
        this.winchCableGraphics.strokePath();
      }
    }
  }

  private getDifficultyColor(): number {
    // Tutorial uses green markers for visibility against white snow
    const key = this.level.difficulty === 'tutorial' ? 'green' : this.level.difficulty;
    const marker = DIFFICULTY_MARKERS[key as keyof typeof DIFFICULTY_MARKERS];
    return marker?.color ?? 0x888888;
  }

  private createObstacles(): void {
    const obstacleTypes = this.level.obstacles || [];
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    // Adjust obstacle count based on difficulty
    // Easier pistes have fewer obstacles on the groomed area
    const baseCount = Math.floor(this.level.width * this.level.height / 100);
    let difficultyMultiplier: number;
    switch (this.level.difficulty) {
      case 'tutorial': difficultyMultiplier = 0.2; break;
      case 'green': difficultyMultiplier = 0.4; break;
      case 'blue': difficultyMultiplier = 0.6; break;
      case 'red': difficultyMultiplier = 0.8; break;
      case 'black': difficultyMultiplier = 1.0; break;
      case 'park': difficultyMultiplier = 0.5; break;
      default: difficultyMultiplier = 0.6;
    }
    const obstacleCount = Math.floor(baseCount * difficultyMultiplier);

    for (let i = 0; i < obstacleCount; i++) {
      const type = Phaser.Utils.Array.GetRandom(obstacleTypes);
      if (!type) continue;

      let x: number, y: number;
      let attempts = 0;
      do {
        if (Math.random() < 0.7) {
          if (Math.random() < 0.5) {
            x = Phaser.Math.Between(this.tileSize * 3, this.tileSize * 6);
          } else {
            x = Phaser.Math.Between(worldWidth - this.tileSize * 6, worldWidth - this.tileSize * 3);
          }
          y = Phaser.Math.Between(this.tileSize * 5, worldHeight - this.tileSize * 5);
        } else {
          x = Phaser.Math.Between(this.tileSize * 8, worldWidth - this.tileSize * 8);
          y = Phaser.Math.Between(this.tileSize * 10, worldHeight - this.tileSize * 10);
        }
        attempts++;
      } while ((this.isOnAccessPath(x, y) || this.isOnCliff(x, y)) && attempts < 10);
      if (this.isOnAccessPath(x, y) || this.isOnCliff(x, y)) continue;

      let texture = 'tree';
      if (type === 'rocks') texture = 'rock';

      const obstacle = this.obstacles.create(x, y, texture);
      obstacle.setImmovable(true);
      obstacle.setScale(this.tileSize / 16);
      obstacle.setDepth(DEPTHS.TREES);
    }

    const restaurant = this.interactables.create(
      worldWidth / 2 - this.tileSize * 4,
      this.tileSize * 2,
      'restaurant'
    );
    restaurant.interactionType = 'food';
    restaurant.setScale(this.tileSize / 16);
    restaurant.setDepth(DEPTHS.GROUND_OBJECTS);
    // Add restaurant footprint for wildlife collision
    const rSize = this.tileSize * 2;
    this.buildingRects.push({
      x: restaurant.x - rSize / 2, y: restaurant.y - rSize / 2,
      w: rSize, h: rSize,
    });

    // Fuel station at bottom of level (maintenance area in resort)
    const fuelStation = this.interactables.create(
      worldWidth / 2 + this.tileSize * 4,
      worldHeight - this.tileSize * 3,
      'fuel'
    );
    fuelStation.interactionType = 'fuel';
    fuelStation.setScale(this.tileSize / 16);
    fuelStation.setDepth(DEPTHS.GROUND_OBJECTS);
    // Add fuel station footprint for wildlife collision
    const fSize = this.tileSize * 2;
    this.buildingRects.push({
      x: fuelStation.x - fSize / 2, y: fuelStation.y - fSize / 2,
      w: fSize, h: fSize,
    });

    // Add resort buildings on easier pistes (near resort)
    if (['tutorial', 'green', 'blue'].includes(this.level.difficulty)) {
      this.createResortBuildings(worldWidth, worldHeight);
    }
  }

  private createResortBuildings(worldWidth: number, worldHeight: number): void {
    const tileSize = this.tileSize;

    // Place more chalets on easier pistes (closer to resort)
    let chaletCount: number;
    switch (this.level.difficulty) {
      case 'tutorial': chaletCount = 3; break;
      case 'green': chaletCount = 4; break;
      case 'blue': chaletCount = 2; break;
      default: chaletCount = 1;
    }

    // Tutorial is inside the resort village - chalets throughout
    // Other pistes - chalets near bottom where skiers arrive
    const isTutorial = this.level.difficulty === 'tutorial';

    for (let i = 0; i < chaletCount; i++) {
      const side = i % 2 === 0 ? 'left' : 'right';

      let yPos: number;
      if (isTutorial) {
        // Spread chalets throughout the village area
        yPos = tileSize * (4 + i * 2.5);
      } else {
        // Position chalets near bottom of piste (arrival area)
        const bottomY = this.level.height * tileSize;
        yPos = bottomY - tileSize * (8 + i * 3);
      }

      const pathIndex = Math.floor(yPos / tileSize);
      const path = this.pistePath[pathIndex] ||
        { centerX: this.level.width / 2, width: this.level.width * 0.5 };

      const pisteEdge = side === 'left' ?
        (path.centerX - path.width / 2) * tileSize :
        (path.centerX + path.width / 2) * tileSize;

      const x = side === 'left' ?
        Math.max(tileSize * 3, pisteEdge - tileSize * 4) :
        Math.min(worldWidth - tileSize * 3, pisteEdge + tileSize * 4);

      // Skip if chalet would overlap an existing building (restaurant, fuel station)
      const cSize = tileSize * 2;
      const cx = x - cSize / 2, cy = yPos - cSize * 0.4;
      const cw = cSize, ch = cSize * 0.65;
      const overlaps = this.buildingRects.some(b =>
        cx < b.x + b.w && cx + cw > b.x && cy < b.y + b.h && cy + ch > b.y
      );
      if (overlaps) continue;

      this.createChalet(x, yPos);
    }
  }

  private createChalet(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(DEPTHS.GROUND_OBJECTS);
    const size = this.tileSize * 2;

    // Store footprint for wildlife collision
    this.buildingRects.push({
      x: x - size / 2, y: y - size * 0.4,
      w: size, h: size * 0.65,
    });

    // Chalet body (wooden)
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - size / 2, y - size * 0.4, size, size * 0.6);

    // Stone foundation
    g.fillStyle(0x666666, 1);
    g.fillRect(x - size / 2 - 2, y + size * 0.15, size + 4, size * 0.1);

    // Roof (dark wood with snow)
    g.fillStyle(0x4a3728, 1);
    g.beginPath();
    g.moveTo(x - size * 0.7, y - size * 0.35);
    g.lineTo(x, y - size * 0.8);
    g.lineTo(x + size * 0.7, y - size * 0.35);
    g.closePath();
    g.fillPath();

    // Snow on roof
    g.fillStyle(0xFFFFFF, 0.9);
    g.beginPath();
    g.moveTo(x - size * 0.65, y - size * 0.4);
    g.lineTo(x, y - size * 0.75);
    g.lineTo(x + size * 0.65, y - size * 0.4);
    g.lineTo(x + size * 0.5, y - size * 0.35);
    g.lineTo(x, y - size * 0.6);
    g.lineTo(x - size * 0.5, y - size * 0.35);
    g.closePath();
    g.fillPath();

    // Windows
    g.fillStyle(0x87CEEB, 1);
    g.fillRect(x - size * 0.3, y - size * 0.25, size * 0.2, size * 0.2);
    g.fillRect(x + size * 0.1, y - size * 0.25, size * 0.2, size * 0.2);

    // Door
    g.fillStyle(0x4a3728, 1);
    g.fillRect(x - size * 0.1, y - size * 0.05, size * 0.2, size * 0.25);

    // Chimney with smoke
    g.fillStyle(0x555555, 1);
    g.fillRect(x + size * 0.25, y - size * 0.7, size * 0.12, size * 0.2);

    // Smoke puffs (if not reduced motion)
    if (!Accessibility.settings.reducedMotion) {
      g.fillStyle(0xCCCCCC, 0.6);
      g.fillCircle(x + size * 0.31, y - size * 0.8, 3);
      g.fillCircle(x + size * 0.28, y - size * 0.9, 2);
    }
  }

  private createGroomer(): void {
    const bottomYIndex = Math.min(this.level.height - 8, Math.floor(this.level.height * 0.9));
    const bottomPath = this.pistePath[bottomYIndex] || { centerX: this.level.width / 2 };
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
    if (!this.cliffSegments || this.cliffSegments.length === 0) return;

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
    const leftOnCliff = this.isOnCliff(cx - rightX * halfWid, cy - rightY * halfWid);
    const rightOnCliff = this.isOnCliff(cx + rightX * halfWid, cy + rightY * halfWid);
    if (leftOnCliff || rightOnCliff) {
      this.triggerCliffFall();
      return;
    }

    // Center of mass — fall if center itself is on cliff
    if (this.isOnCliff(cx, cy)) {
      this.triggerCliffFall();
      return;
    }
  }

  private triggerCliffFall(): void {
    this.isFallingOffCliff = true;

    this.winchActive = false;
    this.winchAnchor = null;
    if (this.winchCableGraphics) {
      this.winchCableGraphics.clear();
    }

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
    const BINDINGS_VERSION = 2; // Must match SettingsScene
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
    this.updateWinch();
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
      winchActive: this.winchActive,
      levelIndex: this.levelIndex,
    });
  }

  private checkSteepness(): void {
    if (!this.steepZoneRects || this.steepZoneRects.length === 0) return;
    if (this.isGameOver || this.isTumbling) return;

    const groomerY = this.groomer.y;
    const groomerX = this.groomer.x;

    if (this.accessPathRects) {
      for (const path of this.accessPathRects) {
        if (groomerY >= path.startY && groomerY <= path.endY &&
          groomerX >= path.leftX && groomerX <= path.rightX) {
          this.accessPathsVisited.add(path.pathIndex);
          return;
        }
      }
    }

    for (const zone of this.steepZoneRects) {
      if (groomerY >= zone.startY && groomerY <= zone.endY &&
        groomerX >= zone.leftX && groomerX <= zone.rightX) {

        // Winch only prevents slide/tumble when cable is taut (groomer below anchor)
        const winchTaut = this.winchActive && this.winchAnchor && 
          (groomerY - 10) > this.winchAnchor.y;

        if (!winchTaut) {
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
    for (const zone of this.steepZoneRects) {
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

    const speed = GAME_CONFIG.GROOMER_SPEED * (this.buffs.speed ? BALANCE.SPEED_BUFF_MULTIPLIER : 1);

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

    if (this.winchActive && this.winchAnchor) {
      const dx = this.winchAnchor.x - this.groomer.x;
      const dy = this.winchAnchor.y - this.groomer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Only apply winch force when cable is taut (groomer below anchor)
      // In screen coords, groomer.y > anchor.y means groomer is lower/below
      const groomerY = this.groomer.y - 10;
      const isTaut = groomerY > this.winchAnchor.y;

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
      const winchHelping = this.winchActive && this.winchAnchor && 
        (this.groomer.y - 10) > this.winchAnchor.y;
      
      if (winchHelping) {
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
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('PauseScene', { levelIndex: this.levelIndex });
    this.scene.bringToTop('PauseScene');
  }

  resumeGame(): void {
    if (!this.scene.isActive() && !this.scene.isPaused()) return;
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
      winchActive: this.winchActive,
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
      winchUseCount: this.winchUseCount,
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

    this.children.removeAll(true);

    this.winchCableGraphics = null;
    this.weatherSystem.reset();
    this.hazardSystem.reset();
    this.wildlifeSystem.reset();
    this.buildingRects = [];
  }
}
