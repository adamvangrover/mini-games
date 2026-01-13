from playwright.sync_api import sync_playwright
import time

def verify_cursor_trail():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local server
        page.goto("http://localhost:8000")

        # Wait for loading to finish (click loader)
        try:
            page.locator("#app-loader").click(timeout=5000)
        except:
            pass

        # Move mouse to generate trail
        # We need to simulate movement.
        center_x = 400
        center_y = 300

        # Spiral movement
        for i in range(20):
            x = center_x + (i * 10)
            y = center_y + (i * 5)
            page.mouse.move(x, y)
            time.sleep(0.01) # Small delay to allow trail to spawn

        # Take screenshot immediately
        page.screenshot(path="verification/cursor_trail.png")
        print("Screenshot saved to verification/cursor_trail.png")

        browser.close()

if __name__ == "__main__":
    verify_cursor_trail()
