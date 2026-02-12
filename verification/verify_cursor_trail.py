from playwright.sync_api import sync_playwright
import time

def verify_cursor_trail():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local server
        page.goto("http://localhost:8000")

        # Wait for page load
        time.sleep(2)

        # Force remove loader to ensure we can see the trail
        print("Removing loader...")
        page.evaluate("""
            const loader = document.getElementById('app-loader');
            if (loader) loader.remove();
        """)
        time.sleep(0.5)

        # Move mouse to generate trail
        # We need to simulate movement.
        center_x = 400
        center_y = 300

        # Spiral movement
        print("Moving mouse...")
        for i in range(40):
            x = center_x + (i * 10)
            y = center_y + (i * 5)
            page.mouse.move(x, y)
            time.sleep(0.03) # 30ms

        # Take screenshot immediately
        page.screenshot(path="verification/cursor_trail.png")
        print("Screenshot saved to verification/cursor_trail.png")

        browser.close()

if __name__ == "__main__":
    verify_cursor_trail()
