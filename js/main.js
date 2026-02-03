/**
 * Les Aiguilles Blanches - Main Entry Point
 * Initializes the game and handles page lifecycle
 */

// ============================================
// INITIALIZATION
// ============================================
function initGame() {
    // Initialize language
    const savedLang = localStorage.getItem('snowGroomer_lang');
    if (savedLang) {
        setLanguage(savedLang);
    } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (TRANSLATIONS[browserLang]) {
            setLanguage(browserLang);
        } else {
            setLanguage('fr'); // Default to French
        }
    }
    
    // Create game instance
    const game = new Game();
    
    // Force canvas resize and initial render after a short delay
    // This ensures DOM is fully ready (Firefox fix)
    setTimeout(() => {
        game.renderer.resize();
        game.renderer.render(gameState, null);
        console.log('Canvas size after init:', game.canvas.width, game.canvas.height);
    }, 100);

    // Handle visibility change (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameState.isPlaying && !gameState.isPaused) {
            game.togglePause();
        }
    });
    
    // Prevent context menu on long press (mobile)
    document.addEventListener('contextmenu', (e) => {
        if (gameState.isPlaying) {
            e.preventDefault();
        }
    });
    
    // Debug mode toggle (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
            game.debugMode = !game.debugMode;
            console.log('Debug mode:', game.debugMode);
        }
    });
    
    // Make game accessible globally for debugging
    window.game = game;
    window.gameState = gameState;
    
    console.log('🏔️ Les Aiguilles Blanches loaded');
    console.log('Version: 1.0.1');
}

// Use both DOMContentLoaded and load for maximum compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM already loaded
    initGame();
}

// Also listen for load as backup
window.addEventListener('load', () => {
    // Re-render after full page load (images, etc.)
    if (window.game) {
        window.game.renderer.resize();
        window.game.renderer.render(gameState, null);
    }
});

// ============================================
// SERVICE WORKER (for offline play - future)
// ============================================
// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/sw.js');
// }
