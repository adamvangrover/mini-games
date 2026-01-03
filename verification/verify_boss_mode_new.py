
from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the full UI
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Navigate to the app (ensure server is running on port 8000)
        page.goto("http://localhost:8000/index.html")

        # Wait for the app to load
        expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

        # The Boss Mode is triggered by Alt+B. We can simulate this.
        page.keyboard.press("Alt+b")

        # Wait for the overlay to appear
        overlay = page.locator("#boss-mode-overlay")
        expect(overlay).to_be_visible()

        # Take a screenshot of the initial Excel view
        page.screenshot(path="verification/boss_mode_excel.png")
        print("Screenshot saved: verification/boss_mode_excel.png")

        # Switch to PPT mode
        page.locator("#boss-switch-ppt").click()

        # Wait for PPT UI - Check specifically for the heading to avoid strict mode violation
        expect(page.locator("h1", has_text="Q4 Strategy Alignment")).to_be_visible()
        page.screenshot(path="verification/boss_mode_ppt.png")
        print("Screenshot saved: verification/boss_mode_ppt.png")

        # Switch to Word mode
        page.locator("#boss-switch-word").click()
        expect(page.get_by_text("MINUTES OF THE QUARTERLY SYNERGY MEETING")).to_be_visible()
        page.screenshot(path="verification/boss_mode_word.png")
        print("Screenshot saved: verification/boss_mode_word.png")

        # Switch to Email mode
        page.locator("#boss-switch-email").click()
        expect(page.get_by_text("Outlook - Inbox")).to_be_visible()
        page.screenshot(path="verification/boss_mode_email.png")
        print("Screenshot saved: verification/boss_mode_email.png")

        # Switch to Chat mode
        page.locator("#boss-switch-chat").click()
        expect(page.get_by_text("Teams - Corporate Chat")).to_be_visible()
        page.screenshot(path="verification/boss_mode_chat.png")
        print("Screenshot saved: verification/boss_mode_chat.png")

        # Switch to Terminal mode
        page.locator("#boss-switch-terminal").click()
        expect(page.get_by_text("Administrator: Command Prompt")).to_be_visible()
        page.screenshot(path="verification/boss_mode_terminal.png")
        print("Screenshot saved: verification/boss_mode_terminal.png")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode()
