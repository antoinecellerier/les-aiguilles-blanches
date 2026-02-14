/**
 * Type definitions and utilities for Electron desktop integration.
 * Centralizes all Electron API type information and helper functions.
 */

export type DisplayMode = 'windowed' | 'fullscreen' | 'borderless';

export interface ElectronAPI {
  isDesktop: boolean;
  quit: () => void;
  toggleFullscreen: () => void;
  isFullscreen: () => boolean;
  setDisplayMode: (mode: DisplayMode) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/** Check if running in Electron desktop environment */
export function isDesktopApp(): boolean {
  return !!(window.electronAPI?.isDesktop);
}

/** Quit the desktop application (Electron only) */
export function quitDesktopApp(): void {
  if (isDesktopApp()) {
    window.electronAPI!.quit();
  }
}

/** Set display mode (Electron only) */
export function setDisplayMode(mode: DisplayMode): void {
  if (isDesktopApp()) {
    window.electronAPI!.setDisplayMode(mode);
  }
}
