from playwright.sync_api import sync_playwright, expect
import time

def verify_arcade_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Handle Console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        try:
            # Navigate to the app (using the server we started on port 8000)
            print("Navigating to http://localhost:8000...")
            page.goto("http://localhost:8000")

            # Wait for loader to disappear
            print("Waiting for loader...")
            loader = page.locator("#app-loader")
            expect(loader).to_be_hidden(timeout=10000)

            # Check if 3D Hub or Grid View is active
            # We forced 3D view in main.js unless fallback, but let's see
            # Wait a bit for Three.js to render
            time.sleep(2)

            # Take screenshot of Hub
            print("Taking screenshot of Hub...")
            page.screenshot(path="verification/arcade_hub.png")

            # Check for Daily Challenge Highlight in Grid View
            # Toggle to Grid View
            print("Toggling to Grid View...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            # Verify Menu Grid is visible
            menu_grid = page.locator("#menu-grid")
            expect(menu_grid).to_be_visible()

            # Check for "DAILY CHALLENGE" text
            print("Checking for Daily Challenge...")
            daily_label = page.get_by_text("DAILY CHALLENGE")
            expect(daily_label).to_be_visible()

            page.screenshot(path="verification/grid_view_daily.png")

            # Test Trophy Room Transition
            # We can click the Trophy button in the menu
            print("Entering Trophy Room...")
            page.click("#trophy-btn-menu")

            # Wait for transition
            time.sleep(2)

            # Verify Trophy Room Container is visible (game-container with id trophy-room)
            # The new logic uses standard game container flow, so ID should be 'trophy-room'
            trophy_container = page.locator("#trophy-room")
            expect(trophy_container).to_be_visible()

            # Verify Back Button exists
            back_btn = page.locator("#trophy-back-btn")
            expect(back_btn).to_be_visible()

            page.screenshot(path="verification/trophy_room.png")

            print("Verification Successful!")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_arcade_hub()
