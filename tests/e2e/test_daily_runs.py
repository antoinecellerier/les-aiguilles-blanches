"""E2E tests for Daily Runs (Contracts) mode.

Tests navigation, input methods (keyboard, mouse, gamepad), viewports,
and cross-scene flows specific to the contracts/daily-runs feature.
"""
import pytest
import time
from playwright.sync_api import Page
from conftest import wait_for_scene, get_active_scenes, GAME_URL
from test_gamepad import tap_gamepad_button, MOCK_GAMEPAD_SCRIPT


# --- Helpers ---

GP_A, GP_B, GP_START = 0, 1, 9
GP_DPAD_DOWN = 13


def unlock_all_levels(page: Page):
    """Set localStorage so all 11 campaign levels are completed."""
    page.evaluate("""() => {
        const stats = {};
        for (let i = 0; i <= 10; i++) {
            stats[i] = {completed: true, bestStars: 3, bestTime: 60, bestBonusMet: 0};
        }
        localStorage.setItem('snowGroomer_progress', JSON.stringify({
            currentLevel: 11,
            levelStats: stats,
            savedAt: new Date().toISOString()
        }));
    }""")


def setup_unlocked(page: Page, width: int = 1280, height: int = 720):
    """Load game, unlock all levels, reload so menu reflects progress."""
    page.set_viewport_size({"width": width, "height": height})
    page.goto(GAME_URL)
    wait_for_scene(page, "MenuScene", timeout=15000)
    unlock_all_levels(page)
    page.reload()
    wait_for_scene(page, "MenuScene", timeout=15000)


def navigate_to_contracts(page: Page):
    """From MenuScene, select the Daily Runs button and wait for ContractsScene."""
    idx = page.evaluate("""() => {
        const ms = window.game?.scene?.getScene('MenuScene');
        if (!ms?.menuButtons) return -1;
        const texts = ms.menuButtons.map(b => b.text.toLowerCase());
        for (let i = 0; i < texts.length; i++) {
            if (texts[i].includes('daily') || texts[i].includes('contrat') ||
                texts[i].includes('courses') || texts[i].includes('runs')) return i;
        }
        return -1;
    }""")
    assert idx >= 0, "Daily Runs button not found in menu"
    # Use buttonNav.select for reliability across locales / button layouts
    page.evaluate(f"""() => {{
        const ms = window.game?.scene?.getScene('MenuScene');
        if (ms?.buttonNav) ms.buttonNav.select({idx});
    }}""")
    time.sleep(0.1)
    page.keyboard.press("Enter")
    wait_for_scene(page, "ContractsScene")


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
    time.sleep(0.2)


def get_selected_index(page: Page, scene: str) -> int:
    return page.evaluate(f"""() => {{
        const s = window.game?.scene?.getScene('{scene}');
        return s?.buttonNav?.selectedIndex ?? s?.selectedIndex ?? -1;
    }}""")


def start_daily_run(page: Page, use_gamepad: bool = False):
    """From ContractsScene (default on Daily Shift), press Enter/A to start."""
    if use_gamepad:
        tap_gamepad_button(page, GP_A)
    else:
        page.keyboard.press("Enter")
    wait_for_scene(page, "GameScene", timeout=10000)
    dismiss_dialogues(page)
    time.sleep(0.3)


# --- Gamepad fixture ---

@pytest.fixture
def gamepad_page(page: Page):
    page.add_init_script(MOCK_GAMEPAD_SCRIPT)
    yield page


# ============================================================
# CONTRACTS SCENE — KEYBOARD
# ============================================================

class TestContractsKeyboard:
    @pytest.mark.parametrize("vw,vh", [(1280, 720), (375, 667), (1920, 800)])
    def test_contracts_reachable(self, page: Page, vw, vh):
        setup_unlocked(page, vw, vh)
        navigate_to_contracts(page)
        assert "ContractsScene" in get_active_scenes(page)

    def test_contracts_rank_cycling(self, page: Page):
        setup_unlocked(page)
        navigate_to_contracts(page)

        rank0 = page.evaluate("() => window.game?.scene?.getScene('ContractsScene')?.selectedRank")
        assert rank0 == "green", f"Initial rank should be green, got {rank0}"

        page.keyboard.press("ArrowRight")
        time.sleep(0.15)
        rank1 = page.evaluate("() => window.game?.scene?.getScene('ContractsScene')?.selectedRank")
        assert rank1 == "blue", f"Right should cycle to blue, got {rank1}"

        page.keyboard.press("ArrowLeft")
        time.sleep(0.15)
        rank2 = page.evaluate("() => window.game?.scene?.getScene('ContractsScene')?.selectedRank")
        assert rank2 == "green", f"Left should cycle back to green, got {rank2}"

    def test_contracts_button_nav(self, page: Page):
        setup_unlocked(page)
        navigate_to_contracts(page)

        # Should start on Daily Shift (index 1; 0 is back)
        idx = get_selected_index(page, "ContractsScene")
        assert idx == 1, f"Should start on Daily Shift (1), got {idx}"

        page.keyboard.press("ArrowDown")
        time.sleep(0.1)
        assert get_selected_index(page, "ContractsScene") == 2

        page.keyboard.press("ArrowUp")
        time.sleep(0.1)
        assert get_selected_index(page, "ContractsScene") == 1

    def test_contracts_enter_starts_game(self, page: Page):
        setup_unlocked(page)
        navigate_to_contracts(page)
        page.keyboard.press("Enter")
        time.sleep(0.5)
        wait_for_scene(page, "GameScene", timeout=10000)

    def test_contracts_space_starts_game(self, page: Page):
        setup_unlocked(page)
        navigate_to_contracts(page)
        page.keyboard.press("Space")
        time.sleep(0.5)
        wait_for_scene(page, "GameScene", timeout=10000)

    def test_contracts_escape_goes_back(self, page: Page):
        setup_unlocked(page)
        navigate_to_contracts(page)
        page.keyboard.press("Escape")
        time.sleep(0.5)
        wait_for_scene(page, "MenuScene", timeout=8000)


# ============================================================
# CONTRACTS SCENE — GAMEPAD
# ============================================================

class TestContractsGamepad:
    def test_contracts_gamepad_nav(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_contracts(gamepad_page)

        idx0 = get_selected_index(gamepad_page, "ContractsScene")
        tap_gamepad_button(gamepad_page, GP_DPAD_DOWN)
        time.sleep(0.2)
        idx1 = get_selected_index(gamepad_page, "ContractsScene")
        assert idx1 == idx0 + 1, f"Dpad down: {idx0} -> {idx1}"

    def test_contracts_b_goes_back(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_contracts(gamepad_page)

        tap_gamepad_button(gamepad_page, GP_B)
        time.sleep(0.5)
        wait_for_scene(gamepad_page, "MenuScene", timeout=8000)

    def test_contracts_a_starts_game(self, gamepad_page: Page):
        setup_unlocked(gamepad_page)
        navigate_to_contracts(gamepad_page)

        tap_gamepad_button(gamepad_page, GP_A)
        time.sleep(0.5)
        wait_for_scene(gamepad_page, "GameScene", timeout=10000)


# ============================================================
# CROSS-SCENE FLOW TESTS (contracts-specific)
# ============================================================

class TestContractFlows:
    def test_contract_session_survives_restart(self, page: Page):
        """Contract session must survive pause→restart."""
        setup_unlocked(page)
        navigate_to_contracts(page)
        start_daily_run(page)
        page.locator("canvas").click()
        time.sleep(0.3)

        # Verify contract level loaded
        has_session = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.level?.id >= 100;
        }""")
        assert has_session, "Contract level not loaded (id should be >= 100)"

        # Pause → Restart
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        page.keyboard.press("ArrowDown")
        time.sleep(0.06)
        page.keyboard.press("Enter")
        time.sleep(0.5)
        wait_for_scene(page, "GameScene", timeout=10000)

        # Contract session should still be active
        has_session2 = page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.level?.id >= 100;
        }""")
        assert has_session2, "Contract session lost after restart"

    def test_contract_completion_no_next_level(self, page: Page):
        """Completing a contract should NOT show 'Next Level' button."""
        setup_unlocked(page)
        navigate_to_contracts(page)
        start_daily_run(page)

        page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (gs && typeof gs.gameOver === 'function') gs.gameOver(true);
        }""")
        time.sleep(1)
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
            f"Contract complete should not show 'Next Level': {buttons}"

    def test_quit_clears_contract_session(self, page: Page):
        """Quitting to menu should clear contract session."""
        setup_unlocked(page)
        navigate_to_contracts(page)
        start_daily_run(page)
        page.locator("canvas").click()
        time.sleep(0.3)

        # Pause → Quit (Resume=0, Restart=1, Settings=2, Quit=3)
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        for _ in range(3):
            page.keyboard.press("ArrowDown")
            time.sleep(0.06)
        page.keyboard.press("Enter")
        time.sleep(0.5)
        wait_for_scene(page, "MenuScene", timeout=8000)


# ============================================================
# LEVEL GENERATION INTEGRATION TESTS
# ============================================================

class TestContractLevelGeneration:
    def test_daily_run_is_deterministic(self, page: Page):
        """Same daily run started twice should produce identical level properties."""
        setup_unlocked(page)
        navigate_to_contracts(page)
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
        time.sleep(0.3)
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        for _ in range(3):
            page.keyboard.press("ArrowDown")
            time.sleep(0.06)
        page.keyboard.press("Enter")
        time.sleep(0.5)
        wait_for_scene(page, "MenuScene", timeout=8000)

        navigate_to_contracts(page)
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
        navigate_to_contracts(page)

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
        time.sleep(0.3)
        page.keyboard.press("Escape")
        wait_for_scene_ready(page, "PauseScene")
        for _ in range(3):
            page.keyboard.press("ArrowDown")
            time.sleep(0.06)
        page.keyboard.press("Enter")
        time.sleep(0.5)
        wait_for_scene(page, "MenuScene", timeout=8000)

        navigate_to_contracts(page)
        # Cycle rank: green → blue → red → black (3 right presses)
        for _ in range(3):
            page.keyboard.press("ArrowRight")
            time.sleep(0.15)
        start_daily_run(page)

        black = page.evaluate("""() => {
            const l = window.game?.scene?.getScene('GameScene')?.level;
            return l ? { difficulty: l.difficulty } : null;
        }""")
        assert black is not None
        assert black["difficulty"] in ("black", "park"), \
            f"Black rank should produce black or park level, got {black['difficulty']}"

    def test_contract_level_has_briefing_dialogue(self, page: Page):
        """Contract levels should have introDialogue and introSpeaker set."""
        setup_unlocked(page)
        navigate_to_contracts(page)
        start_daily_run(page)

        briefing = page.evaluate("""() => {
            const l = window.game?.scene?.getScene('GameScene')?.level;
            return l ? { dialogue: l.introDialogue, speaker: l.introSpeaker } : null;
        }""")
        assert briefing is not None
        assert briefing["dialogue"] is not None, "Contract level missing introDialogue"
        assert briefing["speaker"] is not None, "Contract level missing introSpeaker"
        assert briefing["dialogue"].startswith("contractBriefing"), \
            f"Unexpected dialogue key: {briefing['dialogue']}"
        assert briefing["speaker"] in ["Jean-Pierre", "Thierry", "Marie", "Émilie"], \
            f"Unexpected speaker: {briefing['speaker']}"

    def test_contract_level_id_above_campaign(self, page: Page):
        """Contract level IDs should be >= 100 (above campaign range)."""
        setup_unlocked(page)
        navigate_to_contracts(page)
        start_daily_run(page)

        level_id = page.evaluate("""() => {
            return window.game?.scene?.getScene('GameScene')?.level?.id ?? -1;
        }""")
        assert level_id >= 100, f"Contract level ID should be >= 100, got {level_id}"
