/**
 * Centralized scene transition utility.
 *
 * All scene cleanup (remove + re-add) goes through here so that:
 * - The list of game scenes is defined in ONE place
 * - setTimeout timing is consistent
 * - Stale init data is avoided (always pass explicit data)
 * - No circular imports — constructors are registered at boot via registerGameScenes()
 */
import Phaser from 'phaser';

/** Registry of scene constructors, populated once at boot by main.ts. */
let gameSceneEntries: Array<{ key: string; ctor: typeof Phaser.Scene }> = [];

/**
 * Register the game scene constructors. Call once from main.ts at startup.
 * This avoids circular imports between scenes and this utility.
 */
export function registerGameScenes(
  entries: Array<{ key: string; ctor: typeof Phaser.Scene }>,
): void {
  gameSceneEntries = entries;
}

/** Guard against double-fire (e.g. rapid button clicks queuing two transitions). */
let transitionPending = false;

/**
 * Remove all game scenes, re-add fresh instances, then start the target scene.
 *
 * Call this from any scene that needs to navigate away from a game session
 * (quit to menu, restart level, next level, etc.).
 *
 * @param game     - The Phaser.Game instance (capture with `this.game` BEFORE stopping self)
 * @param target   - Scene key to start after cleanup (e.g. 'GameScene', 'MenuScene')
 * @param data     - Data to pass to the target scene's init(). Pass {} explicitly to avoid stale data.
 */
export function resetGameScenes(
  game: Phaser.Game,
  target: string,
  data: Record<string, unknown> = {},
): void {
  if (transitionPending) return;
  transitionPending = true;

  // Defer ALL scene teardown to next event loop tick.
  // This prevents destroying scenes while their update() is still on the call stack
  // (e.g. HUDScene.update → skipLevel → emit SKIP_LEVEL → transitionToLevel → stop).
  setTimeout(() => {
    // Stop then remove all game scenes.
    // Stopping first ensures shutdown() runs, which cleans up game.events listeners.
    // Phaser's remove() only calls destroy() — it does NOT call shutdown().
    for (const { key } of gameSceneEntries) {
      try {
        const scene = game.scene.getScene(key);
        if (scene) {
          if (game.scene.isActive(key) || game.scene.isSleeping(key) || game.scene.isPaused(key)) {
            game.scene.stop(key);
          }
          game.scene.remove(key);
        }
      } catch {
        // Scene may already be removed
      }
    }

    // Re-add fresh instances (not started)
    for (const { key, ctor } of gameSceneEntries) {
      game.scene.add(key, ctor, false);
    }

    // Start target
    game.scene.start(target, data);

    // Reset guard AFTER transition completes, preventing re-entry during create()
    transitionPending = false;
  }, 100);
}
