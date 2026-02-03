/**
 * Les Aiguilles Blanches - Renderer
 * Handles all canvas drawing operations
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        if (!this.ctx) {
            console.error('Failed to get 2D context!');
            return;
        }
        
        // Initial resize
        this.resize();
        
        // Use ResizeObserver for more reliable resize detection (Firefox-friendly)
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.resize();
            });
            const container = document.getElementById('gameContainer');
            if (container) {
                this.resizeObserver.observe(container);
            }
        }
        
        // Fallback to window resize event
        window.addEventListener('resize', () => this.resize());
        
        console.log('Renderer initialized, canvas size:', this.canvas.width, 'x', this.canvas.height);
    }
    
    resize() {
        const container = document.getElementById('gameContainer');
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || window.innerHeight;
        
        // Only resize if dimensions are valid and changed
        if (width > 0 && height > 0) {
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
                console.log('Canvas resized to:', width, 'x', height);
            }
        }
        
        // Re-apply context settings after resize
        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = false;
        }
    }
    
    /**
     * Clear the canvas and draw sky background
     * @param {Object} level - Current level configuration
     * @param {Object} settings - Game settings
     */
    clear(level, settings) {
        // First, fill with a solid color as fallback (Firefox gradient fix)
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Then draw gradient on top
        const isNight = level?.isNight;
        
        try {
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            if (isNight) {
                gradient.addColorStop(0, '#0a1628');
                gradient.addColorStop(0.5, '#1a2a4a');
                gradient.addColorStop(1, '#2a3a5a');
            } else {
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(0.3, '#B0E0E6');
                gradient.addColorStop(1, '#E8F4F8');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } catch (e) {
            console.error('Gradient error:', e);
        }
    }
    
    /**
     * Draw mountain backdrop
     * @param {boolean} isNight - Whether it's a night level
     */
    drawMountains(isNight) {
        // Background mountains
        this.ctx.fillStyle = isNight ? '#3a4a6a' : '#94A3B8';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 150);
        this.ctx.lineTo(100, 80);
        this.ctx.lineTo(200, 120);
        this.ctx.lineTo(350, 50);
        this.ctx.lineTo(500, 100);
        this.ctx.lineTo(650, 60);
        this.ctx.lineTo(800, 130);
        this.ctx.lineTo(this.canvas.width, 100);
        this.ctx.lineTo(this.canvas.width, 200);
        this.ctx.lineTo(0, 200);
        this.ctx.fill();
        
        // Snow caps
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.moveTo(340, 50);
        this.ctx.lineTo(350, 50);
        this.ctx.lineTo(360, 70);
        this.ctx.lineTo(340, 70);
        this.ctx.fill();
        
        // Additional peaks
        this.ctx.beginPath();
        this.ctx.moveTo(640, 60);
        this.ctx.lineTo(650, 60);
        this.ctx.lineTo(660, 80);
        this.ctx.lineTo(640, 80);
        this.ctx.fill();
    }
    
    /**
     * Draw the snow grid
     * @param {Array} grid - 2D array of snow tiles
     * @param {number} offsetX - Camera X offset
     * @param {number} offsetY - Camera Y offset
     * @param {Object} settings - Game settings
     */
    drawSnowGrid(grid, offsetX, offsetY, settings) {
        if (!grid || !grid.length) return;
        
        const tileSize = CONFIG.TILE_SIZE;
        
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                const screenX = x * tileSize + offsetX;
                const screenY = y * tileSize + offsetY + 180;
                
                // Skip if off screen
                if (screenX < -tileSize || screenX > this.canvas.width ||
                    screenY < -tileSize || screenY > this.canvas.height) continue;
                
                // Snow state colors
                let color;
                if (cell.groomed) {
                    color = settings.highContrast ? '#FFFFFF' : '#F0F8FF';
                    // Corduroy pattern
                    if (!settings.reducedMotion) {
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
                        this.ctx.strokeStyle = settings.highContrast ? '#CCCCCC' : '#E0E8F0';
                        this.ctx.lineWidth = 1;
                        for (let i = 2; i < tileSize; i += 4) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(screenX, screenY + i);
                            this.ctx.lineTo(screenX + tileSize, screenY + i);
                            this.ctx.stroke();
                        }
                        continue;
                    }
                } else if (cell.type === 'powder') {
                    color = settings.highContrast ? '#E8E8E8' : '#E8F4F8';
                } else if (cell.type === 'ice') {
                    color = settings.highContrast ? '#AADDFF' : '#B8E0F0';
                } else if (cell.type === 'deep') {
                    color = settings.highContrast ? '#CCCCCC' : '#D0E0E8';
                } else {
                    color = '#E0ECF0';
                }
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
            }
        }
    }
    
    /**
     * Draw obstacles (trees, rocks, buildings, etc.)
     * @param {Array} obstacles - Array of obstacle objects
     * @param {number} offsetX - Camera X offset
     * @param {number} offsetY - Camera Y offset
     * @param {Object} settings - Game settings
     */
    drawObstacles(obstacles, offsetX, offsetY, settings) {
        for (const obs of obstacles) {
            const screenX = obs.x + offsetX;
            const screenY = obs.y + offsetY + 180;
            
            if (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50) continue;
            
            this.ctx.save();
            
            switch (obs.type) {
                case 'tree':
                    this.drawTree(screenX, screenY, settings);
                    break;
                case 'rock':
                    this.drawRock(screenX, screenY, settings);
                    break;
                case 'pylon':
                    this.drawPylon(screenX, screenY, settings);
                    break;
                case 'restaurant':
                    this.drawRestaurant(screenX, screenY, settings);
                    break;
                case 'fuel':
                    this.drawFuelStation(screenX, screenY, settings);
                    break;
            }
            
            this.ctx.restore();
        }
    }
    
    drawTree(x, y, settings) {
        // SkiFree style tree
        this.ctx.fillStyle = settings.highContrast ? '#004400' : '#228B22';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 30);
        this.ctx.lineTo(x - 15, y);
        this.ctx.lineTo(x + 15, y);
        this.ctx.fill();
        
        // Trunk
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x - 3, y, 6, 10);
    }
    
    drawRock(x, y, settings) {
        this.ctx.fillStyle = settings.highContrast ? '#333333' : '#696969';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Highlight
        this.ctx.fillStyle = settings.highContrast ? '#666666' : '#888888';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 3, y - 2, 4, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawPylon(x, y, settings) {
        this.ctx.fillStyle = settings.highContrast ? '#000000' : '#444444';
        this.ctx.fillRect(x - 4, y - 40, 8, 50);
        
        // Cross bar
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(x - 15, y - 45, 30, 8);
    }
    
    drawRestaurant(x, y, settings) {
        // Chez Marie
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x - 25, y - 20, 50, 30);
        
        // Roof
        this.ctx.fillStyle = '#A52A2A';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 30, y - 20);
        this.ctx.lineTo(x, y - 40);
        this.ctx.lineTo(x + 30, y - 20);
        this.ctx.fill();
        
        // Window (lit)
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.fillRect(x - 8, y - 10, 16, 12);
        
        // Sign
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Chez Marie', x, y + 18);
    }
    
    drawFuelStation(x, y, settings) {
        this.ctx.fillStyle = '#FF4444';
        this.ctx.fillRect(x - 15, y - 20, 30, 25);
        
        // Pump
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⛽', x, y - 2);
    }
    
    /**
     * Draw the groomer vehicle
     * @param {Object} groomer - Groomer state object
     * @param {number} offsetX - Camera X offset
     * @param {number} offsetY - Camera Y offset
     * @param {Object} level - Current level
     * @param {Object} settings - Game settings
     */
    drawGroomer(groomer, offsetX, offsetY, level, settings) {
        const screenX = groomer.x + offsetX;
        const screenY = groomer.y + offsetY + 180;
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(groomer.angle);
        
        // Tracks
        this.ctx.fillStyle = settings.highContrast ? '#000000' : '#333333';
        this.ctx.fillRect(-18, -20, 8, 40);
        this.ctx.fillRect(10, -20, 8, 40);
        
        // Body
        this.ctx.fillStyle = settings.highContrast ? '#FF0000' : '#CC2200';
        this.ctx.fillRect(-14, -15, 28, 25);
        
        // Cabin
        this.ctx.fillStyle = settings.highContrast ? '#0000FF' : '#1E90FF';
        this.ctx.fillRect(-10, -10, 20, 15);
        
        // Window
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(-7, -7, 14, 8);
        
        // Tiller (rear) - glows when active
        if (groomer.isGrooming) {
            this.ctx.fillStyle = settings.highContrast ? '#FFFF00' : '#FFD700';
        } else {
            this.ctx.fillStyle = '#888888';
        }
        this.ctx.fillRect(-16, 18, 32, 8);
        
        // Blade (front)
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(-18, -24, 36, 4);
        
        // Headlights (if night)
        if (level?.isNight) {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.beginPath();
            this.ctx.arc(-8, -22, 3, 0, Math.PI * 2);
            this.ctx.arc(8, -22, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        
        // Winch cable (if using)
        if (groomer.isUsingWinch) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(screenX, screenY - 200);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    /**
     * Draw weather effects (snow particles)
     * @param {Object} level - Current level
     * @param {Object} settings - Game settings
     */
    drawWeatherEffects(level, settings) {
        if (!level || settings.reducedMotion) return;
        
        if (level.weather === 'light_snow' || level.weather === 'storm') {
            const intensity = level.weather === 'storm' ? 200 : 50;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            
            for (let i = 0; i < intensity; i++) {
                const x = (Math.random() * this.canvas.width + Date.now() * 0.1) % this.canvas.width;
                const y = (Math.random() * this.canvas.height + Date.now() * 0.2) % this.canvas.height;
                const size = level.weather === 'storm' ? 3 : 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    /**
     * Draw night visibility overlay
     * @param {Object} level - Current level
     */
    drawNightOverlay(level) {
        if (!level?.isNight) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 50,
            centerX, centerY, 200
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw collision debug overlay (for development)
     * @param {Object} groomer - Groomer state
     * @param {Array} obstacles - Obstacles array
     * @param {number} offsetX - Camera X offset
     * @param {number} offsetY - Camera Y offset
     */
    drawCollisionDebug(groomer, obstacles, offsetX, offsetY) {
        // Groomer hitbox
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        const gx = groomer.x + offsetX - CONFIG.GROOMER_WIDTH / 2;
        const gy = groomer.y + offsetY + 180 - CONFIG.GROOMER_HEIGHT / 2;
        this.ctx.strokeRect(gx, gy, CONFIG.GROOMER_WIDTH, CONFIG.GROOMER_HEIGHT);
        
        // Obstacle hitboxes
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        for (const obs of obstacles) {
            const ox = obs.x + offsetX - obs.width / 2;
            const oy = obs.y + offsetY + 180 - obs.height / 2;
            this.ctx.strokeRect(ox, oy, obs.width, obs.height);
        }
    }
    
    /**
     * Apply colorblind filter via CSS
     * @param {string} mode - Colorblind mode (none, deuteranopia, protanopia, tritanopia)
     */
    applyColorblindFilter(mode) {
        if (mode === 'none' || !mode) {
            this.canvas.style.filter = '';
            this.canvas.style.webkitFilter = '';
        } else {
            // Check if SVG filter exists before applying
            const filterEl = document.getElementById(mode);
            if (filterEl) {
                this.canvas.style.filter = `url(#${mode})`;
                this.canvas.style.webkitFilter = `url(#${mode})`;
            }
        }
    }
    
    /**
     * Main render function
     * @param {Object} gameState - Current game state
     * @param {Object} level - Current level configuration
     */
    render(gameState, level) {
        // Ensure canvas has valid dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.resize();
        }
        
        const settings = gameState?.settings || {};
        
        this.clear(level, settings);
        this.drawMountains(level?.isNight);
        
        // Calculate camera offset (center on groomer)
        const offsetX = this.canvas.width / 2 - gameState.groomer.x;
        const offsetY = this.canvas.height / 2 - gameState.groomer.y;
        
        this.drawSnowGrid(gameState.snowGrid, offsetX, offsetY, settings);
        this.drawObstacles(gameState.obstacles, offsetX, offsetY, settings);
        this.drawGroomer(gameState.groomer, offsetX, offsetY, level, settings);
        this.drawWeatherEffects(level, settings);
        this.drawNightOverlay(level);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
}
