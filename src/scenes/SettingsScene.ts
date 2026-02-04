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
  private scaleFactor = 1;
  private minTouchTarget = 44; // Minimum touch target in canvas pixels
  private dpr = 1;

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

    // DPI-aware layout: use logical pixels (CSS pixels)
    this.dpr = window.devicePixelRatio || 1;
    const logicalWidth = width / this.dpr;
    const logicalHeight = height / this.dpr;
    
    // Detect touch device for larger touch targets on buttons
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Use single column when logical width < 500 CSS pixels or tall aspect ratio
    const aspectRatio = logicalHeight / logicalWidth;
    const useSingleColumn = logicalWidth < 500 || aspectRatio > 1.5;
    
    // Minimum touch target: 44 CSS pixels for buttons (achieved via padding)
    this.minTouchTarget = hasTouch ? 44 * this.dpr : 28 * this.dpr;
    
    // Calculate font size based on available space
    // Count actual content rows:
    // Single column: Title(1) + Lang(2) + Access(5) + Colorblind(3) + Controls(12) = ~23 rows
    // Two column: Right column has ~12 rows (controls header, hint, 6 bindings, layout, reset, input hints)
    const contentRows = useSingleColumn ? 22 : 13;
    const availableHeight = height * 0.78; // Use 78% of screen, reserve for back button
    const optimalLineHeight = availableHeight / contentRows;
    const optimalFontSize = optimalLineHeight / 2.4;
    
    // Font size bounds (in canvas pixels, scaled by sqrt of DPR for readability)
    const baseFontSize = 16 * Math.sqrt(this.dpr);
    const minFontSize = Math.max(14, baseFontSize * 0.5);
    const maxFontSize = baseFontSize * 1.5;
    const fontSize = Math.round(Math.max(minFontSize, Math.min(maxFontSize, optimalFontSize)));
    this.scaleFactor = fontSize / baseFontSize;
    
    // Line height based on available space per row
    const lineHeight = Math.round(optimalLineHeight);
    
    const padding = Math.max(15, Math.round(width * 0.03));
    const startX = padding;
    const colWidth = useSingleColumn ? width - padding * 2 : (width - padding * 3) / 2;

    // Title
    this.add.text(width / 2, padding, '⚙️ ' + (t('settings') || 'Settings'), {
      fontFamily: 'Courier New, monospace',
      fontSize: Math.round(fontSize * 1.2) + 'px',
      fontStyle: 'bold',
      color: '#87CEEB',
    }).setOrigin(0.5, 0);

    let curY = padding + lineHeight;

    // === LANGUAGE SECTION ===

    // Language
    this.add.text(startX, curY, '🌐 ' + (t('language') || 'Language'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    curY += lineHeight;

    const languages: { code: SupportedLanguage; name: string }[] = [
      { code: 'fr', name: '🇫🇷' },
      { code: 'en', name: '🇬🇧' },
      { code: 'de', name: '🇩🇪' },
      { code: 'it', name: '🇮🇹' },
      { code: 'es', name: '🇪🇸' },
    ];

    const currentLang = getLanguage();
    this.langButtons = [];
    // Use full fontSize for language buttons and space them based on touch targets
    const langBtnSpacing = Math.max(lineHeight * 0.8, 50 * this.scaleFactor);
    languages.forEach((lang, i) => {
      const isActive = currentLang === lang.code;
      const btn = this.add.text(startX + i * langBtnSpacing, curY, lang.name, {
        fontFamily: 'Courier New',
        fontSize: fontSize + 'px',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
        padding: { x: Math.round(8 * this.scaleFactor), y: Math.round(4 * this.scaleFactor) },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLang(lang.code));
      this.langButtons.push({ btn, code: lang.code });
    });
    curY += lineHeight;

    // === ACCESSIBILITY SECTION ===
    this.add.text(startX, curY, '♿ ' + (t('accessibility') || 'Accessibility'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    curY += lineHeight;

    // High Contrast
    this.createToggle(startX, curY, t('highContrast') || 'High Contrast',
      Accessibility.settings.highContrast, fontSize,
      (val) => { Accessibility.settings.highContrast = val; Accessibility.saveSettings(); },
      colWidth);
    curY += lineHeight;

    // Reduced Motion
    this.createToggle(startX, curY, t('reducedMotion') || 'Reduced Motion',
      Accessibility.settings.reducedMotion, fontSize,
      (val) => { Accessibility.settings.reducedMotion = val; Accessibility.saveSettings(); },
      colWidth);
    curY += lineHeight;

    // Colorblind
    this.add.text(startX, curY, t('colorblindMode') || 'Colorblind:', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#aaaaaa',
    });
    curY += lineHeight;

    const cbModes: ColorblindMode[] = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];
    this.colorblindButtons = [];
    // In single column, show 2x2 grid; in two column, show inline
    const cbPerRow = useSingleColumn ? 2 : 4;
    cbModes.forEach((mode, i) => {
      const isActive = Accessibility.settings.colorblindMode === mode;
      const label = (t(mode) || mode).substring(0, 8);
      const col = i % cbPerRow;
      const row = Math.floor(i / cbPerRow);
      const btn = this.add.text(startX + col * (colWidth / cbPerRow), curY + row * lineHeight, label, {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 2) + 'px',
        color: isActive ? '#00FF00' : '#aaa',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
        padding: { x: Math.round(6 * this.scaleFactor), y: Math.round(3 * this.scaleFactor) },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setColorblindMode(mode));
      this.colorblindButtons.push({ btn, id: mode });
    });
    curY += Math.ceil(cbModes.length / cbPerRow) * lineHeight;

    // === CONTROLS SECTION ===
    // In two-column mode, start controls in right column; in single column, continue below
    const controlsX = useSingleColumn ? startX : width / 2 + padding;
    let controlsY = useSingleColumn ? curY : padding + lineHeight;
    const controlsColWidth = useSingleColumn ? colWidth : (width - padding * 3) / 2;

    this.add.text(controlsX, controlsY, '🎮 ' + (t('controls') || 'Controls'), {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    controlsY += lineHeight;

    this.add.text(controlsX, controlsY, t('clickToRebind') || 'Click to rebind', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 2) + 'px',
      color: '#666666',
    });
    controlsY += lineHeight;

    this.rebindButtons = {};
    const actions = [
      { id: 'up', label: t('moveUp') || 'Up' },
      { id: 'down', label: t('moveDown') || 'Down' },
      { id: 'left', label: t('moveLeft') || 'Left' },
      { id: 'right', label: t('moveRight') || 'Right' },
      { id: 'groom', label: t('groom') || 'Groom' },
      { id: 'winch', label: t('winch') || 'Winch' },
    ];

    const bindingRowHeight = lineHeight;
    actions.forEach((action, i) => {
      const y = controlsY + i * bindingRowHeight;

      this.add.text(controlsX, y, action.label + ':', {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 1) + 'px',
        color: '#cccccc',
      });

      const currentBinding = this.bindings[action.id as keyof KeyBindings];
      const defaultBinding = this.getDefaultBindings()[action.id as keyof KeyBindings];
      const isCustom = currentBinding !== defaultBinding;
      
      const keyName = this.getKeyName(currentBinding);
      const btn = this.add.text(controlsX + controlsColWidth * 0.45, y, keyName + (isCustom ? ' *' : ''), {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 1) + 'px',
        color: isCustom ? '#FFDD00' : '#87CEEB',
        backgroundColor: isCustom ? '#5a5a2d' : '#2d5a7b',
        padding: { x: 6, y: 2 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.startRebind(action.id, btn));

      this.rebindButtons[action.id] = btn;
    });

    controlsY += actions.length * bindingRowHeight;

    // Check if user has customized any bindings
    const hasCustomBindings = actions.some(action => 
      this.bindings[action.id as keyof KeyBindings] !== this.getDefaultBindings()[action.id as keyof KeyBindings]
    );

    // Keyboard layout selector
    const currentLayout = getKeyboardLayout();
    
    this.add.text(controlsX, controlsY, '⌨️ ' + (t('keyboardLayout') || 'Layout') + ':', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#aaaaaa',
    });
    controlsY += lineHeight;

    if (hasCustomBindings) {
      // Show "Custom" when user has overridden bindings
      this.add.text(controlsX, controlsY, t('customBindings') || 'Custom', {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 2) + 'px',
        color: '#FFDD00',
        fontStyle: 'italic',
      });
    } else {
      // Show layout selector buttons - space evenly across available width
      const numLayouts = AVAILABLE_LAYOUTS.length;
      const layoutBtnWidth = Math.floor(controlsColWidth / numLayouts);
      AVAILABLE_LAYOUTS.forEach((layout, idx) => {
        const isActive = currentLayout === layout.id;
        const btn = this.add.text(controlsX + idx * layoutBtnWidth, controlsY, layout.id.toUpperCase(), {
          fontFamily: 'Courier New',
          fontSize: (fontSize - 2) + 'px',
          color: isActive ? '#000000' : '#ffffff',
          backgroundColor: isActive ? '#87ceeb' : '#555555',
          padding: { x: Math.round(4 * this.scaleFactor), y: Math.round(2 * this.scaleFactor) },
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setLayout(layout.id));
      });
    }

    controlsY += lineHeight;

    // Reset bindings button
    this.add.text(controlsX, controlsY, '🔄 ' + (t('resetControls') || 'Reset'), {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#ffaaaa',
      backgroundColor: '#5a2d2d',
      padding: { x: Math.round(8 * this.scaleFactor), y: Math.round(4 * this.scaleFactor) },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resetBindings());

    controlsY += lineHeight;

    // Show available input methods
    const inputHints: string[] = [];
    if (hasTouch) {
      inputHints.push('📱 Touch');
    }
    inputHints.push('🎮 Gamepad');
    
    this.add.text(controlsX, controlsY, inputHints.join('  '), {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 2) + 'px',
      color: '#88aa88',
    });

    // Rebinding status text
    this.rebindStatus = this.add.text(width / 2, height - padding * 3, '', {
      fontFamily: 'Courier New',
      fontSize: fontSize + 'px',
      color: '#FFFF00',
    }).setOrigin(0.5);

    // Back button
    const backLabel = this.returnTo ? (t('backToGame') || 'Back to Game') : (t('back') || 'Back');
    const backBtn = this.add.text(width / 2, height - padding * 1.5, '← ' + backLabel, {
      fontFamily: 'Courier New',
      fontSize: Math.round(fontSize * 1.1) + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: Math.round(24 * this.scaleFactor), y: Math.round(8 * this.scaleFactor) },
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
    onChange: (val: boolean) => void,
    maxWidth?: number
  ): void {
    // Create label
    this.add.text(x, y, label + ':', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: '#cccccc',
    });
    
    // Touch-friendly button padding
    const btnPaddingY = Math.max(4, Math.min(10, (this.minTouchTarget - fontSize) / 2));
    const btnPaddingX = Math.round(8 * this.scaleFactor);
    
    // Position toggle at 70% of available width (leaves room for button)
    const availableWidth = maxWidth || 250 * this.scaleFactor;
    const toggleX = x + availableWidth * 0.65;
    
    const btn = this.add.text(toggleX, y, initialValue ? '✓ ON' : '✗ OFF', {
      fontFamily: 'Courier New',
      fontSize: (fontSize - 1) + 'px',
      color: initialValue ? '#00FF00' : '#888888',
      backgroundColor: initialValue ? '#1a5a1a' : '#333333',
      padding: { x: btnPaddingX, y: btnPaddingY },
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
