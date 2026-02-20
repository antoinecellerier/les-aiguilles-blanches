import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { drawPortrait } from '../utils/characterPortraits';
import { isConfirmPressed, isBackPressed, getMappingFromGamepad } from '../utils/gamepad';
import { getMovementKeysString, getGroomKeyName, getWinchKeyName } from '../utils/keyboardLayout';
import { THEME } from '../config/theme';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { SCENE_KEYS } from '../config/sceneKeys';
import { ResizeManager } from '../utils/resizeManager';
import { playVoiceBlip } from '../systems/VoiceSounds';
import { GAME_EVENTS } from '../types/GameSceneInterface';

/**
 * Les Aiguilles Blanches - Dialogue Scene
 * Shows character dialogues and tutorial messages
 */

// Canonical speaker for each dialogue key (fallback when no explicit speaker passed)
export const DIALOGUE_SPEAKERS: Record<string, string> = {
  tutorialIntro: 'Jean-Pierre',
  jeanPierreIntro: 'Jean-Pierre',
  level_chamoisIntro: 'Émilie',
  level_airZoneIntro: 'Émilie',
  level_aigleIntro: 'Jean-Pierre',
  level_glacierIntro: 'Thierry',
  level_glacierIntroTouch: 'Thierry',
  level_tubeIntro: 'Émilie',
  level_verticaleIntro: 'Thierry',
  level_colDangereuxIntro: 'Thierry',
  level_tempeteIntro: 'Marie',
  level_coupeDesAiguillesIntro: 'Jean-Pierre',
  avalancheWarning: 'Thierry',
  avalancheTrigger: 'Thierry',
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
  private countdownBar: Phaser.GameObjects.Rectangle | null = null;

  // Typewriter state
  public fullText = '';
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private typewriterIndex = 0;
  private isTyping = false;
  private typewriterSafetyTimer: Phaser.Time.TimerEvent | null = null;
  private currentSpeaker = 'Jean-Pierre';

  constructor() {
    super({ key: SCENE_KEYS.DIALOGUE });
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
    const hudScene = this.scene.get(SCENE_KEYS.HUD) as { getTouchControlsTopEdge?: () => number } | null;
    if (hudScene?.getTouchControlsTopEdge) {
      const touchTop = hudScene.getTouchControlsTopEdge();
      // Position dialogue so its bottom edge (Y + boxHeight/2) is above touch controls
      const y = touchTop - this.currentBoxHeight / 2;
      return y;
    }
    
    return defaultY;
  }
  
  // Get starting Y position (slightly below show position for animation)
  private getDialogueY(): number {
    return this.getDialogueShowY() + 20;
  }

  /** Reposition dialogue when touch controls appear/change. */
  private onTouchControlsChanged(): void {
    if (this.isShowing && this.container) {
      // Kill show tween so it doesn't override the repositioned Y
      this.tweens.killTweensOf(this.container);
      this.container.setY(this.getDialogueShowY());
    }
  }

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
    const hudScene = this.scene.get(SCENE_KEYS.HUD) as { touchControlsContainer?: Phaser.GameObjects.Container } | null;
    return hudScene?.touchControlsContainer?.visible === true;
  }

  // Saved state for resize restart
  private savedQueue: DialogueItem[] | null = null;
  private savedCurrentText: string | null = null;
  private savedCurrentSpeaker: string | null = null;

  private resizeManager!: ResizeManager;
  private excludeSize = 200;
  private isStorm = false;

  init(data?: { weather?: string }): void {
    this.isStorm = data?.weather === 'storm';
  }

  create(): void {
    this.events.once('shutdown', this.shutdown, this);

    this.dialogueQueue = [];
    this.isShowing = false;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.resizeManager = new ResizeManager(this, {
      onBeforeRestart: () => {
        if (this.isShowing) {
          const currentItem: DialogueItem = { key: '', text: this.fullText, speaker: this.speakerText?.text };
          this.savedQueue = [currentItem, ...this.dialogueQueue];
          this.savedCurrentText = this.fullText;
          this.savedCurrentSpeaker = this.speakerText?.text || null;
        } else {
          this.savedQueue = this.dialogueQueue.length > 0 ? [...this.dialogueQueue] : null;
        }
      },
    });
    this.resizeManager.register();

    // Reposition dialogue when touch controls appear mid-game (Firefox desktop)
    this.game.events.on(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsChanged, this);
    // Exclude top-right corner (200x200) where HUD buttons are located
    
    // Create hit zone that covers most of screen except top-right button area
    // Use a larger zone that starts below the button area
    this.hitZone = this.add.rectangle(width / 2, height / 2 + this.excludeSize / 4, width, height - this.excludeSize / 2, 0x000000, 0);
    this.hitZone.setDepth(DEPTHS.DIALOGUE_HITZONE); // Above game, below dialogue box
    this.hitZone.setInteractive();
    this.hitZone.disableInteractive(); // Start disabled
    this.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Extra check: ignore clicks in top-right corner where buttons are
      const w = this.cameras.main.width;
      if (pointer.x > w - this.excludeSize && pointer.y < this.excludeSize) {
        return;
      }
      if (this.isShowing) this.advanceDialogue();
    });

    this.container = this.add.container(0, this.getDialogueY());
    this.container.setVisible(false);
    this.container.setDepth(DEPTHS.DIALOGUE_BOX); // Above hit zone

    const boxWidth = Math.min(width - 40, 800);
    const boxHeight = this.dialogueBoxHeight;
    const bevelWidth = 3;
    const bevelLight = 0x555555;
    const bevelDark = 0x111111;
    const panelFill = 0x1a1a1a;
    const portraitSize = Math.round(boxHeight * 0.6);
    const portraitMargin = Math.round((boxHeight - portraitSize) / 2);
    // bgX is the horizontal center of the box
    const bgX = width / 2;
    const boxLeft = bgX - boxWidth / 2;
    const textStartX = boxLeft + 20 + portraitSize + portraitMargin + 10;
    this.textStartX = textStartX;
    this.textAreaWidth = boxWidth - (textStartX - boxLeft) - 50;
    // Use medium font on wider screens where the box isn't cramped
    const dialogueFontSize = width >= 600 ? THEME.fonts.sizes.medium : THEME.fonts.sizes.small;
    // Cap box height to ~30% of screen so gameplay stays visible
    this.maxBoxHeight = Math.max(this.dialogueBoxHeight, Math.round(height * 0.3));

    // Main background
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
    const separator = this.add.rectangle(textStartX, -boxHeight / 2 + 32, (bgX + boxWidth / 2 - 40) - textStartX, 1, THEME.colors.infoHex, 0.4).setOrigin(0, 0.5);

    this.dialogueText = this.add.text(textStartX, -boxHeight / 2 + 40, '', {
      fontFamily: THEME.fonts.family,
      fontSize: dialogueFontSize + 'px',
      color: THEME.colors.textPrimary,
      wordWrap: { width: this.textAreaWidth },
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

    // Storm: snow accumulation on top of dialogue box
    if (this.isStorm) {
      const snowG = this.add.graphics();
      snowG.fillStyle(0xf0f5f8, 0.9);
      const snowY = -boxHeight / 2 - 2;
      // Irregular snow line along the top edge
      for (let sx = -boxWidth / 2; sx < boxWidth / 2; sx += 6) {
        const h = 2 + Math.abs(Math.sin(sx * 0.15)) * 3;
        snowG.fillRect(bgX + sx, snowY - h + 2, 6, h);
      }
      this.container.add(snowG);
    }

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

    // Restore dialogue state after resize restart
    if (this.savedQueue && this.savedQueue.length > 0) {
      this.dialogueQueue = this.savedQueue;
      this.savedQueue = null;
      this.displayNextDialogue();
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
    if (!this.dialogueText || !this.dialogueText.active) return;
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

  /** Show a countdown bar that shrinks to zero over the given duration. */
  showCountdown(durationMs: number): void {
    this.clearCountdown();
    if (!this.container || !this.bg) return;
    const barWidth = this.bg.width - 12;
    const barHeight = 3;
    // Position inside bottom bevel, same x-center as bg
    const barY = this.currentBoxHeight / 2 - 10;
    this.countdownBar = this.add.rectangle(this.bg.x, barY, barWidth, barHeight, THEME.colors.infoHex, 0.6)
      .setOrigin(0.5);
    this.container.add(this.countdownBar);
    // Hide >> prompt while countdown is active
    if (this.continueText) this.continueText.setVisible(false);
    this.tweens.add({
      targets: this.countdownBar,
      scaleX: 0,
      duration: durationMs,
      ease: 'Linear',
    });
  }

  private clearCountdown(): void {
    if (this.countdownBar) {
      this.tweens.killTweensOf(this.countdownBar);
      this.countdownBar.destroy();
      this.countdownBar = null;
    }
    if (this.continueText) this.continueText.setVisible(true);
  }

  /** Split text into pages that fit within maxBoxHeight */
  private splitTextToPages(text: string): string[] {
    if (!this.dialogueText || !this.dialogueText.active) return [text];

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
    this.currentSpeaker = speaker;

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
        delay: BALANCE.TYPEWRITER_CHAR_DELAY,
        repeat: targetLength - 1,
        callback: () => {
          this.typewriterIndex++;
          const char = targetText[this.typewriterIndex - 1];
          if (char) playVoiceBlip(this.currentSpeaker, char);
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
      const safetyMs = targetLength * BALANCE.TYPEWRITER_CHAR_DELAY + BALANCE.TYPEWRITER_SAFETY_BUFFER;
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
      duration: BALANCE.DIALOGUE_SLIDE_DURATION,
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

    this.clearCountdown();

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
      duration: BALANCE.DIALOGUE_SLIDE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        // Only hide if we're still in hidden state (not re-shown during tween)
        if (this.container && !this.isShowing) {
          this.container.setVisible(false);
        }
      },
    });
  }

  dismissAllDialogue(): void {
    // Clear queue and hide immediately
    this.dialogueQueue = [];
    this.hideDialogue();
    this.game.events.emit(GAME_EVENTS.DIALOGUE_DISMISSED);
  }

  /** Check if dialogue is currently being displayed */
  isDialogueShowing(): boolean {
    // Brief cooldown after dismiss prevents ESC from both dismissing dialogue
    // and triggering pause in the same keypress (both scenes handle keydown-ESC)
    if (!this.isShowing && Date.now() - this.lastDismissedAt < 200) return true;
    return this.isShowing;
  }

  shutdown(): void {
    this.resizeManager?.destroy();
    this.game.events.off(GAME_EVENTS.TOUCH_CONTROLS_TOP, this.onTouchControlsChanged, this);
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
