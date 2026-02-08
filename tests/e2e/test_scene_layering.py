"""E2E tests for scene layering, menu depth ordering, and resize behavior."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, wait_for_scene_inactive, dismiss_dialogues,
    click_button, assert_scene_active,
    BUTTON_START,
)


class TestSceneLayering:
    """Test that overlay scenes render on top of game."""

    def test_hud_renders_on_top_of_game(self, game_page: Page):
        """Test HUD scene is above GameScene in render order."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
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
        
        dismiss_dialogues(game_page)
        
        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene')
        
        scene_order = game_page.evaluate("""() => {
            return window.game.scene.getScenes(true).map(s => s.scene.key);
        }""")
        
        assert 'PauseScene' in scene_order, "PauseScene should be active"
        pause_idx = scene_order.index('PauseScene')
        assert pause_idx == len(scene_order) - 1, f"PauseScene should be last. Order: {scene_order}"

    def test_menu_input_hints_above_footer(self, game_page: Page):
        """Input method hints must render above the footer background (depth >= 10)."""
        assert_scene_active(game_page, 'MenuScene')
        hints_info = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (!scene || !scene.inputHintTexts) return null;
            return scene.inputHintTexts.map(obj => ({
                type: obj.type,
                depth: obj.depth,
            }));
        }""")
        assert hints_info and len(hints_info) > 0, "Input hints should exist on MenuScene"
        for h in hints_info:
            assert h['depth'] >= 10, f"Hint {h['type']} depth={h['depth']} is below footer (10)"

    def test_menu_buttons_above_background(self, game_page: Page):
        """All menu buttons, shadows, and selection arrow must render above mountains/animals."""
        assert_scene_active(game_page, 'MenuScene')
        depths = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (!scene) return null;
            const items = [];
            for (const btn of (scene.menuButtons || [])) {
                items.push({ label: 'button:' + btn.text, depth: btn.depth });
            }
            for (const s of (scene.buttonShadows || [])) {
                items.push({ label: 'shadow', depth: s.depth });
            }
            if (scene.selectionArrow) {
                items.push({ label: 'arrow', depth: scene.selectionArrow.depth });
            }
            return items;
        }""")
        assert depths and len(depths) > 0, "Menu buttons should exist"
        for item in depths:
            assert item['depth'] >= 10, f"{item['label']} depth={item['depth']} may render behind scenery"

    def test_footer_github_link_above_background(self, game_page: Page):
        """GitHub/version link in footer must be interactive and above footer bg."""
        assert_scene_active(game_page, 'MenuScene')
        link_info = game_page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (!scene) return null;
            const texts = scene.children.list.filter(c => c.type === 'Text' && c.text && c.text.includes('GitHub'));
            if (texts.length === 0) return null;
            const link = texts[0];
            return { depth: link.depth, interactive: !!link.input?.enabled, text: link.text };
        }""")
        assert link_info, "GitHub link should exist in footer"
        assert link_info['depth'] >= 10, f"GitHub link depth={link_info['depth']} is below footer bg"
        assert link_info['interactive'], "GitHub link should be interactive (clickable)"

    def test_keyboard_navigation_wraps(self, game_page: Page):
        """Arrow key navigation should wrap from last button to first and vice versa."""
        assert_scene_active(game_page, 'MenuScene')

        btn_count = game_page.evaluate("""() => {
            return window.game.scene.getScene('MenuScene')?.menuButtons?.length ?? 0;
        }""")
        assert btn_count >= 3, "Menu should have at least 3 buttons"

        game_page.keyboard.press("ArrowUp")
        game_page.wait_for_function(
            f"() => window.game.scene.getScene('MenuScene')?.selectedIndex === {btn_count - 1}",
            timeout=3000
        )
        idx = game_page.evaluate("() => window.game.scene.getScene('MenuScene')?.selectedIndex")
        assert idx == btn_count - 1, f"Up from first should wrap to last ({btn_count - 1}), got {idx}"

        game_page.keyboard.press("ArrowDown")
        game_page.wait_for_function(
            "() => window.game.scene.getScene('MenuScene')?.selectedIndex === 0",
            timeout=3000
        )
        idx = game_page.evaluate("() => window.game.scene.getScene('MenuScene')?.selectedIndex")
        assert idx == 0, f"Down from last should wrap to first (0), got {idx}"

    def test_selection_arrow_tracks_selected_button(self, game_page: Page):
        """The ▶ selection arrow should follow the currently selected button."""
        assert_scene_active(game_page, 'MenuScene')

        def get_arrow_and_button():
            return game_page.evaluate("""() => {
                const scene = window.game.scene.getScene('MenuScene');
                if (!scene || !scene.selectionArrow || !scene.menuButtons) return null;
                const idx = scene.selectedIndex;
                const btn = scene.menuButtons[idx];
                return {
                    arrowY: scene.selectionArrow.y,
                    buttonY: btn.y,
                    arrowVisible: scene.selectionArrow.visible,
                    selectedIndex: idx,
                };
            }""")

        info = get_arrow_and_button()
        assert info, "Arrow and buttons should exist"
        assert info['arrowVisible'], "Arrow should be visible"
        assert abs(info['arrowY'] - info['buttonY']) < 5, "Arrow should be at same Y as selected button"

        game_page.keyboard.press("ArrowDown")
        game_page.wait_for_function(
            "() => window.game.scene.getScene('MenuScene')?.selectedIndex === 1",
            timeout=3000
        )
        info2 = get_arrow_and_button()
        assert info2['selectedIndex'] == 1
        assert abs(info2['arrowY'] - info2['buttonY']) < 5, "Arrow should follow to second button"
        assert info2['arrowY'] != info['arrowY'], "Arrow should have moved"

    def test_resize_restarts_menu_cleanly(self, game_page: Page):
        """Resizing the window should restart MenuScene without errors."""
        assert_scene_active(game_page, 'MenuScene')

        game_page.set_viewport_size({"width": 800, "height": 500})
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene && scene.sys.isActive() && scene.menuButtons && scene.menuButtons.length > 0;
        }""", timeout=5000)

        assert_scene_active(game_page, 'MenuScene')
        btn_count = game_page.evaluate("""() =>
            window.game.scene.getScene('MenuScene')?.menuButtons?.length ?? 0
        """)
        assert btn_count >= 3, f"Buttons should exist after resize, got {btn_count}"

        game_page.set_viewport_size({"width": 960, "height": 540})
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            return scene && scene.sys.isActive() && scene.menuButtons && scene.menuButtons.length > 0;
        }""", timeout=5000)
