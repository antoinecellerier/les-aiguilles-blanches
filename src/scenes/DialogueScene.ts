import Phaser from 'phaser';
import { t, Accessibility } from '../setup';

/**
 * Les Aiguilles Blanches - Dialogue Scene
 * Shows character dialogues and tutorial messages
 */

interface DialogueItem {
  key: string;
  text: string;
}

export default class DialogueScene extends Phaser.Scene {
  private dialogueQueue: DialogueItem[] = [];
  private isShowing = false;
  private container: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private continueText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  create(): void {
    this.dialogueQueue = [];
    this.isShowing = false;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fullscreen hit zone for clicking anywhere to dismiss (initially disabled)
    // Exclude top-right corner (200x200) where HUD buttons are located
    const excludeSize = 200;
    
    // Create hit zone that covers most of screen except top-right button area
    // Use a larger zone that starts below the button area
    this.hitZone = this.add.rectangle(width / 2, height / 2 + excludeSize / 4, width, height - excludeSize / 2, 0x000000, 0);
    this.hitZone.setDepth(50); // Above game, below dialogue box
    this.hitZone.setInteractive();
    this.hitZone.disableInteractive(); // Start disabled
    this.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Extra check: ignore clicks in top-right corner where buttons are
      if (pointer.x > width - excludeSize && pointer.y < excludeSize) {
        return;
      }
      if (this.isShowing) this.advanceDialogue();
    });

    this.container = this.add.container(0, height - 150);
    this.container.setVisible(false);
    this.container.setDepth(100); // Above hit zone

    this.bg = this.add.rectangle(width / 2, 0, width - 40, 120, 0x222222, 0.95);
    this.bg.setStrokeStyle(2, 0x87ceeb);

    this.speakerText = this.add.text(40, -40, '', {
      font: 'bold 16px Courier New',
      color: '#87CEEB',
    });

    this.dialogueText = this.add.text(40, -10, '', {
      font: '14px Courier New',
      color: '#ffffff',
      wordWrap: { width: width - 100 },
    });

    this.continueText = this.add.text(width - 60, 40, '▶', {
      font: '20px Arial',
      color: '#87CEEB',
    });

    this.container.add([this.bg, this.speakerText, this.dialogueText, this.continueText]);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => {
      if (this.isShowing) this.advanceDialogue();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.isShowing) this.advanceDialogue();
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.isShowing) this.advanceDialogue();
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isShowing) this.dismissAllDialogue();
    });
  }

  showDialogue(key: string): void {
    const text = t(key);
    if (!text || text === key) return;

    this.dialogueQueue.push({ key, text });

    if (!this.isShowing) {
      this.displayNextDialogue();
    }
  }

  private displayNextDialogue(): void {
    if (this.dialogueQueue.length === 0) {
      this.hideDialogue();
      return;
    }

    if (!this.speakerText || !this.dialogueText || !this.container) {
      return;
    }

    const dialogue = this.dialogueQueue.shift()!;
    this.isShowing = true;

    // Bring dialogue scene to top so it renders above HUD
    this.scene.bringToTop();

    // Enable fullscreen hit zone for click-to-dismiss
    if (this.hitZone) {
      this.hitZone.setInteractive({ useHandCursor: true });
    }

    if (this.bg) {
      this.bg.setInteractive({ useHandCursor: true });
    }

    let speaker = 'Jean-Pierre';
    if (dialogue.key.includes('marie')) speaker = 'Marie';
    else if (dialogue.key.includes('thierry')) speaker = 'Thierry';
    else if (dialogue.key.includes('emilie')) speaker = 'Émilie';
    else if (dialogue.key.includes('tutorial')) speaker = t('tutorial');

    this.speakerText.setText(speaker);
    this.dialogueText.setText(dialogue.text);
    this.container.setVisible(true);

    Accessibility.announce(speaker + ': ' + dialogue.text);

    this.tweens.add({
      targets: this.container,
      y: this.cameras.main.height - 130,
      duration: 200,
      ease: 'Power2',
    });
  }

  private advanceDialogue(): void {
    if (!this.isShowing) return;
    this.displayNextDialogue();
  }

  private hideDialogue(): void {
    this.isShowing = false;

    if (!this.container) return;

    // Disable hit zones
    if (this.hitZone) {
      this.hitZone.disableInteractive();
    }
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
      },
    });
  }

  private dismissAllDialogue(): void {
    // Clear queue and hide immediately
    this.dialogueQueue = [];
    this.hideDialogue();
  }

  /** Check if dialogue is currently being displayed */
  isDialogueShowing(): boolean {
    return this.isShowing;
  }

  shutdown(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.dialogueQueue = [];
    this.isShowing = false;
    this.container = null;
    this.bg = null;
    this.hitZone = null;
    this.speakerText = null;
    this.dialogueText = null;
    this.continueText = null;
  }
}
