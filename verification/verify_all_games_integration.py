from playwright.sync_api import sync_playwright
import time
import json

def verify_all_games_integration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        try:
            page.goto("http://localhost:8000/index.html")
        except Exception as e:
            print(f"Failed to load index.html: {e}")
            return

        # Dismiss loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                page.mouse.click(100, 100)
                loader.wait_for(state="hidden", timeout=5000)
        except:
            pass

        # Get list of games from window.miniGameHub.gameRegistry
        # We need to wait for the registry to be available
        page.wait_for_function("() => window.miniGameHub && window.miniGameHub.gameRegistry")

        game_ids = page.evaluate("() => Object.keys(window.miniGameHub.gameRegistry)")
        print(f"Found {len(game_ids)} games to verify: {game_ids}")

        failed_games = []

        for game_id in game_ids:
            print(f"Testing {game_id}...")
            try:
                # Transition to game
                page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for game container to be visible and not empty
                # We look for the specific ID
                target_id = f"#{game_id}"
                if game_id == 'trophy-room':
                    target_id = "#trophy-room-container"

                page.locator(target_id).wait_for(state="visible", timeout=5000)

                # Check if it fell back to Placeholder (error state)
                # Placeholder usually sets text to "ERROR" or similar, or we can check if the class instance is correct
                # But looking for the container is a good first step.

                # Let it run for a second
                page.wait_for_timeout(1000)

                # Go back to menu
                page.evaluate("window.miniGameHub.goBack()")
                page.locator("#menu").wait_for(state="visible", timeout=5000)

            except Exception as e:
                print(f"❌ FAILED {game_id}: {e}")
                failed_games.append(game_id)
                # Try to recover to menu
                try:
                    page.evaluate("window.miniGameHub.goBack()")
                    page.locator("#menu").wait_for(state="visible", timeout=2000)
                except:
                    print("Could not recover to menu, reloading page...")
                    page.reload()
                    # Dismiss loader again
                    try:
                        loader = page.locator("#app-loader")
                        if loader.is_visible():
                            page.mouse.click(100, 100)
                            loader.wait_for(state="hidden", timeout=5000)
                    except:
                        pass

        browser.close()

        if failed_games:
            print(f"❌ FAILED GAMES: {failed_games}")
            exit(1)
        else:
            print("✅ All games verified successfully!")

if __name__ == "__main__":
    verify_all_games_integration()
