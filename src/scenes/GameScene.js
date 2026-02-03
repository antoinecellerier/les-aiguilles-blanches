/**
 * Les Aiguilles Blanches - Game Scene
 * Main gameplay scene with grooming mechanics
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    init(data) {
        this.levelIndex = data.level || 0;
        this.level = LEVELS[this.levelIndex];
    }
    
    create() {
        const { width: screenWidth, height: screenHeight } = this.cameras.main;
        
        // Calculate tile size to fit level on screen with some margin
        // Aim for the level to fill 85% of screen, leaving room for HUD
        const marginX = 50;
        const marginY = 100; // More margin for HUD at top
        const availableWidth = screenWidth - marginX * 2;
        const availableHeight = screenHeight - marginY;
        
        const tilesByWidth = Math.floor(availableWidth / this.level.width);
        const tilesByHeight = Math.floor(availableHeight / this.level.height);
        this.tileSize = Math.max(12, Math.min(tilesByWidth, tilesByHeight, 28));
        
        // Calculate world size and center offset
        const worldWidth = this.level.width * this.tileSize;
        const worldHeight = this.level.height * this.tileSize;
        
        // Center the world on screen
        this.worldOffsetX = Math.max(0, (screenWidth - worldWidth) / 2);
        this.worldOffsetY = Math.max(marginY / 2, (screenHeight - worldHeight) / 2);
        
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        
        // Sky background
        this.cameras.main.setBackgroundColor(
            this.level.isNight ? GAME_CONFIG.COLORS.SKY_NIGHT : GAME_CONFIG.COLORS.SKY_DAY
        );
        
        // Create snow grid (sets totalTiles based on groomable area)
        this.snowGrid = [];
        this.groomedCount = 0;
        this.createSnowGrid();
        
        // Create piste boundaries (for visual definition)
        this.createPisteBoundaries(worldWidth, worldHeight);
        
        // Create obstacles
        this.obstacles = this.physics.add.staticGroup();
        this.interactables = this.physics.add.staticGroup();
        this.createObstacles();
        
        // Create groomer
        this.createGroomer();
        
        // Camera setup - if world fits on screen, don't follow
        if (worldWidth <= screenWidth && worldHeight <= screenHeight) {
            // World fits on screen - center it and don't follow
            this.cameras.main.setScroll(-this.worldOffsetX, -this.worldOffsetY);
        } else {
            // World larger than screen - follow groomer
            this.cameras.main.startFollow(this.groomer, true, 0.1, 0.1);
            this.cameras.main.setBounds(
                -this.worldOffsetX, 
                -this.worldOffsetY, 
                worldWidth + this.worldOffsetX * 2, 
                worldHeight + this.worldOffsetY * 2
            );
        }
        
        // Game state
        this.fuel = 100;
        this.stamina = 100;
        this.timeRemaining = this.level.timeLimit;
        this.isGrooming = false;
        this.buffs = {};
        
        // Winch state
        this.winchActive = false;
        this.winchCable = null;
        this.winchAnchor = null;
        
        // Avalanche state
        this.avalancheZones = [];
        this.avalancheTriggered = false;
        
        // Tutorial state
        this.tutorialStep = 0;
        this.tutorialTriggered = {};
        this.hasMoved = false;
        this.hasGroomed = false;
        
        // Create winch anchor points for levels that have winch
        if (this.level.hasWinch) {
            this.createWinchAnchors();
        }
        
        // Create avalanche zones for levels with avalanche hazard
        if (this.level.hazards && this.level.hazards.includes('avalanche')) {
            this.createAvalancheZones();
        }
        
        // Input
        this.setupInput();
        
        // Start HUD scene
        this.scene.launch('HUDScene', { 
            level: this.level,
            gameScene: this 
        });
        
        // Start dialogue scene
        this.scene.launch('DialogueScene');
        
        // Show intro dialogue
        if (this.level.introDialogue) {
            this.time.delayedCall(500, () => {
                this.showDialogue(this.level.introDialogue);
            });
        }
        
        // Timer
        this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        
        // Night overlay
        if (this.level.isNight) {
            this.createNightOverlay();
        }
        
        // Weather effects
        if (this.level.weather !== 'clear') {
            this.createWeatherEffects();
        }
        
        // Pause on ESC
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        
        Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));
    }
    
    createSnowGrid() {
        this.snowTiles = this.add.group();
        const tileSize = this.tileSize;
        
        // Define groomable area (exclude boundaries)
        // Leave 2 tiles on left/right, 3 on top, 2 on bottom
        const marginLeft = 2;
        const marginRight = 2;
        const marginTop = 3;
        const marginBottom = 2;
        
        this.groomableTiles = 0;
        
        for (let y = 0; y < this.level.height; y++) {
            this.snowGrid[y] = [];
            for (let x = 0; x < this.level.width; x++) {
                // Check if this tile is in groomable area
                const isGroomable = x >= marginLeft && 
                                   x < this.level.width - marginRight &&
                                   y >= marginTop && 
                                   y < this.level.height - marginBottom;
                
                const tile = this.add.image(
                    x * tileSize + tileSize / 2,
                    y * tileSize + tileSize / 2,
                    isGroomable ? 'snow_ungroomed' : 'snow_groomed'
                );
                tile.setDisplaySize(tileSize, tileSize);
                
                // Boundary tiles are darker/different
                if (!isGroomable) {
                    tile.setTint(0x666666);
                }
                
                this.snowGrid[y][x] = {
                    tile: tile,
                    groomed: !isGroomable, // boundaries count as already "done"
                    groomable: isGroomable
                };
                
                if (isGroomable) {
                    this.groomableTiles++;
                }
                
                this.snowTiles.add(tile);
            }
        }
        
        this.totalTiles = this.groomableTiles;
        
        // Create boundary collision walls
        this.createBoundaryColliders();
    }
    
    createBoundaryColliders() {
        // Create invisible walls at boundaries
        this.boundaryWalls = this.physics.add.staticGroup();
        this.dangerZones = this.physics.add.staticGroup();
        
        const tileSize = this.tileSize;
        const marginLeft = 2;
        const marginRight = 2;
        const marginTop = 3;
        const marginBottom = 2;
        
        const worldWidth = this.level.width * tileSize;
        const worldHeight = this.level.height * tileSize;
        
        const isDangerous = this.level.hasDangerousBoundaries;
        const sideGroup = isDangerous ? this.dangerZones : this.boundaryWalls;
        
        // Left wall/cliff
        const leftWall = this.add.rectangle(
            marginLeft * tileSize / 2, 
            worldHeight / 2, 
            marginLeft * tileSize, 
            worldHeight, 
            isDangerous ? 0x330000 : 0x000000, 
            isDangerous ? 0.3 : 0
        );
        this.physics.add.existing(leftWall, true);
        sideGroup.add(leftWall);
        
        // Right wall/cliff
        const rightWall = this.add.rectangle(
            worldWidth - marginRight * tileSize / 2, 
            worldHeight / 2, 
            marginRight * tileSize, 
            worldHeight, 
            isDangerous ? 0x330000 : 0x000000, 
            isDangerous ? 0.3 : 0
        );
        this.physics.add.existing(rightWall, true);
        sideGroup.add(rightWall);
        
        // Top wall (always safe - resort area)
        const topWall = this.add.rectangle(
            worldWidth / 2, 
            marginTop * tileSize / 2, 
            worldWidth, 
            marginTop * tileSize, 
            0x000000, 0
        );
        this.physics.add.existing(topWall, true);
        this.boundaryWalls.add(topWall);
        
        // Bottom wall
        const bottomWall = this.add.rectangle(
            worldWidth / 2, 
            worldHeight - marginBottom * tileSize / 2, 
            worldWidth, 
            marginBottom * tileSize, 
            isDangerous ? 0x330000 : 0x000000, 
            isDangerous ? 0.3 : 0
        );
        this.physics.add.existing(bottomWall, true);
        if (isDangerous) {
            this.dangerZones.add(bottomWall);
        } else {
            this.boundaryWalls.add(bottomWall);
        }
    }
    
    createPisteBoundaries(worldWidth, worldHeight) {
        // Add visual boundaries - trees along edges for realistic piste feel
        const graphics = this.add.graphics();
        
        // Forest/boundary color
        graphics.fillStyle(0x1a3a2a, 0.8);
        
        // Left boundary - irregular forest edge
        for (let y = 0; y < worldHeight; y += this.tileSize * 2) {
            const width = Phaser.Math.Between(this.tileSize, this.tileSize * 3);
            graphics.fillRect(0, y, width, this.tileSize * 2);
        }
        
        // Right boundary
        for (let y = 0; y < worldHeight; y += this.tileSize * 2) {
            const width = Phaser.Math.Between(this.tileSize, this.tileSize * 3);
            graphics.fillRect(worldWidth - width, y, width, this.tileSize * 2);
        }
        
        // Top - resort area
        graphics.fillStyle(0x2a2a2a, 0.6);
        graphics.fillRect(0, 0, worldWidth, this.tileSize * 3);
        
        // Piste markers along edges
        this.createPisteMarkers(worldWidth, worldHeight);
    }
    
    createPisteMarkers(worldWidth, worldHeight) {
        // Add piste marker poles
        const markerColor = this.getDifficultyColor();
        const markerSpacing = this.tileSize * 8;
        
        for (let y = this.tileSize * 4; y < worldHeight - this.tileSize * 4; y += markerSpacing) {
            // Left marker
            this.add.rectangle(this.tileSize * 3, y, 4, 20, markerColor);
            // Right marker
            this.add.rectangle(worldWidth - this.tileSize * 3, y, 4, 20, markerColor);
        }
    }
    
    createWinchAnchors() {
        // Create anchor points at the top of the piste where winch cable can attach
        const worldWidth = this.level.width * this.tileSize;
        const anchorY = this.tileSize * 4; // Near top of groomable area
        
        this.winchAnchors = [];
        
        // Create 3 anchor points across the top
        const anchorPositions = [
            worldWidth * 0.25,
            worldWidth * 0.5,
            worldWidth * 0.75
        ];
        
        anchorPositions.forEach((x, i) => {
            // Anchor post visual
            const post = this.add.rectangle(x, anchorY, 8, 24, 0xFFAA00);
            post.setStrokeStyle(2, 0x885500);
            
            // Anchor ring
            const ring = this.add.circle(x, anchorY - 8, 6, 0xCCCCCC);
            ring.setStrokeStyle(2, 0x888888);
            
            // Label
            this.add.text(x, anchorY + 20, '⚓' + (i + 1), {
                fontSize: '10px',
                color: '#FFD700'
            }).setOrigin(0.5);
            
            this.winchAnchors.push({ x, y: anchorY, post, ring });
        });
        
        // Create cable graphics (initially invisible)
        this.winchCableGraphics = this.add.graphics();
        this.winchCableGraphics.setDepth(50);
    }
    
    getNearestAnchor() {
        if (!this.winchAnchors || this.winchAnchors.length === 0) return null;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        this.winchAnchors.forEach(anchor => {
            const dist = Phaser.Math.Distance.Between(
                this.groomer.x, this.groomer.y,
                anchor.x, anchor.y
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = anchor;
            }
        });
        
        return nearest;
    }
    
    updateWinch() {
        if (!this.level.hasWinch) return;
        
        const isWinchPressed = this.winchKey.isDown;
        
        if (isWinchPressed && !this.winchActive) {
            // Activate winch - attach to nearest anchor
            this.winchAnchor = this.getNearestAnchor();
            if (this.winchAnchor) {
                this.winchActive = true;
                this.winchAnchor.ring.setFillStyle(0x00FF00);
                Accessibility.announce(t('winchAttached') || 'Winch attached');
            }
        } else if (!isWinchPressed && this.winchActive) {
            // Deactivate winch
            if (this.winchAnchor) {
                this.winchAnchor.ring.setFillStyle(0xCCCCCC);
            }
            this.winchActive = false;
            this.winchAnchor = null;
            this.winchCableGraphics.clear();
        }
        
        // Draw cable and apply physics
        if (this.winchActive && this.winchAnchor) {
            // Draw cable
            this.winchCableGraphics.clear();
            this.winchCableGraphics.lineStyle(3, 0x888888, 1);
            this.winchCableGraphics.beginPath();
            this.winchCableGraphics.moveTo(this.winchAnchor.x, this.winchAnchor.y);
            this.winchCableGraphics.lineTo(this.groomer.x, this.groomer.y - 10);
            this.winchCableGraphics.strokePath();
            
            // Cable tension indicator (color based on distance)
            const dist = Phaser.Math.Distance.Between(
                this.groomer.x, this.groomer.y,
                this.winchAnchor.x, this.winchAnchor.y
            );
            const maxDist = this.level.height * this.tileSize * 0.8;
            const tension = Math.min(1, dist / maxDist);
            const cableColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                { r: 136, g: 136, b: 136 },
                { r: 255, g: 100, b: 100 },
                100,
                tension * 100
            );
            this.winchCableGraphics.lineStyle(3, 
                Phaser.Display.Color.GetColor(cableColor.r, cableColor.g, cableColor.b), 1);
            this.winchCableGraphics.beginPath();
            this.winchCableGraphics.moveTo(this.winchAnchor.x, this.winchAnchor.y);
            this.winchCableGraphics.lineTo(this.groomer.x, this.groomer.y - 10);
            this.winchCableGraphics.strokePath();
        }
    }
    
    createAvalancheZones() {
        const worldWidth = this.level.width * this.tileSize;
        const worldHeight = this.level.height * this.tileSize;
        
        this.avalancheGroup = this.physics.add.staticGroup();
        
        // Create 3-4 avalanche danger zones on steep sections
        const zoneCount = 3 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < zoneCount; i++) {
            // Place zones in middle-to-upper sections (steep areas)
            const zoneX = Phaser.Math.Between(
                this.tileSize * 5, 
                worldWidth - this.tileSize * 5
            );
            const zoneY = Phaser.Math.Between(
                worldHeight * 0.2, 
                worldHeight * 0.6
            );
            const zoneWidth = Phaser.Math.Between(this.tileSize * 4, this.tileSize * 8);
            const zoneHeight = Phaser.Math.Between(this.tileSize * 6, this.tileSize * 12);
            
            // Light hazard shading on snow (subtle)
            const zoneVisual = this.add.rectangle(
                zoneX, zoneY, zoneWidth, zoneHeight,
                0xFFEEDD, 0.08
            );
            
            // === REALISTIC AVALANCHE WARNING SIGNS (Savoie style) ===
            
            // Entry warning sign (yellow diamond with black border - European standard)
            const signY = zoneY - zoneHeight/2 - 10;
            this.createAvalancheSign(zoneX, signY);
            
            // Barrier poles with flags along top edge
            const poleSpacing = zoneWidth / 3;
            for (let p = 0; p < 3; p++) {
                const poleX = zoneX - zoneWidth/2 + poleSpacing/2 + p * poleSpacing;
                this.createBarrierPole(poleX, zoneY - zoneHeight/2 + 10);
            }
            
            // Rope/cord line across top (like real closure barrier)
            const ropeGraphics = this.add.graphics();
            ropeGraphics.lineStyle(2, 0x000000, 0.6);
            ropeGraphics.beginPath();
            ropeGraphics.moveTo(zoneX - zoneWidth/2 + 5, zoneY - zoneHeight/2 + 15);
            ropeGraphics.lineTo(zoneX + zoneWidth/2 - 5, zoneY - zoneHeight/2 + 15);
            ropeGraphics.strokePath();
            
            // Risk level indicator (European 1-5 scale) - show level 4 (Fort/High)
            this.createRiskIndicator(zoneX + zoneWidth/2 + 15, zoneY - zoneHeight/2 + 30);
            
            // Exit sign at bottom
            this.add.text(zoneX, zoneY + zoneHeight/2 + 8, '🚫 ZONE FERMÉE', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '8px',
                fontStyle: 'bold',
                color: '#CC0000',
                backgroundColor: '#FFFFFF',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5).setAlpha(0.9);
            
            // Collision zone (slightly smaller than visual)
            const zone = this.add.rectangle(
                zoneX, zoneY, zoneWidth * 0.8, zoneHeight * 0.8,
                0x000000, 0
            );
            this.physics.add.existing(zone, true);
            zone.avalancheRisk = 0;
            zone.zoneVisual = zoneVisual;
            this.avalancheGroup.add(zone);
            this.avalancheZones.push(zone);
        }
        
        // Set up overlap detection
        this.physics.add.overlap(
            this.groomer,
            this.avalancheGroup,
            this.handleAvalancheZone,
            null,
            this
        );
    }
    
    createAvalancheSign(x, y) {
        // Yellow diamond warning sign (European avalanche warning standard)
        const signSize = 20;
        const g = this.add.graphics();
        
        // Diamond shape (rotated square) - yellow with black border
        g.fillStyle(0xFFCC00, 1);
        g.lineStyle(2, 0x000000, 1);
        g.beginPath();
        g.moveTo(x, y - signSize/2);           // top
        g.lineTo(x + signSize/2, y);           // right
        g.lineTo(x, y + signSize/2);           // bottom
        g.lineTo(x - signSize/2, y);           // left
        g.closePath();
        g.fillPath();
        g.strokePath();
        
        // Avalanche pictogram (simplified mountain with snow)
        g.fillStyle(0x000000, 1);
        // Mountain triangle
        g.beginPath();
        g.moveTo(x, y - 4);
        g.lineTo(x + 6, y + 5);
        g.lineTo(x - 6, y + 5);
        g.closePath();
        g.fillPath();
        
        // Snow slide lines
        g.lineStyle(1, 0x000000, 1);
        g.beginPath();
        g.moveTo(x + 2, y - 1);
        g.lineTo(x + 5, y + 3);
        g.strokePath();
        
        // Post
        g.fillStyle(0x4a3728, 1);
        g.fillRect(x - 2, y + signSize/2, 4, 12);
    }
    
    createBarrierPole(x, y) {
        const g = this.add.graphics();
        
        // Wooden pole
        g.fillStyle(0x5a4332, 1);
        g.fillRect(x - 2, y, 4, 25);
        
        // Orange/black checkered flag (French ski patrol style)
        const flagWidth = 12;
        const flagHeight = 8;
        g.fillStyle(0xFF6600, 1);
        g.fillRect(x + 2, y + 2, flagWidth, flagHeight);
        
        // Black diagonal stripe
        g.fillStyle(0x000000, 1);
        g.beginPath();
        g.moveTo(x + 2, y + 2 + flagHeight);
        g.lineTo(x + 2 + flagWidth/2, y + 2);
        g.lineTo(x + 2 + flagWidth, y + 2);
        g.lineTo(x + 2 + flagWidth, y + 2 + flagHeight/2);
        g.closePath();
        g.fillPath();
    }
    
    createRiskIndicator(x, y) {
        // European Avalanche Danger Scale indicator
        // Level 4 = Fort/High (orange)
        const g = this.add.graphics();
        const boxSize = 14;
        
        // Background
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillRect(x - boxSize/2, y - boxSize/2, boxSize, boxSize + 10);
        g.lineStyle(1, 0x000000, 0.8);
        g.strokeRect(x - boxSize/2, y - boxSize/2, boxSize, boxSize + 10);
        
        // Risk level color (4 = orange/high)
        g.fillStyle(0xFF6600, 1);
        g.fillRect(x - boxSize/2 + 2, y - boxSize/2 + 2, boxSize - 4, boxSize - 4);
        
        // Number
        this.add.text(x, y, '4', {
            fontFamily: 'Arial',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(0.5);
        
        // Label
        this.add.text(x, y + 10, 'FORT', {
            fontFamily: 'Arial',
            fontSize: '5px',
            color: '#000000'
        }).setOrigin(0.5);
    }
    
    handleAvalancheZone(groomer, zone) {
        if (this.isGameOver || this.avalancheTriggered) return;
        
        // Increase risk while in zone
        zone.avalancheRisk += 0.015;
        
        // Visual feedback - zone becomes more red/dangerous as risk increases
        const riskAlpha = 0.05 + zone.avalancheRisk * 0.4;
        zone.zoneVisual.setFillStyle(0xFF2200, Math.min(0.5, riskAlpha));
        
        // Grooming in avalanche zone greatly increases risk!
        if (this.isGrooming) {
            zone.avalancheRisk += 0.04;
        }
        
        // Camera shake warning as risk builds
        if (zone.avalancheRisk > 0.5 && zone.avalancheRisk < 0.55) {
            this.cameras.main.shake(200, 0.005);
        }
        if (zone.avalancheRisk > 0.8 && zone.avalancheRisk < 0.85) {
            this.cameras.main.shake(300, 0.01);
            this.showDialogue('avalancheWarning');
        }
        
        // Trigger avalanche if risk too high
        if (zone.avalancheRisk >= 1) {
            this.triggerAvalanche();
        }
    }
    
    triggerAvalanche() {
        if (this.avalancheTriggered) return;
        this.avalancheTriggered = true;
        
        // Visual effect - screen shake
        this.cameras.main.shake(1000, 0.02);
        
        // Avalanche particles rushing down
        const avalancheParticles = this.add.particles(0, 0, 'snow_ungroomed', {
            x: { min: 0, max: this.level.width * this.tileSize },
            y: -50,
            lifespan: 2000,
            speedY: { min: 400, max: 600 },
            speedX: { min: -50, max: 50 },
            scale: { start: 0.8, end: 0.3 },
            alpha: { start: 1, end: 0.5 },
            quantity: 20,
            frequency: 30,
            tint: 0xFFFFFF
        });
        
        this.showDialogue('avalancheTrigger');
        
        this.time.delayedCall(2000, () => {
            avalancheParticles.destroy();
            this.gameOver(false, 'avalanche');
        });
    }
    
    getDifficultyColor() {
        switch (this.level.difficulty) {
            case 'tutorial':
            case 'green': return 0x22AA22;
            case 'blue': return 0x2266CC;
            case 'red': return 0xCC2222;
            case 'black': return 0x111111;
            case 'park': return 0xFF8800;
            default: return 0x888888;
        }
    }
    
    createObstacles() {
        const obstacleTypes = this.level.obstacles || [];
        const worldWidth = this.level.width * this.tileSize;
        const worldHeight = this.level.height * this.tileSize;
        
        // Place obstacles along forest edges (more realistic)
        const obstacleCount = Math.floor(this.level.width * this.level.height / 100);
        
        for (let i = 0; i < obstacleCount; i++) {
            const type = Phaser.Utils.Array.GetRandom(obstacleTypes);
            if (!type) continue;
            
            // Place mostly along edges (forest boundary)
            let x, y;
            if (Math.random() < 0.7) {
                // Edge placement
                if (Math.random() < 0.5) {
                    x = Phaser.Math.Between(this.tileSize * 3, this.tileSize * 6);
                } else {
                    x = Phaser.Math.Between(worldWidth - this.tileSize * 6, worldWidth - this.tileSize * 3);
                }
                y = Phaser.Math.Between(this.tileSize * 5, worldHeight - this.tileSize * 5);
            } else {
                // Scattered in middle (sparse)
                x = Phaser.Math.Between(this.tileSize * 8, worldWidth - this.tileSize * 8);
                y = Phaser.Math.Between(this.tileSize * 10, worldHeight - this.tileSize * 10);
            }
            
            let texture = 'tree';
            if (type === 'rocks') texture = 'rock';
            
            const obstacle = this.obstacles.create(x, y, texture);
            obstacle.setImmovable(true);
            obstacle.setScale(this.tileSize / 16); // Scale to tile size
        }
        
        // Add restaurant (Chez Marie) at top - resort area
        const restaurant = this.interactables.create(
            worldWidth / 2 - this.tileSize * 4,
            this.tileSize * 2,
            'restaurant'
        );
        restaurant.interactionType = 'food';
        restaurant.setScale(this.tileSize / 16);
        
        // Add fuel station at base of piste
        const fuelStation = this.interactables.create(
            worldWidth / 2 + this.tileSize * 4,
            this.tileSize * 2,
            'fuel'
        );
        fuelStation.interactionType = 'fuel';
        fuelStation.setScale(this.tileSize / 16);
    }
    
    createGroomer() {
        const worldWidth = this.level.width * this.tileSize;
        const worldHeight = this.level.height * this.tileSize;
        
        // Start at bottom center of piste
        const startX = worldWidth / 2;
        const startY = worldHeight - this.tileSize * 4;
        
        this.groomer = this.physics.add.sprite(startX, startY, 'groomer');
        this.groomer.setCollideWorldBounds(true);
        this.groomer.setDrag(200);
        this.groomer.setScale(this.tileSize / 16); // Scale to match world
        
        // Collision with obstacles
        this.physics.add.collider(this.groomer, this.obstacles);
        
        // Collision with boundary walls
        this.physics.add.collider(this.groomer, this.boundaryWalls);
        
        // Overlap with danger zones (cliffs) - causes level fail
        if (this.dangerZones && this.dangerZones.getLength() > 0) {
            this.physics.add.overlap(
                this.groomer,
                this.dangerZones,
                this.handleCliffFall,
                null,
                this
            );
        }
        
        // Overlap with interactables
        this.physics.add.overlap(
            this.groomer, 
            this.interactables, 
            this.handleInteraction, 
            null, 
            this
        );
    }
    
    handleCliffFall() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        // Show warning and fail level
        this.showDialogue('cliffFall');
        this.time.delayedCall(1500, () => {
            this.gameOver(false, 'cliff');
        });
    }
    
    setupInput() {
        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.groomKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.winchKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        
        // Gamepad (check if available)
        if (this.input.gamepad) {
            this.input.gamepad.once('connected', (pad) => {
                this.gamepad = pad;
                Accessibility.announce('Gamepad connected');
            });
        }
        
        // Touch - virtual joystick would go here
        // For now, use simple touch movement
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && this.input.activePointer.id !== 0) {
                // Touch joystick logic
            }
        });
    }
    
    createNightOverlay() {
        // Create spotlight effect around groomer
        const darkness = this.add.graphics();
        darkness.fillStyle(0x000000, 0.7);
        darkness.fillRect(0, 0, 
            this.level.width * this.tileSize,
            this.level.height * this.tileSize
        );
        
        // We'd use a mask for spotlight - simplified for now
        darkness.setScrollFactor(0);
        darkness.setDepth(100);
    }
    
    createWeatherEffects() {
        if (Accessibility.settings.reducedMotion) return;
        
        const isStorm = this.level.weather === 'storm';
        const isLightSnow = this.level.weather === 'light_snow';
        
        // Snow particle configuration based on weather type
        const config = {
            storm: {
                quantity: 8,
                frequency: 50,
                speedY: { min: 150, max: 300 },
                speedX: { min: -100, max: -30 },
                scale: { start: 0.4, end: 0.1 },
                alpha: { start: 1, end: 0.3 },
                lifespan: 3000,
                tint: 0xCCDDFF
            },
            light_snow: {
                quantity: 3,
                frequency: 150,
                speedY: { min: 30, max: 80 },
                speedX: { min: -15, max: 15 },
                scale: { start: 0.25, end: 0.1 },
                alpha: { start: 0.9, end: 0.4 },
                lifespan: 5000,
                tint: 0xFFFFFF
            },
            default: {
                quantity: 2,
                frequency: 200,
                speedY: { min: 20, max: 50 },
                speedX: { min: -10, max: 10 },
                scale: { start: 0.2, end: 0.08 },
                alpha: { start: 0.7, end: 0.2 },
                lifespan: 6000,
                tint: 0xFFFFFF
            }
        };
        
        const weatherConfig = isStorm ? config.storm : 
                              isLightSnow ? config.light_snow : config.default;
        
        this.weatherParticles = this.add.particles(0, 0, 'snow_ungroomed', {
            x: { min: 0, max: this.cameras.main.width * 1.5 },
            y: -20,
            lifespan: weatherConfig.lifespan,
            speedY: weatherConfig.speedY,
            speedX: weatherConfig.speedX,
            scale: weatherConfig.scale,
            alpha: weatherConfig.alpha,
            quantity: weatherConfig.quantity,
            frequency: weatherConfig.frequency,
            tint: weatherConfig.tint,
            blendMode: 'ADD'
        });
        this.weatherParticles.setScrollFactor(0);
        this.weatherParticles.setDepth(200);
        
        // Add wind streaks for storm
        if (isStorm) {
            this.windStreaks = this.add.particles(0, 0, 'snow_ungroomed', {
                x: { min: this.cameras.main.width, max: this.cameras.main.width + 100 },
                y: { min: 0, max: this.cameras.main.height },
                lifespan: 800,
                speedX: { min: -600, max: -400 },
                speedY: { min: 50, max: 100 },
                scale: { start: 0.15, end: 0.02 },
                alpha: { start: 0.6, end: 0 },
                quantity: 2,
                frequency: 80,
                tint: 0xAABBFF,
                blendMode: 'ADD'
            });
            this.windStreaks.setScrollFactor(0);
            this.windStreaks.setDepth(199);
        }
    }
    
    update(time, delta) {
        if (this.scene.isPaused()) return;
        
        this.handleMovement();
        this.handleGrooming();
        this.updateWinch();
        this.updateResources(delta);
        this.checkTutorialProgress();
        this.checkWinCondition();
    }
    
    handleMovement() {
        const speed = GAME_CONFIG.GROOMER_SPEED * (this.buffs.speed ? 1.5 : 1);
        
        let vx = 0;
        let vy = 0;
        
        // Keyboard
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;
        
        // Gamepad
        if (this.gamepad) {
            const threshold = 0.2;
            if (Math.abs(this.gamepad.leftStick.x) > threshold) {
                vx = this.gamepad.leftStick.x * speed;
            }
            if (Math.abs(this.gamepad.leftStick.y) > threshold) {
                vy = this.gamepad.leftStick.y * speed;
            }
            if (this.gamepad.A) this.isGrooming = true;
        }
        
        // Winch physics - helps pull upward when active
        if (this.winchActive && this.winchAnchor) {
            // Apply upward assist force toward anchor
            const dx = this.winchAnchor.x - this.groomer.x;
            const dy = this.winchAnchor.y - this.groomer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 50) {
                // Winch assists movement toward anchor (helps go uphill)
                const winchForce = 0.3;
                vx += (dx / dist) * speed * winchForce;
                vy += (dy / dist) * speed * winchForce;
            }
        }
        
        this.groomer.setVelocity(vx, vy);
        
        // Rotate groomer based on movement
        if (vx !== 0 || vy !== 0) {
            this.groomer.rotation = Math.atan2(vy, vx) + Math.PI / 2;
            this.hasMoved = true;
        }
    }
    
    handleGrooming() {
        this.isGrooming = this.groomKey.isDown || (this.gamepad && this.gamepad.A);
        
        if (this.isGrooming && this.fuel > 0) {
            this.groomAtPosition(this.groomer.x, this.groomer.y);
        }
    }
    
    groomAtPosition(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        const radius = Math.ceil(GAME_CONFIG.GROOM_WIDTH / this.tileSize / 2) + 1;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = tileX + dx;
                const ty = tileY + dy;
                
                if (tx >= 0 && tx < this.level.width && 
                    ty >= 0 && ty < this.level.height) {
                    const cell = this.snowGrid[ty][tx];
                    // Only groom tiles that are groomable and not already groomed
                    if (cell.groomable && !cell.groomed) {
                        cell.groomed = true;
                        cell.tile.setTexture('snow_groomed');
                        cell.tile.clearTint();
                        this.groomedCount++;
                        this.hasGroomed = true;
                    }
                }
            }
        }
    }
    
    updateResources(delta) {
        const dt = delta / 1000;
        
        // Consume fuel while moving
        if (this.groomer.body.velocity.length() > 0) {
            this.fuel -= GAME_CONFIG.FUEL_CONSUMPTION * dt * 100;
            this.stamina -= GAME_CONFIG.STAMINA_CONSUMPTION * dt * 100;
        }
        
        // Clamp values
        this.fuel = Phaser.Math.Clamp(this.fuel, 0, 100);
        this.stamina = Phaser.Math.Clamp(this.stamina, 0, 100);
        
        // Update buff timers
        for (const buff in this.buffs) {
            this.buffs[buff] -= dt * 1000;
            if (this.buffs[buff] <= 0) {
                delete this.buffs[buff];
            }
        }
        
        // Stamina regen buff
        if (this.buffs.staminaRegen) {
            this.stamina = Math.min(100, this.stamina + 0.1);
        }
        
        // Check lose conditions
        if (this.isGameOver) return;
        
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.showDialogue('fuelEmpty');
            this.time.delayedCall(1500, () => {
                this.gameOver(false, 'fuel');
            });
        } else if (this.timeRemaining <= 0) {
            this.gameOver(false, 'time');
        }
    }
    
    updateTimer() {
        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            this.events.emit('timerUpdate', this.timeRemaining);
        }
    }
    
    handleInteraction(groomer, interactable) {
        if (interactable.interactionType === 'fuel') {
            this.fuel = Math.min(100, this.fuel + 0.5);
        } else if (interactable.interactionType === 'food') {
            if (this.groomKey.isDown && !this.buffs.staminaRegen) {
                this.stamina = 100;
                this.buffs.staminaRegen = 60000;
                Accessibility.announce(t('marieWelcome'));
            }
        }
    }
    
    getCoverage() {
        return Math.round((this.groomedCount / this.totalTiles) * 100);
    }
    
    checkTutorialProgress() {
        if (!this.level.isTutorial || !this.level.tutorialSteps) return;
        
        const step = this.level.tutorialSteps[this.tutorialStep];
        if (!step || this.tutorialTriggered[step.trigger]) return;
        
        let shouldTrigger = false;
        const coverage = this.getCoverage();
        
        switch (step.trigger) {
            case 'start':
                shouldTrigger = true;
                break;
            case 'welcomeDone':
            case 'controlsDone':
            case 'groomIntroDone':
            case 'hudDone':
                // These are auto-triggered after delay from previous step
                shouldTrigger = true;
                break;
            case 'moved':
                shouldTrigger = this.hasMoved;
                break;
            case 'groomed':
                shouldTrigger = this.hasGroomed;
                break;
            case 'coverage20':
                shouldTrigger = coverage >= 20;
                break;
            case 'coverage40':
                shouldTrigger = coverage >= 40;
                break;
            case 'complete':
                shouldTrigger = coverage >= this.level.targetCoverage;
                break;
        }
        
        if (shouldTrigger) {
            this.tutorialTriggered[step.trigger] = true;
            this.tutorialStep++;
            const delay = step.delay || 300;
            this.time.delayedCall(delay, () => {
                this.showDialogue(step.dialogue);
            });
        }
    }
    
    checkWinCondition() {
        if (this.getCoverage() >= this.level.targetCoverage) {
            this.gameOver(true);
        }
    }
    
    showDialogue(key) {
        this.scene.get('DialogueScene').showDialogue(key);
    }
    
    pauseGame() {
        this.scene.pause();
        this.scene.launch('PauseScene', { gameScene: this });
    }
    
    resumeGame() {
        this.scene.resume();
    }
    
    gameOver(won, failReason = null) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        
        this.scene.start('LevelCompleteScene', {
            won: won,
            level: this.levelIndex,
            coverage: this.getCoverage(),
            timeUsed: this.level.timeLimit - this.timeRemaining,
            failReason: failReason
        });
    }
}
