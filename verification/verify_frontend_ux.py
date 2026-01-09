from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:8000/index.html")

            # Dismiss loader
            page.click("body", force=True)
            time.sleep(1)

            # Open Settings
            page.wait_for_selector("#settings-btn-hud")
            page.click("#settings-btn-hud", force=True)
            page.wait_for_selector("#global-overlay", state="visible")

            # Click Import with no data (to show warning message)
            import_btn = page.locator("#import-btn")
            import_btn.click()
            time.sleep(0.5)

            # Screenshot with warning message
            page.screenshot(path="verification/settings_ux_warning.png")
            print("Screenshot saved: verification/settings_ux_warning.png")

            # Paste dummy data and click to trigger Confirmation State
            page.fill("#import-area", "invalid_json_data")
            import_btn.click()
            time.sleep(0.5)

            # Screenshot confirmation state
            page.screenshot(path="verification/settings_ux_confirm.png")
            print("Screenshot saved: verification/settings_ux_confirm.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
