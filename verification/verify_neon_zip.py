
import time
from playwright.sync_api import sync_playwright

def verify_neon_zip():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile-like viewport to test touch readiness, but verify generic layout
        context = browser.new_context(viewport={'width': 800, 'height': 600})
        page = context.new_page()

        # 1. Load the app
        print("Loading app...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#menu", state="visible", timeout=10000)

        # 2. Force Launch Neon Zip
        print("Launching Neon Zip...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-zip-game' })")

        # Wait for SPECIFIC canvas
        print("Waiting for game canvas...")
        page.wait_for_selector("#neon-zip-game canvas", state="visible", timeout=5000)
        time.sleep(1) # Wait for animation/init

        # 3. Take screenshot of initial state
        page.screenshot(path="verification/neon_zip_start.png")
        print("Start screenshot taken.")

        # 4. Simulate a drag interaction
        # We need to find dots. We don't know the colors, but we know the grid logic.
        # Canvas size: 800x600.
        # Grid Size: 6.
        # minDim = 600. cellSize = (600 * 0.8) / 6 = 80.
        # offsetX = (800 - 480) / 2 = 160.
        # offsetY = (600 - 480) / 2 = 60.
        # Dot 0,0 is at ~ 160+40, 60+40 = 200, 100
        # Dot 0,1 is at ~ 200+80 = 280, 100

        print("Simulating drag...")
        # Mouse Down on 0,0
        page.mouse.move(200, 100)
        page.mouse.down()
        time.sleep(0.1)
        # Drag to 0,1
        page.mouse.move(280, 100)
        time.sleep(0.1)
        # Drag to 0,2 (Just in case, trying to find a match)
        page.mouse.move(360, 100)
        time.sleep(0.1)
        page.mouse.up()

        time.sleep(1)

        # 5. Screenshot after interaction
        page.screenshot(path="verification/neon_zip_interact.png")
        print("End screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_neon_zip()
