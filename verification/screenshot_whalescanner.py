from playwright.sync_api import sync_playwright
import time
import sys

def take_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to http://localhost:8000...")
            page.goto("http://localhost:8000")
            page.wait_for_load_state("networkidle")

            # Start the app
            loader = page.locator("#app-loader")
            if loader.is_visible():
                page.click("body")
                time.sleep(1)

            print("Launching WhaleScanner via JS...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'whale-scanner' })")
            time.sleep(3) # Wait for UI to render

            canvas = page.locator("#whale-scanner canvas")

            # Click canvas a few times to test deployment
            for _ in range(5):
                box = canvas.bounding_box()
                if box:
                    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                time.sleep(0.1)

            time.sleep(1) # let some heat build and agents process

            print("Taking screenshot...")
            page.screenshot(path="/home/jules/verification/whalescanner_overhaul.png")
            print("Done.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    take_screenshot()
