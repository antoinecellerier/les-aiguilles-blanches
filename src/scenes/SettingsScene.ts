import Phaser from 'phaser';
import { t, getLanguage, setLanguage, Accessibility, SupportedLanguage, ColorblindMode } from '../setup';
import { getKeyboardLayout, setKeyboardLayout, getLayoutDefaults, AVAILABLE_LAYOUTS, KeyboardLayout } from '../utils/keyboardLayout';

/**
 * RexUI Settings Scene - Full responsive implementation using rexUI
 * Replaces manual layout with Sizer-based automatic positioning
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

const BINDINGS_VERSION = 2;

export default class SettingsScene extends Phaser.Scene {
  private returnTo: string | null = null;
  private levelIndex = 0;
  private bindings: KeyBindings = this.getDefaultBindings();
  private displayNames: Record<number, string> = {};
  private rebindingAction: string | null = null;
  private rebindButtons: Record<string, Phaser.GameObjects.Text> = {};
  private statusText: Phaser.GameObjects.Text | null = null;
  private mainSizer: any = null;
  
  // Responsive settings
  private dpr = 1;
  private fontSize = 16;
  private smallFont = 14;
  private minTouchTarget = 44;
  private useSingleColumn = false;
  private contentWidth = 300; // Available width for content

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

    // DPI-aware sizing (matches SettingsScene logic)
    this.dpr = window.devicePixelRatio || 1;
    const logicalWidth = width / this.dpr;
    const logicalHeight = height / this.dpr;
    const aspectRatio = logicalHeight / logicalWidth;
    this.useSingleColumn = logicalWidth < 500 || aspectRatio > 1.5;
    
    // Touch detection for larger touch targets
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Scale touch target with DPR but cap to prevent overflow
    this.minTouchTarget = Math.min(hasTouch ? 44 : 28, width * 0.1);

    // Font sizing: use smaller of DPI-based or width-based
    const dprBasedFont = 16 * Math.sqrt(this.dpr);
    const widthBasedFont = width / 25; // ~25 chars per line minimum
    const baseFontSize = Math.min(dprBasedFont, widthBasedFont);
    this.fontSize = Math.round(Math.max(14, Math.min(24, baseFontSize)));
    this.smallFont = Math.max(14, Math.round(this.fontSize * 0.85));
    
    const padding = Math.max(10, Math.min(width * 0.03, 25));
    const itemSpacing = Math.round(this.fontSize * 0.5);
    
    // Available width for content (used by fixWidthSizers to know when to wrap)
    this.contentWidth = width - padding * 2;

    // Create scrollable panel for content
    const contentHeight = height * 0.85; // Reserve space for back button
    
    if (this.useSingleColumn) {
      this.createSingleColumnLayout(width, height, padding, itemSpacing);
    } else {
      this.createTwoColumnLayout(width, height, padding, itemSpacing);
    }

    // Back button (fixed at bottom)
    this.createBackButton(width, height, padding);

    // Keyboard input for rebinding
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.rebindingAction) {
        this.finishRebind(event.keyCode, event.key, event.code);
      } else if (event.code === 'Escape') {
        this.goBack();
      }
    });

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
    
    Accessibility.announce((t('settings') || 'Settings'));
  }

  private handleResize(): void {
    this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex });
  }

  private createSingleColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Single scrollable column for narrow/portrait screens
    // Reserve space for back button at bottom
    const backButtonSpace = this.fontSize * 2.5;
    const availableHeight = height - padding * 2 - backButtonSpace;
    
    // Reduce spacing further on very small screens
    const tightSpacing = height < 600 ? Math.max(2, itemSpacing * 0.5) : itemSpacing;
    
    // Position at top-left corner with origin at top-left (0, 0)
    const sizerWidth = width - padding * 2;
    this.mainSizer = this.rexUI.add.sizer({
      x: padding,
      y: padding,
      width: sizerWidth,
      orientation: 'vertical',
      space: { item: tightSpacing },
      origin: 0  // Top-left origin
    });

    // Title
    this.mainSizer.add(this.createText('⚙️ ' + (t('settings') || 'Settings'), this.fontSize * 1.1, '#87CEEB', true), 
      { align: 'center' });

    // All sections in single column
    this.addLanguageSection(this.mainSizer);
    this.addAccessibilitySection(this.mainSizer);
    
    // Only add controls section if there's enough space
    if (height >= 500) {
      this.addControlsSection(this.mainSizer);
    }

    // Status text
    this.statusText = this.createText('', this.fontSize, '#FFFF00');
    this.mainSizer.add(this.statusText, { align: 'center' });

    this.mainSizer.layout();
  }

  private createTwoColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Two-column layout for wide screens
    const colWidth = (width - padding * 3) / 2;
    
    // Update contentWidth for child elements in two-column mode
    this.contentWidth = colWidth;
    
    // Root horizontal sizer - position at top-left with origin at top-left
    const rootSizer = this.rexUI.add.sizer({
      x: padding,
      y: padding,
      width: width - padding * 2,
      orientation: 'horizontal',
      space: { item: padding },
      origin: 0  // Top-left origin
    });

    // Left column: Language + Accessibility
    const leftCol = this.rexUI.add.sizer({
      width: colWidth,
      orientation: 'vertical',
      space: { item: itemSpacing }
    });
    
    leftCol.add(this.createText('⚙️ ' + (t('settings') || 'Settings'), this.fontSize * 1.2, '#87CEEB', true), 
      { align: 'center' });
    this.addLanguageSection(leftCol);
    this.addAccessibilitySection(leftCol);
    
    // Right column: Controls
    const rightCol = this.rexUI.add.sizer({
      width: colWidth,
      orientation: 'vertical',
      space: { item: itemSpacing }
    });
    
    this.addControlsSection(rightCol);

    // Status text in right column
    this.statusText = this.createText('', this.fontSize, '#FFFF00');
    rightCol.add(this.statusText, { align: 'center' });

    rootSizer.add(leftCol, { align: 'top' });
    rootSizer.add(rightCol, { align: 'top' });
    
    this.mainSizer = rootSizer;
    this.mainSizer.layout();
  }

  private addLanguageSection(sizer: any): void {
    sizer.add(this.createText('🌐 ' + (t('language') || 'Language'), this.fontSize, '#ffffff', true), 
      { align: 'left' });
    sizer.add(this.createLanguageButtons(), { align: 'left' });
  }

  private addAccessibilitySection(sizer: any): void {
    sizer.add(this.createText('♿ ' + (t('accessibility') || 'Accessibility'), this.fontSize, '#ffffff', true), 
      { align: 'left' });
    
    sizer.add(this.createToggleRow(t('highContrast') || 'High Contrast', 
      Accessibility.settings.highContrast, (val) => {
        Accessibility.settings.highContrast = val;
        Accessibility.saveSettings();
      }), { align: 'left' });
    
    sizer.add(this.createToggleRow(t('reducedMotion') || 'Reduced Motion',
      Accessibility.settings.reducedMotion, (val) => {
        Accessibility.settings.reducedMotion = val;
        Accessibility.saveSettings();
      }), { align: 'left' });

    // Colorblind modes
    sizer.add(this.createText(t('colorblindMode') || 'Colorblind:', this.smallFont, '#aaaaaa'), 
      { align: 'left' });
    sizer.add(this.createColorblindButtons(), { align: 'left' });
  }

  private addControlsSection(sizer: any): void {
    sizer.add(this.createText('🎮 ' + (t('controls') || 'Controls'), this.fontSize, '#ffffff', true), 
      { align: 'left' });
    sizer.add(this.createText(t('clickToRebind') || 'Click to rebind', this.smallFont, '#666666'), 
      { align: 'left' });

    // Key bindings
    const actions = [
      { id: 'up', label: t('moveUp') || 'Up' },
      { id: 'down', label: t('moveDown') || 'Down' },
      { id: 'left', label: t('moveLeft') || 'Left' },
      { id: 'right', label: t('moveRight') || 'Right' },
      { id: 'groom', label: t('groom') || 'Groom' },
      { id: 'winch', label: t('winch') || 'Winch' },
    ];
    actions.forEach(action => {
      sizer.add(this.createBindingRow(action.id, action.label), { align: 'left' });
    });

    // Layout selector
    sizer.add(this.createLayoutSelector(), { align: 'left' });

    // Reset button
    const resetBtn = this.createTouchButton('🔄 ' + (t('resetControls') || 'Reset'), this.smallFont, '#ffaaaa', '#5a2d2d');
    resetBtn.on('pointerdown', () => this.resetBindings());
    sizer.add(resetBtn, { align: 'left' });

    // Input hints
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const inputHints: string[] = [];
    if (hasTouch) inputHints.push('📱 Touch');
    inputHints.push('🎮 Gamepad');
    sizer.add(this.createText(inputHints.join('  '), this.smallFont, '#88aa88'), { align: 'left' });
  }

  private createBackButton(width: number, height: number, padding: number): void {
    const backLabel = this.returnTo ? (t('backToGame') || 'Back to Game') : (t('back') || 'Back');
    const backBtn = this.createTouchButton('← ' + backLabel, this.fontSize * 1.1, '#ffffff', '#CC2200');
    backBtn.setPosition(width / 2, height - padding * 1.5);
    backBtn.setOrigin(0.5);
    backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: '#FF3300' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: '#CC2200' }));
    backBtn.on('pointerdown', () => this.goBack());
  }

  // === UI Element Factory Methods ===

  private createText(text: string, fontSize: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSize + 'px',
      fontStyle: bold ? 'bold' : 'normal',
      color: color,
    });
  }

  private createTouchButton(text: string, fontSize: number, color: string, bgColor: string): Phaser.GameObjects.Text {
    // Touch-friendly button with minimum touch target
    const paddingY = Math.max(5, (this.minTouchTarget - fontSize) / 2);
    const paddingX = Math.round(paddingY * 1.5);
    
    return this.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: fontSize + 'px',
      color: color,
      backgroundColor: bgColor,
      padding: { x: paddingX, y: paddingY },
    }).setInteractive({ useHandCursor: true });
  }

  private createLanguageButtons(): any {
    // Use fixWidthSizer for auto-wrapping on narrow screens
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.3), line: Math.round(this.fontSize * 0.3) }
    });
    
    const languages: { code: SupportedLanguage; name: string }[] = [
      { code: 'fr', name: '🇫🇷' },
      { code: 'en', name: '🇬🇧' },
      { code: 'de', name: '🇩🇪' },
      { code: 'it', name: '🇮🇹' },
      { code: 'es', name: '🇪🇸' },
    ];
    const currentLang = getLanguage();
    
    languages.forEach(lang => {
      const isActive = currentLang === lang.code;
      // Smaller padding on narrow screens
      const paddingY = Math.max(2, Math.min(6, (this.minTouchTarget - this.fontSize) / 2));
      const paddingX = Math.max(3, Math.round(paddingY * 0.6));
      const btn = this.add.text(0, 0, lang.name, {
        fontFamily: 'Courier New',
        fontSize: this.fontSize + 'px',
        backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
        padding: { x: paddingX, y: paddingY },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLang(lang.code));
      row.add(btn);
    });
    return row;
  }

  private createToggleRow(label: string, initialValue: boolean, onChange: (val: boolean) => void): any {
    // Use fixWidthSizer for wrapping on narrow screens
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });
    
    row.add(this.createText(label + ':', this.smallFont, '#cccccc'));
    
    const paddingY = Math.max(2, Math.min(6, (this.minTouchTarget - this.smallFont) / 2));
    const btn = this.add.text(0, 0, initialValue ? '✓ ON' : '✗ OFF', {
      fontFamily: 'Courier New',
      fontSize: this.smallFont + 'px',
      color: initialValue ? '#00FF00' : '#888888',
      backgroundColor: initialValue ? '#1a5a1a' : '#333333',
      padding: { x: Math.round(paddingY * 1.5), y: paddingY },
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
      this.mainSizer?.layout();
    });
    
    row.add(btn);
    return row;
  }

  private createColorblindButtons(): any {
    const cbModes: ColorblindMode[] = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];
    
    // Always use fixWidthSizer for auto-wrapping with width constraint
    const container = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: 4, line: 4 }
    });
    cbModes.forEach(mode => container.add(this.createColorblindBtn(mode)));
    return container;
  }

  private createColorblindBtn(mode: ColorblindMode): Phaser.GameObjects.Text {
    const isActive = Accessibility.settings.colorblindMode === mode;
    const label = (t(mode) || mode).substring(0, 8);
    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    
    return this.add.text(0, 0, label, {
      fontFamily: 'Courier New',
      fontSize: this.smallFont + 'px',
      color: isActive ? '#00FF00' : '#aaa',
      backgroundColor: isActive ? '#1a5a1a' : '#2d5a7b',
      padding: { x: Math.round(paddingY * 1.5), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        Accessibility.settings.colorblindMode = mode;
        Accessibility.saveSettings();
        this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex });
      });
  }

  private createBindingRow(actionId: string, label: string): any {
    // Use fixWidthSizer for wrapping with width constraint
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });
    
    row.add(this.createText(label + ':', this.smallFont, '#cccccc'));
    
    const currentBinding = this.bindings[actionId as keyof KeyBindings];
    const defaultBinding = this.getDefaultBindings()[actionId as keyof KeyBindings];
    const isCustom = currentBinding !== defaultBinding;
    const keyName = this.getKeyName(currentBinding);
    
    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    const btn = this.add.text(0, 0, keyName + (isCustom ? ' *' : ''), {
      fontFamily: 'Courier New',
      fontSize: this.smallFont + 'px',
      color: isCustom ? '#FFDD00' : '#87CEEB',
      backgroundColor: isCustom ? '#5a5a2d' : '#2d5a7b',
      padding: { x: Math.round(paddingY * 2), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startRebind(actionId, btn));
    
    this.rebindButtons[actionId] = btn;
    row.add(btn);
    return row;
  }

  private createLayoutSelector(): any {
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.4), line: 2 }
    });
    
    row.add(this.createText('⌨️ ' + (t('keyboardLayout') || 'Layout') + ':', this.smallFont, '#aaaaaa'));
    
    // Check for custom bindings
    const hasCustomBindings = Object.keys(this.bindings).some(key => 
      this.bindings[key as keyof KeyBindings] !== this.getDefaultBindings()[key as keyof KeyBindings]
    );

    if (hasCustomBindings) {
      row.add(this.createText(t('customBindings') || 'Custom', this.smallFont, '#FFDD00'));
    } else {
      const currentLayout = getKeyboardLayout();
      AVAILABLE_LAYOUTS.forEach(layout => {
        const isActive = currentLayout === layout.id;
        const paddingY = Math.max(2, (this.minTouchTarget - this.smallFont) / 4);
        const btn = this.add.text(0, 0, layout.id.toUpperCase(), {
          fontFamily: 'Courier New',
          fontSize: this.smallFont + 'px',
          color: isActive ? '#000000' : '#ffffff',
          backgroundColor: isActive ? '#87ceeb' : '#555555',
          padding: { x: Math.round(paddingY * 2), y: paddingY },
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setLayout(layout.id));
        row.add(btn);
      });
    }
    return row;
  }

  // === Logic Methods ===

  private loadBindings(): void {
    const savedVersion = localStorage.getItem('snowGroomer_bindingsVersion');
    const saved = localStorage.getItem('snowGroomer_bindings');
    const savedNames = localStorage.getItem('snowGroomer_displayNames');
    const defaults = this.getDefaultBindings();

    if (savedVersion !== String(BINDINGS_VERSION)) {
      this.bindings = defaults;
      this.displayNames = {};
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
    return getLayoutDefaults();
  }

  private saveBindings(): void {
    localStorage.setItem('snowGroomer_bindingsVersion', String(BINDINGS_VERSION));
    localStorage.setItem('snowGroomer_bindings', JSON.stringify(this.bindings));
    localStorage.setItem('snowGroomer_displayNames', JSON.stringify(this.displayNames));
  }

  private getKeyName(keyCode: number): string {
    if (!keyCode) return '?';
    if (this.displayNames[keyCode]) return this.displayNames[keyCode];
    
    const specialKeys: Record<number, string> = {
      38: '↑', 40: '↓', 37: '←', 39: '→',
      32: 'SPACE', 16: 'SHIFT', 17: 'CTRL', 18: 'ALT',
      13: 'ENTER', 9: 'TAB', 27: 'ESC', 8: '⌫', 46: 'DEL',
    };
    if (specialKeys[keyCode]) return specialKeys[keyCode];
    if (keyCode >= 65 && keyCode <= 90) return String.fromCharCode(keyCode);
    if (keyCode >= 48 && keyCode <= 57) return String.fromCharCode(keyCode);
    return keyCode.toString();
  }

  private startRebind(actionId: string, btn: Phaser.GameObjects.Text): void {
    if (this.rebindingAction) return;
    this.rebindingAction = actionId;
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.statusText?.setText(t('pressKey') || 'Press a key...');
    this.mainSizer?.layout();
  }

  private finishRebind(keyCode: number, keyChar: string, eventCode: string): void {
    if (!this.rebindingAction) return;
    if (eventCode === 'Escape') {
      this.cancelRebind();
      return;
    }

    const actionId = this.rebindingAction as keyof KeyBindings;
    this.bindings[actionId] = keyCode;
    if (keyChar.length === 1) {
      this.displayNames[keyCode] = keyChar.toUpperCase();
    } else {
      this.displayNames[keyCode] = keyChar;
    }
    this.saveBindings();

    const btn = this.rebindButtons[actionId];
    btn.setText(this.getKeyName(keyCode) + ' *');
    btn.setStyle({ backgroundColor: '#5a5a2d', color: '#FFDD00' });

    this.rebindingAction = null;
    this.statusText?.setText(t('saved') || 'Saved!');
    this.mainSizer?.layout();
    this.time.delayedCall(800, () => this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex }));
  }

  private cancelRebind(): void {
    if (!this.rebindingAction) return;
    const btn = this.rebindButtons[this.rebindingAction];
    btn.setText(this.getKeyName(this.bindings[this.rebindingAction as keyof KeyBindings]));
    btn.setStyle({ backgroundColor: '#2d5a7b' });
    this.rebindingAction = null;
    this.statusText?.setText('');
    this.mainSizer?.layout();
  }

  private resetBindings(): void {
    setKeyboardLayout('qwerty');
    this.bindings = this.getDefaultBindings();
    this.displayNames = {};
    this.saveBindings();
    this.statusText?.setText(t('controlsReset') || 'Controls reset!');
    this.time.delayedCall(800, () => this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex }));
  }

  private setLayout(layout: KeyboardLayout): void {
    setKeyboardLayout(layout);
    this.bindings = this.getDefaultBindings();
    this.displayNames = {};
    this.saveBindings();
    this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex });
  }

  private setLang(code: SupportedLanguage): void {
    setLanguage(code);
    this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex });
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

  private gamepadBPressed = false;

  update(): void {
    // Gamepad B button to go back
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad) {
        // Accept both B (Xbox) and button 0 (Nintendo B) as back
        const backPressed = pad.buttons[1]?.pressed;
        if (backPressed && !this.gamepadBPressed) {
          this.goBack();
        }
        this.gamepadBPressed = backPressed;
      }
    }
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }
}
