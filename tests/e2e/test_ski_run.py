"""E2E tests for the ski/snowboard reward run feature."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, click_button, get_active_scenes, find_menu_button_index,
    assert_scene_active, wait_for_input_ready, BUTTON_START, GAME_URL, wait_for_game_ready,
)


class TestSkiRun:
    """Test ski run entry, scene lifecycle, and settings."""

    def test_ski_button_appears_on_win(self, game_page: Page):
        """Ski it! button should appear on level complete (win)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        # Trigger a win via gameOver(true)
        game_page.evaluate("""() => {
            var gs = window.game.scene.getScene('GameScene');
            if (gs && gs.gameOver) gs.gameOver(true);
        }""")
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        wait_for_input_ready(game_page, 'LevelCompleteScene')

        has_ski_btn = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return false;
            var found = false;
            scene.children.list.forEach(function(c) {
                if (c.type === 'Text' && c.text &&
                    (c.text.indexOf('Ski') >= 0 || c.text.indexOf('Ride') >= 0)) found = true;
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text &&
                        (child.text.indexOf('Ski') >= 0 || child.text.indexOf('Ride') >= 0)) found = true;
                });
            });
            return found;
        }""")
        assert has_ski_btn, "Ski/Ride button should appear on win screen"

    def test_ski_run_scene_loads(self, game_page: Page):
        """K dev shortcut should launch SkiRunScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        assert_scene_active(game_page, 'SkiRunScene', "SkiRunScene should be active after K shortcut")

    def test_ski_run_reaches_bottom(self, game_page: Page):
        """Skier should reach bottom and transition back to LevelCompleteScene."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        # Wait for run to complete (tutorial is short)
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=30000)
        assert_scene_active(game_page, 'LevelCompleteScene',
                            "Should return to LevelCompleteScene after reaching bottom")

    def test_ski_run_abort_with_escape(self, game_page: Page):
        """ESC during ski run should open pause menu with Skip Run option."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        game_page.keyboard.press("Escape")
        wait_for_scene(game_page, 'PauseScene', timeout=5000)
        assert_scene_active(game_page, 'PauseScene',
                            "ESC should open pause menu during ski run")

        # Wait for PauseScene input delay
        wait_for_input_ready(game_page, 'PauseScene')

        # Click "Skip Run" by data key
        skip_idx = find_menu_button_index(game_page, 'skipRun', 'PauseScene')
        click_button(game_page, skip_idx, "Skip Run")
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        assert_scene_active(game_page, 'LevelCompleteScene',
                            "Skip Run should return to LevelCompleteScene")

    def test_snowboard_mode_uses_snowboarder_texture(self, game_page: Page):
        """Setting snowboard mode should use snowboarder texture."""
        game_page.evaluate("localStorage.setItem('snowGroomer_skiMode', 'snowboard')")
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)

        texture = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return null;
            var kids = scene.children.list;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i].texture && kids[i].texture.key.indexOf('snowboarder') >= 0)
                    return kids[i].texture.key;
            }
            return null;
        }""")
        assert texture is not None and 'snowboarder' in texture, \
            f"Should use snowboarder texture, got {texture}"

    def test_ski_run_hud_shows_speed_and_time(self, game_page: Page):
        """HUD should display speed in km/h and elapsed time."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_function("""() => {
            const scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return false;
            return scene.children.list.some(c => c.type === 'Text' && c.text && c.text.includes('km/h'));
        }""", timeout=5000)

        hud_texts = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return [];
            return scene.children.list
                .filter(function(c) { return c.type === 'Text'; })
                .map(function(c) { return c.text; });
        }""")
        has_speed = any('km/h' in t for t in hud_texts)
        has_time = any(':' in t and ('Time' in t or 'Temps' in t or 'Zeit' in t) for t in hud_texts)
        assert has_speed, f"HUD should show speed in km/h, got: {hud_texts}"
        assert has_time, f"HUD should show elapsed time, got: {hud_texts}"

    def test_ski_replay_button_available(self, game_page: Page):
        """After finishing a ski run, the ski button should appear again for replay."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        wait_for_scene(game_page, 'LevelCompleteScene', timeout=30000)
        wait_for_input_ready(game_page, 'LevelCompleteScene')

        has_ski_btn = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return false;
            var found = false;
            scene.children.list.forEach(function(c) {
                if (c.type === 'Text' && c.text &&
                    (c.text.indexOf('Ski') >= 0 || c.text.indexOf('Ride') >= 0)) found = true;
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text &&
                        (child.text.indexOf('Ski') >= 0 || child.text.indexOf('Ride') >= 0)) found = true;
                });
            });
            return found;
        }""")
        assert has_ski_btn, "Ski/Ride button should be available for replay after finishing"

    def test_ski_wipeout_shows_fail_screen(self, game_page: Page):
        """Cliff wipeout during ski run should show fail screen with retry button."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        # Simulate a ski wipeout by transitioning directly to LevelCompleteScene
        game_page.evaluate("""() => {
            window.game.scene.start('LevelCompleteScene', {
                won: false,
                level: 0,
                coverage: 0,
                timeUsed: 12,
                failReason: 'ski_wipeout',
                skiMode: 'ski',
            });
        }""")

        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        wait_for_input_ready(game_page, 'LevelCompleteScene')

        # Should show retry button (Ski Again / Ride Again), not Next Level
        buttons = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return [];
            var texts = [];
            scene.children.list.forEach(function(c) {
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text) texts.push(child.text);
                });
            });
            return texts;
        }""")
        has_retry = any('Again' in t or 'Re-' in t or 'Nochmal' in t or 'Otra' in t
                        or 'もう一度' in t or '다시' in t for t in buttons)
        has_next = any('Next' in t or 'suivant' in t.lower() for t in buttons)
        assert has_retry, f"Should show ski retry button, got: {buttons}"
        assert has_next, f"Should show Next Level button on ski fail (skiing is optional), got: {buttons}"

    def test_ski_avalanche_shows_fail_screen(self, game_page: Page):
        """Avalanche during ski run should show avalanche fail screen with ski retry."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.evaluate("""() => {
            window.game.scene.start('LevelCompleteScene', {
                won: false,
                level: 8,
                coverage: 0,
                timeUsed: 5,
                failReason: 'avalanche',
                skiMode: 'ski',
            });
        }""")

        wait_for_scene(game_page, 'LevelCompleteScene', timeout=10000)
        wait_for_input_ready(game_page, 'LevelCompleteScene')

        buttons = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('LevelCompleteScene');
            if (!scene) return [];
            var texts = [];
            scene.children.list.forEach(function(c) {
                if (c.list) c.list.forEach(function(child) {
                    if (child.type === 'Text' && child.text) texts.push(child.text);
                });
            });
            return texts;
        }""")
        has_retry = any('Again' in t or 'Re-' in t or 'Nochmal' in t or 'Otra' in t
                        or 'もう一度' in t or '다시' in t for t in buttons)
        assert has_retry, f"Should show ski retry button on avalanche, got: {buttons}"


class TestSkiSettings:
    """Test descent mode selector in settings."""

    def test_settings_shows_descent_mode(self, game_page: Page):
        """Settings should have a descent mode selector with Random, Ski and Snowboard buttons."""
        # Navigate to settings
        from conftest import navigate_to_settings
        navigate_to_settings(game_page)

        texts = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SettingsScene');
            if (!scene) return [];
            return scene.children.list
                .filter(function(c) { return c.type === 'Text'; })
                .map(function(c) { return c.text; });
        }""")
        has_random = any('Random' in t or 'Aléatoire' in t or 'Zufällig' in t for t in texts)
        has_ski = any('Ski' in t for t in texts)
        has_snowboard = any('Snowboard' in t or 'snowboard' in t.lower() for t in texts)
        assert has_random, f"Settings should show Random option, got: {texts}"
        assert has_ski, f"Settings should show Ski option, got: {texts}"
        assert has_snowboard, f"Settings should show Snowboard option, got: {texts}"


class TestSkiHudVisibility:
    """Verify HUD elements render within viewport bounds under camera zoom."""

    def test_hud_text_within_viewport(self, game_page: Page):
        """HUD speed and time text should be positioned within the visible screen area."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_function("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            return !!scene?.cameras?.main;
        }""", timeout=5000)

        result = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return null;
            var cam = scene.cameras.main;
            var zoom = cam.zoom || 1;
            var originX = cam.width * cam.originX;
            var originY = cam.height * cam.originY;
            var texts = scene.children.list.filter(function(c) { return c.type === 'Text' && c.text; });
            var results = [];
            for (var i = 0; i < texts.length; i++) {
                var t = texts[i];
                // Convert draw-space to screen-space
                var screenX = t.x * zoom + originX * (1 - zoom);
                var screenY = t.y * zoom + originY * (1 - zoom);
                results.push({
                    text: t.text,
                    screenX: screenX,
                    screenY: screenY,
                    w: cam.width,
                    h: cam.height
                });
            }
            return results;
        }""")
        assert result is not None and len(result) > 0, "Should have HUD text elements"
        for item in result:
            assert -50 <= item['screenX'] <= item['w'] + 50, \
                f"Text '{item['text']}' screenX={item['screenX']} outside viewport width={item['w']}"
            assert -50 <= item['screenY'] <= item['h'] + 50, \
                f"Text '{item['text']}' screenY={item['screenY']} outside viewport height={item['h']}"


class TestSkiTouchControls:
    """Verify touch controls appear and are positioned correctly on SkiRunScene."""

    @pytest.fixture
    def touch_game(self, page: Page):
        """Configure page to emulate a touch device and launch ski scene."""
        page.set_viewport_size({"width": 390, "height": 844})
        page.add_init_script("""
            Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
            window.ontouchstart = function() {};
        """)
        page.goto(GAME_URL)
        page.wait_for_selector("canvas", timeout=10000)
        wait_for_game_ready(page)
        yield page
        page.evaluate("localStorage.clear()")

    def test_touch_controls_present_in_ski_scene(self, touch_game: Page):
        """Touch device should show joystick and brake button via HUDScene in ski mode."""
        click_button(touch_game, BUTTON_START, "Start Game")
        wait_for_scene(touch_game, 'GameScene')

        touch_game.keyboard.press("k")
        wait_for_scene(touch_game, 'SkiRunScene', timeout=10000)
        touch_game.wait_for_function("""() => {
            var hud = window.game.scene.getScene('HUDScene');
            return !!hud?.touchControlsContainer;
        }""", timeout=5000)

        controls = touch_game.evaluate("""() => {
            var hud = window.game.scene.getScene('HUDScene');
            if (!hud) return null;
            var container = hud.touchControlsContainer;
            if (!container) return { hasContainer: false, circleCount: 0 };
            var circles = 0;
            var list = container.list || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i].type === 'Arc') circles++;
            }
            return {
                hasContainer: true,
                circleCount: circles
            };
        }""")
        assert controls is not None, "HUDScene should exist in ski mode"
        assert controls['hasContainer'], "Touch controls container should be created"
        # joystickBase + joystickThumb + joystickZone + brakeBg = at least 4 circles
        assert controls['circleCount'] >= 4, \
            f"Should have at least 4 circle objects (joystick + brake), got {controls['circleCount']}"

    def test_touch_controls_within_viewport(self, touch_game: Page):
        """Touch controls should be positioned within the visible screen area."""
        click_button(touch_game, BUTTON_START, "Start Game")
        wait_for_scene(touch_game, 'GameScene')

        touch_game.keyboard.press("k")
        wait_for_scene(touch_game, 'SkiRunScene', timeout=10000)
        touch_game.wait_for_function("""() => {
            var hud = window.game.scene.getScene('HUDScene');
            return !!hud?.touchControlsContainer;
        }""", timeout=5000)

        result = touch_game.evaluate("""() => {
            var hud = window.game.scene.getScene('HUDScene');
            if (!hud || !hud.touchControlsContainer) return null;
            var cam = hud.cameras.main;
            var list = hud.touchControlsContainer.list || [];
            var circles = list.filter(function(c) {
                return c.type === 'Arc' && c.radius > 5;
            });
            var results = [];
            for (var i = 0; i < circles.length; i++) {
                var c = circles[i];
                results.push({
                    screenX: c.x,
                    screenY: c.y,
                    radius: c.radius,
                    w: cam.width,
                    h: cam.height
                });
            }
            return results;
        }""")
        assert result is not None and len(result) > 0, "Should have circle UI elements"
        for item in result:
            # Circle center should be within viewport (with some margin for radius)
            margin = item['radius'] + 20
            assert -margin <= item['screenX'] <= item['w'] + margin, \
                f"Circle at screenX={item['screenX']:.0f} outside viewport width={item['w']}"
            assert -margin <= item['screenY'] <= item['h'] + margin, \
                f"Circle at screenY={item['screenY']:.0f} outside viewport height={item['h']}"


class TestSlalomGates:
    """Test slalom gate system on levels that have gates."""

    def test_slalom_gates_spawn_on_level4(self, game_page: Page):
        """Slalom gates should appear on L4 ski run (8 gates configured)."""
        # Launch SkiRunScene on L4 directly
        game_page.evaluate("""() => {
            window.game.scene.start('SkiRunScene', { level: 4, mode: 'ski' });
        }""")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_function("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            return !!scene?.slalomSystem;
        }""", timeout=5000)

        gate_info = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene || !scene.slalomSystem) return null;
            return {
                totalGates: scene.slalomSystem.totalGates,
                gateCount: scene.slalomSystem.gates.length
            };
        }""")
        assert gate_info is not None, "SlalomGateSystem should exist on SkiRunScene"
        assert gate_info['totalGates'] == 8, f"L4 should have 8 gates, got {gate_info['totalGates']}"

    def test_slalom_hud_counter_visible(self, game_page: Page):
        """Gate counter text should appear in HUD for slalom levels."""
        game_page.evaluate("""() => {
            window.game.scene.start('SkiRunScene', { level: 4, mode: 'ski' });
        }""")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_function("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            return !!scene?.slalomSystem;
        }""", timeout=5000)

        hud_texts = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene) return [];
            return scene.children.list
                .filter(function(c) { return c.type === 'Text'; })
                .map(function(c) { return c.text; });
        }""")
        has_gate_counter = any('0/8' in t or 'Gates' in t or 'Portes' in t or 'Tore' in t for t in hud_texts)
        assert has_gate_counter, f"HUD should show gate counter, got: {hud_texts}"

    def test_no_slalom_gates_on_tutorial(self, game_page: Page):
        """Tutorial level (L0) should not have slalom gates."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        game_page.keyboard.press("k")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        game_page.wait_for_function("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            return !!scene?.slalomSystem;
        }""", timeout=5000)

        gate_info = game_page.evaluate("""() => {
            var scene = window.game.scene.getScene('SkiRunScene');
            if (!scene || !scene.slalomSystem) return { totalGates: 0 };
            return { totalGates: scene.slalomSystem.totalGates };
        }""")
        assert gate_info['totalGates'] == 0, f"Tutorial should have 0 gates, got {gate_info['totalGates']}"


class TestSkiJump:
    """Test ski jump mechanics (groom key triggers jump during ski run)."""

    def _launch_ski_and_build_speed(self, page: Page, level: int = 4):
        """Helper: launch SkiRunScene, dismiss dialogue, build speed."""
        page.evaluate(f"""() => {{
            localStorage.setItem('dialogueDismissed_level{level}Intro', 'true');
            localStorage.setItem('dialogueDismissed_jeanPierreIntro', 'true');
            window.game.scene.start('SkiRunScene', {{ level: {level}, mode: 'ski' }});
        }}""")
        wait_for_scene(page, 'SkiRunScene', timeout=10000)
        # Wait for gravity to build speed (auto-accelerates downhill)
        # Also bail if scene ended (crash/finish) to avoid hanging
        page.wait_for_function("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            if (!s || !s.sys || !s.sys.isActive()) return true;
            if (s.isFinished || s.isCrashed) return true;
            return s.currentSpeed >= 60;
        }""", timeout=15000)

    def test_jump_sets_airborne(self, game_page: Page):
        """Calling doJump at speed should set isAirborne."""
        self._launch_ski_and_build_speed(game_page)

        result = game_page.evaluate("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            if (!s || s.isFinished || s.isCrashed) return 'scene_ended';
            s.doJump();
            return s.isAirborne;
        }""")
        assert result is True, f"doJump should set isAirborne, got {result}"

    def test_jump_lands_after_air_time(self, game_page: Page):
        """After jump, skier should land (isAirborne returns to false)."""
        self._launch_ski_and_build_speed(game_page)

        result = game_page.evaluate("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            if (!s || s.isFinished || s.isCrashed) return 'scene_ended';
            s.doJump();
            return s.isAirborne;
        }""")
        assert result is True, f"doJump should set isAirborne, got {result}"

        # Wait for landing
        game_page.wait_for_function("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            return !s || s.isAirborne === false;
        }""", timeout=3000)

    def test_no_jump_at_low_speed(self, game_page: Page):
        """Jump should not trigger at very low speed."""
        game_page.evaluate("""() => {
            localStorage.setItem('dialogueDismissed_level4Intro', 'true');
            localStorage.setItem('dialogueDismissed_jeanPierreIntro', 'true');
            window.game.scene.start('SkiRunScene', { level: 4, mode: 'ski' });
        }""")
        wait_for_scene(game_page, 'SkiRunScene', timeout=10000)
        page = game_page
        # Don't build speed — press jump immediately
        page.keyboard.down('Space')
        page.wait_for_function("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            return !!s && s.isAirborne === false;
        }""", timeout=2000)

        airborne = page.evaluate("""() => {
            var s = window.game.scene.getScene('SkiRunScene');
            return s ? s.isAirborne : null;
        }""")
        page.keyboard.up('Space')
        assert airborne is False, "Should not jump at low speed"
