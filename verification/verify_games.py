
import os
from playwright.sync_api import sync_playwright, expect

def verify_new_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Load the Hub
            page.goto("http://localhost:8000/index.html")
            page.wait_for_load_state("networkidle")

            # 2. Verify New Games appear in Menu
            expect(page.locator("text=Neon 2048")).to_be_visible()
            expect(page.locator("text=Neon Flap")).to_be_visible()
            expect(page.locator("text=Neon Memory")).to_be_visible()

            page.screenshot(path="verification/menu.png")
            print("Menu Verified")

            # 3. Test Neon 2048 Load
            # Click the card container, forcing if necessary
            page.click('div[data-game="neon-2048"]', force=True)

            # Wait for transition
            page.wait_for_timeout(1000)

            # Check for Game Title in DOM - Be specific to the in-game header
            expect(page.locator("#neon-2048 h2").first).to_contain_text("NEON 2048")

            page.screenshot(path="verification/neon2048.png")
            print("Neon 2048 Verified")

            # Go back
            page.evaluate("window.miniGameHub.goBack()")
            page.wait_for_timeout(1000)

            # 4. Test Neon Flap Load
            page.click('div[data-game="neon-flap"]', force=True)
            page.wait_for_timeout(1000)
            expect(page.locator("#neon-flap canvas")).to_be_visible()

            page.screenshot(path="verification/neonflap.png")
            print("Neon Flap Verified")

            # Go back
            page.evaluate("window.miniGameHub.goBack()")
            page.wait_for_timeout(1000)

            # 5. Test Neon Memory Load
            page.click('div[data-game="neon-memory"]', force=True)
            page.wait_for_timeout(1000)
            # Use specific locator to avoid matching menu items
            expect(page.locator("#neon-memory h2").first).to_contain_text("NEON MEMORY")
            expect(page.locator("#btn-red")).to_be_visible()

            page.screenshot(path="verification/neonmemory.png")
            print("Neon Memory Verified")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    verify_new_games()
