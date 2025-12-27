from playwright.sync_api import sync_playwright, expect
import time
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # Capture console logs to debug
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    try:
        print("Navigating to app...")
        page.goto("http://localhost:8000/index.html")

        # 1. Wait for loading screen to disappear
        print("Waiting for app to load...")
        expect(page.locator("#app-loader")).not_to_be_visible(timeout=15000)

        # 2. Verify 3D Hub Container exists
        print("Verifying 3D Hub...")
        expect(page.locator("#arcade-hub-container")).to_be_visible()
        expect(page.locator("canvas").first).to_be_visible()

        # Wait a bit for Three.js to render
        time.sleep(2)

        # Take Screenshot 1: Arcade Hub (3D)
        if not os.path.exists("verification"):
            os.makedirs("verification")
        page.screenshot(path="verification/1_arcade_hub.png")
        print("Screenshot 1 taken: Arcade Hub")

        # 3. Toggle to Grid View
        print("Toggling to Grid View...")
        page.locator("#view-toggle-btn").click()
        time.sleep(1)

        # Verify Grid View visible
        expect(page.locator("#menu-grid")).to_be_visible()

        # Take Screenshot 2: Grid View
        page.screenshot(path="verification/2_grid_view.png")
        print("Screenshot 2 taken: Grid View")

        # 4. Toggle back to 3D
        print("Toggling back to 3D View...")
        page.locator("#view-toggle-btn").click()
        time.sleep(1)

        # 5. Navigate to Trophy Room (Simulate click or use transitionToState)
        print("Navigating to Trophy Room...")
        page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")

        # Wait for Trophy Room
        time.sleep(2)
        expect(page.locator("#trophy-room-container")).to_be_visible()
        expect(page.locator("#trophy-room-container canvas")).to_be_visible()

        # Take Screenshot 3: Trophy Room
        page.screenshot(path="verification/3_trophy_room.png")
        print("Screenshot 3 taken: Trophy Room")

        print("Verification Complete.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
