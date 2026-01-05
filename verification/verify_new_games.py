from playwright.sync_api import sync_playwright, expect
import time

def verify_new_games():
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

            # Switch to Grid View
            print("Switching to Grid View...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            # Check for New Games
            games_to_check = [
                "Neon Zip",
                "Exiled Spark",
                "Neon Tap",
                "Neon Swipe",
                "Neon Rhythm"
            ]

            for game in games_to_check:
                print(f"Checking for {game}...")
                card = page.get_by_text(game)
                expect(card).to_be_visible()

            # Test entering one (Neon Tap)
            print("Entering Neon Tap...")
            page.get_by_text("Neon Tap").click()
            time.sleep(1)

            expect(page.locator("#neon-tap-game canvas")).to_be_visible()

            # Test Back
            print("Testing Back Button...")
            page.get_by_text("BACK").click()
            time.sleep(1)
            expect(page.locator("#menu-grid")).to_be_visible()

            # Test Jukebox Keybind (N)
            print("Testing Jukebox Keybind...")
            # We can't easily verify sound, but we can verify no crash on keypress
            page.keyboard.press("n")
            time.sleep(0.5)

            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_new_games.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_new_games()
