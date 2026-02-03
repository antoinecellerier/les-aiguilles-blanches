/**
 * Les Aiguilles Blanches - Game Configuration
 * Contains all static game data: settings, levels, food items
 */

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    TILE_SIZE: 16,
    GROOMER_SPEED: 2,
    GROOMER_WIDTH: 32,
    GROOMER_HEIGHT: 48,
    FUEL_CONSUMPTION: 0.02,
    STAMINA_CONSUMPTION: 0.01,
    GROOM_WIDTH: 24,
    COLLISION_PADDING: 5
};

// ============================================
// LEVELS DEFINITION
// ============================================
const LEVELS = [
    {
        id: 0,
        nameKey: 'tutorialName',
        taskKey: 'tutorialTask',
        difficulty: 'tutorial',
        timeLimit: 600,
        targetCoverage: 50,
        width: 20,
        height: 30,
        hasWinch: false,
        isNight: false,
        weather: 'clear',
        obstacles: [],
        isTutorial: true,
        introDialogue: 'tutorialIntro',
        tutorialSteps: [
            { trigger: 'start', dialogue: 'tutorialMove' },
            { trigger: 'moved', dialogue: 'tutorialGroom' },
            { trigger: 'groomed', dialogue: 'tutorialCoverage' },
            { trigger: 'coverage20', dialogue: 'tutorialFuel' },
            { trigger: 'complete', dialogue: 'tutorialComplete' }
        ]
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
        introDialogue: 'jeanPierreIntro'
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
        introDialogue: 'level2Intro'
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
        introDialogue: 'level3Intro'
    },
    {
        id: 4,
        nameKey: 'level4Name',
        taskKey: 'level4Task',
        difficulty: 'red',
        timeLimit: 280,
        targetCoverage: 80,
        width: 35,
        height: 80,
        hasWinch: false,
        isNight: false,
        weather: 'clear',
        obstacles: ['trees', 'rocks', 'pylons'],
        steepSections: true,
        introDialogue: 'level4Intro'
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
        specialFeatures: ['halfpipe'],
        introDialogue: 'level5Intro'
    },
    {
        id: 6,
        nameKey: 'level6Name',
        taskKey: 'level6Task',
        difficulty: 'black',
        timeLimit: 360,
        targetCoverage: 75,
        width: 30,
        height: 90,
        hasWinch: true,
        isNight: true,
        weather: 'clear',
        obstacles: ['trees', 'rocks', 'cliffs'],
        introDialogue: 'level6Intro'
    },
    {
        id: 7,
        nameKey: 'level7Name',
        taskKey: 'level7Task',
        difficulty: 'black',
        timeLimit: 300,
        targetCoverage: 70,
        width: 40,
        height: 70,
        hasWinch: true,
        isNight: false,
        weather: 'light_snow',
        obstacles: ['avalanche_zones'],
        hazards: ['avalanche'],
        introDialogue: 'thierryWarning'
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
        introDialogue: 'level8Intro'
    }
];

// ============================================
// FOOD & DRINK ITEMS
// ============================================
const FOOD_ITEMS = {
    tartiflette: { 
        stamina: 100, 
        buff: 'coldResist', 
        buffDuration: 120, 
        icon: '🥔',
        nameKey: 'foodTartiflette',
        descKey: 'foodTartifletteDesc'
    },
    croziflette: { 
        stamina: 50, 
        buff: 'speed', 
        buffDuration: 120, 
        icon: '🍝',
        nameKey: 'foodCroziflette',
        descKey: 'foodCrozifletteDesc'
    },
    fondue: { 
        stamina: 30, 
        buff: 'staminaRegen', 
        buffDuration: 180, 
        icon: '🧀',
        nameKey: 'foodFondue',
        descKey: 'foodFondueDesc'
    },
    genepi: { 
        stamina: 20, 
        buff: 'precision', 
        buffDuration: 90, 
        icon: '🥃',
        nameKey: 'foodGenepi',
        descKey: 'foodGenepiDesc'
    },
    vinChaud: { 
        stamina: 40, 
        buff: 'warmth', 
        buffDuration: 150, 
        icon: '🍷',
        nameKey: 'foodVinChaud',
        descKey: 'foodVinChaudDesc'
    },
    cafe: { 
        stamina: 25, 
        buff: null, 
        buffDuration: 0, 
        icon: '☕',
        nameKey: 'foodCafe',
        descKey: 'foodCafeDesc'
    }
};

// ============================================
// OBSTACLE TYPES
// ============================================
const OBSTACLE_TYPES = {
    tree: {
        width: 30,
        height: 40,
        solid: true,
        damage: 10
    },
    rock: {
        width: 24,
        height: 16,
        solid: true,
        damage: 15
    },
    pylon: {
        width: 16,
        height: 50,
        solid: true,
        damage: 20
    },
    restaurant: {
        width: 60,
        height: 40,
        solid: false,
        interactive: true,
        interactionType: 'food'
    },
    fuel: {
        width: 40,
        height: 30,
        solid: false,
        interactive: true,
        interactionType: 'fuel'
    }
};

// ============================================
// PISTE DIFFICULTY MARKERS
// ============================================
const DIFFICULTY_MARKERS = {
    green: { shape: 'circle', color: '#22c55e', label: '●' },
    blue: { shape: 'square', color: '#3b82f6', label: '■' },
    red: { shape: 'diamond', color: '#ef4444', label: '◆' },
    black: { shape: 'star', color: '#1f2937', label: '★' },
    park: { shape: 'triangle', color: '#f59e0b', label: '▲' }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, LEVELS, FOOD_ITEMS, OBSTACLE_TYPES, DIFFICULTY_MARKERS };
}
