import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { drawPortrait } from '../utils/characterPortraits';
import { isConfirmPressed, isBackPressed, getMappingFromGamepad } from '../utils/gamepad';
import { getMovementKeysString, getGroomKeyName, getWinchKeyName } from '../utils/keyboardLayout';
import { THEME } from '../config/theme';

/**
 * Les Aiguilles Blanches - Dialogue Scene
 * Shows character dialogues and tutorial messages
 */

// Canonical speaker for each dialogue key (fallback when no explicit speaker passed)
export const DIALOGUE_SPEAKERS: Record<string, string> = {
  tutorialIntro: 'Jean-Pierre',
  jeanPierreIntro: 'Jean-Pierre',
  level2Intro: 'Émilie',
  level3Intro: 'Émilie',
  level4Intro: 'Jean-Pierre',
  level4WinchIntro: 'Jean-Pierre',
  level4WinchIntroTouch: 'Jean-Pierre',
  level4WinchIntroGamepad: 'Jean-Pierre',
  level5Intro: 'Émilie',
  level6Intro: 'Thierry',
  thierryWarning: 'Thierry',
  avalancheWarning: 'Thierry',
  avalancheTrigger: 'Thierry',
  level8Intro: 'Marie',
  marieWelcome: 'Marie',
};

interface DialogueItem {
  key: string;
  text: string;
  speaker?: string;
}

export default class DialogueScene extends Phaser.Scene {
  private dialogueQueue: DialogueItem[] = [];
  private isShowing = false;
  private lastDismissedAt = 0;
  private container: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private continueText: Phaser.GameObjects.Text | null = null;
  private portraitGraphics: Phaser.GameObjects.Graphics | null = null;
  private portraitX = 0;
  private portraitSize = 0;
  private bevelBottom: Phaser.GameObjects.Rectangle | null = null;
  private bevelRight: Phaser.GameObjects.Rectangle | null = null;
  private currentBoxHeight = 130;

  // Typewriter state
  public fullText = '';
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private typewriterIndex = 0;
  private isTyping = false;
  private typewriterSafetyTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  // Dialogue box base height (minimum)
  private readonly dialogueBoxHeight = 130;
  // Max box height — capped to avoid covering too much gameplay
  private maxBoxHeight = 200;
  // Text area dimensions (set in create)
  private textAreaWidth = 200;
  private textStartX = 0;
  
  // Get the Y position for dialogue based on touch controls
  private getDialogueShowY(): number {
    const height = this.cameras.main.height;
    const defaultY = height - this.currentBoxHeight; // Default position without touch controls
    
    if (!this.areTouchControlsVisible()) {
      return defaultY;
    }
    
    // Get touch controls top edge from HUDScene
    const hudScene = this.scene.get('HUDScene') as { getTouchControlsTopEdge?: () => number } | null;
    if (hudScene?.getTouchControlsTopEdge) {
      const touchTop = hudScene.getTouchControlsTopEdge();
      // Position dialogue so its bottom edge (Y + boxHeight/2) is above touch controls
      return touchTop - this.currentBoxHeight / 2;
    }
    
    return defaultY;
  }
  
  // Get starting Y position (slightly below show position for animation)
  private getDialogueY(): number {
    return this.getDialogueShowY() + 20;
  }

  /** Resize the dialogue box to fit longer text */
  private resizeDialogueBox(newHeight: number): void {
    if (!this.bg) return;
    const oldH = this.currentBoxHeight;
    this.currentBoxHeight = newHeight;
    // Resize bg (origin is center)
    this.bg.height = newHeight;
    // Move bottom bevel
    if (this.bevelBottom) this.bevelBottom.setY(newHeight / 2 - 3);
    // Resize side bevels
    if (this.bevelRight) this.bevelRight.height = newHeight;
    // Move continue indicator
    if (this.continueText) this.continueText.setY(newHeight / 2 - 20);
    // Resize portrait to stay centered
    if (this.portraitGraphics) this.portraitGraphics.setY((newHeight - oldH) / 4);
  }
  
  // Check if HUDScene's touch controls are currently visible
  private areTouchControlsVisible(): boolean {
    const hudScene = this.scene.get('HUDScene') as { touchControlsContainer?: Phaser.GameObjects.Container } | null;
    return hudScene?.touchControlsContainer?.visible === true;
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

    this.container = this.add.container(0, this.getDialogueY());
    this.container.setVisible(false);
    this.container.setDepth(100); // Above hit zone

    const boxWidth = width - 40;
    const boxHeight = this.dialogueBoxHeight;
    const bevelWidth = 3;
    const bevelLight = 0x555555;
    const bevelDark = 0x111111;
    const panelFill = 0x1a1a1a;
    const portraitSize = Math.round(boxHeight * 0.6);
    const portraitMargin = Math.round((boxHeight - portraitSize) / 2);
    const textStartX = 20 + portraitSize + portraitMargin + 10;
    this.textStartX = textStartX;
    this.textAreaWidth = boxWidth - textStartX - 50;
    // Cap box height to ~30% of screen so gameplay stays visible
    this.maxBoxHeight = Math.max(this.dialogueBoxHeight, Math.round(height * 0.3));

    // Main background
    const bgX = width / 2;
    this.bg = this.add.rectangle(bgX, 0, boxWidth, boxHeight, panelFill);
    // Bevel edges (top=light, left=light, bottom=dark, right=dark)
    const bevelTop = this.add.rectangle(bgX, -boxHeight / 2, boxWidth, bevelWidth, bevelLight).setOrigin(0.5, 0);
    const bevelLeft = this.add.rectangle(bgX - boxWidth / 2, 0, bevelWidth, boxHeight, bevelLight).setOrigin(0, 0.5);
    this.bevelBottom = this.add.rectangle(bgX, boxHeight / 2 - bevelWidth, boxWidth, bevelWidth, bevelDark).setOrigin(0.5, 0);
    this.bevelRight = this.add.rectangle(bgX + boxWidth / 2 - bevelWidth, 0, bevelWidth, boxHeight, bevelDark).setOrigin(0, 0.5);
    this.currentBoxHeight = boxHeight;
    // Accent stripe inside top bevel
    const accent = this.add.rectangle(bgX, -boxHeight / 2 + bevelWidth, boxWidth - bevelWidth * 2, 1, THEME.colors.infoHex).setOrigin(0.5, 0);

    // Character portrait
    const pX = bgX - boxWidth / 2 + 20 + portraitSize / 2;
    this.portraitX = pX;
    this.portraitSize = portraitSize;
    this.portraitGraphics = this.add.graphics();
    
    this.speakerText = this.add.text(textStartX, -boxHeight / 2 + 12, '', {
      fontFamily: THEME.fonts.family,
      fontSize: THEME.fonts.sizes.medium + 'px',
      fontStyle: 'bold',
      color: THEME.colors.info,
    });

    // Separator line under speaker name
    const separator = this.add.rectangle(textStartX, -boxHeight / 2 + 32, boxWidth - textStartX - 40, 1, THEME.colors.infoHex, 0.4).setOrigin(0, 0.5);

    this.dialogueText = this.add.text(textStartX, -boxHeight / 2 + 40, '', {
      fontFamily: THEME.fonts.family,
      fontSize: THEME.fonts.sizes.small + 'px',
      color: THEME.colors.textPrimary,
      wordWrap: { width: boxWidth - textStartX - 50 },
    });

    // Continue indicator
    const hasGamepad = this.input.gamepad && this.input.gamepad.total > 0;
    const continueHint = hasGamepad ? '[A]' : '>>';
    this.continueText = this.add.text(bgX + boxWidth / 2 - 30, boxHeight / 2 - 20, continueHint, {
      fontFamily: THEME.fonts.family,
      fontSize: THEME.fonts.sizes.small + 'px',
      fontStyle: 'bold',
      color: THEME.colors.info,
    }).setOrigin(0.5).setAlpha(0);

    this.container.add([
      this.bg, bevelTop, bevelLeft, this.bevelBottom, this.bevelRight, accent,
      this.portraitGraphics, this.speakerText, separator,
      this.dialogueText, this.continueText,
    ]);

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

    // Initialize gamepad state to current (prevent phantom presses from previous scene)
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.gamepadAPressed = isConfirmPressed(pad);
        this.gamepadBPressed = isBackPressed(pad);
      }
    } else {
      this.gamepadAPressed = false;
      this.gamepadBPressed = false;
    }
  }

  private gamepadAPressed = false;
  private gamepadBPressed = false;

  update(): void {
    // Gamepad buttons to advance/dismiss dialogue (handles Nintendo swap)
    if (this.isShowing && this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        const confirmPressed = isConfirmPressed(pad);
        if (confirmPressed && !this.gamepadAPressed) {
          this.advanceDialogue();
        }
        this.gamepadAPressed = confirmPressed;

        const backPressed = isBackPressed(pad);
        if (backPressed && !this.gamepadBPressed) {
          this.dismissAllDialogue();
        }
        this.gamepadBPressed = backPressed;
      }
    }
  }

  showDialogue(key: string, speaker?: string): void {
    let text = t(key);
    if (!text || text === key) return;

    // Replace dynamic key placeholders
    text = text.replace('{keys}', getMovementKeysString());
    text = text.replace('{groomKey}', getGroomKeyName());
    text = text.replace('{winchKey}', getWinchKeyName());

    // Split into pages if text would overflow max box height
    const pages = this.splitTextToPages(text);
    for (const page of pages) {
      this.dialogueQueue.push({ key, text: page, speaker });
    }

    if (!this.isShowing) {
      this.displayNextDialogue();
    }
  }

  /** Split text into pages that fit within maxBoxHeight */
  private splitTextToPages(text: string): string[] {
    if (!this.dialogueText) return [text];

    // Save current typewriter text to restore after measuring
    const savedText = this.isTyping
      ? this.fullText.substring(0, this.typewriterIndex)
      : this.dialogueText.text;

    // Measure full text height
    this.dialogueText.setText(text);
    const fullHeight = this.dialogueText.height;
    // Available text height inside box: maxBoxHeight - 65 (top padding 40 + bottom padding 25)
    const maxTextHeight = this.maxBoxHeight - 65;

    if (fullHeight <= maxTextHeight) {
      this.dialogueText.setText(savedText);
      return [text];
    }

    // Need to split — find word boundaries that fit
    const words = text.split(' ');
    const pages: string[] = [];
    let currentWords: string[] = [];

    for (const word of words) {
      currentWords.push(word);
      this.dialogueText.setText(currentWords.join(' '));
      if (this.dialogueText.height > maxTextHeight && currentWords.length > 1) {
        // Remove last word, save page
        currentWords.pop();
        pages.push(currentWords.join(' '));
        currentWords = [word];
      }
    }
    if (currentWords.length > 0) {
      pages.push(currentWords.join(' '));
    }

    this.dialogueText.setText(savedText);
    return pages.length > 0 ? pages : [text];
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

    // Kill any hide tween in progress to prevent race conditions
    this.tweens.killTweensOf(this.container);

    // Bring dialogue scene to top so it renders above HUD
    this.scene.bringToTop();

    // Enable fullscreen hit zone for click-to-dismiss
    if (this.hitZone) {
      this.hitZone.setInteractive({ useHandCursor: true });
    }

    if (this.bg) {
      this.bg.setInteractive({ useHandCursor: true });
    }

    // Use explicit speaker, then DIALOGUE_SPEAKERS map, then default
    const speaker = dialogue.speaker || DIALOGUE_SPEAKERS[dialogue.key] || 'Jean-Pierre';

    this.speakerText.setText(speaker);
    
    // Set portrait
    if (this.portraitGraphics) {
      this.portraitGraphics.clear();
      // Reset Y position in case it was moved by resize
      this.portraitGraphics.setY(0);
      try {
        drawPortrait(this.portraitGraphics, speaker, this.portraitX, 0, this.portraitSize);
      } catch (e) {
        console.error('Portrait draw error:', e);
      }
    }

    // Typewriter effect — reveal text character by character
    this.fullText = dialogue.text;
    this.typewriterIndex = 0;
    this.isTyping = true;
    
    // Reset box to base height, then grow if needed
    if (this.currentBoxHeight !== this.dialogueBoxHeight) {
      this.resizeDialogueBox(this.dialogueBoxHeight);
    }
    
    // Measure required height by setting full text, then clear for typewriter
    this.dialogueText.setText(this.fullText);
    const textHeight = this.dialogueText.height;
    // Text starts at -boxHeight/2 + 40, must end before boxHeight/2 - 25
    // So: textHeight must be < boxHeight - 65
    const minBoxForText = textHeight + 65;
    const neededHeight = Math.min(this.maxBoxHeight, Math.max(this.dialogueBoxHeight, minBoxForText));
    if (neededHeight > this.currentBoxHeight) {
      this.resizeDialogueBox(neededHeight);
    }

    this.dialogueText.setText('');
    if (this.continueText) this.continueText.setAlpha(0);
    
    // Stop any existing typewriter
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.typewriterSafetyTimer) {
      this.typewriterSafetyTimer.destroy();
      this.typewriterSafetyTimer = null;
    }
    
    // Capture text in closure so mutations to this.fullText can't desync the timer
    const targetText = this.fullText;
    const targetLength = targetText.length;
    
    if (targetLength > 0) {
      this.typewriterTimer = this.time.addEvent({
        delay: 25,
        repeat: targetLength - 1,
        callback: () => {
          this.typewriterIndex++;
          if (this.dialogueText) {
            this.dialogueText.setText(targetText.substring(0, this.typewriterIndex));
          }
          if (this.typewriterIndex >= targetLength) {
            this.isTyping = false;
            if (this.continueText) this.continueText.setAlpha(0.8);
          }
        },
      });
      
      // Safety timeout: force-complete if timer doesn't finish in time
      const safetyMs = targetLength * 25 + 2000;
      this.typewriterSafetyTimer = this.time.delayedCall(safetyMs, () => {
        if (this.isTyping) {
          this.completeTypewriter();
        }
      });
    } else {
      // Empty text — show continue hint immediately
      this.isTyping = false;
      if (this.continueText) this.continueText.setAlpha(0.8);
    }
    
    // Position container at starting Y (off-screen), then tween to show position
    // Position is dynamic based on whether touch controls are currently visible
    this.container.setY(this.getDialogueY());
    this.container.setVisible(true);

    Accessibility.announce(speaker + ': ' + dialogue.text);

    this.tweens.add({
      targets: this.container,
      y: this.getDialogueShowY(),
      duration: 200,
      ease: 'Power2',
    });
  }

  /** Force-complete the typewriter effect, showing full text immediately */
  private completeTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.typewriterSafetyTimer) {
      this.typewriterSafetyTimer.destroy();
      this.typewriterSafetyTimer = null;
    }
    this.isTyping = false;
    this.typewriterIndex = this.fullText.length;
    if (this.dialogueText) this.dialogueText.setText(this.fullText);
    if (this.continueText) this.continueText.setAlpha(0.8);
  }

  private advanceDialogue(): void {
    if (!this.isShowing) return;
    
    // If typewriter is still running, skip to full text
    if (this.isTyping) {
      this.completeTypewriter();
      return;
    }
    
    this.displayNextDialogue();
  }

  private hideDialogue(): void {
    this.isShowing = false;
    this.lastDismissedAt = Date.now();
    this.isTyping = false;
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.typewriterSafetyTimer) {
      this.typewriterSafetyTimer.destroy();
      this.typewriterSafetyTimer = null;
    }

    if (!this.container) return;

    // Kill any existing dialogue tweens to prevent hide/show races
    this.tweens.killTweensOf(this.container);

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
        // Only hide if we're still in hidden state (not re-shown during tween)
        if (this.container && !this.isShowing) {
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
    // Brief cooldown after dismiss prevents ESC from both dismissing dialogue
    // and triggering pause in the same keypress (both scenes handle keydown-ESC)
    if (!this.isShowing && Date.now() - this.lastDismissedAt < 200) return true;
    return this.isShowing;
  }

  shutdown(): void {
    this.input.keyboard?.removeAllListeners();
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    if (this.typewriterSafetyTimer) {
      this.typewriterSafetyTimer.destroy();
      this.typewriterSafetyTimer = null;
    }
    this.tweens.killAll();
    this.children.removeAll(true);
    this.dialogueQueue = [];
    this.isShowing = false;
    this.isTyping = false;
    this.container = null;
    this.bg = null;
    this.hitZone = null;
    this.speakerText = null;
    this.dialogueText = null;
    this.continueText = null;
    this.portraitGraphics = null;
  }
}
