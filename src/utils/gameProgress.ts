/**
 * Game progress persistence
 * Stores current level and per-level completion stats in localStorage
 */

import { STORAGE_KEYS } from '../config/storageKeys';
import { getJSON, setJSON, removeKey } from './storage';

export interface LevelStats {
  completed: boolean;
  bestStars: number;   // 1-3
  bestTime: number;    // seconds
  bestBonusMet: number; // count of bonus objectives met
}

interface GameProgress {
  currentLevel: number;
  levelStats?: Record<number, LevelStats>;
  savedAt: string;
}

export function getSavedProgress(): GameProgress | null {
  const progress = getJSON<GameProgress | null>(STORAGE_KEYS.PROGRESS, null);
  if (!progress) return null;
  // Migrate: populate levelStats from currentLevel if missing
  if (!progress.levelStats && progress.currentLevel > 0) {
    progress.levelStats = {};
    for (let i = 0; i < progress.currentLevel; i++) {
      progress.levelStats[i] = { completed: true, bestStars: 1, bestTime: 0, bestBonusMet: 0 };
    }
    setJSON(STORAGE_KEYS.PROGRESS, progress);
  }
  return progress;
}

export function saveProgress(level: number): void {
  const existing = getSavedProgress();
  const progress: GameProgress = {
    currentLevel: level,
    levelStats: existing?.levelStats ?? {},
    savedAt: new Date().toISOString(),
  };
  setJSON(STORAGE_KEYS.PROGRESS, progress);
}

/** Record completion stats for a level, keeping best values. */
export function markLevelCompleted(level: number, stars: number, time: number, bonusMet: number): void {
  const progress = getSavedProgress() || { currentLevel: 0, levelStats: {}, savedAt: '' };
  if (!progress.levelStats) progress.levelStats = {};
  const prev = progress.levelStats[level];
  progress.levelStats[level] = {
    completed: true,
    bestStars: Math.max(stars, prev?.bestStars ?? 0),
    bestTime: prev?.bestTime ? (time > 0 ? Math.min(time, prev.bestTime) : prev.bestTime) : time,
    bestBonusMet: Math.max(bonusMet, prev?.bestBonusMet ?? 0),
  };
  // Advance currentLevel if needed
  if (level >= progress.currentLevel) {
    progress.currentLevel = level + 1;
  }
  progress.savedAt = new Date().toISOString();
  setJSON(STORAGE_KEYS.PROGRESS, progress);
}

export function isLevelCompleted(level: number): boolean {
  const progress = getSavedProgress();
  return progress?.levelStats?.[level]?.completed ?? false;
}

export function getLevelStats(level: number): LevelStats | null {
  const progress = getSavedProgress();
  return progress?.levelStats?.[level] ?? null;
}

export function isLevelUnlocked(level: number): boolean {
  if (level === 0) return true;
  const progress = getSavedProgress();
  return (progress?.currentLevel ?? 0) >= level;
}

export function clearProgress(): void {
  const existing = getSavedProgress();
  if (existing?.levelStats && Object.keys(existing.levelStats).length > 0) {
    // Preserve level stats (high scores, stars) — only reset current level
    const progress: GameProgress = {
      currentLevel: 0,
      levelStats: existing.levelStats,
      savedAt: new Date().toISOString(),
    };
    setJSON(STORAGE_KEYS.PROGRESS, progress);
  } else {
    removeKey(STORAGE_KEYS.PROGRESS);
  }
}

export function hasSavedProgress(): boolean {
  return getSavedProgress() !== null;
}
