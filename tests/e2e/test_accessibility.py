"""E2E tests for accessibility features, HUD display, and background rendering."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene,
    click_button, click_menu_by_key, assert_scene_active, assert_no_error_message,
    BUTTON_START,
)


class TestAccessibility:
    """Test accessibility features."""

    def test_settings_has_accessibility_options(self, game_page: Page):
        """Test that settings scene has accessibility toggles."""
        click_menu_by_key(game_page, 'settings')
        wait_for_scene(game_page, 'SettingsScene')
        
        assert_scene_active(game_page, 'SettingsScene')
        game_page.screenshot(path="tests/screenshots/settings_accessibility.png")

    def test_colorblind_filter_applied(self, game_page: Page):
        """Test that colorblind mode applies CSS filter to canvas."""
        game_page.evaluate("""() => {
            const a = window.Accessibility;
            if (a) {
                a.settings.colorblindMode = 'deuteranopia';
                a.applyDOMSettings();
            }
        }""")
        
        filter_exists = game_page.evaluate("""() => {
            return document.getElementById('colorblind-filters') !== null;
        }""")
        assert filter_exists, "Colorblind SVG filter element should exist after enabling colorblind mode"

    def test_high_contrast_class_applied(self, game_page: Page):
        """Test that high contrast mode adds CSS class."""
        game_page.evaluate("""() => {
            const a = window.Accessibility;
            if (a) {
                a.settings.highContrast = true;
                a.applyDOMSettings();
            }
        }""")
        
        has_class = game_page.evaluate("""() => {
            return document.body.classList.contains('high-contrast');
        }""")
        assert has_class, "Body should have 'high-contrast' class after enabling high contrast mode"


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


class TestBackgroundRendering:
    """Test extended background rendering."""

    def test_game_renders_without_errors(self, game_page: Page):
        """Test game scene renders completely without JS errors."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        assert_no_error_message(game_page)
        assert_scene_active(game_page, 'GameScene')
        
        game_page.screenshot(path="tests/screenshots/game_background.png")
        
        has_bg = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs && gs.pisteRenderer && typeof gs.pisteRenderer.createExtendedBackground === 'function';
        }""")
        assert has_bg, "GameScene should have pisteRenderer.createExtendedBackground method"
