/**
 * Les Aiguilles Blanches - Localization
 * Multi-language support for Phaser 3 version
 */

let currentLang = 'fr';

const TRANSLATIONS = {
    fr: {
        // Menu
        subtitle: "Simulation de Damage",
        startGame: "Commencer",
        continue: "Continuer",
        settings: "Paramètres",
        controls: "Contrôles",
        howToPlay: "Comment jouer",
        back: "Retour",
        backToGame: "Retour au jeu",
        
        // Settings
        language: "Langue",
        accessibility: "Accessibilité",
        highContrast: "Contraste élevé",
        reducedMotion: "Mouvement réduit",
        colorblindMode: "Daltonisme",
        none: "Aucun",
        deuteranopia: "Deutér.",
        protanopia: "Protan.",
        tritanopia: "Tritan.",
        
        // Controls
        move: "Déplacer",
        moveUp: "Haut",
        moveDown: "Bas",
        moveLeft: "Gauche",
        moveRight: "Droite",
        groom: "Damer",
        winch: "Treuil",
        pause: "Pause",
        clickToRebind: "Cliquer pour modifier",
        pressKey: "Appuyez sur une touche...",
        saved: "Sauvegardé !",
        resetControls: "Réinitialiser",
        controlsReset: "Contrôles réinitialisés !",
        gamepadSupported: "Manette OK",
        touchSupported: "Tactile OK",
        
        // Winch
        winchAttached: "🔗 Treuil attaché ! Maintenir SHIFT pour assistance.",
        winchHint: "Appuyez sur SHIFT près d'un ancrage ⚓ pour utiliser le treuil",
        accessPath: "Route de service",
        toPiste: "Vers la piste",
        
        // Taunts
        tauntCliff1: "La gravité, c'est pas ton truc ?",
        tauntCliff2: "Jean-Pierre va devoir expliquer ça à l'assurance...",
        tauntCliff3: "Le ravin était pourtant bien visible !",
        tauntFuel1: "Tu as oublié où était la station-service ?",
        tauntFuel2: "Même les marmottes savent faire le plein...",
        tauntFuel3: "La prochaine fois, vérifie la jauge AVANT de partir !",
        tauntTime1: "Les skieurs arrivent... et la piste n'est pas prête !",
        tauntTime2: "Tu damais quoi, des croissants ?",
        tauntTime3: "Jean-Pierre est très déçu. Très, très déçu.",
        
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
        pauseTitle: "⏸️ Pause",
        restart: "Recommencer",
        quit: "Quitter",
        menu: "Menu",
        target: "Objectif",
        tutorial: "Tutoriel",
        timeUsed: "Temps utilisé",
        excellent: "Excellent !",
        good: "Bien joué !",
        passed: "Réussi",
        retry: "Réessayer",
        gameComplete: "Jeu terminé !",
        viewCredits: "Voir les crédits",
        creditsTitle: "Félicitations !",
        creditsSubtitle: "Vous avez maîtrisé Les Aiguilles Blanches",
        playAgain: "Rejouer",
        skipCredits: "Appuyez sur une touche pour passer",
        
        // Tutorial - Step by step
        tutorialName: "Tutoriel - Premiers Pas",
        tutorialTask: "Apprenez les bases du damage",
        tutorialIntro: "Bienvenue aux Aiguilles Blanches !",
        tutorialWelcome: "🏔️ Bienvenue, recrue ! Je suis Jean-Pierre, chef dameur. Je vais t'apprendre le métier.",
        tutorialControls: "🎮 CONTRÔLES : Utilise WASD ou les flèches ↑↓←→ pour déplacer la dameuse.",
        tutorialMove: "👆 ESSAIE : Déplace-toi sur la piste. La neige blanche doit être damée !",
        tutorialGroomIntro: "✅ Bien joué ! Maintenant, passons au damage.",
        tutorialGroomAction: "❄️ DAMER : Maintiens ESPACE tout en te déplaçant pour transformer la neige en piste damée.",
        tutorialCoverage: "📊 Tu vois ? La neige devient plus lisse ! Continue à damer la piste.",
        tutorialHUD: "📈 INTERFACE : En haut à gauche : ⛽ Carburant, 💪 Endurance, ❄️ Couverture. En haut à droite : ⏱️ Temps et 🎯 Objectif.",
        tutorialGoal: "🎯 OBJECTIF : Dame au moins 40% de la piste avant la fin du temps. Les skieurs arrivent bientôt !",
        tutorialFuel: "⛽ CARBURANT : Se déplacer consomme du carburant. En mission, visite la station-service !",
        tutorialComplete: "🏆 Bravo ! Tu maîtrises les bases. Prêt pour ta première vraie mission sur la Piste Verte ?",
        
        // Levels
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
        
        // Hazards
        cliffFall: "⚠️ ATTENTION ! Vous êtes tombé dans le ravin ! Mission échouée.",
        fuelEmpty: "⛽ PANNE SÈCHE ! Plus une goutte de diesel...",
        avalancheZone: "ZONE AVALANCHE",
        avalancheWarning: "⚠️ DANGER ! Le manteau neigeux est instable ! Sortez de la zone !",
        avalancheTrigger: "🏔️💨 AVALANCHE DÉCLENCHÉE ! Évacuation impossible !",
        steepWarning: "⚠️ PENTE RAIDE ! Utilisez le treuil (SHIFT) ou vous allez glisser !",
        tumble: "🔄 TONNEAU ! La dameuse a basculé sur la pente !",
        tauntTumble1: "La physique, ça s'apprend...",
        tauntTumble2: "Le treuil existe pour une raison, tu sais.",
        tauntTumble3: "Jean-Pierre t'avait pourtant dit d'utiliser le câble !",
        tauntAvalanche1: "Tu as réveillé la montagne... Elle n'est pas contente.",
        tauntAvalanche2: "Les pisteurs t'avaient pourtant prévenu !",
        tauntAvalanche3: "La neige, ça se respecte. Maintenant tu sais.",
        
        // Dialogues
        jeanPierreIntro: "Bienvenue aux Aiguilles Blanches, petit ! Je suis Jean-Pierre, le chef dameur.",
        level2Intro: "Bien joué hier ! Aujourd'hui, on passe à la piste bleue.",
        level3Intro: "Le snowpark a besoin d'amour. Précision !",
        level4Intro: "L'Aigle, c'est du sérieux. Surveille ton carburant.",
        level5Intro: "Compétition demain ! Le half-pipe doit être impeccable.",
        level6Intro: "Opération de nuit sur La Verticale. Utilise le treuil.",
        thierryWarning: "Attention, la zone avalanche est sensible. Soyez prudent.",
        level8Intro: "La tempête est passée. Prends un vin chaud, ça va être long !",
        marieWelcome: "Viens te réchauffer Chez Marie. Une bonne tartiflette !"
    },
    
    en: {
        subtitle: "Snow Groomer Simulation",
        startGame: "Start Game",
        continue: "Continue",
        settings: "Settings",
        controls: "Controls",
        howToPlay: "How to Play",
        back: "Back",
        
        // Settings
        language: "Language",
        accessibility: "Accessibility",
        highContrast: "High Contrast",
        reducedMotion: "Reduced Motion",
        colorblindMode: "Colorblind",
        none: "None",
        deuteranopia: "Deutan.",
        protanopia: "Protan.",
        tritanopia: "Tritan.",
        uiScale: "UI Scale",
        move: "Move",
        groom: "Groom",
        winch: "Winch",
        pause: "Pause",
        gamepadSupported: "Gamepad OK",
        touchSupported: "Touch OK",
        
        // Winch
        winchAttached: "🔗 Winch attached! Hold SHIFT for assistance.",
        winchHint: "Press SHIFT near an anchor ⚓ to use winch",
        accessPath: "Service Road",
        
        // Taunts
        tauntCliff1: "Gravity isn't your strong suit, is it?",
        tauntCliff2: "Jean-Pierre will have to explain this to insurance...",
        tauntCliff3: "The cliff was clearly visible!",
        tauntFuel1: "Forgot where the fuel station was?",
        tauntFuel2: "Even the marmots know how to refuel...",
        tauntFuel3: "Next time, check the gauge BEFORE leaving!",
        tauntTime1: "Skiers are arriving... and the piste isn't ready!",
        tauntTime2: "Were you grooming croissants?",
        tauntTime3: "Jean-Pierre is very disappointed. Very, very disappointed.",
        
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
        pauseTitle: "⏸️ Paused",
        restart: "Restart",
        quit: "Quit",
        menu: "Menu",
        target: "Target",
        tutorial: "Tutorial",
        timeUsed: "Time Used",
        excellent: "Excellent!",
        good: "Well done!",
        passed: "Passed",
        retry: "Retry",
        gameComplete: "Game Complete!",
        viewCredits: "View Credits",
        creditsTitle: "Congratulations!",
        creditsSubtitle: "You have mastered Les Aiguilles Blanches",
        playAgain: "Play Again",
        skipCredits: "Press any key to skip",
        
        tutorialName: "Tutorial - First Steps",
        tutorialTask: "Learn the basics of grooming",
        tutorialIntro: "Welcome, rookie! I'm Jean-Pierre. Let's go over the basics together.",
        tutorialMove: "Use WASD or Arrow keys to move the groomer. Try moving around!",
        // Tutorial - Step by step
        tutorialName: "Tutorial - First Steps",
        tutorialTask: "Learn grooming basics",
        tutorialIntro: "Welcome to Les Aiguilles Blanches!",
        tutorialWelcome: "🏔️ Welcome, rookie! I'm Jean-Pierre, head groomer. I'll teach you the trade.",
        tutorialControls: "🎮 CONTROLS: Use WASD or arrow keys ↑↓←→ to move the groomer.",
        tutorialMove: "👆 TRY IT: Move around the piste. The white snow needs to be groomed!",
        tutorialGroomIntro: "✅ Nice! Now let's learn to groom.",
        tutorialGroomAction: "❄️ GROOMING: Hold SPACE while moving to transform snow into a smooth piste.",
        tutorialCoverage: "📊 See? The snow becomes smoother! Keep grooming the piste.",
        tutorialHUD: "📈 HUD: Top-left: ⛽ Fuel, 💪 Stamina, ❄️ Coverage. Top-right: ⏱️ Time and 🎯 Target.",
        tutorialGoal: "🎯 GOAL: Groom at least 40% of the piste before time runs out. Skiers are coming!",
        tutorialFuel: "⛽ FUEL: Moving uses fuel. On missions, visit the fuel station!",
        tutorialComplete: "🏆 Well done! You've mastered the basics. Ready for your first real mission on the Green Piste?",
        
        level1Name: "Green Piste - Les Marmottes",
        level1Task: "Groom the beginner slope",
        level2Name: "Blue Piste - Le Chamois",
        level2Task: "Groom efficiently before opening",
        level3Name: "Snowpark - Air Zone",
        level3Task: "Prepare freestyle features",
        level4Name: "Red Piste - L'Aigle",
        level4Task: "Groom steep terrain, manage fuel",
        level5Name: "Half-pipe - Le Tube",
        level5Task: "Maintain the half-pipe",
        level6Name: "Black Piste - La Verticale",
        level6Task: "Night operation with winch",
        level7Name: "Avalanche Zone - Col Dangereux",
        level7Task: "Prepare the high-risk zone",
        level8Name: "Storm - Recovery",
        level8Task: "Clear pistes after the storm",
        
        // Hazards
        cliffFall: "⚠️ WARNING! You fell off the cliff! Mission failed.",
        fuelEmpty: "⛽ OUT OF FUEL! Not a drop of diesel left...",
        avalancheZone: "AVALANCHE ZONE",
        avalancheWarning: "⚠️ DANGER! Snowpack is unstable! Leave the zone!",
        avalancheTrigger: "🏔️💨 AVALANCHE TRIGGERED! No escape!",
        steepWarning: "⚠️ STEEP SLOPE! Use the winch (SHIFT) or you'll slide!",
        tumble: "🔄 ROLLOVER! The groomer tumbled on the slope!",
        tauntTumble1: "Physics lessons are expensive...",
        tauntTumble2: "The winch exists for a reason, you know.",
        tauntTumble3: "Jean-Pierre told you to use the cable!",
        tauntAvalanche1: "You woke the mountain... She's not happy.",
        tauntAvalanche2: "The ski patrol warned you!",
        tauntAvalanche3: "Snow demands respect. Now you know.",
        
        jeanPierreIntro: "Welcome to Les Aiguilles Blanches! I'm Jean-Pierre, head groomer.",
        level2Intro: "Nice work! Today we tackle the blue run.",
        level3Intro: "The snowpark needs love. Precision is key!",
        level4Intro: "L'Aigle is serious. Watch your fuel.",
        level5Intro: "Competition tomorrow! Half-pipe must be spotless.",
        level6Intro: "Night ops on La Verticale. Use the winch.",
        thierryWarning: "Careful, avalanche zone is sensitive today.",
        level8Intro: "Storm's passed. Grab a vin chaud - this'll take a while!",
        marieWelcome: "Come warm up at Chez Marie. A good tartiflette!"
    },
    
    de: {
        subtitle: "Pistenraupe Simulation",
        startGame: "Spiel starten",
        continue: "Fortfahren",
        settings: "Einstellungen",
        controls: "Steuerung",
        howToPlay: "Anleitung",
        back: "Zurück",
        
        // Settings
        language: "Sprache",
        accessibility: "Barrierefreiheit",
        highContrast: "Hoher Kontrast",
        reducedMotion: "Weniger Bewegung",
        colorblindMode: "Farbenblind",
        none: "Keine",
        deuteranopia: "Deuteran.",
        protanopia: "Protan.",
        tritanopia: "Tritan.",
        move: "Bewegen",
        groom: "Präparieren",
        winch: "Winde",
        pause: "Pause",
        gamepadSupported: "Gamepad OK",
        touchSupported: "Touch OK",
        
        // Game
        paused: "Pausiert",
        resume: "Fortsetzen",
        quitToMenu: "Zum Menü",
        levelComplete: "Level geschafft!",
        levelFailed: "Level fehlgeschlagen",
        tryAgain: "Nochmal",
        coverage: "Abdeckung",
        time: "Zeit",
        target: "Ziel",
        
        // Levels - Tutorial step by step
        tutorialName: "Tutorial - Erste Schritte",
        tutorialTask: "Grundlagen lernen",
        tutorialIntro: "Willkommen in Les Aiguilles Blanches!",
        tutorialWelcome: "🏔️ Willkommen, Neuling! Ich bin Jean-Pierre, Chefpräparierer. Ich bringe dir das Handwerk bei.",
        tutorialControls: "🎮 STEUERUNG: Benutze WASD oder Pfeiltasten ↑↓←→ um den Pistenbully zu bewegen.",
        tutorialMove: "👆 PROBIER ES: Bewege dich auf der Piste. Der weiße Schnee muss präpariert werden!",
        tutorialGroomIntro: "✅ Gut gemacht! Jetzt lernen wir das Präparieren.",
        tutorialGroomAction: "❄️ PRÄPARIEREN: Halte LEERTASTE während der Fahrt, um den Schnee zu glätten.",
        tutorialCoverage: "📊 Siehst du? Der Schnee wird glatter! Präpariere weiter!",
        tutorialHUD: "📈 ANZEIGE: Oben links: ⛽ Kraftstoff, 💪 Ausdauer, ❄️ Abdeckung. Oben rechts: ⏱️ Zeit und 🎯 Ziel.",
        tutorialGoal: "🎯 ZIEL: Präpariere mindestens 40% der Piste vor Zeitablauf. Die Skifahrer kommen!",
        tutorialFuel: "⛽ KRAFTSTOFF: Fahren verbraucht Kraftstoff. Bei Missionen zur Tankstelle!",
        tutorialComplete: "🏆 Super! Du beherrschst die Grundlagen. Bereit für deine erste Mission auf der Grünen Piste?",
        level1Name: "Grüne Piste - Les Marmottes",
        level1Task: "Präpariere die Anfängerpiste",
        level2Name: "Blaue Piste - Le Chamois",
        level2Task: "Präpariere effizient vor der Öffnung",
        
        // Hazards
        cliffFall: "⚠️ ACHTUNG! Sie sind in die Schlucht gefallen! Mission gescheitert."
    },
    
    it: {
        subtitle: "Simulazione Gatto delle Nevi",
        startGame: "Inizia",
        continue: "Continua",
        settings: "Impostazioni",
        controls: "Comandi",
        howToPlay: "Come Giocare",
        back: "Indietro",
        
        // Settings
        language: "Lingua",
        accessibility: "Accessibilità",
        highContrast: "Alto Contrasto",
        reducedMotion: "Meno Movimento",
        colorblindMode: "Daltonismo",
        none: "Nessuno",
        deuteranopia: "Deuteran.",
        protanopia: "Protan.",
        tritanopia: "Tritan.",
        move: "Muovi",
        groom: "Battipista",
        winch: "Verricello",
        pause: "Pausa",
        gamepadSupported: "Gamepad OK",
        touchSupported: "Touch OK",
        
        // Game
        paused: "Pausa",
        resume: "Riprendi",
        quitToMenu: "Torna al Menu",
        levelComplete: "Livello completato!",
        levelFailed: "Livello fallito",
        tryAgain: "Riprova",
        coverage: "Copertura",
        time: "Tempo",
        target: "Obiettivo",
        
        // Levels - Tutorial step by step
        tutorialName: "Tutorial - Primi Passi",
        tutorialTask: "Impara le basi",
        tutorialIntro: "Benvenuto a Les Aiguilles Blanches!",
        tutorialWelcome: "🏔️ Benvenuto, novellino! Sono Jean-Pierre, capo gattista. Ti insegnerò il mestiere.",
        tutorialControls: "🎮 COMANDI: Usa WASD o le frecce ↑↓←→ per muovere il gatto delle nevi.",
        tutorialMove: "👆 PROVA: Muoviti sulla pista. La neve bianca deve essere battuta!",
        tutorialGroomIntro: "✅ Ottimo! Ora impariamo a battere la neve.",
        tutorialGroomAction: "❄️ BATTIPISTA: Tieni SPAZIO mentre ti muovi per lisciare la neve.",
        tutorialCoverage: "📊 Vedi? La neve diventa più liscia! Continua a battere!",
        tutorialHUD: "📈 HUD: In alto a sinistra: ⛽ Carburante, 💪 Resistenza, ❄️ Copertura. In alto a destra: ⏱️ Tempo e 🎯 Obiettivo.",
        tutorialGoal: "🎯 OBIETTIVO: Batti almeno il 40% della pista prima che scada il tempo. Gli sciatori stanno arrivando!",
        tutorialFuel: "⛽ CARBURANTE: Muoversi consuma carburante. Durante le missioni, visita la stazione di servizio!",
        tutorialComplete: "🏆 Bravo! Hai imparato le basi. Pronto per la tua prima missione sulla Pista Verde?",
        level1Name: "Pista Verde - Les Marmottes",
        level1Task: "Prepara la pista principianti",
        level2Name: "Pista Blu - Le Chamois",
        level2Task: "Prepara prima dell'apertura",
        
        // Hazards
        cliffFall: "⚠️ ATTENZIONE! Sei caduto nel dirupo! Missione fallita."
    },
    
    es: {
        subtitle: "Simulación de Pisapistas",
        startGame: "Empezar",
        continue: "Continuar",
        settings: "Ajustes",
        controls: "Controles",
        howToPlay: "Cómo Jugar",
        back: "Volver",
        
        // Settings
        language: "Idioma",
        accessibility: "Accesibilidad",
        highContrast: "Alto Contraste",
        reducedMotion: "Menos Movimiento",
        colorblindMode: "Daltonismo",
        none: "Ninguno",
        deuteranopia: "Deuteran.",
        protanopia: "Protan.",
        tritanopia: "Tritan.",
        move: "Mover",
        groom: "Pisar",
        winch: "Cabrestante",
        pause: "Pausa",
        gamepadSupported: "Gamepad OK",
        touchSupported: "Táctil OK",
        
        // Game
        paused: "Pausado",
        resume: "Reanudar",
        quitToMenu: "Volver al Menú",
        levelComplete: "¡Nivel completado!",
        levelFailed: "Nivel fallido",
        tryAgain: "Reintentar",
        coverage: "Cobertura",
        time: "Tiempo",
        target: "Objetivo",
        
        // Levels - Tutorial step by step
        tutorialName: "Tutorial - Primeros Pasos",
        tutorialTask: "Aprende lo básico",
        tutorialIntro: "¡Bienvenido a Les Aiguilles Blanches!",
        tutorialWelcome: "🏔️ ¡Bienvenido, novato! Soy Jean-Pierre, jefe pisador. Te enseñaré el oficio.",
        tutorialControls: "🎮 CONTROLES: Usa WASD o las flechas ↑↓←→ para mover la máquina pisanieves.",
        tutorialMove: "👆 PRUEBA: Muévete por la pista. ¡La nieve blanca debe ser pisada!",
        tutorialGroomIntro: "✅ ¡Genial! Ahora aprendamos a pisar la nieve.",
        tutorialGroomAction: "❄️ PISAR: Mantén ESPACIO mientras te mueves para alisar la nieve.",
        tutorialCoverage: "📊 ¿Ves? ¡La nieve se vuelve más lisa! ¡Sigue pisando!",
        tutorialHUD: "📈 HUD: Arriba izquierda: ⛽ Combustible, 💪 Resistencia, ❄️ Cobertura. Arriba derecha: ⏱️ Tiempo y 🎯 Objetivo.",
        tutorialGoal: "🎯 META: Pisa al menos el 40% de la pista antes de que acabe el tiempo. ¡Los esquiadores vienen!",
        tutorialFuel: "⛽ COMBUSTIBLE: Moverse gasta combustible. ¡En misiones, visita la gasolinera!",
        tutorialComplete: "🏆 ¡Bravo! Dominas lo básico. ¿Listo para tu primera misión en la Pista Verde?",
        level1Name: "Pista Verde - Les Marmottes",
        level1Task: "Prepara la pista de principiantes",
        level2Name: "Pista Azul - Le Chamois",
        level2Task: "Prepara antes de la apertura",
        
        // Hazards
        cliffFall: "⚠️ ¡CUIDADO! ¡Has caído al precipicio! Misión fallida."
    }
};

function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
        currentLang = lang;
        localStorage.setItem('snowGroomer_lang', lang);
    }
}

function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

function detectLanguage() {
    const saved = localStorage.getItem('snowGroomer_lang');
    if (saved && TRANSLATIONS[saved]) {
        return saved;
    }
    const browserLang = navigator.language.split('-')[0];
    return TRANSLATIONS[browserLang] ? browserLang : 'fr';
}
