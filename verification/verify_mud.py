from playwright.sync_api import sync_playwright
import time

def test_neon_mud():
    print("Testing Neon MUD...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_mud.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the output container exists
        output = page.query_selector('#mud-output')
        if not output:
            print("❌ MUD Output not found!")
            return False

        # Check if input exists
        input_el = page.query_selector('#mud-input')
        if not input_el:
            print("❌ MUD Input not found!")
            return False

        print("✅ Neon MUD UI loaded successfully.")

        # Test a command
        input_el.fill("look")
        input_el.press("Enter")
        time.sleep(0.5)

        # Test taking an item
        input_el.fill("take datapad")
        input_el.press("Enter")
        time.sleep(0.5)

        # Take a screenshot
        page.screenshot(path="verification/neon_mud.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_neon_mud()
