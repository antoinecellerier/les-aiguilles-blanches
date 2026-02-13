/**
 * Les Aiguilles Blanches - Accessibility Utilities
 * Screen reader support and accessibility helpers
 */

import { STORAGE_KEYS } from '../config/storageKeys';
import { getJSON, setJSON } from './storage';

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export interface AccessibilitySettings {
  highContrast: boolean;
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  uiScale: number;
}

export interface AccessibilityModule {
  announcer: HTMLDivElement | null;
  settings: AccessibilitySettings;
  init(): void;
  announce(message: string): void;
  loadSettings(): AccessibilitySettings;
  saveSettings(): void;
  applyDOMSettings(): void;
  ensureColorblindFilters(): void;
  getColorblindMatrix(mode: ColorblindMode): number[] | null;
}

export const Accessibility: AccessibilityModule = {
  // Screen reader live region
  announcer: null,

  init() {
    // Create screen reader announcer
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    `;
    document.body.appendChild(this.announcer);
  },

  announce(message: string) {
    if (this.announcer) {
      this.announcer.textContent = message;
    }
  },

  // Settings storage
  settings: {
    highContrast: false,
    colorblindMode: 'none',
    reducedMotion: false,
    uiScale: 1,
  },

  loadSettings(): AccessibilitySettings {
    const saved = getJSON<Partial<AccessibilitySettings>>(STORAGE_KEYS.ACCESSIBILITY, {});
    Object.assign(this.settings, saved);

    // Check system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.reducedMotion = true;
    }

    return this.settings;
  },

  saveSettings() {
    setJSON(STORAGE_KEYS.ACCESSIBILITY, this.settings);
  },

  /** Apply high-contrast class and colorblind CSS filter to the DOM. */
  applyDOMSettings() {
    if (this.settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    const canvas = document.querySelector('#game-container canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const filters: string[] = [];

      // High contrast: boost contrast + saturate so game world elements stand out
      if (this.settings.highContrast) {
        filters.push('contrast(1.4) saturate(1.3)');
      }

      // Colorblind: apply SVG color matrix filter
      if (this.settings.colorblindMode && this.settings.colorblindMode !== 'none') {
        this.ensureColorblindFilters();
        filters.push(`url(#${this.settings.colorblindMode}-filter)`);
      }

      canvas.style.filter = filters.join(' ');
    }
  },

  /** Inject SVG colorblind filter definitions into the DOM (idempotent). */
  ensureColorblindFilters() {
    if (document.getElementById('colorblind-filters')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'colorblind-filters';
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.innerHTML = `
      <defs>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625 0.375 0 0 0
            0.7 0.3 0 0 0
            0 0.3 0.7 0 0
            0 0 0 1 0"/>
        </filter>
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567 0.433 0 0 0
            0.558 0.442 0 0 0
            0 0.242 0.758 0 0
            0 0 0 1 0"/>
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95 0.05 0 0 0
            0 0.433 0.567 0 0
            0 0.475 0.525 0 0
            0 0 0 1 0"/>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
  },

  // Color transforms for colorblind modes
  getColorblindMatrix(mode: ColorblindMode): number[] | null {
    switch (mode) {
      case 'deuteranopia':
        return [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0];
      case 'protanopia':
        return [0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0];
      case 'tritanopia':
        return [0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0];
      default:
        return null;
    }
  },
};
