from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Neon Arcade...")
        page.goto("http://localhost:8000/index.html")

        print("Waiting for loader...")
        page.wait_for_selector("#app-loader", state="hidden")

        # Simulate Alt+B to toggle Boss Mode
        print("Triggering Boss Mode...")
        page.keyboard.press("Alt+b")

        # Wait for Boot Screen
        expect(page.locator("#boss-boot-screen")).to_be_visible(timeout=5000)
        print("Boot Screen Verified.")

        # Wait for Login Screen
        login_input = page.locator("#boss-login-input")
        expect(login_input).to_be_visible(timeout=10000)

        print("Logging in...")
        login_input.type("password123")
        page.locator("#boss-login-btn").click()

        # Wait for Desktop
        print("Waiting for Desktop...")
        excel_window = page.locator("#boss-app-window")
        expect(excel_window).to_be_visible(timeout=5000)
        print("Desktop Loaded.")

        # Test Start Menu
        print("Testing Start Menu...")
        page.locator("#boss-start-btn").click()
        expect(page.locator("#boss-start-menu")).to_be_visible()
        print("Start Menu Verified.")

        # Launch Word via Taskbar (Specific ID)
        print("Launching Word...")
        # Note: Previous script failed on generic selector. Using ID from JS.
        word_icon = page.locator("#boss-app-word")
        word_icon.click()

        # Verify Word Loaded
        expect(page.locator("text=Memo_Q3_Confidential.docx")).to_be_visible()
        print("Word App Verified.")

        # Test Standard Typing
        print("Testing Standard Typing...")
        editor = page.locator("#word-editor")
        editor.click()
        unique_string = " [TEST_STRING]"
        editor.type(unique_string)
        expect(editor).to_contain_text(unique_string)
        print("Standard Typing Verified.")

        # Test Stealth Mode
        print("Testing Stealth Mode...")
        stealth_btn = page.locator("#btn-stealth-mode")
        stealth_btn.click()

        # Typing "T" should insert "The l" (start of fake text)
        editor.type("T")
        expect(editor).to_contain_text("The l")
        print("Stealth Mode Verified.")

        # Switch to Excel
        print("Switching back to Excel...")
        page.locator("#boss-app-excel").click()
        expect(page.locator("text=Financial_Model_FY26_DCF.xlsx")).to_be_visible()

        # Test Tracker Mode
        print("Testing Tracker Mode...")
        page.locator("text=Review").click()
        expect(page.locator("text=ACTIVITY TRACKER")).to_be_visible()
        print("Tracker Overlay Verified.")

        # Close Boss Mode
        print("Closing Boss Mode...")
        page.keyboard.press("Alt+b")
        expect(page.locator("#boss-mode-overlay")).to_be_hidden()
        print("Boss Mode Closed.")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode()
