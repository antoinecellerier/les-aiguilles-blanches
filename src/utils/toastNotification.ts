/**
 * Toast notification utility for brief feedback messages.
 */
import { THEME } from '../config/theme';
import { DEPTHS } from '../config/gameConfig';

/** Show a brief toast notification that fades in and out. */
export function showToast(scene: Phaser.Scene, message: string): void {
  const { width } = scene.cameras.main;
  const toast = scene.add.text(width / 2, 20, message, {
    fontFamily: THEME.fonts.family,
    fontSize: '14px',
    color: THEME.colors.textPrimary,
    backgroundColor: '#1a1a2ecc',
    padding: { x: 16, y: 8 },
  }).setOrigin(0.5, 0).setDepth(DEPTHS.MENU_TOAST).setAlpha(0);
  scene.tweens.add({
    targets: toast,
    alpha: { from: 0, to: 1 },
    duration: 200,
    yoyo: true,
    hold: 1500,
    onComplete: () => toast.destroy(),
  });
}
