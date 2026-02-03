/**
 * Les Aiguilles Blanches - Localization System
 * Contains all translations and i18n utilities
 */

// ============================================
// TRANSLATIONS
// ============================================
const TRANSLATIONS = {
    fr: {
        // Menu
        subtitle: "Simulation de Damage",
        startGame: "Commencer",
        continue: "Continuer",
        settings: "Paramètres",
        controls: "Contrôles",
        howToPlay: "Comment jouer",
        
        // How to Play
        yourMission: "Votre Mission",
        missionText: "Vous êtes conducteur de dameuse à la station Les Aiguilles Blanches en Savoie. Votre travail est de préparer les pistes avant l'arrivée des skieurs chaque matin.",
        controlsText: "Déplacez-vous avec ZQSD ou les flèches. Maintenez ESPACE pour activer la fraise et damer la neige. Sur les pentes raides, utilisez MAJ pour le treuil.",
        resources: "Ressources",
        resourcesText: "Surveillez votre carburant et votre énergie ! Faites le plein à la station (⛽) et passez Chez Marie pour une tartiflette qui vous remettra d'aplomb.",
        objectives: "Objectifs",
        objectivesText: "Damez suffisamment de neige pour atteindre l'objectif de couverture avant la fin du temps. Évitez les obstacles comme les arbres, rochers et pylônes !",
        savoyard: "Conseils Savoyards",
        savoyardText: "Passez Chez Marie pour les spécialités locales : la Tartiflette restaure toute l'énergie, la Fondue régénère l'endurance, et le Vin Chaud aide dans les tempêtes !",
        
        // Settings
        language: "Langue",
        selectLanguage: "Choisir la langue",
        accessibility: "Accessibilité",
        highContrast: "Mode contraste élevé",
        colorblindMode: "Mode daltonien",
        none: "Aucun",
        reducedMotion: "Réduire les animations",
        uiScale: "Échelle de l'interface",
        audio: "Audio",
        music: "Musique",
        sfx: "Effets sonores",
        back: "Retour",
        
        // Controls
        keyboard: "Clavier",
        moveUp: "Monter",
        moveDown: "Descendre",
        moveLeft: "Aller à gauche",
        moveRight: "Aller à droite",
        groom: "Damer",
        winch: "Treuil",
        gamepadSupport: "🎮 Manette: D-pad/Stick pour bouger, A pour damer, B pour treuil",
        touchSupport: "📱 Tactile: Joystick virtuel à gauche, boutons d'action à droite",
        
        // Game
        paused: "Pause",
        resume: "Reprendre",
        quitToMenu: "Retour au menu",
        levelComplete: "Niveau terminé !",
        levelFailed: "Niveau échoué",
        tryAgain: "Réessayer",
        coverage: "Couverture",
        time: "Temps",
        rating: "Note",
        nextLevel: "Niveau suivant",
        replay: "Rejouer",
        pressContinue: "Appuyez sur Espace ou touchez pour continuer",
        
        // Levels
        tutorialName: "Tutoriel - Premiers Pas",
        tutorialTask: "Apprenez les bases du damage",
        level1Name: "Piste Verte - Les Marmottes",
        level1Task: "Damez la piste débutant",
        level2Name: "Piste Bleue - Le Chamois",
        level2Task: "Damez efficacement avant l'ouverture",
        level3Name: "Snowpark - Air Zone",
        level3Task: "Préparez les modules de freestyle",
        level4Name: "Piste Rouge - L'Aigle",
        level4Task: "Damez le terrain pentu, gérez le carburant",
        level5Name: "Half-pipe - Le Tube",
        level5Task: "Entretenez le half-pipe pour la compétition",
        level6Name: "Piste Noire - La Verticale",
        level6Task: "Opération nocturne avec treuil",
        level7Name: "Zone Avalanche - Col Dangereux",
        level7Task: "Préparez la zone à haut risque",
        level8Name: "Tempête - Récupération",
        level8Task: "Dégagez les pistes après la tempête",
        
        // Tutorial Dialogues
        tutorialIntro: "Bienvenue, recrue ! Je suis Jean-Pierre. Avant de te lancer sur les vraies pistes, on va voir les bases ensemble.",
        tutorialMove: "Utilise les touches ZQSD ou les flèches pour déplacer la dameuse. Essaie de bouger un peu !",
        tutorialGroom: "Parfait ! Maintenant, maintiens la touche ESPACE pour activer la fraise et damer la neige. Tu verras des lignes apparaître.",
        tutorialCoverage: "Tu vois le pourcentage en haut à droite ? C'est ta couverture. Continue à damer pour l'augmenter !",
        tutorialFuel: "Attention à ta jauge de carburant (⛽). Sur les vraies pistes, tu devras faire le plein à la station.",
        tutorialComplete: "Bravo ! Tu maîtrises les bases. Prêt pour ta première vraie mission sur Les Marmottes ?",
        
        // Dialogues
        jeanPierreIntro: "Bienvenue aux Aiguilles Blanches, petit ! Je suis Jean-Pierre, le chef dameur. Ce soir, tu vas apprendre les bases. Monte dans la dameuse et suis mes instructions.",
        level2Intro: "Bien joué hier ! Aujourd'hui, on passe à la piste bleue. Faut être efficace, les remontées ouvrent dans 4 minutes !",
        level3Intro: "Le snowpark a besoin d'amour. Les freestylers comptent sur toi pour des kickers parfaits. Précision !",
        level4Intro: "L'Aigle, c'est du sérieux. Pente raide, surveille ton carburant. Y'a une station en bas si besoin.",
        level5Intro: "Compétition demain ! Le half-pipe doit être impeccable. 95% minimum, pas d'excuses.",
        level6Intro: "Opération de nuit sur La Verticale. Utilise le treuil dans les passages les plus raides. Tes phares t'aideront.",
        thierryWarning: "Attention, la zone avalanche est sensible aujourd'hui. Évite les zones marquées en rouge. Soyez prudent là-haut.",
        level8Intro: "La tempête est passée mais y'a 50cm de poudreuse à dégager. Prends un vin chaud Chez Marie, ça va être long !",
        marieWelcome: "Hé, le dameur ! Viens te réchauffer Chez Marie. Une bonne tartiflette, ça te remettra d'aplomb !",
        
        // Food
        foodTartiflette: "Tartiflette",
        foodTartifletteDesc: "Restaure toute l'énergie + résistance au froid",
        foodCroziflette: "Croziflette",
        foodCrozifletteDesc: "Boost de vitesse pendant 2 min",
        foodFondue: "Fondue Savoyarde",
        foodFondueDesc: "Régénération d'endurance pendant 3 min",
        foodGenepi: "Génépi",
        foodGenepiDesc: "Précision accrue pendant 1.5 min",
        foodVinChaud: "Vin Chaud",
        foodVinChaudDesc: "Résistance aux tempêtes pendant 2.5 min",
        foodCafe: "Café",
        foodCafeDesc: "Boost d'énergie rapide"
    },
    
    en: {
        // Menu
        subtitle: "Snow Groomer Simulation",
        startGame: "Start Game",
        continue: "Continue",
        settings: "Settings",
        controls: "Controls",
        howToPlay: "How to Play",
        
        // How to Play
        yourMission: "Your Mission",
        missionText: "You are a snow groomer operator at Les Aiguilles Blanches ski resort in Savoie. Your job is to prepare the pistes before the skiers arrive each morning.",
        controlsText: "Move with WASD or Arrow keys. Hold SPACE to activate the tiller and groom the snow. On steep slopes, use SHIFT to deploy the winch.",
        resources: "Resources",
        resourcesText: "Watch your fuel and stamina! Refuel at the station (⛽) and stop by Chez Marie for a tartiflette to restore your energy.",
        objectives: "Objectives",
        objectivesText: "Groom enough snow to reach the coverage target before time runs out. Avoid obstacles like trees, rocks, and lift pylons!",
        savoyard: "Savoyard Tips",
        savoyardText: "Visit Chez Marie for local specialties: Tartiflette restores full energy, Fondue gives stamina regen, and Vin Chaud helps in storms!",
        
        // Settings
        language: "Language",
        selectLanguage: "Select Language",
        accessibility: "Accessibility",
        highContrast: "High Contrast Mode",
        colorblindMode: "Colorblind Mode",
        none: "None",
        reducedMotion: "Reduced Motion",
        uiScale: "UI Scale",
        audio: "Audio",
        music: "Music",
        sfx: "Sound Effects",
        back: "Back",
        
        // Controls
        keyboard: "Keyboard",
        moveUp: "Move Up",
        moveDown: "Move Down",
        moveLeft: "Move Left",
        moveRight: "Move Right",
        groom: "Groom",
        winch: "Winch",
        gamepadSupport: "🎮 Gamepad: D-pad/Stick to move, A to groom, B for winch",
        touchSupport: "📱 Touch: Virtual joystick on left, action buttons on right",
        
        // Game
        paused: "Paused",
        resume: "Resume",
        quitToMenu: "Quit to Menu",
        levelComplete: "Level Complete!",
        levelFailed: "Level Failed",
        tryAgain: "Try Again",
        coverage: "Coverage",
        time: "Time",
        rating: "Rating",
        nextLevel: "Next Level",
        replay: "Replay",
        pressContinue: "Press Space or tap to continue",
        
        // Levels
        tutorialName: "Tutorial - First Steps",
        tutorialTask: "Learn the basics of grooming",
        level1Name: "Green Piste - Les Marmottes",
        level1Task: "Groom the beginner slope",
        level2Name: "Blue Piste - Le Chamois",
        level2Task: "Groom efficiently before opening",
        level3Name: "Snowpark - Air Zone",
        level3Task: "Prepare freestyle features",
        level4Name: "Red Piste - L'Aigle",
        level4Task: "Groom steep terrain, manage fuel",
        level5Name: "Half-pipe - Le Tube",
        level5Task: "Maintain the half-pipe for competition",
        level6Name: "Black Piste - La Verticale",
        level6Task: "Night operation with winch",
        level7Name: "Avalanche Zone - Col Dangereux",
        level7Task: "Prepare the high-risk zone",
        level8Name: "Storm - Recovery",
        level8Task: "Clear pistes after the storm",
        
        // Tutorial Dialogues
        tutorialIntro: "Welcome, rookie! I'm Jean-Pierre. Before hitting the real slopes, let's go over the basics together.",
        tutorialMove: "Use WASD or Arrow keys to move the groomer. Try moving around a bit!",
        tutorialGroom: "Perfect! Now hold SPACE to activate the tiller and groom the snow. You'll see corduroy lines appear.",
        tutorialCoverage: "See the percentage in the top right? That's your coverage. Keep grooming to increase it!",
        tutorialFuel: "Watch your fuel gauge (⛽). On real pistes, you'll need to refuel at the station.",
        tutorialComplete: "Well done! You've mastered the basics. Ready for your first real mission on Les Marmottes?",
        
        // Dialogues
        jeanPierreIntro: "Welcome to Les Aiguilles Blanches, kid! I'm Jean-Pierre, head groomer. Tonight, you'll learn the basics. Get in the machine and follow my instructions.",
        level2Intro: "Nice work yesterday! Today we tackle the blue run. Be efficient - lifts open in 4 minutes!",
        level3Intro: "The snowpark needs love. Freestylers are counting on perfect kickers. Precision is key!",
        level4Intro: "L'Aigle is serious business. Steep slope, watch your fuel. There's a station at the bottom if needed.",
        level5Intro: "Competition tomorrow! The half-pipe must be spotless. 95% minimum, no excuses.",
        level6Intro: "Night ops on La Verticale. Use the winch on the steepest sections. Your headlights will help.",
        thierryWarning: "Careful, the avalanche zone is sensitive today. Avoid areas marked in red. Be cautious up there.",
        level8Intro: "Storm's passed but there's 50cm of powder to clear. Grab a vin chaud from Marie's - this'll take a while!",
        marieWelcome: "Hey, groomer! Come warm up at Chez Marie. A good tartiflette will get you back on your feet!",
        
        // Food
        foodTartiflette: "Tartiflette",
        foodTartifletteDesc: "Full energy restore + cold resistance",
        foodCroziflette: "Croziflette",
        foodCrozifletteDesc: "Speed boost for 2 min",
        foodFondue: "Fondue Savoyarde",
        foodFondueDesc: "Stamina regen for 3 min",
        foodGenepi: "Génépi",
        foodGenepiDesc: "Precision boost for 1.5 min",
        foodVinChaud: "Vin Chaud",
        foodVinChaudDesc: "Storm resistance for 2.5 min",
        foodCafe: "Café",
        foodCafeDesc: "Quick energy boost"
    },
    
    de: {
        subtitle: "Pistenraupe Simulation",
        startGame: "Spiel starten",
        continue: "Fortsetzen",
        settings: "Einstellungen",
        controls: "Steuerung",
        howToPlay: "Spielanleitung",
        language: "Sprache",
        selectLanguage: "Sprache wählen",
        accessibility: "Barrierefreiheit",
        highContrast: "Hoher Kontrast",
        colorblindMode: "Farbenblind-Modus",
        none: "Keine",
        reducedMotion: "Reduzierte Bewegung",
        uiScale: "UI-Größe",
        audio: "Audio",
        music: "Musik",
        sfx: "Soundeffekte",
        back: "Zurück",
        keyboard: "Tastatur",
        moveUp: "Nach oben",
        moveDown: "Nach unten",
        moveLeft: "Nach links",
        moveRight: "Nach rechts",
        groom: "Präparieren",
        winch: "Seilwinde",
        gamepadSupport: "🎮 Gamepad: D-Pad/Stick zum Bewegen, A zum Präparieren, B für Seilwinde",
        touchSupport: "📱 Touch: Virtueller Joystick links, Aktionstasten rechts",
        paused: "Pausiert",
        resume: "Fortsetzen",
        quitToMenu: "Zum Menü",
        levelComplete: "Level geschafft!",
        levelFailed: "Level fehlgeschlagen",
        tryAgain: "Nochmal versuchen",
        coverage: "Abdeckung",
        time: "Zeit",
        rating: "Bewertung",
        nextLevel: "Nächstes Level",
        replay: "Wiederholen",
        pressContinue: "Leertaste drücken oder tippen zum Fortfahren",
        level1Name: "Grüne Piste - Les Marmottes",
        level1Task: "Präpariere die Anfängerpiste",
        level2Name: "Blaue Piste - Le Chamois",
        level2Task: "Effizient präparieren vor der Öffnung",
        level3Name: "Snowpark - Air Zone",
        level3Task: "Freestyle-Features vorbereiten",
        level4Name: "Rote Piste - L'Aigle",
        level4Task: "Steiles Gelände, Kraftstoff managen",
        level5Name: "Half-pipe - Le Tube",
        level5Task: "Half-pipe für den Wettbewerb pflegen",
        level6Name: "Schwarze Piste - La Verticale",
        level6Task: "Nachteinsatz mit Seilwinde",
        level7Name: "Lawinenzone - Col Dangereux",
        level7Task: "Hochrisikozone vorbereiten",
        level8Name: "Sturm - Bergung",
        level8Task: "Pisten nach dem Sturm räumen",
        jeanPierreIntro: "Willkommen in Les Aiguilles Blanches! Ich bin Jean-Pierre, der Chefpräparierer. Heute Nacht lernst du die Grundlagen."
    },
    
    it: {
        subtitle: "Simulazione Gatto delle Nevi",
        startGame: "Inizia",
        continue: "Continua",
        settings: "Impostazioni",
        controls: "Controlli",
        howToPlay: "Come giocare",
        language: "Lingua",
        selectLanguage: "Seleziona lingua",
        accessibility: "Accessibilità",
        highContrast: "Alto contrasto",
        colorblindMode: "Modalità daltonico",
        none: "Nessuno",
        reducedMotion: "Movimento ridotto",
        uiScale: "Scala UI",
        audio: "Audio",
        music: "Musica",
        sfx: "Effetti sonori",
        back: "Indietro",
        keyboard: "Tastiera",
        moveUp: "Su",
        moveDown: "Giù",
        moveLeft: "Sinistra",
        moveRight: "Destra",
        groom: "Battipista",
        winch: "Verricello",
        paused: "Pausa",
        resume: "Riprendi",
        quitToMenu: "Esci al menu",
        levelComplete: "Livello completato!",
        levelFailed: "Livello fallito",
        tryAgain: "Riprova",
        coverage: "Copertura",
        time: "Tempo",
        rating: "Valutazione",
        nextLevel: "Prossimo livello",
        replay: "Rigioca",
        pressContinue: "Premi Spazio o tocca per continuare",
        level1Name: "Pista Verde - Les Marmottes",
        level1Task: "Prepara la pista per principianti",
        jeanPierreIntro: "Benvenuto a Les Aiguilles Blanches! Sono Jean-Pierre, il capo battipista. Stanotte imparerai le basi."
    },
    
    es: {
        subtitle: "Simulación de Pisapistas",
        startGame: "Empezar",
        continue: "Continuar",
        settings: "Ajustes",
        controls: "Controles",
        howToPlay: "Cómo jugar",
        language: "Idioma",
        selectLanguage: "Seleccionar idioma",
        accessibility: "Accesibilidad",
        highContrast: "Alto contraste",
        colorblindMode: "Modo daltónico",
        none: "Ninguno",
        reducedMotion: "Movimiento reducido",
        uiScale: "Escala UI",
        audio: "Audio",
        music: "Música",
        sfx: "Efectos de sonido",
        back: "Volver",
        keyboard: "Teclado",
        moveUp: "Arriba",
        moveDown: "Abajo",
        moveLeft: "Izquierda",
        moveRight: "Derecha",
        groom: "Pisar",
        winch: "Cabrestante",
        paused: "Pausado",
        resume: "Reanudar",
        quitToMenu: "Salir al menú",
        levelComplete: "¡Nivel completado!",
        levelFailed: "Nivel fallido",
        tryAgain: "Intentar de nuevo",
        coverage: "Cobertura",
        time: "Tiempo",
        rating: "Puntuación",
        nextLevel: "Siguiente nivel",
        replay: "Repetir",
        pressContinue: "Pulsa Espacio o toca para continuar",
        level1Name: "Pista Verde - Les Marmottes",
        level1Task: "Prepara la pista para principiantes",
        jeanPierreIntro: "¡Bienvenido a Les Aiguilles Blanches! Soy Jean-Pierre, el jefe de pisapistas. Esta noche aprenderás lo básico."
    }
};

// Current language
let currentLang = 'fr';

/**
 * Set the current language and update all localized elements
 * @param {string} lang - Language code (fr, en, de, it, es)
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('snowGroomer_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            el.textContent = TRANSLATIONS[lang][key];
        } else if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
            // Fallback to English
            el.textContent = TRANSLATIONS['en'][key];
        }
    });
}

/**
 * Get a translated string by key
 * @param {string} key - Translation key
 * @returns {string} Translated string or key if not found
 */
function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 */
function announce(message) {
    const el = document.getElementById('srAnnounce');
    if (el) {
        el.textContent = message;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TRANSLATIONS, setLanguage, t, announce };
}
