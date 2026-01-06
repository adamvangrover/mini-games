
from playwright.sync_api import sync_playwright
import time

def verify_boss_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8000/index.html")

            # Dismiss Loader
            print("Dismissing Loader...")
            # Wait for loader to exist in DOM
            page.wait_for_selector("#app-loader", state="attached")
            # Click to dismiss (force=True to bypass pointer-events checks if needed)
            page.locator("body").click(force=True)

            # Wait for loader to finish
            page.wait_for_selector("#app-loader", state="hidden", timeout=10000)
            print("Loader Dismissed.")

            # Ensure BossMode is initialized
            page.evaluate("if (!window.BossMode || !window.BossMode.instance) console.error('BossMode not found');")

            # 1. Trigger Boss Mode (Alt+B)
            print("Triggering Boss Mode...")
            page.keyboard.down("Alt")
            page.keyboard.press("b")
            page.keyboard.up("Alt")

            # Wait for Overlay
            page.wait_for_selector("#boss-mode-overlay", state="visible")
            print("Boss Mode Overlay Visible.")

            # Wait for Boot Sequence to finish and Login to appear
            # Boot takes ~2.5s
            page.wait_for_selector("#os-login-layer", state="visible", timeout=6000)
            print("Login Screen Visible.")

            # 2. Login
            print("Logging in...")
            page.fill("#boss-login-input", "123")
            page.click("#boss-login-submit")

            # Wait for Desktop
            page.wait_for_selector("#os-desktop-layer", state="visible")
            print("Desktop Visible.")

            # 3. Open App (Excel)
            print("Opening Excel...")
            # Using force click because something might be overlapping or z-index issue
            # But dblclick with force is tricky in Playwright
            # We will use evaluate to trigger it or ensure no overlap

            # First, check if Mission Control window is open and blocking (it auto-opens)
            # We can close it first or move it
            # Let's just try to open Excel via the Start Menu as it is safer

            print("Opening Start Menu...")
            page.click("#boss-start-btn", force=True)
            page.wait_for_selector("#boss-startmenu-container div", state="visible")
            print("Start Menu Opened.")

            print("Clicking Excel in Start Menu...")
            # Find Excel in start menu
            page.locator("#boss-startmenu-container button").filter(has_text="Excel").click()

            # Wait for Window
            # There might be 2 windows now (Mission Control + Excel)
            page.wait_for_selector(".os-window", timeout=3000)
            print("Excel Window Opened.")

            # 5. Check Windows
            windows = page.locator(".os-window")
            count = windows.count()
            print(f"Windows Open: {count}")
            if count < 2:
                print("Warning: Expected at least 2 windows (Mission Control + Excel)")

            # 6. Panic Exit (Double Esc)
            print("Testing Panic Exit...")
            page.keyboard.press("Escape")
            time.sleep(0.1)
            page.keyboard.press("Escape")

            page.wait_for_selector("#boss-mode-overlay", state="hidden")
            print("Panic Exit Successful.")

            print("VERIFICATION PASSED")

        except Exception as e:
            print(f"VERIFICATION FAILED: {e}")
            page.screenshot(path="verification/boss_mode_fail.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_boss_mode()
