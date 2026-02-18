"""E2E tests for pause menu functionality."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, wait_for_scene_inactive, wait_for_input_ready, dismiss_dialogues,
    click_button, click_menu_by_key, get_active_scenes, assert_scene_active, assert_scene_not_active,
    BUTTON_START,
)


class TestPauseMenu:
    """Test pause functionality."""

    def test_escape_opens_pause_menu(self, game_page: Page):
        """Test that Escape opens PauseScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        dismiss_dialogues(game_page)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        
        assert_scene_active(game_page, 'PauseScene', "Escape should open pause menu")
        game_page.screenshot(path="tests/screenshots/pause_menu.png")

    def test_escape_toggles_pause(self, game_page: Page):
        """Test Escape toggles pause on/off."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        dismiss_dialogues(game_page)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        assert_scene_active(game_page, 'PauseScene')
        
        wait_for_input_ready(game_page, "PauseScene")
        
        game_page.keyboard.press("Escape")
        wait_for_scene_inactive(game_page, 'PauseScene')
        assert_scene_not_active(game_page, 'PauseScene', "Pause should close on second Escape")

    def test_pause_menu_buttons_visible(self, game_page: Page):
        """Test that pause menu shows all expected buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        dismiss_dialogues(game_page)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        
        assert_scene_active(game_page, 'PauseScene', "Pause menu should be open")
        
        button_count = game_page.evaluate("""
            () => {
                const pauseScene = window.game?.scene?.getScene('PauseScene');
                if (!pauseScene) return 0;
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

    def test_pause_settings_roundtrip(self, game_page: Page):
        """Test Pause → Settings → Back returns to Pause, then Resume works."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        dismiss_dialogues(game_page)

        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        wait_for_input_ready(game_page, "PauseScene")

        game_page.evaluate("""() => {
            const ps = window.game?.scene?.getScene('PauseScene');
            for (const child of ps.children.list) {
                if (child.type === 'Text' && child.input?.enabled) {
                    if (child.text.toLowerCase().includes('settings') || child.text.toLowerCase().includes('paramètres')) {
                        child.emit('pointerdown');
                        return;
                    }
                }
            }
        }""")
        wait_for_scene(game_page, 'SettingsScene')
        assert_scene_active(game_page, 'SettingsScene', "Settings should open from Pause")

        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        assert_scene_active(game_page, 'PauseScene', "Should return to Pause after Settings")
        wait_for_input_ready(game_page, "PauseScene")

        game_page.keyboard.press("Escape")
        wait_for_scene_inactive(game_page, 'PauseScene')
        assert_scene_active(game_page, 'GameScene', "Game should resume after Pause")

    def test_quit_then_settings_returns_to_menu(self, game_page: Page):
        """Regression: Pause→Settings→Back then Quit→Menu→Settings→Back must return to Menu.

        Previously, SettingsScene retained stale returnTo='PauseScene' data from a
        previous Pause→Settings visit, causing Settings→Back to re-launch game scenes
        instead of returning to MenuScene.
        """
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        dismiss_dialogues(game_page)

        # First: Pause → Settings → Back → Resume
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        wait_for_input_ready(game_page, "PauseScene")
        game_page.evaluate("""() => {
            const ps = window.game?.scene?.getScene('PauseScene');
            for (const child of ps.children.list) {
                if (child.type === 'Text' && child.input?.enabled &&
                    (child.text.toLowerCase().includes('settings') || child.text.toLowerCase().includes('paramètres'))) {
                    child.emit('pointerdown');
                    return;
                }
            }
        }""")
        wait_for_scene(game_page, 'SettingsScene')
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        wait_for_input_ready(game_page, "PauseScene")
        game_page.keyboard.press("Escape")
        wait_for_scene_inactive(game_page, 'PauseScene')

        # Now: Pause → Quit to menu
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        wait_for_input_ready(game_page, "PauseScene")
        game_page.evaluate("""() => {
            const ps = window.game?.scene?.getScene('PauseScene');
            for (const child of ps.children.list) {
                if (child.type === 'Text' && child.input?.enabled &&
                    (child.text.toLowerCase().includes('quit') || child.text.toLowerCase().includes('quitter'))) {
                    child.emit('pointerdown');
                    return;
                }
            }
        }""")
        wait_for_scene(game_page, 'MenuScene')

        # Menu → Settings → Back: must return to Menu
        click_menu_by_key(game_page, 'settings')
        wait_for_scene(game_page, 'SettingsScene')
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene', "Should return to Menu, not game scene")
        assert_scene_not_active(game_page, 'GameScene', "GameScene should not be active")
        assert_scene_not_active(game_page, 'PauseScene', "PauseScene should not be active")
