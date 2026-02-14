/**
 * Shared bonus objective evaluation and label formatting.
 * Used by HUDScene (live tracking) and LevelCompleteScene (final results).
 */
import { t, type BonusObjective } from '../setup';

/** Minimal state needed to evaluate bonus objectives */
export interface BonusEvalState {
  fuelUsed: number;
  restartCount: number;
  timeUsed: number;
  winchUseCount: number;
  pathsVisited: number;
  totalPaths: number;
  groomQuality: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds) % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

/** Human-readable label for a bonus objective */
export function getBonusLabel(obj: BonusObjective): string {
  switch (obj.type) {
    case 'fuel_efficiency': return (t('bonusFuel') || 'Fuel') + ' ≤' + obj.target + '%';
    case 'flawless': return t('bonusFlawless') || 'First try';
    case 'speed_run': return (t('bonusSpeed') || 'Time') + ' ≤' + formatTime(obj.target);
    case 'winch_mastery': return (t('bonusWinch') || 'Winch') + ' ×' + obj.target;
    case 'exploration': return (t('bonusExplore') || 'Roads') + ' ×' + obj.target;
    case 'precision_grooming': return t('bonusPrecision') || 'Precision';
    case 'pipe_mastery': return t('bonusPipeMastery') || 'Pipe mastery';
    default: return '';
  }
}

/** Evaluate whether a single bonus objective is met */
export function evaluateBonusObjective(obj: BonusObjective, state: BonusEvalState): boolean {
  switch (obj.type) {
    case 'fuel_efficiency': return state.fuelUsed <= obj.target;
    case 'flawless': return state.restartCount === 0;
    case 'speed_run': return state.timeUsed <= obj.target;
    case 'winch_mastery': return state.winchUseCount >= obj.target;
    case 'exploration': return state.pathsVisited >= obj.target;
    case 'precision_grooming': return state.groomQuality >= obj.target;
    case 'pipe_mastery': return state.groomQuality >= obj.target;
    default: return false;
  }
}

/** Evaluate all bonus objectives for a level, returning results with labels */
export function evaluateAllBonusObjectives(
  objectives: BonusObjective[],
  state: BonusEvalState
): { objective: BonusObjective; met: boolean; label: string }[] {
  return objectives.map(obj => ({
    objective: obj,
    met: evaluateBonusObjective(obj, state),
    label: getBonusLabel(obj),
  }));
}
