"""
Regression tests for resize + touch controls interaction.

These test the fixes from aabd59e4 and subsequent commits:
- Static camera → follow mode when touch controls reduce effective height
- Groomer stays above touch controls after resize
- Dialogue positions above touch controls after resize restart
- Touch follow offset recalculated on resize (not stale)
"""

import pytest
from playwright.sync_api import Page

from conftest import (
    GAME_URL,
    dismiss_dialogues,
    wait_for_game_ready,
)

# Galaxy Note 10 (narrow portrait — triggers static→follow on L7)
GALAXY_PORTRAIT = {"width": 412, "height": 915}
GALAXY_LANDSCAPE = {"width": 915, "height": 412}

# iPhone SE (even narrower)
IPHONESE_PORTRAIT = {"width": 375, "height": 667}


@pytest.fixture
def touch_page(page: Page):
    """Page emulating a portrait touch device."""
    page.set_viewport_size(GALAXY_PORTRAIT)
    page.add_init_script("""
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
        window.ontouchstart = function() {};
    """)
    page.goto(GAME_URL)
    page.wait_for_selector("canvas", timeout=10000)
    wait_for_game_ready(page)
    yield page
    page.evaluate("localStorage.clear()")


def _trigger_resize(page: Page, size: dict):
    """Resize viewport and force game to pick up the change."""
    page.set_viewport_size(size)
    page.evaluate(
        f"() => window.game.scale.resize({size['width']}, {size['height']})"
    )


def _start_game_level(page: Page, level: int, dismiss: bool = True):
    """Start directly in GameScene at the target level, then wait for HUD readiness."""
    page.evaluate(
        f"""() => {{
            const game = window.game;
            if (!game?.scene) return;
            const stopKeys = [
                'PauseScene', 'SettingsScene', 'LevelCompleteScene', 'CreditsScene',
                'SkiRunScene', 'DailyRunsScene', 'LevelSelectScene', 'PrologueScene',
                'HUDScene', 'DialogueScene', 'GameScene', 'MenuScene'
            ];
            for (const key of stopKeys) {{
                const scene = game.scene.getScene(key);
                if (scene?.sys?.isActive()) game.scene.stop(key);
            }}
            game.scene.start('GameScene', {{ level: {level} }});
        }}"""
    )
    page.wait_for_function(
        f"""() => {{
            const gs = window.game?.scene?.getScene('GameScene');
            const hud = window.game?.scene?.getScene('HUDScene');
            return gs?.sys?.isActive() &&
                   gs?.levelIndex === {level} &&
                   !!gs?.groomer &&
                   hud?.sys?.isActive();
        }}""",
        timeout=10000,
    )
    if dismiss:
        dismiss_dialogues(page)
    page.wait_for_function(
        """() => {
            const hud = window.game?.scene?.getScene('HUDScene');
            return !!hud?.touchControlsContainer && typeof hud?.touchControlsTopEdge === 'number';
        }""",
        timeout=8000,
    )


def _wait_for_resize_stable(page: Page, size: dict, timeout: int = 8000):
    """Wait until resized scenes are active with updated dimensions and HUD layout."""
    page.wait_for_function(
        f"""() => {{
            const game = window.game;
            const gs = game?.scene?.getScene('GameScene');
            const hud = game?.scene?.getScene('HUDScene');
            if (!game?.scale || game.scale.width !== {size['width']} || game.scale.height !== {size['height']}) return false;
            if (!gs?.sys?.isActive() || !hud?.sys?.isActive()) return false;
            return !!hud?.touchControlsContainer && typeof hud?.touchControlsTopEdge === 'number';
        }}""",
        timeout=timeout,
    )


def _resize_and_wait(page: Page, size: dict, timeout: int = 8000):
    _trigger_resize(page, size)
    _wait_for_resize_stable(page, size, timeout=timeout)


def _get_camera_state(page: Page) -> dict:
    """Return camera mode, groomer screen position, and touch controls info."""
    return page.evaluate("""() => {
        const gs = window.game.scene.getScene('GameScene');
        const hud = window.game.scene.getScene('HUDScene');
        const cam = gs.cameras.main;
        const g = gs.groomer;
        if (!g || !cam) return null;

        const isFollowing = !!(cam._follow);
        const groomerScreenY = (g.y - cam.worldView.y) * cam.zoom;
        const touchTop = hud?.touchControlsTopEdge ?? null;
        const touchVisible = hud?.touchControlsContainer?.visible === true;

        return {
            isFollowing,
            groomerScreenY: Math.round(groomerScreenY),
            touchControlsTop: touchTop !== null ? Math.round(touchTop) : null,
            touchVisible,
            followOffsetY: Math.round(cam.followOffset?.y ?? 0),
            zoom: cam.zoom,
            screenH: gs.scale.height,
        };
    }""")


# ---------------------------------------------------------------------------
# 1. Static → follow transition on tall level with touch controls
# ---------------------------------------------------------------------------

class TestStaticToFollowTransition:
    """When touch controls eat into the viewport, a level that would normally
    use a static camera must switch to follow mode so the groomer stays visible."""

    def test_l7_portrait_uses_follow_with_touch(self, touch_page: Page):
        """L7 (50×90 grid) in portrait with touch → camera follows groomer."""
        _start_game_level(touch_page, 7, dismiss=False)

        state = _get_camera_state(touch_page)
        assert state is not None, "Should get camera state"

        if state["touchVisible"]:
            assert state["isFollowing"], (
                "Camera should switch to follow mode when touch controls "
                f"reduce effective height (state={state})"
            )
            assert state["followOffsetY"] < 0, (
                "Follow offset should be negative to push groomer up "
                f"(got {state['followOffsetY']})"
            )

    def test_l7_landscape_no_touch_overlap(self, touch_page: Page):
        """In landscape, touch controls don't overlap play area (wide aspect),
        so follow offset should be zero even if camera is following."""
        _start_game_level(touch_page, 7)

        _resize_and_wait(touch_page, GALAXY_LANDSCAPE)

        state = _get_camera_state(touch_page)
        assert state is not None
        # Wide aspect → touch controls in corners, no follow offset needed
        assert state["followOffsetY"] == 0, (
            f"Landscape follow offset should be zero (wide aspect) "
            f"(state={state})"
        )


# ---------------------------------------------------------------------------
# 2. Groomer above touch controls after resize
# ---------------------------------------------------------------------------

class TestGroomerAboveTouchControls:
    """The groomer must never be hidden behind the virtual joystick / buttons."""

    def test_groomer_above_controls_initial(self, touch_page: Page):
        """On initial load in portrait, groomer must be above touch controls."""
        _start_game_level(touch_page, 7)

        state = _get_camera_state(touch_page)
        assert state is not None
        if state["touchVisible"] and state["touchControlsTop"] is not None:
            assert state["groomerScreenY"] < state["touchControlsTop"], (
                f"Groomer (screenY={state['groomerScreenY']}) must be above "
                f"touch controls (top={state['touchControlsTop']})"
            )

    def test_groomer_above_controls_after_resize(self, touch_page: Page):
        """After landscape→portrait resize, groomer must still be above controls."""
        _start_game_level(touch_page, 7)

        # Rotate to landscape
        _resize_and_wait(touch_page, GALAXY_LANDSCAPE)

        # Rotate back to portrait
        _resize_and_wait(touch_page, GALAXY_PORTRAIT)

        state = _get_camera_state(touch_page)
        assert state is not None
        if state["touchVisible"] and state["touchControlsTop"] is not None:
            assert state["groomerScreenY"] < state["touchControlsTop"], (
                f"After resize: groomer (screenY={state['groomerScreenY']}) "
                f"must be above touch controls (top={state['touchControlsTop']})"
            )

    def test_touch_follow_offset_recalculated_on_resize(self, touch_page: Page):
        """Follow offset must be recalculated for new zoom after resize,
        not reuse the stale value from the old viewport."""
        _start_game_level(touch_page, 7)

        offset_portrait = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.followOffset?.y ?? 0"
        )

        # Rotate to landscape (offset should clear — wide aspect)
        _resize_and_wait(touch_page, GALAXY_LANDSCAPE)

        offset_landscape = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.followOffset?.y ?? 0"
        )

        # Back to portrait (offset should be negative again)
        _resize_and_wait(touch_page, GALAXY_PORTRAIT)

        offset_back = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.followOffset?.y ?? 0"
        )

        # Portrait → negative offset, landscape → zero
        assert offset_portrait < 0 or not _get_camera_state(touch_page)["touchVisible"], \
            f"Portrait offset should be negative (got {offset_portrait})"
        assert offset_landscape == 0 or not _get_camera_state(touch_page)["touchVisible"], \
            f"Landscape offset should be zero (got {offset_landscape})"
        # Round-trip: offset should match original
        assert abs(offset_back - offset_portrait) < 5, (
            f"Offset should round-trip: initial={offset_portrait}, after={offset_back}"
        )


# ---------------------------------------------------------------------------
# 3. Dialogue above touch controls
# ---------------------------------------------------------------------------

class TestDialogueAboveTouchControls:
    """Dialogue box must sit above the touch controls area, not behind it."""

    def _get_dialogue_positions(self, page: Page) -> dict | None:
        return page.evaluate("""() => {
            const ds = window.game.scene.getScene('DialogueScene');
            const hud = window.game.scene.getScene('HUDScene');
            if (!ds || !ds.container) return null;

            const containerY = ds.container.y;
            const boxH = ds.currentBoxHeight || 130;
            const dialogueBottom = containerY + boxH / 2;
            const touchTop = hud?.getTouchControlsTopEdge?.() ?? null;
            const touchVisible = hud?.touchControlsContainer?.visible === true;

            return {
                containerY: Math.round(containerY),
                dialogueBottom: Math.round(dialogueBottom),
                touchTop: touchTop !== null ? Math.round(touchTop) : null,
                touchVisible,
                isShowing: ds.isDialogueShowing ? ds.isDialogueShowing() : false,
            };
        }""")

    def test_dialogue_above_controls_on_initial_load(self, touch_page: Page):
        """Dialogue should clear touch controls on a level with intro dialogue."""
        _start_game_level(touch_page, 7, dismiss=False)  # L7 has intro dialogue from Thierry
        # Wait for dialogue to appear
        touch_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.container?.visible === true;
        }""", timeout=5000)

        pos = self._get_dialogue_positions(touch_page)
        assert pos is not None, "Should get dialogue positions"
        if pos["touchVisible"] and pos["touchTop"] is not None:
            assert pos["dialogueBottom"] <= pos["touchTop"] + 5, (
                f"Dialogue bottom ({pos['dialogueBottom']}) must be at or above "
                f"touch controls top ({pos['touchTop']})"
            )

    def test_dialogue_repositions_after_resize(self, touch_page: Page):
        """After resize, dialogue must reposition above touch controls."""
        _start_game_level(touch_page, 7, dismiss=False)
        touch_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.container?.visible === true;
        }""", timeout=5000)

        # Resize to narrower portrait (changes control positions)
        _resize_and_wait(touch_page, IPHONESE_PORTRAIT)

        # Wait for dialogue to re-show after scene restart
        touch_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.container?.visible === true;
        }""", timeout=5000)

        pos = self._get_dialogue_positions(touch_page)
        assert pos is not None, "Should get dialogue positions after resize"
        if pos["touchVisible"] and pos["touchTop"] is not None:
            assert pos["dialogueBottom"] <= pos["touchTop"] + 5, (
                f"After resize: dialogue bottom ({pos['dialogueBottom']}) must "
                f"be at or above touch controls top ({pos['touchTop']})"
            )

    def test_dialogue_above_controls_after_rotation_roundtrip(self, touch_page: Page):
        """Dialogue must stay above controls after portrait→landscape→portrait."""
        _start_game_level(touch_page, 7, dismiss=False)
        touch_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.container?.visible === true;
        }""", timeout=5000)

        # Rotate to landscape and back. _resize_and_wait asserts each target
        # viewport size is applied (GameScale width/height) before continuing.
        _resize_and_wait(touch_page, GALAXY_LANDSCAPE)
        _resize_and_wait(touch_page, GALAXY_PORTRAIT)

        # Wait for dialogue to re-show
        touch_page.wait_for_function("""() => {
            const ds = window.game?.scene?.getScene('DialogueScene');
            return ds?.container?.visible === true;
        }""", timeout=5000)

        pos = self._get_dialogue_positions(touch_page)
        assert pos is not None
        if pos["touchVisible"] and pos["touchTop"] is not None:
            assert pos["dialogueBottom"] <= pos["touchTop"] + 5, (
                f"After rotation roundtrip: dialogue bottom ({pos['dialogueBottom']}) "
                f"must be at or above touch controls top ({pos['touchTop']})"
            )


# ---------------------------------------------------------------------------
# 4. Zoom stability across orientation changes
# ---------------------------------------------------------------------------

class TestZoomStability:
    """Zoom must round-trip correctly across orientation changes."""

    def test_zoom_roundtrip_with_touch(self, touch_page: Page):
        """Zoom in portrait should be identical after portrait→landscape→portrait."""
        _start_game_level(touch_page, 0)

        z1 = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.zoom"
        )

        _resize_and_wait(touch_page, GALAXY_LANDSCAPE)

        _resize_and_wait(touch_page, GALAXY_PORTRAIT)

        z2 = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.zoom"
        )

        assert abs(z2 - z1) < 0.01, (
            f"Zoom should round-trip: initial={z1:.4f}, after={z2:.4f}"
        )

    def test_zoom_not_inflated_after_mobile_to_desktop(self, touch_page: Page):
        """Regression: resizing from mobile to desktop must not leave zoom > 1.0.

        When starting on a small mobile viewport, tileSize is computed for that
        screen. Resizing to a larger desktop viewport should show more world
        (zoom ≤ 1.0), not the same world at oversized pixels (zoom > 1.0).
        """
        _start_game_level(touch_page, 7)

        # Resize to a large desktop viewport
        desktop = {"width": 980, "height": 1080}
        _resize_and_wait(touch_page, desktop)

        zoom = touch_page.evaluate(
            "() => window.game.scene.getScene('GameScene').cameras.main.zoom"
        )
        assert zoom <= 1.01, (
            f"After mobile→desktop resize, zoom should be ≤ 1.0 (got {zoom:.3f})"
        )
