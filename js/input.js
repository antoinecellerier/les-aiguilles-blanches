/**
 * Les Aiguilles Blanches - Input Manager
 * Unified input handling for keyboard, gamepad, mouse, and touch
 */

class InputManager {
    constructor() {
        this.keys = {};
        this.gamepadIndex = null;
        this.touchState = { x: 0, y: 0, groom: false, winch: false };
        this.mouseState = { x: 0, y: 0, clicking: false, targetX: null, targetY: null };
        this.rebindingAction = null;
        
        // Key bindings (using physical key codes for layout independence)
        this.bindings = {
            up: ['KeyW', 'ArrowUp'],
            down: ['KeyS', 'ArrowDown'],
            left: ['KeyA', 'ArrowLeft'],
            right: ['KeyD', 'ArrowRight'],
            groom: ['Space'],
            winch: ['ShiftLeft', 'ShiftRight'],
            pause: ['Escape', 'KeyP']
        };
        
        // Load saved bindings
        this.loadBindings();
        
        this.setupKeyboard();
        this.setupGamepad();
        this.setupTouch();
        this.setupMouse();
        this.setupRebinding();
    }
    
    loadBindings() {
        const saved = localStorage.getItem('snowGroomer_bindings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(this.bindings, parsed);
            } catch (e) {
                console.warn('Failed to load key bindings:', e);
            }
        }
    }
    
    saveBindings() {
        localStorage.setItem('snowGroomer_bindings', JSON.stringify(this.bindings));
    }
    
    setupRebinding() {
        document.querySelectorAll('[data-rebind]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.rebindingAction) return;
                
                const action = btn.getAttribute('data-rebind');
                this.rebindingAction = action;
                btn.textContent = '...';
                btn.classList.add('rebinding');
                
                const handleKey = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (e.code === 'Escape') {
                        // Cancel rebinding
                        this.updateRebindButton(btn, action);
                        this.rebindingAction = null;
                        btn.classList.remove('rebinding');
                        document.removeEventListener('keydown', handleKey, true);
                        return;
                    }
                    
                    // Set new binding (keep arrow as fallback for movement)
                    if (['up', 'down', 'left', 'right'].includes(action)) {
                        const arrowKey = this.bindings[action].find(k => k.startsWith('Arrow'));
                        this.bindings[action] = [e.code, arrowKey || e.code];
                    } else {
                        this.bindings[action] = [e.code];
                    }
                    
                    this.saveBindings();
                    this.updateRebindButton(btn, action);
                    this.rebindingAction = null;
                    btn.classList.remove('rebinding');
                    document.removeEventListener('keydown', handleKey, true);
                    
                    if (typeof announce === 'function') {
                        announce(`${action} bound to ${this.keyCodeToDisplay(e.code)}`);
                    }
                };
                
                document.addEventListener('keydown', handleKey, true);
            });
        });
        
        // Update all buttons with current bindings on init
        document.querySelectorAll('[data-rebind]').forEach(btn => {
            const action = btn.getAttribute('data-rebind');
            this.updateRebindButton(btn, action);
        });
    }
    
    updateRebindButton(btn, action) {
        const keys = this.bindings[action] || [];
        const displayNames = keys.map(k => this.keyCodeToDisplay(k));
        btn.textContent = displayNames.join(' / ') || '---';
    }
    
    keyCodeToDisplay(code) {
        const map = {
            'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
            'KeyZ': 'Z', 'KeyQ': 'Q', 'KeyE': 'E', 'KeyR': 'R',
            'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
            'Space': 'Space', 'ShiftLeft': 'Shift', 'ShiftRight': 'Shift',
            'Escape': 'Esc', 'KeyP': 'P',
            'Enter': 'Enter', 'Backspace': 'Backspace',
            'ControlLeft': 'Ctrl', 'ControlRight': 'Ctrl',
            'AltLeft': 'Alt', 'AltRight': 'Alt',
            'Tab': 'Tab'
        };
        return map[code] || code.replace('Key', '').replace('Digit', '');
    }
    
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent default for game keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        // Clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }
    
    setupGamepad() {
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            if (typeof announce === 'function') {
                announce('Gamepad connected');
            }
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadIndex = null;
            if (typeof announce === 'function') {
                announce('Gamepad disconnected');
            }
        });
    }
    
    setupTouch() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        const btnGroom = document.getElementById('btnGroom');
        const btnWinch = document.getElementById('btnWinch');
        
        if (!joystick || !knob) return;
        
        let joystickCenter = { x: 0, y: 0 };
        let joystickActive = false;
        
        const updateJoystickCenter = () => {
            const rect = joystick.getBoundingClientRect();
            joystickCenter = { 
                x: rect.left + rect.width / 2, 
                y: rect.top + rect.height / 2 
            };
        };
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            updateJoystickCenter();
        });
        
        joystick.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - joystickCenter.x;
            const dy = touch.clientY - joystickCenter.y;
            const maxDist = 35;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
            const angle = Math.atan2(dy, dx);
            
            const knobX = Math.cos(angle) * dist;
            const knobY = Math.sin(angle) * dist;
            knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            
            this.touchState.x = knobX / maxDist;
            this.touchState.y = knobY / maxDist;
        });
        
        const resetJoystick = () => {
            joystickActive = false;
            knob.style.transform = 'translate(-50%, -50%)';
            this.touchState.x = 0;
            this.touchState.y = 0;
        };
        
        joystick.addEventListener('touchend', resetJoystick);
        joystick.addEventListener('touchcancel', resetJoystick);
        
        // Action buttons
        if (btnGroom) {
            btnGroom.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                this.touchState.groom = true; 
                btnGroom.classList.add('active'); 
            });
            btnGroom.addEventListener('touchend', () => { 
                this.touchState.groom = false; 
                btnGroom.classList.remove('active'); 
            });
        }
        
        if (btnWinch) {
            btnWinch.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                this.touchState.winch = true; 
                btnWinch.classList.add('active'); 
            });
            btnWinch.addEventListener('touchend', () => { 
                this.touchState.winch = false; 
                btnWinch.classList.remove('active'); 
            });
        }
    }
    
    setupMouse() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.addEventListener('mousedown', (e) => {
            this.mouseState.clicking = true;
            this.mouseState.x = e.clientX;
            this.mouseState.y = e.clientY;
        });
        canvas.addEventListener('mouseup', () => {
            this.mouseState.clicking = false;
        });
        canvas.addEventListener('mousemove', (e) => {
            if (this.mouseState.clicking) {
                this.mouseState.x = e.clientX;
                this.mouseState.y = e.clientY;
            }
        });
        canvas.addEventListener('mouseleave', () => {
            this.mouseState.clicking = false;
        });
    }
    
    /**
     * Check if an action is currently pressed
     * @param {string} action - Action name (up, down, left, right, groom, winch, pause)
     * @returns {boolean}
     */
    isPressed(action) {
        // Check keyboard
        for (const code of this.bindings[action] || []) {
            if (this.keys[code]) return true;
        }
        
        // Check gamepad
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                switch (action) {
                    case 'up': return gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
                    case 'down': return gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
                    case 'left': return gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
                    case 'right': return gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
                    case 'groom': return gp.buttons[0]?.pressed; // A button
                    case 'winch': return gp.buttons[1]?.pressed; // B button
                    case 'pause': return gp.buttons[9]?.pressed; // Start button
                }
            }
        }
        
        // Check touch
        if (action === 'groom') return this.touchState.groom;
        if (action === 'winch') return this.touchState.winch;
        
        return false;
    }
    
    /**
     * Get normalized movement vector from all input sources
     * @returns {{dx: number, dy: number}} Movement vector (-1 to 1)
     */
    getMovement() {
        let dx = 0, dy = 0;
        
        // Keyboard / Gamepad digital
        if (this.isPressed('left')) dx -= 1;
        if (this.isPressed('right')) dx += 1;
        if (this.isPressed('up')) dy -= 1;
        if (this.isPressed('down')) dy += 1;
        
        // Touch joystick (analog)
        if (Math.abs(this.touchState.x) > 0.1 || Math.abs(this.touchState.y) > 0.1) {
            dx = this.touchState.x;
            dy = this.touchState.y;
        }
        
        // Gamepad analog stick (if not already moved by digital)
        if (dx === 0 && dy === 0 && this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                const stickX = gp.axes[0] || 0;
                const stickY = gp.axes[1] || 0;
                if (Math.abs(stickX) > 0.15) dx = stickX;
                if (Math.abs(stickY) > 0.15) dy = stickY;
            }
        }
        
        // Normalize diagonal movement
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
            dx /= len;
            dy /= len;
        }
        
        return { dx, dy };
    }
    
    /**
     * Check if any movement input is active
     * @returns {boolean}
     */
    isMoving() {
        const { dx, dy } = this.getMovement();
        return Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputManager };
}
