
from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode_enhanced():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the full UI and taskbar
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Navigate to the app (ensure server is running on port 8000)
        page.goto("http://localhost:8000/index.html")

        # Wait for the app to load
        expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

        # Trigger Boss Mode
        page.keyboard.press("Alt+b")

        # Wait for overlay and verify the new desktop layout
        overlay = page.locator("#boss-mode-overlay")
        expect(overlay).to_be_visible()

        # Check for the taskbar (bottom bar) - Using a more robust selector or text
        # The class name has slashes which confuses the CSS selector parser
        taskbar = page.locator("div.flex.items-center.justify-between.px-2.shadow-lg.z-50")
        expect(taskbar).to_be_visible()

        # Verify default app is Excel
        page.screenshot(path="verification/boss_mode_desktop_excel.png")
        print("Screenshot saved: verification/boss_mode_desktop_excel.png")

        # Open Start Menu
        page.locator("#boss-start-btn").click()
        start_menu = page.locator("text=Pinned") # Look for "Pinned" text in start menu
        expect(start_menu).to_be_visible()
        page.screenshot(path="verification/boss_mode_start_menu.png")
        print("Screenshot saved: verification/boss_mode_start_menu.png")

        # Close Start Menu by clicking outside (or toggling)
        page.locator("#boss-start-btn").click()

        # Switch to Word via Taskbar
        page.locator("#boss-switch-word").click()
        # Verify Word UI
        expect(page.get_by_text("Meeting_Minutes_FINAL.docx")).to_be_visible()
        page.screenshot(path="verification/boss_mode_desktop_word.png")
        print("Screenshot saved: verification/boss_mode_desktop_word.png")

        # Open Notification Center
        page.locator("#boss-notification-btn").click()
        expect(page.get_by_text("New Email from HR")).to_be_visible()
        page.screenshot(path="verification/boss_mode_notifications.png")
        print("Screenshot saved: verification/boss_mode_notifications.png")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode_enhanced()
