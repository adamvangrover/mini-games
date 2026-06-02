from playwright.sync_api import sync_playwright
import time

def test_jelly_racer():
    print("Testing Jelly Racer...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_jelly.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#jellyRacer-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        # Check UI Elements
        score_display = page.query_selector('#jr-score')
        if not score_display:
            print("❌ Score display not found!")
            return False

        print("✅ Jelly Racer loaded successfully.")

        # Test physics interaction (drive right)
        page.keyboard.down("ArrowRight")
        time.sleep(1)
        page.keyboard.up("ArrowRight")

        # Wait for physics to settle a bit
        time.sleep(0.5)

        # Take a screenshot
        page.screenshot(path="verification/jelly_racer.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_jelly_racer()
