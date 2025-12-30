from playwright.sync_api import sync_playwright
import time
import os

def verify_new_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")

        # Wait for either hub or grid
        page.wait_for_selector("body", timeout=10000)
        time.sleep(2)

        # Ensure we are in Grid View to see the menu
        # Check if #menu-grid is hidden
        menu_grid = page.query_selector("#menu-grid")
        is_hidden = menu_grid.evaluate("el => el.classList.contains('hidden')")

        if is_hidden:
            print("Switching to Grid View...")
            # Click toggle button if visible
            try:
                page.click("#view-toggle-btn", timeout=2000)
                time.sleep(1)
            except:
                print("Could not click toggle, forcing via JS...")
                page.evaluate("window.is3DView = false; window.miniGameHub.transitionToState('MENU');")
                time.sleep(1)

        # List of new game IDs to verify
        new_games = ['solitaire-game', 'neon-word-game', 'neon-whack-game']

        for game_id in new_games:
            print(f"Testing {game_id}...")

            # Transition to game
            page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

            # Wait for game container
            page.wait_for_selector(f"#{game_id}", timeout=5000)

            # Wait a bit for init
            time.sleep(2)

            # Check for specific elements based on game
            if game_id == 'solitaire-game':
                page.wait_for_selector("#cs-game-area", timeout=5000)
                page.wait_for_selector(".cs-card", timeout=5000) # Ensure cards are dealt

            elif game_id == 'neon-word-game':
                page.wait_for_selector("#nw-grid", timeout=5000)
                page.wait_for_selector(".nw-key", timeout=5000)

            elif game_id == 'neon-whack-game':
                # It's a canvas game, so check if canvas exists
                page.wait_for_selector(f"#{game_id} canvas", timeout=5000)

            print(f"{game_id} verified successfully.")
            page.screenshot(path=f"verification/verify_{game_id}.png")

            # Go back
            page.evaluate("window.miniGameHub.transitionToState('MENU')")
            time.sleep(1)

        browser.close()

if __name__ == "__main__":
    verify_new_games()
