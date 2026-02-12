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
  BG_FOREST_ROCKS: -50,  // Rocks beyond world bounds
  TERRAIN: 0,         // Off-piste snow tiles (base layer)
  ACCESS_ROAD: 1,     // Packed snow on service roads (above off-piste, below piste)
  PISTE: 2,           // Piste snow tiles (above access roads so grooming is visible)
  CLIFFS: 3,          // Cliff rock textures (always below trees/buildings)
  GROUND_OBJECTS: 4,  // Base for yDepth() Y-sorted objects (trees, chalets, anchors)
  TREES: 4,           // Alias for GROUND_OBJECTS (both use yDepth())
  GROUND_LABELS: 7,   // Anchor numbers, text on ground objects
  SIGNAGE: 8,         // Avalanche warnings, hazard markers
  MARKERS: 9,         // Piste marker poles, service road poles
  WINCH_CABLE: 50,    // Winch cable graphics
  AIRBORNE: 55,       // Flying birds, airborne objects (above cable, below overlay)
  NIGHT_OVERLAY: 100, // Night/weather darkening
  PLAYER: 101,        // Groomer (above night overlay so headlights work)
  FEEDBACK: 200,      // Floating text (+fuel, stamina, etc.)
  WEATHER: 200,       // Snow particles (same layer as feedback)
  VICTORY: 500,       // Victory text (topmost)
  // Menu/settings scene depths (separate from game world)
  MENU_OVERLAY: 13,   // Darken overlay for settings/pause backdrops
  MENU_UI: 15,        // UI panels, buttons, text above overlay
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
  FOOD_BUFF_DURATION: 60000,

  // Movement
  SPEED_BUFF_MULTIPLIER: 1.5,
  SENSITIVITY_MIN: 0.25,
  SENSITIVITY_MAX: 2.0,
  SENSITIVITY_DEFAULT: 1.0,
  GAMEPAD_DEADZONE: 0.2,
  GROOMER_DRAG: 200,
  WINCH_FORCE: 0.3,
  WINCH_MIN_DISTANCE: 50,
  WINCH_MAX_CABLE: 25,  // Max cable length in tiles before snap
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

  // Night / headlights (in tile units)
  HEADLIGHT_FRONT_TILES: 5,
  HEADLIGHT_REAR_TILES: 4,
  HEADLIGHT_SPREAD: Math.PI * 0.6,
  NIGHT_DARKNESS_ALPHA: 0.7,
  HEADLIGHT_STEPS: 6,
  HEADLIGHT_DIST_STEPS: 8,
  HEADLIGHT_ARC_STEPS: 12,

  // Wildlife
  WILDLIFE_FLEE_DISTANCE: 120,    // px — distance at which animals start fleeing
  WILDLIFE_CALM_DISTANCE: 200,    // px — distance at which fleeing animals return to idle
  WILDLIFE_FLEE_SPEED_BASE: 60,   // px/s — base flee speed (multiplied per species)
  WILDLIFE_SPAWN_MARGIN: 40,      // px — min distance from world edges for spawning

  // Audio
  AUDIO_MASTER_VOLUME_DEFAULT: 0.8,
  AUDIO_MUSIC_VOLUME_DEFAULT: 0.6,
  AUDIO_SFX_VOLUME_DEFAULT: 0.8,
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
  SKI_POWDER_DRAG: 300,          // Extra drag at piste edges
  SKI_BUMP_SLOWDOWN: 0.4,       // Speed multiplier on obstacle hit
  SKI_BUMP_DURATION: 500,        // ms of slowdown after bump
  SKI_CELEBRATION_DELAY: 1500,   // ms to show celebration before transition
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
    buffDuration: 120000,
    icon: '🍝',
    color: 0xf4a460,
  },
  fondue: {
    stamina: 30,
    buff: 'staminaRegen',
    buffDuration: 180000,
    icon: '🧀',
    color: 0xffd700,
  },
  genepi: {
    stamina: 20,
    buff: 'precision',
    buffDuration: 90000,
    icon: '🥃',
    color: 0x90ee90,
  },
  vinChaud: {
    stamina: 40,
    buff: 'warmth',
    buffDuration: 150000,
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
