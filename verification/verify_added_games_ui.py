from playwright.sync_api import sync_playwright

def verify_added_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use user data dir to persist settings if needed, or just new context
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8080/index.html")

        # Handle App Loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                print("Clicking app loader...")
                loader.click()
                page.wait_for_selector("#app-loader", state="hidden")
        except Exception as e:
            print("Loader not present or already handled:", e)

        # Force Grid View
        page.evaluate("window.is3DView = false; window.miniGameHub.transitionToState('MENU');")
        page.wait_for_selector("#menu-grid")

        # Check for new games in the grid
        new_games = ['neon-chance-game', 'neon-rps-game', 'neon-trivia-game', 'neon-chess-game', 'neon-trail-game']

        print("Verifying game entries in menu...")
        for game_id in new_games:
            # We look for the game's registration in the DOM or Registry
            # DOM cards don't have IDs usually, but we can check if transition works
            print(f"Checking {game_id}...")

            # Transition directly to verify load
            page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

            # Wait for game container to be visible
            try:
                page.wait_for_selector(f"#{game_id}", state="visible", timeout=5000)
                print(f"SUCCESS: {game_id} loaded.")

                # Take screenshot
                page.wait_for_timeout(1000) # Wait for animation/render
                page.screenshot(path=f"verification/{game_id}.png")

                # Go back
                page.evaluate("window.miniGameHub.goBack()")
                page.wait_for_selector("#menu-grid", state="visible")

            except Exception as e:
                print(f"FAILURE: {game_id} failed to load. {e}")

        browser.close()

if __name__ == "__main__":
    verify_added_games()
