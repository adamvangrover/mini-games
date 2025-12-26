import time
from playwright.sync_api import sync_playwright

def verify_refactor():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Enable console logs
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to Arcade Hub...")
        page.goto("http://localhost:8000")

        # 1. Verify Loading & Version
        print("Waiting for SaveSystem...")
        page.wait_for_function("window.miniGameHub && window.miniGameHub.saveSystem")

        version = page.evaluate("window.miniGameHub.saveSystem.data.version")
        print(f"SaveSystem Version: {version}")
        if version != 1.2:
            print("FAILURE: SaveSystem version mismatch.")
        else:
            print("SUCCESS: SaveSystem version is 1.2.")

        # 2. Verify View State and Switch to Grid if needed
        print("Waiting for UI initialization...")
        page.wait_for_selector("#view-toggle-btn", state="attached")

        # Give a moment for 3D/2D logic to settle
        page.wait_for_timeout(2000)

        view_text = page.eval_on_selector("#view-toggle-text", "el => el.textContent")
        print(f"Current View Toggle Text: {view_text}")

        if "Grid View" in view_text:
            # We are in 3D mode.
            print("Detected 3D View. Switching to Grid View for verification...")
            # Click the button. Force true in case 3D canvas overlay intercepts.
            page.click("#view-toggle-btn", force=True)
            page.wait_for_timeout(1000)
        else:
             print("Detected Grid View (Default or Fallback).")

        print("Waiting for menu grid visibility...")
        page.wait_for_selector("#menu-grid", state="visible")

        page.screenshot(path="verification/menu_loaded.png")
        print("Screenshot taken: verification/menu_loaded.png")

        # 3. Test Successful Game Load (Snake)
        print("Testing Game Load: Snake...")
        snake_card = page.get_by_text("Snake", exact=True).first
        snake_card.click()

        page.wait_for_selector("#snake-game", state="visible")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/snake_game.png")
        print("Screenshot taken: verification/snake_game.png")

        print("Returning to menu...")
        page.evaluate("window.miniGameHub.goBack()")
        page.wait_for_selector("#menu-grid", state="visible")
        page.wait_for_timeout(1000)

        # 4. Test Placeholder (Simulated Failure)
        print("Testing Placeholder Logic...")

        # Block neonJump.js to force failure
        def abort_route(route):
            print(f"Aborting request to {route.request.url}")
            route.abort()

        page.route("**/neonJump.js", abort_route)

        print("Clicking Neon Jump (should fail to load module)...")
        jump_card = page.get_by_text("Neon Jump", exact=True).first
        jump_card.click(force=True)

        page.wait_for_timeout(3000)

        # Verify Placeholder
        container = page.locator("#neon-jump")
        expect_canvas = container.locator("canvas")
        if expect_canvas.count() > 0:
            print("SUCCESS: Canvas found in Neon Jump container (Placeholder rendered).")
        else:
            print("FAILURE: No canvas found for Placeholder.")

        page.screenshot(path="verification/placeholder_test.png")
        print("Screenshot taken: verification/placeholder_test.png")

        browser.close()

if __name__ == "__main__":
    verify_refactor()
