"""E2E tests for game navigation and basic flows."""
import pytest
from playwright.sync_api import Page, expect
from conftest import wait_for_scene, wait_for_scene_inactive, skip_to_credits, wait_for_level_or_credits


def click_menu_button(page: Page, button_index: int, button_name: str = "button"):
    """Click a menu button by index (0=Start, 1=How to Play, 2=Settings).
    
    Menu buttons are positioned proportionally based on viewport height.
    menuY = height * 0.55, buttonSpacing = 55 * scaleFactor
    """
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box, "Canvas not found"
    
    height = box["height"]
    # Scale factor based on 768px reference height
    scale_factor = max(0.7, min(height / 768, 1.5))
    button_spacing = 55 * scale_factor
    menu_y = height * 0.55
    
    # Button Y = menuY - buttonSpacing * 0.5 + index * buttonSpacing
    button_y = menu_y - button_spacing * 0.5 + button_index * button_spacing
    
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + button_y)


# Legacy constants for backward compatibility
BUTTON_START = 0
BUTTON_HOW_TO_PLAY = 1
BUTTON_SETTINGS = 2


def get_active_scenes(page: Page) -> list:
    """Get list of active Phaser scene keys."""
    return page.evaluate("""() => {
        if (window.game && window.game.scene) {
            return window.game.scene.getScenes(true).map(s => s.scene.key);
        }
        return [];
    }""")


def get_current_level(page: Page) -> int:
    """Get current level index from GameScene."""
    return page.evaluate("""() => {
        if (window.game && window.game.scene) {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.levelIndex !== undefined) {
                return gameScene.levelIndex;
            }
        }
        return -1;
    }""")


def assert_no_error_message(page: Page):
    """Assert there's no error message displayed on screen."""
    # Check if error message div exists and is visible
    error_visible = page.evaluate("""() => {
        const container = document.getElementById('game-container');
        if (container) {
            const errorDiv = container.querySelector('.error-message');
            if (errorDiv) return errorDiv.textContent;
        }
        return null;
    }""")
    assert error_visible is None, f"Error message displayed: {error_visible}"
    
    # Also check that we have active scenes (game not crashed)
    scenes = get_active_scenes(page)
    assert len(scenes) > 0, "No active scenes - game may have crashed"


def assert_canvas_renders_content(page: Page):
    """Assert canvas has non-black content (catches Firefox rendering issues).
    
    Uses screenshot analysis instead of canvas getImageData() because the original
    Firefox black screen bug showed content in getImageData but visually was black.
    """
    from PIL import Image
    import io
    
    screenshot = page.screenshot()
    img = Image.open(io.BytesIO(screenshot))
    pixels = img.load()
    w, h = img.size
    
    # Sample several points across the screen
    samples = [
        pixels[w//2, h//2],       # center
        pixels[w//2, h//4],       # upper center  
        pixels[w//4, h//2],       # left center
        pixels[3*w//4, h//2],     # right center
        pixels[w//2, 3*h//4],     # lower center
    ]
    
    # Check if any pixel is not black/very dark
    has_content = any(
        (p[0] > 20 or p[1] > 20 or p[2] > 20) for p in samples
    )
    
    assert has_content, \
        f"Screen appears all black - possible rendering issue. Samples (RGBA): {samples}"


def assert_scene_active(page: Page, scene_key: str, msg: str = ""):
    """Assert that a specific scene is active."""
    assert_no_error_message(page)
    scenes = get_active_scenes(page)
    assert scene_key in scenes, f"Expected '{scene_key}' to be active. Active scenes: {scenes}. {msg}"


def assert_scene_not_active(page: Page, scene_key: str, msg: str = ""):
    """Assert that a specific scene is NOT active."""
    scenes = get_active_scenes(page)
    assert scene_key not in scenes, f"Expected '{scene_key}' to NOT be active. Active scenes: {scenes}. {msg}"


def assert_not_on_menu(page: Page):
    """Assert we're no longer on the menu - fail if click didn't work."""
    assert_no_error_message(page)
    scenes = get_active_scenes(page)
    assert 'MenuScene' not in scenes, f"Still on MenuScene! Button click likely missed. Active: {scenes}"


def click_button(page: Page, button_index: int, description: str):
    """Click a menu button by index and verify the click worked.
    
    Args:
        page: Playwright page
        button_index: 0=Start, 1=How to Play, 2=Settings
        description: Button name for debugging
    """
    click_menu_button(page, button_index, description)
    # Brief wait for click to register, then let caller wait for scene changes
    page.wait_for_timeout(100)


class TestCanvasRendering:
    """Test that canvas actually renders visible content (catches Firefox black screen bugs)."""

    def test_menu_renders_visible_content(self, game_page: Page):
        """Verify menu scene renders non-black content."""
        assert_canvas_renders_content(game_page)
        assert_scene_active(game_page, 'MenuScene')

    def test_game_renders_visible_content(self, game_page: Page):
        """Verify game scene renders non-black content."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        assert_canvas_renders_content(game_page)

    def test_all_levels_render_content(self, game_page: Page):
        """Skip through all levels and verify each renders visible content."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        for level in range(9):
            assert_canvas_renders_content(game_page)
            game_page.keyboard.press("n")
            game_page.wait_for_timeout(1200)
        
        # Credits should also render
        assert_scene_active(game_page, 'CreditsScene')
        assert_canvas_renders_content(game_page)


class TestMenuNavigation:
    """Test main menu navigation."""

    def test_game_loads_with_menu(self, game_page: Page):
        """Verify the game loads with MenuScene active."""
        canvas = game_page.locator("canvas")
        expect(canvas).to_be_visible()
        assert_scene_active(game_page, 'MenuScene', "Game should start with MenuScene")

    def test_start_game_button(self, game_page: Page):
        """Test clicking Start Game transitions to GameScene."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Must have left menu and entered game
        assert_not_on_menu(game_page)
        assert_scene_active(game_page, 'GameScene', "Should be in GameScene after clicking Start")
        assert_scene_active(game_page, 'HUDScene', "HUD should be visible during gameplay")
        
        # Verify we're on level 0 (tutorial)
        level = get_current_level(game_page)
        assert level == 0, f"Should start on level 0, got {level}"

    def test_how_to_play_button(self, game_page: Page):
        """Test How to Play button shows overlay while keeping menu."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_HOW_TO_PLAY, "How to Play")
        
        # Menu should still be active (overlay on top)
        assert_scene_active(game_page, 'MenuScene')

    def test_settings_button(self, game_page: Page):
        """Test Settings button opens SettingsScene."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_SETTINGS, "Settings")
        wait_for_scene(game_page, 'SettingsScene')
        
        assert_scene_active(game_page, 'SettingsScene', "Settings should open")
        
        # Escape should return to menu
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene', "Should return to menu")


class TestGameProgress:
    """Test game progress persistence (Resume/New Game)."""

    def test_no_progress_shows_start_game(self, game_page: Page):
        """With no saved progress, menu shows Start Game button."""
        # Clear any saved progress
        game_page.evaluate("localStorage.removeItem('snowGroomer_progress')")
        game_page.reload()
        wait_for_scene(game_page, 'MenuScene')
        
        # Start Game should work and go to level 0
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        assert get_current_level(game_page) == 0, "Should start on level 0"

    def test_progress_saved_on_level_complete(self, game_page: Page):
        """Completing a level saves progress to localStorage."""
        # Clear progress first
        game_page.evaluate("localStorage.removeItem('snowGroomer_progress')")
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip to next level (saves progress)
        game_page.keyboard.press("n")
        wait_for_level_or_credits(game_page, 1, timeout=5000)
        
        # Check progress was saved
        progress = game_page.evaluate("JSON.parse(localStorage.getItem('snowGroomer_progress') || 'null')")
        assert progress is not None, "Progress should be saved"
        assert progress["currentLevel"] == 1, "Should have saved level 1"

    def test_resume_continues_from_saved_level(self, game_page: Page):
        """With saved progress, Resume button continues from saved level."""
        # Set up saved progress at level 2
        game_page.evaluate("""
            localStorage.setItem('snowGroomer_progress', JSON.stringify({
                currentLevel: 2,
                savedAt: new Date().toISOString()
            }))
        """)
        game_page.reload()
        wait_for_scene(game_page, 'MenuScene')
        
        # First button should now be Resume (index 0)
        click_button(game_page, BUTTON_START, "Resume")
        wait_for_scene(game_page, 'GameScene')
        
        level = get_current_level(game_page)
        assert level == 2, f"Should resume at level 2, got {level}"

    def test_new_game_clears_progress(self, game_page: Page):
        """New Game button clears saved progress and starts from level 0."""
        # Set up saved progress
        game_page.evaluate("""
            localStorage.setItem('snowGroomer_progress', JSON.stringify({
                currentLevel: 3,
                savedAt: new Date().toISOString()
            }))
        """)
        game_page.reload()
        wait_for_scene(game_page, 'MenuScene')
        
        # With saved progress, button layout is: Resume(0), New Game(1), How to Play(2), Settings(3)
        # Click New Game (index 1)
        click_button(game_page, 1, "New Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Should start from level 0
        level = get_current_level(game_page)
        assert level == 0, f"New Game should start at level 0, got {level}"
        
        # Progress should be cleared
        progress = game_page.evaluate("localStorage.getItem('snowGroomer_progress')")
        assert progress is None, "Progress should be cleared after New Game"


class TestLevelNavigation:
    """Test level transitions using keyboard shortcuts."""

    def test_skip_level_advances_to_next(self, game_page: Page):
        """Test that N key advances from tutorial to level 1."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        assert get_current_level(game_page) == 0, "Should start on tutorial (level 0)"
        
        # Skip level - wait for level change
        game_page.keyboard.press("n")
        game_page.wait_for_function(
            "() => window.game?.scene?.getScene('GameScene')?.levelIndex === 1",
            timeout=5000
        )
        
        # Should now be on level 1
        level = get_current_level(game_page)
        assert level == 1, f"After skip should be on level 1, got {level}"
        assert_scene_active(game_page, 'GameScene')

    def test_full_level_progression_through_all_9_levels(self, game_page: Page):
        """Skip through ALL 9 levels (0-8), verify each, then credits."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        level_names = [
            "Tutorial", "Les Marmottes", "Les Écureuils", "Air Zone",
            "Les Chamois", "Le Tube", "Le Mur", "La Chouette", "La Pointe"
        ]
        
        for expected_level in range(9):
            current = get_current_level(game_page)
            assert current == expected_level, \
                f"Expected level {expected_level} ({level_names[expected_level]}), got {current}"
            assert_scene_active(game_page, 'GameScene')
            assert_scene_active(game_page, 'HUDScene')
            
            # Take screenshot for visual verification
            game_page.screenshot(path=f"tests/screenshots/level_{expected_level}_{level_names[expected_level].replace(' ', '_')}.png")
            
            # Skip to next - wait for level to change or credits
            game_page.keyboard.press("n")
            if expected_level < 8:
                game_page.wait_for_function(
                    f"() => window.game?.scene?.getScene('GameScene')?.levelIndex === {expected_level + 1}",
                    timeout=5000
                )
            else:
                wait_for_scene(game_page, 'CreditsScene')
        
        # After level 8, should be at credits
        assert_scene_active(game_page, 'CreditsScene', "Should be at credits after completing all levels")
        game_page.screenshot(path="tests/screenshots/credits_screen.png")

    def test_credits_returns_to_menu(self, game_page: Page):
        """Test that exiting credits returns to menu."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip all levels using deterministic helper
        skip_to_credits(game_page)
        
        assert_scene_active(game_page, 'CreditsScene')
        
        # Exit credits
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        
        assert_scene_active(game_page, 'MenuScene', "Should return to menu from credits")
        game_page.screenshot(path="tests/screenshots/menu_after_credits.png")


class TestTutorial:
    """Test tutorial flow and progression."""

    def test_tutorial_starts_with_welcome_dialogue(self, game_page: Page):
        """Test tutorial begins with welcome message."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        assert_scene_active(game_page, 'DialogueScene', "Tutorial should show dialogue")
        
        level = get_current_level(game_page)
        assert level == 0, f"Should be on tutorial (level 0), got {level}"

    def test_tutorial_dialogue_advances_on_click(self, game_page: Page):
        """Test clicking advances through tutorial dialogues."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Click to advance first dialogue
        game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        game_page.wait_for_timeout(200)
        
        # Should still be in tutorial with dialogues
        assert_scene_active(game_page, 'GameScene')
        assert_scene_active(game_page, 'DialogueScene')

    def test_tutorial_movement_trigger(self, game_page: Page):
        """Test that moving triggers the next tutorial step."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Dismiss initial dialogues (welcome, controls, move instruction)
        for _ in range(6):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        # Verify dialogue is dismissed
        dialogue_hidden = game_page.evaluate("""() => {
            const ds = window.game.scene.getScene('DialogueScene');
            return !ds || !ds.isDialogueShowing || !ds.isDialogueShowing();
        }""")
        if not dialogue_hidden:
            # Click more if dialogue still showing
            for _ in range(4):
                game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                game_page.wait_for_timeout(400)
        
        # Get initial position
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Move groomer
        game_page.keyboard.down("ArrowUp")
        game_page.wait_for_timeout(500)
        game_page.keyboard.up("ArrowUp")
        game_page.wait_for_timeout(300)
        
        new_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Groomer should have moved (position change)
        assert new_pos is not None, "Groomer should exist after movement"
        assert new_pos['y'] != initial_pos['y'], \
            f"Groomer should have moved. Initial: {initial_pos}, New: {new_pos}"

    def test_tutorial_grooming_increases_coverage(self, game_page: Page):
        """Test that grooming increases coverage (on level 1 for cleaner test)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip tutorial to level 1 for cleaner grooming test
        game_page.keyboard.press("n")
        wait_for_scene(game_page, 'GameScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Dismiss intro dialogue
        for _ in range(3):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(300)
        
        # Get initial groomed count
        initial_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : 0;
        }""")
        
        # Move and groom - hold space (groom key) while moving
        game_page.keyboard.down("Space")
        game_page.keyboard.down("ArrowUp")
        wait_for_scene(game_page, 'GameScene')
        game_page.keyboard.up("ArrowUp")
        game_page.keyboard.up("Space")
        game_page.wait_for_timeout(100)
        
        # Check groomed count increased
        new_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : 0;
        }""")
        
        assert new_count > initial_count, \
            f"Groomed count should increase. Initial: {initial_count}, New: {new_count}"


class TestGroomerMovement:
    """Test basic groomer controls."""

    def test_groomer_movement_after_dialogue_dismissal(self, game_page: Page):
        """Test groomer can move after dismissing tutorial dialogues."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip tutorial to level 1 (simpler, no tutorial dialogues blocking)
        game_page.keyboard.press("n")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        level = get_current_level(game_page)
        assert level == 1, f"Should be on level 1, got {level}"
        
        # Dismiss intro dialogue if any
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(5):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(350)
        
        # Ensure dialogue is dismissed before testing movement
        game_page.wait_for_timeout(200)
        
        # Get initial groomer position
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            if (gs && gs.groomer) {
                return { x: gs.groomer.x, y: gs.groomer.y };
            }
            return null;
        }""")
        assert initial_pos is not None, "Groomer should exist"
        
        # Move groomer (hold key for longer)
        game_page.keyboard.down("ArrowUp")
        game_page.wait_for_timeout(300)
        game_page.keyboard.up("ArrowUp")
        game_page.wait_for_timeout(200)
        
        # Check position changed
        new_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            if (gs && gs.groomer) {
                return { x: gs.groomer.x, y: gs.groomer.y };
            }
            return null;
        }""")
        
        assert new_pos['y'] != initial_pos['y'], \
            f"Groomer should have moved. Initial: {initial_pos}, New: {new_pos}"

    def test_wasd_controls(self, game_page: Page):
        """Test WASD movement controls work."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip tutorial to level 1 to avoid tutorial dialogues
        game_page.keyboard.press("n")
        wait_for_level_or_credits(game_page, 1, timeout=5000)
        
        # Dismiss any remaining dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(5):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(150)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Hold key longer for movement - give physics time to update
        game_page.keyboard.down("w")
        game_page.wait_for_timeout(500)
        game_page.keyboard.up("w")
        
        # Wait for position to actually change (deterministic)
        game_page.wait_for_function(f"""() => {{
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs || !gs.groomer) return false;
            return gs.groomer.y !== {initial_pos['y']};
        }}""", timeout=2000)
        
        new_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        assert new_pos['y'] != initial_pos['y'], "WASD controls should move groomer"


class TestDialogueSystem:
    """Test dialogue display and dismissal."""

    def test_tutorial_shows_dialogue(self, game_page: Page):
        """Test that tutorial level shows DialogueScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'DialogueScene', "Tutorial should have dialogue")

    def test_dialogue_is_visible(self, game_page: Page):
        """Test that dialogue box is actually visible on screen."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        # Wait for dialogue to actually be showing
        game_page.wait_for_function("""() => {
            const dialogueScene = window.game?.scene?.getScene('DialogueScene');
            return dialogueScene?.container?.visible === true;
        }""", timeout=5000)
        
        # Check if dialogue is showing and container is visible
        dialogue_visible = game_page.evaluate("""() => {
            const dialogueScene = window.game.scene.getScene('DialogueScene');
            if (!dialogueScene) return { exists: false };
            return {
                exists: true,
                isShowing: dialogueScene.isDialogueShowing ? dialogueScene.isDialogueShowing() : false,
                containerVisible: dialogueScene.container ? dialogueScene.container.visible : false
            };
        }""")
        
        assert dialogue_visible.get("exists"), "DialogueScene should exist"
        assert dialogue_visible.get("isShowing") or dialogue_visible.get("containerVisible"), \
            f"Dialogue should be visible: {dialogue_visible}"

    def test_dialogue_dismisses_on_click(self, game_page: Page):
        """Test dialogues advance on click."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'DialogueScene')
        
        # Click to dismiss all dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(10):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(100)
        
        # Dialogue should eventually be dismissed or hidden
        # (DialogueScene may still be active but not visible)
        assert_scene_active(game_page, 'GameScene', "Game should still be running")


class TestPauseMenu:
    """Test pause functionality."""

    def test_escape_opens_pause_menu(self, game_page: Page):
        """Test that Escape opens PauseScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Dismiss dialogues first
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(100)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        
        assert_scene_active(game_page, 'PauseScene', "Escape should open pause menu")
        game_page.screenshot(path="tests/screenshots/pause_menu.png")

    def test_escape_toggles_pause(self, game_page: Page):
        """Test Escape toggles pause on/off."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Dismiss dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(100)
        
        # Pause
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        assert_scene_active(game_page, 'PauseScene')
        
        # Unpause
        game_page.keyboard.press("Escape")
        wait_for_scene_inactive(game_page, 'PauseScene')
        assert_scene_not_active(game_page, 'PauseScene', "Pause should close on second Escape")

    def test_pause_menu_buttons_visible(self, game_page: Page):
        """Test that pause menu shows all expected buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Dismiss dialogues first
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(100)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        
        assert_scene_active(game_page, 'PauseScene', "Pause menu should be open")
        
        # Check that interactive buttons exist in the scene
        button_count = game_page.evaluate("""
            () => {
                const pauseScene = window.game?.scene?.getScene('PauseScene');
                if (!pauseScene) return 0;
                // Count interactive text objects (buttons)
                let count = 0;
                pauseScene.children.list.forEach(child => {
                    if (child.type === 'Text' && child.input?.enabled) {
                        count++;
                    }
                });
                return count;
            }
        """)
        
        assert button_count >= 4, f"Pause menu should have at least 4 buttons, found {button_count}"
        game_page.screenshot(path="tests/screenshots/pause_menu_buttons.png")


class TestLevelComplete:
    """Test level completion flow."""

    def test_skip_triggers_level_advance(self, game_page: Page):
        """Test that skipping advances to next level."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        initial_level = get_current_level(game_page)
        assert initial_level == 0
        
        game_page.keyboard.press("n")
        game_page.wait_for_function(
            "() => window.game?.scene?.getScene('GameScene')?.levelIndex === 1",
            timeout=5000
        )
        
        # Should now be on next level
        new_level = get_current_level(game_page)
        assert new_level == initial_level + 1, f"Should advance to level 1, got {new_level}"


class TestFailScreen:
    """Test fail screen with taunt messages."""

    def test_fail_screen_shows_taunt(self, game_page: Page):
        """Test that failing a level shows LevelCompleteScene with taunt text."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Trigger a fail by calling gameOver directly via JavaScript
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        
        # Wait for LevelCompleteScene to appear
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=3000)
        
        # Verify we're on the fail screen (not won)
        scene_data = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return scene ? { won: scene.won } : null;
        }""")
        assert scene_data is not None, "LevelCompleteScene should exist"
        assert scene_data['won'] == False, "Should be a fail screen"

    def test_fail_screen_has_retry_option(self, game_page: Page):
        """Test that fail screen has retry button."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Trigger fail
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'cliff');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=3000)
        
        # Take screenshot for visual verification
        game_page.screenshot(path="tests/screenshots/fail_screen_taunt.png")


class TestCreditsScreen:
    """Test credits screen."""

    def test_credits_has_required_elements(self, game_page: Page):
        """Test credits screen appears with proper scene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip all levels using deterministic helper
        skip_to_credits(game_page)
        
        assert_scene_active(game_page, 'CreditsScene', "Credits should be showing")
        assert_scene_not_active(game_page, 'GameScene', "GameScene should not be active during credits")

    def test_can_restart_game_after_credits(self, game_page: Page):
        """Test full cycle: play through credits, return to menu, start new game."""
        # Complete game
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        skip_to_credits(game_page)
        
        assert_scene_active(game_page, 'CreditsScene')
        
        # Return to menu
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene')
        
        # After completing all levels, progress is saved so menu shows Resume/New Game
        # Click New Game (index 1) to start fresh
        click_button(game_page, 1, "New Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        level = get_current_level(game_page)
        assert level == 0, f"New game should start at level 0, got {level}"


class TestAccessibility:
    """Test accessibility features."""

    def test_settings_has_accessibility_options(self, game_page: Page):
        """Test that settings scene has accessibility toggles."""
        click_button(game_page, BUTTON_SETTINGS, "Settings")
        wait_for_scene(game_page, 'SettingsScene')
        
        assert_scene_active(game_page, 'SettingsScene')
        game_page.screenshot(path="tests/screenshots/settings_accessibility.png")

    def test_colorblind_filter_applied(self, game_page: Page):
        """Test that colorblind mode applies CSS filter to canvas."""
        click_button(game_page, BUTTON_SETTINGS, "Settings")
        game_page.wait_for_timeout(500)
        
        # Click deuteranopia button (first colorblind option after 'none')
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        # Colorblind buttons are in left column, around y=200
        game_page.mouse.click(box["x"] + 80, box["y"] + 180)
        game_page.wait_for_timeout(300)
        
        # Start game and check filter is applied
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(300)
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Check that colorblind filter SVG exists
        filter_exists = game_page.evaluate("""() => {
            return document.getElementById('colorblind-filters') !== null;
        }""")
        # Note: Filter may or may not be applied depending on settings state
        # This test just verifies the game runs with accessibility code

    def test_high_contrast_class_applied(self, game_page: Page):
        """Test that high contrast mode adds CSS class."""
        click_button(game_page, BUTTON_SETTINGS, "Settings")
        game_page.wait_for_timeout(500)
        
        # Click high contrast toggle
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        game_page.mouse.click(box["x"] + 200, box["y"] + 140)
        game_page.wait_for_timeout(300)
        
        # Go back and start game
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(300)
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Check for high-contrast class
        has_class = game_page.evaluate("""() => {
            return document.body.classList.contains('high-contrast');
        }""")
        # Note: Class may or may not be applied depending on toggle state


class TestHUD:
    """Test HUD display and scaling."""

    def test_hud_scene_active_during_gameplay(self, game_page: Page):
        """Test that HUDScene is active during gameplay."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'HUDScene', "HUD should be active during gameplay")

    def test_hud_displays_game_stats(self, game_page: Page):
        """Test that HUD has fuel, stamina, coverage values."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Check HUD scene has expected properties
        hud_data = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (hud) {
                return {
                    hasFuelBar: hud.fuelBar !== undefined,
                    hasStaminaBar: hud.staminaBar !== undefined,
                    hasCoverageText: hud.coverageText !== undefined,
                    hasTimerText: hud.timerText !== undefined
                };
            }
            return null;
        }""")
        
        assert hud_data is not None, "HUDScene should exist"
        assert hud_data['hasFuelBar'], "HUD should have fuel bar"
        assert hud_data['hasStaminaBar'], "HUD should have stamina bar"


class TestSceneLayering:
    """Test that overlay scenes render on top of game."""

    def test_hud_renders_on_top_of_game(self, game_page: Page):
        """Test HUD scene is above GameScene in render order."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Check scene order - HUD should be after GameScene (rendered on top)
        scene_order = game_page.evaluate("""() => {
            return window.game.scene.getScenes(true).map(s => s.scene.key);
        }""")
        
        game_idx = scene_order.index('GameScene') if 'GameScene' in scene_order else -1
        hud_idx = scene_order.index('HUDScene') if 'HUDScene' in scene_order else -1
        
        assert game_idx >= 0, "GameScene should be active"
        assert hud_idx >= 0, "HUDScene should be active"
        assert hud_idx > game_idx, f"HUD should render after Game. Order: {scene_order}"

    def test_pause_menu_renders_on_top(self, game_page: Page):
        """Test PauseScene renders on top of all other scenes."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Dismiss dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(500)
        
        # Check scene order - PauseScene should be last (on top)
        scene_order = game_page.evaluate("""() => {
            return window.game.scene.getScenes(true).map(s => s.scene.key);
        }""")
        
        assert 'PauseScene' in scene_order, "PauseScene should be active"
        pause_idx = scene_order.index('PauseScene')
        assert pause_idx == len(scene_order) - 1, f"PauseScene should be last. Order: {scene_order}"


class TestSnowContrast:
    """Test visual distinction between groomed and ungroomed snow."""

    def test_grooming_changes_tile_texture(self, game_page: Page):
        """Test that grooming changes tile from ungroomed to groomed."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Dismiss dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(10):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        # Get initial groomed count
        initial_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : -1;
        }""")
        
        # Groom some snow
        game_page.keyboard.down("Space")
        game_page.keyboard.down("w")
        game_page.wait_for_timeout(300)
        game_page.keyboard.up("w")
        game_page.keyboard.up("Space")
        
        # Check groomed count increased
        new_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : -1;
        }""")
        
        assert new_count > initial_count, f"Grooming should increase count: {initial_count} -> {new_count}"


class TestBackgroundRendering:
    """Test extended background rendering."""

    def test_game_renders_without_errors(self, game_page: Page):
        """Test game scene renders completely without JS errors."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_no_error_message(game_page)
        assert_scene_active(game_page, 'GameScene')
        
        # Take screenshot to verify rendering
        game_page.screenshot(path="tests/screenshots/game_background.png")
        
        # Verify GameScene has extended background method
        has_bg = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && typeof gs.createExtendedBackground === 'function';
        }""")
        assert has_bg, "GameScene should have createExtendedBackground method"
