/**
 * Procedural level generator for Resort Contracts mode.
 * Produces a valid Level object from a seed and difficulty rank.
 */

import type { Level, SteepZone, WinchAnchor, AccessPath, BonusObjective, WildlifeSpawn, PisteShape, WeatherType, SpecialFeature, ObstacleType } from '../config/levels';
import { computeTimeLimit } from '../config/levels';
import type { AnimalType } from '../utils/animalSprites';
import { SeededRNG } from '../utils/seededRNG';

export type ContractRank = 'green' | 'blue' | 'red' | 'black';

interface RankConfig {
  widthRange: [number, number];
  heightRange: [number, number];
  pisteWidthRange: [number, number];
  shapes: PisteShape[];
  steepZoneCount: number;
  slopeRange: [number, number];
  hasWinch: boolean;
  hasAvalanche: boolean;
  weatherPool: WeatherType[];
  nightChance: number;
  parkChance: number;
  coverageRange: [number, number];
  obstacleDensity: number;
  slalomChance: number;
  slalomCount: [number, number];
  slalomWidth: number;
}

const RANK_CONFIGS: Record<ContractRank, RankConfig> = {
  green: {
    widthRange: [28, 38],
    heightRange: [35, 50],
    pisteWidthRange: [0.6, 0.75],
    shapes: ['straight', 'gentle_curve'],
    steepZoneCount: 0,
    slopeRange: [0, 0],
    hasWinch: false,
    hasAvalanche: false,
    weatherPool: ['clear'],
    nightChance: 0,
    parkChance: 0.3,
    coverageRange: [75, 80],
    obstacleDensity: 0.15,
    slalomChance: 0,
    slalomCount: [0, 0],
    slalomWidth: 5,
  },
  blue: {
    widthRange: [30, 42],
    heightRange: [40, 55],
    pisteWidthRange: [0.5, 0.65],
    shapes: ['gentle_curve', 'winding'],
    steepZoneCount: 1,
    slopeRange: [25, 30],
    hasWinch: false,
    hasAvalanche: false,
    weatherPool: ['clear'],
    nightChance: 0,
    parkChance: 0.25,
    coverageRange: [80, 85],
    obstacleDensity: 0.25,
    slalomChance: 0.3,
    slalomCount: [5, 7],
    slalomWidth: 5,
  },
  red: {
    widthRange: [32, 48],
    heightRange: [45, 60],
    pisteWidthRange: [0.4, 0.55],
    shapes: ['winding', 'serpentine'],
    steepZoneCount: 2,
    slopeRange: [30, 40],
    hasWinch: true,
    hasAvalanche: false,
    weatherPool: ['clear', 'clear', 'light_snow'],
    nightChance: 0,
    parkChance: 0.2,
    coverageRange: [78, 84],
    obstacleDensity: 0.4,
    slalomChance: 0.5,
    slalomCount: [8, 10],
    slalomWidth: 4,
  },
  black: {
    widthRange: [35, 55],
    heightRange: [50, 70],
    pisteWidthRange: [0.3, 0.45],
    shapes: ['winding', 'serpentine'],
    steepZoneCount: 3,
    slopeRange: [35, 50],
    hasWinch: true,
    hasAvalanche: true,
    weatherPool: ['clear', 'light_snow', 'storm'],
    nightChance: 0.35,
    parkChance: 0.15,
    coverageRange: [70, 80],
    obstacleDensity: 0.55,
    slalomChance: 0.7,
    slalomCount: [10, 12],
    slalomWidth: 3,
  },
};

const WILDLIFE_POOL: AnimalType[] = ['bunny', 'marmot', 'chamois', 'bird', 'fox'];

/** Contract level IDs start at 100 to avoid collision with campaign levels. */
const CONTRACT_LEVEL_ID_BASE = 100;

/** Pick a briefing speaker and dialogue key based on level characteristics. */
function pickContractBriefing(rng: SeededRNG, level: Level): { speaker: string; dialogue: string } {
  // Thierry warns about hazards (steep, avalanche, storm)
  if (level.steepZones.length >= 2 || level.hazards?.includes('avalanche'))
    return { speaker: 'Thierry', dialogue: 'contractBriefingThierry' };
  // Marie for cold/night conditions
  if (level.isNight || level.weather === 'storm')
    return { speaker: 'Marie', dialogue: 'contractBriefingMarie' };
  // Émilie teases on easier runs
  if (level.difficulty === 'green' || level.difficulty === 'blue' || level.difficulty === 'park')
    return { speaker: 'Émilie', dialogue: 'contractBriefingEmilie' };
  // Jean-Pierre dispatches by default
  return { speaker: 'Jean-Pierre', dialogue: 'contractBriefingJP' };
}

export function generateContractLevel(seed: number, rank: ContractRank): Level {
  const rng = new SeededRNG(seed);
  const cfg = RANK_CONFIGS[rank];
  const isPark = rng.chance(cfg.parkChance);

  if (isPark) {
    return generateParkLevel(rng, cfg, rank);
  }
  return generateRegularLevel(rng, cfg, rank);
}

function generateRegularLevel(rng: SeededRNG, cfg: RankConfig, rank: ContractRank): Level {
  const width = rng.integerInRange(cfg.widthRange[0], cfg.widthRange[1]);
  const height = rng.integerInRange(cfg.heightRange[0], cfg.heightRange[1]);
  const pisteWidth = rng.realInRange(cfg.pisteWidthRange[0], cfg.pisteWidthRange[1]);
  const pisteShape = rng.pick(cfg.shapes);
  const weather = rng.pick(cfg.weatherPool);
  const isNight = rng.chance(cfg.nightChance);
  const targetCoverage = rng.integerInRange(cfg.coverageRange[0], cfg.coverageRange[1]);

  const steepZones = generateSteepZones(rng, cfg);
  const winchAnchors = cfg.hasWinch ? generateWinchAnchors(rng, steepZones) : [];
  const accessPaths = (rank === 'red' || rank === 'black') ? generateAccessPaths(rng, steepZones) : [];
  const obstacles = generateObstacleTypes(rng, rank);
  const wildlife = generateWildlife(rng);
  const bonusObjectives = generateBonusObjectives(rng, rank, cfg.hasWinch);

  const hasDangerousBoundaries = rank === 'black' && rng.chance(0.5);

  const slalomGates = rng.chance(cfg.slalomChance)
    ? { count: rng.integerInRange(cfg.slalomCount[0], cfg.slalomCount[1]), width: cfg.slalomWidth }
    : undefined;

  const difficulty = rank === 'green' ? 'green' : rank === 'blue' ? 'blue' : rank === 'red' ? 'red' : 'black' as const;

  const level: Level = {
    id: CONTRACT_LEVEL_ID_BASE + (rng.seed % 1000),
    nameKey: 'contract_levelName',
    taskKey: 'contract_levelTask',
    difficulty,
    timeLimit: 0, // computed below
    targetCoverage,
    width,
    height,
    hasWinch: cfg.hasWinch,
    isNight,
    weather,
    obstacles,
    pisteShape,
    pisteWidth,
    steepZones,
    winchAnchors,
    accessPaths,
    bonusObjectives,
    wildlife,
    hasDangerousBoundaries,
    slalomGates,
    hazards: cfg.hasAvalanche ? ['avalanche'] : [],
  };
  level.timeLimit = computeTimeLimit(level);
  const briefing = pickContractBriefing(rng, level);
  level.introDialogue = briefing.dialogue;
  level.introSpeaker = briefing.speaker;
  return level;
}

function generateParkLevel(rng: SeededRNG, cfg: RankConfig, rank: ContractRank): Level {
  const width = rng.integerInRange(25, 40);
  const height = rng.integerInRange(45, 60);
  const pisteWidth = rng.realInRange(0.5, 0.8);
  const pisteShape: PisteShape = rng.pick(['straight', 'wide']);
  const isHalfpipe = rng.chance(0.5);
  const specialFeatures: SpecialFeature[] = isHalfpipe ? ['halfpipe'] : ['kickers', 'rails'];
  const targetCoverage = Math.min(95, rng.integerInRange(90, 96));
  const wildlife = generateWildlife(rng);

  const bonusObjectives: BonusObjective[] = [
    { type: 'precision_grooming', target: rng.integerInRange(65, 75) },
  ];
  if (isHalfpipe) {
    bonusObjectives.push({ type: 'pipe_mastery', target: rng.integerInRange(75, 85) });
  }

  const level: Level = {
    id: CONTRACT_LEVEL_ID_BASE + (rng.seed % 1000),
    nameKey: 'contract_levelName',
    taskKey: 'contract_levelTask',
    difficulty: 'park',
    timeLimit: 0,
    targetCoverage,
    width,
    height,
    hasWinch: false,
    isNight: false,
    weather: 'clear',
    obstacles: [],
    specialFeatures,
    pisteShape,
    pisteWidth,
    steepZones: [],
    winchAnchors: [],
    bonusObjectives,
    wildlife,
  };
  level.timeLimit = computeTimeLimit(level);
  const briefing = pickContractBriefing(rng, level);
  level.introDialogue = briefing.dialogue;
  level.introSpeaker = briefing.speaker;
  return level;
}

function generateSteepZones(rng: SeededRNG, cfg: RankConfig): SteepZone[] {
  const zones: SteepZone[] = [];
  if (cfg.steepZoneCount === 0) return zones;

  const sectionHeight = 0.7 / cfg.steepZoneCount; // distribute across 15%-85% of height
  for (let i = 0; i < cfg.steepZoneCount; i++) {
    const baseY = 0.15 + i * sectionHeight;
    const startY = baseY + rng.realInRange(0, sectionHeight * 0.3);
    const zoneHeight = rng.realInRange(0.08, 0.18);
    const endY = Math.min(startY + zoneHeight, 0.85);
    const slope = rng.integerInRange(cfg.slopeRange[0], cfg.slopeRange[1]);
    zones.push({ startY, endY, slope });
  }
  return zones;
}

function generateWinchAnchors(rng: SeededRNG, steepZones: SteepZone[]): WinchAnchor[] {
  if (steepZones.length === 0) {
    // Place 1-2 anchors at random positions
    const count = rng.integerInRange(1, 2);
    return Array.from({ length: count }, () => ({
      y: rng.realInRange(0.2, 0.7),
    }));
  }
  // One anchor above each steep zone
  return steepZones.map(zone => ({
    y: Math.max(0.05, zone.startY - 0.05),
  }));
}

function generateAccessPaths(rng: SeededRNG, steepZones: SteepZone[]): AccessPath[] {
  const count = rng.integerInRange(1, 2);
  const paths: AccessPath[] = [];
  for (let i = 0; i < count; i++) {
    const startY = rng.realInRange(0.15, 0.5);
    const length = rng.realInRange(0.15, 0.35);
    const endY = Math.min(startY + length, 0.85);
    const side = (i % 2 === 0) ? 'left' as const : 'right' as const;

    // Avoid overlapping steep zones
    const overlaps = steepZones.some(z => startY < z.endY && endY > z.startY);
    if (!overlaps) {
      paths.push({ startY, endY, side });
    }
  }
  return paths;
}

function generateObstacleTypes(rng: SeededRNG, rank: ContractRank): ObstacleType[] {
  const types: ObstacleType[] = ['trees'];
  if (rank !== 'green') types.push('rocks');
  if (rank === 'black' && rng.chance(0.4)) types.push('pylons');
  return types;
}

function generateWildlife(rng: SeededRNG): WildlifeSpawn[] {
  const speciesCount = rng.integerInRange(2, 4);
  const available = rng.shuffle(WILDLIFE_POOL);
  return available.slice(0, speciesCount).map(type => ({
    type,
    count: rng.integerInRange(1, 3),
  }));
}

function generateBonusObjectives(rng: SeededRNG, rank: ContractRank, hasWinch: boolean): BonusObjective[] {
  const objectives: BonusObjective[] = [];

  if (rng.chance(0.5)) {
    objectives.push({ type: 'fuel_efficiency', target: rng.integerInRange(45, 65) });
  }
  if (rng.chance(0.3)) {
    objectives.push({ type: 'flawless', target: 0 });
  }
  if (rng.chance(0.4)) {
    objectives.push({ type: 'speed_run', target: rng.integerInRange(120, 240) });
  }
  if (hasWinch && rng.chance(0.5)) {
    objectives.push({ type: 'winch_mastery', target: rng.integerInRange(2, 5) });
  }
  if (rank !== 'green' && rng.chance(0.3)) {
    objectives.push({ type: 'precision_grooming', target: rng.integerInRange(60, 75) });
  }

  return objectives.slice(0, 3); // max 3 bonus objectives
}

// --- Validation ---

import { LevelGeometry } from './LevelGeometry';
import { GAME_CONFIG } from '../config/gameConfig';

const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a valid contract level, retrying with incremented seeds
 * if validation fails. Returns the level and the seed that worked.
 */
export function generateValidContractLevel(seed: number, rank: ContractRank): { level: Level; usedSeed: number } {
  let bestLevel: Level | null = null;
  let bestSeed = seed;
  let fewestIssues = Infinity;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const trySeed = (seed + attempt) >>> 0;
    const level = generateContractLevel(trySeed, rank);
    const issues = validateLevel(level);
    if (issues.length === 0) {
      return { level, usedSeed: trySeed };
    }
    if (issues.length < fewestIssues) {
      fewestIssues = issues.length;
      bestLevel = level;
      bestSeed = trySeed;
    }
  }
  // Return the attempt with fewest validation issues (always set after ≥1 loop iteration)
  return { level: bestLevel ?? generateContractLevel(seed, rank), usedSeed: bestSeed };
}

/** Returns an array of issue descriptions (empty = valid). */
export function validateLevel(level: Level): string[] {
  const issues: string[] = [];
  const tileSize = GAME_CONFIG.TILE_SIZE;

  // Generate geometry to validate spatial constraints
  const geometry = new LevelGeometry();
  geometry.generate(level, tileSize);

  // 1. Minimum piste width — groomer must fit
  const minWidthTiles = 4;
  for (let y = 0; y < level.height; y++) {
    const path = geometry.pistePath[y];
    if (path && path.width < minWidthTiles) {
      issues.push(`Piste too narrow at row ${y}: ${path.width} tiles (min ${minWidthTiles})`);
      break;
    }
  }

  // 2. Halfpipe width — needs room for walls + floor
  if (level.specialFeatures?.includes('halfpipe')) {
    const minHalfpipeWidth = 9; // 3 wall tiles each side + 3 floor minimum
    for (let y = 0; y < level.height; y++) {
      const path = geometry.pistePath[y];
      if (path && path.width < minHalfpipeWidth) {
        issues.push(`Halfpipe too narrow at row ${y}: ${path.width} tiles (min ${minHalfpipeWidth})`);
        break;
      }
    }
  }

  // 3. Reachability — enough tiles can be groomed
  const groomableTiles = countGroomableTiles(geometry, level);
  const totalPisteTiles = level.width * level.height; // approximation
  const neededTiles = Math.floor(totalPisteTiles * (level.targetCoverage / 100));
  if (groomableTiles < neededTiles * 0.9) {
    issues.push(`Insufficient groomable area: ${groomableTiles} < ${neededTiles} needed`);
  }

  // 4. Winch feasibility — steep tiles reachable from anchors
  if (level.hasWinch && level.steepZones.length > 0 && level.winchAnchors.length === 0) {
    issues.push('Winch enabled but no anchors placed');
  }

  // 5. Start safety — spawn point (top-center) must be on piste
  const spawnY = 0;
  if (!geometry.isInPiste(Math.floor(level.width / 2), spawnY, level)) {
    issues.push('Spawn point is not on piste');
  }

  return issues;
}

function countGroomableTiles(geometry: LevelGeometry, level: Level): number {
  let count = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (geometry.isInPiste(x, y, level)) {
        count++;
      }
    }
  }
  return count;
}
