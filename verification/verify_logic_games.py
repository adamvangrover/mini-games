from playwright.sync_api import sync_playwright
import time
import sys

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console errors
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: print(f"Browser Error: {err.message}"))

        try:
            page.goto("http://localhost:8000/index.html")
            page.wait_for_selector("#menu", state="visible")

            games_to_test = ["monarch-game", "equinox-game", "circuit-game", "quilt-game", "ascension-game"]

            for game_id in games_to_test:
                print(f"Testing {game_id}...")

                # Launch game via console
                page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for container
                page.wait_for_selector(f"#{game_id}", state="visible", timeout=5000)
                time.sleep(1)

                # Check for errors in DOM or missing canvas/container
                container = page.locator(f"#{game_id}")
                if container.count() == 0:
                    raise Exception(f"Failed to load container for {game_id}")

                print(f"{game_id} Loaded OK.")

                # Go back to menu
                page.evaluate("window.miniGameHub.goBack()")
                time.sleep(0.5)

            print("All new logic games verified.")

        except Exception as e:
            print(f"Test failed: {str(e)}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_games()
