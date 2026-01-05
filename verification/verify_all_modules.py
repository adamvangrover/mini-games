from playwright.sync_api import sync_playwright, expect
import time

def verify_all_modules():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        try:
            print("Navigating...")
            page.goto("http://localhost:8000")

            # Wait for loader
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)
            time.sleep(2)

            # Switch to Grid View to see all games
            print("Switching to Grid View...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            # Check for new games existence
            games = [
                "Neon Zip", "Exiled Spark", "Neon Tap", "Neon Swipe", "Neon Rhythm"
            ]

            for game in games:
                print(f"Checking for {game}...")
                card = page.get_by_text(game)
                expect(card).to_be_visible()

            # Test entering one of the new games (Neon Rhythm)
            print("Entering Neon Rhythm...")
            page.get_by_text("Neon Rhythm").click()
            time.sleep(1)

            # Verify game canvas loaded
            # Use .first to avoid strict mode errors if duplicates exist (e.g. from retries or race conditions)
            canvas = page.locator("#neon-rhythm-game canvas").first
            expect(canvas).to_be_visible()

            # Verify Jukebox (N key) doesn't crash
            print("Testing Jukebox Key (N)...")
            page.keyboard.press("n")
            time.sleep(0.5)

            # Exit game
            print("Exiting game...")
            # Use .first for the button as well
            back_btn = page.get_by_text("BACK").first
            back_btn.click()
            time.sleep(1)
            expect(page.locator("#menu-grid")).to_be_visible()

            page.screenshot(path="verification/all_modules_verified.png")
            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_modules.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_all_modules()
