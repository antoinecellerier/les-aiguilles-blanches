"""E2E tests for text overflow at narrow mobile viewports (360px portrait).

Verifies that MenuScene and CreditsScene text elements stay within viewport
bounds on small screens, preventing horizontal overflow and clipping.
"""
import pytest
from playwright.sync_api import Page
from conftest import wait_for_scene


NARROW_VIEWPORTS = [
    (360, 640),   # Common Android portrait
    (320, 568),   # iPhone SE portrait
]

MARGIN = 5  # Allow 5px for anti-aliasing / subpixel rendering


def get_text_bounds(page: Page, scene_name: str) -> dict:
    """Get bounding box containing all visible text in a scene."""
    return page.evaluate(f"""() => {{
        const scene = window.game.scene.getScene('{scene_name}');
        if (!scene) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        let count = 0;

        scene.children.list.forEach(child => {{
            if (child.type === 'Text' && child.visible && child.alpha > 0
                && child.text && child.text.trim()) {{
                const bounds = child.getBounds();
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
                count++;
            }}
        }});

        if (count === 0) return null;

        const camera = scene.cameras.main;
        return {{
            contentLeft: minX,
            contentTop: minY,
            contentRight: maxX,
            contentBottom: maxY,
            viewportWidth: camera.width,
            viewportHeight: camera.height,
            textCount: count
        }};
    }}""")


def assert_no_overflow(bounds: dict, label: str):
    """Assert that content stays within viewport bounds."""
    assert bounds is not None, f"{label}: no text elements found"
    assert bounds['textCount'] > 0, f"{label}: no visible text"

    assert bounds['contentLeft'] >= -MARGIN, \
        f"{label}: text overflows left ({bounds['contentLeft']:.0f}px)"
    assert bounds['contentRight'] <= bounds['viewportWidth'] + MARGIN, \
        (f"{label}: text overflows right "
         f"({bounds['contentRight']:.0f}px > {bounds['viewportWidth']}px)")


class TestTextOverflowNarrowViewport:
    """Verify text stays within viewport at narrow mobile widths."""

    @pytest.mark.parametrize("width,height", NARROW_VIEWPORTS)
    def test_menu_scene_text_within_viewport(self, game_page: Page,
                                             width: int, height: int):
        wait_for_scene(game_page, 'MenuScene')
        game_page.set_viewport_size({"width": width, "height": height})
        # Wait for Phaser camera to reflect new viewport dimensions
        game_page.wait_for_function(
            f"() => window.game.scene.getScene('MenuScene').cameras.main.width === {width}",
            timeout=5000)
        # MenuScene restarts via ResizeManager — wait for re-layout
        game_page.wait_for_timeout(800)

        bounds = get_text_bounds(game_page, 'MenuScene')
        assert_no_overflow(bounds, f"MenuScene@{width}x{height}")

    @pytest.mark.parametrize("width,height", NARROW_VIEWPORTS)
    def test_credits_scene_text_within_viewport(self, game_page: Page,
                                                width: int, height: int):
        # Resize viewport first and wait for Phaser to acknowledge
        game_page.set_viewport_size({"width": width, "height": height})
        game_page.wait_for_function(
            f"() => window.game.scale.gameSize.width === {width}",
            timeout=5000)
        # Start CreditsScene AFTER resize is complete
        game_page.evaluate(
            "() => window.game.scene.start('CreditsScene')")
        wait_for_scene(game_page, 'CreditsScene')
        game_page.wait_for_timeout(500)

        bounds = get_text_bounds(game_page, 'CreditsScene')
        assert_no_overflow(bounds, f"CreditsScene@{width}x{height}")
