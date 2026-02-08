/**
 * Unit tests for gamepad utilities
 */
import { describe, it, expect } from 'vitest';
import { getButtonName, getDefaultGamepadBindings, detectControllerType, isGamepadButtonPressed, captureGamepadButtons } from './config-wrappers/index.js';

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

describe('isGamepadButtonPressed', () => {
    /** Create a mock Phaser gamepad with given buttons and axes. */
    function mockPad({ buttons = [], axes = [] } = {}) {
        return {
            buttons: buttons.map(pressed => ({ pressed, value: pressed ? 1 : 0 })),
            axes: axes.map(value => ({ getValue: () => value, value })),
        };
    }

    it('should detect a regular button press', () => {
        const pad = mockPad({ buttons: [true, false, false] });
        expect(isGamepadButtonPressed(pad, 0)).toBe(true);
        expect(isGamepadButtonPressed(pad, 1)).toBe(false);
    });

    it('should return false for null pad', () => {
        expect(isGamepadButtonPressed(null, 0)).toBe(false);
    });

    it('should detect LT via axis fallback when button 6 is missing', () => {
        // Firefox: only 6 buttons, triggers on axes 4,5
        const pad = mockPad({
            buttons: [false, false, false, false, false, false],
            axes: [0, 0, 0, 0, 0.9, 0],  // axis 4 = LT pressed
        });
        expect(isGamepadButtonPressed(pad, 6)).toBe(true);
        expect(isGamepadButtonPressed(pad, 7)).toBe(false);
    });

    it('should detect RT via axis fallback when button 7 is missing', () => {
        const pad = mockPad({
            buttons: [false, false, false, false, false, false],
            axes: [0, 0, 0, 0, 0, 0.8],  // axis 5 = RT pressed
        });
        expect(isGamepadButtonPressed(pad, 7)).toBe(true);
    });

    it('should prefer button over axis when both exist', () => {
        // Chrome: button 6 exists and works
        const pad = mockPad({
            buttons: [false, false, false, false, false, false, true, false],
            axes: [0, 0, 0, 0, 0, 0],
        });
        expect(isGamepadButtonPressed(pad, 6)).toBe(true);
    });

    it('should not trigger below axis threshold', () => {
        const pad = mockPad({
            buttons: [false, false, false, false, false, false],
            axes: [0, 0, 0, 0, 0.3, 0.1],  // below 0.5 threshold
        });
        expect(isGamepadButtonPressed(pad, 6)).toBe(false);
        expect(isGamepadButtonPressed(pad, 7)).toBe(false);
    });

    it('should not use axis fallback for non-trigger buttons', () => {
        // Button 0 should NOT fall back to axes
        const pad = mockPad({
            buttons: [false],
            axes: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        });
        expect(isGamepadButtonPressed(pad, 0)).toBe(false);
    });
});

describe('captureGamepadButtons', () => {
    function mockScene(buttons = [], axes = []) {
        const pad = {
            buttons: buttons.map(p => ({ pressed: p, value: p ? 1 : 0 })),
            axes: axes.map(v => ({ getValue: () => v, value: v })),
        };
        return {
            input: {
                gamepad: {
                    total: 1,
                    getPad: () => pad,
                },
            },
        };
    }

    it('should capture pressed state for requested buttons', () => {
        const scene = mockScene([false, true, false, false, false, false, false, false, true]);
        const state = captureGamepadButtons(scene, [1, 8]);
        expect(state[1]).toBe(true);
        expect(state[8]).toBe(true);
    });

    it('should return false for unpressed buttons', () => {
        const scene = mockScene([false, false, false]);
        const state = captureGamepadButtons(scene, [0, 1, 2]);
        expect(state[0]).toBe(false);
        expect(state[1]).toBe(false);
        expect(state[2]).toBe(false);
    });

    it('should return all false when no gamepad connected', () => {
        const scene = { input: { gamepad: { total: 0, getPad: () => null } } };
        const state = captureGamepadButtons(scene, [0, 8, 9]);
        expect(state[0]).toBe(false);
        expect(state[8]).toBe(false);
        expect(state[9]).toBe(false);
    });

    it('should detect triggers via axis fallback', () => {
        // Firefox: button 6 not pressed, but axis 4 has value
        const scene = mockScene(
            [false, false, false, false, false, false, false],
            [0, 0, 0, 0, 0.9, 0]
        );
        const state = captureGamepadButtons(scene, [6, 7]);
        expect(state[6]).toBe(true);
        expect(state[7]).toBe(false);
    });
});
