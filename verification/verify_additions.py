from playwright.sync_api import sync_playwright, expect
import time

def verify_features(page):
    # Go to local file
    page.goto("http://localhost:8000/index.html")

    # Wait for loader and click
    loader = page.locator("#app-loader")
    if loader.is_visible():
        loader.click()

    # Wait for Hub
    expect(page.locator("#arcade-hub-container canvas")).to_be_visible()
    time.sleep(3)

    # 1. Verify SoundManager Analyser
    has_analyser = page.evaluate("!!window.miniGameHub.soundManager.analyser")
    print(f"Analyser Present: {has_analyser}")
    if not has_analyser:
        raise Exception("SoundManager missing AnalyserNode")

    # 2. Verify Store Integration
    # Cheat currency
    page.evaluate("window.miniGameHub.saveSystem.addCurrency(1000)")

    # Open Shop
    page.locator("#shop-btn-hud").click()
    page.wait_for_selector("#store-overlay")
    time.sleep(1)

    # Scroll to Ambient Disk
    ambient_btn = page.locator("button[data-id='disk_ambient']")
    ambient_btn.scroll_into_view_if_needed()

    # It should be a BUY button first (cost 100)
    expect(ambient_btn).to_contain_text("100")

    # Buy it
    ambient_btn.click()
    time.sleep(1)

    # Now it should be EQUIP button
    equip_btn = page.locator("button[data-id='disk_ambient']")
    expect(equip_btn).to_have_text("Equip")

    # Equip it
    equip_btn.click()
    time.sleep(1)

    # Verify SoundManager style changed
    current_style = page.evaluate("window.miniGameHub.soundManager.currentStyle")
    print(f"Current Style: {current_style}")

    if current_style != "ambient":
         raise Exception(f"Failed to equip ambient style. Got: {current_style}")

    # Take screenshot of the equipped item
    page.screenshot(path="verification/store_integration.png")

    # Close shop
    page.keyboard.press("Escape")
    time.sleep(1)

    # 3. Verify Ghosts (Visual)
    time.sleep(2)
    page.screenshot(path="verification/hub_ghosts.png")
    print("Verification Complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page()
        try:
            verify_features(page)
        except Exception as e:
            print(f"FAIL: {e}")
            page.screenshot(path="verification/fail.png")
        finally:
            browser.close()
