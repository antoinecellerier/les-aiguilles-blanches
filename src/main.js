/**
 * Les Aiguilles Blanches - Phaser 3 Entry Point
 * Initializes the Phaser game instance
 */

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Remove loading indicator
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) loadingEl.remove();
    
    // Get window dimensions
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;
    
    // Phaser configuration
    const config = {
        type: Phaser.CANVAS,
        parent: 'game-container',
        width: gameWidth,
        height: gameHeight,
        backgroundColor: '#1a2a3e',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        input: {
            gamepad: true,
            touch: true
        },
        scene: [
            BootScene,
            MenuScene,
            SettingsScene,
            GameScene,
            HUDScene,
            DialogueScene,
            PauseScene,
            LevelCompleteScene
        ]
    };
    
    try {
        const game = new Phaser.Game(config);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        });
        
        // Handle visibility change (pause when tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const gameScene = game.scene.getScene('GameScene');
                if (gameScene && gameScene.pauseGame) {
                    gameScene.pauseGame();
                }
            }
        });
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});
