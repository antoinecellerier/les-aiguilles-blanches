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

  // Use setTimeout — the calling scene is already stopped, so scene.time is unavailable.
  // The 100ms delay lets the current render frame complete before tearing down scenes.
  setTimeout(() => {
    transitionPending = false;

    // Remove all game scenes (order doesn't matter for removal)
    for (const { key } of gameSceneEntries) {
      try {
        if (game.scene.getScene(key)) {
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
  }, 100);
}
