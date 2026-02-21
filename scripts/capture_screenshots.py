"""Capture 6 documentation screenshots + Open Graph image using Playwright.

Usage:
    python scripts/capture_screenshots.py --port 3001
    python scripts/capture_screenshots.py --port 3001 --only menu,og
"""
import argparse
import json
import time
from playwright.sync_api import sync_playwright

VP = {"width": 1280, "height": 720}
OG_VP = {"width": 1200, "height": 630}

# Full progress with currentLevel beyond LEVELS array so MenuScene uses randomMood
FULL_PROGRESS = json.dumps({
    "currentLevel": 99,
    "levelStats": {
        str(i): {"completed": True, "bestStars": 3, "bestTime": 120 + i * 20, "bestBonusMet": 2}
        for i in range(11)
    },
    "savedAt": "2026-02-21T08:00:00Z",
})

SETUP_JS = """(progress) => {
    localStorage.setItem('snowGroomer_progress', progress);
    localStorage.setItem('snowGroomer_tutorialDone', '1');
    localStorage.setItem('snowGroomer_prologueSeen', '1');
    localStorage.setItem('snowGroomer_audioMuted', 'true');
}"""


DISMISS_DIALOGUE_JS = """() => {
    const ds = window.game.scene.getScene('DialogueScene');
    if (ds && window.game.scene.isActive('DialogueScene')) ds.scene.stop();
}"""


def dismiss_dialogue(page):
    """Stop DialogueScene if active."""
    page.evaluate(DISMISS_DIALOGUE_JS)
    time.sleep(0.3)


def wait_scene(page, name, timeout=15000):
    page.wait_for_function(
        f"window.game?.scene?.isActive('{name}')", timeout=timeout)
    time.sleep(0.5)


def setup_page(context, url, extra_storage=None):
    """Create page with full progress and muted audio."""
    page = context.new_page()
    page.goto(url)
    page.evaluate(SETUP_JS, FULL_PROGRESS)
    if extra_storage:
        for k, v in extra_storage.items():
            page.evaluate(f"() => localStorage.setItem('{k}', '{v}')")
    page.reload()
    wait_scene(page, "MenuScene", timeout=20000)
    return page


def force_menu_weather(page, is_night, weather):
    """Restart MenuScene with specific weather mood."""
    page.evaluate(f"""() => {{
        const menu = window.game.scene.getScene('MenuScene');
        menu.pickRandomMenuMood = () => ({{ isNight: {str(is_night).lower()}, weather: '{weather}' }});
        menu.randomMood = null;
        menu.scene.restart();
    }}""")
    wait_scene(page, "MenuScene")


def capture_menu(context, url, assets):
    """Menu with night + light snow."""
    page = setup_page(context, url)
    force_menu_weather(page, True, "light_snow")
    time.sleep(5)  # let snow particles fill the screen
    page.screenshot(path=f"{assets}/screenshot-menu.png")
    print("✓ screenshot-menu.png")
    page.close()


def capture_og(context, url, public):
    """Open Graph image: light weather menu at 1200×630."""
    browser = context.browser
    og_context = browser.new_context(viewport=OG_VP, device_scale_factor=1)
    try:
        page = og_context.new_page()
        page.goto(url)
        page.evaluate(SETUP_JS, FULL_PROGRESS)
        page.reload()
        wait_scene(page, "MenuScene", timeout=20000)
        force_menu_weather(page, False, "clear")
        time.sleep(3)
        page.screenshot(path=f"{public}/og-image.png")
        print("✓ og-image.png")
        page.close()
    finally:
        og_context.close()


def capture_trail_map(context, url, assets):
    """Trail map (LevelSelectScene)."""
    page = setup_page(context, url)
    page.evaluate("""() => {
        window.game.scene.stop('MenuScene');
        window.game.scene.start('LevelSelectScene');
    }""")
    wait_scene(page, "LevelSelectScene")
    time.sleep(2)
    page.screenshot(path=f"{assets}/screenshot-trailmap.png")
    print("✓ screenshot-trailmap.png")
    page.close()


def capture_daily_runs(context, url, assets):
    """Daily Runs scene."""
    page = setup_page(context, url)
    page.evaluate("""() => {
        window.game.scene.stop('MenuScene');
        window.game.scene.start('DailyRunsScene');
    }""")
    wait_scene(page, "DailyRunsScene")
    time.sleep(2)
    page.screenshot(path=f"{assets}/screenshot-dailyruns.png")
    print("✓ screenshot-dailyruns.png")
    page.close()


def capture_gameplay(context, url, assets):
    """Groomer mid-piste with natural zigzag grooming pattern."""
    page = setup_page(context, url)
    # Use level 2 (blue piste — clean terrain, good visual contrast)
    page.evaluate("""() => {
        window.game.scene.stop('MenuScene');
        window.game.scene.start('GameScene', { level: 2 });
    }""")
    wait_scene(page, "GameScene")
    time.sleep(1.5)

    dismiss_dialogue(page)

    # Simulate natural top-down grooming — 3 completed passes + groomer on 4th
    page.evaluate("""() => {
        const gs = window.game.scene.getScene('GameScene');
        const ts = gs.tileSize;
        const midY = Math.floor(gs.level.height * 0.50);
        const texKey = 'snow_groomed' + gs.nightSfx;

        // Find groomable left/right bounds per row
        const bounds = [];
        for (let y = 0; y < gs.level.height; y++) {
            let minX = gs.level.width, maxX = 0;
            for (let x = 0; x < gs.level.width; x++) {
                if (gs.snowGrid[y]?.[x]?.groomable) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
            }
            bounds.push(minX < maxX ? { left: minX, right: maxX } : null);
        }

        // 3 completed passes (full height) + 4th pass in progress (to midY)
        // Passes are adjacent like real grooming — side by side from the left
        const stripHalf = 2;
        const stripWidth = stripHalf * 2 + 1; // 5 tiles
        const gap = 1; // 1-tile gap between passes
        const stride = stripWidth + gap; // 6 tiles per pass

        // Smooth driving paths using layered sine waves
        const driftParams = [
            { a1: 1.0, f1: 0.045, a2: 0.5, f2: 0.12, phase: 0 },
            { a1: 0.8, f1: 0.055, a2: 0.4, f2: 0.14, phase: 1.4 },
            { a1: 1.1, f1: 0.04,  a2: 0.6, f2: 0.10, phase: 2.8 },
            { a1: 0.9, f1: 0.05,  a2: 0.5, f2: 0.13, phase: 4.0 },
        ];

        function groomPass(passIndex, startFrac, endY) {
            const dp = driftParams[passIndex];
            let lastCx = 0;
            for (let y = 0; y < endY; y++) {
                const b = bounds[y];
                if (!b) continue;
                const pisteW = b.right - b.left;
                if (pisteW < 8) continue;

                const drift = dp.a1 * Math.sin(y * dp.f1 + dp.phase)
                             + dp.a2 * Math.sin(y * dp.f2 + dp.phase + 0.7);
                lastCx = Math.round(b.left + startFrac * pisteW + drift);

                for (let x = lastCx - stripHalf; x <= lastCx + stripHalf; x++) {
                    const cell = gs.snowGrid[y]?.[x];
                    if (!cell?.groomable || cell.groomed) continue;
                    cell.groomed = true;
                    cell.quality = 0.8;
                    gs.groomedCount++;
                    gs.stampPisteTile(texKey, x, y);
                }
            }
            return lastCx; // last center tile X
        }

        // Compute starting fractions: start from left edge of piste
        const sampleB = bounds[Math.floor(midY / 2)];
        const medianW = sampleB ? sampleB.right - sampleB.left : 25;
        const strideFrac = stride / medianW;
        const startAt = 0.08;

        // 3 full passes + 4th partial (groomer is here)
        groomPass(0, startAt, gs.level.height);
        groomPass(1, startAt + strideFrac, gs.level.height);
        groomPass(2, startAt + strideFrac * 2, gs.level.height);
        const pass4LastX = groomPass(3, startAt + strideFrac * 3, midY);

        // Position groomer exactly at the tip of the 4th pass
        gs.groomer.setPosition(pass4LastX * ts, (midY - 1) * ts);

        // Set HUD values consistent with a mostly-completed level
        gs.fuel = 45;
        gs.fuelUsed = 55;
        gs.stamina = 60;
        gs.timeRemaining = Math.max(90, gs.level.timeLimit * 0.5);

        // Center camera on piste
        const mb = bounds[midY];
        if (mb) {
            const pisteCenterX = Math.round((mb.left + mb.right) / 2) * ts;
            gs.cameras.main.centerOn(pisteCenterX, midY * ts);
        }
    }""")
    time.sleep(0.3)

    page.screenshot(path=f"{assets}/screenshot-gameplay.png")
    print("✓ screenshot-gameplay.png")
    page.close()


def capture_level_complete(context, url, assets):
    """Win screen with realistic stats."""
    page = setup_page(context, url)
    page.evaluate("""() => {
        window.game.scene.stop('MenuScene');
        window.game.scene.start('GameScene', { level: 5 });
    }""")
    wait_scene(page, "GameScene")
    time.sleep(1)

    dismiss_dialogue(page)

    page.evaluate("""() => {
        const gs = window.game.scene.getScene('GameScene');
        const texKey = 'snow_groomed' + gs.nightSfx;
        for (let y = 0; y < gs.level.height; y++) {
            for (let x = 0; x < gs.level.width; x++) {
                const cell = gs.snowGrid[y]?.[x];
                if (cell?.groomable && !cell.groomed && Math.random() < 0.92) {
                    cell.groomed = true;
                    cell.quality = 0.8;
                    gs.groomedCount++;
                    gs.stampPisteTile(texKey, x, y);
                }
            }
        }
        gs.timeRemaining = gs.level.timeLimit - 245;
        gs.fuelUsed = 40;
        gs.gameOver(true);
    }""")
    wait_scene(page, "LevelCompleteScene")
    time.sleep(2)
    page.screenshot(path=f"{assets}/screenshot-level.png")
    print("✓ screenshot-level.png")
    page.close()


def capture_ski_trick(context, url, assets):
    """Ski trick on park kicker."""
    page = setup_page(context, url, extra_storage={"snowGroomer_skiMode": "ski"})
    page.evaluate("""() => {
        window.game.scene.stop('MenuScene');
        window.game.scene.start('GameScene', { level: 3 });
    }""")
    wait_scene(page, "GameScene")
    time.sleep(1)

    page.keyboard.press("k")
    wait_scene(page, "SkiRunScene", timeout=10000)
    time.sleep(1.5)

    page.evaluate("""() => {
        const ski = window.game.scene.getScene('SkiRunScene');
        // parkFeatures.featureGroup is a Phaser Group, not an array
        let kicker = null;
        const fg = ski.parkFeatures?.featureGroup;
        if (fg) {
            for (const child of fg.getChildren()) {
                if (child.texture?.key === 'park_kicker') { kicker = child; break; }
            }
        }
        const origRandom = Math.random;
        let callCount = 0;
        Math.random = function() {
            callCount++;
            if (callCount === 1) return 0.3;
            return origRandom();
        };
        setTimeout(() => { Math.random = origRandom; }, 2000);
        if (kicker) {
            ski.skier.setPosition(kicker.x, kicker.y - 10);
        } else {
            ski.skier.setPosition(ski.skier.x, ski.skier.y + 200);
        }
        ski.currentSpeed = 25;
    }""")

    page.keyboard.down("ArrowDown")
    time.sleep(0.3)

    trick_active = False
    for _ in range(20):
        trick_active = page.evaluate("""() => {
            const ski = window.game.scene.getScene('SkiRunScene');
            return ski.trickActive === true;
        }""")
        if trick_active:
            break
        time.sleep(0.1)
    page.keyboard.up("ArrowDown")

    if trick_active:
        page.evaluate("""() => {
            const ski = window.game.scene.getScene('SkiRunScene');
            ski.scene.pause();
            const ts = ski.tileSize || 16;
            const baseScale = ski.skier.scaleX;
            ski.skier.y -= ts * 1.5;
            ski.skier.setScale(baseScale * 1.5);
            ski.skier.setAngle(430);
            ski.skier.setDepth(150);
            if (ski.trickText) {
                ski.trickText.setAlpha(1);
                ski.trickText.setDepth(200);
                ski.trickText.setPosition(ski.skier.x, ski.skier.y - 40);
            }
        }""")
        time.sleep(0.3)
    else:
        print("  ⚠ trick didn't trigger, capturing anyway")
        time.sleep(0.5)

    page.screenshot(path=f"{assets}/screenshot-ski.png")
    print("✓ screenshot-ski.png")
    page.close()


ALL_CAPTURES = {
    "menu": capture_menu,
    "trailmap": capture_trail_map,
    "dailyruns": capture_daily_runs,
    "gameplay": capture_gameplay,
    "level": capture_level_complete,
    "ski": capture_ski_trick,
}


def main():
    parser = argparse.ArgumentParser(description="Capture documentation screenshots")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--only", help="Comma-separated list: menu,trailmap,dailyruns,gameplay,level,ski,og")
    args = parser.parse_args()

    import os
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets = os.path.join(root, "assets")
    public = os.path.join(root, "public")
    url = f"http://localhost:{args.port}/"

    targets = args.only.split(",") if args.only else list(ALL_CAPTURES.keys()) + ["og"]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport=VP, device_scale_factor=1)
        try:
            for name in targets:
                if name == "og":
                    capture_og(context, url, public)
                elif name in ALL_CAPTURES:
                    ALL_CAPTURES[name](context, url, assets)
                else:
                    print(f"⚠ Unknown target: {name}")
        finally:
            context.close()
            browser.close()

    print(f"\n✅ {len(targets)} screenshot(s) captured!")


if __name__ == "__main__":
    main()
