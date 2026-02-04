import Phaser from 'phaser';
import { t, getLanguage, setLanguage, Accessibility, SupportedLanguage, ColorblindMode } from '../setup';
import { getKeyboardLayout, setKeyboardLayout, getLayoutDefaults, AVAILABLE_LAYOUTS, KeyboardLayout } from '../utils/keyboardLayout';

/**
 * Les Aiguilles Blanches - Settings Scene
 * Language, accessibility, and control rebinding
 */

interface SettingsSceneData {
  returnTo?: string;
  levelIndex?: number;
}

interface KeyBindings {
  up: number;
  down: number;
  left: number;
  right: number;
  groom: number;
  winch: number;
}

interface LangButton {
  btn: Phaser.GameObjects.Text;
  code: string;
}

interface ColorblindButton {
  btn: Phaser.GameObjects.Text;
  id: string;
}

// Storage version - increment when making breaking changes to binding format
const BINDINGS_VERSION = 2;

export default class SettingsScene extends Phaser.Scene {
  private returnTo: string | null = null;
  private levelIndex = 0;
  private rebindingAction: string | null = null;
  private bindings: KeyBindings = this.getDefaultBindings();
  private displayNames: Record<number, string> = {}; // Store display names for keyCodes
  private rebindButtons: Record<string, Phaser.GameObjects.Text> = {};
  private rebindStatus: Phaser.GameObjects.Text | null = null;
  private langButtons: LangButton[] = [];
  private colorblindButtons: ColorblindButton[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data?.returnTo || null;
    this.levelIndex = data?.levelIndex || 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor(0x1a2a3e);
    this.loadBindings();

    const padding = Math.max(15, width * 0.02);
    const fontSize = Math.max(10, Math.min(13, height / 55));
    const lineHeight = fontSize * 2;
    const startX = padding;
    const colWidth = (width - padding * 3) / 2;

    // Title
    this.add.text(width / 2, padding, '⚙️ ' + (t('settings') || 'Settings'), {
      fontFamily: 'Courier New, monospace',
      fontSize: (fontSize * 1.6) + 'px',
      fontStyle: 'bold',
      color: '#87CEEB',
    }).setOrigin(0.5, 0);

    let leftY = padding + lineHeight * 1.8;
    let rightY = padding + lineHeight * 1.8;

    // === LEFT COLUMN ===

    // Language
    this.add.text(startX, leftY, '🌐 ' + (t('language') || 'Language'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    leftY += lineHeight * 0.9;

    const languages: { code: SupportedLanguage; name: string }[] = [
      { code: 'fr', name: '🇫🇷' },
      { code: 'en', name: '🇬🇧' },
      { code: 'de', name: '🇩🇪' },
      { code: 'it', name: '🇮🇹' },
      { code: 'es', name: '🇪🇸' },
    ];

    const currentLang = getLanguage();
    this.langButtons = [];
    languages.forEach((lang, i) => {
      const isActive = currentLang === lang.code;
      const btn = this.add.text(startX + i * 40, leftY, lang.name, {
        fontFamily: 'Courier New',
        fontSize: '16px',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
        padding: { x: 5, y: 3 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLang(lang.code));
      this.langButtons.push({ btn, code: lang.code });
    });
    leftY += lineHeight * 1.1;

    // Accessibility
    this.add.text(startX, leftY, '♿ ' + (t('accessibility') || 'Accessibility'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    leftY += lineHeight * 0.9;

    // High Contrast
    this.createToggle(startX, leftY, t('highContrast') || 'High Contrast',
      Accessibility.settings.highContrast, fontSize,
      (val) => { Accessibility.settings.highContrast = val; Accessibility.saveSettings(); });
    leftY += lineHeight * 0.8;

    // Reduced Motion
    this.createToggle(startX, leftY, t('reducedMotion') || 'Reduced Motion',
      Accessibility.settings.reducedMotion, fontSize,
      (val) => { Accessibility.settings.reducedMotion = val; Accessibility.saveSettings(); });
    leftY += lineHeight;

    // Colorblind
    this.add.text(startX, leftY, t('colorblindMode') || 'Colorblind:', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#aaaaaa',
    });
    leftY += lineHeight * 0.7;

    const cbModes: ColorblindMode[] = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];
    this.colorblindButtons = [];
    cbModes.forEach((mode, i) => {
      const isActive = Accessibility.settings.colorblindMode === mode;
      const label = (t(mode) || mode).substring(0, 7);
      const btn = this.add.text(startX + (i % 2) * (colWidth * 0.45), leftY + Math.floor(i / 2) * lineHeight * 0.7, label, {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 2) + 'px',
        color: isActive ? '#00FF00' : '#aaa',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
        padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setColorblindMode(mode));
      this.colorblindButtons.push({ btn, id: mode });
    });

    // === RIGHT COLUMN: Control Rebinding ===
    const rightX = width / 2 + padding;

    this.add.text(rightX, rightY, '🎮 ' + (t('controls') || 'Controls'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    rightY += lineHeight * 0.9;

    this.add.text(rightX, rightY, t('clickToRebind') || 'Click to rebind', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 2) + 'px',
      color: '#666666',
    });
    rightY += lineHeight * 0.8;

    this.rebindButtons = {};
    const actions = [
      { id: 'up', label: t('moveUp') || 'Up' },
      { id: 'down', label: t('moveDown') || 'Down' },
      { id: 'left', label: t('moveLeft') || 'Left' },
      { id: 'right', label: t('moveRight') || 'Right' },
      { id: 'groom', label: t('groom') || 'Groom' },
      { id: 'winch', label: t('winch') || 'Winch' },
    ];

    actions.forEach((action, i) => {
      const y = rightY + i * lineHeight * 0.75;

      this.add.text(rightX, y, action.label + ':', {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 1) + 'px',
        color: '#cccccc',
      });

      const currentBinding = this.bindings[action.id as keyof KeyBindings];
      const defaultBinding = this.getDefaultBindings()[action.id as keyof KeyBindings];
      const isCustom = currentBinding !== defaultBinding;
      
      const keyName = this.getKeyName(currentBinding);
      const btn = this.add.text(rightX + colWidth * 0.4, y, keyName + (isCustom ? ' *' : ''), {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 1) + 'px',
        color: isCustom ? '#FFDD00' : '#87CEEB',
        backgroundColor: isCustom ? '#5a5a2d' : '#2d5a7b',
        padding: { x: 8, y: 2 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.startRebind(action.id, btn));

      this.rebindButtons[action.id] = btn;
    });

    rightY += actions.length * lineHeight * 0.75 + lineHeight * 0.5;

    // Check if user has customized any bindings
    const hasCustomBindings = actions.some(action => 
      this.bindings[action.id as keyof KeyBindings] !== this.getDefaultBindings()[action.id as keyof KeyBindings]
    );

    // Keyboard layout selector
    const currentLayout = getKeyboardLayout();
    const isNonDefaultLayout = currentLayout !== 'qwerty';
    
    this.add.text(rightX, rightY, '⌨️ ' + (t('keyboardLayout') || 'Layout') + ':', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#aaaaaa',
    });
    rightY += lineHeight * 0.6;

    if (hasCustomBindings) {
      // Show "Custom" when user has overridden bindings
      this.add.text(rightX, rightY, t('customBindings') || 'Custom (user-defined)', {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 2) + 'px',
        color: '#FFDD00',
        fontStyle: 'italic',
      });
    } else {
      // Show layout selector buttons
      AVAILABLE_LAYOUTS.forEach((layout, idx) => {
        const isActive = currentLayout === layout.id;
        const btn = this.add.text(rightX + idx * 90, rightY, layout.id.toUpperCase(), {
          fontFamily: 'Courier New',
          fontSize: (fontSize - 2) + 'px',
          color: isActive ? '#000000' : '#ffffff',
          backgroundColor: isActive ? '#87ceeb' : '#555555',
          padding: { x: 6, y: 3 },
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setLayout(layout.id));
      });
    }

    rightY += lineHeight * 1.2;

    // Reset bindings button (below layout selector to make it clear it resets both)
    this.add.text(rightX, rightY, '🔄 ' + (t('resetControls') || 'Reset All'), {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#ffaaaa',
      backgroundColor: '#5a2d2d',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resetBindings());

    // Rebinding status text
    this.rebindStatus = this.add.text(width / 2, height - padding * 4, '', {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      color: '#FFFF00',
    }).setOrigin(0.5);

    // Back button
    const backLabel = this.returnTo ? (t('backToGame') || 'Back to Game') : (t('back') || 'Back');
    const backBtn = this.add.text(width / 2, height - padding * 2, '← ' + backLabel, {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: 20, y: 6 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setStyle({ backgroundColor: '#FF3300' }))
      .on('pointerout', () => backBtn.setStyle({ backgroundColor: '#CC2200' }))
      .on('pointerdown', () => this.goBack());

    // ESC to go back (only if not rebinding)
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.rebindingAction) {
        // Store keyCode (character-based) for Phaser compatibility
        // Store key for display, code for reference
        this.finishRebind(event.keyCode, event.key, event.code);
      } else if (event.code === 'Escape') {
        this.goBack();
      }
    });
  }

  private loadBindings(): void {
    const savedVersion = localStorage.getItem('snowGroomer_bindingsVersion');
    const saved = localStorage.getItem('snowGroomer_bindings');
    const savedNames = localStorage.getItem('snowGroomer_displayNames');
    const defaults = this.getDefaultBindings();

    // If version doesn't match, clear old bindings and use defaults
    if (savedVersion !== String(BINDINGS_VERSION)) {
      localStorage.removeItem('snowGroomer_bindings');
      localStorage.removeItem('snowGroomer_displayNames');
      this.bindings = defaults;
      this.displayNames = {};
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use saved values if they are valid numbers
        this.bindings = { ...defaults };
        for (const key of Object.keys(defaults) as Array<keyof KeyBindings>) {
          if (typeof parsed[key] === 'number' && parsed[key] > 0) {
            this.bindings[key] = parsed[key];
          }
        }
      } catch {
        this.bindings = defaults;
      }
    } else {
      this.bindings = defaults;
    }

    if (savedNames) {
      try {
        this.displayNames = JSON.parse(savedNames);
      } catch {
        this.displayNames = {};
      }
    }
  }

  private getDefaultBindings(): KeyBindings {
    // Use layout-specific defaults from utility
    return getLayoutDefaults();
  }

  private detectKeyboardLayout(): string {
    return getKeyboardLayout();
  }

  private saveBindings(): void {
    localStorage.setItem('snowGroomer_bindingsVersion', String(BINDINGS_VERSION));
    localStorage.setItem('snowGroomer_bindings', JSON.stringify(this.bindings));
    localStorage.setItem('snowGroomer_displayNames', JSON.stringify(this.displayNames));
  }

  private getKeyName(keyCode: number): string {
    if (!keyCode) return '?';
    
    // Use stored display name if available (from user's actual keyboard)
    if (this.displayNames[keyCode]) {
      return this.displayNames[keyCode];
    }
    
    // Fallback to special key names by keyCode
    const specialKeys: Record<number, string> = {
      38: '↑', 40: '↓', 37: '←', 39: '→',
      32: 'SPACE', 16: 'SHIFT', 17: 'CTRL', 18: 'ALT',
      13: 'ENTER', 9: 'TAB', 27: 'ESC',
      8: '⌫', 46: 'DEL',
    };
    if (specialKeys[keyCode]) return specialKeys[keyCode];
    
    // For letter/number keys, return the character
    if (keyCode >= 65 && keyCode <= 90) {
      return String.fromCharCode(keyCode); // A-Z
    }
    if (keyCode >= 48 && keyCode <= 57) {
      return String.fromCharCode(keyCode); // 0-9
    }
    
    return keyCode.toString();
  }

  private startRebind(actionId: string, btn: Phaser.GameObjects.Text): void {
    if (this.rebindingAction) return;

    this.rebindingAction = actionId;
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.rebindStatus?.setText(t('pressKey') || 'Press a key...');
  }

  private finishRebind(keyCode: number, keyChar: string, eventCode: string): void {
    if (!this.rebindingAction) return;

    if (eventCode === 'Escape') {
      this.cancelRebind();
      return;
    }

    const actionId = this.rebindingAction as keyof KeyBindings;
    this.bindings[actionId] = keyCode;
    
    // Store display name from the actual keyboard character
    if (keyChar.length === 1) {
      this.displayNames[keyCode] = keyChar.toUpperCase();
    } else {
      // For special keys, store a readable name
      this.displayNames[keyCode] = keyChar;
    }
    
    this.saveBindings();

    const btn = this.rebindButtons[actionId];
    btn.setText(this.getKeyName(keyCode) + ' *');
    btn.setStyle({ backgroundColor: '#5a5a2d', color: '#FFDD00' });

    this.rebindingAction = null;
    this.rebindStatus?.setText(t('saved') || 'Saved!');
    
    // Restart scene to refresh layout selector (shows "Custom" when bindings differ from defaults)
    this.time.delayedCall(800, () => this.scene.restart());
  }

  private cancelRebind(): void {
    if (!this.rebindingAction) return;

    const btn = this.rebindButtons[this.rebindingAction];
    btn.setText(this.getKeyName(this.bindings[this.rebindingAction as keyof KeyBindings]));
    btn.setStyle({ backgroundColor: '#2d5a7b' });

    this.rebindingAction = null;
    this.rebindStatus?.setText('');
  }

  private resetBindings(): void {
    // Reset keyboard layout to default (qwerty)
    setKeyboardLayout('qwerty');
    // Reset bindings to defaults for that layout
    this.bindings = this.getDefaultBindings();
    this.displayNames = {}; // Clear custom display names
    this.saveBindings();

    this.rebindStatus?.setText(t('controlsReset') || 'Controls reset!');
    // Restart scene to refresh all UI elements
    this.time.delayedCall(800, () => this.scene.restart());
  }

  private setLayout(layout: KeyboardLayout): void {
    setKeyboardLayout(layout);
    // Reset bindings to new layout defaults
    this.bindings = this.getDefaultBindings();
    this.displayNames = {}; // Clear custom display names
    this.saveBindings();
    // Refresh the scene to show updated buttons
    this.scene.restart();
  }

  private createToggle(
    x: number,
    y: number,
    label: string,
    initialValue: boolean,
    fontSize: number,
    onChange: (val: boolean) => void
  ): void {
    this.add.text(x, y, label, {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#cccccc',
    });

    const toggleX = x + 160;
    const btn = this.add.text(toggleX, y, initialValue ? '✓ ON' : '✗ OFF', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: initialValue ? '#00FF00' : '#888888',
      backgroundColor: initialValue ? '#1a5a1a' : '#333333',
      padding: { x: 6, y: 2 },
    }).setInteractive({ useHandCursor: true });

    let value = initialValue;
    btn.on('pointerdown', () => {
      value = !value;
      btn.setText(value ? '✓ ON' : '✗ OFF');
      btn.setStyle({
        color: value ? '#00FF00' : '#888888',
        backgroundColor: value ? '#1a5a1a' : '#333333',
      });
      onChange(value);
    });
  }

  private setLang(code: SupportedLanguage): void {
    setLanguage(code);
    this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex });
  }

  private setColorblindMode(mode: ColorblindMode): void {
    Accessibility.settings.colorblindMode = mode;
    Accessibility.saveSettings();
    this.colorblindButtons.forEach(({ btn, id }) => {
      const isActive = mode === id;
      btn.setStyle({
        color: isActive ? '#00FF00' : '#aaa',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
      });
    });
  }

  private goBack(): void {
    if (this.rebindingAction) {
      this.cancelRebind();
      return;
    }

    if (this.returnTo === 'GameScene') {
      this.scene.start('GameScene', { level: this.levelIndex });
    } else {
      this.scene.start('MenuScene');
    }
  }
}
