from playwright.sync_api import sync_playwright, expect
import os

def verify_space_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local file
        file_path = os.path.abspath("index.html")
        page.goto(f"file://{file_path}")

        # Click the Space Shooter button
        page.click('button[data-game="space-game"]')

        # Wait for the canvas to be visible
        canvas = page.locator("#spaceCanvas")
        expect(canvas).to_be_visible()

        # Wait a bit for Three.js to initialize and render
        page.wait_for_timeout(2000)

        # Take a screenshot
        screenshot_path = "jules-scratch/verification/space_game.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_space_game()
