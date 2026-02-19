"""E2E tests for level completion, fail screen, and credits."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, skip_to_level, skip_to_credits,
    click_button, click_menu_by_key, get_current_level, get_active_scenes,
    assert_scene_active, assert_scene_not_active, wait_for_input_ready,
    BUTTON_START,
)


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
        
        new_level = get_current_level(game_page)
        assert new_level == initial_level + 1, f"Should advance to level 1, got {new_level}"

    def test_level_complete_resize(self, game_page: Page):
        """LevelCompleteScene should survive viewport resize with elements in bounds."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene')

        game_page.set_viewport_size({"width": 800, "height": 600})
        game_page.evaluate("() => window.resizeGame?.()")
        # handleResize() triggers scene.restart() via requestAnimationFrame —
        # wait for the restarted scene to fully rebuild its children
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('LevelCompleteScene');
            return scene && scene.sys && scene.sys.isActive() &&
                   scene.children && scene.children.list.length > 3;
        }""", timeout=8000)

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

    def test_bonus_objectives_exist_on_levels(self, game_page: Page):
        """Levels 1-8 should have bonus objectives defined."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        objectives = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.level) return null;
            return {
                levelIndex: gs.levelIndex,
                bonusObjectives: gs.level.bonusObjectives || [],
            };
        }""")

        assert objectives is not None, "Should get level objectives"
        assert len(objectives['bonusObjectives']) == 0, "Tutorial should have no bonus objectives"

        skip_to_level(game_page, 'level_marmottesName')
        obj_l1 = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.level?.bonusObjectives?.length ?? 0;
        }""")
        assert obj_l1 > 0, "Level 1 should have at least one bonus objective"


    def test_flawless_bonus_restartcount_tracking(self, game_page: Page):
        """Regression: restartCount tracks retries and affects flawless bonus."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        skip_to_level(game_page, 'level_marmottesName')

        # First attempt — restartCount should be 0
        rc0 = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.restartCount;
        }""")
        assert rc0 == 0, f"First attempt restartCount should be 0, got {rc0}"

        # Trigger a fail to get the Retry button
        game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            gs.gameOver(false, 'fuel');
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene')

        # restartCount should be 0 on fail screen
        rc_fail = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return scene?.restartCount;
        }""")
        assert rc_fail == 0, "First fail: restartCount should be 0"

        # Click Retry (first button) — restartCount should increment
        game_page.wait_for_function(
            "() => window.game.scene.getScene('LevelCompleteScene')?.inputReady",
            timeout=3000
        )
        game_page.keyboard.press("Enter")
        wait_for_scene(game_page, 'GameScene', timeout=5000)

        rc1 = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.restartCount;
        }""")
        assert rc1 == 1, f"After retry restartCount should be 1, got {rc1}"

        # Win on second attempt — restartCount persists, flawless NOT met
        game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            gs.gameOver(true);
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene')

        flawless_retry = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return { restartCount: scene?.restartCount, won: scene?.won };
        }""")
        assert flawless_retry['won'] == True
        assert flawless_retry['restartCount'] == 1, \
            f"After retry+win: restartCount should be 1, got {flawless_retry['restartCount']}"


class TestFailScreen:
    """Test fail screen with taunt messages."""

    def test_fail_screen_shows_taunt(self, game_page: Page):
        """Test that failing a level shows LevelCompleteScene with taunt text."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene')
        
        scene_data = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return scene ? { won: scene.won } : null;
        }""")
        assert scene_data is not None, "LevelCompleteScene should exist"
        assert scene_data['won'] == False, "Should be a fail screen"

    def test_held_space_does_not_activate_button(self, game_page: Page):
        """Regression test: Held SPACE from prior scene should not immediately activate buttons.
        
        This tests the fix for the level loop bug where holding SPACE during gameplay
        would immediately activate the first button when LevelCompleteScene appeared,
        causing the game to loop between levels.
        """
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        game_page.keyboard.down("Space")
        
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene')
        
        game_page.wait_for_timeout(150)
        
        scenes_after_delay = get_active_scenes(game_page)
        assert 'LevelCompleteScene' in scenes_after_delay, \
            "Should still be on LevelCompleteScene during inputReady delay"
        
        game_page.keyboard.up("Space")
        
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('LevelCompleteScene');
            return scene?.inputReady ?? false;
        }""", timeout=3000)
        
        input_ready = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return scene?.inputReady ?? false;
        }""")
        assert input_ready, "inputReady should be true after 300ms delay"
        
        game_page.keyboard.press("Space")
        game_page.wait_for_timeout(250)
        
        final_scenes = get_active_scenes(game_page)
        assert 'GameScene' in final_scenes or 'MenuScene' in final_scenes, \
            f"Should transition to GameScene or MenuScene. Active scenes: {final_scenes}"
    
    def test_level_complete_keyboard_navigation(self, game_page: Page):
        """Test that LevelCompleteScene supports keyboard navigation between buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'fuel');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene')
        wait_for_input_ready(game_page, 'LevelCompleteScene')
        
        initial_state = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('LevelCompleteScene');
            return {
                selectedIndex: scene?.selectedIndex,
                buttonCount: scene?.menuButtons?.length
            };
        }""")
        
        assert initial_state['buttonCount'] == 2, "Should have 2 buttons (Retry, Menu)"
        assert initial_state['selectedIndex'] == 0, "First button should be selected initially"
        
        game_page.keyboard.press("ArrowRight")
        game_page.wait_for_function("() => window.game.scene.getScene('LevelCompleteScene')?.selectedIndex === 1", timeout=3000)
        
        new_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('LevelCompleteScene')?.selectedIndex;
        }""")
        assert new_index == 1, "RIGHT should select second button"
        
        game_page.keyboard.press("ArrowLeft")
        game_page.wait_for_function("() => window.game.scene.getScene('LevelCompleteScene')?.selectedIndex === 0", timeout=3000)
        
        final_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('LevelCompleteScene')?.selectedIndex;
        }""")
        assert final_index == 0, "LEFT should return to first button"

    def test_credits_keyboard_navigation(self, game_page: Page):
        """Test that CreditsScene supports keyboard navigation between buttons."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        game_page.evaluate("""() => {
            window.game.scene.start('CreditsScene');
        }""")
        
        wait_for_scene(game_page, 'CreditsScene')
        
        game_page.keyboard.press("s")
        game_page.wait_for_timeout(300)
        
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('CreditsScene');
            return scene?.buttonsContainer?.visible === true;
        }""", timeout=3000)
        
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
        
        game_page.keyboard.press("ArrowRight")
        game_page.wait_for_function("() => window.game.scene.getScene('CreditsScene')?.selectedIndex === 1", timeout=3000)
        
        new_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('CreditsScene')?.selectedIndex;
        }""")
        assert new_index == 1, "RIGHT should select second button"
        
        game_page.keyboard.press("ArrowLeft")
        game_page.wait_for_function("() => window.game.scene.getScene('CreditsScene')?.selectedIndex === 0", timeout=3000)
        
        final_index = game_page.evaluate("""() => {
            return window.game.scene.getScene('CreditsScene')?.selectedIndex;
        }""")
        assert final_index == 0, "LEFT should return to first button"

    def test_fail_screen_has_retry_option(self, game_page: Page):
        """Test that fail screen has retry button."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        game_page.evaluate("""() => {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && gameScene.gameOver) {
                gameScene.gameOver(false, 'cliff');
            }
        }""")
        
        wait_for_scene(game_page, 'LevelCompleteScene')
        
        game_page.screenshot(path="tests/screenshots/fail_screen_taunt.png")


class TestCreditsScreen:
    """Test credits screen."""

    def test_credits_has_required_elements(self, game_page: Page):
        """Test credits screen appears with proper scene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_credits(game_page)
        
        assert_scene_active(game_page, 'CreditsScene', "Credits should be showing")
        assert_scene_not_active(game_page, 'GameScene', "GameScene should not be active during credits")

    def test_can_restart_game_after_credits(self, game_page: Page):
        """Test full cycle: play through credits, return to menu, start new game."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        skip_to_credits(game_page)
        
        assert_scene_active(game_page, 'CreditsScene')
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'MenuScene')
        assert_scene_active(game_page, 'MenuScene')
        
        click_menu_by_key(game_page, 'startGame')
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        level = get_current_level(game_page)
        assert level == 0, f"New game should start at level 0, got {level}"
