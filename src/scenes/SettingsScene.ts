import Phaser from 'phaser';
import { t, getLanguage, setLanguage, Accessibility, SupportedLanguage, ColorblindMode, LEVELS } from '../setup';
import { getKeyboardLayout, getLayoutDefaults, AVAILABLE_LAYOUTS, type KeyboardLayout } from '../utils/keyboardLayout';
import { loadGamepadBindings, getDefaultGamepadBindings, getButtonName, getConnectedControllerType, type GamepadBindings } from '../utils/gamepad';
import { THEME } from '../config/theme';
import { BALANCE, DEPTHS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString, setString } from '../utils/storage';
import { resetGameScenes } from '../utils/sceneTransitions';
import { hasTouch as detectTouch } from '../utils/touchDetect';
import { createGamepadMenuNav } from '../utils/gamepadMenu';
import { GAME_EVENTS } from '../types/GameSceneInterface';
import { FocusNavigator, type FocusItem } from '../utils/focusNavigator';
import { KeybindingManager, type KeyBindings } from '../utils/keybindingManager';
import { AudioSystem, type VolumeChannel } from '../systems/AudioSystem';
import { playClick, playCancel, playToggle, playPreview, playSensitivityBlip } from '../systems/UISounds';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { getSavedProgress } from '../utils/gameProgress';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';

/**
 * RexUI Settings Scene - Full responsive implementation using rexUI
 * Replaces manual layout with Sizer-based automatic positioning
 */

/** Layout constants for SettingsScene scroll panels and spacing. */
const SCROLLBAR_TRACK_COLOR = 0x555555;
const SCROLLBAR_THUMB_COLOR = 0x888888;
const GP_HORIZ_COOLDOWN_MS = 200;
/** Panel background — notably brighter than dark overlay for clear contrast. */
const SECTION_PANEL_BG = 0x2d4a63;

interface SettingsSceneData {
  returnTo?: string;
  levelIndex?: number;
  focusIndex?: number;
}


export default class SettingsScene extends Phaser.Scene {
  private returnTo: string | null = null;
  private levelIndex = 0;
  private keys: KeybindingManager = null!;
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
  private wildlife: MenuWildlifeController | null = null;

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

    // Alpine backdrop — reuse MenuScene terrain renderer
    const snowLineY = height * 0.75;
    const scaleFactor = Math.min(width / 1024, height / 768);
    const progress = getSavedProgress();
    const currentLevel = progress ? LEVELS[progress.currentLevel] : null;
    const levelWeather = currentLevel
      ? { isNight: currentLevel.isNight, weather: currentLevel.weather }
      : undefined;
    createMenuTerrain(this, width, height, snowLineY, 0, scaleFactor, levelWeather);

    // Animated wildlife on the snow (behind overlay)
    this.wildlife = new MenuWildlifeController(this);
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, 0, scaleFactor, levelWeather);
    this.wildlife.menuZone = { left: 0, right: width, top: snowLineY, bottom: height };

    // Darken overlay so UI text stays readable over the terrain
    this.add.rectangle(width / 2, height / 2, width, height, THEME.colors.darkBg)
      .setAlpha(0.92).setDepth(DEPTHS.MENU_OVERLAY);

    this.keys = new KeybindingManager(this);
    this.keys.accentColor = THEME.colors.accent;
    this.keys.buttonBgColor = THEME.colors.buttonPrimaryHex;
    this.keys.onStatus = (msg: string) => this.statusText?.setText(msg);
    this.keys.onLayout = () => this.mainSizer?.layout();
    this.keys.onRestart = () => this.restartScene();
    this.keys.load();
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

    if (this.useSingleColumn) {
      this.createSingleColumnLayout(width, height, padding, itemSpacing);
    } else {
      this.createTwoColumnLayout(width, height, padding, itemSpacing);
    }

    // Back button (fixed at bottom)
    this.createBackButton(width, height, padding);

    // Keyboard input for rebinding and navigation
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.keys.rebindingAction) {
        this.keys.finishRebind(event.keyCode, event.key, event.code);
        return;
      }
      if (this.keys.rebindingGamepadAction) return;
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
      isBlocked: () => !!this.keys.rebindingAction || !!this.keys.rebindingGamepadAction,
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

  /** Apply accessibility changes to DOM and notify running game scenes. */
  private broadcastAccessibility(): void {
    Accessibility.applyDOMSettings();
    this.game.events.emit(GAME_EVENTS.ACCESSIBILITY_CHANGED);
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
    this.keys.checkGamepadRebind();
    this.wildlife?.update(_time, delta);

    // Gamepad left/right for group cycling & slider (separate from vertical nav)
    this.gpHorizCooldown = Math.max(0, this.gpHorizCooldown - delta);
    if (this.gpHorizCooldown <= 0 && !this.keys.rebindingAction && !this.keys.rebindingGamepadAction) {
      const pad = this.input.gamepad?.getPad(0);
      if (pad) {
        const stickX = pad.leftStick?.x ?? 0;
        if (pad.left || stickX < -0.5) {
          this.focus.left();
          this.gpHorizCooldown = GP_HORIZ_COOLDOWN_MS;
        } else if (pad.right || stickX > 0.5) {
          this.focus.right();
          this.gpHorizCooldown = GP_HORIZ_COOLDOWN_MS;
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

  /** Wrap a content sizer in a scrollable panel with conditional scrollbar. */
  private wrapInScrollPanel(contentSizer: any, x: number, y: number, panelWidth: number, availableHeight: number): void {
    contentSizer.layout();
    const needsScroll = contentSizer.height > availableHeight;

    const config: any = {
      x, y, width: panelWidth, height: availableHeight, origin: 0,
      scrollMode: 'y',
      panel: { child: contentSizer },
      mouseWheelScroller: { speed: 0.3 },
      space: { panel: 5 },
    };
    if (needsScroll) {
      config.slider = {
        track: this.rexUI.add.roundRectangle(0, 0, 6, 0, 3, SCROLLBAR_TRACK_COLOR),
        thumb: this.rexUI.add.roundRectangle(0, 0, 6, 40, 3, SCROLLBAR_THUMB_COLOR),
      };
    }
    this.mainSizer = this.rexUI.add.scrollablePanel(config).layout();
    this.mainSizer.setDepth(DEPTHS.MENU_UI);
    this.mainSizer.setChildrenInteractive();
    this.focus.setScrollPanel(this.mainSizer);
  }

  private createSingleColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Single scrollable column for narrow/portrait screens
    // Reserve space for back button at bottom
    const backButtonSpace = this.fontSize * 3;
    const availableHeight = height - padding * 2 - backButtonSpace;
    
    // Reduce spacing further on very small screens
    const tightSpacing = height < 600 ? Math.max(2, itemSpacing * 0.5) : itemSpacing;
    
    const sizerWidth = width - padding * 2;
    
    // Reduce contentWidth to account for panel padding
    const panelPad = Math.round(this.fontSize * 0.6);
    this.contentWidth = sizerWidth - 10 - panelPad * 2; // Scrollbar + panel padding
    
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
    this.addAudioSection(contentSizer);
    this.addGameplaySection(contentSizer);
    
    // Always add controls section (scrollable now handles overflow)
    this.addControlsSection(contentSizer);

    // Status text
    this.statusText = this.createText('', this.fontSize, THEME.colors.accent);
    contentSizer.add(this.statusText, { align: 'center' });

    this.wrapInScrollPanel(contentSizer, padding, padding, sizerWidth, availableHeight);
  }

  private createTwoColumnLayout(width: number, height: number, padding: number, itemSpacing: number): void {
    // Two-column layout for wide screens
    // Reserve space for back button at bottom
    const backButtonSpace = this.fontSize * 3;
    const availableHeight = height - padding * 2 - backButtonSpace;
    const totalWidth = width - padding * 2 - 10; // Account for scrollbar
    const colWidth = (totalWidth - padding) / 2;
    
    // Update contentWidth for child elements in two-column mode
    // Subtract panel padding so inner content fits within panel borders
    const panelPad = Math.round(this.fontSize * 0.6);
    this.contentWidth = colWidth - panelPad * 2;
    
    // Outer vertical sizer: title + columns row
    const outerSizer = this.rexUI.add.sizer({
      width: totalWidth,
      orientation: 'vertical',
      space: { item: itemSpacing },
    });

    // Title centered above both columns
    outerSizer.add(this.createText('⚙️ ' + (t('settings') || 'Settings'), this.fontSize * 1.2, THEME.colors.info, true), 
      { align: 'center' });

    // Horizontal sizer for the two columns
    const rowSizer = this.rexUI.add.sizer({
      width: totalWidth,
      orientation: 'horizontal',
      space: { item: padding },
    });

    // Left column: Language + Accessibility + Audio
    const leftCol = this.rexUI.add.sizer({
      width: colWidth,
      orientation: 'vertical',
      space: { item: itemSpacing }
    });
    
    this.addLanguageSection(leftCol);
    this.addAccessibilitySection(leftCol);
    this.addAudioSection(leftCol);
    this.addGameplaySection(leftCol);
    
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

    rowSizer.add(leftCol, { align: 'top', expand: true, proportion: 1 });
    rowSizer.add(rightCol, { align: 'top', expand: true, proportion: 1 });
    outerSizer.add(rowSizer, { expand: true });

    this.wrapInScrollPanel(outerSizer, padding, padding, totalWidth, availableHeight);
  }

  private addLanguageSection(sizer: any): void {
    const panel = this.createSectionPanel('🌐 ' + (t('language') || 'Language'), 6);
    panel.add(this.createLanguageButtons(), { align: 'left' });
    sizer.add(panel, { align: 'left' });
  }

  private addAccessibilitySection(sizer: any): void {
    const panel = this.createSectionPanel('♿ ' + (t('accessibility') || 'Accessibility'), 6);
    
    panel.add(this.createToggleRow(t('highContrast') || 'High Contrast', 
      Accessibility.settings.highContrast, (val) => {
        Accessibility.settings.highContrast = val;
        Accessibility.saveSettings();
        this.broadcastAccessibility();
      }), { align: 'left' });
    
    panel.add(this.createToggleRow(t('reducedMotion') || 'Reduced Motion',
      Accessibility.settings.reducedMotion, (val) => {
        Accessibility.settings.reducedMotion = val;
        Accessibility.saveSettings();
        this.broadcastAccessibility();
      }), { align: 'left' });

    // Colorblind modes
    panel.add(this.createText(t('colorblindMode') || 'Colorblind:', this.smallFont, THEME.colors.textSecondary), 
      { align: 'left' });
    panel.add(this.createColorblindButtons(), { align: 'left' });
    sizer.add(panel, { align: 'left', padding: { top: 4 } });
  }

  private addAudioSection(sizer: any): void {
    const panel = this.createSectionPanel('🔊 ' + (t('audio') || 'Audio'), 6);

    // Mute toggle
    const audio = AudioSystem.getInstance();
    panel.add(this.createToggleRow(t('mute') || 'Mute',
      audio.isMuted(), (val) => {
        audio.setMuted(val);
      }), { align: 'left' });

    // Volume sliders
    panel.add(this.createVolumeSlider('master', t('masterVolume') || 'Master Volume'), { align: 'left' });
    panel.add(this.createVolumeSlider('music', t('musicVolume') || 'Music'), { align: 'left' });
    panel.add(this.createVolumeSlider('sfx', t('sfxVolume') || 'Sound Effects'), { align: 'left' });
    panel.add(this.createVolumeSlider('voice', t('voiceVolume') || 'Voice'), { align: 'left' });
    panel.add(this.createVolumeSlider('ambience', t('ambienceVolume') || 'Ambience'), { align: 'left' });
    // Spacer to compensate for slider Graphics underreporting height
    panel.add(this.add.rectangle(0, 0, 1, 20, 0x000000, 0));
    sizer.add(panel, { align: 'left' });
  }

  private addGameplaySection(sizer: any): void {
    const panel = this.createSectionPanel('🎿 ' + (t('bonus') || 'Bonus'), 6);
    
    const currentMode = getString(STORAGE_KEYS.SKI_MODE) || 'ski';

    const row = this.rexUI.add.fixWidthSizer({
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });

    row.add(this.createText(
      (t('skiMode') || 'Descent Mode') + ':',
      this.smallFont, THEME.colors.textSecondary
    ));

    const modes = [
      { id: 'ski', label: t('ski') || 'Ski' },
      { id: 'snowboard', label: t('snowboard') || 'Snowboard' },
    ];

    const paddingY = Math.max(2, (this.minTouchTarget - this.smallFont) / 4);
    const modeButtons: Phaser.GameObjects.Text[] = [];

    const setMode = (modeId: string) => {
      setString(STORAGE_KEYS.SKI_MODE, modeId);
      modeButtons.forEach((btn, i) => {
        const active = modes[i].id === modeId;
        btn.setColor(active ? THEME.colors.textDark : THEME.colors.textPrimary);
        btn.setBackgroundColor(active ? THEME.colors.info : '#555555');
      });
      this.mainSizer?.layout();
    };

    modes.forEach(mode => {
      const isActive = currentMode === mode.id;
      const btn = this.add.text(0, 0, mode.label, {
        fontFamily: THEME.fonts.family,
        fontSize: this.smallFont + 'px',
        color: isActive ? THEME.colors.textDark : THEME.colors.textPrimary,
        backgroundColor: isActive ? THEME.colors.info : '#555555',
        padding: { x: Math.round(paddingY * 2), y: paddingY },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { playClick(); setMode(mode.id); });
      modeButtons.push(btn);
      row.add(btn);
    });

    const currentIdx = modes.findIndex(m => m.id === currentMode);
    const groupIndex = { value: Math.max(0, currentIdx) };
    this.focus.items.push({
      element: row,
      buttons: modeButtons,
      groupIndex: groupIndex.value,
      activate: () => { playClick(); setMode(modes[groupIndex.value].id); },
      left: () => {
        groupIndex.value = (groupIndex.value - 1 + modes.length) % modes.length;
        playClick();
        setMode(modes[groupIndex.value].id);
      },
      right: () => {
        groupIndex.value = (groupIndex.value + 1) % modes.length;
        playClick();
        setMode(modes[groupIndex.value].id);
      },
    });

    panel.add(row, { align: 'left' });
    sizer.add(panel, { align: 'left', padding: { top: 4 } });
  }

  private createVolumeSlider(channel: VolumeChannel, label: string): any {
    const audio = AudioSystem.getInstance();
    let value = audio.getVolume(channel);

    const wrapper = this.rexUI.add.sizer({ orientation: 'vertical', space: { item: 4 } });

    const labelRow = this.rexUI.add.fixWidthSizer({
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.3) },
    });
    const labelText = this.createText(label + ':', this.smallFont, THEME.colors.textSecondary);
    const valueText = this.createText(
      Math.round(value * 100) + '%', this.smallFont, THEME.colors.textPrimary
    );
    labelRow.add(labelText);
    labelRow.add(valueText);
    wrapper.add(labelRow, { align: 'left' });

    const trackWidth = Math.min(this.contentWidth - 40, 200);
    const trackHeight = 8;
    const thumbSize = Math.max(this.minTouchTarget, 20);

    const container = this.add.container(0, 0);
    const track = this.add.graphics();
    track.fillStyle(SCROLLBAR_TRACK_COLOR, 1);
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

    drawThumb(value);

    // Throttle preview blips to avoid buzzing during drag
    let lastPreview = 0;
    const PREVIEW_COOLDOWN = 150;

    const apply = (newVal: number) => {
      value = Math.max(0, Math.min(1, Math.round(newVal * 100) / 100));
      drawThumb(value);
      valueText.setText(Math.round(value * 100) + '%');
      audio.setVolume(channel, value);

      const now = Date.now();
      if (now - lastPreview > PREVIEW_COOLDOWN) {
        lastPreview = now;
        playPreview(channel);
      }
    };

    const hitZone = this.add.rectangle(
      trackWidth / 2, 0, trackWidth + thumbSize, thumbSize, 0x000000, 0
    ).setInteractive({ useHandCursor: true, draggable: true });
    container.add(hitZone);

    const updateFromPointer = (pointerX: number) => {
      const bounds = hitZone.getBounds();
      const relX = pointerX - bounds.left;
      apply(Phaser.Math.Clamp(relX / trackWidth, 0, 1));
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
    wrapper.add(container, { align: 'left', padding: { bottom: 2 } });

    const STEP = 0.05;
    this.focus.items.push({
      element: wrapper,
      activate: () => {},
      left: () => apply(value - STEP),
      right: () => apply(value + STEP),
      hasOwnSound: true,
    });

    return wrapper;
  }

  private addControlsSection(sizer: any): void {
    const panel = this.createSectionPanel('🎮 ' + (t('controls') || 'Controls'), 6);
    panel.add(this.createText(t('clickToRebind') || 'Click to rebind', this.smallFont, THEME.colors.disabled), 
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
      panel.add(this.createBindingRow(action.id, action.label), { align: 'left' });
    });

    // Layout selector
    panel.add(this.createLayoutSelector(), { align: 'left' });

    // Movement sensitivity slider
    panel.add(this.createSensitivitySlider(), { align: 'left' });

    // Gamepad bindings section
    panel.add(this.createText('🎮 ' + (t('gamepadButtons') || 'Gamepad Buttons'), this.smallFont, THEME.colors.textSecondary),
      { align: 'left', padding: { top: 10 } });

    const gpActions = [
      { id: 'groom', label: t('groom') || 'Groom' },
      { id: 'winch', label: t('winch') || 'Winch' },
      { id: 'pause', label: t('pause') || 'Pause' },
    ];
    gpActions.forEach(action => {
      panel.add(this.createGamepadBindingRow(action.id, action.label), { align: 'left' });
    });

    // Reset button
    const resetBtn = this.createTouchButton('🔄 ' + (t('resetControls') || 'Reset'), this.smallFont, '#ffaaaa', '#5a2d2d');
    resetBtn.on('pointerdown', () => { playClick(); this.keys.reset(); });
    panel.add(resetBtn, { align: 'left' });

    // Register reset button focus item
    this.focus.items.push({
      element: resetBtn,
      activate: () => this.keys.reset(),
    });

    // Input hints
    const hasTouchSetting = detectTouch();
    const inputHints: string[] = [];
    if (hasTouchSetting) inputHints.push('📱 Touch');
    inputHints.push('🎮 Gamepad');
    panel.add(this.createText(inputHints.join('  '), this.smallFont, '#88aa88'), { align: 'left' });

    // Connected gamepad name (updates dynamically)
    this.gamepadNameText = this.createText('', this.smallFont, '#aaaaff');
    this.updateGamepadName();
    panel.add(this.gamepadNameText, { align: 'left' });
    sizer.add(panel, { align: 'left', expand: true, proportion: 1 });
  }

  private createBackButton(width: number, height: number, padding: number): void {
    const backLabel = this.returnTo === 'PauseScene' ? (t('back') || 'Back')
      : this.returnTo ? (t('backToGame') || 'Back to Game')
      : (t('back') || 'Back');
    const backBtn = this.createTouchButton('← ' + backLabel, this.fontSize * 1.1, THEME.colors.textPrimary, THEME.colors.buttonDangerHex);
    backBtn.setPosition(width / 2, height - padding * 1.5);
    backBtn.setOrigin(0.5);
    backBtn.setDepth(DEPTHS.MENU_UI);
    backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: THEME.colors.buttonDangerHoverHex }));
    backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: THEME.colors.buttonDangerHex }));
    backBtn.on('pointerdown', () => { playCancel(); this.goBack(); });

    // Register back button focus item (always last)
    this.focus.items.push({
      element: backBtn,
      activate: () => this.goBack(),
      fixed: true,
    });
  }

  // === UI Element Factory Methods ===

  /** Create a section panel with rounded-rect background and header. */
  private createSectionPanel(title: string, itemSpacing: number): any {
    const panelPad = Math.round(this.fontSize * 0.6);
    const panelWidth = this.contentWidth + panelPad * 2;
    const panel = this.rexUI.add.sizer({
      width: panelWidth,
      orientation: 'vertical',
      space: { item: itemSpacing, top: panelPad, bottom: panelPad, left: panelPad, right: panelPad },
    });
    const bg = this.rexUI.add.roundRectangle(0, 0, 10, 10, 4, SECTION_PANEL_BG)
      .setStrokeStyle(3, THEME.colors.border);
    panel.addBackground(bg);
    panel.add(this.createText(title, this.fontSize * 1.05, THEME.colors.info, true), { align: 'left' });
    // Gold accent divider under header
    const divider = this.add.rectangle(0, 0, this.contentWidth * 0.6, 1, 0xffd700).setAlpha(0.35);
    panel.add(divider, { align: 'left' });
    return panel;
  }

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
    
    // Ordered: French first (home), then by ski market size (skier visits/year)
    const languages: { code: SupportedLanguage; name: string }[] = [
      { code: 'fr', name: '🇫🇷' },
      { code: 'en', name: '🇬🇧' },
      { code: 'de', name: '🇩🇪' },
      { code: 'it', name: '🇮🇹' },
      { code: 'ja', name: '🇯🇵' },
      { code: 'sv', name: '🇸🇪' },
      { code: 'nb', name: '🇳🇴' },
      { code: 'fi', name: '🇫🇮' },
      { code: 'ko', name: '🇰🇷' },
      { code: 'cs', name: '🇨🇿' },
      { code: 'pl', name: '🇵🇱' },
      { code: 'tr', name: '🇹🇷' },
      { code: 'sk', name: '🇸🇰' },
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
      playToggle(value);
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
    const saved = getString(STORAGE_KEYS.MOVEMENT_SENSITIVITY);
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
    track.fillStyle(SCROLLBAR_TRACK_COLOR, 1);
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

    let lastSensPreview = 0;
    const SENS_COOLDOWN = 100;

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
      setString(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
      const now = Date.now();
      if (now - lastSensPreview > SENS_COOLDOWN) {
        lastSensPreview = now;
        playSensitivityBlip(valToT(value));
      }
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
    wrapper.add(container, { align: 'left', padding: { bottom: 2 } });

    // Register focus item with left/right adjustment
    const STEP = 0.05;
    this.focus.items.push({
      element: wrapper,
      activate: () => {},
      left: () => {
        value = Math.max(MIN, Math.round((value - STEP) * 20) / 20);
        drawThumb(valToT(value));
        valueText.setText(Math.round(value * 100) + '%');
        setString(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
        playSensitivityBlip(valToT(value));
      },
      right: () => {
        value = Math.min(MAX, Math.round((value + STEP) * 20) / 20);
        drawThumb(valToT(value));
        valueText.setText(Math.round(value * 100) + '%');
        setString(STORAGE_KEYS.MOVEMENT_SENSITIVITY, String(value));
        playSensitivityBlip(valToT(value));
      },
      hasOwnSound: true,
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
        this.broadcastAccessibility();
        this.restartScene();
      },
      left: () => {
        groupIndex.value = (groupIndex.value - 1 + cbModes.length) % cbModes.length;
        Accessibility.settings.colorblindMode = cbModes[groupIndex.value];
        Accessibility.saveSettings();
        this.broadcastAccessibility();
        this.restartScene();
      },
      right: () => {
        groupIndex.value = (groupIndex.value + 1) % cbModes.length;
        Accessibility.settings.colorblindMode = cbModes[groupIndex.value];
        Accessibility.saveSettings();
        this.broadcastAccessibility();
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
        playClick();
        Accessibility.settings.colorblindMode = mode;
        Accessibility.saveSettings();
        this.broadcastAccessibility();
        this.restartScene();
      });
  }

  private createBindingRow(actionId: string, label: string): any {
    return this.createBindingRowImpl(actionId, label, {
      labelPrefix: '',
      getCurrentBinding: () => this.keys.bindings[actionId as keyof KeyBindings],
      getDefaultBinding: () => getLayoutDefaults()[actionId as keyof KeyBindings],
      getDisplayName: (binding: number) => this.keys.getKeyName(binding),
      onRebind: (btn: Phaser.GameObjects.Text) => this.keys.startRebind(actionId, btn),
    });
  }

  private createGamepadBindingRow(actionId: string, label: string): any {
    return this.createBindingRowImpl(actionId, label, {
      labelPrefix: '🎮 ',
      getCurrentBinding: () => this.keys.gamepadBindings[actionId as keyof GamepadBindings],
      getDefaultBinding: () => getDefaultGamepadBindings()[actionId as keyof GamepadBindings],
      getDisplayName: (binding: number) => getButtonName(binding, getConnectedControllerType()),
      onRebind: (btn: Phaser.GameObjects.Text) => this.keys.startGamepadRebind(actionId, btn),
    });
  }

  private createBindingRowImpl(_actionId: string, label: string, opts: {
    labelPrefix: string;
    getCurrentBinding: () => number;
    getDefaultBinding: () => number;
    getDisplayName: (binding: number) => string;
    onRebind: (btn: Phaser.GameObjects.Text) => void;
  }): any {
    const row = this.rexUI.add.fixWidthSizer({
      width: this.contentWidth,
      space: { item: Math.round(this.fontSize * 0.5), line: 2 }
    });

    row.add(this.createText(opts.labelPrefix + label + ':', this.smallFont, THEME.colors.textSecondary));

    const current = opts.getCurrentBinding();
    const isCustom = current !== opts.getDefaultBinding();
    const displayName = opts.getDisplayName(current);

    const paddingY = Math.max(3, (this.minTouchTarget - this.smallFont) / 3);
    const btn = this.add.text(0, 0, displayName + (isCustom ? ' *' : ''), {
      fontFamily: THEME.fonts.family,
      fontSize: this.smallFont + 'px',
      color: isCustom ? THEME.colors.accent : THEME.colors.info,
      backgroundColor: isCustom ? '#5a5a2d' : THEME.colors.buttonPrimaryHex,
      padding: { x: Math.round(paddingY * 2), y: paddingY },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => opts.onRebind(btn));

    row.add(btn);

    this.focus.items.push({
      element: row,
      activate: () => opts.onRebind(btn),
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
    const hasCustomBindings = Object.keys(this.keys.bindings).some(key => 
      this.keys.bindings[key as keyof KeyBindings] !== getLayoutDefaults()[key as keyof KeyBindings]
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
          .on('pointerdown', () => { playClick(); this.keys.setLayout(layout.id); });
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
        activate: () => this.keys.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id),
        left: () => {
          groupIndex.value = (groupIndex.value - 1 + AVAILABLE_LAYOUTS.length) % AVAILABLE_LAYOUTS.length;
          this.keys.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id);
        },
        right: () => {
          groupIndex.value = (groupIndex.value + 1) % AVAILABLE_LAYOUTS.length;
          this.keys.setLayout(AVAILABLE_LAYOUTS[groupIndex.value].id);
        },
      });
    }
    return row;
  }

  private setLang(code: SupportedLanguage): void {
    setLanguage(code);
    this.restartScene();
  }

  private goBack(): void {
    if (this.keys.rebindingAction) {
      this.keys.cancelRebind();
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
    this.wildlife?.destroy();
    this.wildlife = null;
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
  }
}
