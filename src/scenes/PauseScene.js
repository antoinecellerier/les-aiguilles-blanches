/**
 * Les Aiguilles Blanches - Pause Scene
 * Pause menu overlay
 */

class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }
    
    init(data) {
        this.gameScene = data.gameScene;
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Dim overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        
        // Panel
        this.add.rectangle(width / 2, height / 2, 300, 350, 0x222222, 0.95);
        
        // Title
        this.add.text(width / 2, height / 2 - 130, t('pauseTitle'), {
            font: 'bold 28px Courier New',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Buttons
        const buttonStyle = {
            font: '18px Courier New',
            fill: '#ffffff',
            backgroundColor: '#2d5a7b',
            padding: { x: 30, y: 12 }
        };
        
        const buttons = [
            { text: 'resume', callback: () => this.resumeGame() },
            { text: 'restart', callback: () => this.restartLevel() },
            { text: 'settings', callback: () => this.openSettings() },
            { text: 'quit', callback: () => this.quitToMenu() }
        ];
        
        buttons.forEach((btn, i) => {
            const button = this.add.text(width / 2, height / 2 - 50 + i * 55, t(btn.text), buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => button.setStyle({ backgroundColor: '#3d7a9b' }))
                .on('pointerout', () => button.setStyle({ backgroundColor: '#2d5a7b' }))
                .on('pointerdown', btn.callback);
        });
        
        // ESC to resume
        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
        
        Accessibility.announce(t('pauseTitle'));
    }
    
    resumeGame() {
        this.scene.stop();
        this.gameScene.resumeGame();
    }
    
    restartLevel() {
        this.scene.stop();
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.scene.start('GameScene', { level: this.gameScene.levelIndex });
    }
    
    openSettings() {
        // Stop pause scene and go to settings, but remember to return to game
        this.scene.stop();
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.scene.start('SettingsScene', { returnTo: 'GameScene', levelIndex: this.gameScene.levelIndex });
    }
    
    quitToMenu() {
        this.scene.stop();
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.scene.start('MenuScene');
    }
}
