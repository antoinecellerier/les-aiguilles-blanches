/**
 * Shared contract session state.
 *
 * Set once by DailyRunsScene when starting a run; read by any scene that
 * needs contract context (GameScene, SkiRunScene, LevelCompleteScene, etc.).
 * Cleared when returning to the menu.
 *
 * This eliminates the need to thread contract fields through every scene
 * transition (GameScene → PauseScene → SettingsScene → back, etc.).
 */
import type { Level } from '../config/levels';
import type { ContractRank } from './LevelGenerator';

export interface ContractSessionData {
  /** The procedurally generated level definition. */
  level: Level;
  /** Human-readable seed code (e.g. "17UK8P4"). */
  seedCode: string;
  /** Selected difficulty rank. */
  rank: ContractRank;
  /** True when this is a daily run (not a random run). */
  isDaily: boolean;
}

let active: ContractSessionData | null = null;

/** Start a contract session. Call from DailyRunsScene before launching GameScene. */
export function startContractSession(data: ContractSessionData): void {
  active = { ...data };
}

/** Get the active contract session, or null if playing campaign. */
export function getContractSession(): ContractSessionData | null {
  return active;
}

/** Clear the contract session. Called when returning to menu. */
export function clearContractSession(): void {
  active = null;
}
