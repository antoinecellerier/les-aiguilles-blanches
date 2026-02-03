"""Pytest configuration for Playwright E2E tests."""
import os
import pytest

# Base URL for the game - can be overridden via environment variable
# Default: Vite dev server, fallback to legacy PHP server
GAME_URL = os.environ.get(
    "GAME_URL",
    "http://localhost:3000/index-vite.html"
)


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
