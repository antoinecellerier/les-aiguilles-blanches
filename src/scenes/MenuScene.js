/**
 * Les Aiguilles Blanches - Menu Scene
 * Main menu with game start, settings, and controls
 */

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Gradient-like background using layered rectangles
        this.add.rectangle(width/2, 0, width, height * 0.4, 0x1a3a5c).setOrigin(0.5, 0);
        this.add.rectangle(width/2, height * 0.4, width, height * 0.3, 0x2d5a7b).setOrigin(0.5, 0);
        this.add.rectangle(width/2, height * 0.7, width, height * 0.3, 0x4a7a9b).setOrigin(0.5, 0);
        
        // Mountain silhouettes using stacked rectangles (Firefox compatible)
        this.createMountains(width, height);
        
        // Snow ground at bottom
        this.add.rectangle(width/2, height - 50, width, 100, 0xE8F4F8).setOrigin(0.5, 0);
        this.add.rectangle(width/2, height - 55, width, 10, 0xFFFFFF, 0.5).setOrigin(0.5, 0);
        
        // Decorative snowflakes
        this.createSnowflakes(width, height);
        
        // Title container with shadow
        this.add.rectangle(width/2, 140, 520, 80, 0x000000, 0.3).setOrigin(0.5);
        
        // Title text
        this.add.text(width / 2 + 3, 143, 'Les Aiguilles Blanches', {
            fontFamily: 'Courier New, monospace',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#1a3a5c'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, 140, 'Les Aiguilles Blanches', {
            fontFamily: 'Courier New, monospace',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Subtitle
        const subtitleText = t('subtitle') || 'Snow Groomer Simulation';
        this.add.text(width / 2, 190, '❄️ ' + subtitleText + ' ❄️', {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            color: '#87CEEB'
        }).setOrigin(0.5);
        
        // Menu container
        const menuY = height / 2 + 30;
        this.add.rectangle(width/2, menuY + 60, 280, 280, 0x000000, 0.4).setOrigin(0.5);
        
        // Menu buttons with better styling
        const buttonStyle = {
            fontFamily: 'Courier New, monospace',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#CC2200',
            padding: { x: 50, y: 12 }
        };
        
        const buttons = [
            { text: 'startGame', callback: () => this.startGame(), primary: true },
            { text: 'howToPlay', callback: () => this.showHowToPlay() },
            { text: 'settings', callback: () => this.showSettings() },
            { text: 'controls', callback: () => this.showControls() }
        ];
        
        buttons.forEach((btn, i) => {
            const btnText = t(btn.text) || btn.text;
            const yPos = menuY - 30 + i * 55;
            const bgColor = btn.primary ? 0xCC2200 : 0x2d5a7b;
            const hoverColor = btn.primary ? 0xFF3300 : 0x3d7a9b;
            
            const button = this.add.text(width / 2, yPos, btnText, {
                ...buttonStyle,
                backgroundColor: btn.primary ? '#CC2200' : '#2d5a7b'
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    button.setStyle({ backgroundColor: btn.primary ? '#FF3300' : '#3d7a9b' });
                    button.setScale(1.05);
                })
                .on('pointerout', () => {
                    button.setStyle({ backgroundColor: btn.primary ? '#CC2200' : '#2d5a7b' });
                    button.setScale(1);
                })
                .on('pointerdown', btn.callback);
        });
        
        // Groomer icon decoration
        this.add.text(width / 2 - 180, menuY + 60, '🚜', { fontSize: '48px' }).setOrigin(0.5);
        this.add.text(width / 2 + 180, menuY + 60, '⛷️', { fontSize: '48px' }).setOrigin(0.5);
        
        // Version
        this.add.text(10, height - 25, 'v1.0.0 | Phaser 3', {
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            color: '#4a6a7b'
        });
        
        // Credits hint
        this.add.text(width - 10, height - 25, 'Made with ❄️ in Savoie', {
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            color: '#4a6a7b'
        }).setOrigin(1, 0);
        
        // Keyboard navigation
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        
        // Announce for screen readers
        Accessibility.announce((t('subtitle') || '') + ' - ' + (t('startGame') || ''));
    }
    
    createMountains(width, height) {
        // Far mountains (dark) - using overlapping rectangles
        const farMtnColor = 0x1a3a5c;
        
        // Mountain 1 (left)
        this.add.rectangle(100, height - 100, 300, 250, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(100, height - 300, 200, 100, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(100, height - 370, 100, 80, farMtnColor).setOrigin(0.5, 1);
        
        // Mountain 2 (center-left)
        this.add.rectangle(350, height - 100, 280, 300, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(350, height - 350, 180, 120, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(350, height - 430, 80, 80, farMtnColor).setOrigin(0.5, 1);
        
        // Mountain 3 (center-right) - tallest
        this.add.rectangle(600, height - 100, 320, 350, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(600, height - 400, 200, 150, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(600, height - 500, 100, 100, farMtnColor).setOrigin(0.5, 1);
        
        // Mountain 4 (right)
        this.add.rectangle(900, height - 100, 350, 280, farMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(900, height - 330, 200, 100, farMtnColor).setOrigin(0.5, 1);
        
        // Near mountains (lighter) overlay
        const nearMtnColor = 0x3d6a8b;
        this.add.rectangle(200, height - 50, 350, 180, nearMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(200, height - 190, 200, 80, nearMtnColor).setOrigin(0.5, 1);
        
        this.add.rectangle(750, height - 50, 400, 200, nearMtnColor).setOrigin(0.5, 1);
        this.add.rectangle(750, height - 200, 250, 100, nearMtnColor).setOrigin(0.5, 1);
        
        // Snow caps (white rectangles at peaks)
        this.add.rectangle(350, height - 480, 60, 30, 0xFFFFFF, 0.8).setOrigin(0.5, 1);
        this.add.rectangle(600, height - 560, 70, 40, 0xFFFFFF, 0.8).setOrigin(0.5, 1);
        this.add.rectangle(100, height - 420, 50, 25, 0xFFFFFF, 0.7).setOrigin(0.5, 1);
    }
    
    createSnowflakes(width, height) {
        // Static decorative snowflakes
        const snowflakePositions = [
            { x: 50, y: 100 }, { x: 150, y: 200 }, { x: 80, y: 350 },
            { x: width - 50, y: 120 }, { x: width - 120, y: 250 }, { x: width - 80, y: 400 },
            { x: width/2 - 200, y: 80 }, { x: width/2 + 200, y: 90 }
        ];
        
        snowflakePositions.forEach(pos => {
            this.add.text(pos.x, pos.y, '❄', {
                fontSize: Phaser.Math.Between(12, 24) + 'px',
                color: '#FFFFFF'
            }).setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
        });
    }
    
    startGame() {
        // Remove and recreate all game-related scenes to avoid texture corruption
        const game = this.game;
        this.scene.stop('MenuScene');
        
        setTimeout(() => {
            // Clean up all game-related scenes
            ['GameScene', 'HUDScene', 'DialogueScene', 'PauseScene'].forEach(key => {
                if (game.scene.getScene(key)) {
                    game.scene.remove(key);
                }
            });
            
            // Recreate overlay scenes
            game.scene.add('HUDScene', HUDScene, false);
            game.scene.add('DialogueScene', DialogueScene, false);
            game.scene.add('PauseScene', PauseScene, false);
            
            // Start fresh GameScene
            game.scene.add('GameScene', GameScene, true, { level: 0 });
        }, 100);
    }
    
    showHowToPlay() {
        this.showOverlay('howToPlay', [
            '🚜 ' + (t('tutorialMove') || 'Use WASD or Arrow keys to move'),
            '',
            '❄️ ' + (t('tutorialGroom') || 'Hold SPACE to groom snow'),
            '',
            '⛽ ' + (t('tutorialFuel') || 'Watch your fuel and stamina!')
        ]);
    }
    
    showSettings() {
        // Go to full settings scene
        this.scene.start('SettingsScene');
    }
    
    showControls() {
        this.showOverlay('controls', [
            '⬆️ WASD / Arrows - Move',
            '⏺️ SPACE - Groom',
            '🔗 SHIFT - Winch',
            '⏸️ ESC - Pause',
            '',
            '🎮 Gamepad supported',
            '📱 Touch controls on mobile'
        ]);
    }
    
    showOverlay(titleKey, lines) {
        const { width, height } = this.cameras.main;
        
        // Calculate responsive panel size
        const panelWidth = Math.min(600, width - 40);
        const panelHeight = Math.min(500, height - 80);
        
        // Dim background
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        
        // Panel with border effect
        const panelBorder = this.add.rectangle(width / 2, height / 2, panelWidth + 10, panelHeight + 10, 0x3d7a9b);
        const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x1a2a3e);
        
        // Title
        const title = this.add.text(width / 2, height / 2 - panelHeight/2 + 40, t(titleKey) || titleKey, {
            fontFamily: 'Courier New, monospace',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#87CEEB'
        }).setOrigin(0.5);
        
        // Content - with word wrap
        const content = this.add.text(width / 2, height / 2, lines.join('\n'), {
            fontFamily: 'Courier New, monospace',
            fontSize: '14px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: panelWidth - 60 }
        }).setOrigin(0.5);
        
        // Back button
        const backBtn = this.add.text(width / 2, height / 2 + panelHeight/2 - 50, '← ' + (t('back') || 'Back'), {
            fontFamily: 'Courier New, monospace',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#CC2200',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => backBtn.setStyle({ backgroundColor: '#FF3300' }))
        .on('pointerout', () => backBtn.setStyle({ backgroundColor: '#CC2200' }))
        .on('pointerdown', () => {
            overlay.destroy();
            panelBorder.destroy();
            panel.destroy();
            title.destroy();
            content.destroy();
            backBtn.destroy();
        });
        
        // ESC to close
        const escHandler = this.input.keyboard.on('keydown-ESC', () => {
            overlay.destroy();
            panelBorder.destroy();
            panel.destroy();
            title.destroy();
            content.destroy();
            backBtn.destroy();
            this.input.keyboard.off('keydown-ESC', escHandler);
        });
    }
}
