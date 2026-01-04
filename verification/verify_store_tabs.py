from playwright.sync_api import sync_playwright, expect

def verify_store_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8000")

            # 1. Click to dismiss loader
            page.click("body")

            # 2. Wait for loader to disappear
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

            # 3. Click HUD "Shop" button
            # Note: HUD is pointer-events: auto, over the 3D canvas
            page.locator("#shop-btn-hud").click()

            # 4. Wait for Store Overlay
            store_overlay = page.locator("#store-overlay")
            expect(store_overlay).to_be_visible()

            # 5. Verify Tabs Exist
            tabs = page.locator(".store-tab")
            expect(tabs).to_have_count(5) # All, Arcade, Customization, Music, Property

            # 6. Click "Music" Tab
            page.locator(".store-tab", has_text="Music").click()

            # 7. Verify "Synthwave Disk" is visible
            synth_disk = page.locator("text=Synthwave Disk")
            expect(synth_disk).to_be_visible()

            # 8. Screenshot
            page.screenshot(path="verification/screenshot_store_tabs.png")
            print("Store verification successful.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_store.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_store_tabs()
