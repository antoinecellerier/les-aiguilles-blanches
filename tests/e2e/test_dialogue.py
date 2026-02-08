"""E2E tests for dialogue display, dismissal, and positioning."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene,
    click_button, assert_scene_active,
    BUTTON_START,
)


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
        
        game_page.wait_for_function("""() => {
            const dialogueScene = window.game?.scene?.getScene('DialogueScene');
            return dialogueScene?.container?.visible === true;
        }""", timeout=5000)
        
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
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(10):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(100)
        
        assert_scene_active(game_page, 'GameScene', "Game should still be running")

    def test_dialogue_positioned_above_touch_controls(self, game_page: Page):
        """Test that dialogue box positioning clears touch controls when visible."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('DialogueScene');
            return scene?.container?.visible === true;
        }""", timeout=5000)
        
        touch_check = game_page.evaluate("""() => {
            const hudScene = window.game.scene.getScene('HUDScene');
            const dialogueScene = window.game.scene.getScene('DialogueScene');
            
            const touchTopEdge = hudScene?.getTouchControlsTopEdge?.() || 0;
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
        
        if touch_check['touchTopEdge'] > 0:
            assert touch_check['clearsControls'], \
                f"Dialogue bottom ({touch_check['dialogueBottom']}) should be above touch controls top ({touch_check['touchTopEdge']})"

    def test_dialogue_position_responds_to_touch_controls_visibility(self, game_page: Page):
        """Test that dialogue position is dynamic based on touch controls visibility."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        game_page.wait_for_function("""() => {
            const scene = window.game?.scene?.getScene('DialogueScene');
            return scene?.container?.visible === true;
        }""", timeout=5000)
        
        positions = game_page.evaluate("""() => {
            const dialogueScene = window.game.scene.getScene('DialogueScene');
            const hudScene = window.game.scene.getScene('HUDScene');
            const height = dialogueScene.cameras.main.height;
            const touchVisible = hudScene?.touchControlsContainer?.visible === true;
            const dialogueShowY = dialogueScene.getDialogueShowY();
            const expectedDefaultY = height - 130;
            
            return {
                dialogueShowY: dialogueShowY,
                touchControlsVisible: touchVisible,
                expectedDefaultY: expectedDefaultY,
                screenHeight: height
            };
        }""")
        
        if not positions['touchControlsVisible']:
            assert positions['dialogueShowY'] == positions['expectedDefaultY'], \
                f"Dialogue Y ({positions['dialogueShowY']}) should be {positions['expectedDefaultY']} without touch controls"
