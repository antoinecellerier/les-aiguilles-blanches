import Phaser from "phaser";

import GameScene from "./GameScene.js";

/**
 * Les Aiguilles Blanches - Credits Scene
 * Shows end-game credits after completing all levels
 */

class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreditsScene' });
    }
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Background - night sky with stars
        this.cameras.main.setBackgroundColor(0x0a1628);
        this.createStars();
        
        // Trophy
        this.add.text(width / 2, 60, '🏆', {
            font: '60px Arial'
        }).setOrigin(0.5);
        
        // Congratulations title
        this.add.text(width / 2, 120, t('creditsTitle') || 'Félicitations !', {
            font: 'bold 32px Courier New',
            fill: '#FFD700'
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(width / 2, 160, t('creditsSubtitle') || 'Vous avez maîtrisé Les Aiguilles Blanches', {
            font: '16px Courier New',
            fill: '#87CEEB'
        }).setOrigin(0.5);
        
        // Credits content
        const credits = [
            '',
            '🎿 LES AIGUILLES BLANCHES 🎿',
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            'Créé par',
            'Antoine',
            '',
            'Développé avec',
            'GitHub Copilot',
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            'Direction Artistique',
            'Style "SkiFree" classique',
            '',
            'Inspiré par',
            'Les dameurs de Savoie',
            'PistenBully 600',
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            'Gastronomie Savoyarde',
            'Tartiflette • Fondue • Raclette',
            'Génépi • Vin Chaud',
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            'Merci d\'avoir joué !',
            '',
            '🏔️ À bientôt sur les pistes ! 🏔️'
        ];
        
        // Scrolling credits container
        this.creditsContainer = this.add.container(0, height);
        
        let yOffset = 0;
        credits.forEach(line => {
            const isTitle = line.includes('━') || line.includes('🎿') || line.includes('🏔️');
            const style = {
                font: isTitle ? 'bold 14px Courier New' : '14px Courier New',
                fill: isTitle ? '#FFD700' : '#ffffff',
                align: 'center'
            };
            
            const text = this.add.text(width / 2, yOffset, line, style).setOrigin(0.5);
            this.creditsContainer.add(text);
            yOffset += line === '' ? 15 : 25;
        });
        
        this.creditsHeight = yOffset;
        
        // Animate credits scroll
        this.tweens.add({
            targets: this.creditsContainer,
            y: -this.creditsHeight + 100,
            duration: 15000,
            ease: 'Linear',
            onComplete: () => {
                this.showButtons();
            }
        });
        
        // Buttons (hidden initially, shown after credits or on skip)
        this.buttonsContainer = this.add.container(0, 0);
        this.buttonsContainer.setVisible(false);
        
        const buttonStyle = {
            font: '16px Courier New',
            fill: '#ffffff',
            backgroundColor: '#2d5a7b',
            padding: { x: 20, y: 10 }
        };
        
        // Play Again button
        const playAgainBtn = this.add.text(width / 2 - 100, height - 60, 
            (t('playAgain') || 'Rejouer') + ' [ENTER]', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function() { this.setStyle({ backgroundColor: '#3d7a9b' }); })
            .on('pointerout', function() { this.setStyle({ backgroundColor: '#2d5a7b' }); })
            .on('pointerdown', () => this.restartGame());
        
        // Menu button
        const menuBtn = this.add.text(width / 2 + 100, height - 60,
            (t('menu') || 'Menu') + ' [ESC]', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function() { this.setStyle({ backgroundColor: '#3d7a9b' }); })
            .on('pointerout', function() { this.setStyle({ backgroundColor: '#2d5a7b' }); })
            .on('pointerdown', () => this.returnToMenu());
        
        this.buttonsContainer.add([playAgainBtn, menuBtn]);
        
        // Skip hint
        this.skipHint = this.add.text(width / 2, height - 20, 
            t('skipCredits') || 'Appuyez sur une touche pour passer', {
            font: '12px Courier New',
            fill: '#666666'
        }).setOrigin(0.5);
        
        // Skip on any key/click
        this.input.keyboard.once('keydown', (event) => {
            if (event.code === 'Escape') {
                this.returnToMenu();
            } else if (event.code === 'Enter' || event.code === 'Space') {
                this.restartGame();
            } else {
                this.skipCredits();
            }
        });
        this.input.once('pointerdown', () => this.skipCredits());
        
        Accessibility.announce(t('creditsTitle') || 'Félicitations! Vous avez terminé le jeu.');
    }
    
    createStars() {
        const { width, height } = this.cameras.main;
        const graphics = this.add.graphics();
        
        // Create twinkling stars
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.FloatBetween(0.5, 2);
            const alpha = Phaser.Math.FloatBetween(0.3, 1);
            
            graphics.fillStyle(0xffffff, alpha);
            graphics.fillCircle(x, y, size);
        }
    }
    
    skipCredits() {
        this.tweens.killAll();
        this.creditsContainer.setY(-this.creditsHeight + 100);
        this.showButtons();
    }
    
    showButtons() {
        this.buttonsContainer.setVisible(true);
        this.skipHint.setVisible(false);
        
        // Re-bind keyboard for navigation
        this.input.keyboard.removeAllListeners();
        this.input.keyboard.on('keydown-ENTER', () => this.restartGame());
        this.input.keyboard.on('keydown-SPACE', () => this.restartGame());
        this.input.keyboard.on('keydown-ESC', () => this.returnToMenu());
    }
    
    restartGame() {
        // Must remove and recreate GameScene to avoid texture corruption
        const game = this.game;
        this.scene.stop('CreditsScene');
        
        setTimeout(() => {
            // Remove old GameScene if it exists
            if (game.scene.getScene('GameScene')) {
                game.scene.remove('GameScene');
            }
            // Add fresh GameScene
            game.scene.add('GameScene', GameScene, true, { level: 0 });
        }, 100);
    }
    
    returnToMenu() {
        // Clean up scenes before returning to menu
        const game = this.game;
        this.scene.stop('CreditsScene');
        
        setTimeout(() => {
            // Remove GameScene to ensure clean state for next play
            if (game.scene.getScene('GameScene')) {
                game.scene.remove('GameScene');
            }
            game.scene.start('MenuScene');
        }, 100);
    }
}

export default CreditsScene;
