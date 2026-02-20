from playwright.sync_api import sync_playwright, expect
import time

def verify_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to hub...")
            page.goto("http://localhost:8090")

            print("Waiting for loader...")
            # Click to dismiss loader
            page.click("body", force=True)
            try:
                expect(page.locator("#app-loader")).to_be_hidden(timeout=5000)
            except:
                print("Loader didn't hide, clicking again...")
                page.click("body", force=True)

            time.sleep(2) # Wait for 3D init

            print("Taking screenshot of Hub...")
            page.screenshot(path="verification/hub_throttle_check.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_hub()
