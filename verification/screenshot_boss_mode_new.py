import os
import time
from playwright.sync_api import sync_playwright

def screenshot_boss_mode():
    print("Starting screenshot generation...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # 1. Load Page
        page.goto("http://localhost:8000")
        try:
            page.wait_for_selector("#app-loader", state="hidden", timeout=10000)
        except:
            page.evaluate("document.getElementById('app-loader').style.display='none'")
        time.sleep(1)

        # 2. Open Boss Mode
        page.evaluate("BossMode.instance.toggle(true)")
        page.wait_for_selector("#boss-mode-overlay", state="visible")
        time.sleep(1)

        # 3. Open Excel
        page.evaluate("BossMode.instance.openApp('excel')")
        page.wait_for_selector("#window-1")
        time.sleep(0.5)

        # 4. Open Browser
        page.evaluate("BossMode.instance.openApp('browser')")
        page.wait_for_selector("#window-2")
        time.sleep(0.5)

        # 5. Move Browser to right
        page.evaluate("BossMode.instance.windows.find(w => w.app === 'browser').x = 400")
        page.evaluate("BossMode.instance.render()") # Force re-render to apply position
        time.sleep(0.5)

        # 6. Open Start Menu
        page.click("#boss-start-btn")
        time.sleep(1) # Wait for animation

        # Screenshot
        path = "verification/boss_mode_desktop.png"
        page.screenshot(path=path)
        print(f"Screenshot saved to {path}")

        browser.close()

if __name__ == "__main__":
    screenshot_boss_mode()
