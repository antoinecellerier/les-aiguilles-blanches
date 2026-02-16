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
import { resetSettleFrames } from './renderThrottle';
import { clearContractSession } from '../systems/ContractSession';

/** Registry of scene constructors, populated once at boot by main.ts. */
// Stored on window to survive Vite HMR module instance splits in dev mode
const _global = globalThis as Record<string, unknown>;
function getEntries(): Array<{ key: string; ctor: typeof Phaser.Scene }> {
  return (_global.__gameSceneEntries as Array<{ key: string; ctor: typeof Phaser.Scene }>) || [];
}

/**
 * Register the game scene constructors. Call once from main.ts at startup.
 * This avoids circular imports between scenes and this utility.
 */
export function registerGameScenes(
  entries: Array<{ key: string; ctor: typeof Phaser.Scene }>,
): void {
  _global.__gameSceneEntries = entries;
}

/** Guard against double-fire (e.g. rapid button clicks queuing two transitions). */
function isTransitionPending(): boolean { return !!_global.__transitionPending; }
function setTransitionPending(v: boolean): void { _global.__transitionPending = v; }

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
  if (isTransitionPending()) return;
  setTransitionPending(true);

  // Defer ALL scene teardown to next event loop tick.
  // This prevents destroying scenes while their update() is still on the call stack
  // (e.g. HUDScene.update → skipLevel → emit SKIP_LEVEL → transitionToLevel → stop).
  setTimeout(() => {
    const entries = getEntries();
    // Stop then remove all game scenes.
    // Stopping first ensures shutdown() runs, which cleans up game.events listeners.
    // Phaser's remove() only calls destroy() — it does NOT call shutdown().
    for (const { key } of entries) {
      try {
        const scene = game.scene.getScene(key);
        if (scene) {
          if (game.scene.isActive(key) || game.scene.isSleeping(key) || game.scene.isPaused(key)) {
            game.scene.stop(key);
          }
          game.scene.remove(key);
        }
      } catch (e) {
        console.warn(`[resetGameScenes] cleanup error for ${key}:`, e);
      }
    }

    // Re-add fresh instances (not started)
    for (const { key, ctor } of entries) {
      try {
        // Guard: if removal failed silently, force-remove before re-adding
        if (game.scene.getScene(key)) {
          game.scene.remove(key);
        }
        game.scene.add(key, ctor, false);
      } catch (e) {
        console.warn(`[resetGameScenes] re-add error for ${key}:`, e);
      }
    }

    // Clear contract session when leaving gameplay for a menu
    if (target === 'MenuScene' || target === 'ContractsScene') {
      clearContractSession();
    }

    // Start target
    resetSettleFrames();
    game.scene.start(target, data);

    // Delay guard reset until the target scene's first update() frame completes.
    // game.scene.start() runs init()+create() synchronously, but update() hasn't
    // run yet. captureGamepadButtons() in create() may miss held buttons if the
    // gamepad input plugin hasn't refreshed for the new scene. Waiting for the
    // first update event ensures edge detection processes held-button state
    // before we allow new transitions.
    const targetScene = game.scene.getScene(target);
    if (targetScene) {
      targetScene.events.once('update', () => { setTransitionPending(false); });
    } else {
      setTransitionPending(false);
    }
  }, 100);
}
