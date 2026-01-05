from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode():
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

            # Test Boss Mode (Alt+B)
            print("Activating Boss Mode...")
            page.keyboard.press("Alt+b")
            time.sleep(1)

            # Check overlay
            boss_overlay = page.locator("#boss-mode-overlay")
            expect(boss_overlay).to_be_visible()

            # Verify content (Excel-like)
            print("Checking Spreadsheet Content...")
            expect(boss_overlay.get_by_text("Q1 Financial Projections")).to_be_visible()

            # Toggle Off
            print("Deactivating Boss Mode...")
            page.keyboard.press("Alt+b")
            time.sleep(1)
            expect(boss_overlay).to_be_hidden()

            page.screenshot(path="verification/boss_mode_verified.png")
            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_boss.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_boss_mode()
