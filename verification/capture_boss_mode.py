from playwright.sync_api import sync_playwright, expect
import time

def capture_boss_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#app-loader", state="hidden")

        print("Triggering Boss Mode...")
        page.keyboard.press("Alt+b")

        # Wait for desktop (skip boot if fast, but wait for element)
        page.locator("#boss-login-btn").click() # Login if at login screen
        expect(page.locator("#boss-app-window")).to_be_visible(timeout=10000)

        print("Capturing Desktop...")
        page.screenshot(path="verification/boss_desktop.png")

        print("Launching Word...")
        page.locator("#boss-app-word").click()
        expect(page.locator("text=Memo_Q3_Confidential.docx")).to_be_visible()

        print("Capturing Word...")
        page.screenshot(path="verification/boss_word.png")

        print("Enabling Stealth Mode...")
        page.locator("#btn-stealth-mode").click()
        page.locator("#word-editor").type("This is a stealth test.")

        print("Capturing Stealth Mode...")
        page.screenshot(path="verification/boss_word_stealth.png")

        browser.close()

if __name__ == "__main__":
    capture_boss_mode()
