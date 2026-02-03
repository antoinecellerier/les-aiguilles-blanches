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
