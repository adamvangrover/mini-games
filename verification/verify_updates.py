from playwright.sync_api import sync_playwright, expect
import time

def verify_updates():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            print("Navigating...")
            page.goto("http://localhost:8000")

            # Wait for loader
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)
            time.sleep(2)

            # 1. Verify Solitaire exists
            print("Opening Menu Grid...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            print("Checking for Cyber Solitaire...")
            solitaire_card = page.get_by_text("Cyber Solitaire")
            expect(solitaire_card).to_be_visible()

            # 2. Verify Daily Quests
            print("Checking Daily Quests Button...")
            quests_btn = page.locator("#quests-btn-hud")
            expect(quests_btn).to_be_visible()

            print("Opening Quests Overlay...")
            quests_btn.click()
            time.sleep(1)
            expect(page.get_by_text("Daily Objectives")).to_be_visible()

            page.screenshot(path="verification/final_update_verification.png")

            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_update.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_updates()
