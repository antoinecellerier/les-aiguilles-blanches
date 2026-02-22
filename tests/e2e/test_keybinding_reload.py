"""E2E tests for keybinding reload after rebinding in settings.

Verifies that custom keybindings saved in settings are correctly loaded
when gameplay resumes (GameScene reads from localStorage).
"""
import pytest
from playwright.sync_api import Page
from conftest import wait_for_scene, navigate_to_settings


# Default groom key is Space (keyCode 32); we rebind to E (keyCode 69)
REBOUND_GROOM_KEYCODE = 69  # 'E'


class TestKeybindingReload:
    """Verify that rebound keys persist and are used in gameplay."""

    def test_custom_bindings_loaded_by_game_scene(self, game_page: Page):
        """GameScene should read custom keybindings from localStorage."""
        # Write custom bindings (groom rebound from Space to E)
        game_page.evaluate(f"""() => {{
            const raw = localStorage.getItem('snowGroomer_bindings');
            const bindings = raw ? JSON.parse(raw) : {{
                up: 87, down: 83, left: 65, right: 68, groom: 32, winch: 16
            }};
            bindings.groom = {REBOUND_GROOM_KEYCODE};
            localStorage.setItem('snowGroomer_bindings', JSON.stringify(bindings));
            localStorage.setItem('snowGroomer_bindingsVersion', '2');
        }}""")

        # Start a grooming level
        game_page.evaluate("""() => {
            const game = window.game;
            game.scene.start('GameScene', { level: 0 });
        }""")
        wait_for_scene(game_page, 'GameScene')
        # Wait for GameScene to set up input bindings
        game_page.wait_for_function(
            "() => window.game.scene.getScene('GameScene')?.groomKey != null",
            timeout=5000)

        # Verify GameScene loaded the rebound groom key
        groom_keycode = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('GameScene');
            return scene.groomKey ? scene.groomKey.keyCode : null;
        }""")
        assert groom_keycode == REBOUND_GROOM_KEYCODE, \
            f"Expected groom keyCode {REBOUND_GROOM_KEYCODE} (E), got {groom_keycode}"

    def test_rebind_via_settings_then_play(self, game_page: Page):
        """Full flow: rebind in settings UI, then verify gameplay uses it."""
        # Navigate to settings
        navigate_to_settings(game_page)
        game_page.wait_for_function(
            "() => window.game.scene.getScene('SettingsScene')?.keys != null",
            timeout=5000)

        # Trigger rebind for 'groom' action via the keybinding manager
        game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('SettingsScene');
            if (!scene || !scene.keys) throw new Error('SettingsScene not ready');
            // Create a mock button (startRebind calls setText/setStyle on it)
            const mockBtn = {
                setText: () => mockBtn, setStyle: () => mockBtn,
                setAlpha: () => mockBtn, setData: () => mockBtn,
            };
            scene.keys.startRebind('groom', mockBtn);
        }""")

        # Verify rebinding mode is active
        rebinding = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('SettingsScene');
            return scene.keys.rebindingAction;
        }""")
        assert rebinding == 'groom', f"Expected rebinding 'groom', got {rebinding}"

        # Press 'E' to complete the rebind
        game_page.keyboard.press('e')
        # Wait for binding to be saved
        game_page.wait_for_function(
            "() => { const r = localStorage.getItem('snowGroomer_bindings'); "
            "return r && JSON.parse(r).groom === 69; }",
            timeout=5000)

        # Verify binding was saved to localStorage
        saved_groom = game_page.evaluate("""() => {
            const raw = localStorage.getItem('snowGroomer_bindings');
            return raw ? JSON.parse(raw).groom : null;
        }""")
        assert saved_groom == REBOUND_GROOM_KEYCODE, \
            f"Expected saved groom={REBOUND_GROOM_KEYCODE}, got {saved_groom}"

        # Start a game level
        game_page.evaluate("""() => {
            window.game.scene.start('GameScene', { level: 0 });
        }""")
        wait_for_scene(game_page, 'GameScene')
        # Wait for GameScene to set up input bindings
        game_page.wait_for_function(
            "() => window.game.scene.getScene('GameScene')?.groomKey != null",
            timeout=5000)

        # Verify GameScene picked up the new binding
        groom_keycode = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('GameScene');
            return scene.groomKey ? scene.groomKey.keyCode : null;
        }""")
        assert groom_keycode == REBOUND_GROOM_KEYCODE, \
            f"Expected groom keyCode {REBOUND_GROOM_KEYCODE} after rebind, got {groom_keycode}"

    def test_default_bindings_without_customization(self, game_page: Page):
        """Without rebinding, default bindings should be used."""
        # Clear any saved bindings
        game_page.evaluate("""() => {
            localStorage.removeItem('snowGroomer_bindings');
            localStorage.removeItem('snowGroomer_bindingsVersion');
            localStorage.removeItem('snowGroomer_displayNames');
        }""")

        game_page.evaluate("""() => {
            window.game.scene.start('GameScene', { level: 0 });
        }""")
        wait_for_scene(game_page, 'GameScene')
        # Wait for GameScene to set up input bindings
        game_page.wait_for_function(
            "() => window.game.scene.getScene('GameScene')?.groomKey != null",
            timeout=5000)

        # Verify default groom key is Space (32)
        groom_keycode = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('GameScene');
            return scene.groomKey ? scene.groomKey.keyCode : null;
        }""")
        assert groom_keycode == 32, \
            f"Expected default groom keyCode 32 (Space), got {groom_keycode}"
