from playwright.sync_api import sync_playwright, expect
import time

def verify_expansions():
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

            # 1. Verify Ticker
            print("Checking Ticker...")
            ticker = page.locator("#news-ticker")
            expect(ticker).to_be_visible()

            # 2. Check Solitaire in Grid
            print("Checking Solitaire...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            solitaire_card = page.get_by_text("Cyber Solitaire")
            expect(solitaire_card).to_be_visible()

            # 3. Check Daily Quests
            print("Checking Quests Overlay...")
            page.click("#quests-btn-hud")
            time.sleep(1)

            quests_title = page.get_by_text("DAILY QUESTS")
            expect(quests_title).to_be_visible()

            page.screenshot(path="verification/quests_expansion.png")

            # 4. Enter Solitaire
            print("Entering Solitaire...")
            page.click("#overlay-close-btn")
            time.sleep(0.5)
            solitaire_card.click()
            time.sleep(1)

            solitaire_canvas = page.locator("#cyber-solitaire canvas")
            expect(solitaire_canvas).to_be_visible()

            page.screenshot(path="verification/solitaire_game.png")

            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_expansion.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_expansions()
