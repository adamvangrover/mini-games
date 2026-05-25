from playwright.sync_api import sync_playwright, expect
import time
import sys

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"LOG: {msg.text}"))

        try:
            page.goto("http://localhost:8000")
            page.click("body", force=True) # dismiss loader

            # Wait for hub to load
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)
            print("Hub loaded.")

            games_to_test = ['neon-orbit', 'neon-dodge', 'neon-wire', 'neon-pulse']

            for game_id in games_to_test:
                print(f"Testing game: {game_id}")
                page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Check if game container is visible
                game_container = page.locator(f"#{game_id}")
                expect(game_container).to_be_visible(timeout=5000)

                # Check for canvas inside
                canvas = game_container.locator("canvas")
                expect(canvas).to_be_visible(timeout=5000)
                print(f"{game_id} loaded successfully.")

                # Go back to menu
                page.evaluate("window.miniGameHub.goBack()")
                time.sleep(1) # wait for transition

        except Exception as e:
            print(f"Error during verification: {e}")
            browser.close()
            sys.exit(1)

        print("All added games verified successfully.")
        browser.close()

if __name__ == "__main__":
    verify_games()
