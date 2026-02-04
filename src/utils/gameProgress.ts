/**
 * Game progress persistence
 * Stores current level progress in localStorage
 */

const PROGRESS_KEY = 'snowGroomer_progress';

interface GameProgress {
  currentLevel: number;
  savedAt: string;
}

export function getSavedProgress(): GameProgress | null {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
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
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function clearProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

export function hasSavedProgress(): boolean {
  return getSavedProgress() !== null;
}
