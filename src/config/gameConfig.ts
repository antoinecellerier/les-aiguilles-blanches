/**
 * Les Aiguilles Blanches - Game Configuration
 * Phaser 3 configuration and constants
 */

export interface GameConfigType {
  TILE_SIZE: number;
  GROOMER_WIDTH: number;
  GROOMER_HEIGHT: number;
  GROOMER_SPEED: number;
  FUEL_CONSUMPTION: number;
  STAMINA_CONSUMPTION: number;
  GROOM_WIDTH: number;
  COLORS: {
    SKY_DAY: number;
    SKY_NIGHT: number;
    SNOW_UNGROOMED: number;
    SNOW_GROOMED: number;
    SNOW_ICE: number;
    SNOW_DEEP: number;
  };
}

export const GAME_CONFIG: GameConfigType = {
  // Tile and sprite sizes
  TILE_SIZE: 16,
  GROOMER_WIDTH: 32,
  GROOMER_HEIGHT: 48,

  // Gameplay
  GROOMER_SPEED: 150,
  FUEL_CONSUMPTION: 0.02,
  STAMINA_CONSUMPTION: 0.01,
  GROOM_WIDTH: 24,

  // Colors
  COLORS: {
    SKY_DAY: 0x87ceeb,
    SKY_NIGHT: 0x0a1628,
    SNOW_UNGROOMED: 0xe8f4f8,
    SNOW_GROOMED: 0xf0f8ff,
    SNOW_ICE: 0xb8e0f0,
    SNOW_DEEP: 0xd0e0e8,
  },
};

/** Phaser depth (z-order) constants for GameScene rendering layers */
export const DEPTHS = {
  // Extended background (outside game world, fills screen edges)
  BG_FOREST_TILES: -100, // Off-piste snow beyond world bounds
  BG_FOREST_ROCKS: 1,   // Trees/rocks beyond world bounds (above off-piste TileSprite)
  TERRAIN: 0,         // Off-piste snow tiles (base layer)
  ACCESS_ROAD: 1,     // Packed snow on service roads (above off-piste, below piste)
  PISTE: 2,           // Piste snow tiles (above access roads so grooming is visible)
  CLIFFS: 3,          // Cliff rock textures (always below trees/buildings)
  PARK_FEATURES: 3.5, // Park kickers/rails (flat on snow, below Y-sorted objects)
  GROUND_OBJECTS: 4,  // Base for yDepth() Y-sorted objects (trees, chalets, anchors)
  TREES: 4,           // Alias for GROUND_OBJECTS (both use yDepth())
  GROUND_LABELS: 7,   // Anchor numbers, text on ground objects
  SIGNAGE: 8,         // Avalanche warnings, hazard markers
  MARKERS: 9,         // Piste marker poles, service road poles
  WINCH_CABLE: 50,    // Winch cable graphics
  AIRBORNE: 55,       // Flying birds, airborne objects (above cable, below overlay)
  DIALOGUE_HITZONE: 50,  // Dialogue click zone (above game, below dialogue box)
  DIALOGUE_BOX: 100,     // Dialogue container (above hit zone)
  NIGHT_OVERLAY: 100, // Night/weather darkening
  FROST_OVERLAY: 250, // Frost vignette (above player and weather)
  PLAYER: 101,        // Groomer/skier victory depth (gameplay uses yDepth for Y-sorting)
  FEEDBACK: 200,      // Floating text (+fuel, stamina, etc.)
  WEATHER: 200,       // Snow particles (same layer as feedback)
  VICTORY: 500,       // Victory text (topmost)
  // Menu/settings scene depths (separate from game world)
  MENU_SKY: 0,        // Sky background (behind everything)
  MENU_MOUNTAINS_FAR: 1, // Far mountains
  MENU_MOUNTAINS_NEAR: 2, // Near mountains
  MENU_SNOW: 3,       // Snow ground, groomed lines
  MENU_TREES: 5,      // Trees, groomer (Y-sorted: 5 + y*0.001)
  MENU_TINT_OVERLAY: 6, // Tinted overlay above terrain (fail screen, above trees, below backdrop)
  MENU_BACKDROP: 8,   // Dark semi-transparent overlay behind UI (readability)
  MENU_UI: 10,        // UI panels, buttons, text (above terrain + backdrop)
  MENU_SCROLL_FADE: 11, // Scroll fade gradients
  MENU_BADGES: 12,    // Level badges, star overlays
  MENU_OVERLAY: 13,   // Darken overlay for settings/pause modals
  MENU_DIALOG: 15,    // Dialogs, modals (above overlay)
  MENU_TOAST: 200,    // Toast notifications (topmost)
} as const;

/**
 * Compute Y-sorted depth for ground objects (trees, chalets, buildings).
 * Objects lower on screen (higher Y) render in front, creating correct
 * top-down perspective. Uses GROUND_OBJECTS as base so all Y-sorted
 * objects interleave correctly above cliffs and below signage.
 */
export function yDepth(y: number): number {
  return DEPTHS.GROUND_OBJECTS + y * 0.001;
}

/** Gameplay balance constants — centralized for easy tuning */
export const BALANCE = {
  // Stamina
  LOW_STAMINA_THRESHOLD: 30,
  STAMINA_WINCH_MULTIPLIER: 0.3,
  STAMINA_STEEP_MULTIPLIER: 3.0,
  STAMINA_GROOMING_MULTIPLIER: 1.5,
  STAMINA_REGEN_RATE: 0.1,

  // Fuel & food
  FUEL_REFILL_RATE: 0.5,
  FUEL_REFILL_RATE_BUFFED: 0.3,
  FOOD_STAMINA_REFILL_RATE: 0.3,

  // Buff UI
  BUFF_FLASH_THRESHOLD: 5,         // seconds before expiry to start flashing
  BUFF_FLASH_PERIOD: 150,          // milliseconds for flash oscillation
  BUFF_FLASH_ALPHA_MAX: 1,         // opacity when fully visible
  BUFF_FLASH_ALPHA_MIN: 0.3,       // opacity when dimmed

  // Frost
  FROST_RATE_NIGHT: 25,       // % per minute on night levels
  FROST_RATE_STORM: 35,       // % per minute on storm levels
  FROST_RATE_LIGHT_SNOW: 15,  // % per minute on light_snow levels
  FROST_SPEED_THRESHOLD_1: 50,  // frost % for first speed penalty
  FROST_SPEED_THRESHOLD_2: 75,  // frost % for second speed penalty
  FROST_SPEED_PENALTY_1: 0.9,   // speed multiplier at threshold 1
  FROST_SPEED_PENALTY_2: 0.8,   // speed multiplier at threshold 2
  FROST_MIN_LEVEL: 8,           // first level index with frost (L8 Col Dangereux, skip L7 Verticale)

  // Movement
  SPEED_BUFF_MULTIPLIER: 1.3,
  SPEED_BUFF_FUEL_MULTIPLIER: 1.4,
  PRECISION_BUFF_RADIUS_BONUS: 1,
  WARMTH_BUFF_STAMINA_MULTIPLIER: 0.5,
  SENSITIVITY_MIN: 0.25,
  SENSITIVITY_MAX: 2.0,
  SENSITIVITY_DEFAULT: 1.0,
  GAMEPAD_DEADZONE: 0.2,
  GROOMER_DRAG: 200,
  WINCH_FORCE: 0.3,
  WINCH_MIN_DISTANCE: 50,
  WINCH_MAX_CABLE: 30,  // Max cable length in tiles before snap
  WINCH_SNAP_STAMINA_COST: 20,
  WINCH_SNAP_STUN_MS: 800,

  // Slopes
  TUMBLE_SLOPE_THRESHOLD: 40,
  SLIDE_SLOPE_THRESHOLD: 30,
  STEEP_STAMINA_THRESHOLD: 30,
  SLIDE_GRAVITY_OFFSET: 25,
  SLIDE_GRAVITY_MULTIPLIER: 2,
  TUMBLE_SLIDE_SPEED: 300,
  CLIFF_FALL_DELAY: 1500,  // ms after center-of-mass crosses cliff edge before game over

  // Groomer dimensions (in sprite pixels, before scale) for cliff stability checks
  // Sprite is 36×58px, origin at center
  GROOMER_HALF_LENGTH: 29,  // Front/rear (along track axis)
  GROOMER_HALF_WIDTH: 18,   // Left/right (perpendicular to tracks)

  // Avalanche
  AVALANCHE_RISK_PER_FRAME: 0.003,
  AVALANCHE_RISK_GROOMING: 0.008,
  AVALANCHE_WARNING_1: 0.25,
  AVALANCHE_WARNING_2: 0.6,
  SKI_AVALANCHE_RISK_MULTIPLIER: 5, // Skiers accumulate risk faster (passing through quickly)

  // Camera
  CAMERA_LERP: 0.1,
  CAMERA_MIN_OFFSET_Y: 50,  // Min vertical padding around world in screen pixels
  MIN_TILE_SIZE: 14,         // Floor for tile pixel size — keeps tiles readable on all screens
  TOUCH_CONTROLS_WIDE_ASPECT_THRESHOLD: 1.2,  // Aspect ratio above which touch controls don't overlap play area
  SHAKE_WARNING_1: { duration: 200, intensity: 0.005 },
  SHAKE_WARNING_2: { duration: 300, intensity: 0.01 },
  SHAKE_AVALANCHE: { duration: 1000, intensity: 0.02 },
  SHAKE_TUMBLE: { duration: 500, intensity: 0.015 },
  SHAKE_WINCH_SNAP: { duration: 300, intensity: 0.01 },
  VICTORY_FLASH_DURATION: 300,
  VICTORY_ZOOM: 1.2,
  VICTORY_ZOOM_DURATION: 500,

  // Timing
  SCENE_INPUT_DELAY: 300,
  TUMBLE_ROTATION_DURATION: 1500,
  GAME_OVER_DELAY: 2000,
  FUEL_EMPTY_DELAY: 1500,
  VICTORY_DELAY: 1500,
  FEEDBACK_THROTTLE: 500,
  FEEDBACK_FADE_DURATION: 1000,
  DIALOGUE_SLIDE_DURATION: 200,
  TYPEWRITER_CHAR_DELAY: 25,
  TYPEWRITER_SAFETY_BUFFER: 2000,
  AVALANCHE_WIPEOUT_DELAY: 2000,

  // Night / headlights (in tile units)
  HEADLIGHT_FRONT_TILES: 5,
  HEADLIGHT_REAR_TILES: 4,
  HEADLIGHT_SPREAD: Math.PI * 0.6,
  NIGHT_DARKNESS_ALPHA: 0.7,
  NIGHT_BRIGHTNESS: 0.3,         // night texture brightness multiplier
  NIGHT_BLUE_SHIFT: 0.15,        // blue channel boost for night feel
  HEADLIGHT_STEPS: 4,
  HEADLIGHT_DIST_STEPS: 5,
  HEADLIGHT_ARC_STEPS: 8,

  // Skier headlamp (narrower single beam, no rear light)
  HEADLAMP_FRONT_TILES: 4,
  HEADLAMP_SPREAD: Math.PI * 0.3,
  HEADLAMP_STEPS: 4,
  HEADLAMP_DIST_STEPS: 4,
  HEADLAMP_ARC_STEPS: 6,

  // Wildlife
  WILDLIFE_FLEE_DISTANCE: 120,    // px — distance at which animals start fleeing
  WILDLIFE_CALM_DISTANCE: 200,    // px — distance at which fleeing animals return to idle
  WILDLIFE_FLEE_SPEED_BASE: 60,   // px/s — base flee speed (multiplied per species)
  WILDLIFE_SPAWN_MARGIN: 40,      // px — min distance from world edges for spawning

  // Audio
  AUDIO_MASTER_VOLUME_DEFAULT: 0.8,
  AUDIO_MUSIC_VOLUME_DEFAULT: 0.6,
  AUDIO_SFX_VOLUME_DEFAULT: 0.8,
  AUDIO_ENGINE_VOLUME_DEFAULT: 0.25,
  AUDIO_VOICE_VOLUME_DEFAULT: 0.8,
  AUDIO_AMBIENCE_VOLUME_DEFAULT: 0.5,

  // Ski/snowboard reward run
  SKI_GRAVITY_SPEED: 200,        // Base downhill velocity target (px/s)
  SKI_MAX_SPEED: 380,            // Terminal velocity
  SKI_LATERAL_SPEED: 140,        // Max left/right steering speed (px/s)
  SKI_DRAG: 60,                  // Natural deceleration (px/s²)
  SKI_GROOMED_MULTIPLIER: 1.0,   // Speed on groomed tiles (baseline)
  SKI_UNGROOMED_MULTIPLIER: 0.65, // Speed on ungroomed tiles
  SKI_OFFPISTE_MULTIPLIER: 0.35,  // Speed off-piste (deep powder)
  SKI_PISTE_BUFFER: 3,            // Tiles of packed snow shoulder beyond piste edge
  SKI_POWDER_DRAG: 300,          // Extra drag at piste edges
  SKI_BUMP_SLOWDOWN: 0.4,       // Speed multiplier on obstacle hit
  SKI_BUMP_DURATION: 500,        // ms of slowdown after bump
  SKI_FATAL_CRASH_KMH: 40,      // Obstacle collision above this speed is fatal
  SKI_CELEBRATION_DELAY: 400,    // ms to show celebration before transition
  SKI_ACCELERATION: 80,          // px/s² speed ramp-up rate (slow progressive build)
  SKI_MIN_ZOOM: 0.5,            // Minimum camera zoom for ski run
  SKI_BUMP_SHAKE: { duration: 150, intensity: 0.003 },
  SKI_BRAKE_DECELERATION: 150,   // px/s² speed reduction while braking (gradual)
  SKI_CRASH_DURATION: 1.2,       // seconds frozen after cliff wipeout
  SKI_SLOPE_BASE: 15,            // default slope angle (degrees) for non-steep areas
  SKI_SLOPE_SPEED_FACTOR: 0.03,  // speed multiplier per degree of slope above base
  SKI_CARVE_DRAG: 0.6,           // fraction of speed lost per second when fully turning
  SKI_HEADING_FACTOR: 0.7,       // how much lateral input reduces downhill acceleration (0=none, 1=full stop sideways)
  SKI_SPEED_SCALE: 0.21,         // px/s → km/h conversion (maps ~380px/s to ~80km/h)
  SKI_SPRITE_DEADZONE: 0.2,      // lateral input threshold for sprite direction change
  SKI_FINISH_BUFFER: 3,          // tiles above bottom edge to trigger finish
  SKI_INPUT_RAMP_RATE: 5.0,      // keyboard/d-pad input smoothing rate
  SKI_TERRAIN_BLEND_RATE: 3.0,   // groomed/ungroomed blend response rate
  SKI_LATERAL_LERP_RATE: 2.0,    // lateral velocity smoothing responsiveness
  SKI_TURN_RAMP_TIME: 0.4,      // seconds to reach max turn boost
  SKI_TURN_RAMP_BOOST: 1.2,     // extra lateral speed at max hold (1.0 = +100%)

  // Ski run audio tuning
  SKI_WIND_MIN_FREQ: 400,       // Hz — wind bandpass at rest
  SKI_WIND_MAX_FREQ: 2200,      // Hz — wind bandpass at max speed
  SKI_WIND_MIN_VOLUME: 0.008,    // Subtle breeze at low speed
  SKI_WIND_MAX_VOLUME: 0.045,    // Prominent rush at terminal velocity (below storm wind to avoid mud)
  SKI_CARVE_INTERVAL_MIN: 60,   // ms between carve swishes at max speed
  SKI_CARVE_INTERVAL_MAX: 200,  // ms at slow crawl
  SKI_CARVE_VOLUME: 0.05,       // Peak volume for carve bursts
  SKI_BRAKE_VOLUME: 0.08,       // Volume of brake scrape at full speed
  SKI_BRAKE_FREQ: 600,          // Hz — brake noise center frequency
  SKI_BUMP_SFX_VOLUME: 0.1,     // Impact sound volume
  SKI_TRICK_VOLUME: 0.07,       // Trick launch/land volume
  SKI_GRIND_VOLUME: 0.06,       // Rail grind volume
  SKI_GRIND_FREQ: 3000,         // Hz — metallic grind center frequency

  // Ski jump
  SKI_JUMP_MIN_SPEED: 60,       // Min speed (px/s) to get any air (~6 km/h)
  SKI_JUMP_AIR_BASE: 350,       // Base air time (ms) at minimum speed
  SKI_JUMP_AIR_MAX: 700,        // Max air time (ms) at full speed
  SKI_JUMP_SCALE: 1.4,          // Skier scale at peak of jump
  SKI_JUMP_BOOST: 1.15,         // Speed multiplier on clean landing (groomed)
  SKI_CLIFF_JUMP_KMH: 30,      // Min km/h to clear a cliff with a jump
  SKI_CLIFF_JUMP_AIR: 900,      // Air time (ms) for cliff jump
  SKI_CLIFF_JUMP_SCALE: 1.8,    // Skier scale at peak of cliff jump

  // Trick scoring (ski run)
  TRICK_BASE_KICKER: 100,
  TRICK_BASE_RAIL: 150,
  TRICK_BASE_HALFPIPE: 200,
  TRICK_VARIETY_BONUS: 0.25,     // Multiplier increase per consecutive unique trick
  SKI_HALFPIPE_REBOUND: 180,     // Lateral impulse (px/s) toward center on halfpipe trick landing
  SKI_TUCK_SPEED_MULT: 1.2,     // Max speed multiplier while tucking
  SKI_TUCK_STEER_MULT: 0.4,    // Lateral steering multiplier while tucking (reduced control)
} as const;

export type DifficultyType = 'tutorial' | 'green' | 'blue' | 'red' | 'black' | 'park';

export interface DifficultyMarker {
  color: number;
  shape: 'circle' | 'square' | 'diamond' | 'star' | 'triangle';
  symbol: string;
}

export const DIFFICULTY_MARKERS: Record<DifficultyType, DifficultyMarker> = {
  tutorial: { color: 0xffffff, shape: 'circle', symbol: '○' },
  green: { color: 0x22c55e, shape: 'circle', symbol: '●' },
  blue: { color: 0x3b82f6, shape: 'square', symbol: '■' },
  red: { color: 0xef4444, shape: 'diamond', symbol: '◆' },
  black: { color: 0x1f2937, shape: 'star', symbol: '★' },
  park: { color: 0xf59e0b, shape: 'triangle', symbol: '▲' },
};

export type BuffType = 'coldResist' | 'speed' | 'staminaRegen' | 'precision' | 'warmth' | null;

export interface FoodItem {
  stamina: number;
  buff: BuffType;
  buffDuration: number;
  icon: string;
  color: number;
}

export const FOOD_ITEMS: Record<string, FoodItem> = {
  tartiflette: {
    stamina: 100,
    buff: 'coldResist',
    buffDuration: 120000,
    icon: '🥔',
    color: 0xdeb887,
  },
  croziflette: {
    stamina: 50,
    buff: 'speed',
    buffDuration: 20000,
    icon: '🍝',
    color: 0xf4a460,
  },
  fondue: {
    stamina: 30,
    buff: 'staminaRegen',
    buffDuration: 30000,
    icon: '🧀',
    color: 0xffd700,
  },
  genepi: {
    stamina: 20,
    buff: 'precision',
    buffDuration: 15000,
    icon: '🥃',
    color: 0x90ee90,
  },
  vinChaud: {
    stamina: 40,
    buff: 'warmth',
    buffDuration: 25000,
    icon: '🍷',
    color: 0x8b0000,
  },
  cafe: {
    stamina: 25,
    buff: null,
    buffDuration: 0,
    icon: '☕',
    color: 0x3e2723,
  },
};

/** Select the best dish based on current game state. Pure function for testability. */
export function selectFoodBuff(opts: {
  isNight: boolean;
  weather: string;
  timeRemaining: number;
  timeLimit: number;
  coverage: number;
  activeBuffs: Record<string, number>;
}): string {
  const isNightOrStorm = opts.isNight || opts.weather === 'storm';
  const timeRatio = opts.timeLimit > 0 ? opts.timeRemaining / opts.timeLimit : 1;

  if (isNightOrStorm && !opts.activeBuffs.warmth) return 'vinChaud';
  if (timeRatio < 0.4) return 'croziflette';
  if (opts.coverage > 70) return 'genepi';
  return 'fondue';
}

/** Get frost accumulation rate for a level. Pure function for testability. */
export function getFrostRate(levelIndex: number, isNight: boolean, weather: string): number {
  if (levelIndex < BALANCE.FROST_MIN_LEVEL) return 0;
  if (weather === 'storm') return BALANCE.FROST_RATE_STORM;
  if (weather === 'light_snow') return BALANCE.FROST_RATE_LIGHT_SNOW;
  if (isNight) return BALANCE.FROST_RATE_NIGHT;
  return 0;
}

/** Get frost speed penalty multiplier. Pure function for testability. */
export function getFrostSpeedMultiplier(frostLevel: number): number {
  if (frostLevel >= BALANCE.FROST_SPEED_THRESHOLD_2) return BALANCE.FROST_SPEED_PENALTY_2;
  if (frostLevel >= BALANCE.FROST_SPEED_THRESHOLD_1) return BALANCE.FROST_SPEED_PENALTY_1;
  return 1;
}
