import Phaser from 'phaser';
import { t, Accessibility } from '../setup';
import { THEME, buttonStyle, titleStyle } from '../config/theme';
import { isConfirmPressed, isBackPressed } from '../utils/gamepad';

/**
 * Les Aiguilles Blanches - Pause Scene
 * Pause menu overlay
 */

interface PauseSceneData {
  gameScene: Phaser.Scene & { levelIndex: number; resumeGame: () => void };
}

export default class PauseScene extends Phaser.Scene {
  private gameScene!: PauseSceneData['gameScene'];

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: PauseSceneData): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    // Bring pause menu to top so it renders above dialogue and HUD
    this.scene.bringToTop();
    
    const { width, height } = this.cameras.main;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.overlayDim, THEME.opacity.overlay);

    // Panel
    this.add.rectangle(width / 2, height / 2, 300, 350, THEME.colors.panelBg, THEME.opacity.panelBg);

    // Title
    this.add.text(width / 2, height / 2 - 130, t('pauseTitle') || 'Paused', titleStyle())
      .setOrigin(0.5);

    // Buttons
    const btnStyle = buttonStyle();

    const buttonDefs = [
      { text: 'resume', callback: () => this.resumeGame() },
      { text: 'restart', callback: () => this.restartLevel() },
      { text: 'settings', callback: () => this.openSettings() },
      { text: 'quit', callback: () => this.quitToMenu() },
    ];

    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.selectedIndex = 0;

    buttonDefs.forEach((btn, i) => {
      const button = this.add.text(width / 2, height / 2 - 50 + i * 55, t(btn.text) || btn.text, btnStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.selectButton(i))
        .on('pointerout', () => this.updateButtonStyles())
        .on('pointerdown', btn.callback);
      
      this.menuButtons.push(button);
      this.buttonCallbacks.push(btn.callback);
    });

    this.updateButtonStyles();

    // Keyboard navigation
    this.input.keyboard?.on('keydown-UP', () => this.navigateMenu(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.navigateMenu(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.activateSelected());
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());

    // Initialize gamepad button state to current state (prevent phantom presses)
    this.gamepadNavCooldown = 0;
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        this.gamepadAPressed = pad.buttons[0]?.pressed || false;
        this.gamepadBPressed = pad.buttons[1]?.pressed || false;
        this.gamepadStartPressed = pad.buttons[9]?.pressed || false;
      }
    } else {
      this.gamepadAPressed = false;
      this.gamepadBPressed = false;
      this.gamepadStartPressed = false;
    }

    Accessibility.announce(t('pauseTitle'));
  }

  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private selectedIndex = 0;
  private gamepadAPressed = false;
  private gamepadBPressed = false;
  private gamepadStartPressed = false;
  private gamepadNavCooldown = 0;

  private selectButton(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(index, this.menuButtons.length - 1));
    this.updateButtonStyles();
  }

  private navigateMenu(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + this.menuButtons.length) % this.menuButtons.length;
    this.updateButtonStyles();
  }

  private activateSelected(): void {
    if (this.buttonCallbacks[this.selectedIndex]) {
      this.buttonCallbacks[this.selectedIndex]();
    }
  }

  private updateButtonStyles(): void {
    this.menuButtons.forEach((btn, i) => {
      if (i === this.selectedIndex) {
        btn.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
        btn.setScale(1.1);
      } else {
        btn.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
        btn.setScale(1);
      }
    });
  }

  update(_time: number, delta: number): void {
    // Gamepad support for pause menu
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        // Navigation cooldown
        this.gamepadNavCooldown = Math.max(0, this.gamepadNavCooldown - delta);
        
        // D-pad or stick navigation
        const stickY = pad.leftStick.y;
        if (this.gamepadNavCooldown <= 0) {
          if (stickY < -0.5 || pad.up) {
            this.navigateMenu(-1);
            this.gamepadNavCooldown = 200;
          } else if (stickY > 0.5 || pad.down) {
            this.navigateMenu(1);
            this.gamepadNavCooldown = 200;
          }
        }
        
        // Use controller-aware button mapping (handles Nintendo swap)
        const confirmPressed = isConfirmPressed(pad);
        if (confirmPressed && !this.gamepadAPressed) {
          this.activateSelected();
        }
        this.gamepadAPressed = confirmPressed;

        // Back button or Start to resume
        const backPressed = isBackPressed(pad);
        const startPressed = pad.buttons[9]?.pressed ?? false;
        
        if ((backPressed && !this.gamepadBPressed) || (startPressed && !this.gamepadStartPressed)) {
          this.resumeGame();
        }
        
        this.gamepadBPressed = backPressed;
        this.gamepadStartPressed = startPressed;
      }
    }
  }

  private resumeGame(): void {
    this.scene.stop();
    this.gameScene.resumeGame();
  }

  private restartLevel(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('GameScene', { level: this.gameScene.levelIndex });
  }

  private openSettings(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('SettingsScene', { returnTo: 'GameScene', levelIndex: this.gameScene.levelIndex });
  }

  private quitToMenu(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.stop('DialogueScene');
    this.scene.start('MenuScene');
  }

  shutdown(): void {
    this.input.keyboard?.removeAllListeners();
  }
}
