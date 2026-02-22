/**
 * Procedural level generator for Daily Runs mode.
 * Produces a valid Level object from a seed and difficulty rank.
 */

import type { Level, SteepZone, WinchAnchor, AccessPath, BonusObjective, WildlifeSpawn, PisteShape, WeatherType, SpecialFeature, ObstacleType } from '../config/levels';
import { computeTimeLimit } from '../config/levels';
import type { AnimalType } from '../utils/animalSprites';
import { SeededRNG } from '../utils/seededRNG';

export type DailyRunRank = 'green' | 'blue' | 'red' | 'black';

export const RANKS: DailyRunRank[] = ['green', 'blue', 'red', 'black'];

/** Derive a rank-specific seed from a base seed. */
export function rankSeed(baseSeed: number, rank: DailyRunRank): number {
  const rankIdx = RANKS.indexOf(rank);
  return ((baseSeed * 31) + rankIdx * 7919) >>> 0;
}

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

const RANK_CONFIGS: Record<DailyRunRank, RankConfig> = {
  green: {
    widthRange: [28, 38],
    heightRange: [35, 50],
    pisteWidthRange: [0.6, 0.75],
    shapes: ['gentle_curve', 'funnel'],
    steepZoneCount: 0,
    slopeRange: [0, 0],
    hasWinch: false,
    hasAvalanche: false,
    weatherPool: ['clear'],
    nightChance: 0,
    parkChance: 0.8,
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
    shapes: ['gentle_curve', 'winding', 'dogleg'],
    steepZoneCount: 1,
    slopeRange: [25, 30],
    hasWinch: false,
    hasAvalanche: false,
    weatherPool: ['clear'],
    nightChance: 0,
    parkChance: 0,
    coverageRange: [80, 85],
    obstacleDensity: 0.25,
    slalomChance: 0.3,
    slalomCount: [4, 6],
    slalomWidth: 6,
  },
  red: {
    widthRange: [32, 48],
    heightRange: [45, 60],
    pisteWidthRange: [0.4, 0.55],
    shapes: ['winding', 'serpentine', 'hourglass', 'dogleg', 'funnel'],
    steepZoneCount: 2,
    slopeRange: [30, 40],
    hasWinch: true,
    hasAvalanche: false,
    weatherPool: ['clear', 'clear', 'light_snow'],
    nightChance: 0,
    parkChance: 0,
    coverageRange: [78, 84],
    obstacleDensity: 0.4,
    slalomChance: 0.5,
    slalomCount: [5, 7],
    slalomWidth: 5,
  },
  black: {
    widthRange: [35, 55],
    heightRange: [50, 70],
    pisteWidthRange: [0.3, 0.45],
    shapes: ['winding', 'serpentine', 'dogleg', 'hourglass'],
    steepZoneCount: 3,
    slopeRange: [35, 50],
    hasWinch: true,
    hasAvalanche: true,
    weatherPool: ['clear', 'light_snow', 'storm'],
    nightChance: 0.35,
    parkChance: 0,
    coverageRange: [70, 80],
    obstacleDensity: 0.55,
    slalomChance: 0.7,
    slalomCount: [6, 8],
    slalomWidth: 5,
  },
};

const WILDLIFE_POOL: AnimalType[] = ['bunny', 'marmot', 'chamois', 'bird', 'fox'];

/** Daily run level IDs start at 100 to avoid collision with campaign levels. */
const DAILY_RUN_LEVEL_ID_BASE = 100;

// Procedural piste name pools — authentic Savoie/Alpine French
// Each noun carries its gender for article/adjective agreement
type NounGender = 'M' | 'F' | 'MP' | 'FP';
interface PisteNoun { article: string; noun: string; gender: NounGender; }
interface PisteAdj { M: string; F: string; MP: string; FP: string; }
// Preposed adjectives (go before the noun): grand, petit, beau, vieux…
// MV = masculine before vowel/h (beau→bel, vieux→vieil)
interface PreAdj { M: string; F: string; MP: string; FP: string; MV?: string; }

// Rank-themed noun pools (gentle → extreme)
const NOUNS_GREEN: PisteNoun[] = [
  { article: 'Le', noun: 'Pré', gender: 'M' },
  { article: 'Le', noun: 'Chalet', gender: 'M' },
  { article: 'Le', noun: 'Bois', gender: 'M' },
  { article: 'Le', noun: 'Praz', gender: 'M' },
  { article: 'Le', noun: 'Sentier', gender: 'M' },
  { article: "L'", noun: 'Alpage', gender: 'M' },
  { article: 'La', noun: 'Clairière', gender: 'F' },
  { article: 'La', noun: 'Forêt', gender: 'F' },
  { article: 'La', noun: 'Chapelle', gender: 'F' },
  { article: 'La', noun: 'Prairie', gender: 'F' },
  { article: 'Les', noun: 'Sapins', gender: 'MP' },
];
const NOUNS_BLUE: PisteNoun[] = [
  { article: 'Le', noun: 'Lac', gender: 'M' },
  { article: 'Le', noun: 'Torrent', gender: 'M' },
  { article: 'Le', noun: 'Balcon', gender: 'M' },
  { article: 'Le', noun: 'Refuge', gender: 'M' },
  { article: 'Le', noun: 'Plateau', gender: 'M' },
  { article: 'Le', noun: 'Nant', gender: 'M' },
  { article: 'La', noun: 'Cascade', gender: 'F' },
  { article: 'La', noun: 'Combe', gender: 'F' },
  { article: 'La', noun: 'Vallée', gender: 'F' },
  { article: 'La', noun: 'Traversée', gender: 'F' },
  { article: 'Les', noun: 'Crêtes', gender: 'FP' },
];
const NOUNS_RED: PisteNoun[] = [
  { article: 'Le', noun: 'Col', gender: 'M' },
  { article: 'Le', noun: 'Glacier', gender: 'M' },
  { article: 'Le', noun: 'Passage', gender: 'M' },
  { article: 'Le', noun: 'Rocher', gender: 'M' },
  { article: 'Le', noun: 'Mur', gender: 'M' },
  { article: 'La', noun: 'Crête', gender: 'F' },
  { article: 'La', noun: 'Corniche', gender: 'F' },
  { article: 'La', noun: 'Face', gender: 'F' },
  { article: 'La', noun: 'Balme', gender: 'F' },
  { article: "L'", noun: 'Arête', gender: 'F' },
  { article: 'Les', noun: 'Rochers', gender: 'MP' },
];
const NOUNS_BLACK: PisteNoun[] = [
  { article: 'Le', noun: 'Ravin', gender: 'M' },
  { article: 'Le', noun: 'Couloir', gender: 'M' },
  { article: 'Le', noun: 'Précipice', gender: 'M' },
  { article: 'Le', noun: 'Gouffre', gender: 'M' },
  { article: 'Le', noun: 'Chaos', gender: 'M' },
  { article: "L'", noun: 'Aiguille', gender: 'F' },
  { article: "L'", noun: 'Enfer', gender: 'M' },
  { article: 'La', noun: 'Brèche', gender: 'F' },
  { article: 'La', noun: 'Crevasse', gender: 'F' },
  { article: 'La', noun: 'Faille', gender: 'F' },
];
const RANK_NOUNS: Record<DailyRunRank, PisteNoun[]> = {
  green: NOUNS_GREEN, blue: NOUNS_BLUE, red: NOUNS_RED, black: NOUNS_BLACK,
};

// Rank-themed adjective pools
const ADJS_GREEN: PisteAdj[] = [
  { M: 'Fleuri', F: 'Fleurie', MP: 'Fleuris', FP: 'Fleuries' },
  { M: 'Ensoleillé', F: 'Ensoleillée', MP: 'Ensoleillés', FP: 'Ensoleillées' },
  { M: 'Tranquille', F: 'Tranquille', MP: 'Tranquilles', FP: 'Tranquilles' },
  { M: 'Doux', F: 'Douce', MP: 'Doux', FP: 'Douces' },
  { M: 'Paisible', F: 'Paisible', MP: 'Paisibles', FP: 'Paisibles' },
  { M: 'Boisé', F: 'Boisée', MP: 'Boisés', FP: 'Boisées' },
];
const ADJS_BLUE: PisteAdj[] = [
  { M: 'Blanc', F: 'Blanche', MP: 'Blancs', FP: 'Blanches' },
  { M: 'Enneigé', F: 'Enneigée', MP: 'Enneigés', FP: 'Enneigées' },
  { M: 'Caché', F: 'Cachée', MP: 'Cachés', FP: 'Cachées' },
  { M: 'Sauvage', F: 'Sauvage', MP: 'Sauvages', FP: 'Sauvages' },
  { M: 'Secret', F: 'Secrète', MP: 'Secrets', FP: 'Secrètes' },
  { M: 'Suspendu', F: 'Suspendue', MP: 'Suspendus', FP: 'Suspendues' },
];
const ADJS_RED: PisteAdj[] = [
  { M: 'Haut', F: 'Haute', MP: 'Hauts', FP: 'Hautes' },
  { M: 'Perdu', F: 'Perdue', MP: 'Perdus', FP: 'Perdues' },
  { M: 'Escarpé', F: 'Escarpée', MP: 'Escarpés', FP: 'Escarpées' },
  { M: 'Gelé', F: 'Gelée', MP: 'Gelés', FP: 'Gelées' },
  { M: 'Vertigineux', F: 'Vertigineuse', MP: 'Vertigineux', FP: 'Vertigineuses' },
];
const ADJS_BLACK: PisteAdj[] = [
  { M: 'Noir', F: 'Noire', MP: 'Noirs', FP: 'Noires' },
  { M: 'Maudit', F: 'Maudite', MP: 'Maudits', FP: 'Maudites' },
  { M: 'Infernal', F: 'Infernale', MP: 'Infernaux', FP: 'Infernales' },
  { M: 'Mortel', F: 'Mortelle', MP: 'Mortels', FP: 'Mortelles' },
  { M: 'Redoutable', F: 'Redoutable', MP: 'Redoutables', FP: 'Redoutables' },
];
const RANK_ADJS: Record<DailyRunRank, PisteAdj[]> = {
  green: ADJS_GREEN, blue: ADJS_BLUE, red: ADJS_RED, black: ADJS_BLACK,
};

// Preposed adjective pools (Article + Adj + Noun)
const PRE_GREEN: PreAdj[] = [
  { M: 'Petit', F: 'Petite', MP: 'Petits', FP: 'Petites' },
  { M: 'Joli', F: 'Jolie', MP: 'Jolis', FP: 'Jolies' },
  { M: 'Beau', F: 'Belle', MP: 'Beaux', FP: 'Belles', MV: 'Bel' },
  { M: 'Vieux', F: 'Vieille', MP: 'Vieux', FP: 'Vieilles', MV: 'Vieil' },
];
const PRE_BLUE: PreAdj[] = [
  { M: 'Grand', F: 'Grande', MP: 'Grands', FP: 'Grandes' },
  { M: 'Haut', F: 'Haute', MP: 'Hauts', FP: 'Hautes' },
  { M: 'Beau', F: 'Belle', MP: 'Beaux', FP: 'Belles', MV: 'Bel' },
];
const PRE_RED: PreAdj[] = [
  { M: 'Grand', F: 'Grande', MP: 'Grands', FP: 'Grandes' },
  { M: 'Haut', F: 'Haute', MP: 'Hauts', FP: 'Hautes' },
  { M: 'Mauvais', F: 'Mauvaise', MP: 'Mauvais', FP: 'Mauvaises' },
];
const PRE_BLACK: PreAdj[] = [
  { M: 'Grand', F: 'Grande', MP: 'Grands', FP: 'Grandes' },
  { M: 'Vieux', F: 'Vieille', MP: 'Vieux', FP: 'Vieilles', MV: 'Vieil' },
];
const RANK_PRE: Record<DailyRunRank, PreAdj[]> = {
  green: PRE_GREEN, blue: PRE_BLUE, red: PRE_RED, black: PRE_BLACK,
};

// Rank-themed genitive pools
const GENS_GREEN = [
  'des Marmottes', 'du Berger', 'du Mélèze',
  'du Hameau', 'des Myrtilles', 'des Arolles',
];
const GENS_BLUE = [
  'des Chamois', 'de la Vanoise', 'du Beaufortain',
  'des Sources', 'du Nant', 'de la Moraine',
];
const GENS_RED = [
  "de l'Aigle", 'des Bouquetins', 'des Aiguilles', 'du Vent',
  'des Séracs', 'du Diable', 'de la Pointe',
];
const GENS_BLACK = [
  'du Loup', "de l'Ours", 'des Abîmes', 'du Néant',
  'des Damnés', 'de la Mort', 'du Purgatoire', 'des Ombres',
];
const RANK_GENS: Record<DailyRunRank, string[]> = {
  green: GENS_GREEN, blue: GENS_BLUE, red: GENS_RED, black: GENS_BLACK,
};

const PARK_NAMES = [
  'Le Snowpark', "L'Évasion", 'Le Tremplin',
  'La Rampe', 'Le Boardercross', 'Les Modules', 'Le Slopestyle',
];

/** Check if a genitive would be redundant with the noun (e.g. "Le Lac du Lac"). */
function isRedundant(noun: string, gen: string): boolean {
  const nLower = noun.toLowerCase();
  return gen.toLowerCase().includes(nLower);
}

/** Generate a deterministic French piste name from the RNG. */
function generatePisteName(rng: SeededRNG, isPark: boolean, rank: DailyRunRank): string {
  if (isPark) return rng.pick(PARK_NAMES);
  const n = rng.pick(RANK_NOUNS[rank]);
  const space = n.article === "L'" ? '' : ' ';
  // 40% genitive ("Le Col de l'Aigle"), 30% postposed adj ("Le Col Gelé"), 30% preposed adj ("Le Grand Col")
  const roll = rng.frac();
  if (roll < 0.4) {
    const gens = RANK_GENS[rank];
    let gen = rng.pick(gens);
    if (isRedundant(n.noun, gen)) {
      gen = gens.find(g => !isRedundant(n.noun, g)) || gen;
    }
    return `${n.article}${space}${n.noun} ${gen}`;
  }
  if (roll < 0.7) {
    const adj = rng.pick(RANK_ADJS[rank]);
    return `${n.article}${space}${n.noun} ${adj[n.gender]}`;
  }
  // Preposed: "Le Grand Col", "Le Bel Alpage", "La Belle Vallée"
  const pre = rng.pick(RANK_PRE[rank]);
  const startsVowel = /^[AEÉIOUÂÊÎÔÛ]/i.test(n.noun);
  let form: string;
  if (n.gender === 'M' && startsVowel && pre.MV) {
    form = pre.MV; // beau→bel, vieux→vieil before vowel
  } else {
    form = pre[n.gender === 'MP' ? 'MP' : n.gender === 'FP' ? 'FP' : n.gender === 'F' ? 'F' : 'M'];
  }
  // L' nouns need full article when adjective separates: L'Alpage → Le Bel Alpage
  const isFem = n.gender === 'F' || n.gender === 'FP';
  const preArticle = n.article === "L'" ? (isFem ? 'La' : 'Le') : n.article;
  return `${preArticle} ${form} ${n.noun}`;
}

/** Pick a briefing speaker and dialogue key based on level characteristics. */
function pickDailyRunBriefing(rng: SeededRNG, level: Level): { speaker: string; dialogue: string } {
  // Thierry warns about hazards (steep, avalanche, storm)
  if (level.steepZones.length >= 2 || level.hazards?.includes('avalanche'))
    return { speaker: 'Thierry', dialogue: 'dailyRunBriefingThierry' };
  // Marie for cold/night conditions
  if (level.isNight || level.weather === 'storm')
    return { speaker: 'Marie', dialogue: 'dailyRunBriefingMarie' };
  // Émilie teases on easier runs
  if (level.difficulty === 'green' || level.difficulty === 'blue' || level.difficulty === 'park')
    return { speaker: 'Émilie', dialogue: 'dailyRunBriefingEmilie' };
  // Jean-Pierre dispatches by default
  return { speaker: 'Jean-Pierre', dialogue: 'dailyRunBriefingJP' };
}

export function generateDailyRunLevel(seed: number, rank: DailyRunRank): Level {
  const rng = new SeededRNG(seed);
  const cfg = RANK_CONFIGS[rank];
  const isPark = rng.chance(cfg.parkChance);

  if (isPark) {
    return generateParkLevel(rng, cfg, rank);
  }
  return generateRegularLevel(rng, cfg, rank);
}

function generateRegularLevel(rng: SeededRNG, cfg: RankConfig, rank: DailyRunRank): Level {
  const width = rng.integerInRange(cfg.widthRange[0], cfg.widthRange[1]);
  const height = rng.integerInRange(cfg.heightRange[0], cfg.heightRange[1]);
  const pisteWidth = rng.realInRange(cfg.pisteWidthRange[0], cfg.pisteWidthRange[1]);
  const pisteShape = rng.pick(cfg.shapes);
  const pisteVariation = {
    freqOffset: rng.realInRange(-0.5, 0.5),
    ampScale: rng.realInRange(0.7, 1.3),
    phase: rng.realInRange(0, Math.PI * 2),
    widthPhase: rng.realInRange(0, Math.PI * 2),
  };
  const weather = rng.pick(cfg.weatherPool);
  const isNight = rng.chance(cfg.nightChance);
  const targetCoverage = rng.integerInRange(cfg.coverageRange[0], cfg.coverageRange[1]);

  const steepZones = generateSteepZones(rng, cfg);
  const winchAnchors = cfg.hasWinch ? generateWinchAnchors(rng, steepZones) : [];
  const accessPaths = generateAccessPaths(rng, steepZones);
  const obstacles = generateObstacleTypes(rng, rank);
  const wildlife = generateWildlife(rng);
  const bonusObjectives = generateBonusObjectives(rng, rank, cfg.hasWinch);

  const hasDangerousBoundaries = rank === 'black' && rng.chance(0.5);

  const slalomGates = rng.chance(cfg.slalomChance)
    ? { count: rng.integerInRange(cfg.slalomCount[0], cfg.slalomCount[1]), width: cfg.slalomWidth }
    : undefined;

  const difficulty = rank === 'green' ? 'green' : rank === 'blue' ? 'blue' : rank === 'red' ? 'red' : 'black' as const;

  const level: Level = {
    id: DAILY_RUN_LEVEL_ID_BASE + (rng.seed % 1000),
    nameKey: `rank_${rank}`,
    name: generatePisteName(rng, false, rank),
    taskKey: 'dailyRun_levelTask',
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
    pisteVariation,
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
  // Ensure time scales with area for variety (min 60s, +30s per 500 piste tiles)
  const pisteTiles = width * height * pisteWidth;
  const areaFloor = Math.ceil(Math.max(pisteTiles / 500 * 30, 60) / 30) * 30;
  level.timeLimit = Math.max(level.timeLimit, areaFloor);
  const briefing = pickDailyRunBriefing(rng, level);
  level.introDialogue = briefing.dialogue;
  level.introSpeaker = briefing.speaker;
  return level;
}

function generateParkLevel(rng: SeededRNG, cfg: RankConfig, rank: DailyRunRank): Level {
  const width = rng.integerInRange(25, 40);
  const height = rng.integerInRange(45, 60);
  const pisteWidth = rng.realInRange(0.5, 0.8);
  const pisteShape: PisteShape = rng.pick(['straight', 'wide', 'gentle_curve', 'funnel']);
  const pisteVariation = {
    freqOffset: rng.realInRange(-0.3, 0.3),
    ampScale: rng.realInRange(0.5, 0.8),  // gentler curves for parks
    phase: rng.realInRange(0, Math.PI * 2),
    widthPhase: rng.realInRange(0, Math.PI * 2),
  };
  // Feature combos — mix features across lanes for variety
  const featureRoll = rng.frac();
  const specialFeatures: SpecialFeature[] =
    featureRoll < 0.25 ? ['halfpipe', 'kickers'] :
    featureRoll < 0.50 ? ['kickers', 'rails'] :
    featureRoll < 0.70 ? ['halfpipe', 'kickers', 'rails'] :
    featureRoll < 0.85 ? ['kickers'] :
    ['rails', 'kickers'];
  const targetCoverage = Math.min(95, rng.integerInRange(90, 96));
  const wildlife = generateWildlife(rng);

  const bonusObjectives: BonusObjective[] = [
    { type: 'precision_grooming', target: rng.integerInRange(65, 75) },
  ];
  if (specialFeatures.includes('halfpipe')) {
    bonusObjectives.push({ type: 'pipe_mastery', target: rng.integerInRange(75, 85) });
  }

  const level: Level = {
    id: DAILY_RUN_LEVEL_ID_BASE + (rng.seed % 1000),
    nameKey: 'rank_park',
    name: generatePisteName(rng, true, rank),
    taskKey: 'dailyRun_levelTask',
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
    pisteVariation,
    steepZones: [],
    winchAnchors: [],
    bonusObjectives,
    wildlife,
  };
  level.timeLimit = computeTimeLimit(level);
  const parkTiles = width * height * pisteWidth;
  const parkFloor = Math.ceil(Math.max(parkTiles / 500 * 30, 60) / 30) * 30;
  level.timeLimit = Math.max(level.timeLimit, parkFloor);
  const briefing = pickDailyRunBriefing(rng, level);
  level.introDialogue = briefing.dialogue;
  level.introSpeaker = briefing.speaker;
  return level;
}

function generateSteepZones(rng: SeededRNG, cfg: RankConfig): SteepZone[] {
  const zones: SteepZone[] = [];
  if (cfg.steepZoneCount === 0) return zones;

  // Place zones with random spacing across 15%-85% of height
  const usable = 0.70; // 0.15 to 0.85
  const minGap = 0.08; // minimum gap between zones
  const zoneHeights: number[] = [];
  for (let i = 0; i < cfg.steepZoneCount; i++) {
    zoneHeights.push(rng.realInRange(0.08, 0.18));
  }
  const totalZoneH = zoneHeights.reduce((a, b) => a + b, 0);
  const slack = Math.max(0, usable - totalZoneH - minGap * (cfg.steepZoneCount - 1));

  // Distribute slack randomly among gaps (before first, between, after last)
  const gapCount = cfg.steepZoneCount + 1;
  const gapWeights: number[] = [];
  for (let i = 0; i < gapCount; i++) gapWeights.push(rng.realInRange(0.1, 1));
  const wSum = gapWeights.reduce((a, b) => a + b, 0);

  let y = 0.15;
  for (let i = 0; i < cfg.steepZoneCount; i++) {
    const gapBefore = (gapWeights[i] / wSum) * slack + (i > 0 ? minGap : 0);
    y += gapBefore;
    const startY = y;
    const endY = Math.min(startY + zoneHeights[i], 0.85);
    const slope = rng.integerInRange(cfg.slopeRange[0], cfg.slopeRange[1]);
    zones.push({ startY, endY, slope });
    y = endY;
  }
  return zones;
}

function generateWinchAnchors(rng: SeededRNG, steepZones: SteepZone[]): WinchAnchor[] {
  // Only dangerous zones (≥ slide threshold) need winch anchors
  const dangerous = steepZones.filter(z => z.slope >= BALANCE.SLIDE_SLOPE_THRESHOLD);
  if (dangerous.length === 0) {
    // Place 1-2 anchors at random positions
    const count = rng.integerInRange(1, 2);
    return Array.from({ length: count }, () => ({
      y: rng.realInRange(0.2, 0.7),
    }));
  }
  // One anchor above each dangerous steep zone
  return dangerous.map(zone => ({
    y: Math.max(0.05, zone.startY - 0.05),
  }));
}

function generateAccessPaths(rng: SeededRNG, steepZones: SteepZone[]): AccessPath[] {
  if (steepZones.length === 0) return [];

  // Only create bypass roads for dangerous steep zones (≥ slide threshold).
  // Safe zones below threshold are cosmetic — no road needed.
  return steepZones
    .filter(zone => zone.slope >= BALANCE.SLIDE_SLOPE_THRESHOLD)
    .map((zone, i) => {
      const margin = rng.realInRange(0.03, 0.08);
      const startY = Math.max(0.05, zone.startY - margin);
      const endY = Math.min(0.95, zone.endY + margin);
      const side = (i % 2 === 0) ? 'left' as const : 'right' as const;
      return { startY, endY, side };
    });
}

function generateObstacleTypes(rng: SeededRNG, rank: DailyRunRank): ObstacleType[] {
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

function generateBonusObjectives(rng: SeededRNG, rank: DailyRunRank, hasWinch: boolean): BonusObjective[] {
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
import { GAME_CONFIG, BALANCE } from '../config/gameConfig';

const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a valid daily run level, retrying with incremented seeds
 * if validation fails. Returns the level and the seed that worked.
 */
export function generateValidDailyRunLevel(seed: number, rank: DailyRunRank): { level: Level; usedSeed: number } {
  let bestLevel: Level | null = null;
  let bestSeed = seed;
  let fewestIssues = Infinity;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const trySeed = (seed + attempt) >>> 0;
    const level = generateDailyRunLevel(trySeed, rank);
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
  return { level: bestLevel ?? generateDailyRunLevel(seed, rank), usedSeed: bestSeed };
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

  // 3. Reachability — piste has enough area for target coverage
  const groomableTiles = countGroomableTiles(geometry, level);
  // Target coverage is a % of groomable piste tiles — check piste isn't degenerate
  const minUsableTiles = 20;
  if (groomableTiles < minUsableTiles) {
    issues.push(`Insufficient groomable area: ${groomableTiles} tiles (min ${minUsableTiles})`);
  }

  // 4. Winch feasibility — steep tiles reachable from anchors
  if (level.hasWinch && level.steepZones.length > 0 && level.winchAnchors.length === 0) {
    issues.push('Winch enabled but no anchors placed');
  }

  // 5. Start safety — spawn point must be on piste
  // Groomer spawns at 90% height, at the piste center for that row
  const spawnY = Math.min(level.height - 8, Math.floor(level.height * 0.9));
  const spawnPath = geometry.pistePath[spawnY];
  const spawnX = spawnPath ? Math.floor(spawnPath.centerX) : Math.floor(level.width / 2);
  if (!geometry.isInPiste(spawnX, spawnY, level)) {
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
