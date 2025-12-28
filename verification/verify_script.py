
import os
from playwright.sync_api import sync_playwright, expect

def verify_neon_arcade():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a consistent viewport size for reproducibility
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        print("Navigating to local server...")
        try:
            page.goto("http://localhost:8000/index.html")
        except Exception as e:
            print(f"Error navigating: {e}")
            return

        print("Waiting for loader...")
        # Expect the loader to appear and then disappear
        # Wait up to 5 seconds for loader to be hidden
        try:
            expect(page.locator("#app-loader")).to_be_hidden(timeout=5000)
            print("Loader finished.")
        except AssertionError:
            print("Loader did not disappear in time. Taking screenshot of loader.")
            page.screenshot(path="verification/loader_stuck.png")

        print("Waiting for menu grid...")
        # Check if 3D view is active or if it fell back to grid
        # The script defaults to 3D view on desktop unless WebGL fails

        # We can force grid view to check the UI
        # But let's first see what we have
        page.screenshot(path="verification/initial_load.png")
        print("Initial screenshot taken.")

        # Click settings to verify Store overlay
        print("Opening Settings...")
        page.locator("#settings-btn-hud").click()
        page.wait_for_timeout(500)
        page.screenshot(path="verification/settings_overlay.png")

        # Close Settings
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # Open Store
        print("Opening Store...")
        page.locator("#shop-btn-hud").click()
        page.wait_for_timeout(500)
        page.screenshot(path="verification/store_overlay.png")

        # Try to buy an item (Themes -> Neon Blue is free/default, let's try to click one)
        # We need to find a 'buy-btn' or 'equip-btn'
        # Since we are fresh, most things are locked.

        # Close Store
        page.locator("#store-close-btn").click()
        page.wait_for_timeout(500)

        # Start a game (e.g., Pong)
        # Need to find it in the grid. If 3D view is on, grid is hidden.
        # Toggle to Grid View first
        print("Toggling to Grid View...")
        view_btn = page.locator("#view-toggle-btn")
        if view_btn.is_visible():
            view_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/grid_view.png")

            # Click Pong
            print("Starting Pong...")
            # We need to find the card. The text is "Pong".
            # The cards are generated dynamically.
            # Using xpath or text search
            pong_card = page.locator("h3", has_text="Pong").first
            if pong_card.is_visible():
                pong_card.click()
                page.wait_for_timeout(2000) # Wait for transition
                page.screenshot(path="verification/in_game_pong.png")

                # Verify Canvas exists
                if page.locator("#pongCanvas").is_visible():
                    print("Pong canvas visible.")
                else:
                    print("Pong canvas NOT visible.")
            else:
                print("Could not find Pong card.")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_neon_arcade()
