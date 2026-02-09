/**
 * Unit tests for game configuration
 */
import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, DIFFICULTY_MARKERS, STORAGE_KEYS, BALANCE } from './config-wrappers/index.js';

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

describe('Storage Keys', () => {
    it('should have MOVEMENT_SENSITIVITY key', () => {
        expect(STORAGE_KEYS.MOVEMENT_SENSITIVITY).toBe('snowGroomer_movementSensitivity');
    });

    it('should have audio storage keys', () => {
        expect(STORAGE_KEYS.MASTER_VOLUME).toBe('snowGroomer_masterVolume');
        expect(STORAGE_KEYS.MUSIC_VOLUME).toBe('snowGroomer_musicVolume');
        expect(STORAGE_KEYS.SFX_VOLUME).toBe('snowGroomer_sfxVolume');
        expect(STORAGE_KEYS.VOICE_VOLUME).toBe('snowGroomer_voiceVolume');
        expect(STORAGE_KEYS.AMBIENCE_VOLUME).toBe('snowGroomer_ambienceVolume');
        expect(STORAGE_KEYS.AUDIO_MUTED).toBe('snowGroomer_audioMuted');
    });

    it('movement sensitivity should apply as speed multiplier', () => {
        const baseSpeed = GAME_CONFIG.GROOMER_SPEED;
        // Valid range: 0.25x to 2.0x
        expect(baseSpeed * 0.25).toBeGreaterThan(0);
        expect(baseSpeed * 2.0).toBeLessThanOrEqual(300);
        expect(baseSpeed * 1.0).toBe(150);
    });
});

describe('Audio Balance Defaults', () => {
    it('should have audio volume defaults between 0 and 1', () => {
        const audioKeys = ['AUDIO_MASTER_VOLUME_DEFAULT', 'AUDIO_MUSIC_VOLUME_DEFAULT',
            'AUDIO_SFX_VOLUME_DEFAULT', 'AUDIO_VOICE_VOLUME_DEFAULT', 'AUDIO_AMBIENCE_VOLUME_DEFAULT'];
        audioKeys.forEach(key => {
            expect(BALANCE[key], `${key} should be between 0 and 1`).toBeGreaterThanOrEqual(0);
            expect(BALANCE[key], `${key} should be between 0 and 1`).toBeLessThanOrEqual(1);
        });
    });
});
