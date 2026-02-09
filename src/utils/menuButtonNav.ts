/**
 * Menu button navigation controller.
 *
 * Manages keyboard/mouse/touch button selection, wrapping navigation,
 * and styling across MenuScene, PauseScene, LevelCompleteScene, and CreditsScene.
 * Works alongside gamepadMenu.ts (which handles gamepad-specific input).
 */
import { THEME } from '../config/theme';
import { playClick, playHover } from '../systems/UISounds';

export interface ButtonStyler {
  /** Apply selected/deselected styles to all buttons. */
  (buttons: Phaser.GameObjects.Text[], selectedIndex: number): void;
}

export interface MenuButtonNav {
  /** Current selected index */
  readonly selectedIndex: number;
  /** Select a specific button by index (clamped to bounds) */
  select(index: number): void;
  /** Navigate by direction (-1 = prev, +1 = next), wraps around */
  navigate(direction: number): void;
  /** Call the callback for the currently selected button */
  activate(): void;
  /** Update styles (call after external changes to buttons array) */
  refreshStyles(): void;
}

/**
 * Create a menu button navigation controller.
 *
 * @param buttons   - Array of button text objects (may grow after creation)
 * @param callbacks - Parallel array of button callbacks
 * @param styler    - Custom styling function, or use a preset
 * @param opts      - Options: canNavigate guard
 */
export function createMenuButtonNav(
  buttons: Phaser.GameObjects.Text[],
  callbacks: (() => void)[],
  styler: ButtonStyler,
  opts?: { canNavigate?: () => boolean },
): MenuButtonNav {
  let selected = 0;

  const nav: MenuButtonNav = {
    get selectedIndex() { return selected; },

    select(index: number): void {
      const prev = selected;
      selected = Math.max(0, Math.min(index, buttons.length - 1));
      styler(buttons, selected);
      if (selected !== prev) playHover();
    },

    navigate(direction: number): void {
      if (buttons.length === 0) return;
      if (opts?.canNavigate && !opts.canNavigate()) return;
      const prev = selected;
      selected = (selected + direction + buttons.length) % buttons.length;
      styler(buttons, selected);
      if (selected !== prev) playHover();
    },

    activate(): void {
      if (opts?.canNavigate && !opts.canNavigate()) return;
      playClick();
      callbacks[selected]?.();
    },

    refreshStyles(): void {
      styler(buttons, selected);
    },
  };

  return nav;
}

// ── Preset stylers ──────────────────────────────────────────────────

/** CTA-aware styler: primary buttons get green, standard get blue. */
export function ctaStyler(buttonIsCTA: boolean[]): ButtonStyler {
  return (buttons, selectedIndex) => {
    buttons.forEach((btn, i) => {
      const isCTA = buttonIsCTA[i];
      const baseColor = isCTA ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
      const hoverColor = isCTA ? THEME.colors.buttonCTAHoverHex : THEME.colors.buttonHoverHex;
      if (i === selectedIndex) {
        btn.setStyle({ backgroundColor: hoverColor });
        btn.setScale(1.05);
      } else {
        btn.setStyle({ backgroundColor: baseColor });
        btn.setScale(1);
      }
    });
  };
}

/** Simple styler: all buttons same color scheme, no CTA distinction. */
export function simpleStyler(): ButtonStyler {
  return (buttons, selectedIndex) => {
    buttons.forEach((btn, i) => {
      if (i === selectedIndex) {
        btn.setStyle({ backgroundColor: THEME.colors.buttonHoverHex });
        btn.setScale(1.05);
      } else {
        btn.setStyle({ backgroundColor: THEME.colors.buttonPrimaryHex });
        btn.setScale(1);
      }
    });
  };
}
