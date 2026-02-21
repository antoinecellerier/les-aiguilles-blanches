/**
 * Unit tests for game progress and level unlock logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isLevelUnlocked, clearProgress, markLevelCompleted,
  getSavedProgress, saveProgress,
} from './config-wrappers/index.js';

describe('Level unlock logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('level 0 is always unlocked', () => {
    expect(isLevelUnlocked(0)).toBe(true);
  });

  it('levels beyond 0 are locked with no progress', () => {
    expect(isLevelUnlocked(1)).toBe(false);
    expect(isLevelUnlocked(5)).toBe(false);
  });

  it('completing a level unlocks the next one', () => {
    markLevelCompleted(0, 2, 60, 1);
    expect(isLevelUnlocked(1)).toBe(true);
    expect(isLevelUnlocked(2)).toBe(false);
  });

  it('clearProgress resets currentLevel to 0', () => {
    markLevelCompleted(0, 2, 60, 1);
    markLevelCompleted(1, 3, 90, 2);
    clearProgress();
    const progress = getSavedProgress();
    expect(progress.currentLevel).toBe(0);
  });

  it('clearProgress preserves levelStats', () => {
    markLevelCompleted(0, 2, 60, 1);
    markLevelCompleted(1, 3, 90, 2);
    clearProgress();
    const progress = getSavedProgress();
    expect(progress.levelStats[0].completed).toBe(true);
    expect(progress.levelStats[1].completed).toBe(true);
  });

  it('previously completed levels stay unlocked after clearProgress', () => {
    markLevelCompleted(0, 2, 60, 1);
    markLevelCompleted(1, 3, 90, 2);
    markLevelCompleted(2, 1, 120, 0);
    clearProgress();
    // currentLevel is 0, but levels 1-3 should remain accessible
    expect(isLevelUnlocked(0)).toBe(true);
    expect(isLevelUnlocked(1)).toBe(true);  // level 0 was completed
    expect(isLevelUnlocked(2)).toBe(true);  // level 1 was completed
    expect(isLevelUnlocked(3)).toBe(true);  // level 2 was completed
    expect(isLevelUnlocked(4)).toBe(false); // level 3 was never completed
  });

  it('clearProgress resets one-shot dialogue flags', () => {
    localStorage.setItem('snowGroomer_marieIntroSeen', '1');
    clearProgress();
    expect(localStorage.getItem('snowGroomer_marieIntroSeen')).toBeNull();
  });
});
