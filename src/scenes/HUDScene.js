/**
 * Les Aiguilles Blanches - HUD Scene
 * Displays fuel, stamina, coverage, and timer
 */

class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }
    
    init(data) {
        this.level = data.level;
        this.gameScene = data.gameScene;
    }
    
    create() {
        const width = this.cameras.main.width;
        const padding = 12;
        const barWidth = 130;
        const barHeight = 16;
        
        // Left panel - Stats with border accent
        this.add.rectangle(0, 0, 200, 130, 0x000000, 0.75).setOrigin(0).setScrollFactor(0);
        this.add.rectangle(0, 0, 200, 3, 0x87CEEB).setOrigin(0).setScrollFactor(0);
        this.add.rectangle(200, 0, 2, 130, 0x87CEEB, 0.5).setOrigin(0).setScrollFactor(0);
        
        // Level name
        this.add.text(padding, 8, t(this.level.nameKey) || 'Level', {
            fontFamily: 'Courier New, monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#87CEEB'
        }).setScrollFactor(0);
        
        // Fuel label and bar
        this.add.text(padding, 32, '⛽', { fontSize: '14px' }).setScrollFactor(0);
        this.fuelBarBg = this.add.rectangle(35 + padding, 40, barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
        this.fuelBar = this.add.rectangle(35 + padding, 40, barWidth, barHeight, 0xCC2200).setOrigin(0, 0.5).setScrollFactor(0);
        this.fuelText = this.add.text(35 + padding + barWidth + 5, 40, '100%', {
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Stamina label and bar
        this.add.text(padding, 58, '💪', { fontSize: '14px' }).setScrollFactor(0);
        this.staminaBarBg = this.add.rectangle(35 + padding, 66, barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
        this.staminaBar = this.add.rectangle(35 + padding, 66, barWidth, barHeight, 0x22AA22).setOrigin(0, 0.5).setScrollFactor(0);
        this.staminaText = this.add.text(35 + padding + barWidth + 5, 66, '100%', {
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Coverage with icon
        this.add.text(padding, 90, '❄️', { fontSize: '14px' }).setScrollFactor(0);
        this.coverageText = this.add.text(35 + padding, 97, (t('coverage') || 'Coverage') + ': 0%', {
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            color: '#87CEEB'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Right panel - Timer
        this.add.rectangle(width, 0, 140, 80, 0x000000, 0.75).setOrigin(1, 0).setScrollFactor(0);
        this.add.rectangle(width, 0, 140, 3, 0xFFD700).setOrigin(1, 0).setScrollFactor(0);
        this.add.rectangle(width - 140, 0, 2, 80, 0xFFD700, 0.5).setOrigin(0).setScrollFactor(0);
        
        // Timer icon and text
        this.add.text(width - 125, 15, '⏱️', { fontSize: '18px' }).setOrigin(0, 0).setScrollFactor(0);
        this.timerText = this.add.text(width - padding, 18, '00:00', {
            fontFamily: 'Courier New, monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(1, 0).setScrollFactor(0);
        
        // Target coverage
        this.add.text(width - 125, 50, '🎯', { fontSize: '14px' }).setOrigin(0, 0).setScrollFactor(0);
        this.targetText = this.add.text(width - padding, 53, (t('target') || 'Target') + ': ' + this.level.targetCoverage + '%', {
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            color: '#FFD700'
        }).setOrigin(1, 0).setScrollFactor(0);
        
        // Skip level button (for testing - TODO: hide in production)
        const skipBtn = this.add.text(width - padding, 85, '⏭ Skip Level [N]', {
            fontFamily: 'Courier New',
            fontSize: '10px',
            color: '#888888',
            backgroundColor: '#333333',
            padding: { x: 6, y: 3 }
        }).setOrigin(1, 0).setScrollFactor(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => skipBtn.setStyle({ color: '#ffffff' }))
          .on('pointerout', () => skipBtn.setStyle({ color: '#888888' }))
          .on('pointerdown', () => this.skipLevel());
        
        // Keyboard shortcut for skip
        this.input.keyboard.on('keydown-N', () => this.skipLevel());
        
        // Winch hint for levels that have winch
        if (this.level.hasWinch) {
            this.winchHint = this.add.text(width / 2, 12, '🔗 ' + (t('winchHint') || 'SHIFT = Winch'), {
                fontFamily: 'Courier New',
                fontSize: '11px',
                color: '#FFD700',
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.8);
        }
        
        // Listen for timer updates
        this.gameScene.events.on('timerUpdate', this.updateTimer, this);
    }
    
    skipLevel() {
        const nextLevel = this.level.id + 1;
        if (nextLevel < LEVELS.length) {
            this.gameScene.scene.stop('HUDScene');
            this.gameScene.scene.stop('DialogueScene');
            this.gameScene.scene.start('GameScene', { level: nextLevel });
        } else {
            // Last level - go to menu
            this.gameScene.scene.stop('HUDScene');
            this.gameScene.scene.stop('DialogueScene');
            this.gameScene.scene.start('MenuScene');
        }
    }
    
    update() {
        if (!this.gameScene) return;
        
        // Update bars
        const fuelPercent = this.gameScene.fuel / 100;
        const staminaPercent = this.gameScene.stamina / 100;
        const barWidth = 130;
        
        this.fuelBar.width = barWidth * fuelPercent;
        this.staminaBar.width = barWidth * staminaPercent;
        
        // Update percentage text
        this.fuelText.setText(Math.round(this.gameScene.fuel) + '%');
        this.staminaText.setText(Math.round(this.gameScene.stamina) + '%');
        
        // Color based on level
        this.fuelBar.setFillStyle(fuelPercent > 0.3 ? 0xCC2200 : 0xFF0000);
        this.staminaBar.setFillStyle(staminaPercent > 0.3 ? 0x22AA22 : 0xFFAA00);
        
        // Coverage
        const coverage = this.gameScene.getCoverage();
        this.coverageText.setText((t('coverage') || 'Coverage') + ': ' + coverage + '%');
        
        // Color based on target
        if (coverage >= this.level.targetCoverage) {
            this.coverageText.setStyle({ color: '#00FF00' });
        }
        
        // Winch status update
        if (this.winchHint && this.gameScene.winchActive) {
            this.winchHint.setText('🔗 ' + (t('winchAttached') || 'Winch ACTIVE'));
            this.winchHint.setStyle({ color: '#00FF00' });
        } else if (this.winchHint) {
            this.winchHint.setText('🔗 ' + (t('winchHint') || 'SHIFT = Winch'));
            this.winchHint.setStyle({ color: '#FFD700' });
        }
    }
    
    updateTimer(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.timerText.setText(mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'));
        
        // Flash red when low
        if (seconds <= 60) {
            this.timerText.setStyle({ color: '#FF4444' });
        }
    }
    
    shutdown() {
        if (this.gameScene) {
            this.gameScene.events.off('timerUpdate', this.updateTimer, this);
        }
    }
}
