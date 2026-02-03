import Phaser from "phaser";
/**
 * Les Aiguilles Blanches - Level Complete Scene
 * Shows level results and next level option
 */

class LevelCompleteScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelCompleteScene' });
    }
    
    init(data) {
        this.won = data.won;
        this.levelIndex = data.level;
        this.coverage = data.coverage;
        this.timeUsed = data.timeUsed;
        this.failReason = data.failReason;
    }
    
    create() {
        const { width, height } = this.cameras.main;
        const level = LEVELS[this.levelIndex];
        
        // Background
        this.cameras.main.setBackgroundColor(this.won ? 0x1a3a2e : 0x3a1a1a);
        
        // Result icon and title
        const icon = this.won ? '🏆' : this.getFailIcon();
        const titleKey = this.won ? 'levelComplete' : 'levelFailed';
        
        this.add.text(width / 2, height / 4 - 20, icon, {
            font: '80px Arial'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height / 4 + 50, t(titleKey), {
            font: 'bold 36px Courier New',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Failure reason with taunt
        if (!this.won && this.failReason) {
            const taunt = this.getFailTaunt();
            this.add.text(width / 2, height / 4 + 95, taunt, {
                font: 'italic 14px Courier New',
                fill: '#ff8888',
                align: 'center',
                wordWrap: { width: width * 0.8 }
            }).setOrigin(0.5);
        }
        
        // Level name
        this.add.text(width / 2, height / 4 + 130, t(level.nameKey), {
            font: '18px Courier New',
            fill: '#aaaaaa'
        }).setOrigin(0.5);
        
        // Stats panel
        const statsY = height / 2 + 40;
        
        this.add.text(width / 2, statsY, [
            t('coverage') + ': ' + this.coverage + '% / ' + level.targetCoverage + '%',
            '',
            t('timeUsed') + ': ' + this.formatTime(this.timeUsed),
            '',
            this.won ? this.getGrade() : ''
        ].join('\n'), {
            font: '16px Courier New',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        
        // Buttons
        const buttonStyle = {
            font: '18px Courier New',
            fill: '#ffffff',
            backgroundColor: '#2d5a7b',
            padding: { x: 30, y: 12 }
        };
        
        const buttonY = height - 100;
        
        if (this.won && this.levelIndex < LEVELS.length - 1) {
            // Next level button
            this.createButton(width / 2 - 100, buttonY, 'nextLevel', buttonStyle, () => {
                this.scene.start('GameScene', { level: this.levelIndex + 1 });
            }, '[ENTER]');
            
            // Menu button
            this.createButton(width / 2 + 100, buttonY, 'menu', buttonStyle, () => {
                this.scene.start('MenuScene');
            }, '[ESC]');
            
            // Keyboard shortcuts
            this.input.keyboard.once('keydown-ENTER', () => {
                this.scene.start('GameScene', { level: this.levelIndex + 1 });
            });
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('GameScene', { level: this.levelIndex + 1 });
            });
            this.input.keyboard.once('keydown-ESC', () => {
                this.scene.start('MenuScene');
            });
        } else if (this.won && this.levelIndex === LEVELS.length - 1) {
            // Completed final level - show credits!
            this.add.text(width / 2, height / 2 + 100, '🎉 ' + (t('gameComplete') || 'Jeu terminé !') + ' 🎉', {
                font: 'bold 20px Courier New',
                fill: '#FFD700'
            }).setOrigin(0.5);
            
            // Credits button
            this.createButton(width / 2, buttonY, 'viewCredits', buttonStyle, () => {
                this.scene.start('CreditsScene');
            }, '[ENTER]');
            
            // Keyboard shortcuts
            this.input.keyboard.once('keydown-ENTER', () => {
                this.scene.start('CreditsScene');
            });
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('CreditsScene');
            });
            this.input.keyboard.once('keydown-ESC', () => {
                this.scene.start('MenuScene');
            });
        } else {
            // Retry button
            this.createButton(width / 2 - 80, buttonY, 'retry', buttonStyle, () => {
                this.scene.start('GameScene', { level: this.levelIndex });
            }, '[ENTER]');
            
            // Menu button
            this.createButton(width / 2 + 80, buttonY, 'menu', buttonStyle, () => {
                this.scene.start('MenuScene');
            }, '[ESC]');
            
            // Keyboard shortcuts
            this.input.keyboard.once('keydown-ENTER', () => {
                this.scene.start('GameScene', { level: this.levelIndex });
            });
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('GameScene', { level: this.levelIndex });
            });
            this.input.keyboard.once('keydown-ESC', () => {
                this.scene.start('MenuScene');
            });
        }
        
        Accessibility.announce(t(titleKey) + '. ' + t('coverage') + ' ' + this.coverage + '%');
    }
    
    createButton(x, y, textKey, style, callback, hint = '') {
        const label = hint ? t(textKey) + ' ' + hint : t(textKey);
        return this.add.text(x, y, label, style)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function() { this.setStyle({ backgroundColor: '#3d7a9b' }); })
            .on('pointerout', function() { this.setStyle({ backgroundColor: '#2d5a7b' }); })
            .on('pointerdown', callback);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins + ':' + secs.toString().padStart(2, '0');
    }
    
    getFailIcon() {
        switch (this.failReason) {
            case 'cliff': return '🏔️💀';
            case 'fuel': return '⛽💨';
            case 'time': return '⏰❌';
            case 'avalanche': return '🏔️❄️💨';
            case 'tumble': return '🔄💥';
            default: return '❌';
        }
    }
    
    getFailTaunt() {
        const taunts = {
            cliff: [
                t('tauntCliff1') || "La gravité, c'est pas ton truc ?",
                t('tauntCliff2') || "Jean-Pierre va devoir expliquer ça à l'assurance...",
                t('tauntCliff3') || "Le ravin était pourtant bien visible !"
            ],
            fuel: [
                t('tauntFuel1') || "Tu as oublié où était la station-service ?",
                t('tauntFuel2') || "Même les marmottes savent faire le plein...",
                t('tauntFuel3') || "La prochaine fois, vérifie la jauge AVANT de partir !"
            ],
            time: [
                t('tauntTime1') || "Les skieurs arrivent... et la piste n'est pas prête !",
                t('tauntTime2') || "Tu damais quoi, des croissants ?",
                t('tauntTime3') || "Jean-Pierre est très déçu. Très, très déçu."
            ],
            avalanche: [
                t('tauntAvalanche1') || "Tu as réveillé la montagne...",
                t('tauntAvalanche2') || "Les pisteurs t'avaient pourtant prévenu !",
                t('tauntAvalanche3') || "La neige, ça se respecte."
            ],
            tumble: [
                t('tauntTumble1') || "La physique, ça s'apprend...",
                t('tauntTumble2') || "Le treuil existe pour une raison.",
                t('tauntTumble3') || "Jean-Pierre t'avait dit d'utiliser le câble !"
            ]
        };
        
        const options = taunts[this.failReason] || [t('tryAgain') || "Réessaie !"];
        return options[Math.floor(Math.random() * options.length)];
    }
    
    getGrade() {
        const level = LEVELS[this.levelIndex];
        const timePercent = this.timeUsed / level.timeLimit;
        const coverageBonus = this.coverage - level.targetCoverage;
        
        if (timePercent < 0.5 && coverageBonus >= 10) return '⭐⭐⭐ ' + t('excellent');
        if (timePercent < 0.75 && coverageBonus >= 5) return '⭐⭐ ' + t('good');
        return '⭐ ' + t('passed');
    }
}

export default LevelCompleteScene;
