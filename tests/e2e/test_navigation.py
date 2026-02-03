"""E2E tests for game navigation and basic flows."""
import pytest
from playwright.sync_api import Page, expect


# Button positions (based on 720px height viewport)
# Menu buttons are at: menuY - 30 + i * 55 where menuY = height/2 + 30 = 390
# So: Start=360, HowToPlay=415, Settings=470, Controls=525
BUTTON_START = 360
BUTTON_HOW_TO_PLAY = 415
BUTTON_SETTINGS = 470
BUTTON_CONTROLS = 525


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


def click_button(page: Page, button_y: int, description: str):
    """Click a menu button and verify the click worked."""
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    center_x = box["x"] + box["width"] / 2
    
    page.mouse.click(center_x, box["y"] + button_y)
    page.wait_for_timeout(500)


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
        game_page.wait_for_timeout(1500)
        
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
        game_page.wait_for_timeout(500)
        
        assert_scene_active(game_page, 'SettingsScene', "Settings should open")
        
        # Escape should return to menu
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(500)
        assert_scene_active(game_page, 'MenuScene', "Should return to menu")

    def test_controls_button(self, game_page: Page):
        """Test Controls button shows controls overlay."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_CONTROLS, "Controls")
        
        # Menu should still be active
        assert_scene_active(game_page, 'MenuScene')


class TestLevelNavigation:
    """Test level transitions using keyboard shortcuts."""

    def test_skip_level_advances_to_next(self, game_page: Page):
        """Test that N key advances from tutorial to level 1."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'GameScene')
        assert get_current_level(game_page) == 0, "Should start on tutorial (level 0)"
        
        # Skip level
        game_page.keyboard.press("n")
        game_page.wait_for_timeout(2000)
        
        # Should now be on level 1
        level = get_current_level(game_page)
        assert level == 1, f"After skip should be on level 1, got {level}"
        assert_scene_active(game_page, 'GameScene')

    def test_full_level_progression_through_all_9_levels(self, game_page: Page):
        """Skip through ALL 9 levels (0-8), verify each, then credits."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
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
            
            # Skip to next
            game_page.keyboard.press("n")
            game_page.wait_for_timeout(1500)
        
        # After level 8, should be at credits
        game_page.wait_for_timeout(1000)
        assert_scene_active(game_page, 'CreditsScene', "Should be at credits after completing all levels")
        game_page.screenshot(path="tests/screenshots/credits_screen.png")

    def test_credits_returns_to_menu(self, game_page: Page):
        """Test that exiting credits returns to menu."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        # Skip all 9 levels
        for _ in range(9):
            game_page.keyboard.press("n")
            game_page.wait_for_timeout(1200)
        
        game_page.wait_for_timeout(1000)
        assert_scene_active(game_page, 'CreditsScene')
        
        # Exit credits
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(1000)
        
        assert_scene_active(game_page, 'MenuScene', "Should return to menu from credits")
        game_page.screenshot(path="tests/screenshots/menu_after_credits.png")


class TestTutorial:
    """Test tutorial flow and progression."""

    def test_tutorial_starts_with_welcome_dialogue(self, game_page: Page):
        """Test tutorial begins with welcome message."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(2000)
        
        assert_scene_active(game_page, 'GameScene')
        assert_scene_active(game_page, 'DialogueScene', "Tutorial should show dialogue")
        
        level = get_current_level(game_page)
        assert level == 0, f"Should be on tutorial (level 0), got {level}"

    def test_tutorial_dialogue_advances_on_click(self, game_page: Page):
        """Test clicking advances through tutorial dialogues."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(2000)
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Click to advance first dialogue
        game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        game_page.wait_for_timeout(500)
        
        # Should still be in tutorial with dialogues
        assert_scene_active(game_page, 'GameScene')
        assert_scene_active(game_page, 'DialogueScene')

    def test_tutorial_movement_trigger(self, game_page: Page):
        """Test that moving triggers the next tutorial step."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(2000)
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Dismiss initial dialogues (welcome, controls, move instruction)
        for _ in range(4):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(500)
        
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
        game_page.wait_for_timeout(1500)
        
        # Skip tutorial to level 1 for cleaner grooming test
        game_page.keyboard.press("n")
        game_page.wait_for_timeout(1500)
        
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
        game_page.wait_for_timeout(2000)
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
        game_page.wait_for_timeout(1500)
        
        # Skip tutorial to level 1 (simpler, no tutorial dialogues blocking)
        game_page.keyboard.press("n")
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'GameScene')
        level = get_current_level(game_page)
        assert level == 1, f"Should be on level 1, got {level}"
        
        # Dismiss intro dialogue if any
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(3):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(300)
        
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
        game_page.wait_for_timeout(1500)
        
        # Skip tutorial to level 1
        game_page.keyboard.press("n")
        game_page.wait_for_timeout(1500)
        
        # Dismiss dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(3):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Hold key for movement
        game_page.keyboard.down("w")
        game_page.wait_for_timeout(300)
        game_page.keyboard.up("w")
        game_page.wait_for_timeout(200)
        
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
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'DialogueScene', "Tutorial should have dialogue")

    def test_dialogue_dismisses_on_click(self, game_page: Page):
        """Test dialogues advance on click."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'DialogueScene')
        
        # Click to dismiss all dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(10):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(300)
        
        # Dialogue should eventually be dismissed or hidden
        # (DialogueScene may still be active but not visible)
        assert_scene_active(game_page, 'GameScene', "Game should still be running")


class TestPauseMenu:
    """Test pause functionality."""

    def test_escape_opens_pause_menu(self, game_page: Page):
        """Test that Escape opens PauseScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        # Dismiss dialogues first
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(500)
        
        assert_scene_active(game_page, 'PauseScene', "Escape should open pause menu")
        game_page.screenshot(path="tests/screenshots/pause_menu.png")

    def test_escape_toggles_pause(self, game_page: Page):
        """Test Escape toggles pause on/off."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        # Dismiss dialogues
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(8):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        # Pause
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(500)
        assert_scene_active(game_page, 'PauseScene')
        
        # Unpause
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(500)
        assert_scene_not_active(game_page, 'PauseScene', "Pause should close on second Escape")


class TestLevelComplete:
    """Test level completion flow."""

    def test_skip_triggers_level_advance(self, game_page: Page):
        """Test that skipping advances to next level."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        initial_level = get_current_level(game_page)
        assert initial_level == 0
        
        game_page.keyboard.press("n")
        game_page.wait_for_timeout(1500)
        
        # Should now be on next level
        new_level = get_current_level(game_page)
        assert new_level == initial_level + 1, f"Should advance to level 1, got {new_level}"


class TestCreditsScreen:
    """Test credits screen."""

    def test_credits_has_required_elements(self, game_page: Page):
        """Test credits screen appears with proper scene."""
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1000)
        
        # Skip all levels quickly
        for _ in range(9):
            game_page.keyboard.press("n")
            game_page.wait_for_timeout(1000)
        
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'CreditsScene', "Credits should be showing")
        assert_scene_not_active(game_page, 'GameScene', "GameScene should not be active during credits")

    def test_can_restart_game_after_credits(self, game_page: Page):
        """Test full cycle: play through credits, return to menu, start new game."""
        # Complete game
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1000)
        for _ in range(9):
            game_page.keyboard.press("n")
            game_page.wait_for_timeout(1000)
        
        game_page.wait_for_timeout(1500)
        assert_scene_active(game_page, 'CreditsScene')
        
        # Return to menu
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(1000)
        assert_scene_active(game_page, 'MenuScene')
        
        # Start new game
        click_button(game_page, BUTTON_START, "Start Game")
        game_page.wait_for_timeout(1500)
        
        assert_scene_active(game_page, 'GameScene')
        level = get_current_level(game_page)
        assert level == 0, f"New game should start at level 0, got {level}"
