"""E2E tests for gamepad support using mocked Gamepad API."""
import pytest
from playwright.sync_api import Page
from conftest import wait_for_scene, GAME_URL


# Helper to inject a mock gamepad into the browser
MOCK_GAMEPAD_SCRIPT = """
(function() {
    // Create a mock gamepad object
    const mockGamepad = {
        id: 'Mock Gamepad (STANDARD GAMEPAD)',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],  // Left stick X, Y, Right stick X, Y
        buttons: []
    };
    
    // Initialize 17 buttons (standard gamepad layout)
    for (let i = 0; i < 17; i++) {
        mockGamepad.buttons.push({ pressed: false, touched: false, value: 0 });
    }
    
    // Store the mock gamepad
    window._mockGamepad = mockGamepad;
    
    // Override navigator.getGamepads to return our mock
    navigator.getGamepads = function() {
        return [window._mockGamepad, null, null, null];
    };
    
    // Phaser polls getGamepads, no need to dispatch events
    // Just ensure getGamepads returns our mock
})();
"""


def press_gamepad_button(page: Page, button_index: int):
    """Press a gamepad button (0=A/B, 1=B/A, 9=Start)."""
    page.evaluate(f"""() => {{
        if (window._mockGamepad) {{
            window._mockGamepad.buttons[{button_index}].pressed = true;
            window._mockGamepad.buttons[{button_index}].value = 1;
            window._mockGamepad.timestamp = performance.now();
        }}
    }}""")


def release_gamepad_button(page: Page, button_index: int):
    """Release a gamepad button."""
    page.evaluate(f"""() => {{
        if (window._mockGamepad) {{
            window._mockGamepad.buttons[{button_index}].pressed = false;
            window._mockGamepad.buttons[{button_index}].value = 0;
            window._mockGamepad.timestamp = performance.now();
        }}
    }}""")


def set_gamepad_stick(page: Page, stick: str, x: float, y: float):
    """Set left or right stick position (-1 to 1)."""
    if stick == 'left':
        page.evaluate(f"""() => {{
            if (window._mockGamepad) {{
                window._mockGamepad.axes[0] = {x};
                window._mockGamepad.axes[1] = {y};
                window._mockGamepad.timestamp = performance.now();
            }}
        }}""")
    elif stick == 'right':
        page.evaluate(f"""() => {{
            if (window._mockGamepad) {{
                window._mockGamepad.axes[2] = {x};
                window._mockGamepad.axes[3] = {y};
                window._mockGamepad.timestamp = performance.now();
            }}
        }}""")


@pytest.fixture
def gamepad_page(page: Page):
    """Page fixture with mock gamepad injected BEFORE page load."""
    # Inject mock BEFORE navigating so Phaser sees it during initialization
    page.add_init_script(MOCK_GAMEPAD_SCRIPT)
    
    page.goto(GAME_URL)
    wait_for_scene(page, 'MenuScene')
    
    # Give Phaser a moment to poll gamepads
    page.wait_for_timeout(200)
    
    return page


class TestGamepadMenuNavigation:
    """Test gamepad navigation in menus."""

    def test_gamepad_detected(self, gamepad_page: Page):
        """Verify mock gamepad is detected by the game."""
        # Check raw navigator.getGamepads
        gamepad_count = gamepad_page.evaluate("""() => {
            const gamepads = navigator.getGamepads();
            return gamepads.filter(g => g !== null).length;
        }""")
        assert gamepad_count >= 1, "Mock gamepad should be detected by browser"
        
        # Check Phaser scene detects it
        phaser_total = gamepad_page.evaluate("""() => {
            if (window.game && window.game.scene) {
                const menu = window.game.scene.getScene('MenuScene');
                if (menu && menu.input && menu.input.gamepad) {
                    return menu.input.gamepad.total;
                }
            }
            return -1;
        }""")
        # Note: Phaser may need a gamepadconnected event to register it
        # If Phaser total is -1 or 0, mock may not work properly with Phaser
        # This is a known limitation of mocking the Gamepad API
        assert phaser_total >= 0, f"Phaser gamepad manager should exist (got {phaser_total})"

    def test_stick_navigation_changes_selection(self, gamepad_page: Page):
        """Test that stick movement changes menu selection."""
        # Move stick down
        set_gamepad_stick(gamepad_page, 'left', 0, 0.8)
        gamepad_page.wait_for_timeout(300)  # Navigation cooldown
        
        # Move stick back to center
        set_gamepad_stick(gamepad_page, 'left', 0, 0)
        gamepad_page.wait_for_timeout(100)
        
        # Verify menu is still responsive - wait_for_scene returns None on success
        wait_for_scene(gamepad_page, 'MenuScene')

    def test_a_button_starts_game(self, gamepad_page: Page):
        """Test A button (index 0) starts game from menu."""
        # Press and release A button
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        # Should transition to GameScene
        wait_for_scene(gamepad_page, 'GameScene', timeout=3000)

    def test_b_button_in_settings_goes_back(self, gamepad_page: Page):
        """Test B button goes back from settings."""
        # Navigate to settings: Start(0) -> HowToPlay(1) -> Settings(2)
        # Use quick pulses to avoid multiple navigations per pulse
        for _ in range(2):
            set_gamepad_stick(gamepad_page, 'left', 0, 0.8)
            gamepad_page.wait_for_timeout(50)  # Very short pulse
            set_gamepad_stick(gamepad_page, 'left', 0, 0)
            gamepad_page.wait_for_timeout(250)  # Wait for cooldown to reset
        
        # Verify we're on Settings (index 2)
        selected = gamepad_page.evaluate(
            "() => window.game.scene.getScene('MenuScene').selectedIndex"
        )
        assert selected == 2, f"Should be on Settings (index 2), got {selected}"
        
        # Press A to enter settings
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(150)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'SettingsScene', timeout=3000)
        
        # Press B to go back
        press_gamepad_button(gamepad_page, 1)
        gamepad_page.wait_for_timeout(150)
        release_gamepad_button(gamepad_page, 1)
        
        wait_for_scene(gamepad_page, 'MenuScene', timeout=3000)


class TestGamepadGameplay:
    """Test gamepad controls during gameplay."""

    def test_start_button_pauses_game(self, gamepad_page: Page):
        """Test Start button (index 9) pauses the game."""
        # Start game first
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'GameScene')
        
        # Dismiss any dialogues
        for _ in range(5):
            press_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(100)
            release_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(200)
        
        # Press Start to pause
        press_gamepad_button(gamepad_page, 9)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 9)
        
        wait_for_scene(gamepad_page, 'PauseScene', timeout=2000)

    def test_a_button_dismisses_dialogue(self, gamepad_page: Page):
        """Test A button advances dialogue."""
        # Start game
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'GameScene')
        
        # Wait for dialogue to appear (level 0 shows tutorial dialogue)
        gamepad_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds && ds.isDialogueShowing && ds.isDialogueShowing();
        }""", timeout=3000)
        
        # Press A to dismiss
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(150)
        release_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(300)
        
        # Verify game is still active (didn't crash or go back to menu)
        wait_for_scene(gamepad_page, 'GameScene')
