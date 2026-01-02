
from playwright.sync_api import sync_playwright
import time

def verify_mahjong():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#menu", timeout=5000)

        # Ensure hub is loaded
        page.wait_for_timeout(2000)

        print("Launching Mahjong Game...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'mahjong-game' })")

        # Wait for game container
        page.wait_for_selector("#mahjong-game", timeout=5000)
        page.wait_for_timeout(1000) # Wait for init and render

        # Check for canvas
        canvas = page.query_selector("#mahjong-game canvas")
        if canvas:
            print("Canvas found.")
        else:
            print("Canvas NOT found.")
            exit(1)

        # Check for UI elements
        ui_text = page.inner_text("#mahjong-game")
        if "MAHJONG SOLITAIRE" in ui_text:
            print("UI Title Verified.")
        else:
            print("UI Title missing.")
            print(f"Content: {ui_text}")
            exit(1)

        # Take screenshot
        page.screenshot(path="verification/mahjong_game.png")
        print("Screenshot saved to verification/mahjong_game.png")

        # Test Interaction (Click a tile?)
        # Since it's canvas, we can't click specific DOM elements for tiles, but we can verify clicking the UI buttons

        # Click Hint
        page.click("#mj-hint")
        page.wait_for_timeout(500)
        print("Clicked Hint")

        # Click Shuffle
        page.click("#mj-shuffle")
        page.wait_for_timeout(500)
        print("Clicked Shuffle")

        # Click Layout
        page.click("#mj-layout")
        page.wait_for_timeout(500)
        print("Clicked Layout Change")

        page.screenshot(path="verification/mahjong_interaction.png")
        print("Interaction screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_mahjong()
