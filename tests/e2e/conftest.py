"""Pytest configuration for Playwright E2E tests."""
import pytest

# Base URL for the game
GAME_URL = "http://localhost/~antoine/snow-groomer/index.html"


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context for game testing."""
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
    }


@pytest.fixture
def game_page(page):
    """Navigate to the game and wait for Phaser to initialize."""
    page.goto(GAME_URL)
    # Wait for Phaser game canvas to be ready
    page.wait_for_selector("canvas", timeout=10000)
    # Wait a bit for assets to load
    page.wait_for_timeout(2000)
    return page
