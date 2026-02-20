/**
 * Tracks where the current gameplay session was launched from.
 *
 * Set once by LevelSelectScene before starting a level; read by PauseScene
 * and LevelCompleteScene to decide where "Quit" / "Menu" should navigate.
 * Cleared when returning to a menu scene.
 *
 * Same singleton pattern as DailyRunSession — avoids threading origin data
 * through every scene transition.
 */

const _g = globalThis as Record<string, unknown>;

/** Set the launch origin scene key (e.g. SCENE_KEYS.LEVEL_SELECT). */
export function setLaunchOrigin(sceneKey: string): void {
  _g.__launchOrigin = sceneKey;
}

/** Get the scene key to return to, or null for default (MenuScene). */
export function getLaunchOrigin(): string | null {
  return (_g.__launchOrigin as string) || null;
}

/** Clear launch origin. Called when returning to a menu. */
export function clearLaunchOrigin(): void {
  _g.__launchOrigin = null;
}
