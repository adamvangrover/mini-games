from playwright.sync_api import sync_playwright
import time

def test_mode7_racer():
    print("Testing Mode 7 Racer...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_mode7.html')

        # Wait a bit for initialization and async texture generation
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#mode7Racer-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        print("✅ Mode 7 Racer loaded successfully.")

        # Test driving forward
        page.keyboard.down("ArrowUp")
        time.sleep(1)
        page.keyboard.up("ArrowUp")

        # Take a screenshot
        page.screenshot(path="verification/mode7_racer.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_mode7_racer()
