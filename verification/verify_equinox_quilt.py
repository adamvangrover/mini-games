import sys
import os
from playwright.sync_api import sync_playwright
import time

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")
        time.sleep(2)

        if page.locator("#menu-grid").get_attribute("class") and "hidden" in page.locator("#menu-grid").get_attribute("class"):
             print("Switching to Grid View...")
             page.evaluate("if(window.miniGameHub && typeof toggleView === 'function') { toggleView(); } else { document.getElementById('view-toggle-btn').click(); }")
             page.wait_for_selector("#menu-grid", state="visible")

        games_to_test = [
            {'id': 'equinox-game'},
            {'id': 'quilt-game'}
        ]

        for game in games_to_test:
            print(f"Testing {game['id']}...")
            page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game['id']}' }})")

            try:
                page.wait_for_selector(f"#{game['id']}", state="visible")
                print(f"{game['id']} Loaded OK.")
                os.makedirs("verification/screenshots", exist_ok=True)
                page.screenshot(path=f"verification/screenshots/{game['id']}.png")
            except Exception as e:
                print(f"FAILED to load {game['id']}: {e}")
                sys.exit(1)

            page.evaluate("window.miniGameHub.transitionToState('MENU')")
            time.sleep(1)

        print("Equinox and Quilt verified.")
        browser.close()

if __name__ == "__main__":
    verify_games()
