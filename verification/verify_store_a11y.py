from playwright.sync_api import sync_playwright

def verify_store_accessibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using local server)
        page.goto("http://localhost:8000")

        # Bypass loading screen (click body)
        page.click("body", force=True)

        # Wait for menu to appear (using timeout to be safe)
        page.wait_for_timeout(2000)

        # Open Shop Overlay
        # Try clicking the HUD shop button
        page.click("#shop-btn-hud", force=True)

        # Wait for Shop Overlay to be visible
        page.wait_for_selector("#store-overlay")

        # Verify Semantic Tabs
        print("Checking for role='tablist'...")
        tablist = page.get_by_role("tablist", name="Store Categories")
        if tablist.count() > 0:
            print("✅ Found role='tablist'")
        else:
            print("❌ Missing role='tablist'")

        print("Checking for role='tab'...")
        tabs = page.get_by_role("tab")
        count = tabs.count()
        print(f"Found {count} tabs.")
        if count > 0:
             print("✅ Found role='tab'")
             # Check aria-selected
             selected = tabs.first.get_attribute("aria-selected")
             print(f"First tab aria-selected: {selected}")
        else:
             print("❌ Missing role='tab'")

        # Verify Item Buttons have Contextual Labels
        # We need to find a 'Buy' or 'Equip' button
        # Wait for items to populate
        page.wait_for_timeout(1000)

        print("Checking item buttons...")
        # Try to find a button that starts with "Buy" or "Equip" in its aria-label
        # Note: Playwright's get_by_label matches exact or contains depending on config, usually exact.
        # Let's inspect the HTML directly for verification script flexibility

        buttons = page.locator("#store-items-panel button")
        count_btns = buttons.count()
        print(f"Found {count_btns} buttons in store panel.")

        found_contextual = False
        for i in range(min(5, count_btns)):
            btn = buttons.nth(i)
            label = btn.get_attribute("aria-label")
            text = btn.text_content()
            print(f"Button {i}: Text='{text.strip()}' Label='{label}'")
            if label and ("Buy" in label or "Equip" in label or "Owned" in label or "Active" in label):
                found_contextual = True

        if found_contextual:
            print("✅ Found contextual aria-labels on buttons.")
        else:
            print("❌ Did not find expected contextual labels.")

        # Take screenshot
        page.screenshot(path="verification/verify_store_a11y.png")
        print("Screenshot saved to verification/verify_store_a11y.png")

        browser.close()

if __name__ == "__main__":
    verify_store_accessibility()
