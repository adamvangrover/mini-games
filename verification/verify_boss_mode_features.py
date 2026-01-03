from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to Boss Mode...")
        # Add force=true if needed or handle overlays
        page.goto("http://localhost:8000/index.html")
        page.wait_for_load_state("networkidle")

        # Click "Tap to Start" if it exists
        try:
            page.click("#app-loader", timeout=2000)
        except:
            pass

        # Trigger Boss Mode (Alt+B)
        print("Triggering Boss Mode...")
        page.keyboard.down('Alt')
        page.keyboard.press('b')
        page.keyboard.up('Alt')

        # Wait for overlay
        overlay = page.locator("#boss-mode-overlay")
        expect(overlay).to_be_visible(timeout=5000)

        # 1. Verify Excel Game (Flight Sim)
        print("Verifying Excel Flight Sim...")
        # Ensure we are in Excel (default)
        page.click("#boss-switch-excel")
        page.click("#cell-A1") # Focus
        page.fill("#boss-formula-input", "=FLIGHT()")
        page.press("#boss-formula-input", "Enter")
        time.sleep(1)
        page.screenshot(path="verification/boss_mode_excel_flight.png")
        print("Captured Flight Sim screenshot.")

        # 2. Verify Word Stealth
        print("Verifying Word Stealth...")
        page.click("#boss-switch-word")
        time.sleep(0.5)

        # Toggle Stealth
        page.evaluate("BossMode.instance.toggleWordStealth()")

        # Type garbage
        page.click("#word-doc-content")
        page.keyboard.type("asdf")
        time.sleep(0.5)
        page.screenshot(path="verification/boss_mode_word_stealth.png")
        print("Captured Word Stealth screenshot.")

        # 3. Verify Terminal Adventure
        print("Verifying Terminal Adventure...")
        page.click("#boss-switch-terminal")
        time.sleep(0.5)
        page.click("#term-input")
        page.keyboard.type("quest")
        page.keyboard.press("Enter")
        time.sleep(0.5)
        page.screenshot(path="verification/boss_mode_terminal_quest.png")
        print("Captured Terminal Quest screenshot.")

        # 4. Verify Wallpaper Switch
        print("Verifying Wallpaper Switch...")
        page.click("#boss-notification-btn")
        time.sleep(0.5)
        # Find the wallpaper button text or icon
        page.get_by_text("Wallpaper").click()
        time.sleep(1) # Wait for transition
        page.screenshot(path="verification/boss_mode_wallpaper.png")
        print("Captured Wallpaper screenshot.")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode()
