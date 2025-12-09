
from playwright.sync_api import sync_playwright

def verify_store(page):
    # Go to the local server
    page.goto("http://localhost:8000")

    # Wait for the Main Menu to be visible (transition from Hub to Menu might take a moment if 3D loads)
    # However, by default 3D Hub loads. We need to interact with it.

    # Wait for HUD Shop Button
    shop_btn = page.locator("#shop-btn-hud")
    shop_btn.wait_for(state="visible", timeout=10000)

    # Click it
    shop_btn.click(force=True)

    # Wait for Store Overlay
    overlay = page.locator("#store-overlay")
    overlay.wait_for(state="visible")

    # Take screenshot of Store
    page.screenshot(path="verification/store_overlay.png")
    print("Store overlay screenshot taken.")

    # Close Store
    close_btn = page.locator("#store-close-btn")
    close_btn.click()

    # Wait for overlay to hide
    overlay.wait_for(state="hidden")

    # Now test the Menu Grid Shop Button (switch to 2D view first)
    toggle_btn = page.locator("#view-toggle-btn")
    toggle_btn.click()

    # Wait for Menu Grid Shop Button
    menu_shop_btn = page.locator("#shop-btn-menu")
    menu_shop_btn.wait_for(state="visible")

    # Click it
    menu_shop_btn.click()

    # Wait for Store Overlay again
    overlay.wait_for(state="visible")

    # Take another screenshot
    page.screenshot(path="verification/store_overlay_grid.png")
    print("Store overlay (grid view) screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_store(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
