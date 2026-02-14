import { t } from '../setup';
import { THEME } from '../config/theme';
import { isDesktopApp } from '../types/electron';

/**
 * Toggle fullscreen mode. On rejection (e.g. Firefox gamepad gesture),
 * shows a hint toast directing the user to the F keyboard shortcut.
 */
export function toggleFullscreen(scene: Phaser.Scene): void {
  if (isDesktopApp()) {
    window.electronAPI!.toggleFullscreen();
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {
      showFullscreenHint(scene);
    });
  }
}

/** Check if currently fullscreen (works in both browser and Electron). */
export function isFullscreen(): boolean {
  if (isDesktopApp()) {
    return window.electronAPI!.isFullscreen();
  }
  return !!document.fullscreenElement;
}

/** Check if fullscreen is supported (always true in Electron). */
export function fullscreenEnabled(): boolean {
  if (isDesktopApp()) return true;
  return document.fullscreenEnabled;
}

function showFullscreenHint(scene: Phaser.Scene): void {
  const { width, height } = scene.cameras.main;
  const hint = scene.add.text(
    width / 2, height * 0.42,
    '⌨️ ' + (t('fullscreenHint') || 'Press F for fullscreen'),
    {
      fontFamily: THEME.fonts.family,
      fontSize: '15px',
      color: '#FFD700',
      backgroundColor: '#1a1a1a',
      padding: { x: 14, y: 7 },
    }
  ).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);

  scene.tweens.add({
    targets: hint,
    alpha: 1,
    duration: 300,
    yoyo: true,
    hold: 2500,
    onComplete: () => hint.destroy(),
  });
}
