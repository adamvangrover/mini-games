
import pytest
from playwright.sync_api import Page, expect

def test_allinhole_3d_loads(page: Page):
    # Navigate to the game
    page.goto("http://localhost:8000/allinhole.html")

    # Wait for the canvas to be present (Three.js creates a canvas)
    # The canvas is appended to body
    expect(page.locator("canvas").first).to_be_visible(timeout=10000)

    # Wait for Game Initialization
    page.wait_for_function("typeof window.gameInstance !== 'undefined'")

    # Check HUD
    expect(page.get_by_text("Treats: 0 / 5")).to_be_visible(timeout=10000)

    # Take a screenshot
    page.screenshot(path="verification/allinhole_3d.png")
