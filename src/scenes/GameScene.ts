import Phaser from 'phaser';
import { t, GAME_CONFIG, LEVELS, Accessibility, Level } from '../setup';
import { getLayoutDefaults } from '../utils/keyboardLayout';
import { saveProgress } from '../utils/gameProgress';
import HUDScene from './HUDScene';
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
}

interface AccessEntryZone {
  y: number;
  side: string;
  startY: number;
  endY: number;
}

interface WinchAnchor {
  x: number;
  y: number;
  number: number;
}

interface Buffs {
  [key: string]: number;
}

interface TutorialTriggered {
  [key: string]: boolean;
}

interface AvalancheZone extends Phaser.GameObjects.Rectangle {
  avalancheRisk: number;
  zoneVisual: Phaser.GameObjects.Rectangle;
}

export default class GameScene extends Phaser.Scene {
  // Level data
  private levelIndex = 0;
  private level!: Level;

  // World dimensions
  private tileSize = 16;
  private worldOffsetX = 0;
  private worldOffsetY = 0;

  // Game state
  private isGameOver = false;
  private isTransitioning = false;
  private isTumbling = false;
  private isFallingOffCliff = false;
  private steepWarningShown = false;
  private winchActive = false;
  private winchAnchor: WinchAnchor | null = null;
  private avalancheTriggered = false;

  // Resources
  private fuel = 100;
  private stamina = 100;
  private timeRemaining = 0;
  private isGrooming = false;
  private buffs: Buffs = {};

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

  // Winch
  private winchAnchors: WinchAnchor[] = [];
  private winchCableGraphics: Phaser.GameObjects.Graphics | null = null;

  // Avalanche
  private avalancheZones: AvalancheZone[] = [];
  private avalancheGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Weather
  private weatherParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private windStreaks: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private groomKey!: Phaser.Input.Keyboard.Key;
  private winchKey!: Phaser.Input.Keyboard.Key;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

  // Accessibility
  private highContrastMode = false;

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
    this.avalancheTriggered = false;
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

    // Create extended background to cover full visible window
    this.createExtendedBackground(screenWidth, screenHeight, worldWidth, worldHeight);

    // Create snow grid (sets totalTiles based on groomable area)
    this.snowGrid = [];
    this.groomedCount = 0;
    console.log('Creating snow grid...');
    this.createSnowGrid();
    console.log('Snow grid created, creating piste boundaries...');

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
      this.cameras.main.startFollow(this.groomer, true, 0.1, 0.1);
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

    // Winch state
    this.winchActive = false;
    this.winchCableGraphics = null;
    this.winchAnchor = null;

    // Avalanche state
    this.avalancheZones = [];
    this.avalancheTriggered = false;

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
      this.createAvalancheZones();
      console.log('Avalanche zones created');
    }

    // Input
    console.log('Setting up input...');
    this.setupInput();
    console.log('Input set up, launching HUD scene...');

    // Delay overlay scene launches to next frame to avoid render queue conflicts
    this.time.delayedCall(1, () => {
      // Start dialogue scene first (for rendering below HUD)
      this.scene.launch('DialogueScene');
      console.log('Dialogue launched');

      // Start HUD scene - bring to top LAST so its input is processed first
      this.scene.launch('HUDScene', {
        level: this.level,
        gameScene: this
      });
      this.scene.bringToTop('HUDScene');
      console.log('HUD launched on top');

      // Show intro dialogue
      if (this.level.introDialogue) {
        this.time.delayedCall(500, () => {
          this.showDialogue(this.level.introDialogue!);
        });
      }
    });

    // Timer
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });

    // Night overlay
    if (this.level.isNight) {
      this.createNightOverlay();
    }

    // Weather effects
    if (this.level.weather !== 'clear') {
      this.createWeatherEffects();
    }

    // Apply accessibility settings
    this.applyAccessibilitySettings();

    // Handle window resize - keep camera bounds updated and groomer visible
    this.scale.on('resize', this.handleResize, this);

    console.log('GameScene._createLevel complete!');
    // Pause on ESC
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());

    Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));
  }

  private applyAccessibilitySettings(): void {
    const settings = Accessibility.settings;

    // Apply high contrast mode
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
      this.highContrastMode = true;
    } else {
      document.body.classList.remove('high-contrast');
      this.highContrastMode = false;
    }

    // Apply colorblind filter using CSS filter on game canvas
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

  private ensureColorblindFilters(): void {
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

  private createExtendedBackground(screenWidth: number, screenHeight: number, worldWidth: number, worldHeight: number): void {
    const g = this.add.graphics();
    g.setDepth(-100);

    const extraLeft = this.worldOffsetX;
    const extraTop = this.worldOffsetY;
    const extraRight = Math.max(0, screenWidth - worldWidth - this.worldOffsetX);
    const extraBottom = Math.max(0, screenHeight - worldHeight - this.worldOffsetY);

    const snowBase = 0xE0EAF0;
    const snowShadow = 0xC8D8E0;

    g.fillStyle(snowBase, 1);

    if (extraLeft > 0) {
      g.fillRect(-extraLeft, -extraTop, extraLeft, screenHeight);
    }
    if (extraRight > 0) {
      g.fillRect(worldWidth, -extraTop, extraRight, screenHeight);
    }
    if (extraTop > 0) {
      g.fillRect(0, -extraTop, worldWidth, extraTop);
    }
    if (extraBottom > 0) {
      g.fillRect(0, worldHeight, worldWidth, extraBottom);
    }

    const patchSize = this.tileSize * 4;
    for (let x = -extraLeft; x < worldWidth + extraRight; x += patchSize) {
      for (let y = -extraTop; y < worldHeight + extraBottom; y += patchSize) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.7) {
          g.fillStyle(snowShadow, 0.5);
          const px = x + Math.random() * patchSize * 0.5;
          const py = y + Math.random() * patchSize * 0.5;
          const pw = patchSize * (0.3 + Math.random() * 0.4);
          const ph = patchSize * (0.3 + Math.random() * 0.4);
          g.fillRect(px, py, pw, ph);
        }
      }
    }

    const treeSpacing = this.tileSize * 2.5;
    const margin = this.tileSize;

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.5) {
          const offsetX = (Math.random() - 0.5) * treeSpacing * 0.8;
          const offsetY = (Math.random() - 0.5) * treeSpacing * 0.8;
          this.createTree(x + offsetX, y + offsetY);
        }
      }
    }

    for (let x = -extraLeft + margin; x < worldWidth + extraRight - margin; x += treeSpacing * 2) {
      for (let y = -extraTop + margin; y < worldHeight + extraBottom - margin; y += treeSpacing * 2) {
        const isOutside = x < 0 || x >= worldWidth || y < 0 || y >= worldHeight;
        if (isOutside && Math.random() > 0.9) {
          const offsetX = (Math.random() - 0.5) * treeSpacing;
          const offsetY = (Math.random() - 0.5) * treeSpacing;
          this.createRock(x + offsetX, y + offsetY);
        }
      }
    }
  }

  private createRock(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(-50);
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

        // Tint off-piste areas slightly green to show forest/nature
        if (!isGroomable) {
          tile.setTint(0x7a9a71);
        }

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
    this.createBoundaryColliders();
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

  private createBoundaryColliders(): void {
    this.boundaryWalls = this.physics.add.staticGroup();
    this.dangerZones = this.physics.add.staticGroup();

    const tileSize = this.tileSize;
    const worldWidth = this.level.width * tileSize;
    const worldHeight = this.level.height * tileSize;
    const isDangerous = this.level.hasDangerousBoundaries;

    const isAccessZone = (yPos: number, side: string): boolean => {
      if (!this.accessEntryZones) return false;
      const segmentTop = yPos;
      const segmentBottom = yPos + tileSize * 4;

      for (const zone of this.accessEntryZones) {
        if (zone.side === side &&
          segmentTop < zone.endY && segmentBottom > zone.startY) {
          return true;
        }
      }
      return false;
    };

    const segmentHeight = tileSize * 4;

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
        if (isDangerous) {
          this.dangerZones.add(leftWall);
        } else {
          this.boundaryWalls.add(leftWall);
        }
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
        if (isDangerous) {
          this.dangerZones.add(rightWall);
        } else {
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
    if (isDangerous) {
      this.dangerZones.add(bottomWall);
    } else {
      this.boundaryWalls.add(bottomWall);
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

      this.createMarkerPole(leftX - tileSize * 0.5, y, markerColor, markerSymbol, 'left');
      this.createMarkerPole(rightX + tileSize * 0.5, y, markerColor, markerSymbol, 'right');
    }
  }

  private createMarkerPole(x: number, y: number, color: number, _symbol: string, side: string): void {
    const g = this.add.graphics();
    const poleHeight = 28;
    const poleWidth = 5;
    const orangeTopHeight = Math.floor(poleHeight * 0.15);

    // French piste marker style:
    // Left (gauche) when facing downhill: piste color with orange top section
    // Right (droite) when facing downhill: fully piste color
    if (side === 'left') {
      // Orange top section on LEFT side markers
      g.fillStyle(color, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + orangeTopHeight, poleWidth, poleHeight - orangeTopHeight);

      g.fillStyle(0xFF6600, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight, poleWidth, orangeTopHeight);
    } else {
      // Full piste color on RIGHT side
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

  private createForestBoundaries(worldWidth: number, _worldHeight: number): void {
    const tileSize = this.tileSize;

    const isOnAccessPath = (x: number, y: number): boolean => {
      if (!this.accessPathRects) return false;
      for (const rect of this.accessPathRects) {
        if (y >= rect.startY && y <= rect.endY &&
          x >= rect.leftX && x <= rect.rightX) {
          return true;
        }
      }
      return false;
    };

    for (let yi = 3; yi < this.level.height - 2; yi += 2) {
      const path = this.pistePath[yi];
      if (!path) continue;

      const leftEdge = (path.centerX - path.width / 2) * tileSize;
      const rightEdge = (path.centerX + path.width / 2) * tileSize;
      const y = yi * tileSize;

      for (let tx = tileSize; tx < leftEdge - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (isOnAccessPath(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY);
        }
      }

      for (let tx = rightEdge + tileSize; tx < worldWidth - tileSize; tx += tileSize * 1.5) {
        const treeX = tx + Math.random() * tileSize;
        const treeY = y + Math.random() * tileSize;
        if (isOnAccessPath(treeX, treeY)) continue;
        if (Math.random() > 0.4) {
          this.createTree(treeX, treeY);
        }
      }
    }
  }

  private createTree(x: number, y: number): void {
    const g = this.add.graphics();
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
      g.lineStyle(1, 0x8B4513, 0.3);

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

      this.add.text((leftEdge + rightEdge) / 2, startY - 15,
        '⚠️ ' + zone.slope + '°', {
        fontSize: '9px',
        color: '#FF6600',
        backgroundColor: '#000000',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5).setAlpha(0.8);

      this.steepZoneRects.push({
        startY: startY,
        endY: endY,
        leftX: leftEdge,
        rightX: rightEdge,
        slope: zone.slope
      });
    });
  }

  private createAccessPaths(): void {
    const accessPaths = this.level.accessPaths || [];
    if (accessPaths.length === 0) {
      this.accessPathRects = [];
      return;
    }

    const tileSize = this.tileSize;
    const worldHeight = this.level.height * tileSize;
    const worldWidth = this.level.width * tileSize;
    const roadWidth = tileSize * 5;
    const poleSpacing = tileSize * 3;

    this.accessPathRects = [];

    accessPaths.forEach((path) => {
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
          distanceTraveled = 0;
          this.createServiceRoadPole(currL.x, currL.y);
          this.createServiceRoadPole(currR.x, currR.y);
        }
      }

      for (let p = 0; p < curvePoints.length - 1; p += 5) {
        const p1 = curvePoints[p];
        const p2 = curvePoints[Math.min(p + 5, curvePoints.length - 1)];
        this.accessPathRects.push({
          startY: Math.min(p1.y, p2.y) - roadWidth,
          endY: Math.max(p1.y, p2.y) + roadWidth,
          leftX: Math.min(p1.x, p2.x) - roadWidth,
          rightX: Math.max(p1.x, p2.x) + roadWidth
        });
      }

      this.add.text(entryPisteX + (onLeft ? -tileSize * 3 : tileSize * 3), entryY,
        '🚜 ' + (t('accessPath') || 'Service Road'), {
        fontSize: '9px',
        color: '#FFAA00',
        backgroundColor: '#332200',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setAlpha(0.9).setDepth(10);

      this.add.text(exitPisteX + (onLeft ? -tileSize * 3 : tileSize * 3), exitY,
        '↓ ' + (t('toPiste') || 'To Piste'), {
        fontSize: '9px',
        color: '#44FF44',
        backgroundColor: '#003300',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setAlpha(0.9).setDepth(10);
    });
  }

  private createServiceRoadPole(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(8);

    const poleHeight = 14;
    const poleWidth = 3;
    const stripeHeight = 3;

    for (let i = 0; i < poleHeight; i += stripeHeight) {
      const isOrange = (Math.floor(i / stripeHeight) % 2 === 0);
      g.fillStyle(isOrange ? 0xFF6600 : 0x111111, 1);
      g.fillRect(x - poleWidth / 2, y - poleHeight + i, poleWidth, stripeHeight);
    }

    g.fillStyle(0xFF6600, 1);
    g.fillCircle(x, y - poleHeight, poleWidth);
  }

  private createWinchAnchors(): void {
    const tileSize = this.tileSize;
    const anchorDefs = this.level.winchAnchors || [];

    this.winchAnchors = [];

    this.winchCableGraphics = this.add.graphics();
    this.winchCableGraphics.setDepth(50);

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

    g.fillStyle(0x666666, 1);
    g.fillRect(x - 10, y + 5, 20, 8);

    g.fillStyle(0xFFAA00, 1);
    g.fillRect(x - 4, y - 20, 8, 28);

    g.lineStyle(3, 0xCCCCCC, 1);
    g.strokeCircle(x, y - 22, 6);

    g.fillStyle(0xAAAAAA, 1);
    g.fillRect(x - 2, y - 28, 4, 8);

    this.add.text(x, y + 18, '⚓' + number, {
      fontSize: '9px',
      color: '#FFD700',
      backgroundColor: '#333333',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5);

    this.winchAnchors.push({ x, y: y - 22, number });
  }

  private getNearestAnchor(): WinchAnchor | null {
    if (!this.winchAnchors || this.winchAnchors.length === 0) return null;

    let nearest: WinchAnchor | null = null;
    let nearestDist = Infinity;

    this.winchAnchors.forEach(anchor => {
      const dist = Phaser.Math.Distance.Between(
        this.groomer.x, this.groomer.y,
        anchor.x, anchor.y
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = anchor;
      }
    });

    return nearest;
  }

  private updateWinch(): void {
    if (!this.level.hasWinch) return;

    // Check touch input from HUDScene
    const hudScene = this.scene.get('HUDScene') as HUDScene;
    const touchWinch = hudScene?.touchWinch ?? false;

    // Gamepad L1/LB (button 4) for winch
    const gamepadWinch = this.gamepad?.L1 ?? false;

    const isWinchPressed = this.winchKey.isDown || touchWinch || gamepadWinch;

    if (isWinchPressed && !this.winchActive) {
      this.winchAnchor = this.getNearestAnchor();
      if (this.winchAnchor) {
        this.winchActive = true;
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
      this.winchCableGraphics.lineStyle(3, 0x888888, 1);
      this.winchCableGraphics.beginPath();
      this.winchCableGraphics.moveTo(this.winchAnchor.x, this.winchAnchor.y);
      this.winchCableGraphics.lineTo(this.groomer.x, this.groomer.y - 10);
      this.winchCableGraphics.strokePath();

      const dist = Phaser.Math.Distance.Between(
        this.groomer.x, this.groomer.y,
        this.winchAnchor.x, this.winchAnchor.y
      );
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
      this.winchCableGraphics.moveTo(this.winchAnchor.x, this.winchAnchor.y);
      this.winchCableGraphics.lineTo(this.groomer.x, this.groomer.y - 10);
      this.winchCableGraphics.strokePath();
    }
  }

  private createAvalancheZones(): void {
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;

    this.avalancheGroup = this.physics.add.staticGroup();

    const zoneCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < zoneCount; i++) {
      const zoneX = Phaser.Math.Between(
        this.tileSize * 5,
        worldWidth - this.tileSize * 5
      );
      const zoneY = Phaser.Math.Between(
        worldHeight * 0.2,
        worldHeight * 0.6
      );
      const zoneWidth = Phaser.Math.Between(this.tileSize * 4, this.tileSize * 8);
      const zoneHeight = Phaser.Math.Between(this.tileSize * 6, this.tileSize * 12);

      const zoneVisual = this.add.rectangle(
        zoneX, zoneY, zoneWidth, zoneHeight,
        0xFFEEDD, 0.08
      );

      const signY = zoneY - zoneHeight / 2 - 10;
      this.createAvalancheSign(zoneX, signY);

      const poleSpacing = zoneWidth / 3;
      for (let p = 0; p < 3; p++) {
        const poleX = zoneX - zoneWidth / 2 + poleSpacing / 2 + p * poleSpacing;
        this.createBarrierPole(poleX, zoneY - zoneHeight / 2 + 10);
      }

      const ropeGraphics = this.add.graphics();
      ropeGraphics.lineStyle(2, 0x000000, 0.6);
      ropeGraphics.beginPath();
      ropeGraphics.moveTo(zoneX - zoneWidth / 2 + 5, zoneY - zoneHeight / 2 + 15);
      ropeGraphics.lineTo(zoneX + zoneWidth / 2 - 5, zoneY - zoneHeight / 2 + 15);
      ropeGraphics.strokePath();

      this.createRiskIndicator(zoneX + zoneWidth / 2 + 15, zoneY - zoneHeight / 2 + 30);

      this.add.text(zoneX, zoneY + zoneHeight / 2 + 8, '🚫 ZONE FERMÉE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#CC0000',
        backgroundColor: '#FFFFFF',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5).setAlpha(0.9);

      const zone = this.add.rectangle(
        zoneX, zoneY, zoneWidth * 0.8, zoneHeight * 0.8,
        0x000000, 0
      ) as AvalancheZone;
      this.physics.add.existing(zone, true);
      zone.avalancheRisk = 0;
      zone.zoneVisual = zoneVisual;
      this.avalancheGroup.add(zone);
      this.avalancheZones.push(zone);
    }

    this.physics.add.overlap(
      this.groomer,
      this.avalancheGroup,
      this.handleAvalancheZone as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private createAvalancheSign(x: number, y: number): void {
    const signSize = 20;
    const g = this.add.graphics();

    g.fillStyle(0xFFCC00, 1);
    g.lineStyle(2, 0x000000, 1);
    g.beginPath();
    g.moveTo(x, y - signSize / 2);
    g.lineTo(x + signSize / 2, y);
    g.lineTo(x, y + signSize / 2);
    g.lineTo(x - signSize / 2, y);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x000000, 1);
    g.beginPath();
    g.moveTo(x, y - 4);
    g.lineTo(x + 6, y + 5);
    g.lineTo(x - 6, y + 5);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, 0x000000, 1);
    g.beginPath();
    g.moveTo(x + 2, y - 1);
    g.lineTo(x + 5, y + 3);
    g.strokePath();

    g.fillStyle(0x4a3728, 1);
    g.fillRect(x - 2, y + signSize / 2, 4, 12);
  }

  private createBarrierPole(x: number, y: number): void {
    const g = this.add.graphics();

    g.fillStyle(0x5a4332, 1);
    g.fillRect(x - 2, y, 4, 25);

    const flagWidth = 12;
    const flagHeight = 8;
    g.fillStyle(0xFF6600, 1);
    g.fillRect(x + 2, y + 2, flagWidth, flagHeight);

    g.fillStyle(0x000000, 1);
    g.beginPath();
    g.moveTo(x + 2, y + 2 + flagHeight);
    g.lineTo(x + 2 + flagWidth / 2, y + 2);
    g.lineTo(x + 2 + flagWidth, y + 2);
    g.lineTo(x + 2 + flagWidth, y + 2 + flagHeight / 2);
    g.closePath();
    g.fillPath();
  }

  private createRiskIndicator(x: number, y: number): void {
    const g = this.add.graphics();
    const boxSize = 14;

    g.fillStyle(0xFFFFFF, 0.9);
    g.fillRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize + 10);

    g.fillStyle(0xFF6600, 1);
    g.fillRect(x - boxSize / 2 + 2, y - boxSize / 2 + 2, boxSize - 4, boxSize - 4);

    this.add.text(x, y, '4', {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#000000'
    }).setOrigin(0.5);

    this.add.text(x, y + 10, 'FORT', {
      fontFamily: 'Arial',
      fontSize: '5px',
      color: '#000000'
    }).setOrigin(0.5);
  }

  private handleAvalancheZone(_groomer: Phaser.GameObjects.GameObject, zoneObj: Phaser.GameObjects.GameObject): void {
    if (this.isGameOver || this.avalancheTriggered) return;

    const zone = zoneObj as AvalancheZone;
    zone.avalancheRisk += 0.015;

    const riskAlpha = 0.05 + zone.avalancheRisk * 0.4;
    zone.zoneVisual.setFillStyle(0xFF2200, Math.min(0.5, riskAlpha));

    if (this.isGrooming) {
      zone.avalancheRisk += 0.04;
    }

    if (zone.avalancheRisk > 0.5 && zone.avalancheRisk < 0.55) {
      this.cameras.main.shake(200, 0.005);
    }
    if (zone.avalancheRisk > 0.8 && zone.avalancheRisk < 0.85) {
      this.cameras.main.shake(300, 0.01);
      this.showDialogue('avalancheWarning');
    }

    if (zone.avalancheRisk >= 1) {
      this.triggerAvalanche();
    }
  }

  private triggerAvalanche(): void {
    if (this.avalancheTriggered) return;
    this.avalancheTriggered = true;

    this.cameras.main.shake(1000, 0.02);

    const avalancheParticles = this.add.particles(0, 0, 'snow_ungroomed', {
      x: { min: 0, max: this.level.width * this.tileSize },
      y: -50,
      lifespan: 2000,
      speedY: { min: 400, max: 600 },
      speedX: { min: -50, max: 50 },
      scale: { start: 0.8, end: 0.3 },
      alpha: { start: 1, end: 0.5 },
      quantity: 20,
      frequency: 30,
      tint: 0xFFFFFF
    });

    this.showDialogue('avalancheTrigger');

    this.time.delayedCall(2000, () => {
      avalancheParticles.destroy();
      this.gameOver(false, 'avalanche');
    });
  }

  private getDifficultyColor(): number {
    switch (this.level.difficulty) {
      case 'tutorial':
      case 'green': return 0x22AA22;
      case 'blue': return 0x2266CC;
      case 'red': return 0xCC2222;
      case 'black': return 0x111111;
      case 'park': return 0xFF8800;
      default: return 0x888888;
    }
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

      let texture = 'tree';
      if (type === 'rocks') texture = 'rock';

      const obstacle = this.obstacles.create(x, y, texture);
      obstacle.setImmovable(true);
      obstacle.setScale(this.tileSize / 16);
    }

    const restaurant = this.interactables.create(
      worldWidth / 2 - this.tileSize * 4,
      this.tileSize * 2,
      'restaurant'
    );
    restaurant.interactionType = 'food';
    restaurant.setScale(this.tileSize / 16);

    // Fuel station at bottom of level (maintenance area in resort)
    const fuelStation = this.interactables.create(
      worldWidth / 2 + this.tileSize * 4,
      worldHeight - this.tileSize * 3,
      'fuel'
    );
    fuelStation.interactionType = 'fuel';
    fuelStation.setScale(this.tileSize / 16);

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

      this.createChalet(x, yPos);
    }
  }

  private createChalet(x: number, y: number): void {
    const g = this.add.graphics();
    const size = this.tileSize * 2;

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
    this.groomer.setDrag(200);
    this.groomer.setScale(this.tileSize / 16);

    this.physics.add.collider(this.groomer, this.obstacles);
    this.physics.add.collider(this.groomer, this.boundaryWalls);

    if (this.dangerZones && this.dangerZones.getLength() > 0) {
      this.physics.add.overlap(
        this.groomer,
        this.dangerZones,
        this.handleCliffFall as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }

    this.physics.add.overlap(
      this.groomer,
      this.interactables,
      this.handleInteraction as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private handleCliffFall(): void {
    if (this.isGameOver || this.isFallingOffCliff) return;
    this.isFallingOffCliff = true;
    
    // Clear winch state
    this.winchActive = false;
    this.winchAnchor = null;
    if (this.winchCableGraphics) {
      this.winchCableGraphics.clear();
    }

    this.showDialogue('cliffFall');
    this.time.delayedCall(1500, () => {
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
    }

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.input.activePointer.id !== 0) {
        // Touch joystick logic placeholder
      }
    });
  }

  private loadKeyBindings(): { up: number; down: number; left: number; right: number; groom: number; winch: number } {
    const BINDINGS_VERSION = 2; // Must match SettingsScene
    const savedVersion = localStorage.getItem('snowGroomer_bindingsVersion');
    const saved = localStorage.getItem('snowGroomer_bindings');
    
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

  private createNightOverlay(): void {
    const darkness = this.add.graphics();
    darkness.fillStyle(0x000000, 0.7);
    darkness.fillRect(0, 0,
      this.level.width * this.tileSize,
      this.level.height * this.tileSize
    );

    darkness.setScrollFactor(0);
    darkness.setDepth(100);
  }

  private createWeatherEffects(): void {
    if (Accessibility.settings.reducedMotion) return;

    const isStorm = this.level.weather === 'storm';
    const isLightSnow = this.level.weather === 'light_snow';

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

    this.weatherParticles = this.add.particles(0, 0, 'snow_ungroomed', {
      x: { min: 0, max: this.cameras.main.width * 1.5 },
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
    this.weatherParticles.setDepth(200);

    if (isStorm) {
      this.windStreaks = this.add.particles(0, 0, 'snow_ungroomed', {
        x: { min: this.cameras.main.width, max: this.cameras.main.width + 100 },
        y: { min: 0, max: this.cameras.main.height },
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
      this.windStreaks.setDepth(199);
    }
  }

  private gamepadStartPressed = false;
  
  update(_time: number, delta: number): void {
    // Check gamepad Start button for pause (with debounce)
    if (this.gamepad) {
      const startPressed = this.gamepad.buttons[9]?.pressed ?? false; // Start button
      if (startPressed && !this.gamepadStartPressed && !this.isGameOver) {
        this.pauseGame();
      }
      this.gamepadStartPressed = startPressed;
    }
    
    if (this.scene.isPaused() || this.isGameOver || this.isTransitioning) return;

    this.handleMovement();
    this.handleGrooming();
    this.updateWinch();
    this.checkSteepness();
    this.updateResources(delta);
    this.checkTutorialProgress();
    this.checkWinCondition();
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
          this.steepWarningShown = false;
          return;
        }
      }
    }

    for (const zone of this.steepZoneRects) {
      if (groomerY >= zone.startY && groomerY <= zone.endY &&
        groomerX >= zone.leftX && groomerX <= zone.rightX) {

        if (!this.winchActive) {
          if (zone.slope >= 40) {
            this.triggerTumble(zone.slope);
            return;
          }
          else if (zone.slope >= 30) {
            const slideSpeed = (zone.slope - 25) * 2;
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

    this.steepWarningShown = false;
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

    this.cameras.main.shake(500, 0.015);

    this.tweens.add({
      targets: this.groomer,
      rotation: this.groomer.rotation + Math.PI * 4,
      duration: 1500,
      ease: 'Power2'
    });

    this.groomer.setVelocity(0, 300);

    this.showDialogue('tumble');

    this.time.delayedCall(2000, () => {
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

    const speed = GAME_CONFIG.GROOMER_SPEED * (this.buffs.speed ? 1.5 : 1);

    let vx = 0;
    let vy = 0;

    // Keyboard input
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Touch input from HUDScene
    const hudScene = this.scene.get('HUDScene') as HUDScene;
    if (hudScene) {
      if (hudScene.touchLeft) vx = -speed;
      if (hudScene.touchRight) vx = speed;
      if (hudScene.touchUp) vy = -speed;
      if (hudScene.touchDown) vy = speed;
    }

    if (this.gamepad) {
      const threshold = 0.2;
      if (Math.abs(this.gamepad.leftStick.x) > threshold) {
        vx = this.gamepad.leftStick.x * speed;
      }
      if (Math.abs(this.gamepad.leftStick.y) > threshold) {
        vy = this.gamepad.leftStick.y * speed;
      }
      if (this.gamepad.A) this.isGrooming = true;
    }

    if (this.winchActive && this.winchAnchor) {
      const dx = this.winchAnchor.x - this.groomer.x;
      const dy = this.winchAnchor.y - this.groomer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 50) {
        const winchForce = 0.3;
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
      return;
    }

    // Check touch input from HUDScene
    const hudScene = this.scene.get('HUDScene') as HUDScene;
    const touchGroom = hudScene?.touchGroom ?? false;

    this.isGrooming = this.groomKey.isDown || (this.gamepad !== null && this.gamepad.A) || touchGroom;

    if (this.isGrooming && this.fuel > 0) {
      this.groomAtPosition(this.groomer.x, this.groomer.y);
    }
  }

  private groomAtPosition(x: number, y: number): void {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    
    // Low stamina reduces grooming effectiveness (smaller radius)
    const staminaFactor = this.stamina > 30 ? 1 : (0.5 + this.stamina / 60);
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
            if (this.highContrastMode) {
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
  }

  private updateResources(delta: number): void {
    const dt = delta / 1000;
    const isMoving = (this.groomer.body as Phaser.Physics.Arcade.Body).velocity.length() > 0;

    if (isMoving) {
      this.fuel -= GAME_CONFIG.FUEL_CONSUMPTION * dt * 100;
      
      // Stamina drain varies based on work difficulty
      let staminaDrain = GAME_CONFIG.STAMINA_CONSUMPTION;
      
      // Check if on steep terrain
      const currentSlope = this.getSlopeAtPosition(this.groomer.x, this.groomer.y);
      const isOnSteep = currentSlope >= 30;
      
      if (this.winchActive) {
        // Winch does the work - minimal operator effort
        staminaDrain *= 0.3;
      } else if (isOnSteep) {
        // Fighting gravity without winch - exhausting!
        staminaDrain *= 3.0;
      }
      
      if (this.isGrooming) {
        // Operating the tiller adds effort
        staminaDrain *= 1.5;
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
      this.stamina = Math.min(100, this.stamina + 0.1);
    }

    if (this.isGameOver) return;

    if (this.fuel <= 0) {
      this.fuel = 0;
      this.showDialogue('fuelEmpty');
      this.time.delayedCall(1500, () => {
        this.gameOver(false, 'fuel');
      });
    } else if (this.timeRemaining <= 0) {
      this.gameOver(false, 'time');
    }
  }

  private updateTimer(): void {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      this.events.emit('timerUpdate', this.timeRemaining);
    }
  }

  private handleInteraction(_groomer: Phaser.GameObjects.GameObject, interactableObj: Phaser.GameObjects.GameObject): void {
    const interactable = interactableObj as Phaser.Physics.Arcade.Sprite & { interactionType: string };
    // Use groomer position for feedback (where player is looking)
    const feedbackX = this.groomer.x;
    const feedbackY = this.groomer.y;
    
    if (interactable.interactionType === 'fuel') {
      if (this.fuel < 100) {
        this.fuel = Math.min(100, this.fuel + 0.5);
        this.showInteractionFeedback(feedbackX, feedbackY, '🛢️', 0x44aaff, 28);
      }
    } else if (interactable.interactionType === 'food') {
      // Restore stamina and give regen buff when visiting Chez Marie
      if (!this.buffs.staminaRegen) {
        this.stamina = 100;
        this.buffs.staminaRegen = 60000; // 60 second regen buff
        Accessibility.announce(t('marieWelcome'));
        this.showInteractionFeedback(feedbackX, feedbackY, '🧀 Reblochon!', 0xffdd44, 32, true);
      } else if (this.stamina < 100) {
        // If already have buff, just top up stamina
        this.stamina = Math.min(100, this.stamina + 0.3);
        this.showInteractionFeedback(feedbackX, feedbackY, '🧀', 0xffdd44, 24);
      }
    }
  }

  private lastFeedbackTime = 0;
  private showInteractionFeedback(x: number, y: number, text: string, color: number, fontSize = 24, forceShow = false): void {
    const now = Date.now();
    // Throttle feedback to avoid spam (except for forceShow)
    if (!forceShow && now - this.lastFeedbackTime < 500) return;
    this.lastFeedbackTime = now;

    const feedback = this.add.text(x, y - 30, text, {
      fontSize: fontSize + 'px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: feedback,
      y: y - 70,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => feedback.destroy(),
    });
  }

  getCoverage(): number {
    return Math.round((this.groomedCount / this.totalTiles) * 100);
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
        this.showDialogue(step.dialogue);
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
    this.cameras.main.flash(300, 255, 255, 255, false);

    // Brief camera zoom on groomer
    if (!Accessibility.settings.reducedMotion) {
      this.cameras.main.zoomTo(1.2, 500, 'Power2');
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
    ).setOrigin(0.5).setDepth(500);

    // Fade in text
    victoryText.setAlpha(0);
    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // Delay before transitioning to level complete screen
    this.time.delayedCall(1500, () => {
      this.gameOver(true);
    });
  }

  private showDialogue(key: string): void {
    // On touch-only devices, use touch-specific tutorial messages if available
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isTouchOnly = isMobile && hasTouch;
    
    let dialogueKey = key;
    if (isTouchOnly) {
      // Check if touch-specific version exists
      const touchKey = key + 'Touch';
      if (t(touchKey) !== touchKey) {
        dialogueKey = touchKey;
      }
    }
    
    (this.scene.get('DialogueScene') as DialogueScene).showDialogue(dialogueKey);
  }

  pauseGame(): void {
    this.scene.pause();
    this.scene.launch('PauseScene', { gameScene: this });
    this.scene.bringToTop('PauseScene');
  }

  resumeGame(): void {
    this.scene.resume();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;
    
    // Calculate the world size based on original tile size
    const worldWidth = this.level.width * this.tileSize;
    const worldHeight = this.level.height * this.tileSize;
    
    // Calculate zoom to fit world in new viewport
    // Use margins similar to original calculation
    const marginX = 50;
    const marginY = 100;
    const availableWidth = width - marginX * 2;
    const availableHeight = height - marginY;
    
    const zoomX = availableWidth / worldWidth;
    const zoomY = availableHeight / worldHeight;
    const zoom = Math.min(zoomX, zoomY, 1.5); // Cap zoom at 1.5x
    
    // Apply zoom
    this.cameras.main.setZoom(zoom);
    
    // Recalculate world offset for centering
    const scaledWorldWidth = worldWidth * zoom;
    const scaledWorldHeight = worldHeight * zoom;
    const newOffsetX = Math.max(0, (width - scaledWorldWidth) / 2);
    const newOffsetY = Math.max(marginY / 2, (height - scaledWorldHeight) / 2);
    
    // Update camera bounds
    this.cameras.main.setBounds(
      -newOffsetX / zoom,
      -newOffsetY / zoom,
      worldWidth + (newOffsetX * 2) / zoom,
      worldHeight + (newOffsetY * 2) / zoom
    );
    
    // Ensure camera follows groomer
    if (this.groomer) {
      this.cameras.main.startFollow(this.groomer, true, 0.1, 0.1);
      this.cameras.main.centerOn(this.groomer.x, this.groomer.y);
    }
    
    // Restart HUD to recalculate layout
    if (this.scene.isActive('HUDScene')) {
      this.scene.stop('HUDScene');
      this.scene.launch('HUDScene', { level: this.level, gameScene: this });
      // HUD must be on top for input priority over DialogueScene
      this.scene.bringToTop('HUDScene');
    }
  }

  gameOver(won: boolean, failReason: string | null = null): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');

    this.scene.start('LevelCompleteScene', {
      won: won,
      level: this.levelIndex,
      coverage: this.getCoverage(),
      timeUsed: this.level.timeLimit - this.timeRemaining,
      failReason: failReason
    });
  }

  transitionToLevel(nextLevel: number): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isGameOver = true;

    // Save progress when advancing to next level
    saveProgress(nextLevel);

    console.log('GameScene.transitionToLevel:', nextLevel);

    const game = this.game;

    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('GameScene');

    setTimeout(() => {
      console.log('GameScene.transitionToLevel: removing and restarting scenes for level', nextLevel);

      try {
        game.scene.remove('HUDScene');
        game.scene.remove('DialogueScene');
        game.scene.remove('GameScene');
      } catch (e) {
        if (e instanceof Error) {
          console.warn('Scene removal warning:', e.message);
        }
      }

      game.scene.add('GameScene', GameScene, false);
      game.scene.add('HUDScene', HUDScene, false);
      game.scene.add('DialogueScene', DialogueScene, false);

      game.scene.start('GameScene', { level: nextLevel });
    }, 100);
  }

  returnToMenu(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isGameOver = true;

    const game = this.game;

    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('GameScene');

    setTimeout(() => {
      try {
        game.scene.remove('HUDScene');
        game.scene.remove('DialogueScene');
        game.scene.remove('GameScene');
      } catch (e) {
        if (e instanceof Error) {
          console.warn('Scene removal warning:', e.message);
        }
      }

      game.scene.add('GameScene', GameScene, false);
      game.scene.add('HUDScene', HUDScene, false);
      game.scene.add('DialogueScene', DialogueScene, false);

      game.scene.start('MenuScene');
    }, 100);
  }

  shutdown(): void {
    console.log('GameScene.shutdown');

    this.tweens.killAll();
    this.time.removeAllEvents();

    this.children.removeAll(true);

    this.winchCableGraphics = null;
    this.weatherParticles = null;
    this.windStreaks = null;
  }
}
