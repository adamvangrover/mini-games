from playwright.sync_api import sync_playwright

def verify_accessibility_and_take_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8080")

        # Click through the loader
        page.click("body", force=True)

        # Wait for the HUD to appear
        page.wait_for_selector("#hub-hud")

        # Verify ARIA labels on HUD buttons
        shop_btn = page.locator("#shop-btn-hud")
        mute_btn = page.locator("#mute-btn-hud")
        boss_btn = page.locator("#boss-btn-hud")
        settings_btn = page.locator("#settings-btn-hud")

        print(f"Shop Label: {shop_btn.get_attribute('aria-label')}")
        print(f"Mute Label: {mute_btn.get_attribute('aria-label')}")
        print(f"Boss Label: {boss_btn.get_attribute('aria-label')}")
        print(f"Settings Label: {settings_btn.get_attribute('aria-label')}")

        assert shop_btn.get_attribute("aria-label") == "Store"
        assert boss_btn.get_attribute("aria-label") == "Toggle Boss Mode"
        assert settings_btn.get_attribute("aria-label") == "Settings"

        # Verify Guide Button (dynamically added)
        guide_btn = page.locator("#guide-btn-hud")
        print(f"Guide Label: {guide_btn.get_attribute('aria-label')}")
        assert guide_btn.get_attribute("aria-label") == "Game Guide"

        # Check Mute Toggle logic
        initial_label = mute_btn.get_attribute("aria-label")
        mute_btn.click()
        page.wait_for_timeout(500) # Wait for update
        toggled_label = mute_btn.get_attribute("aria-label")
        print(f"Mute Toggle: {initial_label} -> {toggled_label}")
        assert initial_label != toggled_label

        # Open Settings Overlay to check checkbox
        settings_btn.click()
        page.wait_for_selector("#settings-ads-toggle")
        ads_checkbox = page.locator("#settings-ads-toggle")
        print(f"Ads Checkbox Label: {ads_checkbox.get_attribute('aria-label')}")
        assert ads_checkbox.get_attribute("aria-label") == "Enable Ads"

        # Take Screenshot of Settings Overlay
        page.screenshot(path="verification/accessibility_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_accessibility_and_take_screenshot()
