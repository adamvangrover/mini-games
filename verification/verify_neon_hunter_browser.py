
import sys
import os
import time

# Add repo root to path
sys.path.append(os.getcwd())

from playwright.sync_api import sync_playwright, expect

def verify_neon_hunter_browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to local server
        page.goto("http://localhost:8000/index.html")

        # Handle app loader by clicking it
        try:
             page.wait_for_selector("#app-loader", timeout=5000)
             page.click("#app-loader")
             print("Clicked app loader.")
        except:
             print("App loader not found or already gone.")

        # Wait for loading to finish (hidden)
        page.wait_for_selector("#app-loader", state="hidden", timeout=30000)

        # Launch game via console
        print("Launching Neon Hunter...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")

        # Wait for menu to appear
        page.wait_for_selector(".mode-btn[data-mode='deer']", timeout=10000)
        print("Menu loaded.")

        # Click Deer Hunt
        print("Starting Deer Hunt...")
        page.click(".mode-btn[data-mode='deer']")
        time.sleep(2)
        page.screenshot(path="verification/neon_hunter_deer.png")
        print("Deer Hunt started. Screenshot taken.")

        # Test other modes
        modes = ['safari', 'shark', 'clay', 'duck']

        for mode in modes:
            print(f"Testing {mode}...")
            # We must reload because goBack isn't perfectly reliable in headless loop sometimes, or just for clean state
            page.reload()

            # Handle loader again
            try:
                page.wait_for_selector("#app-loader", timeout=5000)
                page.click("#app-loader")
            except:
                pass
            page.wait_for_selector("#app-loader", state="hidden", timeout=30000)

            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")
            page.wait_for_selector(f".mode-btn[data-mode='{mode}']", timeout=10000)
            page.click(f".mode-btn[data-mode='{mode}']")
            time.sleep(2)
            page.screenshot(path=f"verification/neon_hunter_{mode}.png")
            print(f"{mode} started. Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_neon_hunter_browser()
