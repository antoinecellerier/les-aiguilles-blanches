import Phaser from 'phaser';
import { Accessibility, setLanguage, detectLanguage } from '../setup';
import { detectKeyboardLayout } from '../utils/keyboardLayout';
import { parseShareParams, clearShareParams } from '../utils/shareUrl';
import { createSkierTexture, createSkierLeftTexture, createSkierRightTexture, createSkierBrakeTexture, createSkierTuckTexture, createSnowboarderTexture, createSnowboarderLeftTexture, createSnowboarderRightTexture, createSnowboarderBrakeTexture, createSnowboarderTuckTexture } from '../utils/skiSprites';
import { BALANCE } from '../config/gameConfig';
import { NIGHT_SUFFIX, NIGHT_TEXTURE_KEYS } from '../utils/nightPalette';

/**
 * Les Aiguilles Blanches - Boot Scene
 * Initial loading and asset preloading
 */

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px Courier New',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x87ceeb, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create(): void {
    try {
      // Initialize accessibility
      Accessibility.init();
      Accessibility.loadSettings();

      // Detect and set language
      setLanguage(detectLanguage());

      // Detect keyboard layout (async, but we don't wait - it caches for later use)
      detectKeyboardLayout().catch(e => console.warn('Keyboard layout detection failed:', e));

      // Generate placeholder textures
      this.generateTextures();

      // Start menu (or daily runs if share URL detected)
      if ((window as any)._loadFallbackTimer) clearTimeout((window as any)._loadFallbackTimer);

      const shareParams = parseShareParams();
      if (shareParams) {
        clearShareParams();
        // Always route to DailyRunsScene — it handles the locked state itself
        this.scene.start('DailyRunsScene', {
          seedCode: shareParams.seedCode,
          rank: shareParams.rank,
        });
      } else {
        this.scene.start('MenuScene');
      }
    } catch (error) {
      console.error('BootScene error:', error);
      const message = error instanceof Error ? error.message : String(error);
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'Error: ' + message,
        { font: '16px Courier New', color: '#ff0000' }
      ).setOrigin(0.5);

      const link = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 30,
        'Report issue on GitHub',
        { font: '14px Courier New', color: '#87CEEB' }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });
      link.on('pointerover', () => link.setColor('#FFD700'));
      link.on('pointerout', () => link.setColor('#87CEEB'));
      link.on('pointerup', () => {
        window.open('https://github.com/antoinecellerier/les-aiguilles-blanches/issues', '_blank', 'noopener,noreferrer');
      });
    }
  }

  private generateTextures(): void {
    // Groomer sprite (top-down view, 36x58px, centered on 36px width)
    // Layout: tiller at top (rear), tracks+body middle, blade at bottom (front)
    const groomerGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    const xo = 2; // X offset to center 32px body in 36px texture
    // Rear tiller — finisher comb at very top (wider than body, centered)
    groomerGraphics.fillStyle(0x999999);
    for (let tx = 1; tx < 35; tx += 3) {
      groomerGraphics.fillRect(tx, 0, 1, 3); // Comb teeth
    }
    groomerGraphics.fillStyle(0x888888);
    groomerGraphics.fillRect(0, 2, 36, 2); // Comb bar
    // Tiller drum
    groomerGraphics.fillStyle(0x555555);
    groomerGraphics.fillRect(1, 4, 34, 3); // Drum body
    groomerGraphics.fillStyle(0x666666);
    for (let tx = 2; tx < 34; tx += 4) {
      groomerGraphics.fillRect(tx, 4, 2, 3); // Teeth detail
    }
    // Tiller arm connecting to body
    groomerGraphics.fillStyle(0x777777);
    groomerGraphics.fillRect(xo + 2, 7, 28, 3);
    // --- Original groomer shifted down by 10px, right by 2px ---
    const yo = 10; // Y offset for tiller space
    // Tracks (left and right)
    groomerGraphics.fillStyle(0x333333);
    groomerGraphics.fillRect(xo, yo, 8, 40);
    groomerGraphics.fillRect(xo + 24, yo, 8, 40);
    // Body
    groomerGraphics.fillStyle(0xcc2200);
    groomerGraphics.fillRect(xo + 4, yo + 5, 24, 25);
    // Cabin window frame
    groomerGraphics.fillStyle(0x1e90ff);
    groomerGraphics.fillRect(xo + 8, yo + 10, 16, 12);
    // Window glass
    groomerGraphics.fillStyle(0x87ceeb);
    groomerGraphics.fillRect(xo + 10, yo + 12, 12, 6);
    // Undercarriage
    groomerGraphics.fillStyle(0x888888);
    groomerGraphics.fillRect(xo + 2, yo + 38, 28, 6);
    // Front blade
    groomerGraphics.fillStyle(0x666666);
    groomerGraphics.fillRect(xo, yo + 44, 32, 4);
    groomerGraphics.generateTexture('groomer', 36, 58);
    // Storm variant: same groomer with snow on roof and body
    groomerGraphics.fillStyle(0xf0f5f8);
    groomerGraphics.fillRect(xo + 4, yo + 5, 24, 2);   // body top
    groomerGraphics.fillRect(xo + 8, yo + 10, 16, 2);   // cabin top
    groomerGraphics.generateTexture('groomer_storm', 36, 58);
    groomerGraphics.destroy();

    // Skier & snowboarder sprites (for reward run — 3 orientations + brake each)
    createSkierTexture(this);
    createSkierLeftTexture(this);
    createSkierRightTexture(this);
    createSkierBrakeTexture(this);
    createSkierTuckTexture(this);
    createSnowboarderTexture(this);
    createSnowboarderLeftTexture(this);
    createSnowboarderRightTexture(this);
    createSnowboarderBrakeTexture(this);
    createSnowboarderTuckTexture(this);

    // Tree sprite
    const treeGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    treeGraphics.fillStyle(0x228b22);
    treeGraphics.fillRect(10, 0, 10, 8);
    treeGraphics.fillRect(6, 8, 18, 8);
    treeGraphics.fillRect(2, 16, 26, 10);
    treeGraphics.fillStyle(0x8b4513);
    treeGraphics.fillRect(12, 26, 6, 14);
    treeGraphics.generateTexture('tree', 30, 40);
    treeGraphics.destroy();

    // Rock sprite
    const rockGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    rockGraphics.fillStyle(0x696969);
    rockGraphics.fillRect(2, 4, 20, 10);
    rockGraphics.fillRect(6, 2, 12, 14);
    rockGraphics.fillStyle(0x888888);
    rockGraphics.fillRect(6, 4, 6, 4);
    rockGraphics.generateTexture('rock', 24, 16);
    rockGraphics.destroy();

    // Restaurant sprite
    const restGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    restGraphics.fillStyle(0xa52a2a);
    restGraphics.fillRect(0, 0, 60, 15);
    restGraphics.fillStyle(0x8b4513);
    restGraphics.fillRect(5, 15, 50, 30);
    restGraphics.fillStyle(0xffff00);
    restGraphics.fillRect(22, 25, 16, 12);
    restGraphics.generateTexture('restaurant', 60, 50);
    restGraphics.destroy();

    // Fuel station sprite - simplified gas pump
    const fuelGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    // Pump body (red)
    fuelGraphics.fillStyle(0xcc2222);
    fuelGraphics.fillRect(8, 8, 24, 32);
    // Pump top (darker red roof)
    fuelGraphics.fillStyle(0x991111);
    fuelGraphics.fillRect(6, 4, 28, 6);
    // Display panel (white/gray)
    fuelGraphics.fillStyle(0xeeeeee);
    fuelGraphics.fillRect(12, 12, 16, 10);
    // Nozzle holder (black)
    fuelGraphics.fillStyle(0x333333);
    fuelGraphics.fillRect(30, 18, 8, 4);
    // Hose (black line to nozzle)
    fuelGraphics.lineStyle(2, 0x333333);
    fuelGraphics.lineBetween(34, 22, 38, 28);
    // Nozzle tip
    fuelGraphics.fillStyle(0x333333);
    fuelGraphics.fillRect(36, 26, 4, 8);
    // Base (gray concrete)
    fuelGraphics.fillStyle(0x666666);
    fuelGraphics.fillRect(4, 38, 32, 4);
    fuelGraphics.generateTexture('fuel', 44, 44);
    fuelGraphics.destroy();

    // Ungroomed snow tile
    const snowGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    snowGraphics.fillStyle(0xe8eff3);
    snowGraphics.fillRect(0, 0, 16, 16);
    snowGraphics.fillStyle(0xd8e2e8);
    snowGraphics.fillRect(2, 2, 3, 3);
    snowGraphics.fillRect(9, 5, 4, 3);
    snowGraphics.fillRect(4, 10, 3, 4);
    snowGraphics.fillRect(11, 11, 3, 3);
    snowGraphics.generateTexture('snow_ungroomed', 16, 16);
    snowGraphics.destroy();

    // Off-piste snow — slightly darker than piste tiles for contrast (accessibility)
    const offPisteGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    offPisteGraphics.fillStyle(0xdce6ec);  // Darker base than piste snow
    offPisteGraphics.fillRect(0, 0, 16, 16);
    // Irregular snow mounds
    offPisteGraphics.fillStyle(0xe4ecf0);
    offPisteGraphics.fillRect(1, 1, 4, 3);
    offPisteGraphics.fillRect(8, 2, 5, 4);
    offPisteGraphics.fillRect(3, 7, 6, 4);
    offPisteGraphics.fillRect(11, 9, 4, 5);
    offPisteGraphics.fillRect(0, 12, 3, 3);
    // Subtle shadows/depth
    offPisteGraphics.fillStyle(0xccd8e2);
    offPisteGraphics.fillRect(5, 3, 2, 2);
    offPisteGraphics.fillRect(13, 5, 2, 3);
    offPisteGraphics.fillRect(9, 11, 2, 2);
    offPisteGraphics.fillRect(2, 9, 1, 2);
    offPisteGraphics.generateTexture('snow_offpiste', 16, 16);
    offPisteGraphics.destroy();

    // Groomed snow tile
    const groomedGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    groomedGraphics.fillStyle(0xffffff);
    groomedGraphics.fillRect(0, 0, 16, 16);
    groomedGraphics.fillStyle(0xe8f0f8);
    groomedGraphics.fillRect(0, 2, 16, 1);
    groomedGraphics.fillRect(0, 5, 16, 1);
    groomedGraphics.fillRect(0, 8, 16, 1);
    groomedGraphics.fillRect(0, 11, 16, 1);
    groomedGraphics.fillRect(0, 14, 16, 1);
    groomedGraphics.generateTexture('snow_groomed', 16, 16);
    groomedGraphics.destroy();

    // Steep-zone snow variants — palette-matched colors
    // Slide zones (25°–35°): warm blue-gray, like shadowed snow
    // Tumble zones (40°–50°): cold icy blue, like glacial ice
    const steepPalette: Record<number, { base: number; detail: number; groomBase: number; groomLine: number }> = {
      // Slide zones: warm blue-gray (subtle shadow feel)
      25: { base: 0xd0dee6, detail: 0xc0ced6, groomBase: 0xeef3f8, groomLine: 0xdde6ee },
      30: { base: 0xc8d8e2, detail: 0xb8c8d2, groomBase: 0xe8eff6, groomLine: 0xd6e0ea },
      35: { base: 0xc0d2de, detail: 0xb0c2ce, groomBase: 0xe2ebf4, groomLine: 0xd0dae6 },
      // Tumble zones: cold icy blue (glacial, desaturated)
      40: { base: 0xb8d8ee, detail: 0xa8c8de, groomBase: 0xdcecfa, groomLine: 0xc8dcee },
      45: { base: 0xaed0ea, detail: 0x9ec0da, groomBase: 0xd4e6f8, groomLine: 0xc0d4e8 },
      50: { base: 0xa4c8e6, detail: 0x94b8d6, groomBase: 0xcce0f4, groomLine: 0xb8cce2 },
    };

    for (const [slopeStr, pal] of Object.entries(steepPalette)) {
      const slope = Number(slopeStr);

      // Ungroomed steep variant
      const sg = this.make.graphics({ x: 0, y: 0 } as any, false);
      sg.fillStyle(pal.base);
      sg.fillRect(0, 0, 16, 16);
      sg.fillStyle(pal.detail);
      sg.fillRect(2, 2, 3, 3);
      sg.fillRect(9, 5, 4, 3);
      sg.fillRect(4, 10, 3, 4);
      sg.fillRect(11, 11, 3, 3);
      sg.generateTexture(`snow_steep_${slope}`, 16, 16);
      sg.destroy();

      // Groomed steep variant
      const gg = this.make.graphics({ x: 0, y: 0 } as any, false);
      gg.fillStyle(pal.groomBase);
      gg.fillRect(0, 0, 16, 16);
      gg.fillStyle(pal.groomLine);
      gg.fillRect(0, 2, 16, 1);
      gg.fillRect(0, 5, 16, 1);
      gg.fillRect(0, 8, 16, 1);
      gg.fillRect(0, 11, 16, 1);
      gg.fillRect(0, 14, 16, 1);
      gg.generateTexture(`snow_groomed_steep_${slope}`, 16, 16);
      gg.destroy();
    }

    // Medium-quality groomed snow (visible ridges, less uniform lines)
    const groomedMedGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    groomedMedGraphics.fillStyle(0xf8f8ff);
    groomedMedGraphics.fillRect(0, 0, 16, 16);
    groomedMedGraphics.fillStyle(0xdce6f0);
    groomedMedGraphics.fillRect(0, 2, 14, 1);
    groomedMedGraphics.fillRect(1, 5, 16, 1);
    groomedMedGraphics.fillRect(0, 9, 13, 1);
    groomedMedGraphics.fillRect(2, 13, 14, 1);
    groomedMedGraphics.generateTexture('snow_groomed_med', 16, 16);
    groomedMedGraphics.destroy();

    // Low-quality groomed snow (rough, uneven cross-hatching)
    const groomedRoughGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    groomedRoughGraphics.fillStyle(0xf0f0f8);
    groomedRoughGraphics.fillRect(0, 0, 16, 16);
    groomedRoughGraphics.fillStyle(0xd0dae4);
    groomedRoughGraphics.fillRect(1, 1, 6, 1);
    groomedRoughGraphics.fillRect(8, 3, 7, 1);
    groomedRoughGraphics.fillRect(0, 6, 5, 1);
    groomedRoughGraphics.fillRect(10, 7, 4, 1);
    groomedRoughGraphics.fillRect(3, 10, 8, 1);
    groomedRoughGraphics.fillRect(0, 13, 4, 1);
    groomedRoughGraphics.fillRect(11, 14, 5, 1);
    groomedRoughGraphics.generateTexture('snow_groomed_rough', 16, 16);
    groomedRoughGraphics.destroy();

    // Packed snow (service roads — compacted by vehicle traffic, smoother than off-piste)
    const packedGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    packedGraphics.fillStyle(0xe6eef3);  // Close to piste — compacted smooth snow
    packedGraphics.fillRect(0, 0, 16, 16);
    // Irregular tire/track marks
    packedGraphics.fillStyle(0xd8e4ea);
    packedGraphics.fillRect(2, 1, 3, 2);
    packedGraphics.fillRect(10, 4, 4, 2);
    packedGraphics.fillRect(1, 8, 5, 2);
    packedGraphics.fillRect(9, 11, 3, 3);
    // Lighter patches (exposed compressed snow)
    packedGraphics.fillStyle(0xeef4f8);
    packedGraphics.fillRect(6, 2, 3, 2);
    packedGraphics.fillRect(0, 5, 2, 2);
    packedGraphics.fillRect(12, 8, 3, 2);
    packedGraphics.fillRect(5, 12, 4, 2);
    packedGraphics.generateTexture('snow_packed', 16, 16);
    packedGraphics.destroy();

    // Park feature textures (used as invisible physics sprites — visuals drawn by ParkFeatureSystem)
    const kickerTex = this.make.graphics({ x: 0, y: 0 } as any, false);
    kickerTex.fillStyle(0xe8eef4, 0.01);
    kickerTex.fillRect(0, 0, 4, 4);
    kickerTex.generateTexture('park_kicker', 4, 4);
    kickerTex.destroy();

    const railTex = this.make.graphics({ x: 0, y: 0 } as any, false);
    railTex.fillStyle(0x888899, 0.01);
    railTex.fillRect(0, 0, 4, 4);
    railTex.generateTexture('park_rail', 4, 4);
    railTex.destroy();

    // Slalom gate poles — colored shaft with black base (French style)
    // 3px wide × 36px tall. Full color except bottom 6px black ground section.
    const sPolW = 3, sPolH = 36, sBaseH = 6;
    for (const [name, color] of [['slalom_red', 0xcc2222], ['slalom_blue', 0x1e90ff]] as const) {
      const g = this.make.graphics({ x: 0, y: 0 } as any, false);
      g.fillStyle(color);
      g.fillRect(0, 0, sPolW, sPolH - sBaseH);
      g.fillStyle(0x111111);
      g.fillRect(0, sPolH - sBaseH, sPolW, sBaseH);
      g.generateTexture(name, sPolW, sPolH);
      g.destroy();
    }

    // Tree textures — 4 size variants × 2 (normal/storm)
    // Sizes must match PisteRenderer.createTree()
    const treeSizes = [8, 10, 12, 14];
    for (const size of treeSizes) {
      const w = Math.ceil(size) + 2;
      const h = Math.ceil(size * 1.4) + 2;
      const cx = w / 2;  // center X
      const by = h - 1;  // base Y (bottom)

      const g = this.make.graphics({ x: 0, y: 0 } as any, false);
      // Trunk
      g.fillStyle(0x4a3728, 1);
      g.fillRect(cx - 2, by - size * 0.4, 4, size * 0.4);
      // Lower foliage
      g.fillStyle(0x1a4a2a, 1);
      g.fillRect(cx - size / 2, by - size * 0.4 - size * 0.5, size, size * 0.5);
      // Upper foliage
      g.fillRect(cx - size / 3, by - size * 0.4 - size, size * 0.66, size * 0.5);
      g.generateTexture(`tree_${size}`, w, h);

      // Storm variant: add snow lines
      g.fillStyle(0xf0f5f8, 1);
      g.fillRect(cx - size / 3, by - size * 0.4 - size, size * 0.66, 2);
      g.fillRect(cx - size / 2, by - size * 0.4 - size * 0.5, size, 2);
      g.generateTexture(`tree_${size}_storm`, w, h);
      g.destroy();
    }

    // Rock textures — 3 size variants
    // Sizes must match PisteRenderer.createRock()
    const rockSizes = [6, 10, 14];
    for (const size of rockSizes) {
      const w = Math.ceil(size) + 2;
      const h = Math.ceil(size * 0.6) + 2;
      const cx = w / 2;
      const cy = h / 2;

      const g = this.make.graphics({ x: 0, y: 0 } as any, false);
      g.fillStyle(0x6B6B6B, 1);
      g.fillRect(cx - size / 2, cy - size * 0.3, size, size * 0.6);
      g.fillStyle(0x8B8B8B, 1);
      g.fillRect(cx - size / 3, cy - size * 0.3, size * 0.3, size * 0.2);
      g.fillStyle(0x4A4A4A, 1);
      g.fillRect(cx, cy + size * 0.1, size * 0.4, size * 0.15);
      g.generateTexture(`rock_${size}`, w, h);
      g.destroy();
    }

    // Animal track textures — one per species
    // Size s=2 matches WildlifeSystem.leaveTrack()
    const trackSpecies = ['bunny', 'chamois', 'bouquetin', 'marmot', 'fox'];
    const trackS = 2;
    const trackPad = 2; // padding around shapes
    for (const species of trackSpecies) {
      const g = this.make.graphics({ x: 0, y: 0 } as any, false);
      // Translate so shapes drawn at origin end up centered in texture
      const texSize = Math.ceil(trackS * 4) + trackPad * 2;
      const cx = texSize / 2;
      const cy = texSize / 2;
      g.fillStyle(0xb8c4d0, 1);
      switch (species) {
        case 'bunny':
          g.fillEllipse(cx + trackS * 1.2, cy - trackS, trackS * 1.2, trackS * 2);
          g.fillEllipse(cx + trackS * 1.2, cy + trackS, trackS * 1.2, trackS * 2);
          g.fillCircle(cx - trackS * 1.0, cy - trackS * 0.2, trackS * 0.5);
          g.fillCircle(cx - trackS * 1.8, cy + trackS * 0.2, trackS * 0.5);
          break;
        case 'chamois':
        case 'bouquetin':
          g.fillEllipse(cx, cy - trackS * 0.5, trackS * 1.6, trackS * 0.5);
          g.fillEllipse(cx, cy + trackS * 0.5, trackS * 1.6, trackS * 0.5);
          break;
        case 'marmot':
          g.fillCircle(cx, cy - trackS * 0.3, trackS * 0.4);
          g.fillCircle(cx, cy + trackS * 0.3, trackS * 0.4);
          break;
        default: // fox and others
          g.fillCircle(cx, cy, trackS * 0.5);
          break;
      }
      g.generateTexture(`track_${species}`, texSize, texSize);
      g.destroy();
    }

    // Set nearest-neighbor scaling on all generated sprite textures
    // so they stay crisp when camera-zoomed (retro pixel art style).
    // Cannot use global pixelArt:true — it breaks Firefox Canvas renderer.
    const NEAREST = Phaser.ScaleModes.NEAREST;
    const spriteKeys = [
      // Trees and rocks
      ...treeSizes.flatMap(s => [`tree_${s}`, `tree_${s}_storm`]),
      ...rockSizes.map(s => `rock_${s}`),
      ...trackSpecies.map(s => `track_${s}`),
      // Groomer, buildings, obstacles
      'groomer', 'groomer_storm', 'tree', 'rock', 'restaurant', 'fuel',
      // Snow tiles
      'snow_ungroomed', 'snow_offpiste', 'snow_groomed', 'snow_packed',
      'snow_groomed_med', 'snow_groomed_rough',
      // Steep variants
      ...['gentle', 'moderate', 'steep'].flatMap(s => [`snow_steep_${s}`, `snow_groomed_steep_${s}`]),
      // Park features and slalom poles
      'park_kicker', 'park_rail',
      'slalom_pole_red', 'slalom_pole_blue',
      // Skier/snowboarder sprites
      'skier', 'skier_left', 'skier_right', 'skier_brake', 'skier_tuck',
      'snowboarder', 'snowboarder_left', 'snowboarder_right', 'snowboarder_brake', 'snowboarder_tuck',
    ];
    for (const key of spriteKeys) {
      const tex = this.textures.get(key);
      if (tex?.source?.[0]) tex.source[0].scaleMode = NEAREST;
    }

    // Generate night-tinted variants of terrain/object textures.
    // Uses canvas 'multiply' composite to darken + blue-shift without per-frame cost.
    this.generateNightTextures(NEAREST, treeSizes, rockSizes, trackSpecies);
  }

  private generateNightTextures(NEAREST: number, treeSizes: number[], rockSizes: number[], trackSpecies: string[]): void {
    const nightKeys = [
      ...NIGHT_TEXTURE_KEYS,
      ...treeSizes.flatMap((s: number) => [`tree_${s}`, `tree_${s}_storm`]),
      ...rockSizes.map((s: number) => `rock_${s}`),
      ...trackSpecies.map((s: string) => `track_${s}`),
      'tree', 'rock', 'groomer', 'groomer_storm', 'restaurant', 'fuel',
      'slalom_red', 'slalom_blue',
      'skier', 'skier_left', 'skier_right', 'skier_brake', 'skier_tuck',
      'snowboarder', 'snowboarder_left', 'snowboarder_right', 'snowboarder_brake', 'snowboarder_tuck',
    ];

    const br = BALANCE.NIGHT_BRIGHTNESS;
    const blueShift = BALANCE.NIGHT_BLUE_SHIFT;
    // Pre-compute tint color: RGB channels at brightness level, blue boosted
    const tintR = Math.round(br * 255);
    const tintG = Math.round(br * 255);
    const tintB = Math.min(255, Math.round((br + blueShift) * 255));
    const tintHex = `rgb(${tintR},${tintG},${tintB})`;

    for (const key of nightKeys) {
      const srcTex = this.textures.get(key);
      if (!srcTex || !srcTex.source?.[0]) continue;
      const src = srcTex.source[0];
      const w = src.width;
      const h = src.height;
      if (w === 0 || h === 0) continue;

      const nKey = key + NIGHT_SUFFIX;
      if (this.textures.exists(nKey)) this.textures.remove(nKey);

      // Create an off-screen canvas and apply multiply darkening
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      // Draw original texture
      ctx.drawImage(src.image as HTMLImageElement | HTMLCanvasElement, 0, 0);
      // Multiply blend: darkens each pixel by tint color
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tintHex;
      ctx.fillRect(0, 0, w, h);
      // Restore alpha from original (multiply affects alpha too)
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(src.image as HTMLImageElement | HTMLCanvasElement, 0, 0);

      const nightTex = this.textures.addCanvas(nKey, canvas);
      if (nightTex?.source?.[0]) nightTex.source[0].scaleMode = NEAREST;
    }
  }
}
