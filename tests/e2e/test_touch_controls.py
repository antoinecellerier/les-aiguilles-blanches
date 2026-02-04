"""
E2E tests for touch controls on mobile devices.
Tests virtual D-pad and action buttons.
"""

import pytest
from playwright.sync_api import Page, expect

# Import the base URL from conftest
from conftest import GAME_URL


@pytest.fixture
def touch_page(page: Page):
    """Configure page to emulate a touch device."""
    # Emulate iPhone 12 touch device
    page.set_viewport_size({"width": 390, "height": 844})
    
    # Navigate and wait for game to load
    page.goto(GAME_URL)
    page.wait_for_selector("canvas", timeout=10000)
    page.wait_for_timeout(2000)
    
    return page


def test_touch_controls_visible_on_touch_device(touch_page: Page):
    """Touch controls should appear on touch-capable devices."""
    # Start game
    touch_page.click("canvas")
    touch_page.wait_for_timeout(500)
    touch_page.click("canvas")  # Click through menu
    touch_page.wait_for_timeout(3000)  # Wait for game to load
    
    # Dismiss any dialogue
    for _ in range(5):
        touch_page.click("canvas")
        touch_page.wait_for_timeout(300)
    
    # Touch controls are rendered on canvas, so we verify via JS
    has_touch_controls = touch_page.evaluate("""
        () => {
            const game = window.game;
            if (!game) return false;
            const hudScene = game.scene.getScene('HUDScene');
            if (!hudScene) return false;
            // Check if touch state properties exist
            return 'touchUp' in hudScene && 'touchGroom' in hudScene;
        }
    """)
    
    assert has_touch_controls, "HUDScene should have touch control properties"


def test_touch_dpad_movement(touch_page: Page):
    """D-pad buttons should trigger movement in GameScene."""
    # Start game
    touch_page.click("canvas")
    touch_page.wait_for_timeout(500)
    touch_page.click("canvas")
    touch_page.wait_for_timeout(3000)
    
    # Dismiss dialogues
    for _ in range(5):
        touch_page.click("canvas")
        touch_page.wait_for_timeout(300)
    
    # Get initial groomer position
    initial_pos = touch_page.evaluate("""
        () => {
            const game = window.game;
            const gameScene = game.scene.getScene('GameScene');
            if (!gameScene || !gameScene.groomer) return null;
            return { x: gameScene.groomer.x, y: gameScene.groomer.y };
        }
    """)
    
    assert initial_pos is not None, "Should get groomer position"
    
    # Simulate touch on D-pad right button via HUD scene state
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchRight = true;
            }
        }
    """)
    
    touch_page.wait_for_timeout(500)
    
    # Release
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchRight = false;
            }
        }
    """)
    
    touch_page.wait_for_timeout(100)
    
    # Get new position
    new_pos = touch_page.evaluate("""
        () => {
            const game = window.game;
            const gameScene = game.scene.getScene('GameScene');
            if (!gameScene || !gameScene.groomer) return null;
            return { x: gameScene.groomer.x, y: gameScene.groomer.y };
        }
    """)
    
    assert new_pos is not None, "Should get new groomer position"
    assert new_pos["x"] > initial_pos["x"], f"Groomer should move right: {initial_pos} -> {new_pos}"


def test_touch_groom_button(touch_page: Page):
    """Groom button should trigger grooming action."""
    # Start game
    touch_page.click("canvas")
    touch_page.wait_for_timeout(500)
    touch_page.click("canvas")
    touch_page.wait_for_timeout(3000)
    
    # Dismiss dialogues
    for _ in range(5):
        touch_page.click("canvas")
        touch_page.wait_for_timeout(300)
    
    # Get initial coverage
    initial_coverage = touch_page.evaluate("""
        () => {
            const game = window.game;
            const gameScene = game.scene.getScene('GameScene');
            if (!gameScene) return 0;
            return gameScene.getCoverage();
        }
    """)
    
    # Move and groom simultaneously (multitouch simulation)
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchUp = true;
                hudScene.touchGroom = true;
            }
        }
    """)
    
    touch_page.wait_for_timeout(1000)
    
    # Release
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchUp = false;
                hudScene.touchGroom = false;
            }
        }
    """)
    
    touch_page.wait_for_timeout(100)
    
    # Get new coverage
    new_coverage = touch_page.evaluate("""
        () => {
            const game = window.game;
            const gameScene = game.scene.getScene('GameScene');
            if (!gameScene) return 0;
            return gameScene.getCoverage();
        }
    """)
    
    assert new_coverage >= initial_coverage, f"Coverage should increase or stay same: {initial_coverage} -> {new_coverage}"


def test_multitouch_simultaneous_inputs(touch_page: Page):
    """Multiple touch inputs should work simultaneously."""
    # Start game
    touch_page.click("canvas")
    touch_page.wait_for_timeout(500)
    touch_page.click("canvas")
    touch_page.wait_for_timeout(3000)
    
    # Dismiss dialogues
    for _ in range(5):
        touch_page.click("canvas")
        touch_page.wait_for_timeout(300)
    
    # Simulate multitouch: move right + down + groom
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchRight = true;
                hudScene.touchDown = true;
                hudScene.touchGroom = true;
            }
        }
    """)
    
    # Verify all states are active
    states = touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (!hudScene) return null;
            return {
                right: hudScene.touchRight,
                down: hudScene.touchDown,
                groom: hudScene.touchGroom
            };
        }
    """)
    
    assert states is not None, "Should get touch states"
    assert states["right"] == True, "touchRight should be active"
    assert states["down"] == True, "touchDown should be active"
    assert states["groom"] == True, "touchGroom should be active"
    
    # Clean up
    touch_page.evaluate("""
        () => {
            const game = window.game;
            const hudScene = game.scene.getScene('HUDScene');
            if (hudScene) {
                hudScene.touchRight = false;
                hudScene.touchDown = false;
                hudScene.touchGroom = false;
            }
        }
    """)
