/**
 * Les Aiguilles Blanches - Level Definitions
 * All level configurations for Phaser 3 version
 */

import type { DifficultyType } from './gameConfig';
import { GAME_CONFIG } from './gameConfig';
import type { AnimalType } from '../utils/animalSprites';

export type WeatherType = 'clear' | 'light_snow' | 'storm';
export type PisteShape = 'straight' | 'gentle_curve' | 'winding' | 'serpentine' | 'wide';
export type ObstacleType = 'trees' | 'rocks' | 'pylons' | 'jumps' | 'rails' | 'cliffs' | 'avalanche_zones' | 'snow_drifts';
export type HazardType = 'avalanche';
export type SpecialFeature = 'kickers' | 'rails' | 'halfpipe';

export interface WildlifeSpawn {
  type: AnimalType;
  count: number;
}

export interface SteepZone {
  startY: number;
  endY: number;
  slope: number;
}

export interface WinchAnchor {
  y: number;
}

export interface AccessPath {
  startY: number;
  endY: number;
  side: 'left' | 'right';
}

export interface TutorialStep {
  trigger: string;
  dialogue: string;
  delay?: number;
}

export type BonusObjectiveType = 'fuel_efficiency' | 'flawless' | 'speed_run' | 'winch_mastery' | 'exploration' | 'precision_grooming' | 'pipe_mastery';

export interface BonusObjective {
  type: BonusObjectiveType;
  target: number;
}

export interface Level {
  id: number;
  nameKey: string;
  taskKey: string;
  difficulty: DifficultyType;
  timeLimit: number;
  targetCoverage: number;
  width: number;
  height: number;
  hasWinch: boolean;
  isNight: boolean;
  weather: WeatherType;
  obstacles: ObstacleType[];
  pisteShape: PisteShape;
  pisteWidth: number;
  steepZones: SteepZone[];
  winchAnchors: WinchAnchor[];
  introDialogue?: string;
  introSpeaker?: string;
  isTutorial?: boolean;
  tutorialSteps?: TutorialStep[];
  specialFeatures?: SpecialFeature[];
  /** Slalom gates for ski reward run — number of gates and corridor width (tiles). */
  slalomGates?: { count: number; width: number };
  hasDangerousBoundaries?: boolean;
  hazards?: HazardType[];
  accessPaths?: AccessPath[];
  bonusObjectives?: BonusObjective[];
  wildlife?: WildlifeSpawn[];
  /** Override computed time limit (seconds). When set, computeTimeLimit is ignored. */
  timeLimitOverride?: number;
}

/**
 * Compute a reasonable time limit for a level based on its geometry and mechanics.
 *
 * Formula: (tilesToGroom / groomRate) * navOverhead * difficultyScale + pathTime + winchOverhead
 *
 * - groomRate: groomer speed / tile size × groom strip width / tile size ≈ 14 tiles²/s
 * - navOverhead: 1.6× for turns, overlaps, obstacle avoidance, refueling
 * - difficultyScale: how generous the time budget is (lower = harder)
 * - pathTime: 20s per access path for travel to/from anchors
 * - winchOverhead: 30s for levels with winch (attach/detach, cable management)
 *
 * Round to nearest 30s. Returns 0 for tutorial (unlimited time).
 */
export function computeTimeLimit(level: Pick<Level, 'width' | 'height' | 'targetCoverage' | 'difficulty' | 'hasWinch' | 'accessPaths' | 'isTutorial'>): number {
  if (level.isTutorial) return 0;

  const tileSize = GAME_CONFIG.TILE_SIZE;
  const groomRate = (GAME_CONFIG.GROOMER_SPEED / tileSize) * (GAME_CONFIG.GROOM_WIDTH / tileSize);
  const tilesToGroom = level.width * level.height * (level.targetCoverage / 100);

  // Navigation overhead: empirically calibrated so skilled play uses ~40-60% of time
  const navOverhead = 0.3;

  // Difficulty scales how much slack the player gets
  const scales: Record<string, number> = {
    tutorial: 0, green: 1.3, blue: 1.0, park: 1.5, red: 0.9, black: 0.75,
  };
  const scale = scales[level.difficulty] ?? 0.9;

  const baseTime = (tilesToGroom / groomRate) * navOverhead * scale;
  const pathTime = (level.accessPaths?.length ?? 0) * 10;
  const winchOverhead = level.hasWinch ? 15 : 0;
  const total = baseTime + pathTime + winchOverhead;

  // Minimum floors per difficulty
  const floors: Record<string, number> = {
    green: 60, blue: 60, park: 60, red: 60, black: 60,
  };
  const floor = floors[level.difficulty] ?? 60;

  return Math.ceil(Math.max(total, floor) / 30) * 30;
}

export const LEVELS: Level[] = [
  {
    id: 0,
    nameKey: 'tutorialName',
    taskKey: 'tutorialTask',
    difficulty: 'tutorial',
    timeLimit: 0,
    targetCoverage: 40,
    width: 15,
    height: 20,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: [],
    isTutorial: true,
    pisteShape: 'straight',
    pisteWidth: 0.7,
    steepZones: [],
    winchAnchors: [],
    introDialogue: 'tutorialIntro',
    introSpeaker: 'Jean-Pierre',
    tutorialSteps: [
      { trigger: 'start', dialogue: 'tutorialWelcome', delay: 1000 },
      { trigger: 'welcomeDone', dialogue: 'tutorialControls', delay: 3000 },
      { trigger: 'controlsDone', dialogue: 'tutorialMove', delay: 3000 },
      { trigger: 'moved', dialogue: 'tutorialGroomIntro' },
      { trigger: 'groomIntroDone', dialogue: 'tutorialGroomAction', delay: 3000 },
      { trigger: 'groomed', dialogue: 'tutorialCoverage' },
      { trigger: 'coverage20', dialogue: 'tutorialHUD' },
      { trigger: 'hudDone', dialogue: 'tutorialGoal', delay: 4000 },
      { trigger: 'coverage40', dialogue: 'tutorialComplete' },
    ],
    wildlife: [
      { type: 'bunny', count: 3 },
      { type: 'bird', count: 4 },
    ],
  },
  {
    id: 1,
    nameKey: 'level_marmottesName',
    taskKey: 'level_marmottesTask',
    difficulty: 'green',
    timeLimit: 300,
    targetCoverage: 80,
    width: 40,
    height: 60,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: ['trees'],
    pisteShape: 'straight',
    pisteWidth: 0.6,
    steepZones: [],
    winchAnchors: [],
    introDialogue: 'jeanPierreIntro',
    introSpeaker: 'Jean-Pierre',
    bonusObjectives: [
      { type: 'speed_run', target: 180 },
    ],
    wildlife: [
      { type: 'bunny', count: 3 },
      { type: 'marmot', count: 2 },
      { type: 'bird', count: 5 },
    ],
  },
  {
    id: 2,
    nameKey: 'level_chamoisName',
    taskKey: 'level_chamoisTask',
    difficulty: 'blue',
    timeLimit: 240,
    targetCoverage: 85,
    width: 50,
    height: 70,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: ['trees', 'rocks'],
    pisteShape: 'gentle_curve',
    pisteWidth: 0.5,
    steepZones: [{ startY: 0.4, endY: 0.6, slope: 25 }],
    winchAnchors: [],
    introDialogue: 'level_chamoisIntro',
    introSpeaker: 'Émilie',
    bonusObjectives: [
      { type: 'flawless', target: 0 },
      { type: 'fuel_efficiency', target: 60 },
    ],
    wildlife: [
      { type: 'bunny', count: 3 },
      { type: 'marmot', count: 3 },
      { type: 'chamois', count: 2 },
      { type: 'bird', count: 6 },
      { type: 'fox', count: 1 },
    ],
  },
  {
    id: 3,
    nameKey: 'level_airZoneName',
    taskKey: 'level_airZoneTask',
    difficulty: 'park',
    timeLimit: 300,
    targetCoverage: 80,
    width: 45,
    height: 50,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: [],
    specialFeatures: ['kickers', 'rails'],
    pisteShape: 'wide',
    pisteWidth: 0.7,
    steepZones: [],
    winchAnchors: [],
    introDialogue: 'level_airZoneIntro',
    introSpeaker: 'Émilie',
    bonusObjectives: [
      { type: 'fuel_efficiency', target: 50 },
      { type: 'precision_grooming', target: 70 },
    ],
    wildlife: [
      { type: 'bird', count: 6 },
      { type: 'bunny', count: 2 },
    ],
    timeLimitOverride: 80,
  },
  {
    id: 4,
    nameKey: 'level_aigleName',
    taskKey: 'level_aigleTask',
    difficulty: 'red',
    timeLimit: 280,
    targetCoverage: 80,
    width: 55,
    height: 80,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: ['trees', 'rocks', 'pylons'],
    pisteShape: 'winding',
    pisteWidth: 0.35,
    steepZones: [
      { startY: 0.2, endY: 0.35, slope: 25 },
      { startY: 0.55, endY: 0.7, slope: 30 },
    ],
    accessPaths: [
      { startY: 0.15, endY: 0.4, side: 'left' },
      { startY: 0.45, endY: 0.75, side: 'right' },
    ],
    winchAnchors: [],
    introDialogue: 'level_aigleIntro',
    introSpeaker: 'Jean-Pierre',
    bonusObjectives: [
      { type: 'fuel_efficiency', target: 50 },
      { type: 'exploration', target: 2 },
    ],
    slalomGates: { count: 8, width: 5 },
    wildlife: [
      { type: 'chamois', count: 3 },
      { type: 'marmot', count: 2 },
      { type: 'bunny', count: 3 },
      { type: 'bird', count: 5 },
      { type: 'fox', count: 1 },
    ],
  },
  {
    id: 5,
    nameKey: 'level_glacierName',
    taskKey: 'level_glacierTask',
    difficulty: 'red',
    timeLimit: 300,
    targetCoverage: 80,
    width: 50,
    height: 70,
    hasWinch: true,
    isNight: false,
    weather: 'clear',
    obstacles: ['trees', 'rocks'],
    pisteShape: 'gentle_curve',
    pisteWidth: 0.4,
    steepZones: [
      { startY: 0.25, endY: 0.45, slope: 40 },
      { startY: 0.6, endY: 0.75, slope: 30 },
    ],
    accessPaths: [
      { startY: 0.2, endY: 0.5, side: 'left' },
      { startY: 0.55, endY: 0.8, side: 'right' },
    ],
    winchAnchors: [{ y: 0.2 }, { y: 0.55 }],
    introDialogue: 'level_glacierIntro',
    introSpeaker: 'Thierry',
    bonusObjectives: [
      { type: 'winch_mastery', target: 3 },
      { type: 'flawless', target: 0 },
    ],
    slalomGates: { count: 10, width: 4 },
    wildlife: [
      { type: 'chamois', count: 2 },
      { type: 'marmot', count: 3 },
      { type: 'bird', count: 5 },
    ],
  },
  {
    id: 6,
    nameKey: 'level_tubeName',
    taskKey: 'level_tubeTask',
    difficulty: 'park',
    timeLimit: 360,
    targetCoverage: 95,
    width: 20,
    height: 60,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: [],
    specialFeatures: ['halfpipe'],
    pisteShape: 'straight',
    pisteWidth: 0.8,
    steepZones: [],
    winchAnchors: [],
    introDialogue: 'level_tubeIntro',
    introSpeaker: 'Émilie',
    bonusObjectives: [
      { type: 'pipe_mastery', target: 80 },
      { type: 'precision_grooming', target: 70 },
    ],
    wildlife: [
      { type: 'bird', count: 5 },
      { type: 'bunny', count: 1 },
    ],
  },
  {
    id: 7,
    nameKey: 'level_verticaleName',
    taskKey: 'level_verticaleTask',
    difficulty: 'black',
    timeLimit: 360,
    targetCoverage: 75,
    width: 50,
    height: 90,
    hasWinch: true,
    isNight: true,
    weather: 'clear',
    obstacles: ['trees', 'rocks', 'cliffs'],
    hasDangerousBoundaries: true,
    pisteShape: 'serpentine',
    pisteWidth: 0.3,
    steepZones: [
      { startY: 0.1, endY: 0.25, slope: 45 },
      { startY: 0.35, endY: 0.5, slope: 50 },
      { startY: 0.65, endY: 0.8, slope: 45 },
    ],
    accessPaths: [
      { startY: 0.0, endY: 0.35, side: 'left' },
      { startY: 0.25, endY: 0.6, side: 'right' },
      { startY: 0.5, endY: 0.85, side: 'left' },
    ],
    winchAnchors: [{ y: 0.05 }, { y: 0.3 }, { y: 0.55 }],
    introDialogue: 'level_verticaleIntro',
    introSpeaker: 'Thierry',
    bonusObjectives: [
      { type: 'exploration', target: 3 },
      { type: 'flawless', target: 0 },
    ],
    wildlife: [
      { type: 'chamois', count: 4 },
      { type: 'bouquetin', count: 2 },
      { type: 'bird', count: 6 },
      { type: 'fox', count: 1 },
    ],
  },
  {
    id: 8,
    nameKey: 'level_colDangereuxName',
    taskKey: 'level_colDangereuxTask',
    difficulty: 'black',
    timeLimit: 300,
    targetCoverage: 70,
    width: 60,
    height: 70,
    hasWinch: true,
    isNight: false,
    weather: 'light_snow',
    obstacles: ['avalanche_zones'],
    hazards: ['avalanche'],
    hasDangerousBoundaries: true,
    pisteShape: 'winding',
    pisteWidth: 0.35,
    steepZones: [
      { startY: 0.15, endY: 0.3, slope: 40 },
      { startY: 0.5, endY: 0.65, slope: 45 },
    ],
    accessPaths: [
      { startY: 0.05, endY: 0.4, side: 'left' },
      { startY: 0.35, endY: 0.75, side: 'right' },
    ],
    winchAnchors: [{ y: 0.1 }, { y: 0.4 }],
    introDialogue: 'level_colDangereuxIntro',
    introSpeaker: 'Thierry',
    bonusObjectives: [
      { type: 'flawless', target: 0 },
      { type: 'winch_mastery', target: 4 },
    ],
    wildlife: [
      { type: 'bouquetin', count: 3 },
      { type: 'chamois', count: 4 },
      { type: 'marmot', count: 2 },
      { type: 'bird', count: 7 },
    ],
  },
  {
    id: 9,
    nameKey: 'level_tempeteName',
    taskKey: 'level_tempeteTask',
    difficulty: 'red',
    timeLimit: 420,
    targetCoverage: 85,
    width: 60,
    height: 80,
    hasWinch: true,
    isNight: false,
    weather: 'storm',
    obstacles: ['trees', 'rocks', 'snow_drifts'],
    hasDangerousBoundaries: true,
    pisteShape: 'gentle_curve',
    pisteWidth: 0.5,
    steepZones: [{ startY: 0.3, endY: 0.45, slope: 35 }],
    winchAnchors: [{ y: 0.2 }],
    introDialogue: 'level_tempeteIntro',
    introSpeaker: 'Marie',
    bonusObjectives: [
      { type: 'fuel_efficiency', target: 70 },
      { type: 'speed_run', target: 300 },
    ],
    wildlife: [
      { type: 'chamois', count: 2 },
      { type: 'bunny', count: 3 },
      { type: 'bird', count: 4 },
    ],
  },
  {
    id: 10,
    nameKey: 'level_coupeDesAiguillesName',
    taskKey: 'level_coupeDesAiguillesTask',
    difficulty: 'black',
    timeLimit: 360,
    targetCoverage: 85,
    width: 65,
    height: 90,
    hasWinch: true,
    isNight: true,
    weather: 'clear',
    obstacles: ['trees', 'rocks', 'cliffs'],
    hasDangerousBoundaries: true,
    pisteShape: 'serpentine',
    pisteWidth: 0.35,
    steepZones: [
      { startY: 0.1, endY: 0.3, slope: 40 },
      { startY: 0.4, endY: 0.55, slope: 45 },
      { startY: 0.7, endY: 0.85, slope: 40 },
    ],
    accessPaths: [
      { startY: 0.05, endY: 0.35, side: 'left' },
      { startY: 0.3, endY: 0.6, side: 'right' },
      { startY: 0.55, endY: 0.9, side: 'left' },
    ],
    winchAnchors: [{ y: 0.08 }, { y: 0.35 }, { y: 0.6 }],
    introDialogue: 'level_coupeDesAiguillesIntro',
    introSpeaker: 'Jean-Pierre',
    bonusObjectives: [
      { type: 'winch_mastery', target: 5 },
      { type: 'speed_run', target: 280 },
      { type: 'flawless', target: 0 },
      { type: 'precision_grooming', target: 60 },
    ],
    slalomGates: { count: 12, width: 3 },
    wildlife: [
      { type: 'bouquetin', count: 2 },
      { type: 'chamois', count: 3 },
      { type: 'bird', count: 6 },
      { type: 'fox', count: 1 },
    ],
  },
];

// Apply computed time limits and speed_run targets to all levels
for (const level of LEVELS) {
  level.timeLimit = level.timeLimitOverride ?? computeTimeLimit(level);
  // Auto-set speed_run bonus target to 60% of time limit
  if (level.bonusObjectives) {
    for (const obj of level.bonusObjectives) {
      if (obj.type === 'speed_run') {
        obj.target = Math.round(level.timeLimit * 0.6);
      }
    }
  }
}

if (typeof console !== 'undefined') {
  console.table(LEVELS.map(l => ({
    id: l.id, name: l.nameKey.replace('level_', '').replace('Name', ''),
    difficulty: l.difficulty, size: `${l.width}×${l.height}`,
    target: `${l.targetCoverage}%`, timeLimit: `${l.timeLimit}s`,
    paths: l.accessPaths?.length ?? 0, winch: l.hasWinch,
  })));
}
