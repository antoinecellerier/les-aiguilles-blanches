/**
 * Les Aiguilles Blanches - Game Logic
 * Core game mechanics and state management
 */

// ============================================
// GAME STATE
// ============================================
const gameState = {
    currentLevel: 0,
    isPlaying: false,
    isPaused: false,
    showingDialogue: false,
    
    // Player
    groomer: {
        x: 0,
        y: 0,
        angle: 0,
        fuel: 100,
        stamina: 100,
        isGrooming: false,
        isUsingWinch: false,
        buffs: {}
    },
    
    // Level
    snowGrid: [],
    obstacles: [],
    coverage: 0,
    timeRemaining: 0,
    
    // Tutorial
    tutorialStep: 0,
    tutorialTriggered: {},
    
    // Settings
    settings: {
        highContrast: false,
        colorblindMode: 'none',
        reducedMotion: false,
        uiScale: 1,
        musicVolume: 70,
        sfxVolume: 100
    }
};

// ============================================
// GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager();
        this.lastTime = 0;
        this.debugMode = false;
        
        this.loadSettings();
        this.setupMenus();
        this.loop = this.loop.bind(this);
        
        console.log('Game initialized, canvas:', this.canvas.width, 'x', this.canvas.height);
    }
    
    loadSettings() {
        const saved = localStorage.getItem('snowGroomer_settings');
        if (saved) {
            try {
                Object.assign(gameState.settings, JSON.parse(saved));
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
        
        const savedLang = localStorage.getItem('snowGroomer_lang');
        if (savedLang && typeof setLanguage === 'function') {
            setLanguage(savedLang);
            const langSelect = document.getElementById('langSelect');
            if (langSelect) langSelect.value = savedLang;
        }
        
        this.applySettings();
    }
    
    saveSettings() {
        localStorage.setItem('snowGroomer_settings', JSON.stringify(gameState.settings));
    }
    
    applySettings() {
        const s = gameState.settings;
        
        // High contrast
        document.querySelectorAll('.hud-panel').forEach(el => {
            el.classList.toggle('high-contrast', s.highContrast);
        });
        
        // UI Scale
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.transform = `scale(${s.uiScale})`;
            hud.style.transformOrigin = 'top left';
        }
        
        // Colorblind filter
        this.renderer.applyColorblindFilter(s.colorblindMode);
        
        // Update UI elements
        const elements = {
            highContrast: s.highContrast,
            colorblindMode: s.colorblindMode,
            reducedMotion: s.reducedMotion,
            uiScale: s.uiScale,
            musicVolume: s.musicVolume,
            sfxVolume: s.sfxVolume
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else {
                    el.value = value;
                }
            }
        }
    }
    
    setupMenus() {
        // Main menu
        this.bindClick('btnStart', () => this.startGame());
        this.bindClick('btnHowToPlay', () => this.showMenu('howToPlayMenu'));
        this.bindClick('btnSettings', () => this.showMenu('settingsMenu'));
        this.bindClick('btnControls', () => this.showMenu('controlsMenu'));
        this.bindClick('btnMenu', () => this.togglePause());
        
        // Back buttons
        this.bindClick('btnBackSettings', () => this.showMenu('mainMenu'));
        this.bindClick('btnBackControls', () => this.showMenu('mainMenu'));
        this.bindClick('btnBackHowToPlay', () => this.showMenu('mainMenu'));
        
        // Settings handlers
        this.bindChange('langSelect', (e) => {
            if (typeof setLanguage === 'function') {
                setLanguage(e.target.value);
            }
        });
        
        this.bindChange('highContrast', (e) => {
            gameState.settings.highContrast = e.target.checked;
            this.applySettings();
            this.saveSettings();
        });
        
        this.bindChange('colorblindMode', (e) => {
            gameState.settings.colorblindMode = e.target.value;
            this.renderer.applyColorblindFilter(e.target.value);
            this.saveSettings();
        });
        
        this.bindChange('reducedMotion', (e) => {
            gameState.settings.reducedMotion = e.target.checked;
            this.saveSettings();
        });
        
        this.bindChange('uiScale', (e) => {
            gameState.settings.uiScale = parseFloat(e.target.value);
            this.applySettings();
            this.saveSettings();
        });
        
        // Pause menu
        this.bindClick('btnResume', () => this.togglePause());
        this.bindClick('btnPauseSettings', () => this.showMenu('settingsMenu'));
        this.bindClick('btnQuit', () => {
            gameState.isPlaying = false;
            this.showMenu('mainMenu');
        });
        
        // Level complete
        this.bindClick('btnNextLevel', () => this.nextLevel());
        this.bindClick('btnReplay', () => this.startLevel(gameState.currentLevel));
        
        // Level failed
        this.bindClick('btnTryAgain', () => this.startLevel(gameState.currentLevel));
        this.bindClick('btnFailQuit', () => {
            gameState.isPlaying = false;
            this.showMenu('mainMenu');
        });
        
        // Dialogue
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && gameState.showingDialogue) {
                e.preventDefault();
                this.hideDialogue();
            }
        });
        
        const dialogueBox = document.getElementById('dialogueBox');
        if (dialogueBox) {
            dialogueBox.addEventListener('click', () => {
                if (gameState.showingDialogue) this.hideDialogue();
            });
        }
        
        // Pause on Escape
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && gameState.isPlaying && !gameState.showingDialogue) {
                this.togglePause();
            }
        });
    }
    
    bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }
    
    bindChange(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handler);
    }
    
    showMenu(menuId) {
        document.querySelectorAll('.menu-overlay').forEach(m => m.classList.add('hidden'));
        const menu = document.getElementById(menuId);
        if (menu) menu.classList.remove('hidden');
    }
    
    hideAllMenus() {
        document.querySelectorAll('.menu-overlay').forEach(m => m.classList.add('hidden'));
    }
    
    showDialogue(speakerKey, textKey) {
        const speakerNames = {
            'jeanPierreIntro': 'Jean-Pierre',
            'level2Intro': 'Jean-Pierre',
            'level3Intro': 'Jean-Pierre',
            'level4Intro': 'Jean-Pierre',
            'level5Intro': 'Jean-Pierre',
            'level6Intro': 'Jean-Pierre',
            'level8Intro': 'Jean-Pierre',
            'marieWelcome': 'Marie',
            'thierryWarning': 'Thierry'
        };
        
        const speaker = speakerNames[speakerKey] || speakerKey;
        const text = typeof t === 'function' ? t(textKey || speakerKey) : (textKey || speakerKey);
        
        const speakerEl = document.getElementById('dialogueSpeaker');
        const textEl = document.getElementById('dialogueText');
        const box = document.getElementById('dialogueBox');
        
        if (speakerEl) speakerEl.textContent = speaker;
        if (textEl) textEl.textContent = text;
        if (box) box.classList.add('visible');
        
        gameState.showingDialogue = true;
        
        if (typeof announce === 'function') {
            announce(speaker + ': ' + text);
        }
    }
    
    hideDialogue() {
        const box = document.getElementById('dialogueBox');
        if (box) box.classList.remove('visible');
        gameState.showingDialogue = false;
    }
    
    generateLevel(levelIndex) {
        const level = LEVELS[levelIndex];
        const grid = [];
        
        for (let y = 0; y < level.height; y++) {
            const row = [];
            for (let x = 0; x < level.width; x++) {
                let type = 'powder';
                if (level.weather === 'storm') {
                    type = Math.random() < 0.4 ? 'deep' : 'powder';
                } else if (level.difficulty === 'black' && Math.random() < 0.2) {
                    type = 'ice';
                }
                
                row.push({
                    type,
                    groomed: false,
                    groomQuality: 0
                });
            }
            grid.push(row);
        }
        
        return grid;
    }
    
    generateObstacles(levelIndex) {
        const level = LEVELS[levelIndex];
        const obstacles = [];
        const obstacleCount = Math.floor(level.width * level.height / 80);
        
        // Generate random obstacles
        for (let i = 0; i < obstacleCount; i++) {
            const types = level.obstacles || ['trees'];
            const type = types[Math.floor(Math.random() * types.length)];
            const obstacleType = OBSTACLE_TYPES[type] || OBSTACLE_TYPES.tree;
            
            obstacles.push({
                type,
                x: Math.random() * level.width * CONFIG.TILE_SIZE,
                y: Math.random() * level.height * CONFIG.TILE_SIZE,
                width: obstacleType.width,
                height: obstacleType.height,
                solid: obstacleType.solid
            });
        }
        
        // Add restaurant (Chez Marie)
        obstacles.push({
            type: 'restaurant',
            x: level.width * CONFIG.TILE_SIZE / 2,
            y: 100,
            width: 60,
            height: 40,
            solid: false,
            isInteractive: true,
            interactionType: 'food'
        });
        
        // Add fuel station
        obstacles.push({
            type: 'fuel',
            x: 100,
            y: level.height * CONFIG.TILE_SIZE - 100,
            width: 40,
            height: 30,
            solid: false,
            isInteractive: true,
            interactionType: 'fuel'
        });
        
        return obstacles;
    }
    
    startGame() {
        gameState.currentLevel = 0;
        this.startLevel(0);
    }
    
    startLevel(levelIndex) {
        const level = LEVELS[levelIndex];
        if (!level) {
            console.error('Invalid level index:', levelIndex);
            return;
        }
        
        gameState.currentLevel = levelIndex;
        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.showingDialogue = false;
        
        // Reset groomer
        gameState.groomer = {
            x: level.width * CONFIG.TILE_SIZE / 2,
            y: level.height * CONFIG.TILE_SIZE - 100,
            angle: 0,
            fuel: 100,
            stamina: 100,
            isGrooming: false,
            isUsingWinch: false,
            buffs: {}
        };
        
        // Generate level
        gameState.snowGrid = this.generateLevel(levelIndex);
        gameState.obstacles = this.generateObstacles(levelIndex);
        gameState.coverage = 0;
        gameState.timeRemaining = level.timeLimit;
        
        // Update UI
        const levelName = document.getElementById('levelName');
        const levelTask = document.getElementById('levelTask');
        if (levelName) levelName.textContent = typeof t === 'function' ? t(level.nameKey) : level.nameKey;
        if (levelTask) levelTask.textContent = typeof t === 'function' ? t(level.taskKey) : level.taskKey;
        
        this.hideAllMenus();
        
        // Reset tutorial state
        gameState.tutorialStep = 0;
        gameState.tutorialTriggered = {};
        
        // Show intro dialogue if exists
        if (level.introDialogue) {
            setTimeout(() => this.showDialogue(level.introDialogue, level.introDialogue), 500);
        }
        
        if (typeof announce === 'function') {
            announce('Level ' + (levelIndex + 1) + ' started');
        }
        
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }
    
    /**
     * Check and trigger tutorial steps
     */
    checkTutorialProgress() {
        const level = LEVELS[gameState.currentLevel];
        if (!level.isTutorial || !level.tutorialSteps) return;
        
        const step = level.tutorialSteps[gameState.tutorialStep];
        if (!step || gameState.tutorialTriggered[step.trigger]) return;
        
        let shouldTrigger = false;
        
        switch (step.trigger) {
            case 'start':
                shouldTrigger = true;
                break;
            case 'moved':
                // Triggered after player moves a bit
                const startX = level.width * CONFIG.TILE_SIZE / 2;
                const startY = level.height * CONFIG.TILE_SIZE - 100;
                const dist = Math.hypot(gameState.groomer.x - startX, gameState.groomer.y - startY);
                shouldTrigger = dist > 50;
                break;
            case 'groomed':
                // Triggered after first grooming
                shouldTrigger = gameState.coverage > 0;
                break;
            case 'coverage20':
                shouldTrigger = gameState.coverage >= 20;
                break;
            case 'complete':
                shouldTrigger = gameState.coverage >= level.targetCoverage;
                break;
        }
        
        if (shouldTrigger) {
            gameState.tutorialTriggered[step.trigger] = true;
            gameState.tutorialStep++;
            
            // Small delay before showing dialogue
            setTimeout(() => {
                this.showDialogue('Jean-Pierre', step.dialogue);
            }, 300);
        }
    }
    
    nextLevel() {
        if (gameState.currentLevel < LEVELS.length - 1) {
            this.startLevel(gameState.currentLevel + 1);
        } else {
            if (typeof announce === 'function') {
                announce('Congratulations! You completed all levels!');
            }
            this.showMenu('mainMenu');
        }
    }
    
    togglePause() {
        if (!gameState.isPlaying) return;
        
        gameState.isPaused = !gameState.isPaused;
        if (gameState.isPaused) {
            this.showMenu('pauseMenu');
        } else {
            this.hideAllMenus();
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop);
        }
    }
    
    checkCollision(x, y, width, height, obstacle) {
        const ox = obstacle.x - obstacle.width / 2;
        const oy = obstacle.y - obstacle.height / 2;
        
        return x < ox + obstacle.width &&
               x + width > ox &&
               y < oy + obstacle.height &&
               y + height > oy;
    }
    
    update(dt) {
        if (!gameState.isPlaying || gameState.isPaused || gameState.showingDialogue) return;
        
        const groomer = gameState.groomer;
        const level = LEVELS[gameState.currentLevel];
        
        // Get input
        const movement = this.input.getMovement();
        groomer.isGrooming = this.input.isPressed('groom');
        groomer.isUsingWinch = level.hasWinch && this.input.isPressed('winch');
        
        // Calculate speed with buffs
        let speed = CONFIG.GROOMER_SPEED;
        if (groomer.buffs.speed) speed *= 1.5;
        if (groomer.isUsingWinch) speed *= 0.5;
        if (level.weather === 'storm' && !groomer.buffs.warmth) speed *= 0.7;
        
        // Calculate new position
        let newX = groomer.x + movement.dx * speed;
        let newY = groomer.y + movement.dy * speed;
        
        // Check collision with solid obstacles
        const groomerWidth = CONFIG.GROOMER_WIDTH;
        const groomerHeight = CONFIG.GROOMER_HEIGHT;
        
        for (const obs of gameState.obstacles) {
            if (obs.solid && this.checkCollision(
                newX - groomerWidth / 2, 
                newY - groomerHeight / 2, 
                groomerWidth, 
                groomerHeight, 
                obs
            )) {
                // Collision! Don't move
                newX = groomer.x;
                newY = groomer.y;
                break;
            }
        }
        
        // Apply movement
        if (movement.dx !== 0 || movement.dy !== 0) {
            groomer.x = newX;
            groomer.y = newY;
            groomer.angle = Math.atan2(movement.dy, movement.dx) + Math.PI / 2;
            
            // Consume fuel and stamina
            groomer.fuel -= CONFIG.FUEL_CONSUMPTION * dt;
            groomer.stamina -= CONFIG.STAMINA_CONSUMPTION * dt;
        }
        
        // Bounds
        const maxX = level.width * CONFIG.TILE_SIZE;
        const maxY = level.height * CONFIG.TILE_SIZE;
        groomer.x = Math.max(20, Math.min(maxX - 20, groomer.x));
        groomer.y = Math.max(20, Math.min(maxY - 20, groomer.y));
        
        // Grooming
        if (groomer.isGrooming && groomer.fuel > 0) {
            this.groomSnow(groomer.x, groomer.y);
        }
        
        // Check interactions
        this.checkInteractions();
        
        // Update timers
        gameState.timeRemaining -= dt;
        
        // Update coverage
        this.calculateCoverage();
        
        // Update HUD
        this.updateHUD();
        
        // Check tutorial progress
        this.checkTutorialProgress();
        
        // Check win/lose conditions
        this.checkEndConditions();
        
        // Buff timers
        for (const buff in groomer.buffs) {
            groomer.buffs[buff] -= dt;
            if (groomer.buffs[buff] <= 0) {
                delete groomer.buffs[buff];
            }
        }
        
        // Stamina regen buff
        if (groomer.buffs.staminaRegen) {
            groomer.stamina = Math.min(100, groomer.stamina + 0.1 * dt);
        }
    }
    
    groomSnow(x, y) {
        const grid = gameState.snowGrid;
        const tileSize = CONFIG.TILE_SIZE;
        const groomRadius = CONFIG.GROOM_WIDTH / 2;
        
        const startX = Math.floor((x - groomRadius) / tileSize);
        const endX = Math.ceil((x + groomRadius) / tileSize);
        const startY = Math.floor((y - groomRadius) / tileSize);
        const endY = Math.ceil((y + groomRadius) / tileSize);
        
        for (let ty = startY; ty <= endY; ty++) {
            for (let tx = startX; tx <= endX; tx++) {
                if (ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[0].length) {
                    grid[ty][tx].groomed = true;
                    grid[ty][tx].groomQuality = 100;
                }
            }
        }
    }
    
    checkInteractions() {
        const groomer = gameState.groomer;
        
        for (const obs of gameState.obstacles) {
            if (!obs.isInteractive) continue;
            
            const dist = Math.hypot(groomer.x - obs.x, groomer.y - obs.y);
            if (dist < 60) {
                if (obs.interactionType === 'fuel') {
                    groomer.fuel = Math.min(100, groomer.fuel + 0.5);
                } else if (obs.interactionType === 'food') {
                    // At restaurant - restore stamina
                    if (this.input.isPressed('groom') && !groomer.buffs.staminaRegen) {
                        groomer.stamina = 100;
                        groomer.buffs.staminaRegen = 60;
                        if (typeof announce === 'function') {
                            announce(typeof t === 'function' ? t('marieWelcome') : 'Marie welcomes you!');
                        }
                    }
                }
            }
        }
    }
    
    calculateCoverage() {
        const grid = gameState.snowGrid;
        let groomed = 0;
        let total = 0;
        
        for (const row of grid) {
            for (const cell of row) {
                total++;
                if (cell.groomed) groomed++;
            }
        }
        
        gameState.coverage = Math.round((groomed / total) * 100);
    }
    
    updateHUD() {
        const groomer = gameState.groomer;
        
        const fuelEl = document.getElementById('fuelDisplay');
        const staminaEl = document.getElementById('staminaDisplay');
        const coverageEl = document.getElementById('coverageDisplay');
        const timerEl = document.getElementById('timerDisplay');
        
        if (fuelEl) fuelEl.textContent = Math.round(groomer.fuel) + '%';
        if (staminaEl) staminaEl.textContent = Math.round(groomer.stamina) + '%';
        if (coverageEl) coverageEl.textContent = gameState.coverage + '%';
        
        if (timerEl) {
            const mins = Math.floor(Math.max(0, gameState.timeRemaining) / 60);
            const secs = Math.floor(Math.max(0, gameState.timeRemaining) % 60);
            timerEl.textContent = mins + ':' + secs.toString().padStart(2, '0');
        }
    }
    
    checkEndConditions() {
        const level = LEVELS[gameState.currentLevel];
        
        // Win
        if (gameState.coverage >= level.targetCoverage) {
            this.levelComplete();
            return;
        }
        
        // Lose
        if (gameState.timeRemaining <= 0 || gameState.groomer.fuel <= 0) {
            this.levelFailed();
        }
    }
    
    levelComplete() {
        gameState.isPlaying = false;
        
        const level = LEVELS[gameState.currentLevel];
        const timeUsed = level.timeLimit - gameState.timeRemaining;
        const mins = Math.floor(timeUsed / 60);
        const secs = Math.floor(timeUsed % 60);
        
        // Calculate rating
        let stars = 1;
        if (gameState.coverage >= 90) stars++;
        if (timeUsed < level.timeLimit * 0.7) stars++;
        
        const coverageEl = document.getElementById('finalCoverage');
        const timeEl = document.getElementById('finalTime');
        const ratingEl = document.getElementById('finalRating');
        
        if (coverageEl) coverageEl.textContent = gameState.coverage + '%';
        if (timeEl) timeEl.textContent = mins + ':' + secs.toString().padStart(2, '0');
        if (ratingEl) ratingEl.textContent = '⭐'.repeat(stars);
        
        this.showMenu('levelCompleteMenu');
        
        if (typeof announce === 'function') {
            announce('Level complete! ' + stars + ' stars');
        }
    }
    
    levelFailed() {
        gameState.isPlaying = false;
        
        const reason = gameState.groomer.fuel <= 0 ? 'outOfFuel' : 'outOfTime';
        
        if (typeof announce === 'function') {
            announce('Level failed: ' + (reason === 'outOfFuel' ? 'Out of fuel!' : 'Out of time!'));
        }
        
        this.showMenu('levelFailedMenu');
    }
    
    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        
        this.update(dt);
        this.renderer.render(gameState, LEVELS[gameState.currentLevel]);
        
        if (gameState.isPlaying && !gameState.isPaused) {
            requestAnimationFrame(this.loop);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, gameState };
}
