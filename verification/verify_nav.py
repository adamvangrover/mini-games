from playwright.sync_api import sync_playwright

def verify_games(page):
    try:
        page.goto("http://localhost:8000/index.html")
        page.wait_for_load_state("networkidle")

        # Check if 3D view is active, switch to Grid View if needed
        # The toggle button is #view-toggle-btn
        # We need to click it forcefully because sometimes overlays block it
        page.click("#view-toggle-btn", force=True)
        page.wait_for_timeout(1000)

        # Wait for grid
        grid = page.wait_for_selector("#menu-grid", state="visible", timeout=10000)

        # Screenshot the menu to see if new games are there
        page.screenshot(path="verification/menu_grid.png")

        # Verify new entries exist in text
        content = page.content()
        missing = []
        if "Queens" not in content: missing.append("Queens")
        if "Neon Mines" not in content: missing.append("Neon Mines")
        if "Neon Picross" not in content: missing.append("Neon Picross")

        if missing:
            print(f"Missing games in menu: {missing}")
        else:
            print("All new games found in menu.")

        # Test Snake Game Load
        # Find card with text "Snake"
        # Force click because of hover effects might be finicky
        snake_card = page.locator("text=Snake").first
        if snake_card.is_visible():
            snake_card.click(force=True)
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/snake_game.png")

            # Check for score element
            if page.locator("#snake-score").is_visible():
                print("Snake game loaded successfully")
            else:
                 print("Snake game failed to load UI")

            # Go back
            page.evaluate("window.miniGameHub.goBack()")
            page.wait_for_timeout(1000)
        else:
            print("Snake card not found")

        # Test Pong Game Load
        pong_card = page.locator("text=Pong").first
        if pong_card.is_visible():
            pong_card.click(force=True)
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/pong_game.png")
             # Check for score element
            if page.locator("#pong-score").is_visible():
                print("Pong game loaded successfully")
            else:
                 print("Pong game failed to load UI")
        else:
             print("Pong card not found")

    except Exception as e:
        print(f"Error during verification: {e}")
        page.screenshot(path="verification/error.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_games(page)
        except Exception as e:
            print(f"Critical Error: {e}")
        finally:
            browser.close()
