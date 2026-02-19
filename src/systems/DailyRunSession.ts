/**
 * Shared daily run session state.
 *
 * Set once by DailyRunsScene when starting a run; read by any scene that
 * needs daily run context (GameScene, SkiRunScene, LevelCompleteScene, etc.).
 * Cleared when returning to the menu.
 *
 * This eliminates the need to thread daily run fields through every scene
 * transition (GameScene → PauseScene → SettingsScene → back, etc.).
 */
import type { Level } from '../config/levels';
import type { DailyRunRank } from './LevelGenerator';

export interface DailyRunSessionData {
  /** The procedurally generated level definition. */
  level: Level;
  /** Human-readable seed code (e.g. "17UK8P4"). */
  seedCode: string;
  /** Base seed code before rank transformation (for sharing). */
  baseSeedCode: string;
  /** Selected difficulty rank. */
  rank: DailyRunRank;
  /** True when this is a daily run (not a random run). */
  isDaily: boolean;
}

let active: DailyRunSessionData | null = null;

/** Start a daily run session. Call from DailyRunsScene before launching GameScene. */
export function startDailyRunSession(data: DailyRunSessionData): void {
  active = { ...data };
}

/** Get the active daily run session, or null if playing campaign. */
export function getDailyRunSession(): DailyRunSessionData | null {
  return active;
}

/** Clear the daily run session. Called when returning to menu. */
export function clearDailyRunSession(): void {
  active = null;
}
