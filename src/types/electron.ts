/**
 * Type definitions and utilities for desktop integration (Electron & Tauri).
 * Centralizes all desktop API type information and helper functions.
 * Call sites use the same exports regardless of which runtime is active.
 */

export type DisplayMode = 'windowed' | 'fullscreen' | 'borderless';

export interface ElectronAPI {
  isDesktop: boolean;
  quit: () => void;
  toggleFullscreen: () => void;
  isFullscreen: () => boolean;
  setDisplayMode: (mode: DisplayMode) => void;
  setBackgroundAudio: (enabled: boolean) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

/** Check if running in Tauri desktop environment */
function isTauriApp(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

function tauriInvoke(cmd: string, args?: Record<string, unknown>): void {
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke(cmd, args))
    .catch(err => console.error(`[tauri] ${cmd} failed:`, err));
}

/** Check if running in any desktop environment (Electron or Tauri) */
export function isDesktopApp(): boolean {
  return !!(window.electronAPI?.isDesktop) || isTauriApp();
}

/** Quit the desktop application */
export function quitDesktopApp(): void {
  if (window.electronAPI?.isDesktop) {
    window.electronAPI.quit();
  } else if (isTauriApp()) {
    tauriInvoke('quit');
  }
}

/** Set display mode */
export function setDisplayMode(mode: DisplayMode): void {
  if (window.electronAPI?.isDesktop) {
    window.electronAPI.setDisplayMode(mode);
  } else if (isTauriApp()) {
    tauriInvoke('set_display_mode', { mode });
  }
}

/** Enable or disable background audio */
export function setBackgroundAudio(enabled: boolean): void {
  if (window.electronAPI?.isDesktop) {
    window.electronAPI.setBackgroundAudio(enabled);
  }
  // Tauri uses native webview — no background throttling needed
}
