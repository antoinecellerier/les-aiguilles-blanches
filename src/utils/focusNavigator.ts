import Phaser from 'phaser';
import { playHover, playClick } from '../systems/UISounds';

/**
 * A navigable item in a focus list (button, toggle, slider, etc.).
 */
export interface FocusItem {
  element: Phaser.GameObjects.GameObject;
  activate: () => void;
  left?: () => void;
  right?: () => void;
  buttons?: Phaser.GameObjects.Text[];
  groupIndex?: number;
  /** True for elements outside the scrollable panel (e.g., back button). */
  fixed?: boolean;
  /** True if left/right callbacks produce their own audio feedback (skips default hover sound). */
  hasOwnSound?: boolean;
}

/**
 * Manages keyboard/gamepad focus navigation over a list of FocusItems.
 * Draws a focus indicator, supports wrapping navigation, and auto-scrolls
 * scrollable panels to keep the focused item visible.
 */
export class FocusNavigator {
  items: FocusItem[] = [];
  index = -1;
  private indicator: Phaser.GameObjects.Graphics | null = null;
  private scrollPanel: any = null;

  /** Create the focus indicator graphic. Call in scene.create(). */
  init(scene: Phaser.Scene): void {
    this.items = [];
    this.index = -1;
    this.indicator = scene.add.graphics();
    this.indicator.setDepth(1000);
  }

  /** Set the scrollable panel used for auto-scroll and clipping. */
  setScrollPanel(panel: any): void {
    this.scrollPanel = panel;
  }

  /** Navigate focus by direction (+1 = down, -1 = up). Wraps around. */
  navigate(dir: number): void {
    if (this.items.length === 0) return;
    const prev = this.index;
    if (this.index < 0) {
      this.index = 0;
    } else {
      this.index = (this.index + dir + this.items.length) % this.items.length;
    }
    if (this.index !== prev) playHover();
    this.updateIndicator();
    this.scrollToFocused();
  }

  left(): void {
    const item = this.items[this.index];
    if (item?.left) { if (!item.hasOwnSound) playHover(); item.left(); }
  }

  right(): void {
    const item = this.items[this.index];
    if (item?.right) { if (!item.hasOwnSound) playHover(); item.right(); }
  }

  activate(): void {
    const item = this.items[this.index];
    if (item) {
      playClick();
      item.activate();
    }
  }

  /** Redraw the focus indicator at the current item's position. */
  updateIndicator(): void {
    if (!this.indicator) return;
    this.indicator.clear();
    if (this.index < 0 || this.index >= this.items.length) return;

    const item = this.items[this.index];
    const el = item.element as Phaser.GameObjects.Components.GetBounds & Phaser.GameObjects.GameObject;
    if (!el?.getBounds) return;

    const bounds = el.getBounds();

    // Clip panel children that scrolled out of view, but not fixed elements
    if (!item.fixed && this.scrollPanel?.getBounds) {
      const panel = this.scrollPanel.getBounds();
      if (bounds.y + bounds.height < panel.y || bounds.y > panel.y + panel.height) return;
    }

    this.indicator.lineStyle(2, 0x87CEEB, 1);
    this.indicator.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
  }

  /** Auto-scroll the panel so the focused item is visible. */
  private scrollToFocused(): void {
    if (!this.scrollPanel || this.index < 0) return;
    const item = this.items[this.index];
    if (item.fixed) return;
    const el = item.element as Phaser.GameObjects.Components.GetBounds & Phaser.GameObjects.GameObject;
    if (!el?.getBounds) return;

    const bounds = el.getBounds();
    const panelBounds = this.scrollPanel.getBounds();
    if (!panelBounds) return;

    const panelTop = panelBounds.y;
    const panelBottom = panelBounds.y + panelBounds.height;

    if (bounds.y < panelTop || bounds.y + bounds.height > panelBottom) {
      // rexUI scrollablePanel uses bottomChildOY (negative) as scroll range
      const minOY = this.scrollPanel.bottomChildOY ?? this.scrollPanel.minChildOY ?? -1;
      const targetOY = this.scrollPanel.childOY - (bounds.y - panelTop - panelBounds.height / 3);
      const clampedOY = Phaser.Math.Clamp(targetOY, minOY, 0);
      this.scrollPanel.setChildOY(clampedOY);
    }
  }
}
