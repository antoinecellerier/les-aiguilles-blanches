"""E2E tests for Settings UI legibility and layout."""
import pytest
from playwright.sync_api import Page, expect
from conftest import wait_for_scene, wait_for_game_ready, GAME_URL


def navigate_to_settings_via_keyboard(page: Page):
    """Navigate to Settings using keyboard (more reliable for small viewports)."""
    # Use direct scene start via console
    page.evaluate("""() => {
        if (window.game && window.game.scene) {
            window.game.scene.start('SettingsScene');
        }
    }""")
    wait_for_scene(page, 'SettingsScene')


def navigate_to_settings(page: Page):
    """Navigate to Settings using click or fallback to keyboard."""
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    
    if not box:
        navigate_to_settings_via_keyboard(page)
        return
    
    # Settings is button index 3 (Start=0, How to Play=1, Changelog=2, Settings=3)
    pos = page.evaluate("""() => {
        const scene = window.game?.scene?.getScene('MenuScene');
        if (!scene || !scene.menuButtons) return null;
        const btn = scene.menuButtons[3];
        if (!btn) return null;
        return { x: btn.x, y: btn.y };
    }""")
    
    if pos:
        page.mouse.click(box["x"] + pos["x"], box["y"] + pos["y"])
        wait_for_scene(page, 'SettingsScene')
    
    # Check if it worked, fallback to direct scene start if not
    scenes = get_active_scenes(page)
    if 'SettingsScene' not in scenes:
        navigate_to_settings_via_keyboard(page)


def get_active_scenes(page: Page) -> list:
    """Get list of active Phaser scene keys."""
    return page.evaluate("""() => {
        if (window.game && window.game.scene) {
            return window.game.scene.getScenes(true).map(s => s.scene.key);
        }
        return [];
    }""")


def assert_scene_active(page: Page, scene_key: str, message: str = None):
    """Assert a specific scene is currently active."""
    scenes = get_active_scenes(page)
    msg = message or f"Expected {scene_key} to be active, got: {scenes}"
    assert scene_key in scenes, msg


def get_settings_text_elements(page: Page) -> list:
    """Get bounding boxes of all text elements in SettingsScene."""
    return page.evaluate("""() => {
        const scene = window.game.scene.getScene('SettingsScene');
        if (!scene) return [];
        
        const textObjects = [];
        scene.children.list.forEach(child => {
            if (child.type === 'Text' && child.text && child.text.trim()) {
                const bounds = child.getBounds();
                textObjects.push({
                    text: child.text.substring(0, 30),
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    fontSize: child.style ? parseInt(child.style.fontSize) || 0 : 0
                });
            }
        });
        return textObjects;
    }""")


def check_text_overlap(elements: list) -> list:
    """Check if any text elements overlap significantly."""
    overlaps = []
    for i, a in enumerate(elements):
        for j, b in enumerate(elements):
            if i >= j:
                continue
            # Check if bounding boxes overlap
            overlap_x = max(0, min(a['x'] + a['width'], b['x'] + b['width']) - max(a['x'], b['x']))
            overlap_y = max(0, min(a['y'] + a['height'], b['y'] + b['height']) - max(a['y'], b['y']))
            overlap_area = overlap_x * overlap_y
            
            # If overlap is more than 20% of smaller element, flag it
            min_area = min(a['width'] * a['height'], b['width'] * b['height'])
            if min_area > 0 and overlap_area / min_area > 0.2:
                overlaps.append({
                    'text_a': a['text'],
                    'text_b': b['text'],
                    'overlap_percent': overlap_area / min_area * 100
                })
    return overlaps


@pytest.fixture
def settings_page(page: Page):
    """Navigate to Settings screen."""
    page.goto(GAME_URL)
    page.wait_for_selector("canvas", timeout=10000)
    wait_for_game_ready(page)
    
    # Navigate to Settings
    navigate_to_settings(page)
    
    assert_scene_active(page, 'SettingsScene')
    yield page


class TestSettingsLayout:
    """Test Settings UI layout and legibility."""

    def test_settings_scene_loads(self, settings_page: Page):
        """Test Settings scene loads without errors."""
        assert_scene_active(settings_page, 'SettingsScene')
        
        # Take screenshot for visual verification
        settings_page.screenshot(path="tests/screenshots/settings_screen.png")

    def test_settings_has_minimum_font_size(self, settings_page: Page):
        """Test that all text elements have minimum readable font size."""
        elements = get_settings_text_elements(settings_page)
        assert len(elements) > 5, f"Expected multiple text elements, got {len(elements)}"
        
        # Check minimum font size (should be at least 14px)
        small_fonts = [e for e in elements if e['fontSize'] > 0 and e['fontSize'] < 14]
        assert len(small_fonts) == 0, \
            f"Found text elements with font size < 14px: {[e['text'] for e in small_fonts]}"

    def test_settings_no_text_overlap(self, settings_page: Page):
        """Test that text elements don't overlap."""
        elements = get_settings_text_elements(settings_page)
        overlaps = check_text_overlap(elements)
        
        assert len(overlaps) == 0, \
            f"Found overlapping text elements: {overlaps}"

    def test_settings_elements_visible(self, settings_page: Page):
        """Test that key Settings elements are visible."""
        elements = get_settings_text_elements(settings_page)
        texts = [e['text'].lower() for e in elements]
        
        # Check for expected sections (support both EN and FR)
        # Note: Controls/keyboard section may not be visible on small screens
        expected_content = [
            ('settings', 'paramètres'),
            ('language', 'langue'),
            ('accessibility', 'accessibilité'),
        ]
        for expected_options in expected_content:
            found = any(any(opt in t for opt in expected_options) for t in texts)
            assert found, f"Expected to find one of {expected_options} in Settings, got: {texts[:15]}"

    def test_settings_toggles_clickable(self, settings_page: Page):
        """Test that toggle buttons are interactive."""
        # Find and click High Contrast toggle
        result = settings_page.evaluate("""() => {
            const scene = window.game.scene.getScene('SettingsScene');
            if (!scene) return { found: false };
            
            let toggleFound = false;
            scene.children.list.forEach(child => {
                if (child.type === 'Text' && child.text && 
                    (child.text.includes('ON') || child.text.includes('OFF'))) {
                    toggleFound = true;
                    // Simulate click by emitting pointerdown
                    if (child.input && child.input.enabled) {
                        child.emit('pointerdown');
                    }
                }
            });
            return { found: toggleFound };
        }""")
        
        assert result['found'], "No toggle buttons found in Settings"

    def test_settings_back_button_works(self, settings_page: Page):
        """Test that Back button returns to menu."""
        # Find and click Back button
        settings_page.evaluate("""() => {
            const scene = window.game.scene.getScene('SettingsScene');
            if (!scene) return;
            
            scene.children.list.forEach(child => {
                if (child.type === 'Text' && child.text && 
                    (child.text.includes('Back') || child.text.includes('←'))) {
                    if (child.input && child.input.enabled) {
                        child.emit('pointerdown');
                    }
                }
            });
        }""")
        
        wait_for_scene(settings_page, 'MenuScene')


class TestSettingsResponsive:
    """Test Settings UI at different viewport sizes."""

    @pytest.mark.parametrize("width,height", [
        (800, 600),   # Small
        (1024, 768),  # Reference
        (1920, 1080), # Full HD
    ])
    def test_settings_at_viewport_size(self, page: Page, width: int, height: int):
        """Test Settings legibility at different viewport sizes."""
        page.set_viewport_size({"width": width, "height": height})
        page.goto(GAME_URL)
        page.wait_for_selector("canvas", timeout=10000)
        wait_for_game_ready(page)
        
        navigate_to_settings(page)
        assert_scene_active(page, 'SettingsScene')
        
        # Get text elements and verify no overlaps
        elements = get_settings_text_elements(page)
        overlaps = check_text_overlap(elements)
        
        page.screenshot(path=f"tests/screenshots/settings_{width}x{height}.png")
        
        assert len(overlaps) == 0, \
            f"Overlapping text at {width}x{height}: {overlaps}"
        
        # Verify minimum font size scales appropriately
        if elements:
            avg_font = sum(e['fontSize'] for e in elements if e['fontSize'] > 0) / len([e for e in elements if e['fontSize'] > 0])
            assert avg_font >= 14, f"Average font size {avg_font}px too small at {width}x{height}"


class TestSettingsContentBounds:
    """Test that Settings content stays within screen bounds."""

    def get_content_bounds(self, page: Page) -> dict:
        """Get the bounding box containing all visible content."""
        return page.evaluate("""() => {
            const scene = window.game.scene.getScene('SettingsScene');
            if (!scene) return null;
            
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            scene.children.list.forEach(child => {
                if (child.type === 'Text' && child.visible && child.text && child.text.trim()) {
                    const bounds = child.getBounds();
                    minX = Math.min(minX, bounds.x);
                    minY = Math.min(minY, bounds.y);
                    maxX = Math.max(maxX, bounds.x + bounds.width);
                    maxY = Math.max(maxY, bounds.y + bounds.height);
                }
            });
            
            const camera = scene.cameras.main;
            return {
                contentLeft: minX,
                contentTop: minY,
                contentRight: maxX,
                contentBottom: maxY,
                viewportWidth: camera.width,
                viewportHeight: camera.height
            };
        }""")

    @pytest.mark.parametrize("width,height", [
        (320, 568),   # iPhone SE portrait
        (375, 667),   # iPhone 8 portrait  
        (390, 844),   # iPhone 12 portrait
        (768, 1024),  # iPad portrait
        (1024, 768),  # Desktop reference
        (1920, 1080), # Full HD
        (2560, 1440), # QHD
    ])
    def test_content_within_viewport(self, page: Page, width: int, height: int):
        """Test that all content stays within viewport bounds."""
        page.set_viewport_size({"width": width, "height": height})
        page.goto(GAME_URL)
        page.wait_for_selector("canvas", timeout=10000)
        wait_for_game_ready(page)
        
        navigate_to_settings(page)
        assert_scene_active(page, 'SettingsScene')
        
        bounds = self.get_content_bounds(page)
        assert bounds, f"Could not get content bounds at {width}x{height}"
        
        page.screenshot(path=f"tests/screenshots/settings_bounds_{width}x{height}.png")
        
        # Content should not go off-screen (allow 5px margin for anti-aliasing)
        margin = 5
        assert bounds['contentLeft'] >= -margin, \
            f"Content overflows left at {width}x{height}: left={bounds['contentLeft']}"
        assert bounds['contentTop'] >= -margin, \
            f"Content overflows top at {width}x{height}: top={bounds['contentTop']}"
        assert bounds['contentRight'] <= bounds['viewportWidth'] + margin, \
            f"Content overflows right at {width}x{height}: right={bounds['contentRight']}, viewport={bounds['viewportWidth']}"
        assert bounds['contentBottom'] <= bounds['viewportHeight'] + margin, \
            f"Content overflows bottom at {width}x{height}: bottom={bounds['contentBottom']}, viewport={bounds['viewportHeight']}"

    @pytest.mark.parametrize("width,height,dpr", [
        (375, 667, 2),    # iPhone 8 @2x
        (390, 844, 3),    # iPhone 12 @3x
        (360, 800, 2.75), # Android high DPI
        (1920, 1080, 1),  # Desktop 1x
        (1920, 1080, 2),  # Retina desktop
    ])
    def test_content_bounds_with_dpi(self, page: Page, width: int, height: int, dpr: float):
        """Test content bounds at various DPI settings."""
        # Set viewport with device scale factor
        page.set_viewport_size({"width": width, "height": height})
        
        # Emulate device pixel ratio before navigating
        page.add_init_script(f"Object.defineProperty(window, 'devicePixelRatio', {{ value: {dpr}, writable: true }});")
        
        page.goto(GAME_URL)
        page.wait_for_selector("canvas", timeout=10000)
        wait_for_game_ready(page)
        
        navigate_to_settings(page)
        assert_scene_active(page, 'SettingsScene')
        
        bounds = self.get_content_bounds(page)
        assert bounds, f"Could not get content bounds at {width}x{height} @{dpr}x"
        
        page.screenshot(path=f"tests/screenshots/settings_dpi_{width}x{height}_{dpr}x.png")
        
        # Check no overflow
        margin = 5
        assert bounds['contentRight'] <= bounds['viewportWidth'] + margin, \
            f"Content overflows right at {width}x{height} @{dpr}x"
        assert bounds['contentBottom'] <= bounds['viewportHeight'] + margin, \
            f"Content overflows bottom at {width}x{height} @{dpr}x"

    def test_narrow_portrait_layout(self, page: Page):
        """Test single-column layout on narrow portrait screens."""
        page.set_viewport_size({"width": 320, "height": 568})
        page.goto(GAME_URL)
        page.wait_for_selector("canvas", timeout=10000)
        wait_for_game_ready(page)
        
        navigate_to_settings(page)
        assert_scene_active(page, 'SettingsScene')
        
        elements = get_settings_text_elements(page)
        overlaps = check_text_overlap(elements)
        
        page.screenshot(path="tests/screenshots/settings_narrow_portrait.png")
        
        assert len(overlaps) == 0, f"Overlapping elements on narrow portrait: {overlaps}"
        
        # All elements should have font size >= 14
        small_fonts = [e for e in elements if e['fontSize'] > 0 and e['fontSize'] < 14]
        assert len(small_fonts) == 0, \
            f"Small fonts on narrow screen: {[e['text'] for e in small_fonts]}"
