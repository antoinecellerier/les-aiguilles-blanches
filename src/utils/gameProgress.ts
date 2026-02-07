/**
 * Game progress persistence
 * Stores current level progress in localStorage
 */

import { STORAGE_KEYS } from '../config/storageKeys';

interface GameProgress {
  currentLevel: number;
  savedAt: string;
}

export function getSavedProgress(): GameProgress | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!saved) return null;
    return JSON.parse(saved) as GameProgress;
  } catch {
    return null;
  }
}

export function saveProgress(level: number): void {
  const progress: GameProgress = {
    currentLevel: level,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch { /* Private browsing or quota exceeded */ }
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.PROGRESS);
}

export function hasSavedProgress(): boolean {
  return getSavedProgress() !== null;
}
