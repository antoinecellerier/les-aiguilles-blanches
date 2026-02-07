/**
 * Unit tests for gamepad utilities
 */
import { describe, it, expect } from 'vitest';
import { getButtonName, getDefaultGamepadBindings, detectControllerType } from './config-wrappers/index.js';

describe('getButtonName', () => {
    it('should return circled letters for generic controller', () => {
        expect(getButtonName(0)).toBe('Ⓐ');
        expect(getButtonName(1)).toBe('Ⓑ');
        expect(getButtonName(2)).toBe('Ⓧ');
        expect(getButtonName(3)).toBe('Ⓨ');
    });

    it('should return Xbox labels', () => {
        expect(getButtonName(0, 'xbox')).toBe('Ⓐ');
        expect(getButtonName(1, 'xbox')).toBe('Ⓑ');
        expect(getButtonName(4, 'xbox')).toBe('LB');
        expect(getButtonName(6, 'xbox')).toBe('LT');
        expect(getButtonName(9, 'xbox')).toBe('Menu');
    });

    it('should return Nintendo labels with swapped face buttons', () => {
        expect(getButtonName(0, 'nintendo')).toBe('Ⓑ');
        expect(getButtonName(1, 'nintendo')).toBe('Ⓐ');
        expect(getButtonName(2, 'nintendo')).toBe('Ⓨ');
        expect(getButtonName(3, 'nintendo')).toBe('Ⓧ');
        expect(getButtonName(4, 'nintendo')).toBe('L');
        expect(getButtonName(6, 'nintendo')).toBe('ZL');
        expect(getButtonName(9, 'nintendo')).toBe('⊕');
    });

    it('should return PlayStation symbols', () => {
        expect(getButtonName(0, 'playstation')).toBe('✕');
        expect(getButtonName(1, 'playstation')).toBe('○');
        expect(getButtonName(2, 'playstation')).toBe('□');
        expect(getButtonName(3, 'playstation')).toBe('△');
        expect(getButtonName(4, 'playstation')).toBe('L1');
        expect(getButtonName(9, 'playstation')).toBe('Options');
    });

    it('should handle unknown button indices', () => {
        expect(getButtonName(99)).toBe('Btn 99');
        expect(getButtonName(99, 'xbox')).toBe('Btn 99');
    });
});

describe('getDefaultGamepadBindings', () => {
    it('should return default bindings', () => {
        const bindings = getDefaultGamepadBindings();
        expect(bindings.groom).toBe(0);
        expect(bindings.winch).toBe(4);
        expect(bindings.pause).toBe(9);
    });
});

describe('detectControllerType', () => {
    it('should detect Nintendo controllers', () => {
        expect(detectControllerType('Nintendo Switch Pro Controller')).toBe('nintendo');
        expect(detectControllerType('Joy-Con (L)')).toBe('nintendo');
    });

    it('should detect PlayStation controllers', () => {
        expect(detectControllerType('Sony DualSense Wireless Controller')).toBe('playstation');
        expect(detectControllerType('DualShock 4')).toBe('playstation');
    });

    it('should detect Xbox controllers', () => {
        expect(detectControllerType('Xbox Wireless Controller')).toBe('xbox');
        expect(detectControllerType('xinput')).toBe('xbox');
    });

    it('should return generic for unknown', () => {
        expect(detectControllerType('Unknown Gamepad')).toBe('generic');
    });
});
