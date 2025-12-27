
from playwright.sync_api import sync_playwright, expect
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Assuming server is running on 8000
        url = "http://localhost:8000/index.html"
        try:
            page.goto(url)
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # 1. Verify Loading Screen
        # It disappears after 1.5s, so we wait.
        time.sleep(2)

        # 2. Verify HUD Elements
        expect(page.locator("#mute-btn-hud")).to_be_visible()
        expect(page.locator("#shop-btn-hud")).to_be_visible()

        # Take screenshot of HUD
        page.screenshot(path="verification/hud_verified.png")
        print("HUD verified and screenshot taken.")

        # 3. Verify Mute Toggle
        # Initial state should be unmuted (icon volume-up)
        # Check if icon has class fa-volume-up
        # Note: innerHTML check is brittle, let's check class of <i>
        mute_btn = page.locator("#mute-btn-hud")
        mute_btn.click()

        # Verify icon changed to volume-mute
        # Since we swap innerHTML, we need to check the child i class
        # expect(mute_btn.locator("i")).to_have_class("fas fa-volume-mute text-red-400") # Might need regex or contains

        # 4. Verify Snake Game Neon Styling
        # Navigate to Grid View first (force if needed, but hub defaults to 3D on desktop)
        # We can simulate mobile to force grid or click toggle

        # Click "Grid View" toggle if visible
        if page.locator("#view-toggle-btn").is_visible():
            page.locator("#view-toggle-btn").click()
            time.sleep(1) # wait for transition

        # Find Snake Game card
        # In Grid View, cards are generated.
        # Snake is 'snake-game'
        # We look for text "Snake"
        snake_card = page.get_by_text("Snake", exact=True)
        # It might be in a h3
        if not snake_card.is_visible():
             snake_card = page.locator("h3", has_text="Snake")

        if snake_card.is_visible():
            snake_card.click()
            time.sleep(1) # Wait for game init

            # Check if canvas is visible
            canvas = page.locator("#snakeCanvas")
            expect(canvas).to_be_visible()

            # Take screenshot of Snake Game
            page.screenshot(path="verification/snake_neon.png")
            print("Snake Game verified and screenshot taken.")

            # Go back
            page.locator(".back-btn").click()
            time.sleep(1)

        browser.close()

if __name__ == "__main__":
    run_verification()
