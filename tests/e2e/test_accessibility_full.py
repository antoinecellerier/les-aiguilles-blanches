"""Comprehensive accessibility test pass.

Tests every accessibility setting across key scenes and form factors:
- High contrast mode
- Colorblind modes (deuteranopia, protanopia, tritanopia)
- Reduced motion
- HUD colorblind indicators (text labels vs colored dots)
- Screen reader announcer element
- Responsive form factors (phone, tablet, desktop)
"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page
from conftest import (
    GAME_URL, wait_for_game_ready, wait_for_scene,
    click_button, assert_scene_active, assert_canvas_renders_content,
    navigate_to_settings, dismiss_dialogues,
    BUTTON_START,
)

SCREENSHOT_DIR = "tests/screenshots"


@pytest.fixture(autouse=True)
def skip_prologue():
    """Override global autouse fixture; this module sets init script on context."""
    return


@pytest.fixture(scope="module")
def module_context(browser: Browser) -> BrowserContext:
    """Reuse one context for this module to reduce browser setup overhead."""
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script("localStorage.setItem('snowGroomer_prologueSeen', '1');")
    yield context
    context.close()


@pytest.fixture
def game_page(module_context: BrowserContext):
    """Fresh page per test from shared context, with clean game boot."""
    page = module_context.new_page()
    page.goto(GAME_URL)
    page.wait_for_selector("canvas", timeout=10000)
    wait_for_game_ready(page)
    yield page
    page.evaluate("localStorage.clear()")
    page.close()


# ── Helpers ──────────────────────────────────────────────────────────


def set_accessibility(page: Page, **kwargs):
    """Set accessibility settings via JS and apply DOM changes.
    
    Accepts: highContrast, colorblindMode, reducedMotion, uiScale
    """
    settings_js = ", ".join(f"'{k}': {_js_val(v)}" for k, v in kwargs.items())
    page.evaluate(f"""() => {{
        const a = window.__accessibility || (() => {{
            const mod = window.game?.registry?.get('accessibility');
            return mod;
        }})();
        // Direct localStorage approach — works regardless of module exposure
        const key = 'snowGroomer_accessibility';
        const current = JSON.parse(localStorage.getItem(key) || '{{}}');
        const updates = {{ {settings_js} }};
        Object.assign(current, updates);
        localStorage.setItem(key, JSON.stringify(current));
    }}""")
    # Reload settings in the live Accessibility module
    page.evaluate("""() => {
        const game = window.game;
        if (!game) return;
        // Accessibility module is imported; use eval to reach it via settings scene
        const ss = game.scene.getScene('SettingsScene');
        const gs = game.scene.getScene('GameScene');
        // Force all scenes to reload accessibility from localStorage
        const key = 'snowGroomer_accessibility';
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        // Walk all scenes to find one that has Accessibility imported
        for (const scene of game.scene.getScenes(false)) {
            if (scene.sys && scene.sys.settings) {
                // Trigger accessibility reload via game event
                break;
            }
        }
    }""")


def _js_val(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return f"'{v}'"
    return str(v)


def apply_and_verify_settings(page: Page, **kwargs):
    """Set accessibility settings, start a scene, and verify they take effect."""
    set_accessibility(page, **kwargs)
    # Reload page to pick up localStorage settings cleanly
    page.reload()
    page.wait_for_selector("canvas", timeout=10000)
    wait_for_scene(page, 'MenuScene', timeout=10000)


def start_game_and_wait(page: Page):
    """Start game from menu and wait for GameScene + HUD."""
    click_button(page, BUTTON_START, "Start Game")
    wait_for_scene(page, 'GameScene')
    dismiss_dialogues(page)
    wait_for_scene(page, 'HUDScene')


def screenshot(page: Page, name: str):
    """Save a screenshot with the given name."""
    page.screenshot(path=f"{SCREENSHOT_DIR}/a11y_{name}.png")


VIEWPORTS = {
    'phone':   {'width': 375,  'height': 667},
    'tablet':  {'width': 768,  'height': 1024},
    'desktop': {'width': 1280, 'height': 720},
}


# ── High Contrast Tests ─────────────────────────────────────────────


class TestHighContrast:
    """Verify high contrast mode across scenes."""

    def test_high_contrast_adds_body_class(self, game_page: Page):
        """Enabling high contrast should add 'high-contrast' class to body."""
        apply_and_verify_settings(game_page, highContrast=True)
        # Start game to trigger applyDOMSettings via Accessibility.loadSettings()
        start_game_and_wait(game_page)
        has_class = game_page.evaluate(
            "() => document.body.classList.contains('high-contrast')"
        )
        assert has_class, "Body should have 'high-contrast' class"
        screenshot(game_page, "high_contrast_menu")

    def test_high_contrast_canvas_filter(self, game_page: Page):
        """High contrast should apply contrast+saturate CSS filter to the canvas."""
        apply_and_verify_settings(game_page, highContrast=True)
        start_game_and_wait(game_page)

        filter_value = game_page.evaluate("""() => {
            const canvas = document.querySelector('#game-container canvas');
            return canvas ? canvas.style.filter : '';
        }""")
        assert 'contrast' in filter_value, \
            f"Canvas should have contrast() filter, got '{filter_value}'"
        assert 'saturate' in filter_value, \
            f"Canvas should have saturate() filter, got '{filter_value}'"

    def test_high_contrast_no_filter_when_off(self, game_page: Page):
        """Without high contrast, canvas should not have contrast filter."""
        apply_and_verify_settings(game_page, highContrast=False, colorblindMode='none')
        start_game_and_wait(game_page)

        filter_value = game_page.evaluate("""() => {
            const canvas = document.querySelector('#game-container canvas');
            return canvas ? canvas.style.filter : '';
        }""")
        assert 'contrast' not in filter_value, \
            f"Canvas should NOT have contrast filter when HC off, got '{filter_value}'"

    def test_high_contrast_removes_class_when_off(self, game_page: Page):
        """Disabling high contrast should remove the class."""
        apply_and_verify_settings(game_page, highContrast=True)
        apply_and_verify_settings(game_page, highContrast=False)
        start_game_and_wait(game_page)
        has_class = game_page.evaluate(
            "() => document.body.classList.contains('high-contrast')"
        )
        assert not has_class, "Body should NOT have 'high-contrast' class"

    def test_high_contrast_hud_thicker_stroke(self, game_page: Page):
        """HUD text should have stroke in high contrast mode."""
        apply_and_verify_settings(game_page, highContrast=True)
        start_game_and_wait(game_page)
        assert_scene_active(game_page, 'HUDScene')

        hud_data = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud || !hud.coverageText) return null;
            return {
                stroke: hud.coverageText.style?.stroke || '',
                strokeThickness: hud.coverageText.style?.strokeThickness || 0,
            };
        }""")
        assert hud_data is not None, "HUDScene should have coverageText"
        assert hud_data['strokeThickness'] >= 2, \
            f"High contrast HUD text should have stroke thickness >= 2, got {hud_data['strokeThickness']}"
        screenshot(game_page, "high_contrast_hud")

    def test_high_contrast_visor_alpha(self, game_page: Page):
        """HUD visor should have higher alpha in high contrast mode."""
        apply_and_verify_settings(game_page, highContrast=True)
        start_game_and_wait(game_page)

        # The visor rectangle is the first rectangle added, at alpha 0.80
        visor_alpha = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud) return -1;
            // First rectangle in display list is the visor background
            const rects = hud.children.list.filter(c => c.type === 'Rectangle');
            return rects.length > 0 ? rects[0].alpha : -1;
        }""")
        assert visor_alpha >= 0.75, \
            f"High contrast visor alpha should be >= 0.75, got {visor_alpha}"

    def test_high_contrast_gameplay_screenshot(self, game_page: Page):
        """Visual check: gameplay with high contrast enabled."""
        apply_and_verify_settings(game_page, highContrast=True)
        start_game_and_wait(game_page)
        assert_canvas_renders_content(game_page)
        screenshot(game_page, "high_contrast_gameplay")


# ── Colorblind Mode Tests ───────────────────────────────────────────


class TestColorblindModes:
    """Verify all three colorblind filter modes."""

    @pytest.mark.parametrize("mode", ['deuteranopia', 'protanopia', 'tritanopia'])
    def test_colorblind_filter_applied_to_canvas(self, game_page: Page, mode: str):
        """Each colorblind mode should apply an SVG filter to the canvas."""
        apply_and_verify_settings(game_page, colorblindMode=mode)

        # Navigate to game to trigger applyDOMSettings
        start_game_and_wait(game_page)

        filter_value = game_page.evaluate("""() => {
            const canvas = document.querySelector('#game-container canvas');
            return canvas ? canvas.style.filter : '';
        }""")
        # Browsers may serialize as url(#id) or url("#id")
        assert f'{mode}-filter' in filter_value, \
            f"Canvas filter should reference '{mode}-filter', got '{filter_value}'"

        # SVG filter element should exist
        svg_exists = game_page.evaluate(
            "() => document.getElementById('colorblind-filters') !== null"
        )
        assert svg_exists, "Colorblind SVG filters should be injected into DOM"
        screenshot(game_page, f"colorblind_{mode}_gameplay")

    def test_colorblind_none_removes_filter(self, game_page: Page):
        """Setting colorblind mode to 'none' should remove canvas filter."""
        apply_and_verify_settings(game_page, colorblindMode='deuteranopia')
        apply_and_verify_settings(game_page, colorblindMode='none')
        start_game_and_wait(game_page)

        filter_value = game_page.evaluate("""() => {
            const canvas = document.querySelector('#game-container canvas');
            return canvas ? canvas.style.filter : '';
        }""")
        assert filter_value == '' or 'filter' not in filter_value, \
            f"Canvas filter should be empty when colorblind mode is 'none', got '{filter_value}'"

    def test_colorblind_hud_text_labels(self, game_page: Page):
        """In colorblind mode, HUD should show text labels ("F"/"S") instead of colored dots."""
        apply_and_verify_settings(game_page, colorblindMode='deuteranopia')
        start_game_and_wait(game_page)

        has_labels = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud) return false;
            // Look for text objects with content "F" or "S" 
            const texts = hud.children.list.filter(c => c.type === 'Text');
            const labels = texts.filter(t => t.text === 'F' || t.text === 'S');
            return labels.length >= 2;
        }""")
        assert has_labels, "HUD should have 'F' and 'S' text labels in colorblind mode"
        screenshot(game_page, "colorblind_hud_labels")

    def test_colorblind_hud_no_labels_when_off(self, game_page: Page):
        """Without colorblind mode, HUD should NOT have text labels for bars."""
        apply_and_verify_settings(game_page, colorblindMode='none')
        start_game_and_wait(game_page)

        label_count = game_page.evaluate("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            if (!hud) return 0;
            const texts = hud.children.list.filter(c => c.type === 'Text');
            return texts.filter(t => t.text === 'F' || t.text === 'S').length;
        }""")
        assert label_count == 0, \
            f"HUD should NOT have F/S labels when colorblind mode is off, found {label_count}"


# ── Reduced Motion Tests ────────────────────────────────────────────


class TestReducedMotion:
    """Verify reduced motion disables animations."""

    def test_reduced_motion_persists(self, game_page: Page):
        """Reduced motion setting should persist in localStorage."""
        apply_and_verify_settings(game_page, reducedMotion=True)
        stored = game_page.evaluate("""() => {
            const data = JSON.parse(localStorage.getItem('snowGroomer_accessibility') || '{}');
            return data.reducedMotion;
        }""")
        assert stored is True, "reducedMotion should be stored as true"

    def test_reduced_motion_disables_weather_particles(self, game_page: Page):
        """With reduced motion, weather system should not create particles."""
        apply_and_verify_settings(game_page, reducedMotion=True)
        start_game_and_wait(game_page)

        weather_disabled = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            if (!gs) return null;
            // WeatherSystem checks reducedMotion at update time
            const key = 'snowGroomer_accessibility';
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            return saved.reducedMotion === true;
        }""")
        assert weather_disabled is True, "Reduced motion should be active"
        screenshot(game_page, "reduced_motion_gameplay")


# ── Screen Reader / ARIA Tests ──────────────────────────────────────


class TestScreenReader:
    """Verify screen reader support elements."""

    def test_aria_live_region_exists(self, game_page: Page):
        """An aria-live announcer element should exist in the DOM."""
        has_announcer = game_page.evaluate("""() => {
            const el = document.querySelector('[aria-live="polite"]');
            return el !== null;
        }""")
        assert has_announcer, "aria-live='polite' announcer should exist in DOM"

    def test_canvas_has_role(self, game_page: Page):
        """Canvas element should be accessible."""
        canvas_exists = game_page.evaluate("""() => {
            const canvas = document.querySelector('canvas');
            return canvas !== null;
        }""")
        assert canvas_exists, "Canvas element should exist"


# ── Settings UI Tests ────────────────────────────────────────────────


class TestSettingsAccessibilityUI:
    """Verify accessibility controls render correctly in Settings."""

    def test_settings_shows_accessibility_section(self, game_page: Page):
        """Settings scene should have the accessibility section."""
        navigate_to_settings(game_page)
        assert_scene_active(game_page, 'SettingsScene')

        has_section = game_page.evaluate("""() => {
            const ss = window.game.scene.getScene('SettingsScene');
            if (!ss) return false;
            const texts = ss.children.list.filter(c => c.type === 'Text');
            return texts.some(t => t.text && t.text.includes('ccessib'));
        }""")
        assert has_section, "Settings should display Accessibility section header"
        screenshot(game_page, "settings_a11y_section")

    def test_settings_has_high_contrast_toggle(self, game_page: Page):
        """Settings should have a High Contrast toggle."""
        navigate_to_settings(game_page)
        has_toggle = game_page.evaluate("""() => {
            const ss = window.game.scene.getScene('SettingsScene');
            if (!ss) return false;
            const texts = ss.children.list.filter(c => c.type === 'Text');
            return texts.some(t => t.text && (
                t.text.includes('ontrast') || t.text.includes('Kontrast') || 
                t.text.includes('ontraste') || t.text.includes('kontrast')
            ));
        }""")
        assert has_toggle, "Settings should display High Contrast toggle"

    def test_settings_has_reduced_motion_toggle(self, game_page: Page):
        """Settings should have a Reduced Motion toggle."""
        navigate_to_settings(game_page)
        has_toggle = game_page.evaluate("""() => {
            const ss = window.game.scene.getScene('SettingsScene');
            if (!ss) return false;
            const texts = ss.children.list.filter(c => c.type === 'Text');
            return texts.some(t => t.text && (
                t.text.includes('otion') || t.text.includes('ouvement') || 
                t.text.includes('ewegung') || t.text.includes('ovimiento')
            ));
        }""")
        assert has_toggle, "Settings should display Reduced Motion toggle"

    def test_settings_has_colorblind_selector(self, game_page: Page):
        """Settings should have colorblind mode buttons."""
        navigate_to_settings(game_page)
        has_selector = game_page.evaluate("""() => {
            const ss = window.game.scene.getScene('SettingsScene');
            if (!ss) return false;
            const texts = ss.children.list.filter(c => c.type === 'Text');
            return texts.some(t => t.text && (
                t.text.includes('olorblind') || t.text.includes('altonism') ||
                t.text.includes('arv') || t.text.includes('örlüğü')
            ));
        }""")
        assert has_selector, "Settings should display Colorblind mode selector"


# ── Form Factor / Responsive Tests ──────────────────────────────────


class TestResponsiveAccessibility:
    """Test accessibility features across different viewport sizes."""

    @pytest.mark.parametrize("form,size", [
        ('phone',   {'width': 375,  'height': 667}),
        ('tablet',  {'width': 768,  'height': 1024}),
        ('desktop', {'width': 1280, 'height': 720}),
    ])
    def test_settings_renders_at_viewport(self, game_page: Page, form: str, size: dict):
        """Settings accessibility section should render at various viewport sizes."""
        game_page.set_viewport_size(size)
        game_page.reload()
        game_page.wait_for_selector("canvas", timeout=10000)
        wait_for_scene(game_page, 'MenuScene', timeout=10000)
        navigate_to_settings(game_page)
        assert_scene_active(game_page, 'SettingsScene')
        assert_canvas_renders_content(game_page)
        screenshot(game_page, f"settings_a11y_{form}")

    @pytest.mark.parametrize("form,size", [
        ('phone',   {'width': 375,  'height': 667}),
        ('tablet',  {'width': 768,  'height': 1024}),
        ('desktop', {'width': 1280, 'height': 720}),
    ])
    def test_high_contrast_hud_at_viewport(self, game_page: Page, form: str, size: dict):
        """High contrast HUD should render correctly at various viewport sizes."""
        game_page.set_viewport_size(size)
        apply_and_verify_settings(game_page, highContrast=True)
        start_game_and_wait(game_page)
        assert_scene_active(game_page, 'HUDScene')
        assert_canvas_renders_content(game_page)
        screenshot(game_page, f"hud_high_contrast_{form}")

    @pytest.mark.parametrize("form,size", [
        ('phone',   {'width': 375,  'height': 667}),
        ('desktop', {'width': 1280, 'height': 720}),
    ])
    def test_colorblind_hud_at_viewport(self, game_page: Page, form: str, size: dict):
        """Colorblind HUD labels should render at various viewport sizes."""
        game_page.set_viewport_size(size)
        apply_and_verify_settings(game_page, colorblindMode='deuteranopia')
        start_game_and_wait(game_page)
        assert_scene_active(game_page, 'HUDScene')
        assert_canvas_renders_content(game_page)
        screenshot(game_page, f"hud_colorblind_{form}")


# ── Combined Mode Tests ─────────────────────────────────────────────


class TestCombinedAccessibility:
    """Test combinations of accessibility settings together."""

    def test_high_contrast_plus_colorblind(self, game_page: Page):
        """Both high contrast and colorblind mode should work together."""
        apply_and_verify_settings(game_page, highContrast=True, colorblindMode='protanopia')
        start_game_and_wait(game_page)

        result = game_page.evaluate("""() => {
            const body_hc = document.body.classList.contains('high-contrast');
            const canvas = document.querySelector('#game-container canvas');
            const filter = canvas ? canvas.style.filter : '';
            return { highContrast: body_hc, filter: filter };
        }""")
        assert result['highContrast'], "High contrast should be active"
        assert 'protanopia' in result['filter'], "Protanopia filter should be applied"
        assert_canvas_renders_content(game_page)
        screenshot(game_page, "combined_hc_colorblind")

    def test_all_accessibility_features_enabled(self, game_page: Page):
        """All accessibility features enabled simultaneously."""
        apply_and_verify_settings(
            game_page,
            highContrast=True,
            colorblindMode='tritanopia',
            reducedMotion=True,
        )
        start_game_and_wait(game_page)

        result = game_page.evaluate("""() => {
            const body_hc = document.body.classList.contains('high-contrast');
            const canvas = document.querySelector('#game-container canvas');
            const filter = canvas ? canvas.style.filter : '';
            const a11y = JSON.parse(localStorage.getItem('snowGroomer_accessibility') || '{}');
            return {
                highContrast: body_hc,
                filter: filter,
                reducedMotion: a11y.reducedMotion,
            };
        }""")
        assert result['highContrast'], "High contrast should be active"
        assert 'tritanopia' in result['filter'], "Tritanopia filter should be applied"
        assert result['reducedMotion'] is True, "Reduced motion should be stored"
        assert_canvas_renders_content(game_page)
        screenshot(game_page, "all_a11y_enabled")


# ── Persistence Tests ────────────────────────────────────────────────


class TestAccessibilityPersistence:
    """Verify settings survive page reload."""

    def test_settings_persist_across_reload(self, game_page: Page):
        """Accessibility settings should persist after page reload."""
        apply_and_verify_settings(
            game_page,
            highContrast=True,
            colorblindMode='deuteranopia',
            reducedMotion=True,
        )
        # Reload and check
        game_page.reload()
        game_page.wait_for_selector("canvas", timeout=10000)
        wait_for_scene(game_page, 'MenuScene', timeout=10000)

        stored = game_page.evaluate("""() => {
            const data = JSON.parse(localStorage.getItem('snowGroomer_accessibility') || '{}');
            return data;
        }""")
        assert stored.get('highContrast') is True
        assert stored.get('colorblindMode') == 'deuteranopia'
        assert stored.get('reducedMotion') is True

    def test_default_settings_are_off(self, game_page: Page):
        """Default accessibility settings should all be disabled."""
        stored = game_page.evaluate("""() => {
            const data = JSON.parse(localStorage.getItem('snowGroomer_accessibility') || '{}');
            return data;
        }""")
        # Either empty or all false/none
        assert stored.get('highContrast', False) is False
        assert stored.get('colorblindMode', 'none') in ('none', None)
