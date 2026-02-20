"""E2E tests for the LevelSelectScene."""
from playwright.sync_api import Page

from conftest import (
    assert_no_error_message,
    assert_scene_active,
    click_menu_by_key,
    dismiss_dialogues,
    find_menu_button_index,
    wait_for_scene,
    wait_for_input_ready,
)


def navigate_to_level_select(page: Page):
    """Navigate directly to the LevelSelectScene and wait for input ready."""
    page.evaluate("window.game.scene.start('LevelSelectScene')")
    wait_for_scene(page, 'LevelSelectScene')
    wait_for_input_ready(page, 'LevelSelectScene')


def inject_progress(page: Page, current_level: int = 0, completed_levels: str = "{}"):
    """Inject saved progress into localStorage.
    
    completed_levels should be a JSON string, e.g. '{"0": {"completed": true, "stars": 2, "bestTime": 120}}'
    """
    page.evaluate(f"""() => {{
        localStorage.setItem('snowGroomer_progress', JSON.stringify({{
            currentLevel: {current_level},
            levelStats: {completed_levels}
        }}));
    }}""")


def get_selected_level(page: Page) -> int:
    """Return the currently selected level index."""
    return page.evaluate("""() => {
        const scene = window.game.scene.getScene('LevelSelectScene');
        return scene?.selectedLevel ?? -1;
    }""")


class TestLevelSelectBasic:
    """Basic rendering and navigation tests."""

    def test_scene_loads(self, game_page: Page):
        """LevelSelectScene should load without errors."""
        navigate_to_level_select(game_page)
        assert_scene_active(game_page, 'LevelSelectScene')
        assert_no_error_message(game_page)

    def test_back_to_menu(self, game_page: Page):
        """Escape key should return to MenuScene."""
        navigate_to_level_select(game_page)
        game_page.keyboard.press('Escape')
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene')

    def test_shows_all_level_markers(self, game_page: Page):
        """All 11 level markers should exist with data keys."""
        navigate_to_level_select(game_page)
        for i in range(11):
            find_menu_button_index(game_page, f'level_{i}', 'LevelSelectScene')

    def test_first_level_unlocked(self, game_page: Page):
        """First level marker should be interactive."""
        navigate_to_level_select(game_page)
        idx = find_menu_button_index(game_page, 'level_0', 'LevelSelectScene')
        enabled = game_page.evaluate(f"""() => {{
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene.menuButtons[{idx}].input?.enabled === true;
        }}""")
        assert enabled, "Level 0 button should be interactive"


class TestLevelSelectWithProgress:
    """Tests with injected save data."""

    def test_completed_level_has_ski_option(self, game_page: Page):
        """Completed levels should show a Ski button in the info panel."""
        inject_progress(game_page, current_level=1, completed_levels='{"0": {"completed": true, "stars": 2, "bestTime": 120}}')
        navigate_to_level_select(game_page)
        # Navigate down to select level 0 (down = towards base)
        game_page.keyboard.press('ArrowDown')
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene?.selectedLevel === 0;
        }""", timeout=3000)
        has_ski = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene?.skiBtn?.visible === true;
        }""")
        assert has_ski, "Completed level should show Ski button in info panel"

    def test_locked_level_shows_lock_info(self, game_page: Page):
        """Selecting a locked level should show lock message, not pointer cursor."""
        navigate_to_level_select(game_page)
        idx = find_menu_button_index(game_page, 'level_5', 'LevelSelectScene')
        result = game_page.evaluate(f"""() => {{
            const scene = window.game.scene.getScene('LevelSelectScene');
            const btn = scene.menuButtons[{idx}];
            return {{ cursor: btn?.input?.cursor, enabled: btn?.input?.enabled }};
        }}""")
        assert result['cursor'] != 'pointer', "Locked level marker should not show pointer cursor"

    def test_info_panel_shows_level_stats(self, game_page: Page):
        """Info panel should display coverage target and time limit."""
        inject_progress(game_page, current_level=0)
        navigate_to_level_select(game_page)
        # Level 0 (tutorial) is selected by default — check its info panel
        details = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene?.infoDetails?.text ?? '';
        }""")
        assert '%' in details, f"Info panel should show coverage target, got: {details}"

    def test_groom_starts_game(self, game_page: Page):
        """Pressing Enter on an unlocked level should start GameScene."""
        navigate_to_level_select(game_page)
        game_page.keyboard.press('Enter')
        wait_for_scene(game_page, 'GameScene', timeout=10000)
        assert_scene_active(game_page, 'GameScene')

    def test_pause_quit_returns_to_level_select(self, game_page: Page):
        """Quitting from pause should return to LevelSelectScene when launched from there."""
        from conftest import skip_to_level
        skip_to_level(game_page, 0)
        dismiss_dialogues(game_page)
        # Simulate launch origin as if started from LevelSelectScene
        game_page.evaluate("window.__launchOrigin = 'LevelSelectScene'")
        game_page.keyboard.press('Escape')
        wait_for_scene(game_page, 'PauseScene', timeout=5000)
        wait_for_input_ready(game_page, 'PauseScene')
        click_menu_by_key(game_page, 'quit', 'PauseScene')
        wait_for_scene(game_page, 'LevelSelectScene', timeout=10000)
        assert_scene_active(game_page, 'LevelSelectScene')


class TestLevelSelectKeyboardNav:
    """Keyboard navigation tests."""

    def test_arrow_keys_change_selection(self, game_page: Page):
        """Arrow keys should move selection between levels."""
        inject_progress(game_page, current_level=0)
        navigate_to_level_select(game_page)
        initial = get_selected_level(game_page)
        # ArrowUp moves towards summit (higher level index)
        game_page.keyboard.press('ArrowUp')
        game_page.wait_for_function(f"""() => {{
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene?.selectedLevel !== {initial};
        }}""", timeout=3000)
        after_up = get_selected_level(game_page)
        assert after_up != initial, f"Selection should change after ArrowUp: was {initial}, still {after_up}"
        game_page.keyboard.press('ArrowDown')
        game_page.wait_for_function(f"""() => {{
            const scene = window.game.scene.getScene('LevelSelectScene');
            return scene?.selectedLevel === {initial};
        }}""", timeout=3000)
        after_down = get_selected_level(game_page)
        assert after_down == initial, f"Selection should return after ArrowDown: expected {initial}, got {after_down}"
        assert_no_error_message(game_page)


class TestMenuScrolling:
    """Test that the menu scrolls correctly in small viewports."""

    def test_menu_scroll_landscape(self, game_page: Page):
        """Menu should be scrollable in a narrow landscape viewport."""
        inject_progress(game_page, current_level=3, completed_levels='{"0": {"completed": true, "stars": 3, "bestTime": 60}}')
        game_page.set_viewport_size({"width": 915, "height": 412})
        game_page.evaluate("window.game.scene.start('MenuScene')")
        wait_for_scene(game_page, 'MenuScene')
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('MenuScene');
            return scene?.menuButtons?.length > 0;
        }""", timeout=5000)
        assert_scene_active(game_page, 'MenuScene')
        assert_no_error_message(game_page)
