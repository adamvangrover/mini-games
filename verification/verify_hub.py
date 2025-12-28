from playwright.sync_api import sync_playwright

def verify_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate desktop size
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to Hub...")
        page.goto("http://localhost:8000/index.html")

        # Wait for loading
        page.wait_for_timeout(3000)

        # Check if Canvas is present
        print("Checking for canvas...")
        canvas = page.locator("canvas")
        if canvas.count() > 0:
            print("Canvas found.")
            page.screenshot(path="verification/hub_3d.png")
        else:
            print("Canvas NOT found!")
            # Maybe it fell back to grid?
            page.screenshot(path="verification/hub_failed.png")

        # Test switching to Grid View
        print("Switching to Grid View...")
        toggle_btn = page.locator("#view-toggle-btn")
        if toggle_btn.is_visible():
            toggle_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/hub_grid.png")

            # Verify Categories
            headers = page.locator("#menu-grid h2")
            count = headers.count()
            print(f"Found {count} category headers.")
            if count > 0:
                print("Categories verified.")
            else:
                print("No category headers found!")
        else:
            print("Toggle button not visible.")

        # Test Trophy Room
        print("Testing Trophy Room transition...")
        # Reload to reset state easily or switch back?
        # Let's use evaluate to force transition if button hard to click in 3D
        page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")
        page.wait_for_timeout(3000)
        page.screenshot(path="verification/trophy_room.png")

        browser.close()

if __name__ == "__main__":
    verify_hub()
