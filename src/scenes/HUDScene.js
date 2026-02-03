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
        this.isSkipping = false; // Reset skip flag on scene start
    }
    
    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Calculate scale factor based on viewport size
        // Reference resolution: 1024x768
        const refWidth = 1024;
        const refHeight = 768;
        const scaleX = width / refWidth;
        const scaleY = height / refHeight;
        this.uiScale = Math.max(0.75, Math.min(2, Math.min(scaleX, scaleY)));
        
        // Scale-adjusted values
        const padding = Math.round(12 * this.uiScale);
        const barWidth = Math.round(130 * this.uiScale);
        const barHeight = Math.round(16 * this.uiScale);
        const leftPanelWidth = Math.round(200 * this.uiScale);
        const leftPanelHeight = Math.round(130 * this.uiScale);
        const rightPanelWidth = Math.round(140 * this.uiScale);
        const rightPanelHeight = Math.round(80 * this.uiScale);
        
        // Font sizes scaled
        const fontTiny = Math.round(10 * this.uiScale) + 'px';
        const fontSmall = Math.round(11 * this.uiScale) + 'px';
        const fontMed = Math.round(12 * this.uiScale) + 'px';
        const fontIcon = Math.round(14 * this.uiScale) + 'px';
        const fontIconLg = Math.round(18 * this.uiScale) + 'px';
        const fontLarge = Math.round(22 * this.uiScale) + 'px';
        
        // Left panel - Stats with border accent
        this.add.rectangle(0, 0, leftPanelWidth, leftPanelHeight, 0x000000, 0.75).setOrigin(0).setScrollFactor(0);
        this.add.rectangle(0, 0, leftPanelWidth, 3, 0x87CEEB).setOrigin(0).setScrollFactor(0);
        this.add.rectangle(leftPanelWidth, 0, 2, leftPanelHeight, 0x87CEEB, 0.5).setOrigin(0).setScrollFactor(0);
        
        // Vertical positions scaled
        const row1Y = Math.round(8 * this.uiScale);
        const row2Y = Math.round(32 * this.uiScale);
        const row3Y = Math.round(58 * this.uiScale);
        const row4Y = Math.round(90 * this.uiScale);
        const barOffset = Math.round(35 * this.uiScale);
        
        // Level name
        this.add.text(padding, row1Y, t(this.level.nameKey) || 'Level', {
            fontFamily: 'Courier New, monospace',
            fontSize: fontSmall,
            fontStyle: 'bold',
            color: '#87CEEB'
        }).setScrollFactor(0);
        
        // Fuel label and bar
        this.add.text(padding, row2Y, '⛽', { fontSize: fontIcon }).setScrollFactor(0);
        this.fuelBarBg = this.add.rectangle(barOffset + padding, row2Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
        this.fuelBar = this.add.rectangle(barOffset + padding, row2Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0xCC2200).setOrigin(0, 0.5).setScrollFactor(0);
        this.fuelText = this.add.text(barOffset + padding + barWidth + 5, row2Y + Math.round(8 * this.uiScale), '100%', {
            fontFamily: 'Courier New',
            fontSize: fontSmall,
            color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Stamina label and bar
        this.add.text(padding, row3Y, '💪', { fontSize: fontIcon }).setScrollFactor(0);
        this.staminaBarBg = this.add.rectangle(barOffset + padding, row3Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
        this.staminaBar = this.add.rectangle(barOffset + padding, row3Y + Math.round(8 * this.uiScale), barWidth, barHeight, 0x22AA22).setOrigin(0, 0.5).setScrollFactor(0);
        this.staminaText = this.add.text(barOffset + padding + barWidth + 5, row3Y + Math.round(8 * this.uiScale), '100%', {
            fontFamily: 'Courier New',
            fontSize: fontSmall,
            color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Coverage with icon
        this.add.text(padding, row4Y, '❄️', { fontSize: fontIcon }).setScrollFactor(0);
        this.coverageText = this.add.text(barOffset + padding, row4Y + Math.round(7 * this.uiScale), (t('coverage') || 'Coverage') + ': 0%', {
            fontFamily: 'Courier New, monospace',
            fontSize: fontMed,
            color: '#87CEEB'
        }).setOrigin(0, 0.5).setScrollFactor(0);
        
        // Right panel - Timer
        this.add.rectangle(width, 0, rightPanelWidth, rightPanelHeight, 0x000000, 0.75).setOrigin(1, 0).setScrollFactor(0);
        this.add.rectangle(width, 0, rightPanelWidth, 3, 0xFFD700).setOrigin(1, 0).setScrollFactor(0);
        this.add.rectangle(width - rightPanelWidth, 0, 2, rightPanelHeight, 0xFFD700, 0.5).setOrigin(0).setScrollFactor(0);
        
        // Timer icon and text
        const timerIconX = width - rightPanelWidth + padding;
        this.add.text(timerIconX, Math.round(15 * this.uiScale), '⏱️', { fontSize: fontIconLg }).setOrigin(0, 0).setScrollFactor(0);
        this.timerText = this.add.text(width - padding, Math.round(18 * this.uiScale), '00:00', {
            fontFamily: 'Courier New, monospace',
            fontSize: fontLarge,
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(1, 0).setScrollFactor(0);
        
        // Target coverage
        this.add.text(timerIconX, Math.round(50 * this.uiScale), '🎯', { fontSize: fontIcon }).setOrigin(0, 0).setScrollFactor(0);
        this.targetText = this.add.text(width - padding, Math.round(53 * this.uiScale), (t('target') || 'Target') + ': ' + this.level.targetCoverage + '%', {
            fontFamily: 'Courier New, monospace',
            fontSize: fontMed,
            color: '#FFD700'
        }).setOrigin(1, 0).setScrollFactor(0);
        
        // Skip level button (for testing - TODO: hide in production)
        const skipBtn = this.add.text(width - padding, rightPanelHeight + Math.round(5 * this.uiScale), '⏭ Skip Level [N]', {
            fontFamily: 'Courier New',
            fontSize: fontTiny,
            color: '#888888',
            backgroundColor: '#333333',
            padding: { x: Math.round(6 * this.uiScale), y: Math.round(3 * this.uiScale) }
        }).setOrigin(1, 0).setScrollFactor(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => skipBtn.setStyle({ color: '#ffffff' }))
          .on('pointerout', () => skipBtn.setStyle({ color: '#888888' }))
          .on('pointerdown', () => this.skipLevel());
        
        // Keyboard shortcut for skip
        this.input.keyboard.on('keydown-N', () => this.skipLevel());
        
        // Winch hint for levels that have winch
        if (this.level.hasWinch) {
            this.winchHint = this.add.text(width / 2, Math.round(12 * this.uiScale), '🔗 ' + (t('winchHint') || 'SHIFT = Winch'), {
                fontFamily: 'Courier New',
                fontSize: fontSmall,
                color: '#FFD700',
                backgroundColor: '#000000',
                padding: { x: Math.round(8 * this.uiScale), y: Math.round(4 * this.uiScale) }
            }).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.8);
        }
        
        // Store barWidth for update method
        this.barWidth = barWidth;
        
        // Listen for timer updates
        this.gameScene.events.on('timerUpdate', this.updateTimer, this);
    }
    
    skipLevel() {
        const nextLevel = this.level.id + 1;
        console.log('skipLevel: current', this.level.id, 'next', nextLevel, 'of', LEVELS.length);
        
        // Prevent multiple calls
        if (this.isSkipping) {
            console.log('skipLevel: already skipping, ignoring');
            return;
        }
        this.isSkipping = true;
        
        if (nextLevel < LEVELS.length) {
            console.log('skipLevel: calling transitionToLevel', nextLevel);
            try {
                // Tell GameScene to transition - it will handle stopping overlay scenes
                if (this.gameScene && typeof this.gameScene.transitionToLevel === 'function') {
                    this.gameScene.transitionToLevel(nextLevel);
                } else {
                    console.error('skipLevel: gameScene.transitionToLevel not available');
                    // Fallback: direct scene restart
                    this.scene.stop('HUDScene');
                    this.scene.stop('DialogueScene');
                    this.game.scene.stop('GameScene');
                    this.game.scene.start('GameScene', { level: nextLevel });
                }
            } catch (e) {
                console.error('skipLevel error:', e);
            }
        } else {
            // Last level - go to credits
            console.log('skipLevel: last level, going to credits');
            this.scene.stop('HUDScene');
            this.scene.stop('DialogueScene');
            this.scene.get('GameScene').scene.stop();
            this.game.scene.start('CreditsScene');
        }
    }
    
    update() {
        if (!this.gameScene || !this.scene.isActive()) return;
        
        // Safety check for destroyed text objects
        if (!this.fuelBar || !this.fuelText) return;
        
        // Update bars
        const fuelPercent = this.gameScene.fuel / 100;
        const staminaPercent = this.gameScene.stamina / 100;
        
        this.fuelBar.width = this.barWidth * fuelPercent;
        this.staminaBar.width = this.barWidth * staminaPercent;
        
        // Update percentage text
        this.fuelText.setText(Math.round(this.gameScene.fuel) + '%');
        this.staminaText.setText(Math.round(this.gameScene.stamina) + '%');
        
        // Color based on level
        this.fuelBar.setFillStyle(fuelPercent > 0.3 ? 0xCC2200 : 0xFF0000);
        this.staminaBar.setFillStyle(staminaPercent > 0.3 ? 0x22AA22 : 0xFFAA00);
        
        // Coverage
        const coverage = this.gameScene.getCoverage();
        if (this.coverageText) {
            this.coverageText.setText((t('coverage') || 'Coverage') + ': ' + coverage + '%');
            
            // Color based on target
            if (coverage >= this.level.targetCoverage) {
                this.coverageText.setStyle({ color: '#00FF00' });
            }
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
    
    shutdown() {
        // Stop all tweens first
        this.tweens.killAll();
        
        // Destroy all children to remove from render batch
        this.children.removeAll(true);
        
        // Clean up references to prevent update() errors
        this.gameScene = null;
        this.fuelBar = null;
        this.fuelText = null;
        this.staminaBar = null;
        this.staminaText = null;
        this.coverageText = null;
        this.winchHint = null;
        this.timerText = null;
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
