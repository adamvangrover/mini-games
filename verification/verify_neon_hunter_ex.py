
import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_neon_hunter_ex():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Loading Hub...")
        page.goto("http://localhost:8000/index.html")
        page.click("#app-loader")
        time.sleep(2)
        time.sleep(5)

        print("Launching Neon Hunter EX...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter-ex' })")

        # Verify Menu
        # Target the specific menu header within the game container or check text presence strictly
        page.wait_for_selector(".nh-menu", timeout=10000)
        expect(page.locator(".nh-menu h1")).to_have_text("NEON HUNTER 64")

        print("Starting Shark Attack...")
        page.click("button[data-mode='shark']")
        time.sleep(2)

        # Verify HUD
        expect(page.locator("#nh-ex-ammo")).to_contain_text("6/6")
        expect(page.locator("#nh-ex-wave")).to_contain_text("SHARK")

        print("Gameplay verified.")
        page.screenshot(path="verification/neon_hunter_ex.png")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_neon_hunter_ex()
