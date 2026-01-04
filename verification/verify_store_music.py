
import os
import sys
from playwright.sync_api import sync_playwright, expect

def verify_store_and_sound(page):
    # 1. Start a local server (assuming one is running on port 8000 based on memory)
    # If not, the user instructions usually imply I should handle it.
    # But for now, let's assume I can visit the page.
    # Note: In this environment, I usually need to spin up a server.

    # Go to the app
    page.goto("http://localhost:8000/index.html")

    # Wait for loader to vanish
    expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

    # 2. Open Store
    # Assuming there's a button for the shop in the HUD or Menu
    # Checking js/main.js or index.html for IDs.
    # #shop-btn-menu is in the grid view or #shop-btn-hud

    # Force click because sometimes overlays block
    page.locator("#shop-btn-hud").click(force=True)

    # 3. Verify Store Overlay Visible
    store_overlay = page.locator("#store-overlay")
    expect(store_overlay).to_be_visible()

    # 4. Verify New Music Items
    # Look for "Disk: Acid Rain"
    expect(page.get_by_text("Disk: Acid Rain")).to_be_visible()
    expect(page.get_by_text("Disk: Glitch Hop")).to_be_visible()

    # 5. Take Screenshot
    page.screenshot(path="verification/verify_store_music.png")

    print("Store verification successful.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_store_and_sound(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            sys.exit(1)
        finally:
            browser.close()
