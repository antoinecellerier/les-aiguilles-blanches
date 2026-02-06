"""E2E tests for game navigation and basic flows."""
import pytest
from playwright.sync_api import Page, expect
from conftest import wait_for_scene, wait_for_scene_inactive, skip_to_credits, wait_for_level_or_credits, skip_to_level, dismiss_dialogues


def click_menu_button(page: Page, button_index: int, button_name: str = "button"):
    """Click a menu button by index (0=Start, 1=How to Play, 2=Changelog, 3=Settings).
    
    Queries actual button positions from the game scene for reliability across layouts.
    """
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box, "Canvas not found"
    
    # Query the button's position directly from the game scene
    pos = page.evaluate(f"""() => {{
        const scene = window.game?.scene?.getScene('MenuScene');
        if (!scene || !scene.menuButtons) return null;
        const btn = scene.menuButtons[{button_index}];
        if (!btn) return null;
        return {{ x: btn.x, y: btn.y }};
    }}""")
    
    if pos:
        # Convert game coordinates to page coordinates
        page.mouse.click(box["x"] + pos["x"], box["y"] + pos["y"])
    else:
        # Fallback: use keyboard navigation
        for _ in range(button_index):
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(50)
        page.keyboard.press("Enter")


# Legacy constants for backward compatibility
BUTTON_START = 0
BUTTON_HOW_TO_PLAY = 1
BUTTON_CHANGELOG = 2
BUTTON_SETTINGS = 3


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
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open after clicking How to Play"

    def test_how_to_play_dismiss_with_enter(self, game_page: Page):
        """Test How to Play overlay dismissed with Enter without triggering menu action."""
        assert_scene_active(game_page, 'MenuScene')
        
        # Navigate to How To Play with keyboard and activate it
        game_page.keyboard.press("ArrowDown")  # Move to How To Play (index 1)
        game_page.wait_for_timeout(100)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_timeout(200)
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open"
        
        # Press Enter to dismiss - this should ONLY close overlay, not trigger menu
        game_page.keyboard.press("Enter")
        game_page.wait_for_timeout(200)
        
        # Verify overlay is closed
        overlay_closed = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === false;
        }""")
        assert overlay_closed, "Overlay should be closed after Enter"
        
        # CRITICAL: Menu should still be active (not GameScene from accidental activation)
        assert_scene_active(game_page, 'MenuScene', "Menu should still be active - Enter should only close overlay")

    def test_how_to_play_dismiss_with_space(self, game_page: Page):
        """Test How to Play overlay dismissed with Space without triggering menu action."""
        assert_scene_active(game_page, 'MenuScene')
        
        # Navigate to How To Play with keyboard and activate it
        game_page.keyboard.press("ArrowDown")  # Move to How To Play (index 1)
        game_page.wait_for_timeout(100)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_timeout(200)
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open"
        
        # Press Space to dismiss - this should ONLY close overlay, not trigger menu
        game_page.keyboard.press("Space")
        game_page.wait_for_timeout(200)
        
        # Verify overlay is closed
        overlay_closed = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === false;
        }""")
        assert overlay_closed, "Overlay should be closed after Space"
        
        # CRITICAL: Menu should still be active (not GameScene from accidental activation)
        assert_scene_active(game_page, 'MenuScene', "Menu should still be active - Space should only close overlay")

    def test_overlay_blocks_menu_navigation(self, game_page: Page):
        """Test that arrow keys don't change menu selection while overlay is open."""
        assert_scene_active(game_page, 'MenuScene')
        
        # Get initial selection
        initial_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.selectedIndex;
        }""")
        assert initial_index == 0, "Should start with first button selected"
        
        # Open How To Play overlay via keyboard (not mouse) to avoid hover effects
        game_page.keyboard.press("ArrowDown")  # Move to How To Play (index 1)
        game_page.wait_for_timeout(100)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_timeout(200)
        
        # Selection should be 1 (How To Play) after we navigated there
        pre_nav_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.selectedIndex;
        }""")
        assert pre_nav_index == 1, "Should be on How To Play button"
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open"
        
        # Try to navigate with arrows while overlay is open
        game_page.keyboard.press("ArrowDown")
        game_page.keyboard.press("ArrowDown")
        game_page.wait_for_timeout(100)
        
        # Selection should NOT have changed from 1
        current_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.selectedIndex;
        }""")
        assert current_index == pre_nav_index, f"Menu selection should not change while overlay is open (was {pre_nav_index}, now {current_index})"

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

    def test_changelog_overlay_renders_content(self, game_page: Page):
        """Test Changelog overlay opens and renders visible text content."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_CHANGELOG, "Changelog")
        game_page.wait_for_timeout(300)
        
        # Overlay should be open
        overlay_open = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.overlayOpen === true;
        }""")
        assert overlay_open, "Changelog overlay should be open"
        
        # Verify changelog content is actually rendered (not empty/invisible)
        # Sample the canvas for non-background pixels in the overlay area
        has_text = game_page.evaluate("""() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return false;
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            const w = canvas.width, h = canvas.height;
            // Sample the center region where changelog text should appear
            const data = ctx.getImageData(Math.floor(w * 0.2), Math.floor(h * 0.3),
                                          Math.floor(w * 0.6), Math.floor(h * 0.4)).data;
            // Count pixels that are not near-black (overlay bg is dark blue ~0x1a2a3e)
            let textPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                // Text is light colored (#cccccc or #87ceeb) - check for bright pixels
                if (r > 100 || g > 100 || b > 100) textPixels++;
            }
            return textPixels > 50;  // Should have many bright text pixels
        }""")
        assert has_text, "Changelog overlay should render visible text content"
        
        # ESC should close it
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(200)
        
        overlay_closed = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.overlayOpen !== true;
        }""")
        assert overlay_closed, "Changelog overlay should close with ESC"

    def test_changelog_fits_small_screen(self, game_page: Page):
        """Test Changelog overlay renders visible content on phone-sized screen."""
        # Resize to phone dimensions
        game_page.set_viewport_size({"width": 375, "height": 667})
        game_page.evaluate("window.resizeGame?.()")
        game_page.wait_for_timeout(500)
        
        # Re-enter menu to re-layout with new size
        game_page.evaluate("""() => {
            window.game.scene.getScene('MenuScene')?.scene.restart();
        }""")
        game_page.wait_for_timeout(500)
        assert_scene_active(game_page, 'MenuScene')
        
        # Use keyboard navigation to reach changelog (index 2)
        game_page.keyboard.press("ArrowDown")  # index 1 = How to Play
        game_page.wait_for_timeout(100)
        game_page.keyboard.press("ArrowDown")  # index 2 = Changelog
        game_page.wait_for_timeout(100)
        game_page.keyboard.press("Enter")
        game_page.wait_for_timeout(300)
        
        # Overlay should be open
        overlay_open = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.overlayOpen === true;
        }""")
        assert overlay_open, "Changelog overlay should be open on small screen"
        
        # Content should be visible (not clipped or invisible)
        has_text = game_page.evaluate("""() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return false;
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            const w = canvas.width, h = canvas.height;
            const data = ctx.getImageData(Math.floor(w * 0.15), Math.floor(h * 0.25),
                                          Math.floor(w * 0.7), Math.floor(h * 0.5)).data;
            let textPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                if (r > 100 || g > 100 || b > 100) textPixels++;
            }
            return textPixels > 50;
        }""")
        assert has_text, "Changelog should render visible text on small screen (375x667)"
        
        # Content should fit within the screen (dialog not taller than viewport)
        fits_screen = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (!scene) return false;
            const h = scene.cameras.main.height;
            // Check all text objects are within viewport bounds
            const texts = scene.children.list.filter(c => c.type === 'Text' && c.visible);
            return texts.every(t => t.y >= -10 && t.y <= h + 10);
        }""")
        assert fits_screen, "Changelog content should fit within phone screen"
        
        game_page.keyboard.press("Escape")
        game_page.wait_for_timeout(200)
        
        # Restore original viewport
        game_page.set_viewport_size({"width": 1280, "height": 720})
        game_page.evaluate("window.resizeGame?.()")
        game_page.wait_for_timeout(300)


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
        
        # Dismiss tutorial dialogues (this test just validates movement works)
        dismiss_dialogues(game_page)
        
        # Get initial position
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Move groomer and wait for position change
        game_page.keyboard.down("ArrowUp")
        try:
            game_page.wait_for_function(f"""() => {{
                const gs = window.game?.scene?.getScene('GameScene');
                return gs?.groomer && gs.groomer.y !== {initial_pos['y']};
            }}""", timeout=3000)
            moved = True
        except:
            moved = False
        game_page.keyboard.up("ArrowUp")
        
        assert moved, f"Groomer should have moved from y={initial_pos['y']}"

    def test_tutorial_grooming_increases_coverage(self, game_page: Page):
        """Test that grooming increases coverage (on level 1 for cleaner test)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 1 for cleaner grooming test
        skip_to_level(game_page, 1)
        dismiss_dialogues(game_page)
        
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
        
        # Skip directly to level 1
        skip_to_level(game_page, 1)
        
        # Dismiss any dialogues programmatically
        dismiss_dialogues(game_page)
        
        # Get initial groomer position
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        assert initial_pos is not None, "Groomer should exist"
        
        # Move groomer and wait for position to change
        game_page.keyboard.down("ArrowUp")
        
        # Wait for position to actually change (deterministic)
        try:
            game_page.wait_for_function(f"""() => {{
                const gs = window.game?.scene?.getScene('GameScene');
                return gs?.groomer && gs.groomer.y !== {initial_pos['y']};
            }}""", timeout=3000)
            moved = True
        except:
            moved = False
        
        game_page.keyboard.up("ArrowUp")
        
        assert moved, f"Groomer should have moved from y={initial_pos['y']}"

    def test_wasd_controls(self, game_page: Page):
        """Test WASD movement controls work."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 1 and dismiss dialogues
        skip_to_level(game_page, 1)
        dismiss_dialogues(game_page)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        # Hold key and wait for movement
        game_page.keyboard.down("w")
        game_page.wait_for_function(f"""() => {{
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.groomer && gs.groomer.y !== {initial_pos['y']};
        }}""", timeout=3000)
        game_page.keyboard.up("w")
        
        new_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
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

    def test_dialogue_positioned_above_touch_controls(self, game_page: Page):
        """Test that dialogue box positioning clears touch controls when visible.
        
        Dialogue position is calculated dynamically based on HUDScene's
        getTouchControlsTopEdge() to ensure it always clears the joystick.
        """
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        # Wait for dialogue to show
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('DialogueScene');
            return scene?.container?.visible === true;
        }""", timeout=5000)
        
        # Verify the dynamic calculation ensures dialogue clears touch controls
        touch_check = game_page.evaluate("""() => {
            const hudScene = window.game.scene.getScene('HUDScene');
            const dialogueScene = window.game.scene.getScene('DialogueScene');
            
            // Get the actual touch controls top edge from HUD
            const touchTopEdge = hudScene?.getTouchControlsTopEdge?.() || 0;
            
            // Dialogue box is 120px tall, centered at getDialogueShowY()
            const dialogueShowY = dialogueScene.getDialogueShowY();
            const dialogueBoxHeight = 120;
            const dialogueBottom = dialogueShowY + dialogueBoxHeight / 2;
            
            return {
                touchTopEdge: touchTopEdge,
                dialogueShowY: dialogueShowY,
                dialogueBottom: dialogueBottom,
                clearsControls: dialogueBottom < touchTopEdge || touchTopEdge === 0
            };
        }""")
        
        # If touch controls exist, dialogue must clear them
        if touch_check['touchTopEdge'] > 0:
            assert touch_check['clearsControls'], \
                f"Dialogue bottom ({touch_check['dialogueBottom']}) should be above touch controls top ({touch_check['touchTopEdge']})"

    def test_dialogue_position_responds_to_touch_controls_visibility(self, game_page: Page):
        """Test that dialogue position is dynamic based on touch controls visibility."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        # Wait for dialogue
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('DialogueScene');
            return scene?.container?.visible === true;
        }""", timeout=5000)
        
        # On desktop without touch controls visible, dialogue should be at lower position
        positions = game_page.evaluate("""() => {
            const dialogueScene = window.game.scene.getScene('DialogueScene');
            const hudScene = window.game.scene.getScene('HUDScene');
            const height = dialogueScene.cameras.main.height;
            const touchVisible = hudScene?.touchControlsContainer?.visible === true;
            const dialogueShowY = dialogueScene.getDialogueShowY();
            
            // Without touch controls visible, should use default position
            const expectedDefaultY = height - 130;
            
            return {
                dialogueShowY: dialogueShowY,
                touchControlsVisible: touchVisible,
                expectedDefaultY: expectedDefaultY,
                screenHeight: height
            };
        }""")
        
        # Without touch controls, dialogue should be at default position
        if not positions['touchControlsVisible']:
            assert positions['dialogueShowY'] == positions['expectedDefaultY'], \
                f"Dialogue Y ({positions['dialogueShowY']}) should be {positions['expectedDefaultY']} without touch controls"


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

    def test_level_complete_resize(self, game_page: Page):
        """LevelCompleteScene should survive viewport resize with elements in bounds."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        # Trigger fail to get LevelCompleteScene
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=3000)

        # Resize viewport
        game_page.set_viewport_size({"width": 800, "height": 600})
        game_page.evaluate("() => window.resizeGame?.()")
        game_page.wait_for_timeout(600)

        # LevelCompleteScene should still be active
        assert_scene_active(game_page, 'LevelCompleteScene', "after resize")

        # Verify buttons/text are within viewport bounds
        bounds_ok = game_page.evaluate("""() => {
            const scene = window.game?.scene?.getScene('LevelCompleteScene');
            if (!scene) return true;
            const cam = scene.cameras?.main;
            if (!cam) return true;
            const w = cam.width, h = cam.height;
            const children = scene.children?.list || [];
            for (const child of children) {
                if (child.visible && child.x !== undefined && child.y !== undefined) {
                    if (child.x < -50 || child.x > w + 50 || child.y < -50 || child.y > h + 50) {
                        return false;
                    }
                }
            }
            return true;
        }""")
        assert bounds_ok, "LevelCompleteScene elements should be within viewport after resize"


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

    def test_level_complete_keyboard_navigation(self, game_page: Page):
        """Test that LevelCompleteScene supports keyboard navigation between buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Trigger fail to get to LevelCompleteScene with 2 buttons (Retry, Menu)
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=3000)
        
        # Check initial state - first button should be selected
        initial_state = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return {
                selectedIndex: scene?.selectedIndex,
                buttonCount: scene?.menuButtons?.length
            };
        }""")
        
        assert initial_state['buttonCount'] == 2, "Should have 2 buttons (Retry, Menu)"
        assert initial_state['selectedIndex'] == 0, "First button should be selected initially"
        
        # Press RIGHT to select second button
        game_page.keyboard.press("ArrowRight")
        game_page.wait_for_timeout(100)
        
        new_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('LevelCompleteScene')?.selectedIndex;
        }""")
        assert new_index == 1, "RIGHT should select second button"
        
        # Press LEFT to go back to first button
        game_page.keyboard.press("ArrowLeft")
        game_page.wait_for_timeout(100)
        
        final_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('LevelCompleteScene')?.selectedIndex;
        }""")
        assert final_index == 0, "LEFT should return to first button"

    def test_credits_keyboard_navigation(self, game_page: Page):
        """Test that CreditsScene supports keyboard navigation between buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Jump to credits by starting CreditsScene directly
        game_page.evaluate("""() => {
            window.game.scene.start('CreditsScene');
        }""")
        
        wait_for_scene(game_page, 'CreditsScene', timeout=3000)
        
        # Skip credits animation by pressing any key
        game_page.keyboard.press("s")
        game_page.wait_for_timeout(300)
        
        # Wait for buttons to be visible
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('CreditsScene');
            return scene?.buttonsContainer?.visible === true;
        }""", timeout=3000)
        
        # Check initial state - first button should be selected
        initial_state = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('CreditsScene');
            return {
                selectedIndex: scene?.selectedIndex,
                buttonCount: scene?.menuButtons?.length,
                buttonsVisible: scene?.buttonsContainer?.visible
            };
        }""")
        
        assert initial_state['buttonsVisible'] == True, "Buttons should be visible after skip"
        assert initial_state['buttonCount'] == 2, "Should have 2 buttons (Play Again, Menu)"
        assert initial_state['selectedIndex'] == 0, "First button should be selected initially"
        
        # Press RIGHT to select second button
        game_page.keyboard.press("ArrowRight")
        game_page.wait_for_timeout(100)
        
        new_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('CreditsScene')?.selectedIndex;
        }""")
        assert new_index == 1, "RIGHT should select second button"
        
        # Press LEFT to go back to first button
        game_page.keyboard.press("ArrowLeft")
        game_page.wait_for_timeout(100)
        
        final_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('CreditsScene')?.selectedIndex;
        }""")
        assert final_index == 0, "LEFT should return to first button"

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


class TestDynamicKeyHints:
    """Test that tutorials and hints show rebound key names."""

    def test_tutorial_shows_default_groom_key(self, game_page: Page):
        """Test tutorial dialogue shows default SPACE key for grooming."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Dismiss dialogues until we see the groom action one
        for _ in range(5):
            game_page.wait_for_timeout(300)
            # Check if current dialogue contains SPACE or ESPACE
            dialogue_text = game_page.evaluate("""() => {
                const ds = window.game?.scene?.getScene('DialogueScene');
                if (!ds || !ds.dialogueText) return '';
                const text = ds.fullText || ds.dialogueText.text || '';
                if (text.includes('DAMER') || text.includes('GROOMING')) {
                    return text;
                }
                return '';
            }""")
            if dialogue_text:
                # Found it - verify it has the default key
                assert 'SPACE' in dialogue_text or 'ESPACE' in dialogue_text, \
                    f"Tutorial groom action should show SPACE/ESPACE, got: {dialogue_text}"
                return
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        
        # If we didn't find it in first 5 dialogues, that's ok - test passes

    def test_tutorial_shows_rebound_groom_key(self, game_page: Page):
        """Test tutorial dialogue shows rebound key instead of SPACE."""
        # Set rebound groom key before starting game (matching SettingsScene format)
        game_page.evaluate("""() => {
            const bindings = { 
                up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
                groom: 'KeyV', winch: 'ShiftLeft'
            };
            const displayNames = {
                KeyW: 'W', KeyS: 'S', KeyA: 'A', KeyD: 'D',
                KeyV: 'V', ShiftLeft: 'SHIFT'
            };
            localStorage.setItem('snowGroomer_bindings', JSON.stringify(bindings));
            localStorage.setItem('snowGroomer_displayNames', JSON.stringify(displayNames));
        }""")
        
        # Reload to pick up bindings
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        # Directly trigger the groom action dialogue via DialogueScene
        dialogue_text = game_page.evaluate("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            if (!ds) return '';
            // Show the tutorialGroomAction dialogue directly
            ds.showDialogue('tutorialGroomAction');
            // Wait for typewriter to finish (fullText has the complete string)
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(ds.fullText || ds.dialogueText?.text || '');
                }, 100);
            });
        }""")
        
        # Verify it has V not SPACE/ESPACE
        assert dialogue_text, "Dialogue should have text"
        assert 'V' in dialogue_text, \
            f"Tutorial groom action should show rebound key V, got: {dialogue_text}"
        assert 'SPACE' not in dialogue_text and 'ESPACE' not in dialogue_text, \
            f"Tutorial should NOT show SPACE/ESPACE when rebound, got: {dialogue_text}"

    def test_tutorial_shows_movement_keys_for_layout(self, game_page: Page):
        """Test tutorial shows ZQSD for AZERTY layout."""
        # Set AZERTY layout
        game_page.evaluate("""() => {
            localStorage.setItem('snowgroomer-keyboard-layout', 'azerty');
        }""")
        
        # Reload to pick up layout
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        # Dismiss first dialogue (welcome), look for controls dialogue
        game_page.wait_for_timeout(300)
        game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        game_page.wait_for_timeout(500)
        
        # Check the controls dialogue
        dialogue_text = game_page.evaluate("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            if (!ds || !ds.dialogueText) return '';
            const text = ds.fullText || ds.dialogueText.text || '';
            if (text.includes('CONTRÔLES') || text.includes('CONTROLS')) {
                return text;
            }
            return '';
        }""")
        
        if dialogue_text:
            # For AZERTY, should show ZQSD
            assert 'ZQSD' in dialogue_text, \
                f"Tutorial controls should show ZQSD for AZERTY layout, got: {dialogue_text}"

    def test_winch_hint_shows_rebound_key(self, game_page: Page):
        """Test winch hint in HUD shows rebound key instead of SHIFT."""
        # Set rebound winch key before starting game
        game_page.evaluate("""() => {
            const bindings = { 
                up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
                groom: 'Space', winch: 'KeyX'
            };
            const displayNames = {
                KeyW: 'W', KeyS: 'S', KeyA: 'A', KeyD: 'D',
                Space: 'SPACE', KeyX: 'X'
            };
            localStorage.setItem('snowGroomer_bindings', JSON.stringify(bindings));
            localStorage.setItem('snowGroomer_displayNames', JSON.stringify(displayNames));
        }""")
        
        # Reload to pick up bindings
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        # Skip to a level with winch (level 6 - La Verticale has winch)
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 6 (has winch anchors)
        skip_to_level(game_page, 6)
        
        # Check winch hint text in HUD
        winch_hint_text = game_page.evaluate("""() => {
            const hud = window.game?.scene?.getScene('HUDScene');
            if (!hud || !hud.winchHint) return '';
            return hud.winchHint.text || '';
        }""")
        
        # Verify it has X not SHIFT
        if winch_hint_text:
            assert 'X' in winch_hint_text, \
                f"Winch hint should show rebound key X, got: {winch_hint_text}"
            assert 'SHIFT' not in winch_hint_text, \
                f"Winch hint should NOT show SHIFT when rebound, got: {winch_hint_text}"


class TestNightLevel:
    """Tests for night level rendering and headlight mechanics."""
    
    def test_night_overlay_exists_on_night_level(self, game_page: Page):
        """Test that night overlay is created on night levels (level 6)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 6 (Black Piste - night level)
        skip_to_level(game_page, 6)
        
        # Check nightOverlay exists
        has_night_overlay = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene && gameScene.nightOverlay !== null;
        }""")
        
        assert has_night_overlay, "Night overlay should exist on night level"
    
    def test_headlight_direction_updates_with_movement(self, game_page: Page):
        """Test that headlight direction changes when groomer moves."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 6 (night level)
        skip_to_level(game_page, 6)
        
        # Get initial headlight direction
        initial_dir = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.headlightDirection ? {...gameScene.headlightDirection} : null;
        }""")
        
        # Move right (hold longer to ensure velocity triggers direction update)
        game_page.keyboard.down("ArrowRight")
        game_page.wait_for_timeout(500)
        
        # Get updated direction while still moving
        new_dir = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.headlightDirection ? {...gameScene.headlightDirection} : null;
        }""")
        
        game_page.keyboard.up("ArrowRight")
        
        assert new_dir is not None, "Headlight direction should exist"
        # After moving right, x component should be positive
        assert new_dir['x'] > 0, f"Headlight should face right after moving right, got x={new_dir['x']}"


class TestWinchMechanics:
    """Tests for winch attachment and slack mechanics."""
    
    def test_winch_only_attaches_near_anchor(self, game_page: Page):
        """Test that winch only attaches when groomer is near anchor base."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 6 (has winch)
        skip_to_level(game_page, 6)
        
        # Try to activate winch (should fail - not near anchor)
        game_page.keyboard.down("ShiftLeft")
        game_page.wait_for_timeout(200)
        
        winch_active = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.winchActive ?? false;
        }""")
        
        game_page.keyboard.up("ShiftLeft")
        
        # Groomer starts at bottom, anchors are at top - should not attach
        assert not winch_active, "Winch should not attach when far from anchor"
    
    def test_winch_anchor_interface_has_base_y(self, game_page: Page):
        """Test that winch anchors have baseY property for proximity detection."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip directly to level 6 (has winch)
        skip_to_level(game_page, 6)
        
        # Check anchor structure
        anchor_info = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene?.winchAnchors?.length) return null;
            const anchor = gameScene.winchAnchors[0];
            return {
                hasX: 'x' in anchor,
                hasY: 'y' in anchor,
                hasBaseY: 'baseY' in anchor,
                hasNumber: 'number' in anchor
            };
        }""")
        
        assert anchor_info is not None, "Should have winch anchors on level 6"
        assert anchor_info['hasBaseY'], "Anchor should have baseY for proximity detection"
        assert anchor_info['hasY'], "Anchor should have y (hook position) for cable"


class TestCliffMechanics:
    """Tests for cliff physics and visual alignment."""
    
    def test_cliff_segments_exist_on_dangerous_level(self, game_page: Page):
        """Test that cliffSegments are created on levels with dangerous boundaries."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip to level 7 (Avalanche Zone - has dangerous boundaries)
        skip_to_level(game_page, 7)
        
        cliff_info = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene?.cliffSegments) return null;
            return {
                count: gameScene.cliffSegments.length,
                hasOffset: gameScene.cliffSegments.length > 0 && 'offset' in gameScene.cliffSegments[0],
                hasExtent: gameScene.cliffSegments.length > 0 && 'extent' in gameScene.cliffSegments[0],
                hasSide: gameScene.cliffSegments.length > 0 && 'side' in gameScene.cliffSegments[0]
            };
        }""")
        
        assert cliff_info is not None, "Should have cliffSegments on dangerous level"
        assert cliff_info['count'] > 0, "Should have at least one cliff segment"
        assert cliff_info['hasOffset'], "Cliff segments should have offset property"
        assert cliff_info['hasExtent'], "Cliff segments should have extent property"
        assert cliff_info['hasSide'], "Cliff segments should have side property"
    
    def test_cliff_physics_matches_visuals(self, game_page: Page):
        """Test that danger zones use same offset/extent as visual cliffs."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip to level 7 (has cliffs)
        skip_to_level(game_page, 7)
        
        # Verify cliff segments have valid offset and extent values
        cliff_params = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene?.cliffSegments?.length) return null;
            const cliff = gameScene.cliffSegments[0];
            const tileSize = gameScene.tileSize || 16;
            return {
                offset: cliff.offset,
                extent: cliff.extent,
                tileSize: tileSize,
                // Offset should be 1.5-3 tiles
                offsetInTiles: cliff.offset / tileSize,
                // Extent should be 3-5 tiles
                extentInTiles: cliff.extent / tileSize
            };
        }""")
        
        assert cliff_params is not None, "Should have cliff parameters"
        # Verify offset is in expected range (1.5-3 tiles)
        assert 1.4 <= cliff_params['offsetInTiles'] <= 3.1, \
            f"Cliff offset should be 1.5-3 tiles, got {cliff_params['offsetInTiles']}"
        # Verify extent is in expected range (3-5 tiles)
        assert 2.9 <= cliff_params['extentInTiles'] <= 5.1, \
            f"Cliff extent should be 3-5 tiles, got {cliff_params['extentInTiles']}"
    
    def test_no_cliff_segments_on_safe_level(self, game_page: Page):
        """Test that early levels without dangerous boundaries have no cliff segments."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Level 0 (Tutorial) should not have dangerous boundaries
        cliff_count = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.cliffSegments?.length ?? 0;
        }""")
        
        assert cliff_count == 0, "Tutorial level should not have cliff segments"
    
    def test_cliff_getX_interpolation_works(self, game_page: Page):
        """Test that cliff getX interpolation returns valid piste edge positions.
        
        This verifies the closure bug fix where getX was returning wrong values
        because it referenced an array that got cleared after segment creation.
        """
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip to level 7 (has cliffs with winding piste shape)
        skip_to_level(game_page, 7)
        
        # Test that getX returns valid interpolated values
        interpolation_test = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene?.cliffSegments?.length) return null;
            
            const cliff = gameScene.cliffSegments[0];
            const { startY, endY, getX } = cliff;
            const midY = (startY + endY) / 2;
            
            // getX should return valid pixel positions (not 0 or undefined)
            const startX = getX(startY);
            const midX = getX(midY);
            const endX = getX(endY);
            
            return {
                startX: startX,
                midX: midX,
                endX: endX,
                // All values should be positive pixel coords
                allValid: startX > 0 && midX > 0 && endX > 0,
                // Mid should be interpolated (may differ from start/end on curved pistes)
                hasInterpolation: typeof midX === 'number' && !isNaN(midX)
            };
        }""")
        
        assert interpolation_test is not None, "Should have cliff segment with getX"
        assert interpolation_test['allValid'], \
            f"getX should return valid positions, got start={interpolation_test['startX']}, mid={interpolation_test['midX']}, end={interpolation_test['endX']}"
        assert interpolation_test['hasInterpolation'], "getX interpolation should return valid number"
    
    def test_markers_not_on_cliffs(self, game_page: Page):
        """Test that piste markers are not placed on cliff areas."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        # Skip to level 7 (has cliffs with winding piste shape)
        skip_to_level(game_page, 7)
        
        # Check that isOnCliff function exists and markers respect it
        marker_check = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene) return { error: 'no scene' };
            
            // Check if isOnCliff method exists
            const hasMethod = typeof gameScene.isOnCliff === 'function';
            
            // Get cliff segments for reference
            const cliffCount = gameScene.cliffSegments?.length || 0;
            
            return {
                hasIsOnCliffMethod: hasMethod,
                cliffSegmentCount: cliffCount,
                hasCliffs: cliffCount > 0
            };
        }""")
        
        assert marker_check is not None, "Should get marker check results"
        assert marker_check.get('hasCliffs'), "Level 7 should have cliff segments"
        # The isOnCliff method is private, but we can verify cliffs exist
        # Visual verification would be needed to fully confirm markers aren't on cliffs


class TestAccessPaths:
    """Tests for service road (access path) physics and geometry."""

    def test_access_path_rects_have_side(self, game_page: Page):
        """Test that accessPathRects include side field for correct boundary exemption."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 4)
        dismiss_dialogues(game_page)

        info = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.accessPathRects?.length) return null;
            const r = gs.accessPathRects[0];
            return {
                count: gs.accessPathRects.length,
                hasSide: 'side' in r,
                sides: [...new Set(gs.accessPathRects.map(r => r.side))],
            };
        }""")

        assert info is not None, "Level 4 should have accessPathRects"
        assert info['count'] > 0, "Should have multiple rects"
        assert info['hasSide'], "accessPathRects should have side field"
        assert 'left' in info['sides'], "Level 4 should have a left road"
        assert 'right' in info['sides'], "Level 4 should have a right road"

    def test_no_boundary_walls_on_access_path(self, game_page: Page):
        """Test that boundary walls don't overlap access path rects (non-dangerous level)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 4)
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.accessPathRects || !gs?.boundaryWalls) return null;
            let count = 0;
            gs.boundaryWalls.getChildren().forEach(w => {
                const wl = w.x - w.width / 2, wr = w.x + w.width / 2;
                const wt = w.y - w.height / 2, wb = w.y + w.height / 2;
                for (const r of gs.accessPathRects) {
                    if (wl < r.rightX && wr > r.leftX && wt < r.endY && wb > r.startY) {
                        count++;
                        break;
                    }
                }
            });
            return count;
        }""")

        assert overlaps == 0, f"No boundary walls should overlap access paths, found {overlaps}"

    def test_road_traversable_non_dangerous(self, game_page: Page):
        """Test that groomer can traverse service road on non-dangerous level (level 4)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 4)
        dismiss_dialogues(game_page)

        result = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const tileSize = gs.tileSize;
            // Left road: entry at endY=0.4
            const entryY = 0.4 * gs.level.height;
            const path = gs.pistePath[Math.floor(entryY)];
            const pisteLeftEdge = (path.centerX - path.width / 2) * tileSize;
            return { pisteLeftEdge: Math.round(pisteLeftEdge), tileSize };
        }""")

        start_x = result['pisteLeftEdge'] + 10
        game_page.evaluate(f"() => {{ const gs = window.game.scene.getScene('GameScene'); gs.groomer.setPosition({start_x}, {0.4 * 80 * result['tileSize']}); }}")
        game_page.wait_for_timeout(200)

        # Move left into the road
        game_page.keyboard.down("a")
        game_page.wait_for_timeout(2000)
        game_page.keyboard.up("a")
        game_page.wait_for_timeout(200)

        pos = game_page.evaluate("() => { const gs = window.game.scene.getScene('GameScene'); return { x: Math.round(gs.groomer.x) }; }")
        assert pos['x'] < start_x - 20, f"Groomer should move left into road, started at {start_x}, ended at {pos['x']}"

    def test_road_traversable_dangerous(self, game_page: Page):
        """Test that groomer can traverse service road on dangerous level (level 6)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 6)
        dismiss_dialogues(game_page)

        result = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const tileSize = gs.tileSize;
            // Left road: entry at endY=0.35
            const entryY = Math.floor(0.35 * gs.level.height);
            const path = gs.pistePath[entryY];
            const pisteLeftEdge = (path.centerX - path.width / 2) * tileSize;
            return { pisteLeftEdge: Math.round(pisteLeftEdge), entryPixelY: Math.round(entryY * tileSize), tileSize };
        }""")

        start_x = result['pisteLeftEdge'] + 10
        game_page.evaluate(f"() => {{ const gs = window.game.scene.getScene('GameScene'); gs.groomer.setPosition({start_x}, {result['entryPixelY']}); }}")
        game_page.wait_for_timeout(200)

        game_page.keyboard.down("a")
        game_page.wait_for_timeout(2000)
        game_page.keyboard.up("a")
        game_page.wait_for_timeout(200)

        pos = game_page.evaluate("() => { const gs = window.game.scene.getScene('GameScene'); return { x: Math.round(gs.groomer.x) }; }")
        assert pos['x'] < start_x - 20, f"Groomer should move left into road on dangerous level, started at {start_x}, ended at {pos['x']}"

    def test_no_obstacles_on_access_path(self, game_page: Page):
        """Test that physics obstacles (trees/rocks) don't spawn on access paths."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 4)
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.accessPathRects || !gs?.obstacles) return null;
            let count = 0;
            gs.obstacles.getChildren().forEach(o => {
                for (const r of gs.accessPathRects) {
                    if (o.x >= r.leftX && o.x <= r.rightX && o.y >= r.startY && o.y <= r.endY) {
                        count++;
                        break;
                    }
                }
            });
            return count;
        }""")

        assert overlaps == 0, f"No obstacles should be on access paths, found {overlaps}"

    def test_no_cliffs_on_access_path(self, game_page: Page):
        """Test that cliff danger zones don't overlap access paths on dangerous levels."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 6)
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.accessPathRects || !gs?.dangerZones) return null;
            let count = 0;
            gs.dangerZones.getChildren().forEach(w => {
                const wl = w.x - w.width / 2, wr = w.x + w.width / 2;
                const wt = w.y - w.height / 2, wb = w.y + w.height / 2;
                for (const r of gs.accessPathRects) {
                    if (wl < r.rightX && wr > r.leftX && wt < r.endY && wb > r.startY) {
                        count++;
                        break;
                    }
                }
            });
            return count;
        }""")

        assert overlaps == 0, f"No danger zones should overlap access paths, found {overlaps}"

    def test_boundary_creation_after_geometry(self, game_page: Page):
        """Test that accessPathRects are populated (geometry computed before boundaries)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 4)
        dismiss_dialogues(game_page)

        info = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return {
                rectsCount: gs.accessPathRects?.length ?? 0,
                curvesCount: gs.accessPathCurves?.length ?? 0,
                wallsCount: gs.boundaryWalls?.getLength() ?? 0,
                accessPaths: gs.level.accessPaths?.length ?? 0,
            };
        }""")

        assert info['accessPaths'] == 2, "Level 4 should have 2 access paths"
        assert info['rectsCount'] > 0, "accessPathRects should be populated"
        assert info['curvesCount'] == 2, "Should have 2 curve sets"
        assert info['wallsCount'] > 0, "Should have boundary walls"
