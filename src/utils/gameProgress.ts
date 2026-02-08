/**
 * Game progress persistence
 * Stores current level progress in localStorage
 */

import { STORAGE_KEYS } from '../config/storageKeys';
import { getJSON, setJSON } from './storage';

interface GameProgress {
  currentLevel: number;
  savedAt: string;
}

export function getSavedProgress(): GameProgress | null {
  return getJSON<GameProgress | null>(STORAGE_KEYS.PROGRESS, null);
}

export function saveProgress(level: number): void {
  const progress: GameProgress = {
    currentLevel: level,
    savedAt: new Date().toISOString(),
  };
  setJSON(STORAGE_KEYS.PROGRESS, progress);
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
}

export function hasSavedProgress(): boolean {
  return getSavedProgress() !== null;
}
