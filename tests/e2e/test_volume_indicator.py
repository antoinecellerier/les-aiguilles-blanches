"""E2E tests for the volume indicator on the menu screen."""
import pytest
from playwright.sync_api import Page
from conftest import wait_for_game_ready, assert_scene_active


def get_volume_indicator_pos(page):
    """Get the volume indicator position from MenuScene."""
    return page.evaluate("""() => {
        const scene = window.game?.scene?.getScene('MenuScene');
        if (!scene || !scene.volumeIndicator) return null;
        const vi = scene.volumeIndicator;
        return { x: vi.x, y: vi.y, w: vi.width, h: vi.height };
    }""")


def get_audio_state(page):
    """Get muted and volume state from AudioSystem."""
    return page.evaluate("""() => {
        const a = window.__audioSystem;
        if (!a) return null;
        return { muted: a.isMuted(), volume: a.getVolume('master') };
    }""")


def click_volume_icon(page):
    """Click the volume indicator icon on the canvas."""
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box, "Canvas not found"
    pos = get_volume_indicator_pos(page)
    assert pos, "Volume indicator not found"
    # Click center of icon
    page.mouse.click(box["x"] + pos["x"] + pos["w"] / 2,
                     box["y"] + pos["y"])


class TestVolumeIndicator:
    """Tests for the volume/mute indicator on the menu screen."""

    def test_volume_indicator_exists(self, game_page: Page):
        """Volume indicator is present on the menu screen."""
        assert_scene_active(game_page, 'MenuScene')
        pos = get_volume_indicator_pos(game_page)
        assert pos is not None, "Volume indicator should exist on menu"
        assert pos["w"] > 0, "Volume indicator should have width"

    def test_click_toggles_mute(self, game_page: Page):
        """Clicking the volume icon toggles mute state."""
        assert_scene_active(game_page, 'MenuScene')

        state_before = get_audio_state(game_page)
        assert state_before is not None
        was_muted = state_before["muted"]

        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)

        state_after = get_audio_state(game_page)
        assert state_after["muted"] != was_muted, \
            f"Mute should toggle: was {was_muted}, still {state_after['muted']}"

    def test_click_twice_restores_state(self, game_page: Page):
        """Clicking twice returns to original mute state."""
        assert_scene_active(game_page, 'MenuScene')

        state_original = get_audio_state(game_page)

        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)
        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)

        state_final = get_audio_state(game_page)
        assert state_final["muted"] == state_original["muted"], \
            "Double-click should restore original mute state"

    def test_mute_preserves_volume_level(self, game_page: Page):
        """Muting and unmuting preserves the volume level."""
        assert_scene_active(game_page, 'MenuScene')

        # Set a specific volume
        game_page.evaluate("""() => {
            window.__audioSystem.setVolume('master', 0.7);
            window.__audioSystem.setMuted(false);
        }""")

        state_before = get_audio_state(game_page)
        assert abs(state_before["volume"] - 0.7) < 0.01

        # Mute
        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)
        state_muted = get_audio_state(game_page)
        assert state_muted["muted"] is True

        # Unmute
        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)
        state_unmuted = get_audio_state(game_page)
        assert state_unmuted["muted"] is False
        assert abs(state_unmuted["volume"] - 0.7) < 0.01, \
            f"Volume should be preserved at 0.7, got {state_unmuted['volume']}"

    def test_hover_shows_slider(self, game_page: Page):
        """Hovering over the icon shows the volume slider (mouse only)."""
        assert_scene_active(game_page, 'MenuScene')

        canvas = page_canvas_box(game_page)
        pos = get_volume_indicator_pos(game_page)
        assert pos is not None

        # Hover over icon
        game_page.mouse.move(canvas["x"] + pos["x"] + pos["w"] / 2,
                             canvas["y"] + pos["y"])
        game_page.wait_for_timeout(300)

        slider_visible = game_page.evaluate("""() => {
            const scene = window.game?.scene?.getScene('MenuScene');
            return scene?.volumeSliderVisible ?? false;
        }""")
        assert slider_visible, "Slider should appear on hover"

    def test_slider_dismisses_on_leave(self, game_page: Page):
        """Slider disappears when pointer leaves the area."""
        assert_scene_active(game_page, 'MenuScene')

        canvas = page_canvas_box(game_page)
        pos = get_volume_indicator_pos(game_page)
        assert pos is not None

        # Hover to show slider
        game_page.mouse.move(canvas["x"] + pos["x"] + pos["w"] / 2,
                             canvas["y"] + pos["y"])
        game_page.wait_for_timeout(300)

        # Move far away
        game_page.mouse.move(canvas["x"] + canvas["width"] / 2,
                             canvas["y"] + canvas["height"] / 2)
        game_page.wait_for_timeout(500)

        slider_visible = game_page.evaluate("""() => {
            const scene = window.game?.scene?.getScene('MenuScene');
            return scene?.volumeSliderVisible ?? false;
        }""")
        assert not slider_visible, "Slider should dismiss when pointer leaves"

    def test_mute_overlay_shown_when_muted(self, game_page: Page):
        """The forbidden-circle overlay appears when muted."""
        assert_scene_active(game_page, 'MenuScene')

        # Ensure unmuted first
        game_page.evaluate("() => window.__audioSystem.setMuted(false)")

        overlay_before = game_page.evaluate("""() => {
            const scene = window.game?.scene?.getScene('MenuScene');
            return scene?.volumeMuteOverlay != null;
        }""")
        assert not overlay_before, "Overlay should not exist when unmuted"

        # Mute
        click_volume_icon(game_page)
        game_page.wait_for_timeout(200)

        overlay_after = game_page.evaluate("""() => {
            const scene = window.game?.scene?.getScene('MenuScene');
            return scene?.volumeMuteOverlay != null;
        }""")
        assert overlay_after, "Overlay should appear when muted"


def page_canvas_box(page):
    """Get the canvas bounding box."""
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box, "Canvas not found"
    return box
