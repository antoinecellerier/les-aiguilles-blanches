"""E2E tests for Daily Runs mode.

Tests navigation, input methods (keyboard, mouse, gamepad), viewports,
and cross-scene flows specific to the daily runs feature.
"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page
from conftest import (
    wait_for_scene, get_active_scenes, GAME_URL, navigate_to_daily_runs,
    unlock_all_levels, click_menu_by_key,
)
from test_gamepad import tap_gamepad_button, MOCK_GAMEPAD_SCRIPT


# --- Helpers ---

GP_A, GP_B, GP_START = 0, 1, 9
GP_DPAD_DOWN = 13


def setup_unlocked(page: Page, width: int = 1280, height: int = 720):
    """Load game, unlock all levels, reload so menu reflects progress."""
    page.set_viewport_size({"width": width, "height": height})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)
    page.reload()
    wait_for_scene(page, "MenuScene", timeout=15000)


def wait_for_scene_ready(page: Page, scene: str, timeout: int = 8000):
    """Wait for scene to be active AND inputReady (if it has that guard)."""
    wait_for_scene(page, scene, timeout)
    page.wait_for_function(
        f"""() => {{
            const s = window.game?.scene?.getScene('{scene}');
            if (!s || !s.sys?.isActive()) return false;
            if ('inputReady' in s) return s.inputReady === true;
            return true;
        }}""",
        timeout=5000,
    )


def dismiss_dialogues(page: Page):
    """Suppress all current and future dialogues."""
    page.evaluate("""() => {
        const ds = window.game?.scene?.getScene('DialogueScene');
        if (!ds) return;
        if (ds.dialogueQueue) ds.dialogueQueue = [];
        if (ds.isDialogueShowing && ds.isDialogueShowing() && ds.hideDialogue) ds.hideDialogue();
        ds.showDialogue = function() {};
    }""")
    page.wait_for_function("""() => {
        const ds = window.game?.scene?.getScene('DialogueScene');
        return !ds || !ds.isDialogueShowing || !ds.isDialogueShowing();
    }""", timeout=3000)


def get_selected_index(page: Page, scene: str) -> int:
    return page.evaluate(f"""() => {{
        const s = window.game?.scene?.getScene('{scene}');
        return s?.buttonNav?.selectedIndex ?? s?.selectedIndex ?? -1;
    }}""")


def wait_for_selected_index(page: Page, scene: str, expected: int, timeout: int = 3000):
    page.wait_for_function(f"""() => {{
        const s = window.game?.scene?.getScene('{scene}');
        const idx = s?.buttonNav?.selectedIndex ?? s?.selectedIndex ?? -1;
        return idx === {expected};
    }}""", timeout=timeout)


def wait_for_rank(page: Page, expected: str, timeout: int = 3000):
    page.wait_for_function(f"""() => {{
        const s = window.game?.scene?.getScene('DailyRunsScene');
        return s?.selectedRank === '{expected}';
    }}""", timeout=timeout)


def start_daily_run(page: Page, use_gamepad: bool = False):
    """From DailyRunsScene (default on Daily Shift), press Enter/A to start."""
    if use_gamepad:
        tap_gamepad_button(page, GP_A)
    else:
        page.keyboard.press("Enter")
    wait_for_scene(page, "GameScene", timeout=10000)
    dismiss_dialogues(page)


# --- Gamepad fixture ---


@pytest.fixture(autouse=True)
def skip_prologue():
    """Override global autouse fixture; this module sets init script on context."""
    return


@pytest.fixture(scope="module")
def module_context(browser: Browser) -> BrowserContext:
    """Reuse one context for Daily Runs module to reduce setup overhead."""
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script("localStorage.setItem('snowGroomer_prologueSeen', '1');")
    yield context
    context.close()


@pytest.fixture
def page(module_context: BrowserContext):
    """Fresh page per test from a shared context."""
    p = module_context.new_page()
    yield p
    p.evaluate("""() => { try { localStorage.clear(); } catch (_) {} }""")
    p.close()


@pytest.fixture
def gamepad_page(page: Page):
    page.add_init_script(MOCK_GAMEPAD_SCRIPT)
    yield page


# ============================================================
# DAILY RUNS SCENE — KEYBOARD
# ============================================================

class TestDailyRunsKeyboard:
    @pytest.mark.parametrize("vw,vh", [(1280, 720), (375, 667), (1920, 800)])
    def test_daily_runs_reachable(self, page: Page, vw, vh):
        setup_unlocked(page, vw, vh)
        navigate_to_daily_runs(page)
        assert "DailyRunsScene" in get_active_scenes(page)

    def test_daily_runs_rank_cycling(self, page: Page):
        setup_unlocked(page)
        navigate_to_daily_runs(page)

        rank0 = page.evaluate("() => window.game?.scene?.getScene('DailyRunsScene')?.selectedRank")
        assert rank0 == "green", f"Initial rank should be green, got {rank0}"

        page.keyboard.press("ArrowRight")
        wait_for_rank(page, "blue")
        rank1 = page.evaluate("() => window.game?.scene?.getScene('DailyRunsScene')?.selectedRank")
        assert rank1 == "blue", f"Right should cycle to blue, got {rank1}"

        page.keyboard.press("ArrowLeft")
        wait_for_rank(page, "green")
        rank2 = page.evaluate("() => window.game?.scene?.getScene('DailyRunsScene')?.selectedRank")
        assert rank2 == "green", f"Left should cycle back to green, got {rank2}"

    def test_daily_runs_button_nav(self, page: Page):
        setup_unlocked(page)
        navigate_to_daily_runs(page)

        # Should start on Daily Shift (index 1; 0 is back)
        idx = get_selected_index(page, "DailyRunsScene")
        assert idx == 1, f"Should start on Daily Shift (1), got {idx}"

        page.keyboard.press("ArrowDown")
        wait_for_selected_index(page, "DailyRunsScene", 2)
        assert get_selected_index(page, "DailyRunsScene") == 2

        page.keyboard.press("ArrowUp")
        wait_for_selected_index(page, "DailyRunsScene", 1)
        assert get_selected_index(page, "DailyRunsScene") == 1

    def test_daily_runs_enter_starts_game(self, page: Page):
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        page.keyboard.press("Enter")
        wait_for_scene(page, "GameScene", timeout=10000)

    def test_daily_runs_space_starts_game(self, page: Page):
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        page.keyboard.press("Space")
        wait_for_scene(page, "GameScene", timeout=10000)

    def test_daily_runs_escape_goes_back(self, page: Page):
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        page.keyboard.press("Escape")
        wait_for_scene(page, "MenuScene", timeout=8000)


# ============================================================
# DAILY RUNS SCENE — GAMEPAD
# ============================================================

class TestDailyRunsGamepad:
    def test_daily_runs_gamepad_nav(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_daily_runs(gamepad_page)

        idx0 = get_selected_index(gamepad_page, "DailyRunsScene")
        tap_gamepad_button(gamepad_page, GP_DPAD_DOWN)
        wait_for_selected_index(gamepad_page, "DailyRunsScene", idx0 + 1)
        idx1 = get_selected_index(gamepad_page, "DailyRunsScene")
        assert idx1 == idx0 + 1, f"Dpad down: {idx0} -> {idx1}"

    def test_daily_runs_b_goes_back(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_daily_runs(gamepad_page)

        tap_gamepad_button(gamepad_page, GP_B)
        wait_for_scene(gamepad_page, "MenuScene", timeout=8000)

    def test_daily_runs_a_starts_game(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_daily_runs(gamepad_page)

        tap_gamepad_button(gamepad_page, GP_A)
        wait_for_scene(gamepad_page, "GameScene", timeout=10000)


# ============================================================
# CROSS-SCENE FLOW TESTS (daily-run-specific)
# ============================================================

class TestDailyRunFlows:
    def test_daily_run_session_survives_restart(self, page: Page):
        """Daily run session must survive pause→restart."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)
        page.locator("canvas").click()

        # Verify daily run level loaded
        has_session = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.level?.id >= 100;
        }""")
        assert has_session, "Daily run level not loaded (id should be >= 100)"

        # Pause → Restart
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        click_menu_by_key(page, 'restart', 'PauseScene')
        wait_for_scene(page, "GameScene", timeout=10000)

        # Daily run session should still be active
        has_session2 = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.level?.id >= 100;
        }""")
        assert has_session2, "Daily run session lost after restart"

    def test_daily_run_completion_no_next_level(self, page: Page):
        """Completing a daily run should NOT show 'Next Level' button."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)

        page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (gs && typeof gs.gameOver === 'function') gs.gameOver(true);
        }""")
        wait_for_scene(page, "LevelCompleteScene", timeout=10000)

        buttons = page.evaluate("""() => {
            const lc = window.game?.scene?.getScene('LevelCompleteScene');
            if (!lc) return [];
            const texts = [];
            lc.children.list.forEach(c => {
                if (c.type === 'Container') {
                    c.list?.forEach(child => {
                        if (child.type === 'Text' && child.input?.enabled)
                            texts.push(child.text.toLowerCase());
                    });
                }
            });
            return texts;
        }""")
        combined = " ".join(buttons)
        assert "next" not in combined or "level" not in combined, \
            f"Daily run complete should not show 'Next Level': {buttons}"

    def test_quit_clears_daily_run_session(self, page: Page):
        """Quitting from pause should return to DailyRunsScene."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)
        page.locator("canvas").click()

        # Pause → Quit
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        click_menu_by_key(page, 'quit', 'PauseScene')
        wait_for_scene(page, "DailyRunsScene", timeout=8000)


# ============================================================
# LEVEL GENERATION INTEGRATION TESTS
# ============================================================

class TestDailyRunLevelGeneration:
    def test_daily_run_is_deterministic(self, page: Page):
        """Same daily run started twice should produce identical level properties."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)

        props1 = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const l = gs?.level;
            if (!l) return null;
            return { id: l.id, width: l.width, height: l.height,
                     targetCoverage: l.targetCoverage, timeLimit: l.timeLimit,
                     weather: l.weather, isNight: l.isNight, hasWinch: l.hasWinch };
        }""")
        assert props1 is not None, "Level not loaded"

        # Quit and restart same daily run
        page.locator("canvas").click()
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        click_menu_by_key(page, 'quit', 'PauseScene')
        wait_for_scene(page, "DailyRunsScene", timeout=8000)

        start_daily_run(page)

        props2 = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const l = gs?.level;
            if (!l) return null;
            return { id: l.id, width: l.width, height: l.height,
                     targetCoverage: l.targetCoverage, timeLimit: l.timeLimit,
                     weather: l.weather, isNight: l.isNight, hasWinch: l.hasWinch };
        }""")
        assert props1 == props2, f"Daily run not deterministic:\n  run1={props1}\n  run2={props2}"

    def test_rank_affects_difficulty(self, page: Page):
        """Changing rank selector should change the generated level difficulty."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)

        # Start green run
        start_daily_run(page)
        green = page.evaluate("""() => {
            const l = window.game?.scene?.getScene('GameScene')?.level;
            return l ? { difficulty: l.difficulty } : null;
        }""")
        assert green is not None
        assert green["difficulty"] in ("green", "park"), \
            f"Green rank should produce green or park level, got {green['difficulty']}"

        # Quit, go back, switch to black rank, start
        page.locator("canvas").click()
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        click_menu_by_key(page, 'quit', 'PauseScene')
        wait_for_scene(page, "DailyRunsScene", timeout=8000)

        # Cycle rank: green → blue → red → black (3 right presses)
        for expected_rank in ("blue", "red", "black"):
            page.keyboard.press("ArrowRight")
            wait_for_rank(page, expected_rank)
        start_daily_run(page)

        black = page.evaluate("""() => {
            const l = window.game?.scene?.getScene('GameScene')?.level;
            return l ? { difficulty: l.difficulty } : null;
        }""")
        assert black is not None
        assert black["difficulty"] in ("black", "park"), \
            f"Black rank should produce black or park level, got {black['difficulty']}"

    def test_daily_run_level_has_briefing_dialogue(self, page: Page):
        """Daily run levels should have introDialogue and introSpeaker set."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)

        briefing = page.evaluate("""() => {
            const l = window.game?.scene?.getScene('GameScene')?.level;
            return l ? { dialogue: l.introDialogue, speaker: l.introSpeaker } : null;
        }""")
        assert briefing is not None
        assert briefing["dialogue"] is not None, "Daily run level missing introDialogue"
        assert briefing["speaker"] is not None, "Daily run level missing introSpeaker"
        assert briefing["dialogue"].startswith("dailyRunBriefing"), \
            f"Unexpected dialogue key: {briefing['dialogue']}"
        assert briefing["speaker"] in ["Jean-Pierre", "Thierry", "Marie", "Émilie"], \
            f"Unexpected speaker: {briefing['speaker']}"

    def test_daily_run_level_id_above_campaign(self, page: Page):
        """Daily run level IDs should be >= 100 (above campaign range)."""
        setup_unlocked(page)
        navigate_to_daily_runs(page)
        start_daily_run(page)

        level_id = page.evaluate("""() => {
            return window.game?.scene?.getScene('GameScene')?.level?.id ?? -1;
        }""")
        assert level_id >= 100, f"Daily run level ID should be >= 100, got {level_id}"
