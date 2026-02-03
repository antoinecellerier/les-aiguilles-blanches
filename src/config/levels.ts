/**
 * Les Aiguilles Blanches - Level Definitions
 * All level configurations for Phaser 3 version
 */

import type { DifficultyType } from './gameConfig';

export type WeatherType = 'clear' | 'light_snow' | 'storm';
export type PisteShape = 'straight' | 'gentle_curve' | 'winding' | 'serpentine' | 'wide';
export type ObstacleType = 'trees' | 'rocks' | 'pylons' | 'jumps' | 'rails' | 'cliffs' | 'avalanche_zones' | 'snow_drifts';
export type HazardType = 'avalanche';
export type SpecialFeature = 'kickers' | 'rails' | 'halfpipe';

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
  isTutorial?: boolean;
  tutorialSteps?: TutorialStep[];
  specialFeatures?: SpecialFeature[];
  hasDangerousBoundaries?: boolean;
  hazards?: HazardType[];
  accessPaths?: AccessPath[];
}

export const LEVELS: Level[] = [
  {
    id: 0,
    nameKey: 'tutorialName',
    taskKey: 'tutorialTask',
    difficulty: 'tutorial',
    timeLimit: 900,
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
  },
  {
    id: 1,
    nameKey: 'level1Name',
    taskKey: 'level1Task',
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
  },
  {
    id: 2,
    nameKey: 'level2Name',
    taskKey: 'level2Task',
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
    introDialogue: 'level2Intro',
  },
  {
    id: 3,
    nameKey: 'level3Name',
    taskKey: 'level3Task',
    difficulty: 'park',
    timeLimit: 300,
    targetCoverage: 90,
    width: 45,
    height: 50,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: ['jumps', 'rails'],
    specialFeatures: ['kickers', 'rails'],
    pisteShape: 'wide',
    pisteWidth: 0.7,
    steepZones: [],
    winchAnchors: [],
    introDialogue: 'level3Intro',
  },
  {
    id: 4,
    nameKey: 'level4Name',
    taskKey: 'level4Task',
    difficulty: 'red',
    timeLimit: 280,
    targetCoverage: 80,
    width: 55,
    height: 80,
    hasWinch: true,
    isNight: false,
    weather: 'clear',
    obstacles: ['trees', 'rocks', 'pylons'],
    pisteShape: 'winding',
    pisteWidth: 0.35,
    steepZones: [
      { startY: 0.2, endY: 0.35, slope: 35 },
      { startY: 0.55, endY: 0.7, slope: 40 },
    ],
    accessPaths: [
      { startY: 0.15, endY: 0.4, side: 'left' },
      { startY: 0.45, endY: 0.75, side: 'right' },
    ],
    winchAnchors: [{ y: 0.15 }, { y: 0.5 }],
    introDialogue: 'level4Intro',
  },
  {
    id: 5,
    nameKey: 'level5Name',
    taskKey: 'level5Task',
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
    introDialogue: 'level5Intro',
  },
  {
    id: 6,
    nameKey: 'level6Name',
    taskKey: 'level6Task',
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
    winchAnchors: [{ y: 0.05 }, { y: 0.3 }, { y: 0.55 }, { y: 0.8 }],
    introDialogue: 'level6Intro',
  },
  {
    id: 7,
    nameKey: 'level7Name',
    taskKey: 'level7Task',
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
    winchAnchors: [{ y: 0.1 }, { y: 0.4 }, { y: 0.7 }],
    introDialogue: 'thierryWarning',
  },
  {
    id: 8,
    nameKey: 'level8Name',
    taskKey: 'level8Task',
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
    winchAnchors: [{ y: 0.2 }, { y: 0.6 }],
    introDialogue: 'level8Intro',
  },
];
