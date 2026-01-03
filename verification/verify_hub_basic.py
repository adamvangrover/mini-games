from playwright.sync_api import sync_playwright, expect
import time

def verify_app_load(page):
    # Navigate to the local server
    page.goto("http://localhost:8000/index.html")

    # Wait for the loader to disappear
    page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

    # Check if the main menu or hub is visible
    # Initially it might be 3D view or menu grid depending on logic
    # We will try to toggle to grid view if not already there

    # Wait a bit for initialization
    time.sleep(2)

    # Take a screenshot of the initial state (3D Hub likely)
    page.screenshot(path="verification/verification_initial.png")

    # Try to find the view toggle button and click it to ensure Grid View works
    toggle_btn = page.locator("#view-toggle-btn")
    if toggle_btn.is_visible():
        toggle_btn.click()
        time.sleep(1)
        page.screenshot(path="verification/verification_grid.png")

        # Verify that menu items are populated
        menu_items = page.locator("#menu-grid > div")
        count = menu_items.count()
        print(f"Found {count} menu items.")
        if count == 0:
            raise Exception("Menu grid is empty!")

    else:
        # Maybe it started in 2D mode?
        page.screenshot(path="verification/verification_2d_start.png")
        menu_items = page.locator("#menu-grid > div")
        count = menu_items.count()
        print(f"Found {count} menu items in 2D mode.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_load(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/verification_failed.png")
        finally:
            browser.close()
