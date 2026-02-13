"""Performance profiling tests — measure object counts and FPS across levels."""
import pytest
from conftest import (
    wait_for_scene, skip_to_level, dismiss_dialogues,
    click_menu_button, BUTTON_START,
)


def get_perf_stats(page) -> dict:
    """Read __perfStats from window."""
    return page.evaluate("""() => {
        const s = window.__perfStats;
        if (!s) return null;
        return {
            totalObjects: s.totalObjects,
            graphicsCount: s.graphicsCount,
            imageCount: s.imageCount,
            textCount: s.textCount,
            tilespriteCount: s.tilespriteCount,
            fps: s.fps,
            level: s.level,
        };
    }""")


def measure_fps_over_time(page, duration_ms: int = 3000, samples: int = 6) -> list:
    """Sample FPS multiple times over a duration."""
    interval = duration_ms // samples
    readings = []
    for _ in range(samples):
        page.wait_for_timeout(interval)
        stats = get_perf_stats(page)
        if stats:
            readings.append(stats['fps'])
    return readings


def test_baseline_object_counts(game_page):
    """Capture baseline object counts for L0 (tutorial) and L9 (storm).
    
    This test documents current performance — it does not assert specific
    targets. Run before and after optimizations to measure improvement.
    """
    page = game_page

    # Start game → L0 (tutorial)
    click_menu_button(page, BUTTON_START, "Start")
    wait_for_scene(page, 'GameScene', timeout=10000)
    dismiss_dialogues(page)
    page.wait_for_timeout(1000)  # let scene settle

    stats_l0 = get_perf_stats(page)
    assert stats_l0 is not None, "__perfStats not exposed on window"
    assert stats_l0['level'] == 0

    fps_l0 = measure_fps_over_time(page, 3000, 6)

    # Skip to L9 (Tempête — storm, most objects)
    skip_to_level(page, 9, timeout=15000)
    dismiss_dialogues(page)
    page.wait_for_timeout(1500)  # let scene settle

    stats_l9 = get_perf_stats(page)
    assert stats_l9 is not None
    assert stats_l9['level'] == 9

    fps_l9 = measure_fps_over_time(page, 3000, 6)

    # Print baseline report
    print("\n" + "=" * 60)
    print("PERFORMANCE BASELINE REPORT")
    print("=" * 60)

    for label, stats, fps in [("L0 Tutorial", stats_l0, fps_l0),
                               ("L9 Tempête", stats_l9, fps_l9)]:
        print(f"\n--- {label} ---")
        print(f"  Total objects:  {stats['totalObjects']}")
        print(f"  Graphics:       {stats['graphicsCount']}")
        print(f"  Images:         {stats['imageCount']}")
        print(f"  Text:           {stats['textCount']}")
        print(f"  TileSprites:    {stats['tilespriteCount']}")
        print(f"  FPS samples:    {fps}")
        print(f"  FPS avg:        {sum(fps) / len(fps):.0f}")
        print(f"  FPS min:        {min(fps)}")

    print("\n" + "=" * 60)

    # Sanity checks — L9 should have more objects than L0
    assert stats_l9['totalObjects'] > stats_l0['totalObjects'], \
        f"L9 ({stats_l9['totalObjects']}) should have more objects than L0 ({stats_l0['totalObjects']})"


def test_object_count_stability(game_page):
    """Verify object count doesn't grow over time (leak detection)."""
    page = game_page

    click_menu_button(page, BUTTON_START, "Start")
    wait_for_scene(page, 'GameScene', timeout=10000)
    dismiss_dialogues(page)

    # Skip to L9 for maximum stress
    skip_to_level(page, 9, timeout=15000)
    dismiss_dialogues(page)
    page.wait_for_timeout(1000)

    initial = get_perf_stats(page)
    assert initial is not None

    # Wait and re-measure
    page.wait_for_timeout(5000)
    after = get_perf_stats(page)
    assert after is not None

    growth = after['totalObjects'] - initial['totalObjects']
    print(f"\nObject count: {initial['totalObjects']} → {after['totalObjects']} (growth: {growth})")

    # Allow small growth (e.g. weather particles) but flag large leaks
    assert growth < 50, \
        f"Object count grew by {growth} in 5 seconds — possible leak"
