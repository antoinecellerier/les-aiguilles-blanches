"""E2E tests for seed sharing: URL param parsing, share button, shared seed display.

Tests the flow of sharing a daily run seed via URL parameters and the clipboard
share button, including locked-state preview for incomplete campaigns.
"""
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, GAME_URL, unlock_all_levels, navigate_to_daily_runs,
)
from test_daily_runs import setup_unlocked, wait_for_scene_ready


# --- Helpers ---

def goto_with_seed(page: Page, seed: str, rank: str = "green", width: int = 1280, height: int = 720):
    """Navigate to the game with seed+rank URL params."""
    page.set_viewport_size({"width": width, "height": height})
    page.goto(f"{GAME_URL}?seed={seed}&rank={rank}")


def click_daily_runs_button(page: Page, key: str):
    """Click a DailyRunsScene button by data-key using real pointer input."""
    pos = page.evaluate(f"""() => {{
        const s = window.game?.scene?.getScene('DailyRunsScene');
        const btn = s?.children.list.find(c => c.getData && c.getData('key') === '{key}');
        if (!btn || !btn.input?.enabled) return null;
        const b = btn.getBounds();
        return {{ x: b.centerX, y: b.centerY }};
    }}""")
    assert pos is not None, f"Button with key '{key}' not found in DailyRunsScene"
    canvas = page.locator("canvas").bounding_box()
    assert canvas is not None, "Canvas should be visible"
    page.mouse.click(canvas["x"] + pos["x"], canvas["y"] + pos["y"])


# --- URL Parameter Parsing ---

def test_shared_seed_routes_to_daily_runs(page: Page):
    """Opening a share URL routes directly to DailyRunsScene (skips MenuScene)."""
    goto_with_seed(page, "ABC123", "blue")
    # Should go to DailyRunsScene, not MenuScene (even without unlock)
    wait_for_scene(page, "DailyRunsScene", timeout=15000)


def test_shared_seed_clears_url_params(page: Page):
    """After parsing, seed params are cleared from URL (no reload loop)."""
    goto_with_seed(page, "ABC123", "blue")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    url = page.evaluate("() => window.location.search")
    assert url == "", f"URL params should be cleared, got: {url}"


def test_shared_seed_invalid_rank_defaults_to_green(page: Page):
    """Invalid rank param defaults to green."""
    goto_with_seed(page, "TEST01", "purple")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    # Verify rank defaulted to green by checking scene state
    rank = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        return s?.selectedRank;
    }""")
    assert rank == "green"


def test_shared_seed_uppercase_normalized(page: Page):
    """Seed codes are normalized to uppercase — 'abc123' and 'ABC123' produce the same seed."""
    goto_with_seed(page, "abc123", "red")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    seed_lower = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        return s?.sharedSeedNum;
    }""")
    assert seed_lower is not None and seed_lower > 0, f"Should decode lowercase seed, got: {seed_lower}"
    # Verify it matches what uppercase would decode to
    seed_upper = page.evaluate("""() => {
        const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = 0;
        for (const ch of 'ABC123') {
            const idx = BASE36.indexOf(ch);
            if (idx < 0) continue;
            result = result * 36 + idx;
        }
        return result >>> 0;
    }""")
    assert seed_lower == seed_upper, f"Lowercase seed {seed_lower} should equal uppercase {seed_upper}"


def test_shared_seed_no_seed_param_goes_to_menu(page: Page):
    """Without seed param, game starts normally at MenuScene."""
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(f"{GAME_URL}?rank=blue")
    wait_for_scene(page, "MenuScene", timeout=15000)


# --- Locked State (campaign incomplete) ---

def test_shared_seed_locked_shows_preview(page: Page):
    """Shared seed on locked account shows level preview with seed code."""
    goto_with_seed(page, "17UK8P6", "black")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    # Should show the seed code in brackets and a lock message
    texts = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        if (!s) return [];
        return s.children.list
            .filter(c => c.type === 'Text')
            .map(c => c.text);
    }""")
    text_blob = ' '.join(texts)
    assert '🔒' in text_blob, "Should show lock icon"
    assert '[' in text_blob, "Should show seed code in brackets"


def test_shared_seed_locked_escape_goes_back(page: Page):
    """Escape on locked shared seed view returns to MenuScene."""
    goto_with_seed(page, "ABC123")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    page.keyboard.press("Escape")
    wait_for_scene(page, "MenuScene")


# --- Unlocked State (campaign complete) ---

def test_shared_seed_unlocked_shows_play_button(page: Page):
    """Shared seed with unlocked campaign shows 'Play Shared Seed' button."""
    # First: unlock, then reload with seed params
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)
    # Now navigate with a seed that differs from today's daily
    # Use a fixed seed that's unlikely to match today's daily
    page.goto(f"{GAME_URL}?seed=ZZZZZ&rank=red")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    wait_for_scene_ready(page, "DailyRunsScene")
    # Check for shared seed button
    has_shared_btn = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        if (!s) return false;
        return s.children.list.some(c => c.getData && c.getData('key') === 'playSharedSeed');
    }""")
    assert has_shared_btn, "Should show 'Play Shared Seed' button"


def test_shared_seed_unlocked_sets_rank(page: Page):
    """Shared seed URL with rank=red selects red rank."""
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)
    page.goto(f"{GAME_URL}?seed=ZZZZZ&rank=red")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    wait_for_scene_ready(page, "DailyRunsScene")
    rank = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        return s?.selectedRank;
    }""")
    assert rank == "red"


def test_shared_seed_starts_game(page: Page):
    """Clicking shared seed button starts GameScene with the shared level."""
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)
    page.goto(f"{GAME_URL}?seed=ZZZZZ&rank=blue")
    wait_for_scene(page, "DailyRunsScene", timeout=15000)
    wait_for_scene_ready(page, "DailyRunsScene")
    # Activate the shared seed button (should be selected by default at index 1)
    page.keyboard.press("Enter")
    wait_for_scene(page, "GameScene", timeout=10000)
    # Verify it's a daily run session
    is_daily_run = page.evaluate("""() => {
        const mod = window.__dailyRunSession;
        // Try alternate access
        const gs = window.game?.scene?.getScene('GameScene');
        return gs?.level?.id >= 100;
    }""")
    assert is_daily_run, "Game should be running a daily run level (id >= 100)"


# --- Share Button ---

def test_share_button_copies_to_clipboard(page: Page):
    """Share button calls copyToClipboard with a valid share message."""
    setup_unlocked(page)
    navigate_to_daily_runs(page)
    wait_for_scene_ready(page, "DailyRunsScene")
    # Intercept clipboard write since Firefox doesn't support clipboard permissions
    page.evaluate("""() => {
        window.__clipboardText = null;
        const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = async (text) => {
            window.__clipboardText = text;
            return orig(text).catch(() => {}); // swallow permission errors
        };
    }""")
    click_daily_runs_button(page, 'share')
    page.wait_for_function("() => window.__clipboardText !== null", timeout=3000)
    clipboard = page.evaluate("() => window.__clipboardText")
    assert clipboard is not None, "Share button should have written to clipboard"
    assert "seed=" in clipboard, f"Should contain seed param, got: {clipboard}"
    assert "rank=" in clipboard, f"Should contain rank param, got: {clipboard}"


def test_share_button_shows_toast(page: Page):
    """Share button shows a 'Copied' toast notification."""
    setup_unlocked(page)
    navigate_to_daily_runs(page)
    wait_for_scene_ready(page, "DailyRunsScene")
    # Intercept clipboard to prevent permission errors blocking the toast
    page.evaluate("""() => {
        navigator.clipboard.writeText = async (text) => { return; };
    }""")
    click_daily_runs_button(page, 'share')
    # Wait for toast to appear (depth >= 200 = MENU_TOAST)
    has_toast = page.wait_for_function("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        if (!s) return false;
        return s.children.list.some(c => c.type === 'Text' && c.text && c.alpha > 0 &&
            c.depth >= 200);
    }""", timeout=3000)
    assert has_toast


# --- Seed Code Display ---

def test_seed_code_displayed_on_daily_runs(page: Page):
    """Seed code is visible in the daily runs briefing area."""
    setup_unlocked(page)
    navigate_to_daily_runs(page)
    wait_for_scene_ready(page, "DailyRunsScene")
    # Daily shift button should show seed code in brackets
    texts = page.evaluate("""() => {
        const s = window.game?.scene?.getScene('DailyRunsScene');
        return s?.children.list
            .filter(c => c.type === 'Text')
            .map(c => c.text) || [];
    }""")
    # Find a text containing [SEEDCODE] pattern on the daily shift button
    has_seed_bracket = any('[' in t and ']' in t for t in texts)
    assert has_seed_bracket, f"Should display seed code in brackets, texts: {texts}"


def test_seed_determinism_via_url(page: Page):
    """Same seed+rank always generates the same piste name."""
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)

    names = []
    for _ in range(2):
        page.goto(f"{GAME_URL}?seed=DETERM1&rank=blue")
        wait_for_scene(page, "DailyRunsScene", timeout=15000)
        wait_for_scene_ready(page, "DailyRunsScene")
        name = page.evaluate("""() => {
            const s = window.game?.scene?.getScene('DailyRunsScene');
            return s?.pisteNameDisplay?.text || '';
        }""")
        names.append(name)

    assert names[0] != "", "Piste name should not be empty"
    assert names[0] == names[1], f"Same seed should produce same name: {names[0]} vs {names[1]}"
