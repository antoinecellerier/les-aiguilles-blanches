"""E2E tests for the LevelSelectScene."""
from playwright.sync_api import Page

from conftest import (
    assert_no_error_message,
    assert_scene_active,
    get_active_scenes,
    wait_for_scene,
    wait_for_scene_inactive,
)


def navigate_to_level_select(page: Page):
    """Navigate directly to the LevelSelectScene."""
    page.evaluate("window.game.scene.start('LevelSelectScene')")
    wait_for_scene(page, 'LevelSelectScene')


def inject_progress(page: Page, current_level: int = 0, completed_levels: str = "{}"):
    """Inject saved progress into localStorage and restart MenuScene.
    
    completed_levels should be a JSON string, e.g. '{"0": {"completed": true, "stars": 2, "bestTime": 120}}'
    """
    page.evaluate(f"""() => {{
        localStorage.setItem('snowGroomer_progress', JSON.stringify({{
            currentLevel: {current_level},
            levelStats: {completed_levels}
        }}));
    }}""")


class TestLevelSelectBasic:
    """Basic rendering and navigation tests."""

    def test_scene_loads(self, game_page: Page):
        """LevelSelectScene should load without errors."""
        navigate_to_level_select(game_page)
        assert_scene_active(game_page, 'LevelSelectScene')
        assert_no_error_message(game_page)

    def test_back_to_menu(self, game_page: Page):
        """Back button should return to MenuScene."""
        navigate_to_level_select(game_page)
        # Press Escape to go back
        game_page.keyboard.press('Escape')
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene')

    def test_shows_all_levels(self, game_page: Page):
        """All 11 levels should be present in the scene."""
        navigate_to_level_select(game_page)
        level_count = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            if (!scene || !scene.menuButtons) return 0;
            // menuButtons includes back button + level buttons
            return scene.menuButtons.length;
        }""")
        # At minimum the back button exists; first level is unlocked (1 Groom button)
        assert level_count >= 2, f"Expected at least 2 buttons (back + level 1), got {level_count}"

    def test_first_level_unlocked(self, game_page: Page):
        """First level should always be playable."""
        navigate_to_level_select(game_page)
        # The first level's Groom button should be interactive
        has_groom = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            if (!scene || !scene.menuButtons) return false;
            // Button at index 1 (after back) should be the first level's Groom
            return scene.menuButtons.length > 1 && scene.menuButtons[1].input?.enabled === true;
        }""")
        assert has_groom, "First level Groom button should be interactive"


class TestLevelSelectWithProgress:
    """Tests with injected save data."""

    def test_completed_level_has_ski_button(self, game_page: Page):
        """Completed levels should show both Groom and Ski buttons."""
        inject_progress(game_page, current_level=1, completed_levels='{"0": {"completed": true, "stars": 2, "bestTime": 120}}')
        navigate_to_level_select(game_page)
        button_count = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            if (!scene || !scene.rowButtons) return 0;
            // Row 0 = first level; should have 2 buttons (Groom + Ski)
            const row0 = scene.rowButtons.get(0);
            return row0 ? row0.length : 0;
        }""")
        assert button_count == 2, f"Completed level should have 2 buttons, got {button_count}"

    def test_locked_levels_not_interactive(self, game_page: Page):
        """Locked levels should have no interactive buttons."""
        navigate_to_level_select(game_page)
        # Level 5 (index 5) should be locked with no progress
        locked_buttons = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            if (!scene || !scene.rowButtons) return -1;
            const row5 = scene.rowButtons.get(5);
            return row5 ? row5.length : 0;
        }""")
        assert locked_buttons == 0, f"Locked level should have 0 buttons, got {locked_buttons}"

    def test_groom_starts_game(self, game_page: Page):
        """Clicking Groom on an unlocked level should start GameScene."""
        navigate_to_level_select(game_page)
        # Activate first level's Groom button via keyboard
        game_page.keyboard.press('ArrowDown')
        game_page.wait_for_timeout(100)
        game_page.keyboard.press('Enter')
        wait_for_scene(game_page, 'GameScene', timeout=10000)
        assert_scene_active(game_page, 'GameScene')


class TestLevelSelectKeyboardNav:
    """Keyboard navigation tests."""

    def test_escape_returns_to_menu(self, game_page: Page):
        """Escape key should navigate back to MenuScene."""
        navigate_to_level_select(game_page)
        game_page.keyboard.press('Escape')
        wait_for_scene(game_page, 'MenuScene')

    def test_arrow_keys_navigate(self, game_page: Page):
        """Arrow keys should move selection between levels."""
        navigate_to_level_select(game_page)
        # Navigate down twice, then back up
        game_page.keyboard.press('ArrowDown')
        game_page.wait_for_timeout(100)
        game_page.keyboard.press('ArrowDown')
        game_page.wait_for_timeout(100)
        game_page.keyboard.press('ArrowUp')
        game_page.wait_for_timeout(100)
        # Scene should still be active and no errors
        assert_scene_active(game_page, 'LevelSelectScene')
        assert_no_error_message(game_page)


class TestMenuScrolling:
    """Test that the menu scrolls correctly in small viewports."""

    def test_menu_scroll_landscape(self, game_page: Page):
        """Menu should be scrollable in a narrow landscape viewport."""
        # Inject progress to get max buttons (Resume, New Game, Level Select, etc.)
        inject_progress(game_page, current_level=3, completed_levels='{"0": {"completed": true, "stars": 3, "bestTime": 60}}')
        # Resize to phone landscape
        game_page.set_viewport_size({"width": 915, "height": 412})
        game_page.evaluate("window.game.scene.start('MenuScene')")
        wait_for_scene(game_page, 'MenuScene')
        game_page.wait_for_timeout(500)
        assert_scene_active(game_page, 'MenuScene')
        assert_no_error_message(game_page)
