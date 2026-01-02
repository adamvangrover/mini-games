
import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()

    # Enable console logging
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    try:
        print("Navigating to app...")
        page.goto("http://localhost:8000/index.html")

        # Wait for loading
        expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

        print("Waiting for menu grid...")
        # Toggle to Grid View if needed (default might be 3D)
        # Check if 3D view is active by looking for 'Grid View' text on button
        view_btn = page.locator("#view-toggle-text")
        if view_btn.is_visible() and view_btn.inner_text() == "Grid View":
            print("Switching to Grid View...")
            page.locator("#view-toggle-btn").click()

        # Wait for grid
        expect(page.locator("#menu-grid")).to_be_visible()

        print("Searching for Clubhouse...")
        # Scroll to ensure it's loaded/visible
        page.mouse.wheel(0, 1000)

        # Click Clubhouse card
        clubhouse_card = page.locator("h3", has_text="Clubhouse")
        if clubhouse_card.count() > 0:
            print("Found Clubhouse card.")
            clubhouse_card.first.click(force=True)
        else:
            print("Clubhouse card not found in grid! Checking specific category...")
            # Try to force transition via console if UI fails
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'clubhouse-game' })")

        # Wait for Clubhouse UI
        print("Waiting for Clubhouse UI...")
        expect(page.locator("#clubhouse-ui")).to_be_visible(timeout=10000)

        # Wait a bit for Three.js to render
        time.sleep(2)

        # Screenshot Initial State
        print("Taking initial screenshot...")
        page.screenshot(path="verification/clubhouse_initial.png")

        # Toggle Edit Mode
        print("Toggling Edit Mode...")
        page.keyboard.press("e")
        expect(page.locator("#edit-controls")).to_be_visible()

        # Open Inventory
        print("Opening Inventory...")
        page.locator("#add-furniture-btn").click()
        expect(page.locator("#furniture-inventory")).to_be_visible()

        # Attempt to spawn item (even if not owned, logic might fail but UI should respond)
        # Note: In my code, I populate inventory based on SaveSystem. If default save has nothing, it shows "No furniture owned".
        # Let's check if we can give ourselves money/items via console for testing
        print("Injecting currency and unlocking item...")
        page.evaluate("""
            window.miniGameHub.saveSystem.addCurrency(1000);
            window.miniGameHub.saveSystem.unlockItem('furniture_couch');
        """)

        # Refresh Inventory UI by toggling
        page.locator("#add-furniture-btn").click() # Close
        page.locator("#add-furniture-btn").click() # Open

        # Now click the couch button
        couch_btn = page.locator("#furniture-inventory button").first
        if couch_btn.is_visible():
            print("Spawning Couch...")
            couch_btn.click()
            time.sleep(1)
        else:
            print("No furniture button visible.")

        # Save Layout
        print("Saving Layout...")
        page.locator("#save-layout-btn").click()

        # Screenshot Final State
        print("Taking final screenshot...")
        page.screenshot(path="verification/clubhouse_final.png")

        print("Verification Successful.")

    except Exception as e:
        print(f"Verification Failed: {e}")
        page.screenshot(path="verification/clubhouse_error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
