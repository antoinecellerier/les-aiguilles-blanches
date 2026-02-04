"""E2E tests for Settings UI legibility and layout."""
import pytest
from playwright.sync_api import Page, expect


# Settings button index (0=Start, 1=How to Play, 2=Settings)
BUTTON_SETTINGS = 2


def click_menu_button(page: Page, button_index: int, button_name: str = "button"):
    """Click a menu button by index.
    
    Menu buttons are positioned proportionally based on viewport height.
    """
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box, "Canvas not found"
    
    height = box["height"]
    scale_factor = max(0.7, min(height / 768, 1.5))
    button_spacing = 55 * scale_factor
    menu_y = height * 0.55
    
    button_y = menu_y - button_spacing * 0.5 + button_index * button_spacing
    
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + button_y)
    page.wait_for_timeout(300)


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
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(2000)
    
    # Click Settings button (index 2)
    click_menu_button(page, BUTTON_SETTINGS, "Settings")
    page.wait_for_timeout(500)
    
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
        
        # Check for expected sections
        expected_content = ['settings', 'language', 'accessibility', 'controls']
        for expected in expected_content:
            found = any(expected in t for t in texts)
            assert found, f"Expected to find '{expected}' in Settings, got: {texts[:10]}"

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
        
        settings_page.wait_for_timeout(500)
        assert_scene_active(settings_page, 'MenuScene')


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
        page.goto("http://localhost:3000/")
        page.wait_for_timeout(2000)
        
        # Click Settings using dynamic positioning
        canvas = page.locator("canvas")
        box = canvas.bounding_box()
        
        # Calculate button position using same formula as menu
        canvas_height = box["height"]
        scale_factor = max(0.7, min(canvas_height / 768, 1.5))
        button_spacing = 55 * scale_factor
        menu_y = canvas_height * 0.55
        settings_y = menu_y - button_spacing * 0.5 + 2 * button_spacing  # index 2
        
        page.mouse.click(box["x"] + box["width"] / 2, box["y"] + settings_y)
        page.wait_for_timeout(500)
        
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
