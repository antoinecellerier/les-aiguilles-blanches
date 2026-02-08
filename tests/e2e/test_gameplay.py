"""E2E tests for gameplay mechanics: tutorial, groomer movement, grooming, snow contrast."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, skip_to_level, dismiss_dialogues,
    click_button, get_current_level, assert_scene_active,
    BUTTON_START,
)


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
        
        game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        wait_for_scene(game_page, 'GameScene')
        
        assert_scene_active(game_page, 'GameScene')
        assert_scene_active(game_page, 'DialogueScene')

    def test_tutorial_movement_trigger(self, game_page: Page):
        """Test that moving triggers the next tutorial step."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        dismiss_dialogues(game_page)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
        game_page.keyboard.down("ArrowUp")
        try:
            game_page.wait_for_function(f"""() => {{
                const gs = window.game?.scene?.getScene('GameScene');
                return gs?.groomer && gs.groomer.y !== {initial_pos['y']};
            }}""", timeout=3000)
            moved = True
        except TimeoutError:
            moved = False
        game_page.keyboard.up("ArrowUp")
        
        assert moved, f"Groomer should have moved from y={initial_pos['y']}"

    def test_tutorial_grooming_increases_coverage(self, game_page: Page):
        """Test that grooming increases coverage (on level 1 for cleaner test)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_marmottesName')
        dismiss_dialogues(game_page)
        
        initial_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : 0;
        }""")
        
        game_page.keyboard.down("Space")
        game_page.keyboard.down("ArrowUp")
        wait_for_scene(game_page, 'GameScene')
        game_page.keyboard.up("ArrowUp")
        game_page.keyboard.up("Space")
        game_page.wait_for_timeout(100)
        
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
        
        skip_to_level(game_page, 'level_marmottesName')
        dismiss_dialogues(game_page)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        assert initial_pos is not None, "Groomer should exist"
        
        game_page.keyboard.down("ArrowUp")
        
        try:
            game_page.wait_for_function(f"""() => {{
                const gs = window.game?.scene?.getScene('GameScene');
                return gs?.groomer && gs.groomer.y !== {initial_pos['y']};
            }}""", timeout=3000)
            moved = True
        except TimeoutError:
            moved = False
        
        game_page.keyboard.up("ArrowUp")
        
        assert moved, f"Groomer should have moved from y={initial_pos['y']}"

    def test_wasd_controls(self, game_page: Page):
        """Test WASD movement controls work."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_marmottesName')
        dismiss_dialogues(game_page)
        
        initial_pos = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs?.groomer ? { x: gs.groomer.x, y: gs.groomer.y } : null;
        }""")
        
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


class TestGroomingInputGuard:
    """Tests that grooming doesn't trigger when dismissing dialogues."""

    def test_no_groom_while_dialogue_showing(self, game_page: Page):
        """Grooming should be suppressed while dialogue is visible."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds && ds.isDialogueShowing && ds.isDialogueShowing();
        }""", timeout=5000)

        is_grooming = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.isGrooming ?? false;
        }""")

        assert not is_grooming, "Should not be grooming while dialogue is showing"

    def test_hold_space_dismiss_does_not_groom(self, game_page: Page):
        """Holding SPACE to dismiss dialogue must not trigger grooming."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        game_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds && ds.isDialogueShowing && ds.isDialogueShowing();
        }""", timeout=5000)
        dismiss_dialogues(game_page)
        game_page.wait_for_timeout(500)

        game_page.click("canvas")
        game_page.wait_for_timeout(300)

        game_page.evaluate("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            if (ds?.showDialogue) ds.showDialogue('tumble');
        }""")
        game_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.isDialogueShowing ? ds.isDialogueShowing() : false;
        }""", timeout=5000)

        game_page.keyboard.down("Space")
        game_page.wait_for_timeout(800)

        result = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return { isGrooming: gs?.isGrooming ?? false };
        }""")

        game_page.keyboard.up("Space")

        assert not result['isGrooming'], \
            "Grooming must not trigger while holding SPACE used to dismiss dialogue"


class TestSnowContrast:
    """Test visual distinction between groomed and ungroomed snow."""

    def test_grooming_changes_tile_texture(self, game_page: Page):
        """Test that grooming changes tile from ungroomed to groomed."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        for _ in range(10):
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            game_page.wait_for_timeout(200)
        
        initial_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : -1;
        }""")
        
        game_page.keyboard.down("Space")
        game_page.keyboard.down("w")
        game_page.wait_for_timeout(300)
        game_page.keyboard.up("w")
        game_page.keyboard.up("Space")
        
        new_count = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            return gs ? gs.groomedCount : -1;
        }""")
        
        assert new_count > initial_count, f"Grooming should increase count: {initial_count} -> {new_count}"


class TestBonusObjectives:
    """Test bonus objectives display in HUD."""

    def test_bonus_objectives_visible_on_level_with_bonuses(self, game_page: Page):
        """HUD should show bonus objective text on levels that have them."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        dismiss_dialogues(game_page)
        # Level 1 (Les Marmottes) has a speed_run bonus
        skip_to_level(game_page, 1)
        dismiss_dialogues(game_page)
        game_page.wait_for_timeout(500)

        bonus_count = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud) return 0;
            return hud.children.list.filter(c =>
                c.type === 'Text' && c.text && (c.text.includes('✓') || c.text.includes('✗') || c.text.includes('≤'))
            ).length;
        }""")
        assert bonus_count > 0, "Expected bonus objective text in HUD"

    def test_no_bonus_objectives_on_tutorial(self, game_page: Page):
        """Tutorial (level 0) has no bonus objectives — HUD should not show any."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        dismiss_dialogues(game_page)
        game_page.wait_for_timeout(500)

        bonus_count = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud) return 0;
            return hud.children.list.filter(c =>
                c.type === 'Text' && c.text && c.text.includes('≤')
            ).length;
        }""")
        assert bonus_count == 0, "Tutorial should not show bonus objectives"
