"""Pytest configuration for Playwright E2E tests."""
import os
import pytest

# Base URL for the game - can be overridden via environment variable
GAME_URL = os.environ.get(
    "GAME_URL",
    "http://localhost:3000/index.html"
)


def wait_for_scene(page, scene_name: str, timeout: int = 5000):
    """Wait for a specific scene to be active.
    
    More reliable than wait_for_timeout as it checks actual game state.
    """
    page.wait_for_function(
        f"""() => {{
            const game = window.game;
            if (!game || !game.scene) return false;
            const scene = game.scene.getScene('{scene_name}');
            return scene && scene.sys && scene.sys.isActive();
        }}""",
        timeout=timeout
    )


def wait_for_scene_inactive(page, scene_name: str, timeout: int = 5000):
    """Wait for a specific scene to be inactive."""
    page.wait_for_function(
        f"""() => {{
            const game = window.game;
            if (!game || !game.scene) return false;
            const scene = game.scene.getScene('{scene_name}');
            return !scene || !scene.sys || !scene.sys.isActive();
        }}""",
        timeout=timeout
    )


def wait_for_game_ready(page, timeout: int = 10000):
    """Wait for the game to be fully initialized with MenuScene active."""
    page.wait_for_function(
        """() => {
            const game = window.game;
            if (!game || !game.scene) return false;
            const menu = game.scene.getScene('MenuScene');
            return menu && menu.sys && menu.sys.isActive();
        }""",
        timeout=timeout
    )


def wait_for_level_or_credits(page, expected_level: int, timeout: int = 10000):
    """Wait for either a specific level to load OR CreditsScene to be active.
    
    This is deterministic - it polls until one of these conditions is true:
    1. GameScene is active with levelIndex >= expected_level
    2. CreditsScene is active (game completed)
    
    Returns 'level' if level loaded, 'credits' if credits shown.
    """
    result = page.wait_for_function(
        f"""() => {{
            const game = window.game;
            if (!game || !game.scene) return null;
            
            // Check if credits scene is active
            const credits = game.scene.getScene('CreditsScene');
            if (credits && credits.sys && credits.sys.isActive()) {{
                return 'credits';
            }}
            
            // Check if game scene has reached expected level
            const gameScene = game.scene.getScene('GameScene');
            if (gameScene && gameScene.sys && gameScene.sys.isActive()) {{
                if (typeof gameScene.levelIndex === 'number' && gameScene.levelIndex >= {expected_level}) {{
                    return 'level';
                }}
            }}
            
            return null;
        }}""",
        timeout=timeout
    )
    return result.json_value() if result else None


def skip_to_credits(page, timeout_per_level: int = 10000):
    """Skip through all levels to reach CreditsScene.
    
    Deterministic approach that waits for each level transition to complete.
    Uses longer timeout to handle asset loading between levels.
    """
    import time
    for i in range(11):
        page.keyboard.press("n")
        time.sleep(0.1)
        result = wait_for_level_or_credits(page, i + 1, timeout=timeout_per_level)
        if result == 'credits':
            return  # Done - credits are showing
    
    # If we got here without credits, wait for them
    wait_for_scene(page, 'CreditsScene', timeout=timeout_per_level)


# Level nameKey → array index mapping (must match src/config/levels.ts order)
LEVEL_INDEX = {
    'tutorialName': 0,
    'level_marmottesName': 1,
    'level_chamoisName': 2,
    'level_airZoneName': 3,
    'level_aigleName': 4,
    'level_glacierName': 5,
    'level_tubeName': 6,
    'level_verticaleName': 7,
    'level_colDangereuxName': 8,
    'level_tempeteName': 9,
    'level_coupeDesAiguillesName': 10,
}


def skip_to_level(page, level, timeout: int = 10000):
    """Skip directly to a specific level using game's internal transition.
    
    Args:
        page: Playwright page object
        level: Level nameKey (e.g. 'level_verticaleName') or integer index
        timeout: Max wait time in ms
    """
    if isinstance(level, str):
        assert level in LEVEL_INDEX, f"Unknown level nameKey '{level}'. Valid: {list(LEVEL_INDEX.keys())}"
        level_index = LEVEL_INDEX[level]
    else:
        level_index = level
    
    # Use the game's transitionToLevel method directly
    page.evaluate(f"""() => {{
        const gameScene = window.game?.scene?.getScene('GameScene');
        if (gameScene && gameScene.transitionToLevel) {{
            gameScene.transitionToLevel({level_index});
        }}
    }}""")
    
    # Wait for the level to be loaded
    page.wait_for_function(
        f"""() => {{
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene && 
                   gameScene.sys && 
                   gameScene.sys.isActive() && 
                   gameScene.levelIndex === {level_index};
        }}""",
        timeout=timeout
    )


def dismiss_dialogues(page, timeout: int = 5000):
    """Dismiss any active dialogues programmatically.
    
    Directly calls hideDialogue() on DialogueScene if showing.
    More reliable than clicking.
    """
    page.evaluate("""() => {
        const ds = window.game?.scene?.getScene('DialogueScene');
        if (ds && ds.isDialogueShowing && ds.isDialogueShowing()) {
            // Clear dialogue queue and hide
            if (ds.dialogueQueue) ds.dialogueQueue = [];
            if (ds.hideDialogue) ds.hideDialogue();
        }
    }""")
    # Wait for dialogue to be hidden
    page.wait_for_function("""() => {
        const ds = window.game?.scene?.getScene('DialogueScene');
        return !ds || !ds.isDialogueShowing || !ds.isDialogueShowing();
    }""", timeout=timeout)


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context for game testing."""
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
    }


@pytest.fixture
def game_page(page):
    """Navigate to the game and wait for Phaser to initialize."""
    page.goto(GAME_URL)
    # Wait for Phaser game canvas to be ready
    page.wait_for_selector("canvas", timeout=10000)
    # Wait for MenuScene to be active (more reliable than timeout)
    wait_for_game_ready(page)
    yield page
    # Teardown: clear localStorage to prevent state leakage between tests
    page.evaluate("localStorage.clear()")
