from playwright.sync_api import sync_playwright
import time
import os

def take_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:8000/index.html")
            page.wait_for_selector("#loading-screen", state="hidden", timeout=10000)
            # just click to start
            page.click("body")
            page.wait_for_selector("#menu", state="visible")

            games_to_test = ["monarch-game", "equinox-game", "circuit-game", "quilt-game", "ascension-game"]

            os.makedirs("/home/jules/verification", exist_ok=True)

            for game_id in games_to_test:
                print(f"Screenshotting {game_id}...")

                # Launch game via console
                page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for container
                page.wait_for_selector(f"#{game_id}", state="visible", timeout=5000)
                time.sleep(1)

                # Take screenshot
                page.screenshot(path=f"/home/jules/verification/{game_id}.png")

                # Go back to menu
                page.evaluate("window.miniGameHub.goBack()")
                time.sleep(0.5)

            print("Screenshots captured.")

        finally:
            browser.close()

if __name__ == "__main__":
    take_screenshots()
