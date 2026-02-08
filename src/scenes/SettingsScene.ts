import Phaser from 'phaser';
import { t, getLanguage, setLanguage, Accessibility, SupportedLanguage, ColorblindMode, LEVELS } from '../setup';
import { getKeyboardLayout, setKeyboardLayout, getLayoutDefaults, AVAILABLE_LAYOUTS, KeyboardLayout } from '../utils/keyboardLayout';
import { isBackPressed, isConfirmPressed, isGamepadButtonPressed, loadGamepadBindings, saveGamepadBindings, getDefaultGamepadBindings, getButtonName, getConnectedControllerType, captureGamepadButtons, type GamepadBindings } from '../utils/gamepad';
import { THEME } from '../config/theme';
import { BALANCE } from '../config/gameConfig';
import { STORAGE_KEYS, BINDINGS_VERSION } from '../config/storageKeys';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { createGamepadMenuNav } from '../utils/gamepadMenu';
import { FocusNavigator, type FocusItem } from '../utils/focusNavigator';

/**
 * RexUI Settings Scene - Full responsive implementation using rexUI
 * Replaces manual layout with Sizer-based automatic positioning
 */

interface SettingsSceneData {
  returnTo?: string;
  levelIndex?: number;
  focusIndex?: number;
}

interface KeyBindings {
  up: number;
  down: number;
  left: number;
  right: number;
  groom: number;
  winch: number;
}



export default class SettingsScene extends Phaser.Scene {
  private returnTo: string | null = null;
  private levelIndex = 0;
  private bindings: KeyBindings = this.getDefaultBindings();
  private displayNames: Record<number, string> = {};
  private rebindingAction: string | null = null;
  private rebindButtons: Record<string, Phaser.GameObjects.Text> = {};
  private gamepadBindings: GamepadBindings = loadGamepadBindings();
  private rebindingGamepadAction: string | null = null;
  private gamepadRebindSnapshot: Record<number, boolean> = {};
  private gamepadRebindButtons: Record<string, Phaser.GameObjects.Text> = {};
  private statusText: Phaser.GameObjects.Text | null = null;
  private mainSizer: any = null;
  private gamepadNameText: Phaser.GameObjects.Text | null = null;
  private lastGamepadName: string = '';
  
  // Responsive settings
  private dpr = 1;
  private fontSize = 16;
  private smallFont = 14;
  private minTouchTarget = 44;
  private useSingleColumn = false;
  private contentWidth = 300; // Available width for content

  // Focus navigation
  private focus = new FocusNavigator();
  /** Exposed for E2E test access — delegates to FocusNavigator. */
  get focusIndex(): number { return this.focus.index; }
  get focusItems(): FocusItem[] { return this.focus.items; }
  private pendingFocusIndex = -1;
  private gamepadNav: ReturnType<typeof createGamepadMenuNav> | null = null;
  private gpHorizCooldown = 0;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data?.returnTo || null;
    this.levelIndex = data?.levelIndex || 0;
    this.pendingFocusIndex = data?.focusIndex ?? -1;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(THEME.colors.dialogBg);
    this.loadBindings();
    this.focus.init(this);
    this.lastGamepadName = '';

    // DPI-aware sizing (matches SettingsScene logic)
    this.dpr = window.devicePixelRatio || 1;
    const logicalWidth = width / this.dpr;
    const logicalHeight = height / this.dpr;
    const aspectRatio = logicalHeight / logicalWidth;
    this.useSingleColumn = logicalWidth < 500 || aspectRatio > 1.5 || logicalHeight < 400;
    
    // Touch detection for larger touch targets
    const hasTouch = detectTouch();
    // Ensure touch targets meet minimum — never shrink below 44px on touch
    this.minTouchTarget = hasTouch ? 44 : Math.min(28, width * 0.1);

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

    // Keyboard input for rebinding and navigation
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.rebindingAction) {
        this.finishRebind(event.keyCode, event.key, event.code);
        return;
      }
      if (this.rebindingGamepadAction) return;
      switch (event.code) {
        case 'Escape': this.goBack(); break;
        case 'ArrowUp': event.preventDefault(); this.focus.navigate(-1); break;
        case 'ArrowDown': event.preventDefault(); this.focus.navigate(1); break;
        case 'ArrowLeft': event.preventDefault(); this.focus.left(); break;
        case 'ArrowRight': event.preventDefault(); this.focus.right(); break;
        case 'Enter': case 'Space': event.preventDefault(); this.focus.activate(); break;
      }
    });

    // Gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir: number) => this.focus.navigate(dir),
      onConfirm: () => this.focus.activate(),
      onBack: () => this.goBack(),
      isBlocked: () => !!this.rebindingAction || !!this.rebindingGamepadAction,
    });
    this.gamepadNav.initState();

    // Restore focus position after restart (e.g., language/colorblind change)
    if (this.pendingFocusIndex >= 0 && this.pendingFocusIndex < this.focus.items.length) {
      this.focus.index = this.pendingFocusIndex;
      this.focus.updateIndicator();
    }

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
    
    Accessibility.announce((t('settings') || 'Settings'));
  }

  private resizing = false;

  private restartScene(): void {
    this.scene.restart({ returnTo: this.returnTo, levelIndex: this.levelIndex, focusIndex: this.focus.index });
  }

  private handleResize(): void {
    if (this.resizing || !this.scene.isActive()) return;
    this.resizing = true;
    requestAnimationFrame(() => {
      this.restartScene();
      this.resizing = false;
    });
  }

  update(_time: number, delta: number): void {
    this.gamepadNav?.update(delta);
    this.checkGamepadRebind();

    // Gamepad left/right for group cycling & slider (separate from vertical nav)
    this.gpHorizCooldown = Math.max(0, this.gpHorizCooldown - delta);
    if (this.gpHorizCooldown <= 0 && !this.rebindingAction && !this.rebindingGamepadAction) {
      const pad = this.input.gamepad?.getPad(0);
      if (pad) {
        const stickX = pad.leftStick?.x ?? 0;
        if (pad.left || stickX < -0.5) {
          this.focus.left();
          this.gpHorizCooldown = 200;
        } else if (pad.right || stickX > 0.5) {
          this.focus.right();
          this.gpHorizCooldown = 200;
        }
      }
    }

    // Update gamepad name dynamically
    if (this.gamepadNameText) {
      this.updateGamepadName();
    }

    // Update focus indicator position (follows elements during scroll)
    this.focus.updateIndicator();
  }

  private createSingleColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Single scrollable column for narrow/portrait screens
    // Reserve space for back button at bottom
    const backButtonSpace = this.fontSize * 3;
    const availableHeight = height - padding * 2 - backButtonSpace;
    
    // Reduce spacing further on very small screens
    const tightSpacing = height < 600 ? Math.max(2, itemSpacing * 0.5) : itemSpacing;
    
    const sizerWidth = width - padding * 2;
    
    // Create content sizer (will be placed inside scrollable panel)
    const contentSizer = this.rexUI.add.sizer({
      width: sizerWidth - 10, // Account for potential scrollbar
      orientation: 'vertical',
      space: { item: tightSpacing },
    });

    // Title
    contentSizer.add(this.createText('⚙️ ' + (t('settings') || 'Settings'), this.fontSize * 1.1, THEME.colors.info, true), 
      { align: 'center' });

    // All sections in single column
    this.addLanguageSection(contentSizer);
    this.addAccessibilitySection(contentSizer);
    
    // Always add controls section (scrollable now handles overflow)
    this.addControlsSection(contentSizer);

    // Status text
    this.statusText = this.createText('', this.fontSize, THEME.colors.accent);
    contentSizer.add(this.statusText, { align: 'center' });

    // Layout content to measure height
    contentSizer.layout();
    const contentHeight = contentSizer.height;
    const needsScroll = contentHeight > availableHeight;

    // Wrap in scrollable panel
    this.mainSizer = this.rexUI.add.scrollablePanel({
      x: padding,
      y: padding,
      width: sizerWidth,
      height: availableHeight,
      origin: 0,
      scrollMode: 'y',
      panel: { child: contentSizer },
      slider: needsScroll ? {
        track: this.rexUI.add.roundRectangle(0, 0, 6, 0, 3, 0x555555),
        thumb: this.rexUI.add.roundRectangle(0, 0, 6, 40, 3, 0x888888),
      } : false,
      mouseWheelScroller: needsScroll ? { speed: 0.3 } : false,
      space: { panel: needsScroll ? 5 : 0 },
    }).layout();

    // Enable touch/mouse scrolling only if needed
    if (needsScroll) {
      this.mainSizer.setChildrenInteractive();
    }
    this.focus.setScrollPanel(this.mainSizer);
  }

  private createTwoColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Two-column layout for wide screens
    // Reserve space for back button at bottom
    const backButtonSpace = this.fontSize * 3;
    const availableHeight = height - padding * 2 - backButtonSpace;
    const colWidth = (width - padding * 3) / 2;
    
    // Update contentWidth for child elements in two-column mode
    this.contentWidth = colWidth;
    
    // Root horizontal sizer for both columns
    const rootSizer = this.rexUI.add.sizer({
      width: width - padding * 2 - 10, // Account for potential scrollbar
      orientation: 'horizontal',
      space: { item: padding },
    });

    // Left column: Language + Accessibility
    const leftCol = this.rexUI.add.sizer({
      width: colWidth,
      orientation: 'vertical',
      space: { item: itemSpacing }
    });
    
    leftCol.add(this.createText('⚙️ ' + (t('settings') || 'Settings'), this.fontSize * 1.2, THEME.colors.info, true), 
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
    this.statusText = this.createText('', this.fontSize, THEME.colors.accent);
    rightCol.add(this.statusText, { align: 'center' });

    rootSizer.add(leftCol, { align: 'top' });
    rootSizer.add(rightCol, { align: 'top' });
    
    // Layout to measure content height
    rootSizer.layout();
    const contentHeight = rootSizer.height;
    const needsScroll = contentHeight > availableHeight;
    
    // Wrap in scrollable panel
    this.mainSizer = this.rexUI.add.scrollablePanel({
      x: padding,
      y: padding,
      width: width - padding * 2,
      height: availableHeight,
      origin: 0,
      scrollMode: 'y',
      panel: { child: rootSizer },
      slider: needsScroll ? {
        track: this.rexUI.add.roundRectangle(0, 0, 6, 0, 3, 0x555555),
        thumb: this.rexUI.add.roundRectangle(0, 0, 6, 40, 3, 0x888888),
      } : false,
      mouseWheelScroller: needsScroll ? { speed: 0.3 } : false,
      space: { panel: needsScroll ? 5 : 0 },
    }).layout();

    // Enable touch/mouse scrolling only if needed
    if (needsScroll) {
      this.mainSizer.setChildrenInteractive();
    }
    this.focus.setScrollPanel(this.mainSizer);
  }

  private addLanguageSection(sizer: any): void {
    sizer.add(this.createText('🌐 ' + (t('language') || 'Language'), this.fontSize, THEME.colors.textPrimary, true), 
      { align: 'left' });
    sizer.add(this.createLanguageButtons(), { align: 'left' });
  }

  private addAccessibilitySection(sizer: any): void {
    sizer.add(this.createText('♿ ' + (t('accessibility') || 'Accessibility'), this.fontSize, THEME.colors.textPrimary, true), 
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
    sizer.add(this.createText(t('colorblindMode') || 'Colorblind:', this.smallFont, THEME.colors.textSecondary), 
      { align: 'left' });
    sizer.add(this.createColorblindButtons(), { align: 'left' });
  }

  private addControlsSection(sizer: any): void {
    sizer.add(this.createText('🎮 ' + (t('controls') || 'Controls'), this.fontSize, THEME.colors.textPrimary, true), 
      { align: 'left' });
    sizer.add(this.createText(t('clickToRebind') || 'Click to rebind', this.smallFont, THEME.colors.disabled), 
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

    // Movement sensitivity slider
    sizer.add(this.createSensitivitySlider(), { align: 'left' });

    // Gamepad bindings section
    sizer.add(this.createText('🎮 ' + (t('gamepadButtons') || 'Gamepad Buttons'), this.smallFont, THEME.colors.textSecondary),
      { align: 'left', padding: { top: 10 } });

    const gpActions = [
      { id: 'groom', label: t('groom') || 'Groom' },
      { id: 'winch', label: t('winch') || 'Winch' },
      { id: 'pause', label: t('pause') || 'Pause' },
    ];
    gpActions.forEach(action => {
      sizer.add(this.createGamepadBindingRow(action.id, action.label), { align: 'left' });
    });

    // Reset button
    const resetBtn = this.createTouchButton('🔄 ' + (t('resetControls') || 'Reset'), this.smallFont, '#ffaaaa', '#5a2d2d');
    resetBtn.on('pointerdown', () => this.resetBindings());
    sizer.add(resetBtn, { align: 'left' });

    // Register reset button focus item
    this.focus.items.push({
      element: resetBtn,
      activate: () => this.resetBindings(),
    });

    // Input hints
    const hasTouchSetting = detectTouch();
    const inputHints: string[] = [];
    if (hasTouchSetting) inputHints.push('📱 Touch');
    inputHints.push('🎮 Gamepad');
    sizer.add(this.createText(inputHints.join('  '), this.smallFont, '#88aa88'), { align: 'left' });

    // Connected gamepad name (updates dynamically)
    this.gamepadNameText = this.createText('', this.smallFont, '#aaaaff');
    this.updateGamepadName();
    sizer.add(this.gamepadNameText, { align: 'left' });
  }

  private createBackButton(width: number, height: number, padding: number): void {
    const backLabel = this.returnTo === 'PauseScene' ? (t('back') || 'Back')
      : this.returnTo ? (t('backToGame') || 'Back to Game')
      : (t('back') || 'Back');
    const backBtn = this.createTouchButton('← ' + backLabel, this.fontSize * 1.1, THEME.colors.textPrimary, THEME.colors.buttonDangerHex);
    backBtn.setPosition(width / 2, height - padding * 1.5);
    backBtn.setOrigin(0.5);
    backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: THEME.colors.buttonDangerHoverHex }));
    backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: THEME.colors.buttonDangerHex }));
    backBtn.on('pointerdown', () => this.goBack());

    // Register back button focus item (always last)
    this.focus.items.push({
      element: backBtn,
      activate: () => this.goBack(),
      fixed: true,
    });
  }

  // === UI Element Factory Methods ===

  private createText(text: string, fontSize: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
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
      fontFamily: THEME.fonts.family,
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
    const langButtons: Phaser.GameObjects.Text[] = [];
    
    languages.forEach(lang => {
      const isActive = currentLang === lang.code;
      // Smaller padding on narrow screens
      const paddingY = Math.max(2, Math.min(6, (this.minTouchTarget - this.fontSize) / 2));
      const paddingX = Math.max(3, Math.round(paddingY * 0.6));
      const btn = this.add.text(0, 0, lang.name, {
        fontFamily: THEME.fonts.family,
        fontSize: this.fontSize + 'px',
        backgroundColor: isActive ? THEME.colors.toggleActive : THEME.colors.buttonPrimaryHex,
        padding: { x: paddingX, y: paddingY },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setLang(lang.code));
      langButtons.push(btn);
      row.add(btn);
    });

    // Register as a group focus item
    const currentIndex = languages.findIndex(l => l.code === currentLang);
    const groupIndex = { value: Math.max(0, currentIndex) };
    this.focus.items.push({
      element: row,
      buttons: langButtons,
      groupIndex: groupIndex.value,
      activate: () => this.setLang(languages[groupIndex.value].code),
      left: () => {
        groupIndex.value = (groupIndex.value - 1 + languages.length) % languages.length;
        this.setLang(languages[groupIndex.value].code);
      },
      right: () => {
        groupIndex.value = (groupIndex.value + 1) % languages.length;
        this.setLang(languages[groupIndex.value].code);
      },
    });

    return row;
  }

  private createToggleRow(label: string, initialValue: boolean, onChange: (val: boolean) => void): any {
    // Use fixWidthSizer for wrapping on narrow screens
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });
    
    row.add(this.createText(label + ':', this.smallFont, THEME.colors.textSecondary));
    
    const paddingY = Math.max(2, Math.min(6, (this.minTouchTarget - this.smallFont) / 2));
    const btn = this.add.text(0, 0, initialValue ? t('on') : t('off'), {
      fontFamily: THEME.fonts.family,
      fontSize: this.smallFont + 'px',
      color: initialValue ? THEME.colors.toggleActiveText : THEME.colors.textMuted,
      backgroundColor: initialValue ? THEME.colors.toggleActive : THEME.colors.textDark,
      padding: { x: Math.round(paddingY * 1.5), y: paddingY },
    }).setInteractive({ useHandCursor: true });

    let value = initialValue;
    const toggle = () => {
      value = !value;
      btn.setText(value ? t('on') : t('off'));
      btn.setStyle({
        color: value ? THEME.colors.toggleActiveText : THEME.colors.textMuted,
        backgroundColor: value ? THEME.colors.toggleActive : THEME.colors.textDark,
      });
      onChange(value);
      this.mainSizer?.layout();
    };
    btn.on('pointerdown', toggle);
    
    // Register focus item
    this.focus.items.push({
      element: row,
      activate: toggle,
    });

    row.add(btn);
    return row;
  }

  private createSensitivitySlider(): any {
    const MIN = BALANCE.SENSITIVITY_MIN, MAX = BALANCE.SENSITIVITY_MAX, DEFAULT = BALANCE.SENSITIVITY_DEFAULT;
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
    let value = saved ? parseFloat(saved) : DEFAULT;
    if (isNaN(value) || value < MIN || value > MAX) value = DEFAULT;

    const wrapper = this.rexUI.add.sizer({ orientation: 'vertical', space: { item: 4 } });

    // Label row: "Sensibilité: 95%"
    const labelRow = this.rexUI.add.fixWidthSizer({
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.3) },
    });
    const label = this.createText(
      (t('movementSensitivity') || 'Sensitivity') + ':',
      this.smallFont, THEME.colors.textSecondary
    );
    const valueText = this.createText(
      Math.round(value * 100) + '%',
      this.smallFont, THEME.colors.textPrimary
    );
    labelRow.add(label);
    labelRow.add(valueText);
    wrapper.add(labelRow, { align: 'left' });

    // Slider track
    const trackWidth = Math.min(this.contentWidth - 40, 200);
    const trackHeight = 8;
    const thumbSize = Math.max(this.minTouchTarget, 20);

    const container = this.add.container(0, 0);
    const track = this.add.graphics();
    track.fillStyle(0x555555, 1);
    track.fillRect(0, -trackHeight / 2, trackWidth, trackHeight);
    container.add(track);

    const fill = this.add.graphics();
    container.add(fill);

    const thumb = this.add.graphics();
    container.add(thumb);

    const drawThumb = (t: number) => {
      const x = t * trackWidth;
      thumb.clear();
      thumb.fillStyle(0x87CEEB, 1);
      thumb.fillRect(x - 6, -thumbSize / 2, 12, thumbSize);
      fill.clear();
      fill.fillStyle(0x3a6d8e, 1);
      fill.fillRect(0, -trackHeight / 2, x, trackHeight);
    };

    const valToT = (v: number) => (v - MIN) / (MAX - MIN);
    const tToVal = (t: number) => Math.round((MIN + t * (MAX - MIN)) * 20) / 20;

    drawThumb(valToT(value));

    const hitZone = this.add.rectangle(
      trackWidth / 2, 0, trackWidth + thumbSize, thumbSize, 0x000000, 0
    ).setInteractive({ useHandCursor: true, draggable: true });
    container.add(hitZone);

    const updateFromPointer = (pointerX: number) => {
      const bounds = hitZone.getBounds();
      const relX = pointerX - bounds.left;
      const t = Phaser.Math.Clamp(relX / trackWidth, 0, 1);
      value = tToVal(t);
      drawThumb(valToT(value));
      valueText.setText(Math.round(value * 100) + '%');
      localStorage.setItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
    };

    let dragging = false;
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      updateFromPointer(pointer.x);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragging && pointer.isDown) updateFromPointer(pointer.x);
    });
    this.input.on('pointerup', () => { dragging = false; });

    container.setSize(trackWidth, thumbSize);
    wrapper.add(container, { align: 'left' });

    // Register focus item with left/right adjustment
    const STEP = 0.05;
    this.focus.items.push({
      element: wrapper,
      activate: () => {},
      left: () => {
        value = Math.max(MIN, Math.round((value - STEP) * 20) / 20);
        drawThumb(valToT(value));
        valueText.setText(Math.round(value * 100) + '%');
        localStorage.setItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
      },
      right: () => {
        value = Math.min(MAX, Math.round((value + STEP) * 20) / 20);
        drawThumb(valToT(value));
        valueText.setText(Math.round(value * 100) + '%');
        localStorage.setItem(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
      },
    });

    return wrapper;
  }

  private createColorblindButtons(): any {
    const cbModes: ColorblindMode[] = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];
    
    // Always use fixWidthSizer for auto-wrapping with width constraint
    const container = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: 4, line: 4 }
    });
    const cbButtons: Phaser.GameObjects.Text[] = [];
    cbModes.forEach(mode => {
      const btn = this.createColorblindBtn(mode);
      cbButtons.push(btn);
      container.add(btn);
    });

    // Register as group focus item
    const currentMode = Accessibility.settings.colorblindMode;
    const currentIdx = cbModes.indexOf(currentMode);
    const groupIndex = { value: Math.max(0, currentIdx) };
    this.focus.items.push({
      element: container,
      buttons: cbButtons,
      groupIndex: groupIndex.value,
      activate: () => {
        Accessibility.settings.colorblindMode = cbModes[groupIndex.value];
        Accessibility.saveSettings();
        this.restartScene();
      },
      left: () => {
        groupIndex.value = (groupIndex.value - 1 + cbModes.length) % cbModes.length;
        Accessibility.settings.colorblindMode = cbModes[groupIndex.value];
        Accessibility.saveSettings();
        this.restartScene();
      },
      right: () => {
        groupIndex.value = (groupIndex.value + 1) % cbModes.length;
        Accessibility.settings.colorblindMode = cbModes[groupIndex.value];
        Accessibility.saveSettings();
        this.restartScene();
      },
    });

    return container;
  }

  private createColorblindBtn(mode: ColorblindMode): Phaser.GameObjects.Text {
    const isActive = Accessibility.settings.colorblindMode === mode;
    const label = (t(mode) || mode).substring(0, 8);
    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    
    return this.add.text(0, 0, label, {
      fontFamily: THEME.fonts.family,
      fontSize: this.smallFont + 'px',
      color: isActive ? THEME.colors.toggleActiveText : THEME.colors.textSecondary,
      backgroundColor: isActive ? THEME.colors.toggleActive : THEME.colors.buttonPrimaryHex,
      padding: { x: Math.round(paddingY * 1.5), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        Accessibility.settings.colorblindMode = mode;
        Accessibility.saveSettings();
        this.restartScene();
      });
  }

  private createBindingRow(actionId: string, label: string): any {
    // Use fixWidthSizer for wrapping with width constraint
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });
    
    row.add(this.createText(label + ':', this.smallFont, THEME.colors.textSecondary));
    
    const currentBinding = this.bindings[actionId as keyof KeyBindings];
    const defaultBinding = this.getDefaultBindings()[actionId as keyof KeyBindings];
    const isCustom = currentBinding !== defaultBinding;
    const keyName = this.getKeyName(currentBinding);
    
    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    const btn = this.add.text(0, 0, keyName + (isCustom ? ' *' : ''), {
      fontFamily: THEME.fonts.family,
      fontSize: this.smallFont + 'px',
      color: isCustom ? THEME.colors.accent : THEME.colors.info,
      backgroundColor: isCustom ? '#5a5a2d' : THEME.colors.buttonPrimaryHex,
      padding: { x: Math.round(paddingY * 2), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startRebind(actionId, btn));
    
    this.rebindButtons[actionId] = btn;
    row.add(btn);

    // Register focus item
    this.focus.items.push({
      element: row,
      activate: () => this.startRebind(actionId, btn),
    });

    return row;
  }

  private createGamepadBindingRow(actionId: string, label: string): any {
    const row = this.rexUI.add.fixWidthSizer({
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });

    row.add(this.createText('🎮 ' + label + ':', this.smallFont, THEME.colors.textSecondary));

    const currentBtn = this.gamepadBindings[actionId as keyof GamepadBindings];
    const defaultBtn = getDefaultGamepadBindings()[actionId as keyof GamepadBindings];
    const isCustom = currentBtn !== defaultBtn;
    const btnName = getButtonName(currentBtn, getConnectedControllerType());

    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    const btn = this.add.text(0, 0, btnName + (isCustom ? ' *' : ''), {
      fontFamily: THEME.fonts.family,
      fontSize: this.smallFont + 'px',
      color: isCustom ? THEME.colors.accent : THEME.colors.info,
      backgroundColor: isCustom ? '#5a5a2d' : THEME.colors.buttonPrimaryHex,
      padding: { x: Math.round(paddingY * 2), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGamepadRebind(actionId, btn));

    this.gamepadRebindButtons[actionId] = btn;
    row.add(btn);

    // Register focus item
    this.focus.items.push({
      element: row,
      activate: () => this.startGamepadRebind(actionId, btn),
    });

    return row;
  }

  private createLayoutSelector(): any {
    const row = this.rexUI.add.fixWidthSizer({ 
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.4), line: 2 }
    });
    
    row.add(this.createText('⌨️ ' + (t('keyboardLayout') || 'Layout') + ':', this.smallFont, THEME.colors.textSecondary));
    
    // Check for custom bindings
    const hasCustomBindings = Object.keys(this.bindings).some(key => 
      this.bindings[key as keyof KeyBindings] !== this.getDefaultBindings()[key as keyof KeyBindings]
    );

    if (hasCustomBindings) {
      row.add(this.createText(t('customBindings') || 'Custom', this.smallFont, THEME.colors.accent));
      // No navigation for custom mode
      this.focus.items.push({ element: row, activate: () => {} });
    } else {
      const currentLayout = getKeyboardLayout();
      const layoutButtons: Phaser.GameObjects.Text[] = [];
      AVAILABLE_LAYOUTS.forEach(layout => {
        const isActive = currentLayout === layout.id;
        const paddingY = Math.max(2, (this.minTouchTarget - this.smallFont) / 4);
        const btn = this.add.text(0, 0, layout.id.toUpperCase(), {
          fontFamily: THEME.fonts.family,
          fontSize: this.smallFont + 'px',
          color: isActive ? THEME.colors.textDark : THEME.colors.textPrimary,
          backgroundColor: isActive ? THEME.colors.info : '#555555',
          padding: { x: Math.round(paddingY * 2), y: paddingY },
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setLayout(layout.id));
        layoutButtons.push(btn);
        row.add(btn);
      });

      // Register as group focus item
      const currentIdx = AVAILABLE_LAYOUTS.findIndex(l => l.id === currentLayout);
      const groupIndex = { value: Math.max(0, currentIdx) };
      this.focus.items.push({
        element: row,
        buttons: layoutButtons,
        groupIndex: groupIndex.value,
        activate: () => this.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id),
        left: () => {
          groupIndex.value = (groupIndex.value - 1 + AVAILABLE_LAYOUTS.length) % AVAILABLE_LAYOUTS.length;
          this.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id);
        },
        right: () => {
          groupIndex.value = (groupIndex.value + 1) % AVAILABLE_LAYOUTS.length;
          this.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id);
        },
      });
    }
    return row;
  }

  // === Logic Methods ===

  private loadBindings(): void {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.BINDINGS_VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.BINDINGS);
    const savedNames = localStorage.getItem(STORAGE_KEYS.DISPLAY_NAMES);
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
      } catch (e) {
        console.warn('Failed to parse key bindings:', e);
        this.bindings = defaults;
      }
    } else {
      this.bindings = defaults;
    }

    if (savedNames) {
      try {
        this.displayNames = JSON.parse(savedNames);
      } catch (e) {
        console.warn('Failed to parse display names:', e);
        this.displayNames = {};
      }
    }
  }

  private getDefaultBindings(): KeyBindings {
    return getLayoutDefaults();
  }

  private saveBindings(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BINDINGS_VERSION, String(BINDINGS_VERSION));
      localStorage.setItem(STORAGE_KEYS.BINDINGS, JSON.stringify(this.bindings));
      localStorage.setItem(STORAGE_KEYS.DISPLAY_NAMES, JSON.stringify(this.displayNames));
    } catch { /* Private browsing or quota exceeded */ }
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
    btn.setStyle({ backgroundColor: '#5a5a2d', color: THEME.colors.accent });

    this.rebindingAction = null;
    this.statusText?.setText(t('saved') || 'Saved!');
    this.mainSizer?.layout();
    this.time.delayedCall(800, () => this.restartScene());
  }

  private cancelRebind(): void {
    if (!this.rebindingAction) return;
    const btn = this.rebindButtons[this.rebindingAction];
    btn.setText(this.getKeyName(this.bindings[this.rebindingAction as keyof KeyBindings]));
    btn.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
    this.rebindingAction = null;
    this.statusText?.setText('');
    this.mainSizer?.layout();
  }

  private startGamepadRebind(actionId: string, btn: Phaser.GameObjects.Text): void {
    if (this.rebindingGamepadAction || this.rebindingAction) return;
    if (!this.input.gamepad || this.input.gamepad.total === 0) {
      this.statusText?.setText(t('noGamepadConnected') || 'No gamepad connected');
      return;
    }
    this.rebindingGamepadAction = actionId;
    // Snapshot current button state so the confirm press isn't immediately captured
    this.gamepadRebindSnapshot = captureGamepadButtons(this, Array.from({ length: 16 }, (_, i) => i));
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.statusText?.setText(t('pressGamepadButton') || 'Press a gamepad button...');
    this.mainSizer?.layout();
  }

  private checkGamepadRebind(): void {
    if (!this.rebindingGamepadAction) return;
    if (!this.input.gamepad || this.input.gamepad.total === 0) return;

    const pad = this.input.gamepad.getPad(0);
    if (!pad) return;

    const maxBtn = Math.min(Math.max(pad.buttons.length, 8), 16);
    for (let i = 0; i < maxBtn; i++) {
      const now = isGamepadButtonPressed(pad, i);
      const was = this.gamepadRebindSnapshot[i] ?? false;
      // Only accept a fresh press (not-pressed → pressed)
      if (now && !was) {
        this.acceptGamepadRebind(i);
        return;
      }
      this.gamepadRebindSnapshot[i] = now;
    }
  }

  private acceptGamepadRebind(buttonIndex: number): void {
    const actionId = this.rebindingGamepadAction as keyof GamepadBindings;
    this.gamepadBindings[actionId] = buttonIndex;
    saveGamepadBindings(this.gamepadBindings);

    const btn = this.gamepadRebindButtons[actionId];
    const isCustom = buttonIndex !== getDefaultGamepadBindings()[actionId];
    btn.setText(getButtonName(buttonIndex, getConnectedControllerType()) + (isCustom ? ' *' : ''));
    btn.setStyle({ backgroundColor: isCustom ? '#5a5a2d' : THEME.colors.buttonPrimaryHex,
                    color: isCustom ? THEME.colors.accent : THEME.colors.info });

    this.rebindingGamepadAction = null;
    this.statusText?.setText(t('saved') || 'Saved!');
    this.mainSizer?.layout();
    this.time.delayedCall(800, () => this.restartScene());
  }

  private resetBindings(): void {
    setKeyboardLayout('qwerty');
    this.bindings = this.getDefaultBindings();
    this.displayNames = {};
    this.saveBindings();
    this.gamepadBindings = getDefaultGamepadBindings();
    saveGamepadBindings(this.gamepadBindings);
    this.statusText?.setText(t('controlsReset') || 'Controls reset!');
    this.time.delayedCall(800, () => this.restartScene());
  }

  private setLayout(layout: KeyboardLayout): void {
    setKeyboardLayout(layout);
    this.bindings = this.getDefaultBindings();
    this.displayNames = {};
    this.saveBindings();
    this.restartScene();
  }

  private setLang(code: SupportedLanguage): void {
    setLanguage(code);
    this.restartScene();
  }

  private goBack(): void {
    if (this.rebindingAction) {
      this.cancelRebind();
      return;
    }

    if (this.returnTo === 'PauseScene') {
      // Return to pause menu — GameScene is still paused, just resume overlays
      const game = this.game;
      const levelIndex = this.levelIndex;
      this.scene.stop('SettingsScene');
      game.scene.start('HUDScene', { level: LEVELS[levelIndex] });
      game.scene.start('DialogueScene');
      game.scene.start('PauseScene', { levelIndex });
    } else if (this.returnTo === 'GameScene') {
      const game = this.game;
      this.scene.stop('SettingsScene');
      resetGameScenes(game, 'GameScene', { level: this.levelIndex });
    } else {
      this.scene.start('MenuScene');
    }
  }

  private updateGamepadName(): void {
    if (!this.gamepadNameText) return;
    
    let gamepadName = '';
    if (this.input.gamepad && this.input.gamepad.total > 0) {
      const pad = this.input.gamepad.getPad(0);
      if (pad && pad.id) {
        // Clean up the gamepad name (remove vendor/product IDs)
        gamepadName = pad.id
          .replace(/\s*\(.*?\)\s*/g, ' ')  // Remove parenthesized vendor IDs
          .replace(/\s+/g, ' ')             // Collapse whitespace
          .trim();
        // Truncate if too long
        if (gamepadName.length > 35) {
          gamepadName = gamepadName.substring(0, 32) + '...';
        }
      }
    }
    
    if (gamepadName !== this.lastGamepadName) {
      this.lastGamepadName = gamepadName;
      if (gamepadName) {
        this.gamepadNameText.setText('🎮 ' + gamepadName);
      } else {
        this.gamepadNameText.setText(t('noGamepadConnected') || '🎮 No gamepad connected');
      }
    }
  }

  shutdown(): void {
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
  }
}
