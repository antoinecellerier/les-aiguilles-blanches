/**
 * Debounced resize handler for Phaser scenes.
 * Restarts the scene after resize events settle (300ms debounce, 10px threshold).
 */
export class ResizeManager {
  private scene: Phaser.Scene;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastWidth = 0;
  private lastHeight = 0;
  private onBeforeRestart?: () => void;
  private restartData?: () => Record<string, unknown>;

  /**
   * @param scene - The Phaser scene to manage resizing for
   * @param opts.onBeforeRestart - Called before scene.restart() (e.g. save state)
   * @param opts.restartData - Returns data to pass to scene.restart()
   */
  constructor(scene: Phaser.Scene, opts?: {
    onBeforeRestart?: () => void;
    restartData?: () => Record<string, unknown>;
  }) {
    this.scene = scene;
    this.onBeforeRestart = opts?.onBeforeRestart;
    this.restartData = opts?.restartData;
  }

  /** Call once in create() after initial layout. Records current size and registers listener. */
  register(): void {
    const { width, height } = this.scene.cameras.main;
    this.lastWidth = width;
    this.lastHeight = height;
    this.scene.scale.on('resize', this.handleResize, this);
  }

  /** Call in shutdown() to clean up. */
  destroy(): void {
    this.scene.scale.off('resize', this.handleResize, this);
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  private handleResize(): void {
    if (!this.scene.cameras?.main) return;
    const { width, height } = this.scene.cameras.main;
    if (Math.abs(width - this.lastWidth) < 10 && Math.abs(height - this.lastHeight) < 10) {
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.scene.scene.isActive()) return;
      this.lastWidth = this.scene.cameras.main.width;
      this.lastHeight = this.scene.cameras.main.height;
      this.onBeforeRestart?.();
      this.scene.scene.restart(this.restartData?.());
    }, 300);
  }
}
