/**
 * Les Aiguilles Blanches - Accessibility Utilities
 * Screen reader support and accessibility helpers
 */

const Accessibility = {
    // Screen reader live region
    announcer: null,
    
    init() {
        // Create screen reader announcer
        this.announcer = document.createElement('div');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
        `;
        document.body.appendChild(this.announcer);
    },
    
    announce(message) {
        if (this.announcer) {
            this.announcer.textContent = message;
        }
    },
    
    // Settings storage
    settings: {
        highContrast: false,
        colorblindMode: 'none',
        reducedMotion: false,
        uiScale: 1
    },
    
    loadSettings() {
        const saved = localStorage.getItem('snowGroomer_accessibility');
        if (saved) {
            try {
                Object.assign(this.settings, JSON.parse(saved));
            } catch (e) {}
        }
        
        // Check system preferences
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.settings.reducedMotion = true;
        }
        
        return this.settings;
    },
    
    saveSettings() {
        localStorage.setItem('snowGroomer_accessibility', JSON.stringify(this.settings));
    },
    
    // Color transforms for colorblind modes
    getColorblindMatrix(mode) {
        switch (mode) {
            case 'deuteranopia':
                return [
                    0.625, 0.375, 0, 0, 0,
                    0.7, 0.3, 0, 0, 0,
                    0, 0.3, 0.7, 0, 0,
                    0, 0, 0, 1, 0
                ];
            case 'protanopia':
                return [
                    0.567, 0.433, 0, 0, 0,
                    0.558, 0.442, 0, 0, 0,
                    0, 0.242, 0.758, 0, 0,
                    0, 0, 0, 1, 0
                ];
            case 'tritanopia':
                return [
                    0.95, 0.05, 0, 0, 0,
                    0, 0.433, 0.567, 0, 0,
                    0, 0.475, 0.525, 0, 0,
                    0, 0, 0, 1, 0
                ];
            default:
                return null;
        }
    }
};
