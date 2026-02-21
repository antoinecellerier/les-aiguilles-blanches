"""E2E tests for game navigation and basic flows."""
import pytest
from playwright.sync_api import Page, expect
from conftest import (
    wait_for_scene, skip_to_credits, wait_for_level_or_credits,
    click_button, click_menu_button, click_menu_by_key, find_menu_button_index,
    get_active_scenes, get_current_level,
    assert_canvas_renders_content, assert_scene_active, assert_scene_not_active,
    assert_not_on_menu, assert_no_error_message,
    BUTTON_START,
)


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
        
        for level in range(11):
            assert_canvas_renders_content(game_page)
            game_page.keyboard.press("n")
            result = wait_for_level_or_credits(game_page, level + 1)
            if result == 'credits':
                break
        
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
        
        click_menu_by_key(game_page, 'howToPlay')
        
        # Menu should still be active (overlay on top)
        assert_scene_active(game_page, 'MenuScene')
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open after clicking How to Play"

    def test_how_to_play_content_visible(self, game_page: Page):
        """Regression: How to Play content text must render above dialog background."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_menu_by_key(game_page, 'howToPlay')
        game_page.wait_for_timeout(500)
        
        # The content text should exist at depth >= 100 and have non-zero height
        content = game_page.evaluate("""() => {
            const ms = window.game.scene.getScene('MenuScene');
            const texts = ms.children.list.filter(
                c => c.type === 'Text' && c.depth >= 100 && c.text && c.text.length > 20
                    && !c.text.startsWith('How') && !c.text.startsWith('←')
                    && !c.text.startsWith('Comment')
            );
            if (texts.length === 0) return null;
            const t = texts[0];
            // Check display list: content must be AFTER the background rectangle
            const bgIdx = ms.children.list.findIndex(
                c => c.type === 'rexRoundRectangleShape' && c.depth >= 100
            );
            const contentIdx = ms.children.list.indexOf(t);
            return {
                text: t.text.substring(0, 60),
                visible: t.visible, alpha: t.alpha,
                height: Math.round(t.height),
                renderOrder: contentIdx > bgIdx ? 'above' : 'below',
            };
        }""")
        assert content is not None, "Content text should exist in How to Play dialog"
        assert content['visible'], "Content text should be visible"
        assert content['alpha'] > 0, "Content text should not be transparent"
        assert content['height'] > 30, f"Content text should have height, got {content['height']}"
        assert content['renderOrder'] == 'above', "Content must render above background"

    def test_how_to_play_dismiss_with_enter(self, game_page: Page):
        """Test How to Play overlay dismissed with Enter without triggering menu action."""
        assert_scene_active(game_page, 'MenuScene')
        
        # Navigate to How To Play with keyboard and activate it
        htp_idx = find_menu_button_index(game_page, 'howToPlay')
        for _ in range(htp_idx):
            game_page.keyboard.press("ArrowDown")
            game_page.wait_for_timeout(50)
        game_page.wait_for_function(f"() => {{ const s = window.game?.scene?.getScene('MenuScene'); return s && s.selectedIndex === {htp_idx}; }}", timeout=5000)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === true; }", timeout=5000)
        
        # Press Enter to dismiss - this should ONLY close overlay, not trigger menu
        game_page.keyboard.press("Enter")
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === false; }", timeout=10000)
        
        # CRITICAL: Menu should still be active (not GameScene from accidental activation)
        assert_scene_active(game_page, 'MenuScene', "Menu should still be active - Enter should only close overlay")

    def test_how_to_play_dismiss_with_space(self, game_page: Page):
        """Test How to Play overlay dismissed with Space without triggering menu action."""
        assert_scene_active(game_page, 'MenuScene')
        
        # Navigate to How To Play with keyboard and activate it
        htp_idx = find_menu_button_index(game_page, 'howToPlay')
        for _ in range(htp_idx):
            game_page.keyboard.press("ArrowDown")
            game_page.wait_for_timeout(50)
        game_page.wait_for_function(f"() => {{ const s = window.game?.scene?.getScene('MenuScene'); return s && s.selectedIndex === {htp_idx}; }}", timeout=5000)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === true; }", timeout=5000)
        
        # Press Space to dismiss - this should ONLY close overlay, not trigger menu
        game_page.keyboard.press("Space")
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === false; }", timeout=10000)
        
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
        htp_idx = find_menu_button_index(game_page, 'howToPlay')
        for _ in range(htp_idx):
            game_page.keyboard.press("ArrowDown")
            game_page.wait_for_timeout(50)
        game_page.wait_for_function(f"() => {{ const s = window.game?.scene?.getScene('MenuScene'); return s && s.selectedIndex === {htp_idx}; }}", timeout=5000)
        game_page.keyboard.press("Enter")  # Open overlay
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === true; }", timeout=5000)
        
        # Selection should be on How To Play after we navigated there
        pre_nav_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.selectedIndex;
        }""")
        assert pre_nav_index == htp_idx, f"Should be on How To Play button (index {htp_idx})"
        
        # Verify overlay is open
        overlay_open = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.overlayOpen === true;
        }""")
        assert overlay_open, "Overlay should be open"
        
        # Try to navigate with arrows while overlay is open
        game_page.keyboard.press("ArrowDown")
        game_page.keyboard.press("ArrowDown")
        game_page.wait_for_function("() => window.game?.scene?.getScene('MenuScene')?.selectedIndex !== undefined", timeout=5000)
        
        # Selection should NOT have changed from 1
        current_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.selectedIndex;
        }""")
        assert current_index == pre_nav_index, f"Menu selection should not change while overlay is open (was {pre_nav_index}, now {current_index})"

    def test_settings_button(self, game_page: Page):
        """Test Settings button opens SettingsScene."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_menu_by_key(game_page, 'settings')
        wait_for_scene(game_page, 'SettingsScene')
        
        assert_scene_active(game_page, 'SettingsScene', "Settings should open")
        
        # Escape should return to menu
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene', "Should return to menu")

    def test_changelog_overlay_renders_content(self, game_page: Page):
        """Test Changelog overlay opens and renders visible text content."""
        assert_scene_active(game_page, 'MenuScene')
        
        click_menu_by_key(game_page, 'changelog')
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen === true; }", timeout=5000)
        
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
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen !== true; }", timeout=8000)
        
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
        
        # Open changelog via keyboard navigation
        click_menu_by_key(game_page, 'changelog')
        game_page.wait_for_function(
            "() => { const s = window.game?.scene?.getScene('MenuScene'); return s?.overlayOpen === true; }",
            timeout=8000
        )
        
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
        game_page.wait_for_function("() => { const s = window.game?.scene?.getScene('MenuScene'); return s && s.overlayOpen !== true; }", timeout=8000)
        
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
        
        # With saved progress, button layout changes. Use key-based lookup.
        click_menu_by_key(game_page, 'newGame')
        wait_for_scene(game_page, 'GameScene')
        
        # Should start from level 0
        level = get_current_level(game_page)
        assert level == 0, f"New Game should start at level 0, got {level}"
        
        # Progress should be reset to level 0 but stats preserved
        progress = game_page.evaluate("JSON.parse(localStorage.getItem('snowGroomer_progress'))")
        assert progress is not None, "Progress should be preserved (stats kept)"
        assert progress["currentLevel"] == 0, "currentLevel should be reset to 0"


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

    def test_full_level_progression_through_all_11_levels(self, game_page: Page):
        """Skip through ALL 11 levels (0-10), verify each, then credits."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        for expected_level in range(11):
            current = get_current_level(game_page)
            assert current == expected_level, \
                f"Expected level {expected_level}, got {current}"
            assert_scene_active(game_page, 'GameScene')
            assert_scene_active(game_page, 'HUDScene')
            
            # Skip to next - wait for level to change or credits
            game_page.keyboard.press("n")
            if expected_level < 10:
                game_page.wait_for_function(
                    f"() => window.game?.scene?.getScene('GameScene')?.levelIndex === {expected_level + 1}",
                    timeout=5000
                )
            else:
                wait_for_scene(game_page, 'CreditsScene')
        
        # After level 10, should be at credits
        assert_scene_active(game_page, 'CreditsScene', "Should be at credits after completing all levels")

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
