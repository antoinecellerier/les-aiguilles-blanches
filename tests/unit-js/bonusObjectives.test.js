import { describe, it, expect, beforeAll } from 'vitest';
import './config-wrappers/index.js';

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true });
}

let formatTime;
let getBonusLabel;
let evaluateBonusObjective;
let evaluateAllBonusObjectives;

beforeAll(async () => {
  ({
    formatTime,
    getBonusLabel,
    evaluateBonusObjective,
    evaluateAllBonusObjectives,
  } = await import('../../src/utils/bonusObjectives.ts'));
});

const baseState = {
  fuelUsed: 40,
  restartCount: 0,
  timeUsed: 90,
  winchUseCount: 3,
  pathsVisited: 2,
  totalPaths: 3,
  groomQuality: 82,
};

describe('bonus objective utilities', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(125)).toBe('2:05');
  });

  it('evaluates each objective type correctly', () => {
    expect(evaluateBonusObjective({ type: 'fuel_efficiency', target: 50 }, baseState)).toBe(true);
    expect(evaluateBonusObjective({ type: 'fuel_efficiency', target: 30 }, baseState)).toBe(false);

    expect(evaluateBonusObjective({ type: 'flawless', target: 0 }, baseState)).toBe(true);
    expect(evaluateBonusObjective({ type: 'flawless', target: 0 }, { ...baseState, restartCount: 1 })).toBe(false);

    expect(evaluateBonusObjective({ type: 'speed_run', target: 100 }, baseState)).toBe(true);
    expect(evaluateBonusObjective({ type: 'speed_run', target: 60 }, baseState)).toBe(false);

    expect(evaluateBonusObjective({ type: 'winch_mastery', target: 3 }, baseState)).toBe(true);
    expect(evaluateBonusObjective({ type: 'exploration', target: 3 }, baseState)).toBe(false);

    expect(evaluateBonusObjective({ type: 'precision_grooming', target: 80 }, baseState)).toBe(true);
    expect(evaluateBonusObjective({ type: 'pipe_mastery', target: 90 }, baseState)).toBe(false);
  });

  it('returns false for unknown objective types', () => {
    expect(evaluateBonusObjective({ type: 'unknown_type', target: 1 }, baseState)).toBe(false);
  });

  it('builds readable labels with target values', () => {
    const fuelLabel = getBonusLabel({ type: 'fuel_efficiency', target: 55 });
    const speedLabel = getBonusLabel({ type: 'speed_run', target: 125 });
    const pipeLabel = getBonusLabel({ type: 'pipe_mastery', target: 80 });

    expect(fuelLabel).toContain('55');
    expect(speedLabel).toContain('2:05');
    expect(pipeLabel.length).toBeGreaterThan(0);
  });

  it('evaluates all objectives and returns labels + met state', () => {
    const objectives = [
      { type: 'fuel_efficiency', target: 50 },
      { type: 'speed_run', target: 80 },
      { type: 'precision_grooming', target: 80 },
    ];
    const results = evaluateAllBonusObjectives(objectives, baseState);

    expect(results).toHaveLength(3);
    expect(results.map(r => r.met)).toEqual([true, false, true]);
    results.forEach(r => expect(r.label.length).toBeGreaterThan(0));
  });
});
