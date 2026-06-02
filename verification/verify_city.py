from playwright.sync_api import sync_playwright
import time

def test_micro_city():
    print("Testing Micro City...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_city.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#microCity-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        # Check UI Elements
        pop_display = page.query_selector('#mc-pop')
        if not pop_display:
            print("❌ Pop display not found!")
            return False

        print("✅ Micro City loaded successfully.")

        # Test applying a tool (Road)
        # Assuming center of screen is within canvas
        page.mouse.click(400, 300)
        time.sleep(0.5)

        # Take a screenshot
        page.screenshot(path="verification/micro_city.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_micro_city()
