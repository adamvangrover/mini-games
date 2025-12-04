from playwright.sync_api import sync_playwright, expect
import time

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to home page...")
        page.goto("http://localhost:8000")
        time.sleep(1)

        # 1. Verify Tower Defense
        print("Testing Tower Defense...")
        page.click("div[data-game='tower-defense-game']")
        time.sleep(1)

        # Check if game container is visible
        td_canvas = page.locator("#tdCanvas")
        if td_canvas.is_visible():
            print("Tower Defense Canvas is visible.")
            # Click on canvas to trigger particle emission
            td_canvas.click(position={"x": 100, "y": 100})
            time.sleep(0.5)
            # Take screenshot of Tower Defense
            page.screenshot(path="verification/tower_defense_fixed.png")
            print("Tower Defense screenshot taken.")
        else:
            print("Tower Defense Canvas NOT visible.")

        # Go back
        page.click(".back-btn")
        time.sleep(1)

        # 2. Verify Space Shooter (check for error or load)
        print("Testing Space Shooter...")
        page.click("div[data-game='space-game']")
        time.sleep(1)

        space_canvas = page.locator("#spaceCanvas")
        error_msg = page.locator("text=Error: Three.js is not loaded")

        if error_msg.is_visible():
            print("Space Shooter showed error message (Expected if offline/blocked).")
            page.screenshot(path="verification/space_shooter_error.png")
        elif space_canvas.is_visible():
            print("Space Shooter Canvas is visible.")
            page.screenshot(path="verification/space_shooter_loaded.png")
        else:
             print("Space Shooter state unclear.")
             page.screenshot(path="verification/space_shooter_unknown.png")

        # Go back
        page.click(".back-btn")
        time.sleep(1)

        # 3. Verify Matterhorn
        print("Testing Matterhorn...")
        page.click("div[data-game='matterhorn-game']")
        time.sleep(1)

        mh_canvas = page.locator("#matterhornCanvas")
        mh_error = page.locator("text=Error: Three.js is not loaded")

        if mh_error.is_visible():
            print("Matterhorn showed error message.")
            page.screenshot(path="verification/matterhorn_error.png")
        elif mh_canvas.is_visible():
             print("Matterhorn Canvas is visible.")
             page.screenshot(path="verification/matterhorn_loaded.png")

        # Go back
        page.click(".back-btn")
        time.sleep(1)

        # 4. Verify Aetheria
        print("Testing Aetheria...")
        page.click("div[data-game='aetheria-game']")
        time.sleep(1)

        ae_container = page.locator("#aetheria-game-container")
        ae_error = page.locator("text=Error: Three.js is not loaded")

        if ae_error.is_visible():
             print("Aetheria showed error message.")
             page.screenshot(path="verification/aetheria_error.png")
        elif ae_container.is_visible():
             print("Aetheria Container is visible.")
             page.screenshot(path="verification/aetheria_loaded.png")

        browser.close()

if __name__ == "__main__":
    verify_games()
