
import os
import sys
import time
from playwright.sync_api import sync_playwright

def verify_frontend():
    print("Starting visual verification...")
    os.makedirs("verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Neon Racer in Menu
        print("Checking Neon Racer in menu...")
        page.goto("http://localhost:8000")

        # Handle Loader if present
        try:
            if page.locator("#app-loader").is_visible():
                page.click("#app-loader")
        except:
            pass

        # Wait for menu grid to exist
        page.wait_for_selector("#menu-grid", state="attached", timeout=10000)

        # Switch to Grid View if needed
        if not page.locator("#menu-grid").is_visible():
             print("Switching to Grid View...")
             try:
                 page.click("#view-toggle-btn")
                 page.wait_for_selector("#menu-grid", state="visible", timeout=5000)
             except Exception as e:
                 print(f"Could not switch view: {e}")
                 # Force show
                 page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")

        page.wait_for_selector("text=Neon Racer")
        page.screenshot(path="verification/screenshot_menu_neon_racer.png")
        print("Captured menu screenshot.")

        # 2. Boss Mode Apps
        print("Checking Boss Mode Apps...")
        page.evaluate("window.BossMode.instance.toggle()")
        page.wait_for_selector("#boss-mode-overlay", state="visible")

        # Login
        page.evaluate("""() => {
            const os = window.BossMode.instance;
            os.login();
        }""")
        time.sleep(1) # Wait for animation

        page.screenshot(path="verification/screenshot_boss_mode_desktop.png")
        print("Captured desktop screenshot.")

        # Open Spotify
        page.evaluate("window.BossMode.instance.openApp('spotify')")
        time.sleep(1)
        page.screenshot(path="verification/screenshot_spotify.png")
        print("Captured Spotify screenshot.")

        browser.close()
        print("Visual verification complete.")

if __name__ == "__main__":
    verify_frontend()
