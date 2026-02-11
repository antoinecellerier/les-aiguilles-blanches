"""E2E tests for the ski/snowboard reward run feature."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, click_button, get_active_scenes,
    assert_scene_active, BUTTON_START,
)


class TestSkiRun:
    """Test ski run entry, scene lifecycle, and settings."""

    def test_ski_button_appears_on_win(self, game_page: Page):
        """Ski it! button should appear on level complete (win)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        # Trigger a win via gameOver(true)
        game_page.evaluate("""() => {
            var gs = window.game.scene.getScene('GameScene');
            if (gs && gs.gameOver) gs.gameOver(true);
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        game_page.wait_for_timeout(500)

        has_ski_btn = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return false;
            var found = false;
            scene.children.list.forEach(function(c) {
                if (c.type === 'Text' && c.text &&
                    (c.text.indexOf('Ski') >= 0 || c.text.indexOf('Ride') >= 0)) found = true;
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text &&
                        (child.text.indexOf('Ski') >= 0 || child.text.indexOf('Ride') >= 0)) found = true;
                });
            });
            return found;
        }""")
        assert has_ski_btn, "Ski/Ride button should appear on win screen"

    def test_ski_run_scene_loads(self, game_page: Page):
        """K dev shortcut should launch SkiRunScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        assert_scene_active(game_page, 'SkiRunScene', "SkiRunScene should be active after K shortcut")

    def test_ski_run_reaches_bottom(self, game_page: Page):
        """Skier should reach bottom and transition back to LevelCompleteScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        # Wait for run to complete (tutorial is short)
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=30000)
        assert_scene_active(game_page, 'LevelCompleteScene',
                            "Should return to LevelCompleteScene after reaching bottom")

    def test_ski_run_abort_with_escape(self, game_page: Page):
        """ESC during ski run should abort and return to LevelCompleteScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        assert_scene_active(game_page, 'LevelCompleteScene',
                            "ESC should abort ski run and return to LevelCompleteScene")

    def test_snowboard_mode_uses_snowboarder_texture(self, game_page: Page):
        """Setting snowboard mode should use snowboarder texture."""
        game_page.evaluate("localStorage.setItem('snowGroomer_skiMode', 'snowboard')")
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        texture = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return null;
            var kids = scene.children.list;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i].texture && kids[i].texture.key.indexOf('snowboarder') >= 0)
                    return kids[i].texture.key;
            }
            return null;
        }""")
        assert texture is not None and 'snowboarder' in texture, \
            f"Should use snowboarder texture, got {texture}"

    def test_ski_run_hud_shows_speed_and_time(self, game_page: Page):
        """HUD should display speed in km/h and elapsed time."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_timeout(1000)  # let speed build up

        hud_texts = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return [];
            return scene.children.list
                .filter(function(c) { return c.type === 'Text'; })
                .map(function(c) { return c.text; });
        }""")
        has_speed = any('km/h' in t for t in hud_texts)
        has_time = any(':' in t and ('Time' in t or 'Temps' in t or 'Zeit' in t) for t in hud_texts)
        assert has_speed, f"HUD should show speed in km/h, got: {hud_texts}"
        assert has_time, f"HUD should show elapsed time, got: {hud_texts}"

    def test_ski_replay_button_available(self, game_page: Page):
        """After finishing a ski run, the ski button should appear again for replay."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=30000)
        game_page.wait_for_timeout(1000)  # let UI fully render

        has_ski_btn = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return false;
            var found = false;
            scene.children.list.forEach(function(c) {
                if (c.type === 'Text' && c.text &&
                    (c.text.indexOf('Ski') >= 0 || c.text.indexOf('Ride') >= 0)) found = true;
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text &&
                        (child.text.indexOf('Ski') >= 0 || child.text.indexOf('Ride') >= 0)) found = true;
                });
            });
            return found;
        }""")
        assert has_ski_btn, "Ski/Ride button should be available for replay after finishing"


class TestSkiSettings:
    """Test descent mode selector in settings."""

    def test_settings_shows_descent_mode(self, game_page: Page):
        """Settings should have a descent mode selector with Ski and Snowboard buttons."""
        # Navigate to settings
        from conftest import navigate_to_settings
        navigate_to_settings(game_page)

        texts = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SettingsScene');
            if (!scene) return [];
            return scene.children.list
                .filter(function(c) { return c.type === 'Text'; })
                .map(function(c) { return c.text; });
        }""")
        has_ski = any('Ski' in t for t in texts)
        has_snowboard = any('Snowboard' in t or 'snowboard' in t.lower() for t in texts)
        assert has_ski, f"Settings should show Ski option, got: {texts}"
        assert has_snowboard, f"Settings should show Snowboard option, got: {texts}"
