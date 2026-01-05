
import sys
import os
from playwright.sync_api import sync_playwright
import time

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home
        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")

        # Wait for either 3D hub or grid
        time.sleep(2)

        # Force Grid View if 3D is active
        # Check if menu-grid is hidden
        if page.locator("#menu-grid").get_attribute("class") and "hidden" in page.locator("#menu-grid").get_attribute("class"):
             print("Switching to Grid View...")
             page.evaluate("if(window.miniGameHub && typeof toggleView === 'function') { toggleView(); } else { document.getElementById('view-toggle-btn').click(); }")
             page.wait_for_selector("#menu-grid", state="visible")

        games_to_test = [
            {'id': 'neon-survivor', 'selector': 'canvas'},
            {'id': 'neon-drop', 'selector': 'canvas'},
            {'id': 'neon-factory', 'selector': 'canvas'},
            {'id': 'neon-rogue', 'selector': '#enter-node-btn'},
            {'id': 'neon-pinball', 'selector': 'canvas'}
        ]

        for game in games_to_test:
            print(f"Testing {game['id']}...")

            # Start game directly via API to ensure clean state
            page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game['id']}' }})")

            # Wait for game container
            page.wait_for_selector(f"#{game['id']}", state="visible")

            # Check for critical element
            try:
                page.wait_for_selector(f"#{game['id']} {game['selector']}", state="visible", timeout=3000)
                print(f"{game['id']} Loaded OK.")

                # Take screenshot
                os.makedirs("verification/screenshots", exist_ok=True)
                page.screenshot(path=f"verification/screenshots/{game['id']}.png")

            except Exception as e:
                print(f"FAILED to load {game['id']}: {e}")
                sys.exit(1)

            # Return to menu
            page.evaluate("window.miniGameHub.transitionToState('MENU')")
            time.sleep(1)

        print("All new games verified.")
        browser.close()

if __name__ == "__main__":
    verify_games()
