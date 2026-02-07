import Phaser from 'phaser';
import { t, LEVELS, type Level } from '../setup';
import { THEME } from '../config/theme';

/**
 * Les Aiguilles Blanches - HUD Scene
 * Displays fuel, stamina, coverage, and timer
 */

interface HUDSceneData {
  level: Level;
  gameScene: Phaser.Scene & {
    fuel: number;
    stamina: number;
    winchActive: boolean;
    getCoverage: () => number;
    transitionToLevel: (level: number) => void;
  };
}

export default class HUDScene extends Phaser.Scene {
  private level!: Level;
  private gameScene!: HUDSceneData['gameScene'] | null;
  private isSkipping = false;
  private uiScale = 1;
  private barWidth = 130;

  private fuelBar: Phaser.GameObjects.Rectangle | null = null;
  private fuelBarBg: Phaser.GameObjects.Rectangle | null = null;
  private fuelText: Phaser.GameObjects.Text | null = null;
  private staminaBar: Phaser.GameObjects.Rectangle | null = null;
  private staminaBarBg: Phaser.GameObjects.Rectangle | null = null;
  private staminaText: Phaser.GameObjects.Text | null = null;
  private coverageText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private targetText: Phaser.GameObjects.Text | null = null;
  private winchStatus: Phaser.GameObjects.Text | null = null;
  private touchControlsContainer: Phaser.GameObjects.Container | null = null;
  
  // Virtual joystick components
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickPointer: Phaser.Input.Pointer | null = null;
  
  // Touch controls bounds (for dialogue positioning)
  private touchControlsTopEdge = 0;

  // Touch controls state (public for GameScene to read)
  public touchUp = false;
  public touchDown = false;
  public touchLeft = false;
  public touchRight = false;
  public touchGroom = false;
  public touchWinch = false;

  constructor() {
    super({ key: 'HUDScene' });
  }
  
  /** Get the Y coordinate of the top edge of touch controls (for dialogue positioning) */
  public getTouchControlsTopEdge(): number {
    return this.touchControlsTopEdge;
  }

  init(data: HUDSceneData): void {
    this.level = data.level;
    this.gameScene = data.gameScene;
    this.isSkipping = false;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // For very tall screens (21:9 phones), scale based on width to ensure UI fits
    const refWidth = 1024;
    const refHeight = 768;
    const scaleX = width / refWidth;
    const scaleY = height / refHeight;
    // Use smaller scale dimension to ensure everything fits
    let baseScale = Math.max(0.6, Math.min(2.0, Math.min(scaleX, scaleY)));
    
    // On high-DPI mobile devices, boost UI scale for better readability
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const dpr = window.devicePixelRatio || 1;
    if (isMobile && dpr > 1.5) {
      // Boost scale by ~20% on high-DPI mobile for larger, more readable UI
      baseScale = Math.min(2.0, baseScale * 1.2);
    }
    this.uiScale = baseScale;

    const padding = Math.round(10 * this.uiScale);
    const isNarrow = width < 600; // Portrait phone or small screen
    const isShort = height < 500; // Landscape phone
    const isCompact = isNarrow || isShort; // Drop labels, tighten spacing
    const barWidth = Math.round((isCompact ? 90 : 110) * this.uiScale);
    const barHeight = Math.round(14 * this.uiScale);
    const barBorder = Math.max(1, Math.round(1.5 * this.uiScale));

    // Minimum readable font sizes (CSS pixels)
    const fontTiny = Math.max(11, Math.round(12 * this.uiScale)) + 'px';
    const fontSmall = Math.max(12, Math.round(14 * this.uiScale)) + 'px';
    const fontMed = Math.max(14, Math.round(16 * this.uiScale)) + 'px';
    const fontLarge = Math.max(18, Math.round(24 * this.uiScale)) + 'px';

    // === VISOR: semi-transparent dark strip across top ===
    // Generous row spacing for clear visual separation
    const rowGap = isShort ? Math.round(19 * this.uiScale) : Math.round(22 * this.uiScale);
    const row1Y = padding;
    // Extra gap after piste name for clear visual separation from bars
    const nameGap = isShort ? Math.round(24 * this.uiScale) : Math.round(28 * this.uiScale);
    const row2Y = row1Y + nameGap;
    const row3Y = row2Y + rowGap;
    const row4Y = row3Y + Math.round((isShort ? 21 : 24) * this.uiScale);
    const visorHeight = row4Y + Math.round((isShort ? 26 : 26) * this.uiScale);

    this.add.rectangle(0, 0, width, visorHeight, 0x000000)
      .setOrigin(0).setScrollFactor(0).setAlpha(0.55);
    // Thin bottom edge accent
    this.add.rectangle(0, visorHeight - 1, width, 1, THEME.colors.infoHex)
      .setOrigin(0).setScrollFactor(0).setAlpha(0.4);

    // On compact screens, drop labels and start bars at padding
    const barStartX = isCompact ? padding : padding + Math.round(44 * this.uiScale);

    // Level name
    this.add.text(padding, row1Y, t(this.level.nameKey) || 'Level', {
      fontFamily: THEME.fonts.family,
      fontSize: fontSmall,
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setScrollFactor(0);

    // Fuel bar
    if (!isCompact) {
      this.add.text(padding, row2Y, 'FUEL', {
        fontFamily: THEME.fonts.family,
        fontSize: fontTiny,
        fontStyle: 'bold',
        color: '#EEEEEE',
      }).setScrollFactor(0);
    } else {
      // Compact: tiny colored dot as bar identifier
      const dotR = Math.round(3 * this.uiScale);
      this.add.circle(padding + dotR, row2Y + Math.round(7 * this.uiScale), dotR, THEME.colors.dangerHex).setScrollFactor(0);
    }
    const fuelBarY = row2Y + Math.round(7 * this.uiScale);
    this.add.rectangle(barStartX - barBorder, fuelBarY, barWidth + barBorder * 2, barHeight + barBorder * 2, 0x555555).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBarBg = this.add.rectangle(barStartX, fuelBarY, barWidth, barHeight, 0x222222).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBar = this.add.rectangle(barStartX, fuelBarY, barWidth, barHeight, THEME.colors.dangerHex).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelText = this.add.text(barStartX + barWidth + Math.round(6 * this.uiScale), row2Y, '100%', {
      fontFamily: THEME.fonts.family,
      fontSize: fontTiny,
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setScrollFactor(0);

    // Stamina bar
    if (!isCompact) {
      this.add.text(padding, row3Y, 'STAM', {
        fontFamily: THEME.fonts.family,
        fontSize: fontTiny,
        fontStyle: 'bold',
        color: '#EEEEEE',
      }).setScrollFactor(0);
    } else {
      const dotR = Math.round(3 * this.uiScale);
      this.add.circle(padding + dotR, row3Y + Math.round(7 * this.uiScale), dotR, THEME.colors.successHex).setScrollFactor(0);
    }
    const stamBarY = row3Y + Math.round(7 * this.uiScale);
    this.add.rectangle(barStartX - barBorder, stamBarY, barWidth + barBorder * 2, barHeight + barBorder * 2, 0x555555).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBarBg = this.add.rectangle(barStartX, stamBarY, barWidth, barHeight, 0x222222).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBar = this.add.rectangle(barStartX, stamBarY, barWidth, barHeight, THEME.colors.successHex).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaText = this.add.text(barStartX + barWidth + Math.round(6 * this.uiScale), row3Y, '100%', {
      fontFamily: THEME.fonts.family,
      fontSize: fontTiny,
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setScrollFactor(0);

    // Coverage — white for contrast, smaller on compact screens
    this.coverageText = this.add.text(padding, row4Y, (t('coverage') || 'Coverage') + ': 0%', {
      fontFamily: THEME.fonts.family,
      fontSize: isCompact ? fontSmall : fontMed,
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setScrollFactor(0);

    // === TOP-RIGHT: Timer + target ===
    this.timerText = this.add.text(width - padding, row1Y, '00:00', {
      fontFamily: THEME.fonts.family,
      fontSize: fontLarge,
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(1, 0).setScrollFactor(0);

    // On compact screens, stack target below timer at row3Y to avoid overlap
    const targetY = isCompact ? row3Y : row1Y + Math.round(26 * this.uiScale);
    this.targetText = this.add.text(width - padding, targetY,
      (t('target') || 'Target') + ': ' + this.level.targetCoverage + '%', {
      fontFamily: THEME.fonts.family,
      fontSize: fontSmall,
      fontStyle: 'bold',
      color: THEME.colors.accent,
    }).setOrigin(1, 0).setScrollFactor(0);

    // Touch detection for button sizing
    const phaserTouch = this.sys.game.device.input.touch;
    const browserTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasTouch = phaserTouch || browserTouch;
    // isMobile already defined at top of create()
    
    // Skip level button — inside visor
    // On narrow mobile, use abbreviated ">>" to save space
    // On very narrow (<=360px), position skip on left to avoid crowding pause/fullscreen
    const skipFontSize = (hasTouch && isMobile) ? Math.max(14, Math.round(12 * this.uiScale)) + 'px' : fontTiny;
    const isVeryNarrow = width <= 360;
    const skipLabel = isNarrow ? '>>' : (hasTouch && isMobile) ? '>> Skip' : '>> Skip [N]';
    let nextButtonY = row4Y;
    
    const skipOriginX = (isVeryNarrow && hasTouch) ? 0 : 1;
    const skipX = (isVeryNarrow && hasTouch)
      ? padding + (this.coverageText?.width ?? 0) + Math.round(8 * this.uiScale)
      : width - padding;
    const skipBtn = this.add.text(skipX, nextButtonY, skipLabel, {
      fontFamily: THEME.fonts.family,
      fontSize: skipFontSize,
      color: THEME.colors.textMuted,
    }).setOrigin(skipOriginX, 0).setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => skipBtn.setStyle({ color: THEME.colors.textPrimary }))
      .on('pointerout', () => skipBtn.setStyle({ color: THEME.colors.textMuted }))
      .on('pointerdown', () => this.skipLevel());
    
    nextButtonY = visorHeight + Math.round(4 * this.uiScale);

    this.input.keyboard?.on('keydown-N', () => this.skipLevel());
    
    // Show keyboard hint on desktop (even with touchscreen), touch hint on mobile

    // Winch status indicator (hidden by default, shown when winch is active)
    if (this.level.hasWinch) {
      this.winchStatus = this.add.text(padding, row4Y + Math.round(20 * this.uiScale), '', {
        fontFamily: THEME.fonts.family,
        fontSize: fontSmall,
        fontStyle: 'bold',
        color: '#00FF00',
      }).setScrollFactor(0).setVisible(false);
    }

    this.barWidth = barWidth;
    this.gameScene?.events.on('timerUpdate', this.updateTimer, this);
    this.lastResizeWidth = width;
    this.lastResizeHeight = height;
    this.scale.on('resize', this.handleResize, this);

    // Create touch controls - show on mobile, or on first touch for PC with touchscreen
    if (isMobile && hasTouch) {
      this.createTouchControls();
    } else if (hasTouch) {
      // PC with touchscreen: create controls but hidden, show on first touch
      this.createTouchControls(true);
    }

    // Touch-specific buttons (created AFTER touch controls so they render on top)
    const isFullscreen = !!document.fullscreenElement;
    
    // Larger font for touch buttons on mobile (minimum 24px for easy tapping)
    const touchBtnSize = isMobile ? Math.max(24, Math.round(20 * this.uiScale)) + 'px' : fontMed;
    
    // Pause/Menu button (touch devices)
    const touchBtnPad = Math.round(6 * this.uiScale);
    if (hasTouch) {
      const pauseBtn = this.add.text(width - padding, nextButtonY, '||', {
        fontFamily: THEME.fonts.family,
        fontSize: touchBtnSize,
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
      const pbBg = this.add.rectangle(
        pauseBtn.x - pauseBtn.width / 2, pauseBtn.y + pauseBtn.height / 2,
        pauseBtn.width + touchBtnPad * 2, pauseBtn.height + touchBtnPad,
        0x000000
      ).setScrollFactor(0).setDepth(100).setAlpha(0.55);
      pbBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openPauseMenu());
      pauseBtn.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openPauseMenu());
      nextButtonY += pauseBtn.height + touchBtnPad + Math.round(5 * this.uiScale);
    }

    // Fullscreen button (touch devices or when in fullscreen)
    if ((hasTouch || isFullscreen) && document.fullscreenEnabled) {
      const fsLabel = isFullscreen ? 'X' : '[]';
      const fsBtn = this.add.text(width - padding, nextButtonY, fsLabel, {
        fontFamily: THEME.fonts.family,
        fontSize: touchBtnSize,
        fontStyle: 'bold',
        color: isFullscreen ? '#FF6666' : '#FFFFFF',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
      const fsBg = this.add.rectangle(
        fsBtn.x - fsBtn.width / 2, fsBtn.y + fsBtn.height / 2,
        fsBtn.width + touchBtnPad * 2, fsBtn.height + touchBtnPad,
        0x000000
      ).setScrollFactor(0).setDepth(100).setAlpha(0.55);
      fsBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toggleFullscreen());
      fsBtn.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toggleFullscreen());
    }
  }

  private createTouchControls(startHidden = false): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Scale touch controls for high-DPI screens
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    
    // Base size: larger on mobile
    const baseSize = isMobile ? Math.max(60, 50 * Math.max(1, this.uiScale)) : 50 * this.uiScale;
    const btnSize = Math.round(baseSize);
    const padding = Math.round(25 * this.uiScale);
    const alpha = 0.7;

    // Create container for all touch controls
    this.touchControlsContainer = this.add.container(0, 0);
    this.touchControlsContainer.setScrollFactor(0);
    
    if (startHidden) {
      this.touchControlsContainer.setVisible(false);
      this.input.once('pointerdown', () => {
        if (this.touchControlsContainer) {
          this.touchControlsContainer.setVisible(true);
        }
      });
    }

    // Virtual joystick (bottom-left)
    // On narrow screens, cap joystick radius so it doesn't overlap action buttons
    const isNarrowTouch = width < 600;
    const actionBtnSpace = isNarrowTouch ? (btnSize * 2.4 + padding * 1.5) : 0;
    const maxJoystickRadius = isNarrowTouch
      ? Math.floor((width - actionBtnSpace - padding * 2 - 10) / 2) // 10px gap
      : Infinity;
    const joystickRadius = Math.min(Math.round(btnSize * 1.8), maxJoystickRadius);
    const thumbRadius = Math.round(btnSize * 0.6);
    const joystickX = Math.round(padding + joystickRadius);
    const joystickY = Math.round(height - padding - joystickRadius);
    
    // Calculate top edge of touch controls (joystick top + margin)
    // This is used by DialogueScene to position dialogues above touch controls
    const joystickTopEdge = joystickY - joystickRadius;
    const margin = 15; // Extra margin between dialogue and controls
    this.touchControlsTopEdge = joystickTopEdge - margin;

    // Joystick base (outer circle) — beveled retro style
    this.joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0x222222, alpha * 0.7)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(3, Math.round(3 * this.uiScale)), 0x555555, alpha);
    
    // Direction indicators on base
    const indicatorDist = Math.round(joystickRadius * 0.7);
    const indicators = [
      { x: 0, y: -indicatorDist, label: '▲' },
      { x: 0, y: indicatorDist, label: '▼' },
      { x: -indicatorDist, y: 0, label: '◀' },
      { x: indicatorDist, y: 0, label: '▶' },
    ];
    indicators.forEach(ind => {
      this.add.text(joystickX + ind.x, joystickY + ind.y, ind.label, {
        fontSize: Math.round(btnSize * 0.35) + 'px',
        color: THEME.colors.textMuted,
      }).setOrigin(0.5).setScrollFactor(0).setAlpha(0.6);
    });

    // Joystick thumb (inner circle that moves) — beveled
    this.joystickThumb = this.add.circle(joystickX, joystickY, thumbRadius, 0x555555, alpha)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(2, Math.round(2 * this.uiScale)), 0x888888, alpha);

    // Add to container
    this.touchControlsContainer.add([this.joystickBase, this.joystickThumb]);

    // Create interactive zone for joystick (larger than visual)
    const joystickZone = this.add.circle(joystickX, joystickY, joystickRadius * 1.2, 0x000000, 0)
      .setScrollFactor(0)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.joystickPointer = pointer;
        this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
      })
      .on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.joystickPointer === pointer) {
          this.updateJoystick(pointer, joystickX, joystickY, joystickRadius, thumbRadius);
        }
      })
      .on('pointerup', () => this.resetJoystick(joystickX, joystickY))
      .on('pointerout', () => this.resetJoystick(joystickX, joystickY))
      .on('pointercancel', () => this.resetJoystick(joystickX, joystickY));
    
    this.touchControlsContainer.add(joystickZone);

    // Action buttons (bottom-right)
    const actionX = Math.round(width - padding - btnSize);
    const actionY = Math.round(height - padding - btnSize);

    // Groom button (SPACE equivalent)
    this.createTouchButton(Math.round(actionX - btnSize - padding / 2), actionY, Math.round(btnSize * 1.2), 'GRM', alpha,
      () => { this.touchGroom = true; },
      () => { this.touchGroom = false; },
      0x2266aa
    );

    // Winch button (SHIFT equivalent) - only if level has winch
    if (this.level.hasWinch) {
      this.createTouchButton(actionX, Math.round(actionY - btnSize - padding / 2), Math.round(btnSize * 1.2), 'WCH', alpha,
        () => { this.touchWinch = true; },
        () => { this.touchWinch = false; },
        0xaa6622
      );
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer, centerX: number, centerY: number, maxRadius: number, thumbRadius: number): void {
    if (!this.joystickThumb) return;

    // Calculate offset from center
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp thumb position to joystick radius
    const clampedDist = Math.min(distance, maxRadius - thumbRadius);
    const angle = Math.atan2(dy, dx);
    
    const thumbX = centerX + Math.cos(angle) * clampedDist;
    const thumbY = centerY + Math.sin(angle) * clampedDist;
    
    this.joystickThumb.setPosition(thumbX, thumbY);
    
    // Update visual feedback - highlight thumb when active
    this.joystickThumb.setFillStyle(0x88aaff, 0.9);
    
    // Determine direction based on angle and distance
    // Dead zone: 20% of radius
    const deadZone = maxRadius * 0.2;
    
    // Reset all directions
    this.touchUp = false;
    this.touchDown = false;
    this.touchLeft = false;
    this.touchRight = false;
    
    if (distance > deadZone) {
      // Convert angle to 8-direction
      // Angle: 0 = right, PI/2 = down, PI = left, -PI/2 = up
      const deg = angle * 180 / Math.PI;
      
      // 8 directions with 45° sectors
      if (deg > -22.5 && deg <= 22.5) {
        this.touchRight = true;
      } else if (deg > 22.5 && deg <= 67.5) {
        this.touchRight = true;
        this.touchDown = true;
      } else if (deg > 67.5 && deg <= 112.5) {
        this.touchDown = true;
      } else if (deg > 112.5 && deg <= 157.5) {
        this.touchLeft = true;
        this.touchDown = true;
      } else if (deg > 157.5 || deg <= -157.5) {
        this.touchLeft = true;
      } else if (deg > -157.5 && deg <= -112.5) {
        this.touchLeft = true;
        this.touchUp = true;
      } else if (deg > -112.5 && deg <= -67.5) {
        this.touchUp = true;
      } else if (deg > -67.5 && deg <= -22.5) {
        this.touchRight = true;
        this.touchUp = true;
      }
    }
  }

  private resetJoystick(centerX: number, centerY: number): void {
    this.joystickPointer = null;
    
    if (this.joystickThumb) {
      this.joystickThumb.setPosition(centerX, centerY);
      this.joystickThumb.setFillStyle(0x666666, 0.7);
    }
    
    // Reset all directions
    this.touchUp = false;
    this.touchDown = false;
    this.touchLeft = false;
    this.touchRight = false;
  }

  private createTouchButton(
    x: number, y: number, size: number, label: string, alpha: number,
    onDown: () => void, onUp: () => void, color = 0x333333
  ): void {
    // Lighter color for pressed state
    const pressedColor = Phaser.Display.Color.ValueToColor(color).lighten(40).color;
    
    const bg = this.add.circle(x, y, size / 2, color, alpha)
      .setScrollFactor(0)
      .setStrokeStyle(Math.max(2, Math.round(2 * this.uiScale)), Phaser.Display.Color.ValueToColor(color).lighten(30).color, alpha)
      .setInteractive()
      .on('pointerdown', () => {
        bg.setFillStyle(pressedColor, alpha + 0.2);
        bg.setScale(1.1);
        onDown();
      })
      .on('pointerup', () => {
        bg.setFillStyle(color, alpha);
        bg.setScale(1);
        onUp();
      })
      .on('pointerout', () => {
        bg.setFillStyle(color, alpha);
        bg.setScale(1);
        onUp();
      })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) {
          bg.setFillStyle(pressedColor, alpha + 0.2);
          bg.setScale(1.1);
          onDown();
        }
      })
      .on('pointercancel', () => {
        bg.setFillStyle(color, alpha);
        bg.setScale(1);
        onUp();
      });

    // Draw pixel art icon instead of text label
    const icon = this.drawButtonIcon(x, y, size, label);

    // Add to container if it exists
    if (this.touchControlsContainer) {
      const items: Phaser.GameObjects.GameObject[] = [bg];
      if (icon) items.push(icon);
      this.touchControlsContainer.add(items);
    }
  }

  /** Draw a pixel art icon for touch buttons using Phaser Graphics */
  private drawButtonIcon(x: number, y: number, size: number, label: string): Phaser.GameObjects.Graphics | null {
    const g = this.add.graphics().setScrollFactor(0).setAlpha(0.9);
    const px = Math.max(2, Math.round(size * 0.06)); // pixel size
    const cx = x;
    const cy = y;

    if (label === 'GRM') {
      // Tiller/grooming icon: a rake-like pattern (3 teeth + handle)
      const color = 0xddddff;
      g.fillStyle(color);
      // Handle (vertical bar)
      g.fillRect(cx - px * 0.5, cy - px * 3, px, px * 6);
      // Crossbar
      g.fillRect(cx - px * 3, cy + px * 2, px * 6, px);
      // Teeth (3 prongs hanging down)
      for (const offset of [-2, 0, 2]) {
        g.fillRect(cx + offset * px - px * 0.5, cy + px * 3, px, px * 2);
      }
    } else if (label === 'WCH') {
      // Winch/anchor icon: simplified anchor shape
      const color = 0xffddaa;
      g.fillStyle(color);
      // Vertical shaft
      g.fillRect(cx - px * 0.5, cy - px * 3, px, px * 5);
      // Top crossbar (anchor ring)
      g.fillRect(cx - px * 2, cy - px * 3, px * 4, px);
      // Bottom curved arms (simplified as angled lines)
      // Left arm
      g.fillRect(cx - px * 3, cy + px * 1, px, px);
      g.fillRect(cx - px * 2, cy + px * 2, px, px);
      // Right arm
      g.fillRect(cx + px * 2, cy + px * 1, px, px);
      g.fillRect(cx + px * 1, cy + px * 2, px, px);
      // Bottom point
      g.fillRect(cx - px * 0.5, cy + px * 2, px, px * 2);
    } else {
      return null;
    }

    return g;
  }

  private openPauseMenu(): void {
    // Launch pause scene (same as pressing ESC in GameScene)
    if (this.gameScene && !this.scene.isActive('PauseScene')) {
      this.scene.launch('PauseScene', { 
        returnScene: 'GameScene',
        levelIndex: this.level.id 
      });
      this.scene.bringToTop('PauseScene');
    }
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      });
    }
    // Restart HUD to update button appearance after fullscreen change
    this.time.delayedCall(200, () => {
      if (this.scene.isActive()) {
        this.scene.restart({ level: this.level, gameScene: this.gameScene });
      }
    });
  }

  private skipLevel(): void {
    const nextLevel = this.level.id + 1;

    if (this.isSkipping) return;
    this.isSkipping = true;

    if (nextLevel < LEVELS.length) {
      if (this.gameScene && typeof this.gameScene.transitionToLevel === 'function') {
        this.gameScene.transitionToLevel(nextLevel);
      } else {
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.game.scene.stop('GameScene');
        this.game.scene.start('GameScene', { level: nextLevel });
      }
    } else {
      this.scene.stop('HUDScene');
      this.scene.stop('DialogueScene');
      this.scene.get('GameScene')?.scene.stop();
      this.game.scene.start('CreditsScene');
    }
  }

  update(): void {
    if (!this.gameScene || !this.scene.isActive()) return;
    if (!this.fuelBar || !this.fuelText) return;

    const fuelPercent = this.gameScene.fuel / 100;
    const staminaPercent = this.gameScene.stamina / 100;

    this.fuelBar.width = this.barWidth * fuelPercent;
    if (this.staminaBar) this.staminaBar.width = this.barWidth * staminaPercent;

    this.fuelText.setText(Math.round(this.gameScene.fuel) + '%');
    this.staminaText?.setText(Math.round(this.gameScene.stamina) + '%');

    this.fuelBar.setFillStyle(fuelPercent > 0.3 ? THEME.colors.dangerHex : 0xff0000);
    this.staminaBar?.setFillStyle(staminaPercent > 0.3 ? THEME.colors.successHex : 0xffaa00);

    const coverage = this.gameScene.getCoverage();
    if (this.coverageText) {
      this.coverageText.setText((t('coverage') || 'Coverage') + ': ' + coverage + '%');
      if (coverage >= this.level.targetCoverage) {
        this.coverageText.setColor('#00FF00');
      }
    }

    // Show/hide winch status indicator
    if (this.winchStatus) {
      if (this.gameScene.winchActive) {
        this.winchStatus.setText('🔗 ' + (t('winchActive') || 'WINCH'));
        this.winchStatus.setVisible(true);
      } else {
        this.winchStatus.setVisible(false);
      }
    }

    // Safety: reset touch states if no active pointers (prevents stuck controls)
    const activePointers = this.input.manager.pointers.filter(p => p.isDown);
    if (activePointers.length === 0) {
      this.touchUp = false;
      this.touchDown = false;
      this.touchLeft = false;
      this.touchRight = false;
      this.touchGroom = false;
      this.touchWinch = false;
    }
  }

  private updateTimer(seconds: number): void {
    if (!this.timerText) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'));

    if (seconds <= 60) {
      this.timerText.setStyle({ color: '#FF4444' });
    }
  }

  private resizing = false;
  private lastResizeWidth = 0;
  private lastResizeHeight = 0;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  private handleResize(): void {
    if (!this.cameras?.main) return;
    const { width, height } = this.cameras.main;
    // Ignore tiny resize changes (mobile URL bar, soft keyboard)
    if (Math.abs(width - this.lastResizeWidth) < 10 && Math.abs(height - this.lastResizeHeight) < 10) {
      return;
    }
    // Debounce: wait for resize events to settle
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      if (this.scene.isActive()) {
        this.lastResizeWidth = width;
        this.lastResizeHeight = height;
        this.scene.restart({ level: this.level, gameScene: this.gameScene });
      }
    }, 300);
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    if (this.resizeTimer) { clearTimeout(this.resizeTimer); this.resizeTimer = null; }
    this.input.keyboard?.removeAllListeners();
    this.tweens.killAll();
    this.children.removeAll(true);

    if (this.gameScene) {
      this.gameScene.events.off('timerUpdate', this.updateTimer, this);
    }

    this.gameScene = null;
    this.fuelBar = null;
    this.fuelText = null;
    this.staminaBar = null;
    this.staminaText = null;
    this.coverageText = null;
    this.winchStatus = null;
    this.timerText = null;
  }
}
