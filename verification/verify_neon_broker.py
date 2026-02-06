from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            # Wait for canvas to be present
            page.wait_for_selector("canvas")
            # Wait a bit for the game loop to render some frames
            time.sleep(2)

            # Ensure output directory exists
            if not os.path.exists("verification"):
                os.makedirs("verification")

            page.screenshot(path="verification/neon_broker.png")
            print("Screenshot saved to verification/neon_broker.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
