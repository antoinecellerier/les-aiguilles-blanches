/**
 * Les Aiguilles Blanches - Dialogue Scene
 * Shows character dialogues and tutorial messages
 */

class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
        // Initialize queue in constructor so it exists before create()
        this.dialogueQueue = [];
        this.isShowing = false;
    }
    
    create() {
        // Reset state on create
        this.dialogueQueue = [];
        this.isShowing = false;
        
        // Create dialogue elements (hidden initially)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Container for dialogue
        this.container = this.add.container(0, height - 150);
        this.container.setVisible(false);
        
        // Background - make it interactive only when visible
        this.bg = this.add.rectangle(width / 2, 0, width - 40, 120, 0x222222, 0.95);
        this.bg.setStrokeStyle(2, 0x87CEEB);
        
        // Speaker name
        this.speakerText = this.add.text(40, -40, '', {
            font: 'bold 16px Courier New',
            fill: '#87CEEB'
        });
        
        // Dialogue text
        this.dialogueText = this.add.text(40, -10, '', {
            font: '14px Courier New',
            fill: '#ffffff',
            wordWrap: { width: width - 100 }
        });
        
        // Continue prompt
        this.continueText = this.add.text(width - 60, 40, '▶', {
            font: '20px Arial',
            fill: '#87CEEB'
        });
        
        this.container.add([this.bg, this.speakerText, this.dialogueText, this.continueText]);
        
        // Make background clickable to advance dialogue
        this.bg.setInteractive({ useHandCursor: true });
        this.bg.on('pointerdown', () => {
            if (this.isShowing) this.advanceDialogue();
        });
        
        // Keyboard to continue
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.isShowing) this.advanceDialogue();
        });
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.isShowing) this.advanceDialogue();
        });
    }
    
    showDialogue(key) {
        const text = t(key);
        if (!text || text === key) return;
        
        this.dialogueQueue.push({ key, text });
        
        if (!this.isShowing) {
            this.displayNextDialogue();
        }
    }
    
    displayNextDialogue() {
        if (this.dialogueQueue.length === 0) {
            this.hideDialogue();
            return;
        }
        
        // Safety check - scene might be shutting down
        if (!this.speakerText || !this.dialogueText || !this.container) {
            return;
        }
        
        const dialogue = this.dialogueQueue.shift();
        this.isShowing = true;
        
        // Re-enable interactivity when showing
        if (this.bg) {
            this.bg.setInteractive({ useHandCursor: true });
        }
        
        // Determine speaker from key
        let speaker = 'Jean-Pierre';
        if (dialogue.key.includes('marie')) speaker = 'Marie';
        else if (dialogue.key.includes('thierry')) speaker = 'Thierry';
        else if (dialogue.key.includes('emilie')) speaker = 'Émilie';
        else if (dialogue.key.includes('tutorial')) speaker = t('tutorial');
        
        this.speakerText.setText(speaker);
        this.dialogueText.setText(dialogue.text);
        this.container.setVisible(true);
        
        // Announce for screen readers
        Accessibility.announce(speaker + ': ' + dialogue.text);
        
        // Animate in
        this.tweens.add({
            targets: this.container,
            y: this.cameras.main.height - 130,
            duration: 200,
            ease: 'Power2'
        });
    }
    
    advanceDialogue() {
        if (!this.isShowing) return;
        
        this.displayNextDialogue();
    }
    
    hideDialogue() {
        this.isShowing = false;
        
        if (!this.container) return;
        
        // Disable interactivity when hidden
        if (this.bg) {
            this.bg.disableInteractive();
        }
        
        this.tweens.add({
            targets: this.container,
            y: this.cameras.main.height + 20,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                if (this.container) {
                    this.container.setVisible(false);
                }
            }
        });
    }
    
    shutdown() {
        // Stop all tweens first
        this.tweens.killAll();
        
        // Destroy all children to remove from render batch
        this.children.removeAll(true);
        
        // Clean up references
        this.dialogueQueue = [];
        this.isShowing = false;
        this.container = null;
        this.bg = null;
        this.speakerText = null;
        this.dialogueText = null;
        this.continueText = null;
    }
}
