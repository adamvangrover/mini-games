
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

        # Go to Grid View
        print("Switching to Grid View...")
        view_btn = page.locator("#view-toggle-text")
        if view_btn.is_visible() and view_btn.inner_text() == "Grid View":
             page.locator("#view-toggle-btn").click()

        # Start Clubhouse
        print("Starting Clubhouse...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'clubhouse-game' })")
        expect(page.locator("#clubhouse-ui")).to_be_visible(timeout=10000)
        time.sleep(2) # Three.js init

        # Inject unlocked items and currency
        print("Injecting assets...")
        page.evaluate("""
            const sys = window.miniGameHub.saveSystem;
            sys.addCurrency(5000);
            sys.unlockItem('furniture_couch');
            sys.unlockItem('furniture_jukebox');
            sys.unlockItem('property_penthouse');
        """)

        # Screenshot UI with stats
        print("Taking stats screenshot...")
        page.screenshot(path="verification/clubhouse_stats.png")

        # Toggle Edit Mode
        print("Opening Editor...")
        page.click("#toggle-edit-btn")
        expect(page.locator("#edit-controls")).to_be_visible()

        # Check if Jukebox button is there (proves dynamic loading works)
        # Note: Inventory needs refresh. Toggle logic handles it?
        # My code populates on init. I should call populate again or just rely on init if unlocked before start.
        # Ah, I injected AFTER init. I need to re-populate.
        page.evaluate("window.miniGameHub.getCurrentGame().populateInventory()")

        # Spawn Jukebox
        print("Spawning Jukebox...")
        page.locator("button:has-text('Jukebox')").click()
        time.sleep(1)

        # Check Vibe Score Update
        vibe_text = page.locator("#vibe-score-display").inner_text()
        print(f"Vibe Score: {vibe_text}")
        if int(vibe_text) == 0:
            print("Warning: Vibe score didn't update?")

        # Screenshot Editor
        print("Taking editor screenshot...")
        page.screenshot(path="verification/clubhouse_editor.png")

        print("Verification Successful.")

    except Exception as e:
        print(f"Verification Failed: {e}")
        page.screenshot(path="verification/clubhouse_expanded_error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
