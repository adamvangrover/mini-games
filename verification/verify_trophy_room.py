
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Start local server
    import subprocess
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2) # Wait for server

    try:
        # Load the game
        page.goto("http://localhost:8000/index.html")

        # Wait for menu to load
        page.wait_for_selector("#menu", state="visible")

        # Switch to Grid View to see Trophy Room
        # Check if we are in 3D or 2D. Mobile defaults to 2D but headless might be desktop size.
        # Force click view toggle if needed
        view_btn = page.locator("#view-toggle-btn")
        if view_btn.is_visible():
            view_btn.click()
            time.sleep(1)

        # Click on Trophy Room (search for text "Trophy Room")
        trophy_card = page.get_by_text("Trophy Room").first

        # If not found, it might be in 3D view or hidden.
        # Let's ensure grid is visible
        page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")

        trophy_card.click(force=True)

        # Verify Trophy Room Loaded
        expect_title = page.locator("h1", has_text="TROPHY ROOM")
        expect_title.wait_for(state="visible", timeout=5000)

        # Take Screenshot 1: Empty Trophy Room
        page.screenshot(path="verification/trophy_room_initial.png")
        print("Initial Trophy Room screenshot taken.")

        # Go Back
        page.locator("#trophy-back-btn").click()
        time.sleep(1)

        # Play Snake to get achievement
        snake_card = page.get_by_text("Snake", exact=True).first
        snake_card.click(force=True)

        # Wait for Snake Canvas
        page.wait_for_selector("#snakeCanvas", state="visible")

        # Simulate Score 10
        # We can inject JS to modify state directly for testing speed
        page.evaluate("""
            const game = window.currentGameInstance;
            if(game) {
                game.score = 10;
                game.gameOver(); // Trigger game over which checks achievements
            }
        """)

        # Wait for Game Over Overlay
        page.wait_for_selector("#global-overlay", state="visible")

        # Click Main Menu
        page.locator("#overlay-menu-btn").click()
        time.sleep(1)

        # Go back to Trophy Room
        trophy_card.click(force=True)
        time.sleep(1)

        # Screenshot 2: Unlocked Achievement
        page.screenshot(path="verification/trophy_room_unlocked.png")
        print("Unlocked Trophy Room screenshot taken.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        server.terminate()
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
