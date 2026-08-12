import time
from playwright.sync_api import sync_playwright

def verify_neon_connect4():
    print("Starting verification of Neon Connect 4...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:8000")
            print("Loaded Hub.")

            # Wait for ArcadeHub to be initialized
            page.wait_for_selector("#arcade-hub-container", state="attached")
            time.sleep(2)

            # Dismiss any loader that might intercept clicks
            page.evaluate("""
                const loader = document.getElementById('app-loader');
                if (loader) {
                    loader.style.display = 'none';
                    loader.style.pointerEvents = 'none';
                }
            """)

            print("Transitioning to game state...")
            page.evaluate("""
                if (window.miniGameHub && window.miniGameHub.transitionToState) {
                    window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-connect4' });
                }
            """)

            time.sleep(5)

            print("Taking screenshot after transition to see if game loaded...")
            page.screenshot(path="verification/neon_connect4_ingame.png")

            # Wait for game container to appear
            game_container = page.locator("#neon-connect4")
            game_container.wait_for(state="visible", timeout=5000)

            # Check if game container has the neon-text header
            header_text = page.locator("#neon-connect4 h2.neon-text").inner_text(timeout=5000)
            if "NEON CONNECT 4" not in header_text:
                raise Exception(f"Header text is wrong: {header_text}")

            print("Header verified.")

            # Check for grid elements
            cells = page.locator(".nc4-cell")
            cell_count = cells.count()
            if cell_count != 42: # 6 rows * 7 cols
                raise Exception(f"Expected 42 cells, found {cell_count}")

            print(f"Found {cell_count} grid cells.")

            # Play a move in column 3
            cells.nth(3).click(force=True)
            time.sleep(2) # wait for move and AI response

            # Check if cell changed class
            player_cells = page.locator(".player-x")
            ai_cells = page.locator(".player-o")

            if player_cells.count() < 1:
                raise Exception("Player move was not registered.")

            if ai_cells.count() < 1:
                raise Exception("AI move was not registered.")

            print(f"Moves registered: Player ({player_cells.count()}), AI ({ai_cells.count()})")

            # Save a screenshot
            page.screenshot(path="verification/neon_connect4_test.png")
            print("Screenshot saved to verification/neon_connect4_test.png")
            print("Verification passed successfully.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/neon_connect4_error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_neon_connect4()
