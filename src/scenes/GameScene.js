/**
 * Les Aiguilles Blanches - Game Scene
 * Main gameplay scene with grooming mechanics
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    init(data) {
        console.log('GameScene.init:', data);
        this.levelIndex = data.level || 0;
        this.level = LEVELS[this.levelIndex];
        console.log('GameScene.init: loaded level', this.levelIndex, this.level?.nameKey);
        
        if (!this.level) {
            console.error('GameScene.init: LEVEL NOT FOUND!', this.levelIndex, 'LEVELS.length:', LEVELS.length);
        }
        
        // Reset all state
        this.isGameOver = false;
        this.isTransitioning = false;
        this.isTumbling = false;
        this.steepWarningShown = false;
        this.winchActive = false;
        this.winchAnchor = null;
        this.avalancheTriggered = false;
    }
    
    create() {
        try {
            this._createLevel();
        } catch (e) {
            console.error('GameScene create error:', e);
            console.error('Level:', this.levelIndex, this.level?.nameKey);
            console.error('Stack:', e.stack);
            throw e;
        }
    }
    
    _createLevel() {
        console.log('GameScene._createLevel starting for level', this.levelIndex);
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
        console.log('Tile size:', this.tileSize, 'level size:', this.level.width, 'x', this.level.height);
        
        // Calculate world size and center offset
        const worldWidth = this.level.width * this.tileSize;
        const worldHeight = this.level.height * this.tileSize;
        
        // Center the world on screen
        this.worldOffsetX = Math.max(0, (screenWidth - worldWidth) / 2);
        this.worldOffsetY = Math.max(marginY / 2, (screenHeight - worldHeight) / 2);
        
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        console.log('World bounds set');
        
        // Sky background
        this.cameras.main.setBackgroundColor(
            this.level.isNight ? GAME_CONFIG.COLORS.SKY_NIGHT : GAME_CONFIG.COLORS.SKY_DAY
        );
        
        // Create snow grid (sets totalTiles based on groomable area)
        this.snowGrid = [];
        this.groomedCount = 0;
        console.log('Creating snow grid...');
        this.createSnowGrid();
        console.log('Snow grid created, creating piste boundaries...');
        
        // Create piste boundaries (for visual definition)
        this.createPisteBoundaries(worldWidth, worldHeight);
        console.log('Piste boundaries created, creating obstacles...');
        
        // Create obstacles
        this.obstacles = this.physics.add.staticGroup();
        this.interactables = this.physics.add.staticGroup();
        this.createObstacles();
        console.log('Obstacles created, creating groomer...');
        
        // Create groomer
        this.createGroomer();
        console.log('Groomer created, setting up camera...');
        
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
        console.log('Camera set up, initializing game state...');
        
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
        console.log('State initialized, creating winch/avalanche if needed...');
        
        // Create winch anchor points for levels that have winch
        if (this.level.hasWinch) {
            this.createWinchAnchors();
            console.log('Winch anchors created');
        }
        
        // Create avalanche zones for levels with avalanche hazard
        if (this.level.hazards && this.level.hazards.includes('avalanche')) {
            this.createAvalancheZones();
            console.log('Avalanche zones created');
        }
        
        // Input
        console.log('Setting up input...');
        this.setupInput();
        console.log('Input set up, launching HUD scene...');
        
        // Delay overlay scene launches to next frame to avoid render queue conflicts
        this.time.delayedCall(1, () => {
            // Start HUD scene
            this.scene.launch('HUDScene', { 
                level: this.level,
                gameScene: this 
            });
            console.log('HUD launched, launching Dialogue scene...');
            
            // Start dialogue scene
            this.scene.launch('DialogueScene');
            console.log('Dialogue launched');
            
            // Show intro dialogue
            if (this.level.introDialogue) {
                this.time.delayedCall(500, () => {
                    this.showDialogue(this.level.introDialogue);
                });
            }
        });
        
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
        
        console.log('GameScene._createLevel complete!');
        // Pause on ESC
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        
        Accessibility.announce(t(this.level.nameKey) + ' - ' + t(this.level.taskKey));
    }
    
    // Generate piste path based on shape type
    generatePistePath() {
        const shape = this.level.pisteShape || 'straight';
        const pisteWidth = this.level.pisteWidth || 0.5;
        const worldWidth = this.level.width;
        const worldHeight = this.level.height;
        const halfWidth = Math.floor(worldWidth * pisteWidth / 2);
        
        // Path is array of { centerX, width } for each row
        this.pistePath = [];
        
        for (let y = 0; y < worldHeight; y++) {
            const progress = y / worldHeight;
            let centerX = worldWidth / 2;
            let width = halfWidth * 2;
            
            switch (shape) {
                case 'straight':
                    // Straight corridor
                    break;
                    
                case 'gentle_curve':
                    // S-curve with gentle bends
                    centerX += Math.sin(progress * Math.PI * 2) * (worldWidth * 0.15);
                    break;
                    
                case 'winding':
                    // More pronounced curves
                    centerX += Math.sin(progress * Math.PI * 3) * (worldWidth * 0.2);
                    // Narrow at curves
                    width = halfWidth * 2 * (0.8 + 0.2 * Math.cos(progress * Math.PI * 3));
                    break;
                    
                case 'serpentine':
                    // Tight switchbacks
                    centerX += Math.sin(progress * Math.PI * 4) * (worldWidth * 0.25);
                    width = halfWidth * 2 * (0.7 + 0.3 * Math.abs(Math.cos(progress * Math.PI * 4)));
                    break;
                    
                case 'wide':
                    // Wide open area (park)
                    width = halfWidth * 2.5;
                    break;
            }
            
            this.pistePath.push({
                centerX: Math.max(halfWidth + 3, Math.min(worldWidth - halfWidth - 3, centerX)),
                width: Math.max(6, Math.floor(width))
            });
        }
    }
    
    isInPiste(x, y) {
        if (y < 3 || y >= this.level.height - 2) return false;
        if (!this.pistePath || !this.pistePath[y]) return true; // Fallback
        
        const path = this.pistePath[y];
        const halfWidth = path.width / 2;
        return x >= path.centerX - halfWidth && x < path.centerX + halfWidth;
    }
    
    createSnowGrid() {
        this.snowTiles = this.add.group();
        const tileSize = this.tileSize;
        
        // Generate piste path
        this.generatePistePath();
        
        this.groomableTiles = 0;
        
        for (let y = 0; y < this.level.height; y++) {
            this.snowGrid[y] = [];
            for (let x = 0; x < this.level.width; x++) {
                // Check if this tile is in piste path
                const isGroomable = this.isInPiste(x, y);
                
                const tile = this.add.image(
                    x * tileSize + tileSize / 2,
                    y * tileSize + tileSize / 2,
                    isGroomable ? 'snow_ungroomed' : 'snow_groomed'
                );
                tile.setDisplaySize(tileSize, tileSize);
                
                // Boundary tiles are forest/off-piste
                if (!isGroomable) {
                    tile.setTint(0x4a6741); // Forest green tint
                }
                
                this.snowGrid[y][x] = {
                    tile: tile,
                    groomed: !isGroomable,
                    groomable: isGroomable
                };
                
                if (isGroomable) {
                    this.groomableTiles++;
                }
                
                this.snowTiles.add(tile);
            }
        }
        
        this.totalTiles = this.groomableTiles;
        
        // Pre-calculate access path entry zones (needed before boundary walls)
        this.calculateAccessPathZones();
        
        // Create boundary collision walls
        this.createBoundaryColliders();
    }
    
    calculateAccessPathZones() {
        // Pre-calculate where access paths connect to the piste
        // These zones need gaps in the boundary walls
        const accessPaths = this.level.accessPaths || [];
        this.accessEntryZones = [];
        
        if (accessPaths.length === 0) return;
        
        const tileSize = this.tileSize;
        const worldHeight = this.level.height * tileSize;
        const gapWidth = tileSize * 8; // Width of gap for access
        
        accessPaths.forEach(path => {
            const entryY = path.endY * worldHeight;
            const exitY = path.startY * worldHeight;
            const onLeft = path.side === 'left';
            
            // Entry zone (bottom of access path)
            this.accessEntryZones.push({
                y: entryY,
                side: path.side,
                startY: entryY - gapWidth,
                endY: entryY + gapWidth
            });
            
            // Exit zone (top of access path)
            this.accessEntryZones.push({
                y: exitY,
                side: path.side,
                startY: exitY - gapWidth,
                endY: exitY + gapWidth
            });
        });
    }
    
    createBoundaryColliders() {
        // Create collision walls along piste edges
        this.boundaryWalls = this.physics.add.staticGroup();
        this.dangerZones = this.physics.add.staticGroup();
        
        const tileSize = this.tileSize;
        const worldWidth = this.level.width * tileSize;
        const worldHeight = this.level.height * tileSize;
        const isDangerous = this.level.hasDangerousBoundaries;
        
        // Helper to check if a Y position overlaps an access entry zone on a given side
        const isAccessZone = (yPos, side) => {
            if (!this.accessEntryZones) return false;
            const segmentTop = yPos;
            const segmentBottom = yPos + tileSize * 4;
            
            for (const zone of this.accessEntryZones) {
                if (zone.side === side && 
                    segmentTop < zone.endY && segmentBottom > zone.startY) {
                    return true;
                }
            }
            return false;
        };
        
        // Create boundary segments along the piste path edges
        const segmentHeight = tileSize * 4;
        
        for (let y = 0; y < this.level.height; y += 4) {
            if (y >= this.level.height - 2) continue;
            
            const yPos = y * tileSize;
            const path = this.pistePath[y] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
            const leftEdge = (path.centerX - path.width / 2) * tileSize;
            const rightEdge = (path.centerX + path.width / 2) * tileSize;
            
            // Left boundary wall - skip if access zone
            if (leftEdge > tileSize && !isAccessZone(yPos, 'left')) {
                const leftWall = this.add.rectangle(
                    leftEdge / 2, 
                    yPos + segmentHeight / 2,
                    leftEdge,
                    segmentHeight,
                    0x000000, 0
                );
                this.physics.add.existing(leftWall, true);
                if (isDangerous) {
                    this.dangerZones.add(leftWall);
                } else {
                    this.boundaryWalls.add(leftWall);
                }
            }
            
            // Right boundary wall - skip if access zone
            if (rightEdge < worldWidth - tileSize && !isAccessZone(yPos, 'right')) {
                const rightWall = this.add.rectangle(
                    rightEdge + (worldWidth - rightEdge) / 2,
                    yPos + segmentHeight / 2,
                    worldWidth - rightEdge,
                    segmentHeight,
                    0x000000, 0
                );
                this.physics.add.existing(rightWall, true);
                if (isDangerous) {
                    this.dangerZones.add(rightWall);
                } else {
                    this.boundaryWalls.add(rightWall);
                }
            }
        }
        
        // Top boundary (resort area - always safe)
        const topWall = this.add.rectangle(
            worldWidth / 2, 
            tileSize * 1.5, 
            worldWidth, 
            tileSize * 3, 
            0x000000, 0
        );
        this.physics.add.existing(topWall, true);
        this.boundaryWalls.add(topWall);
        
        // Bottom boundary
        const bottomWall = this.add.rectangle(
            worldWidth / 2, 
            worldHeight - tileSize, 
            worldWidth, 
            tileSize * 2, 
            0x000000, 0
        );
        this.physics.add.existing(bottomWall, true);
        if (isDangerous) {
            this.dangerZones.add(bottomWall);
        } else {
            this.boundaryWalls.add(bottomWall);
        }
    }
    
    createPisteBoundaries(worldWidth, worldHeight) {
        // Create French-style piste markers along the path edges
        this.createPisteMarkers();
        
        // Add access paths (safe routes through steep zones) - BEFORE forest so we can exclude trees
        this.createAccessPaths();
        
        // Add forest/trees on non-piste areas (excludes access paths)
        this.createForestBoundaries(worldWidth, worldHeight);
        
        // Add steep zone indicators
        this.createSteepZoneIndicators();
    }
    
    createPisteMarkers() {
        // French ski resort style: colored poles with difficulty symbols
        const tileSize = this.tileSize;
        const markerSpacing = Math.max(6, Math.floor(this.level.height / 10)); // Markers every ~10% of piste
        const markerColor = this.getDifficultyColor();
        const markerSymbol = this.getDifficultySymbol();
        
        for (let yi = 0; yi < this.level.height; yi += markerSpacing) {
            if (yi < 4 || yi >= this.level.height - 3) continue;
            
            const path = this.pistePath[yi];
            if (!path) continue;
            
            const leftX = (path.centerX - path.width / 2) * tileSize;
            const rightX = (path.centerX + path.width / 2) * tileSize;
            const y = yi * tileSize;
            
            // Left marker pole (full color - gauche)
            this.createMarkerPole(leftX - tileSize * 0.5, y, markerColor, markerSymbol, 'left');
            
            // Right marker pole (orange top section - droite)
            this.createMarkerPole(rightX + tileSize * 0.5, y, markerColor, markerSymbol, 'right');
        }
    }
    
    createMarkerPole(x, y, color, symbol, side) {
        const g = this.add.graphics();
        const poleHeight = 28;
        const poleWidth = 5;
        const orangeTopHeight = Math.floor(poleHeight * 0.15); // 15% orange top for right side
        
        // French piste marker style:
        // Left (gauche): fully piste color
        // Right (droite): piste color with orange top section
        
        if (side === 'left') {
            // Full piste color pole
            g.fillStyle(color, 1);
            g.fillRect(x - poleWidth/2, y - poleHeight, poleWidth, poleHeight);
        } else {
            // Piste color with orange top
            g.fillStyle(color, 1);
            g.fillRect(x - poleWidth/2, y - poleHeight + orangeTopHeight, poleWidth, poleHeight - orangeTopHeight);
            
            // Orange top section (15%)
            g.fillStyle(0xFF6600, 1);
            g.fillRect(x - poleWidth/2, y - poleHeight, poleWidth, orangeTopHeight);
        }
        
        // Black base/stake
        g.fillStyle(0x222222, 1);
        g.fillRect(x - poleWidth/2 - 1, y - 3, poleWidth + 2, 6);
    }
    
    getDifficultySymbol() {
        switch (this.level.difficulty) {
            case 'tutorial':
            case 'green': return '●';
            case 'blue': return '■';
            case 'red': return '◆';
            case 'black': return '◆◆';
            case 'park': return '▲';
            default: return '●';
        }
    }
    
    createForestBoundaries(worldWidth, worldHeight) {
        const tileSize = this.tileSize;
        
        // Helper to check if point is on an access path
        const isOnAccessPath = (x, y) => {
            if (!this.accessPathRects) return false;
            for (const rect of this.accessPathRects) {
                if (y >= rect.startY && y <= rect.endY &&
                    x >= rect.leftX && x <= rect.rightX) {
                    return true;
                }
            }
            return false;
        };
        
        // Draw trees/forest on off-piste areas
        for (let yi = 3; yi < this.level.height - 2; yi += 2) {
            const path = this.pistePath[yi];
            if (!path) continue;
            
            const leftEdge = (path.centerX - path.width / 2) * tileSize;
            const rightEdge = (path.centerX + path.width / 2) * tileSize;
            const y = yi * tileSize;
            
            // Left forest
            for (let tx = tileSize; tx < leftEdge - tileSize; tx += tileSize * 1.5) {
                const treeX = tx + Math.random() * tileSize;
                const treeY = y + Math.random() * tileSize;
                // Skip if on access path
                if (isOnAccessPath(treeX, treeY)) continue;
                if (Math.random() > 0.4) {
                    this.createTree(treeX, treeY);
                }
            }
            
            // Right forest
            for (let tx = rightEdge + tileSize; tx < worldWidth - tileSize; tx += tileSize * 1.5) {
                const treeX = tx + Math.random() * tileSize;
                const treeY = y + Math.random() * tileSize;
                // Skip if on access path
                if (isOnAccessPath(treeX, treeY)) continue;
                if (Math.random() > 0.4) {
                    this.createTree(treeX, treeY);
                }
            }
        }
    }
    
    createTree(x, y) {
        const g = this.add.graphics();
        const size = 8 + Math.random() * 6;
        
        // Tree trunk
        g.fillStyle(0x4a3728, 1);
        g.fillRect(x - 2, y, 4, size * 0.4);
        
        // Tree foliage (triangle-ish)
        g.fillStyle(0x1a4a2a, 1);
        g.fillRect(x - size/2, y - size * 0.6, size, size * 0.5);
        g.fillRect(x - size/3, y - size, size * 0.66, size * 0.5);
    }
    
    createSteepZoneIndicators() {
        const steepZones = this.level.steepZones || [];
        const tileSize = this.tileSize;
        const worldHeight = this.level.height * tileSize;
        
        this.steepZoneRects = [];
        
        steepZones.forEach(zone => {
            const startY = zone.startY * worldHeight;
            const endY = zone.endY * worldHeight;
            const height = endY - startY;
            
            // Get piste width at this zone
            const midYIndex = Math.floor((zone.startY + zone.endY) / 2 * this.level.height);
            const path = this.pistePath[midYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
            const leftEdge = (path.centerX - path.width / 2) * tileSize;
            const rightEdge = (path.centerX + path.width / 2) * tileSize;
            
            // Visual indicator for steep zone (diagonal lines pattern)
            const g = this.add.graphics();
            g.lineStyle(1, 0x8B4513, 0.3);
            
            // Draw slope lines
            for (let ly = startY; ly < endY; ly += tileSize) {
                g.beginPath();
                g.moveTo(leftEdge, ly);
                g.lineTo(leftEdge + 10, ly + 10);
                g.strokePath();
                
                g.beginPath();
                g.moveTo(rightEdge, ly);
                g.lineTo(rightEdge - 10, ly + 10);
                g.strokePath();
            }
            
            // Steep zone warning sign at top
            this.add.text((leftEdge + rightEdge) / 2, startY - 15, 
                '⚠️ ' + zone.slope + '°', {
                fontSize: '9px',
                color: '#FF6600',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 }
            }).setOrigin(0.5).setAlpha(0.8);
            
            // Store zone for physics
            this.steepZoneRects.push({
                startY: startY,
                endY: endY,
                leftX: leftEdge,
                rightX: rightEdge,
                slope: zone.slope
            });
        });
    }
    
    createAccessPaths() {
        const accessPaths = this.level.accessPaths || [];
        if (accessPaths.length === 0) {
            this.accessPathRects = [];
            return;
        }
        
        const tileSize = this.tileSize;
        const worldHeight = this.level.height * tileSize;
        const worldWidth = this.level.width * tileSize;
        const roadWidth = tileSize * 5; // Width between pole markers
        const poleSpacing = tileSize * 3; // Distance between poles
        
        this.accessPathRects = [];
        
        accessPaths.forEach((path, i) => {
            const entryY = path.endY * worldHeight;    // Bottom - entry point
            const exitY = path.startY * worldHeight;   // Top - exit point
            const onLeft = path.side === 'left';
            
            // Get piste center at entry and exit points
            const entryYIndex = Math.floor(path.endY * this.level.height);
            const exitYIndex = Math.floor(path.startY * this.level.height);
            const entryPath = this.pistePath[entryYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
            const exitPath = this.pistePath[exitYIndex] || { centerX: this.level.width / 2, width: this.level.width * 0.5 };
            
            // Calculate connection points on the piste
            const entryPisteX = onLeft ? 
                (entryPath.centerX - entryPath.width / 2) * tileSize :
                (entryPath.centerX + entryPath.width / 2) * tileSize;
            const exitPisteX = onLeft ?
                (exitPath.centerX - exitPath.width / 2) * tileSize :
                (exitPath.centerX + exitPath.width / 2) * tileSize;
            
            // Road extends outward from piste
            const roadExtent = tileSize * 12;
            const outerX = onLeft ? 
                Math.max(tileSize * 3, Math.min(entryPisteX, exitPisteX) - roadExtent) :
                Math.min(worldWidth - tileSize * 3, Math.max(entryPisteX, exitPisteX) + roadExtent);
            
            // Build smooth curve points using switchback pattern
            const numTurns = 3;
            const segmentHeight = (entryY - exitY) / (numTurns + 1);
            
            // Generate curve points with many segments for smoothness
            const curvePoints = [];
            const stepsPerSegment = 12;
            
            // Start on piste
            curvePoints.push({ x: entryPisteX, y: entryY });
            
            for (let t = 0; t <= numTurns; t++) {
                const targetY = entryY - (t + 0.5) * segmentHeight;
                const atOuter = (t % 2 === 0);
                const innerX = onLeft ? 
                    Math.min(entryPisteX, exitPisteX) - tileSize * 2 : 
                    Math.max(entryPisteX, exitPisteX) + tileSize * 2;
                const targetX = atOuter ? outerX : innerX;
                
                // Previous point
                const prevPoint = curvePoints[curvePoints.length - 1];
                
                // Generate smooth curve to this point
                for (let s = 1; s <= stepsPerSegment; s++) {
                    const progress = s / stepsPerSegment;
                    // Use smooth easing for S-curve effect
                    const eased = progress < 0.5 ? 
                        2 * progress * progress : 
                        1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
                    const x = prevPoint.x + (targetX - prevPoint.x) * eased;
                    const y = prevPoint.y + (targetY - prevPoint.y) * progress;
                    curvePoints.push({ x, y });
                }
            }
            
            // Curve to exit point
            const lastPoint = curvePoints[curvePoints.length - 1];
            for (let s = 1; s <= stepsPerSegment; s++) {
                const progress = s / stepsPerSegment;
                const eased = progress < 0.5 ? 
                    2 * progress * progress : 
                    1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                const x = lastPoint.x + (exitPisteX - lastPoint.x) * eased;
                const y = lastPoint.y + (exitY - lastPoint.y) * progress;
                curvePoints.push({ x, y });
            }
            
            // Build road edge points from curve for pole placement
            const leftEdge = [];
            const rightEdge = [];
            
            for (let p = 0; p < curvePoints.length; p++) {
                const curr = curvePoints[p];
                const next = curvePoints[Math.min(p + 1, curvePoints.length - 1)];
                const prev = curvePoints[Math.max(p - 1, 0)];
                
                // Direction vector (average of incoming and outgoing)
                const dx = (next.x - prev.x) / 2;
                const dy = (next.y - prev.y) / 2;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // Perpendicular offset
                const nx = -dy / len * (roadWidth / 2);
                const ny = dx / len * (roadWidth / 2);
                
                leftEdge.push({ x: curr.x + nx, y: curr.y + ny });
                rightEdge.push({ x: curr.x - nx, y: curr.y - ny });
            }
            
            // Place orange/black striped poles along both edges
            let distanceTraveled = 0;
            for (let p = 1; p < leftEdge.length; p++) {
                const prevL = leftEdge[p - 1];
                const currL = leftEdge[p];
                const prevR = rightEdge[p - 1];
                const currR = rightEdge[p];
                
                const segLen = Math.sqrt(
                    Math.pow(currL.x - prevL.x, 2) + Math.pow(currL.y - prevL.y, 2)
                );
                distanceTraveled += segLen;
                
                // Place pole every poleSpacing distance
                if (distanceTraveled >= poleSpacing) {
                    distanceTraveled = 0;
                    
                    // Left edge pole
                    this.createServiceRoadPole(currL.x, currL.y);
                    
                    // Right edge pole
                    this.createServiceRoadPole(currR.x, currR.y);
                }
            }
            
            // Store collision rects (simplified bounding boxes for segments)
            for (let p = 0; p < curvePoints.length - 1; p += 5) {
                const p1 = curvePoints[p];
                const p2 = curvePoints[Math.min(p + 5, curvePoints.length - 1)];
                this.accessPathRects.push({
                    startY: Math.min(p1.y, p2.y) - roadWidth,
                    endY: Math.max(p1.y, p2.y) + roadWidth,
                    leftX: Math.min(p1.x, p2.x) - roadWidth,
                    rightX: Math.max(p1.x, p2.x) + roadWidth
                });
            }
            
            // Entry sign
            this.add.text(entryPisteX + (onLeft ? -tileSize * 3 : tileSize * 3), entryY, 
                '🚜 ' + (t('accessPath') || 'Service Road'), {
                fontSize: '9px',
                color: '#FFAA00',
                backgroundColor: '#332200',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setAlpha(0.9).setDepth(10);
            
            // Exit sign
            this.add.text(exitPisteX + (onLeft ? -tileSize * 3 : tileSize * 3), exitY, 
                '↓ ' + (t('toPiste') || 'To Piste'), {
                fontSize: '9px',
                color: '#44FF44',
                backgroundColor: '#003300',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setAlpha(0.9).setDepth(10);
        });
    }
    
    createServiceRoadPole(x, y) {
        // French-style orange and black striped marker pole
        const g = this.add.graphics();
        g.setDepth(8);
        
        const poleHeight = 14;
        const poleWidth = 3;
        const stripeHeight = 3;
        
        // Draw alternating orange/black stripes
        for (let i = 0; i < poleHeight; i += stripeHeight) {
            const isOrange = (Math.floor(i / stripeHeight) % 2 === 0);
            g.fillStyle(isOrange ? 0xFF6600 : 0x111111, 1);
            g.fillRect(x - poleWidth / 2, y - poleHeight + i, poleWidth, stripeHeight);
        }
        
        // Reflective cap
        g.fillStyle(0xFF6600, 1);
        g.fillCircle(x, y - poleHeight, poleWidth);
    }
    
    createWinchAnchors() {
        // Create anchor points along the piste based on level definition
        const tileSize = this.tileSize;
        const anchorDefs = this.level.winchAnchors || [];
        
        this.winchAnchors = [];
        
        // Create cable graphics (always needed for winch levels)
        this.winchCableGraphics = this.add.graphics();
        this.winchCableGraphics.setDepth(50);
        
        if (anchorDefs.length === 0) {
            // Default: single anchor at top
            const anchorY = tileSize * 4;
            const path = this.pistePath[4] || { centerX: this.level.width / 2 };
            this.createAnchorPost(path.centerX * tileSize, anchorY, 1);
            return;
        }
        
        // Create anchors at specified positions along the piste
        anchorDefs.forEach((def, i) => {
            const yIndex = Math.floor(def.y * this.level.height);
            const path = this.pistePath[yIndex] || { centerX: this.level.width / 2 };
            const x = path.centerX * tileSize;
            const y = yIndex * tileSize;
            
            this.createAnchorPost(x, y, i + 1);
        });
    }
    
    createAnchorPost(x, y, number) {
        const g = this.add.graphics();
        
        // Concrete base
        g.fillStyle(0x666666, 1);
        g.fillRect(x - 10, y + 5, 20, 8);
        
        // Metal post
        g.fillStyle(0xFFAA00, 1);
        g.fillRect(x - 4, y - 20, 8, 28);
        
        // Anchor ring at top
        g.lineStyle(3, 0xCCCCCC, 1);
        g.strokeCircle(x, y - 22, 6);
        
        // Carabiner hook
        g.fillStyle(0xAAAAAA, 1);
        g.fillRect(x - 2, y - 28, 4, 8);
        
        // Label
        this.add.text(x, y + 18, '⚓' + number, {
            fontSize: '9px',
            color: '#FFD700',
            backgroundColor: '#333333',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
        
        this.winchAnchors.push({ x, y: y - 22, number });
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
                Accessibility.announce(t('winchAttached') || 'Winch attached');
            }
        } else if (!isWinchPressed && this.winchActive) {
            // Deactivate winch
            this.winchActive = false;
            this.winchAnchor = null;
            if (this.winchCableGraphics) {
                this.winchCableGraphics.clear();
            }
        }
        
        // Draw cable and apply physics
        if (this.winchActive && this.winchAnchor && this.winchCableGraphics) {
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
        
        // Start at bottom of piste - use actual piste path center
        // Use a row well within the piste, away from boundaries
        const bottomYIndex = Math.min(this.level.height - 8, Math.floor(this.level.height * 0.9));
        const bottomPath = this.pistePath[bottomYIndex] || { centerX: this.level.width / 2 };
        const startX = bottomPath.centerX * this.tileSize;
        const startY = bottomYIndex * this.tileSize;
        
        console.log('Groomer spawn:', { startX, startY, bottomYIndex, 
            pathCenter: bottomPath.centerX, pathWidth: bottomPath.width,
            levelWidth: this.level.width, tileSize: this.tileSize });
        
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
        if (this.scene.isPaused() || this.isGameOver || this.isTransitioning) return;
        
        this.handleMovement();
        this.handleGrooming();
        this.updateWinch();
        this.checkSteepness();
        this.updateResources(delta);
        this.checkTutorialProgress();
        this.checkWinCondition();
    }
    
    checkSteepness() {
        if (!this.steepZoneRects || this.steepZoneRects.length === 0) return;
        if (this.isGameOver || this.isTumbling) return;
        
        const groomerY = this.groomer.y;
        const groomerX = this.groomer.x;
        
        // Check if groomer is on an access path (safe route)
        if (this.accessPathRects) {
            for (const path of this.accessPathRects) {
                if (groomerY >= path.startY && groomerY <= path.endY &&
                    groomerX >= path.leftX && groomerX <= path.rightX) {
                    // On access path - safe from steep zone effects
                    this.steepWarningShown = false;
                    return;
                }
            }
        }
        
        // Check if groomer is in a steep zone
        for (const zone of this.steepZoneRects) {
            if (groomerY >= zone.startY && groomerY <= zone.endY &&
                groomerX >= zone.leftX && groomerX <= zone.rightX) {
                
                // In steep zone - check if winch is active
                if (!this.winchActive) {
                    // Slope threshold: 40+ degrees requires winch
                    if (zone.slope >= 40) {
                        this.triggerTumble(zone.slope);
                        return;
                    }
                    // 30-40 degrees: slide downhill slowly
                    else if (zone.slope >= 30) {
                        // Apply downhill force
                        const slideSpeed = (zone.slope - 25) * 2;
                        this.groomer.setVelocityY(this.groomer.body.velocity.y + slideSpeed);
                        
                        // Show warning once
                        if (!this.steepWarningShown) {
                            this.steepWarningShown = true;
                            this.showDialogue('steepWarning');
                        }
                    }
                }
                return;
            }
        }
        
        // Reset warning flag when leaving steep zone
        this.steepWarningShown = false;
    }
    
    triggerTumble(slope) {
        if (this.isTumbling) return;
        this.isTumbling = true;
        
        // Groomer tumbles down the slope
        this.cameras.main.shake(500, 0.015);
        
        // Spin the groomer
        this.tweens.add({
            targets: this.groomer,
            rotation: this.groomer.rotation + Math.PI * 4,
            duration: 1500,
            ease: 'Power2'
        });
        
        // Slide downhill rapidly
        this.groomer.setVelocity(0, 300);
        
        this.showDialogue('tumble');
        
        this.time.delayedCall(2000, () => {
            this.gameOver(false, 'tumble');
        });
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
    
    transitionToLevel(nextLevel) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.isGameOver = true; // Prevent any more updates
        
        console.log('GameScene.transitionToLevel:', nextLevel);
        
        // Store reference to game
        const game = this.game;
        
        // Stop scenes first (don't remove yet - they need to finish stopping)
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.scene.stop('GameScene');
        
        // Remove and re-add ALL scenes after they've stopped
        setTimeout(() => {
            console.log('GameScene.transitionToLevel: removing and restarting scenes for level', nextLevel);
            
            // Remove old scenes to clear corrupted textures
            try {
                game.scene.remove('HUDScene');
                game.scene.remove('DialogueScene');
                game.scene.remove('GameScene');
            } catch (e) {
                console.warn('Scene removal warning:', e.message);
            }
            
            // Re-add fresh scene instances
            game.scene.add('GameScene', GameScene, false);
            game.scene.add('HUDScene', HUDScene, false);
            game.scene.add('DialogueScene', DialogueScene, false);
            
            // Start GameScene with new level
            game.scene.start('GameScene', { level: nextLevel });
        }, 100);
    }
    
    returnToMenu() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.isGameOver = true;
        
        const game = this.game;
        
        // Stop scenes first
        this.scene.stop('HUDScene');
        this.scene.stop('DialogueScene');
        this.scene.stop('GameScene');
        
        setTimeout(() => {
            // Remove and re-add all game scenes
            try {
                game.scene.remove('HUDScene');
                game.scene.remove('DialogueScene');
                game.scene.remove('GameScene');
            } catch (e) {
                console.warn('Scene removal warning:', e.message);
            }
            
            game.scene.add('GameScene', GameScene, false);
            game.scene.add('HUDScene', HUDScene, false);
            game.scene.add('DialogueScene', DialogueScene, false);
            
            game.scene.start('MenuScene');
        }, 100);
    }
    
    shutdown() {
        console.log('GameScene.shutdown');
        
        // Stop all tweens and timers
        this.tweens.killAll();
        this.time.removeAllEvents();
        
        // Destroy all children to remove from render batch
        this.children.removeAll(true);
        
        // Clean up specific resources
        this.winchCableGraphics = null;
        this.weatherParticles = null;
        this.windStreaks = null;
    }
}
