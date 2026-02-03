/**
 * Les Aiguilles Blanches - Game Configuration
 * Phaser 3 configuration and constants
 */

const GAME_CONFIG = {
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
        SKY_DAY: 0x87CEEB,
        SKY_NIGHT: 0x0a1628,
        SNOW_UNGROOMED: 0xE8F4F8,
        SNOW_GROOMED: 0xF0F8FF,
        SNOW_ICE: 0xB8E0F0,
        SNOW_DEEP: 0xD0E0E8
    }
};

// Piste difficulty markers (with shapes for accessibility)
const DIFFICULTY_MARKERS = {
    tutorial: { color: 0xFFFFFF, shape: 'circle', symbol: '○' },
    green: { color: 0x22c55e, shape: 'circle', symbol: '●' },
    blue: { color: 0x3b82f6, shape: 'square', symbol: '■' },
    red: { color: 0xef4444, shape: 'diamond', symbol: '◆' },
    black: { color: 0x1f2937, shape: 'star', symbol: '★' },
    park: { color: 0xf59e0b, shape: 'triangle', symbol: '▲' }
};

// Food items with effects
const FOOD_ITEMS = {
    tartiflette: { 
        stamina: 100, 
        buff: 'coldResist', 
        buffDuration: 120000, 
        icon: '🥔',
        color: 0xDEB887
    },
    croziflette: { 
        stamina: 50, 
        buff: 'speed', 
        buffDuration: 120000, 
        icon: '🍝',
        color: 0xF4A460
    },
    fondue: { 
        stamina: 30, 
        buff: 'staminaRegen', 
        buffDuration: 180000, 
        icon: '🧀',
        color: 0xFFD700
    },
    genepi: { 
        stamina: 20, 
        buff: 'precision', 
        buffDuration: 90000, 
        icon: '🥃',
        color: 0x90EE90
    },
    vinChaud: { 
        stamina: 40, 
        buff: 'warmth', 
        buffDuration: 150000, 
        icon: '🍷',
        color: 0x8B0000
    },
    cafe: { 
        stamina: 25, 
        buff: null, 
        buffDuration: 0, 
        icon: '☕',
        color: 0x3E2723
    }
};
