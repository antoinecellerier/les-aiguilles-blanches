/**
 * Les Aiguilles Blanches - Boot Scene
 * Initial loading and asset preloading
 */

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    
    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            font: '20px Courier New',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x87CEEB, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }
    
    create() {
        try {
            // Initialize accessibility
            Accessibility.init();
            Accessibility.loadSettings();
            
            // Detect and set language
            setLanguage(detectLanguage());
            
            // Generate placeholder textures
            this.generateTextures();
            
            // Start menu
            this.scene.start('MenuScene');
        } catch (error) {
            console.error('BootScene error:', error);
            // Show error on screen
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
                'Error: ' + error.message, {
                font: '16px Courier New',
                fill: '#ff0000'
            }).setOrigin(0.5);
        }
    }
    
    generateTextures() {
        // Generate groomer sprite - simplified rectangles only
        const groomerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groomerGraphics.fillStyle(0x333333);
        groomerGraphics.fillRect(0, 0, 8, 40);      // Left track
        groomerGraphics.fillRect(24, 0, 8, 40);     // Right track
        groomerGraphics.fillStyle(0xCC2200);
        groomerGraphics.fillRect(4, 5, 24, 25);     // Body
        groomerGraphics.fillStyle(0x1E90FF);
        groomerGraphics.fillRect(8, 10, 16, 12);    // Cabin
        groomerGraphics.fillStyle(0x87CEEB);
        groomerGraphics.fillRect(10, 12, 12, 6);    // Window
        groomerGraphics.fillStyle(0x888888);
        groomerGraphics.fillRect(2, 38, 28, 6);     // Tiller
        groomerGraphics.fillStyle(0x666666);
        groomerGraphics.fillRect(0, 44, 32, 4);     // Blade
        groomerGraphics.generateTexture('groomer', 32, 48);
        groomerGraphics.destroy();
        
        // Generate tree sprite - simplified triangle as rectangles
        const treeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        treeGraphics.fillStyle(0x228B22);
        // Simplified tree - just stacked rectangles
        treeGraphics.fillRect(10, 0, 10, 8);
        treeGraphics.fillRect(6, 8, 18, 8);
        treeGraphics.fillRect(2, 16, 26, 10);
        treeGraphics.fillStyle(0x8B4513);
        treeGraphics.fillRect(12, 26, 6, 14);       // Trunk
        treeGraphics.generateTexture('tree', 30, 40);
        treeGraphics.destroy();
        
        // Generate rock sprite - simplified
        const rockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        rockGraphics.fillStyle(0x696969);
        rockGraphics.fillRect(2, 4, 20, 10);
        rockGraphics.fillRect(6, 2, 12, 14);
        rockGraphics.fillStyle(0x888888);
        rockGraphics.fillRect(6, 4, 6, 4);
        rockGraphics.generateTexture('rock', 24, 16);
        rockGraphics.destroy();
        
        // Generate restaurant sprite - simplified
        const restGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        restGraphics.fillStyle(0xA52A2A);
        restGraphics.fillRect(0, 0, 60, 15);        // Roof
        restGraphics.fillStyle(0x8B4513);
        restGraphics.fillRect(5, 15, 50, 30);       // Building
        restGraphics.fillStyle(0xFFFF00);
        restGraphics.fillRect(22, 25, 16, 12);      // Window
        restGraphics.generateTexture('restaurant', 60, 50);
        restGraphics.destroy();
        
        // Generate fuel station sprite - simplified
        const fuelGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        fuelGraphics.fillStyle(0xFF4444);
        fuelGraphics.fillRect(0, 0, 40, 25);
        fuelGraphics.fillStyle(0xFFFFFF);
        fuelGraphics.fillRect(15, 5, 10, 15);
        fuelGraphics.generateTexture('fuel', 40, 30);
        fuelGraphics.destroy();
        
        // Generate snow tile - ungroomed snow with rougher texture
        const snowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        snowGraphics.fillStyle(0xD8E4E8); // Slightly darker/grayer ungroomed snow
        snowGraphics.fillRect(0, 0, 16, 16);
        // Add texture bumps to show ungroomed
        snowGraphics.fillStyle(0xC8D4D8);
        snowGraphics.fillRect(2, 2, 3, 3);
        snowGraphics.fillRect(9, 5, 4, 3);
        snowGraphics.fillRect(4, 10, 3, 4);
        snowGraphics.fillRect(11, 11, 3, 3);
        snowGraphics.generateTexture('snow_ungroomed', 16, 16);
        snowGraphics.destroy();
        
        // Generate groomed snow tile - smooth bright white with corduroy pattern
        const groomedGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groomedGraphics.fillStyle(0xFFFFFF); // Pure white - clearly groomed
        groomedGraphics.fillRect(0, 0, 16, 16);
        // Corduroy pattern - distinctive horizontal lines
        groomedGraphics.fillStyle(0xE8F0F8);
        groomedGraphics.fillRect(0, 2, 16, 1);
        groomedGraphics.fillRect(0, 5, 16, 1);
        groomedGraphics.fillRect(0, 8, 16, 1);
        groomedGraphics.fillRect(0, 11, 16, 1);
        groomedGraphics.fillRect(0, 14, 16, 1);
        groomedGraphics.generateTexture('snow_groomed', 16, 16);
        groomedGraphics.destroy();
    }
}
