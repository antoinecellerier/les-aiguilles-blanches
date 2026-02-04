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
    // Groomer sprite
    const groomerGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    groomerGraphics.fillStyle(0x333333);
    groomerGraphics.fillRect(0, 0, 8, 40);
    groomerGraphics.fillRect(24, 0, 8, 40);
    groomerGraphics.fillStyle(0xcc2200);
    groomerGraphics.fillRect(4, 5, 24, 25);
    groomerGraphics.fillStyle(0x1e90ff);
    groomerGraphics.fillRect(8, 10, 16, 12);
    groomerGraphics.fillStyle(0x87ceeb);
    groomerGraphics.fillRect(10, 12, 12, 6);
    groomerGraphics.fillStyle(0x888888);
    groomerGraphics.fillRect(2, 38, 28, 6);
    groomerGraphics.fillStyle(0x666666);
    groomerGraphics.fillRect(0, 44, 32, 4);
    groomerGraphics.generateTexture('groomer', 32, 48);
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

    // Fuel station sprite
    const fuelGraphics = this.make.graphics({ x: 0, y: 0 } as any, false);
    fuelGraphics.fillStyle(0xff4444);
    fuelGraphics.fillRect(0, 0, 40, 25);
    fuelGraphics.fillStyle(0xffffff);
    fuelGraphics.fillRect(15, 5, 10, 15);
    fuelGraphics.generateTexture('fuel', 40, 30);
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
  }
}
