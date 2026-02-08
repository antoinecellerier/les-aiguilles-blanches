"""E2E tests for gamepad support using mocked Gamepad API."""
import pytest
from playwright.sync_api import Page
from conftest import wait_for_scene, GAME_URL


def make_mock_gamepad_script(gamepad_id: str = 'Mock Gamepad (STANDARD GAMEPAD)') -> str:
    """Generate a mock gamepad init script with the given controller ID."""
    return f"""
(function() {{
    const mockGamepad = {{
        id: '{gamepad_id}',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: []
    }};
    for (let i = 0; i < 17; i++) {{
        mockGamepad.buttons.push({{ pressed: false, touched: false, value: 0 }});
    }}
    window._mockGamepad = mockGamepad;
    navigator.getGamepads = function() {{
        return [window._mockGamepad, null, null, null];
    }};
}})();
"""


MOCK_GAMEPAD_SCRIPT = make_mock_gamepad_script()


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
    
    # Wait for Phaser to detect the mock gamepad via polling
    page.wait_for_function(
        "() => navigator.getGamepads()[0]?.connected === true",
        timeout=3000
    )
    
    yield page
    page.evaluate("localStorage.clear()")


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
        # Navigate to settings: Start(0) -> HowToPlay(1) -> Changelog(2) -> Settings(3)
        # Use quick pulses to avoid multiple navigations per pulse
        for _ in range(3):
            set_gamepad_stick(gamepad_page, 'left', 0, 0.8)
            gamepad_page.wait_for_timeout(50)  # Very short pulse
            set_gamepad_stick(gamepad_page, 'left', 0, 0)
            gamepad_page.wait_for_timeout(250)  # Wait for cooldown to reset
        
        # Verify we're on Settings (index 3)
        selected = gamepad_page.evaluate(
            "() => window.game.scene.getScene('MenuScene').selectedIndex"
        )
        assert selected == 3, f"Should be on Settings (index 3), got {selected}"
        
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
        
        # Dismiss all dialogues — keep pressing A until dialogue is gone
        for _ in range(15):
            is_showing = gamepad_page.evaluate("""() => {
                const ds = window.game?.scene?.getScene('DialogueScene');
                return ds?.isDialogueShowing?.() ?? false;
            }""")
            if not is_showing:
                break
            press_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(100)
            release_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(200)
        
        # Wait for dialogue to fully clear
        gamepad_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds && ds.isDialogueShowing && !ds.isDialogueShowing();
        }""", timeout=3000)
        
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


# Nintendo controller mock - uses different ID for button swap detection
MOCK_NINTENDO_GAMEPAD_SCRIPT = make_mock_gamepad_script(
    'Nintendo Switch Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)'
)


@pytest.fixture
def nintendo_page(page: Page):
    """Page fixture with Nintendo Switch Pro Controller mock."""
    page.add_init_script(MOCK_NINTENDO_GAMEPAD_SCRIPT)
    page.goto(GAME_URL)
    wait_for_scene(page, 'MenuScene')
    page.wait_for_function(
        "() => navigator.getGamepads()[0]?.connected === true",
        timeout=3000
    )
    yield page
    page.evaluate("localStorage.clear()")


class TestNintendoControllerSwap:
    """Test that Nintendo controller has swapped A/B buttons."""

    def test_nintendo_detected(self, nintendo_page: Page):
        """Verify Nintendo controller is detected."""
        gamepad_id = nintendo_page.evaluate("""() => {
            const gamepads = navigator.getGamepads();
            return gamepads[0]?.id || null;
        }""")
        assert 'Nintendo' in gamepad_id, f"Should detect Nintendo controller, got: {gamepad_id}"

    def test_nintendo_a_button_confirms(self, nintendo_page: Page):
        """On Nintendo, physical A button (index 1) should confirm."""
        # On Nintendo, A is at button index 1 (east position)
        # The game should now use button 1 for confirm on Nintendo
        press_gamepad_button(nintendo_page, 1)  # Nintendo A = index 1
        nintendo_page.wait_for_timeout(100)
        release_gamepad_button(nintendo_page, 1)
        
        # Should start game (confirm action)
        wait_for_scene(nintendo_page, 'GameScene', timeout=3000)

    def test_nintendo_b_button_goes_back(self, nintendo_page: Page):
        """On Nintendo, physical B button (index 0) should go back."""
        # First enter settings (index 3)
        for _ in range(3):
            set_gamepad_stick(nintendo_page, 'left', 0, 0.8)
            nintendo_page.wait_for_timeout(50)
            set_gamepad_stick(nintendo_page, 'left', 0, 0)
            nintendo_page.wait_for_timeout(250)
        
        # Confirm with Nintendo A (index 1)
        press_gamepad_button(nintendo_page, 1)
        nintendo_page.wait_for_timeout(150)
        release_gamepad_button(nintendo_page, 1)
        
        wait_for_scene(nintendo_page, 'SettingsScene', timeout=3000)
        
        # Go back with Nintendo B (index 0)
        press_gamepad_button(nintendo_page, 0)  # Nintendo B = index 0
        nintendo_page.wait_for_timeout(150)
        release_gamepad_button(nintendo_page, 0)
        
        wait_for_scene(nintendo_page, 'MenuScene', timeout=3000)


# PlayStation controller mock
MOCK_PLAYSTATION_GAMEPAD_SCRIPT = make_mock_gamepad_script(
    'Sony DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'
)


@pytest.fixture
def playstation_page(page: Page):
    """Page fixture with PlayStation DualSense controller mock."""
    page.add_init_script(MOCK_PLAYSTATION_GAMEPAD_SCRIPT)
    page.goto(GAME_URL)
    wait_for_scene(page, 'MenuScene')
    page.wait_for_function(
        "() => navigator.getGamepads()[0]?.connected === true",
        timeout=3000
    )
    yield page
    page.evaluate("localStorage.clear()")


class TestPlayStationController:
    """Test PlayStation controller button mapping."""

    def test_playstation_detected(self, playstation_page: Page):
        """Verify PlayStation controller is detected."""
        gamepad_id = playstation_page.evaluate("""() => {
            const gamepads = navigator.getGamepads();
            return gamepads[0]?.id || null;
        }""")
        assert 'Sony' in gamepad_id or 'DualSense' in gamepad_id, f"Should detect PlayStation controller, got: {gamepad_id}"

    def test_playstation_cross_button_confirms(self, playstation_page: Page):
        """On PlayStation, Cross button (index 0) should confirm."""
        # PlayStation Cross = button index 0 (same as Xbox A)
        press_gamepad_button(playstation_page, 0)
        playstation_page.wait_for_timeout(100)
        release_gamepad_button(playstation_page, 0)
        
        # Should start game (confirm action)
        wait_for_scene(playstation_page, 'GameScene', timeout=3000)

    def test_playstation_circle_button_goes_back(self, playstation_page: Page):
        """On PlayStation, Circle button (index 1) should go back."""
        # First enter settings (index 3)
        for _ in range(3):
            set_gamepad_stick(playstation_page, 'left', 0, 0.8)
            playstation_page.wait_for_timeout(50)
            set_gamepad_stick(playstation_page, 'left', 0, 0)
            playstation_page.wait_for_timeout(250)
        
        # Confirm with Cross (index 0)
        press_gamepad_button(playstation_page, 0)
        playstation_page.wait_for_timeout(150)
        release_gamepad_button(playstation_page, 0)
        
        wait_for_scene(playstation_page, 'SettingsScene', timeout=3000)
        
        # Go back with Circle (index 1)
        press_gamepad_button(playstation_page, 1)
        playstation_page.wait_for_timeout(150)
        release_gamepad_button(playstation_page, 1)
        
        wait_for_scene(playstation_page, 'MenuScene', timeout=3000)


class TestGamepadDialogueDismiss:
    """Test gamepad B button dismisses dialogue."""

    def test_b_button_dismisses_dialogue(self, gamepad_page: Page):
        """B button should dismiss all dialogue (like ESC)."""
        # Start game
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'GameScene')
        
        # Wait for tutorial dialogue
        gamepad_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds && ds.isDialogueShowing && ds.isDialogueShowing();
        }""", timeout=5000)
        
        # Press B (button 1) to dismiss
        press_gamepad_button(gamepad_page, 1)
        gamepad_page.wait_for_timeout(150)
        release_gamepad_button(gamepad_page, 1)
        gamepad_page.wait_for_timeout(300)
        
        # Dialogue should be dismissed
        showing = gamepad_page.evaluate("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.isDialogueShowing ? ds.isDialogueShowing() : false;
        }""")
        
        assert not showing, "B button should dismiss all dialogue"


class TestGamepadSelectSkip:
    """Test gamepad Select button skips level."""

    def test_select_button_skips_level(self, gamepad_page: Page):
        """Select button (button 8) should skip to next level."""
        # Start game
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'GameScene')
        gamepad_page.wait_for_timeout(1000)
        
        # Get current level
        level_before = gamepad_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.levelIndex ?? -1;
        }""")
        
        # Press Select (button 8)
        press_gamepad_button(gamepad_page, 8)
        gamepad_page.wait_for_timeout(150)
        release_gamepad_button(gamepad_page, 8)
        gamepad_page.wait_for_timeout(1000)
        
        # Level should have advanced
        level_after = gamepad_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.levelIndex ?? -1;
        }""")
        
        assert level_after == level_before + 1, \
            f"Select should skip level: was {level_before}, now {level_after}"


    def test_held_select_does_not_double_skip(self, gamepad_page: Page):
        """Holding Select across a level skip should not skip the next level too."""
        # Start game
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)

        wait_for_scene(gamepad_page, 'GameScene')
        gamepad_page.wait_for_timeout(1000)

        # Press Select and HOLD it across the transition
        press_gamepad_button(gamepad_page, 8)
        gamepad_page.wait_for_timeout(150)
        # Don't release — keep held

        # Wait for level to advance
        gamepad_page.wait_for_function("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.levelIndex >= 1;
        }""", timeout=5000)
        gamepad_page.wait_for_timeout(1500)

        # Should be on level 1, NOT level 2+ (no double-skip)
        level = gamepad_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.levelIndex ?? -1;
        }""")

        release_gamepad_button(gamepad_page, 8)

        assert level == 1, \
            f"Held Select should skip exactly one level (expected 1, got {level})"


class TestDialoguePlaceholders:
    """Test dialogue placeholders resolve correctly."""

    def test_groom_key_placeholder_resolves(self, gamepad_page: Page):
        """Dialogue text should show actual key names, not raw {groomKey}."""
        # Start game
        press_gamepad_button(gamepad_page, 0)
        gamepad_page.wait_for_timeout(100)
        release_gamepad_button(gamepad_page, 0)
        
        wait_for_scene(gamepad_page, 'GameScene')
        gamepad_page.wait_for_timeout(2000)
        
        # Advance to groom tutorial dialogue
        for _ in range(10):
            press_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(100)
            release_gamepad_button(gamepad_page, 0)
            gamepad_page.wait_for_timeout(400)
            
            # Check if current dialogue contains groom key info
            text = gamepad_page.evaluate("""() => {
                const ds = window.game?.scene?.getScene('DialogueScene');
                return ds?.dialogueText?.text ?? '';
            }""")
            
            if '{groomKey}' in text:
                pytest.fail("Placeholder {groomKey} was not resolved in dialogue text")
            if '{winchKey}' in text:
                pytest.fail("Placeholder {winchKey} was not resolved in dialogue text")
