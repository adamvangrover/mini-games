from playwright.sync_api import sync_playwright
import time
import os

def test_gravity_slingshot():
    print("Testing Gravity Slingshot...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server to allow ES modules
        page.goto('http://localhost:8000/test_gravity.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#gravitySlingshot-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        # Check if the text rendered
        level_display = page.query_selector('#gs-level-display')
        if not level_display:
            print("❌ UI elements not found!")
            return False

        print("✅ Gravity Slingshot loaded successfully.")

        # Take a screenshot for visual verification
        page.screenshot(path="verification/gravity_slingshot.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_gravity_slingshot()
