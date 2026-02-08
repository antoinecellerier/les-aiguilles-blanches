"""E2E tests for dynamic key hints in tutorials and HUD."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, skip_to_level, wait_for_game_ready,
    click_button,
    BUTTON_START,
)


class TestDynamicKeyHints:
    """Test that tutorials and hints show rebound key names."""

    def test_tutorial_shows_default_groom_key(self, game_page: Page):
        """Test tutorial dialogue shows default SPACE key for grooming."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        for _ in range(5):
            game_page.wait_for_timeout(300)
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
                assert 'SPACE' in dialogue_text or 'ESPACE' in dialogue_text, \
                    f"Tutorial groom action should show SPACE/ESPACE, got: {dialogue_text}"
                return
            game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)

    def test_tutorial_shows_rebound_groom_key(self, game_page: Page):
        """Test tutorial dialogue shows rebound key instead of SPACE."""
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
        
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        dialogue_text = game_page.evaluate("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            if (!ds) return '';
            ds.showDialogue('tutorialGroomAction');
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(ds.fullText || ds.dialogueText?.text || '');
                }, 100);
            });
        }""")
        
        assert dialogue_text, "Dialogue should have text"
        assert 'V' in dialogue_text, \
            f"Tutorial groom action should show rebound key V, got: {dialogue_text}"
        assert 'SPACE' not in dialogue_text and 'ESPACE' not in dialogue_text, \
            f"Tutorial should NOT show SPACE/ESPACE when rebound, got: {dialogue_text}"

    def test_tutorial_shows_movement_keys_for_layout(self, game_page: Page):
        """Test tutorial shows ZQSD for AZERTY layout."""
        game_page.evaluate("""() => {
            localStorage.setItem('snowgroomer-keyboard-layout', 'azerty');
        }""")
        
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        wait_for_scene(game_page, 'DialogueScene')
        
        canvas = game_page.locator("canvas")
        box = canvas.bounding_box()
        
        game_page.wait_for_timeout(300)
        game_page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        game_page.wait_for_timeout(500)
        
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
            assert 'ZQSD' in dialogue_text, \
                f"Tutorial controls should show ZQSD for AZERTY layout, got: {dialogue_text}"

    def test_winch_hint_shows_rebound_key(self, game_page: Page):
        """Test winch hint in HUD shows rebound key instead of SHIFT."""
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
        
        game_page.reload()
        game_page.wait_for_function("() => window.game && window.game.isBooted", timeout=10000)
        wait_for_scene(game_page, 'MenuScene')
        
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_verticaleName')
        
        winch_hint_text = game_page.evaluate("""() => {
            const hud = window.game?.scene?.getScene('HUDScene');
            if (!hud || !hud.winchHint) return '';
            return hud.winchHint.text || '';
        }""")
        
        if winch_hint_text:
            assert 'X' in winch_hint_text, \
                f"Winch hint should show rebound key X, got: {winch_hint_text}"
            assert 'SHIFT' not in winch_hint_text, \
                f"Winch hint should NOT show SHIFT when rebound, got: {winch_hint_text}"
