import Phaser from 'phaser';
import { t, getLanguage, setLanguage, Accessibility, SupportedLanguage, ColorblindMode } from '../setup';

/**
 * Les Aiguilles Blanches - Settings Scene
 * Language, accessibility, and control rebinding
 */

interface SettingsSceneData {
  returnTo?: string;
  levelIndex?: number;
}

interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  groom: string;
  winch: string;
}

interface LangButton {
  btn: Phaser.GameObjects.Text;
  code: string;
}

interface ColorblindButton {
  btn: Phaser.GameObjects.Text;
  id: string;
}

export default class SettingsScene extends Phaser.Scene {
  private returnTo: string | null = null;
  private levelIndex = 0;
  private rebindingAction: string | null = null;
  private bindings: KeyBindings = this.getDefaultBindings();
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

      const keyName = this.getKeyName(this.bindings[action.id as keyof KeyBindings]);
      const btn = this.add.text(rightX + colWidth * 0.4, y, keyName, {
        fontFamily: 'Courier New',
        fontSize: (fontSize - 1) + 'px',
        color: '#87CEEB',
        backgroundColor: '#2d5a7b',
        padding: { x: 8, y: 2 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.startRebind(action.id, btn));

      this.rebindButtons[action.id] = btn;
    });

    rightY += actions.length * lineHeight * 0.75 + lineHeight * 0.5;

    // Reset bindings button
    this.add.text(rightX, rightY, t('resetControls') || 'Reset to Default', {
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
        this.finishRebind(event.code);
      } else if (event.code === 'Escape') {
        this.goBack();
      }
    });
  }

  private loadBindings(): void {
    const saved = localStorage.getItem('snowGroomer_bindings');
    const defaults = this.getDefaultBindings();

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.bindings = { ...defaults, ...parsed };
      } catch {
        this.bindings = defaults;
      }
    } else {
      this.bindings = defaults;
    }
  }

  private getDefaultBindings(): KeyBindings {
    return {
      up: 'KeyW',
      down: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      groom: 'Space',
      winch: 'ShiftLeft',
    };
  }

  private saveBindings(): void {
    localStorage.setItem('snowGroomer_bindings', JSON.stringify(this.bindings));
  }

  private getKeyName(code: string): string {
    if (!code) return '?';
    const names: Record<string, string> = {
      'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
      'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
      'Space': 'SPACE', 'ShiftLeft': 'L-SHIFT', 'ShiftRight': 'R-SHIFT',
      'ControlLeft': 'L-CTRL', 'ControlRight': 'R-CTRL',
      'Enter': 'ENTER', 'Tab': 'TAB',
    };
    return names[code] || code.replace('Key', '');
  }

  private startRebind(actionId: string, btn: Phaser.GameObjects.Text): void {
    if (this.rebindingAction) return;

    this.rebindingAction = actionId;
    btn.setText('...');
    btn.setStyle({ backgroundColor: '#5a5a2d' });
    this.rebindStatus?.setText(t('pressKey') || 'Press a key...');
  }

  private finishRebind(keyCode: string): void {
    if (!this.rebindingAction) return;

    if (keyCode === 'Escape') {
      this.cancelRebind();
      return;
    }

    const actionId = this.rebindingAction as keyof KeyBindings;
    this.bindings[actionId] = keyCode;
    this.saveBindings();

    const btn = this.rebindButtons[actionId];
    btn.setText(this.getKeyName(keyCode));
    btn.setStyle({ backgroundColor: '#2d5a7b' });

    this.rebindingAction = null;
    this.rebindStatus?.setText(t('saved') || 'Saved!');
    this.time.delayedCall(1500, () => this.rebindStatus?.setText(''));
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
    this.bindings = this.getDefaultBindings();
    this.saveBindings();

    for (const [actionId, btn] of Object.entries(this.rebindButtons)) {
      btn.setText(this.getKeyName(this.bindings[actionId as keyof KeyBindings]));
    }

    this.rebindStatus?.setText(t('controlsReset') || 'Controls reset!');
    this.time.delayedCall(1500, () => this.rebindStatus?.setText(''));
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
