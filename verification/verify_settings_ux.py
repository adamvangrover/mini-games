from playwright.sync_api import sync_playwright
import time

def verify_settings_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:8000/index.html")

            # Dismiss loader
            page.click("body", force=True)
            time.sleep(1)

            # Switch to Grid View to ensure HUD is interactive (or just use HUD directly)
            # The HUD buttons are always visible in desktop view, but let's be safe
            print("Opening Settings...")

            # Check if we are in mobile or desktop view logic
            # The HUD button id is 'settings-btn-hud'

            page.wait_for_selector("#settings-btn-hud")
            page.click("#settings-btn-hud", force=True)

            # Wait for overlay
            print("Waiting for settings overlay...")
            page.wait_for_selector("#global-overlay", state="visible")

            # Verify Import Button exists
            import_btn = page.locator("#import-btn")
            if import_btn.is_visible():
                print("✅ Import button found.")
            else:
                print("❌ Import button NOT found.")
                return

            # Test Empty Input
            print("Testing empty input...")
            import_btn.click()

            # In the current (old) code, empty input does nothing (return)
            # In the new code, we expect a status message

            # We can check the status element
            status_el = page.locator("#import-status")
            status_text = status_el.text_content()
            print(f"Status text after empty click: '{status_text}'")

            # Now test the interaction flow
            # We can't easily test the native 'confirm' dialog without handling it,
            # but for this repro script we just want to ensure we can reach this point.

            print("✅ Settings UX Verification Script initialized.")

        except Exception as e:
            print(f"❌ Error: {e}")
            page.screenshot(path="verification/error_settings.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_settings_ux()
