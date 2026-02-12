/**
 * Gamepad Diagnostic Panel — live button/stick/trigger readout.
 *
 * Builds UI elements directly into a rexUI sizer so the settings panel
 * handles all positioning, scrolling and clipping automatically.
 * Updates every frame so users can verify controller button mapping.
 */

import Phaser from 'phaser';
import { THEME } from '../config/theme';
import { BALANCE } from '../config/gameConfig';
import { getButtonName, getConnectedControllerType, type ControllerType } from '../utils/gamepad';
import { t } from '../config/localization';

const ACTIVE_COLOR = 0xffd700;
const INACTIVE_COLOR = 0x3a5a7a;
const ACTIVE_TEXT = '#000000';
const INACTIVE_TEXT = THEME.colors.info;

export class GamepadDiagnosticPanel {
  private scene: Phaser.Scene;
  private buttonCells: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; index: number }[] = [];
  private triggerBars: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private stickDots: { dot: any; ring: any; cell: any; radius: number; dotSize: number }[] = [];
  private noGamepadText: Phaser.GameObjects.Text | null = null;
  private activeElements: Phaser.GameObjects.GameObject[] = [];
  private wrapperSizer: any = null;
  private parentPanel: any = null;
  private onLayout: (() => void) | null = null;
  private lastControllerType: ControllerType = 'generic';
  private wasConnected = false;

  /**
   * Build diagnostic elements directly into the given rexUI sizer (panel).
   * All game objects are added to the sizer so positioning is automatic.
   */
  build(scene: Phaser.Scene, panel: any, contentWidth: number, fontSize: number, onLayout?: () => void): void {
    this.scene = scene;
    this.parentPanel = panel;
    this.onLayout = onLayout ?? null;
    const rexUI = (scene as any).rexUI;
    const labelSize = Math.max(10, Math.round(fontSize * 0.8));
    const sectionSize = Math.max(10, Math.round(fontSize * 0.7));
    const cellSize = Math.max(18, Math.min(26, Math.floor(contentWidth / 14)));
    const gap = Math.round(cellSize * 0.25);

    // --- "No gamepad" hint ---
    this.noGamepadText = scene.add.text(0, 0,
      t('connectGamepadDiag') || 'Connect a controller to test',
      { fontFamily: THEME.fonts.family, fontSize: fontSize + 'px', color: THEME.colors.disabled }
    );
    panel.add(this.noGamepadText, { align: 'left' });

    // Wrapper sizer for all active diagnostic content — hidden/shown to collapse space
    this.wrapperSizer = rexUI.add.sizer({ orientation: 'vertical', space: { item: 2 } });

    // --- Buttons section ---
    const btnHeader = scene.add.text(0, 0,
      t('gamepadDiagButtons') || 'Buttons',
      { fontFamily: THEME.fonts.family, fontSize: sectionSize + 'px', color: THEME.colors.textSecondary, fontStyle: 'bold' }
    );
    this.wrapperSizer.add(btnHeader, { align: 'left', padding: { top: 4 } });
    this.activeElements.push(btnHeader);

    // Button grid — distribute evenly across rows
    const buttonsPerRow = Math.min(8, Math.max(4, Math.floor(contentWidth / (cellSize + gap))));
    const totalButtons = 16;
    const numRows = Math.ceil(totalButtons / buttonsPerRow);
    // Distribute evenly: e.g. 16 buttons in 2 rows = 8+8, 16 in 3 rows = 6+5+5
    const perRow: number[] = [];
    for (let r = 0; r < numRows; r++) {
      perRow.push(Math.ceil((totalButtons - perRow.reduce((a, b) => a + b, 0)) / (numRows - r)));
    }

    let btnIdx = 0;
    for (let r = 0; r < numRows; r++) {
      const rowSizer = rexUI.add.sizer({ orientation: 'horizontal', space: { item: gap } });
      for (let c = 0; c < perRow[r] && btnIdx < totalButtons; c++, btnIdx++) {
        const bg = scene.add.rectangle(0, 0, cellSize, cellSize, INACTIVE_COLOR).setStrokeStyle(1, 0x667788);
        const label = scene.add.text(0, 0, '', {
          fontFamily: THEME.fonts.family, fontSize: labelSize + 'px', color: INACTIVE_TEXT,
        }).setOrigin(0.5);

        const cell = rexUI.add.overlapSizer({ width: cellSize, height: cellSize });
        cell.add(bg, { expand: true });
        cell.add(label, { align: 'center' });

        rowSizer.add(cell);
        this.buttonCells.push({ bg, label, index: btnIdx });
        this.activeElements.push(bg, label);
      }
      this.wrapperSizer.add(rowSizer, { align: 'left' });
      this.activeElements.push(rowSizer);
    }

    // --- Sticks section ---
    const stickHeader = scene.add.text(0, 0,
      t('gamepadDiagSticks') || 'Sticks',
      { fontFamily: THEME.fonts.family, fontSize: sectionSize + 'px', color: THEME.colors.textSecondary, fontStyle: 'bold' }
    );
    this.wrapperSizer.add(stickHeader, { align: 'left', padding: { top: 4 } });
    this.activeElements.push(stickHeader);

    const stickR = Math.round(cellSize * 1.4);
    const stickD = stickR * 2;
    const dotR = Math.max(3, Math.round(stickR * 0.2));

    // Two stick rings side by side
    const stickRow = rexUI.add.sizer({ orientation: 'horizontal', space: { item: cellSize } });

    this.stickDots = [];
    for (let si = 0; si < 2; si++) {
      // Filled dark circle as background
      const bgCircle = rexUI.add.roundRectangle(0, 0, stickD, stickD, stickR, 0x1a2a3a);
      // Circular stroke ring on top (no fill)
      const ring = rexUI.add.roundRectangle(0, 0, stickD, stickD, stickR)
        .setStrokeStyle(1, 0x667788);
      const hLine = scene.add.rectangle(0, 0, stickD - 4, 1, 0x334455).setAlpha(0.4);
      const vLine = scene.add.rectangle(0, 0, 1, stickD - 4, 0x334455).setAlpha(0.4);
      const dot = rexUI.add.roundRectangle(0, 0, dotR * 2, dotR * 2, dotR, 0x88aacc);

      const stickCell = rexUI.add.overlapSizer({ width: stickD, height: stickD });
      stickCell.add(bgCircle, { align: 'center', expand: false });
      stickCell.add(ring, { align: 'center', expand: false });
      stickCell.add(hLine, { align: 'center', expand: false });
      stickCell.add(vLine, { align: 'center', expand: false });
      stickCell.add(dot, { align: 'center', expand: false });

      stickRow.add(stickCell);
      this.stickDots.push({ dot, ring, cell: stickCell, radius: stickR, dotSize: dotR * 2 });
      this.activeElements.push(bgCircle, ring, hLine, vLine, dot);
    }
    this.wrapperSizer.add(stickRow, { align: 'left' });
    this.activeElements.push(stickRow);

    // --- Triggers section — horizontal fill bars (left to right) ---
    const trigHeader = scene.add.text(0, 0,
      t('gamepadDiagTriggers') || 'Triggers',
      { fontFamily: THEME.fonts.family, fontSize: sectionSize + 'px', color: THEME.colors.textSecondary, fontStyle: 'bold' }
    );
    this.wrapperSizer.add(trigHeader, { align: 'left', padding: { top: 4 } });
    this.activeElements.push(trigHeader);

    const barWidth = Math.min(contentWidth * 0.4, 120);
    const barHeight = Math.round(cellSize * 0.7);

    for (let i = 0; i < 2; i++) {
      const trigRowSizer = rexUI.add.sizer({ orientation: 'horizontal', space: { item: gap * 2 } });
      const lbl = scene.add.text(0, 0, i === 0 ? 'LT' : 'RT', {
        fontFamily: THEME.fonts.family, fontSize: labelSize + 'px', color: INACTIVE_TEXT,
      });
      trigRowSizer.add(lbl);

      const bg = scene.add.rectangle(0, 0, barWidth, barHeight, 0x1a2a3a).setStrokeStyle(1, 0x667788);
      const fill = scene.add.rectangle(0, 0, 0, barHeight - 2, ACTIVE_COLOR).setOrigin(0, 0.5);

      const barCell = rexUI.add.overlapSizer({ width: barWidth, height: barHeight });
      barCell.add(bg, { expand: true });
      barCell.add(fill, { align: 'left-center' });

      trigRowSizer.add(barCell);
      this.wrapperSizer.add(trigRowSizer, { align: 'left', padding: { top: i === 0 ? 0 : 2 } });
      this.triggerBars.push({ bg, fill, label: lbl });
      this.activeElements.push(lbl, bg, fill, trigRowSizer);
    }

    // Add wrapper to parent panel, then hide it (collapses space)
    // Initial hide without layout callback — mainSizer doesn't exist yet
    panel.add(this.wrapperSizer, { align: 'left' });
    panel.hide(this.wrapperSizer);
  }

  private setActiveVisible(visible: boolean): void {
    if (!this.wrapperSizer || !this.parentPanel) return;
    if (visible) {
      this.parentPanel.show(this.wrapperSizer);
    } else {
      this.parentPanel.hide(this.wrapperSizer);
    }
    this.onLayout?.();
  }

  update(): void {
    let gamepads: (Gamepad | null)[];
    try {
      gamepads = Array.from(navigator.getGamepads?.() || []);
    } catch {
      gamepads = [];
    }
    const rawPad = gamepads.find(gp => gp !== null) ?? null;
    const hasGamepad = !!rawPad;

    if (hasGamepad !== this.wasConnected) {
      this.wasConnected = hasGamepad;
      // Toggle "no gamepad" hint and diagnostic content with space collapse
      if (this.noGamepadText && this.parentPanel) {
        if (hasGamepad) {
          this.parentPanel.hide(this.noGamepadText);
        } else {
          this.parentPanel.show(this.noGamepadText);
        }
      }
      this.setActiveVisible(hasGamepad);
    }

    if (!rawPad) return;

    const controllerType = getConnectedControllerType();
    if (controllerType !== this.lastControllerType) {
      this.lastControllerType = controllerType;
      this.refreshLabels(controllerType);
    }

    // Buttons
    for (const cell of this.buttonCells) {
      const pressed = rawPad.buttons[cell.index]?.pressed ?? false;
      cell.bg.setFillStyle(pressed ? ACTIVE_COLOR : INACTIVE_COLOR);
      cell.label.setColor(pressed ? ACTIVE_TEXT : INACTIVE_TEXT);
    }

    // Sticks — move dot within ring by offsetting from center
    const stickAxes = [
      [rawPad.axes[0] ?? 0, rawPad.axes[1] ?? 0],
      [rawPad.axes[2] ?? 0, rawPad.axes[3] ?? 0],
    ];
    this.stickDots.forEach((sd, i) => {
      const [ax, ay] = stickAxes[i];
      const active = Math.abs(ax) > BALANCE.GAMEPAD_DEADZONE || Math.abs(ay) > BALANCE.GAMEPAD_DEADZONE;
      // Move dot relative to the cell center using rexUI layout offset
      const offsetX = ax * (sd.radius - sd.dotSize);
      const offsetY = ay * (sd.radius - sd.dotSize);
      sd.dot.setPosition(sd.dot.x + offsetX - (sd.dot.getData('lastOx') || 0),
                         sd.dot.y + offsetY - (sd.dot.getData('lastOy') || 0));
      sd.dot.setData('lastOx', offsetX);
      sd.dot.setData('lastOy', offsetY);
      sd.dot.setFillStyle(active ? ACTIVE_COLOR : 0x88aacc);
    });

    // Triggers
    const trigVals = [
      this.getTriggerValue(rawPad, 6, 4),
      this.getTriggerValue(rawPad, 7, 5),
    ];
    this.triggerBars.forEach((bar, i) => {
      const val = trigVals[i];
      const w = bar.bg.width - 2;
      bar.fill.setSize(Math.round(w * val), bar.fill.height || (bar.bg.height - 2));
      bar.label.setColor(val > 0.1 ? ACTIVE_TEXT : INACTIVE_TEXT);
    });
  }

  private getTriggerValue(pad: Gamepad, buttonIdx: number, axisIdx: number): number {
    const btn = pad.buttons[buttonIdx];
    if (btn && btn.value > 0) return btn.value;
    // Firefox axis fallback: axis ranges -1 (released) to 1 (pressed)
    const axis = pad.axes[axisIdx];
    if (axis !== undefined && axis > -0.9) return Math.max(0, (axis + 1) / 2);
    return 0;
  }

  private refreshLabels(ct: ControllerType): void {
    for (const cell of this.buttonCells) {
      cell.label.setText(getButtonName(cell.index, ct));
    }
    if (this.triggerBars.length >= 2) {
      this.triggerBars[0].label.setText(getButtonName(6, ct));
      this.triggerBars[1].label.setText(getButtonName(7, ct));
    }
  }

  destroy(): void {
    for (const el of this.activeElements) {
      if (el && 'destroy' in el) (el as any).destroy();
    }
    if (this.noGamepadText) this.noGamepadText.destroy();
    if (this.wrapperSizer) this.wrapperSizer.destroy();
    this.buttonCells = [];
    this.triggerBars = [];
    this.stickDots = [];
    this.activeElements = [];
    this.noGamepadText = null;
    this.wrapperSizer = null;
    this.parentPanel = null;
    this.onLayout = null;
  }
}
