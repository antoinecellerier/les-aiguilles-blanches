/**
 * Unit tests for game configuration
 */
import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, DIFFICULTY_MARKERS } from './config-wrappers/index.js';

describe('Game Configuration', () => {
    it('should have positive gameplay values', () => {
        expect(GAME_CONFIG.GROOMER_SPEED).toBeGreaterThan(0);
        expect(GAME_CONFIG.FUEL_CONSUMPTION).toBeGreaterThan(0);
        expect(GAME_CONFIG.GROOM_WIDTH).toBeGreaterThan(0);
        expect(GAME_CONFIG.TILE_SIZE).toBeGreaterThan(0);
    });

    it('should have color definitions', () => {
        expect(GAME_CONFIG.COLORS).toBeDefined();
        expect(GAME_CONFIG.COLORS.SKY_NIGHT).toBeDefined();
        expect(GAME_CONFIG.COLORS.SNOW_GROOMED).toBeDefined();
    });
});

describe('Difficulty Markers', () => {
    it('should have all difficulty levels', () => {
        const difficulties = ['tutorial', 'green', 'blue', 'red', 'black', 'park'];
        difficulties.forEach(d => {
            expect(DIFFICULTY_MARKERS, `Missing ${d}`).toHaveProperty(d);
        });
    });

    it('each marker should have color and shape', () => {
        Object.entries(DIFFICULTY_MARKERS).forEach(([name, marker]) => {
            expect(marker, `${name} missing color`).toHaveProperty('color');
            expect(marker, `${name} missing shape`).toHaveProperty('shape');
        });
    });
});
