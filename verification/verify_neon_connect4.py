
import sys
import os
from playwright.sync_api import sync_playwright
import time

def verify_connect4():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading Application...")
        page.goto("http://localhost:8000/index.html")

        # Wait for app to load
        try:
            page.wait_for_selector("#menu-grid", state="visible", timeout=10000)
        except:
             # Try forcing grid view if in 3D mode
             print("Switching to Grid View...")
             page.evaluate("if(window.miniGameHub && typeof toggleView === 'function') { toggleView(); } else { document.getElementById('view-toggle-btn').click(); }")
             page.wait_for_selector("#menu-grid", state="visible", timeout=5000)

        print("Launching Neon Connect 4...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-connect4' })")

        # Wait for game container
        page.wait_for_selector("#neon-connect4", state="visible")

        # Check for Game Title
        title = page.locator("h2.neon-text").inner_text()
        if "NEON CONNECT 4" not in title:
            print(f"Error: Unexpected title '{title}'")
            sys.exit(1)

        print("Game Title Verified.")

        # Check Grid
        grid = page.locator("#nc4-grid")
        if not grid.is_visible():
            print("Error: Grid not visible")
            sys.exit(1)

        cells = page.locator(".nc4-cell")
        count = cells.count()
        if count != 42:
            print(f"Error: Expected 42 cells, found {count}")
            sys.exit(1)

        print(f"Grid Verified ({count} cells).")

        # Simulate Move
        print("Simulating Player Move (Col 3)...")
        # Click the top cell of column 3 (index 3)
        cells.nth(3).click()

        time.sleep(1) # Wait for animation

        # Verify piece placed (bottom row, col 3 -> index 35 + 3 = 38)
        # Actually logic finds lowest empty row. Row 5, Col 3.
        # Index = 5 * 7 + 3 = 35 + 3 = 38.

        cell_class = cells.nth(38).get_attribute("class")
        if "p1" not in cell_class:
             print(f"Error: Piece not placed in expected cell (Index 38). Class: {cell_class}")
             # Debug dump
             for i in range(42):
                 if "p1" in cells.nth(i).get_attribute("class"):
                     print(f"Found p1 at index {i}")
             sys.exit(1)

        print("Player Move Verified.")

        # Wait for AI
        print("Waiting for AI Move...")
        time.sleep(2)

        # Check if AI placed a piece (p2)
        p2_count = page.locator(".nc4-cell.p2").count()
        if p2_count < 1:
            print("Error: AI did not move.")
            sys.exit(1)

        print("AI Move Verified.")

        print("Neon Connect 4 Verification Passed!")

        # Take Screenshot
        os.makedirs("verification/screenshots", exist_ok=True)
        screenshot_path = "verification/screenshots/neon_connect4.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_connect4()
