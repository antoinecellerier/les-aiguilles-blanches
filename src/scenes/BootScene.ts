import Phaser from 'phaser';
import { Accessibility, setLanguage, detectLanguage } from '../setup';
import { detectKeyboardLayout } from '../utils/keyboardLayout';

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
      detectKeyboardLayout();

      // Generate placeholder textures
      this.generateTextures();

      // Start menu
      this.scene.start('MenuScene');
    } catch (error) {
      console.error('BootScene error:', error);
      const message = error instanceof Error ? error.message : String(error);
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'Error: ' + message,
        { font: '16px Courier New', color: '#ff0000' }
      ).setOrigin(0.5);
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
    groomerGraphics.destroy();

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
    snowGraphics.fillStyle(0xd8e4e8);
    snowGraphics.fillRect(0, 0, 16, 16);
    snowGraphics.fillStyle(0xc8d4d8);
    snowGraphics.fillRect(2, 2, 3, 3);
    snowGraphics.fillRect(9, 5, 4, 3);
    snowGraphics.fillRect(4, 10, 3, 4);
    snowGraphics.fillRect(11, 11, 3, 3);
    snowGraphics.generateTexture('snow_ungroomed', 16, 16);
    snowGraphics.destroy();

    // Off-piste snow (rough, untouched powder snow - winter wonderland style)
    const offPisteGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    offPisteGraphics.fillStyle(0xe8f0f4);  // Bright white base
    offPisteGraphics.fillRect(0, 0, 16, 16);
    // Irregular snow mounds (slightly off-white for texture)
    offPisteGraphics.fillStyle(0xf0f6fa);
    offPisteGraphics.fillRect(1, 1, 4, 3);
    offPisteGraphics.fillRect(8, 2, 5, 4);
    offPisteGraphics.fillRect(3, 7, 6, 4);
    offPisteGraphics.fillRect(11, 9, 4, 5);
    offPisteGraphics.fillRect(0, 12, 3, 3);
    // Subtle shadows/depth (light blue-gray)
    offPisteGraphics.fillStyle(0xd8e4ec);
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

    // Packed snow (service roads — compacted by vehicle traffic, between off-piste and groomed)
    const packedGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    packedGraphics.fillStyle(0xd8e4e8);  // Slightly blue-gray base
    packedGraphics.fillRect(0, 0, 16, 16);
    // Irregular tire/track marks
    packedGraphics.fillStyle(0xc8d4d8);
    packedGraphics.fillRect(2, 1, 3, 2);
    packedGraphics.fillRect(10, 4, 4, 2);
    packedGraphics.fillRect(1, 8, 5, 2);
    packedGraphics.fillRect(9, 11, 3, 3);
    // Lighter patches (exposed compressed snow)
    packedGraphics.fillStyle(0xe0eaf0);
    packedGraphics.fillRect(6, 2, 3, 2);
    packedGraphics.fillRect(0, 5, 2, 2);
    packedGraphics.fillRect(12, 8, 3, 2);
    packedGraphics.fillRect(5, 12, 4, 2);
    packedGraphics.generateTexture('snow_packed', 16, 16);
    packedGraphics.destroy();
  }
}
