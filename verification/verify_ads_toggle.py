import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Go to the local server
        await page.goto("http://localhost:8000/index.html")

        # Wait for the page to load (checking for menu)
        try:
            await page.wait_for_selector("#menu", state="attached", timeout=10000)
        except:
            print("Menu not found, checking if loading failed.")

        print("Page loaded.")

        # 1. Verify Default Behavior (Ads Enabled)
        # --------------------------------------

        # Trigger Game Over #1 (Should NOT show ad - odd count)
        print("Triggering Game Over #1 (Counter=1, No Ad)...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")

        # Wait for overlay to exist
        await page.wait_for_selector("#ad-overlay", state="attached")

        is_hidden_1 = await page.evaluate("document.getElementById('ad-overlay').classList.contains('hidden')")
        if is_hidden_1:
            print("SUCCESS: Ad overlay is hidden on 1st Game Over.")
        else:
            print("FAILURE: Ad overlay is visible on 1st Game Over.")

        # Hide Game Over overlay
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # Trigger Game Over #2 (Should SHOW ad - even count)
        print("Triggering Game Over #2 (Counter=2, Show Ad)...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")
        await page.wait_for_timeout(500)

        is_hidden_2 = await page.evaluate("document.getElementById('ad-overlay').classList.contains('hidden')")
        if not is_hidden_2:
            print("SUCCESS: Ad overlay is visible on 2nd Game Over.")
        else:
            print("FAILURE: Ad overlay is hidden on 2nd Game Over.")

        # Close the ad
        await page.evaluate("document.getElementById('ad-close-btn').click()")
        await page.wait_for_timeout(500)
        # Close the game over overlay
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # 2. Verify Toggle OFF Behavior
        # -----------------------------

        print("Disabling Ads via Settings...")
        # Open Settings
        await page.evaluate("document.getElementById('settings-btn-hud').click()")
        await page.wait_for_timeout(500)

        # Click Toggle Button (We need to handle the alert)
        page.on("dialog", lambda dialog: dialog.accept())
        await page.click("#toggle-ads-btn")

        # Verify button text changed to OFF
        btn_text = await page.inner_text("#toggle-ads-btn")
        if "OFF" in btn_text:
            print("SUCCESS: Button text changed to OFF.")
        else:
            print(f"FAILURE: Button text is {btn_text}")

        # Close Settings
        await page.evaluate("document.getElementById('overlay-close-btn').click()")
        await page.wait_for_timeout(500)

        # Trigger Game Over #3 (Counter=3, No Ad)
        print("Triggering Game Over #3 (Counter=3, No Ad)...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # Trigger Game Over #4 (Counter=4, Should Show Ad normally, but DISABLED now)
        print("Triggering Game Over #4 (Counter=4, Ads Disabled -> No Ad)...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")
        await page.wait_for_timeout(500)

        is_hidden_4 = await page.evaluate("document.getElementById('ad-overlay').classList.contains('hidden')")
        if is_hidden_4:
            print("SUCCESS: Ad overlay is hidden when ads are disabled.")
        else:
            print("FAILURE: Ad overlay is visible when ads are disabled.")

        # 3. Verify Toggle ON Behavior (and different content)
        # --------------------------------------------------
        print("Re-enabling Ads...")
         # Open Settings
        await page.evaluate("document.getElementById('settings-btn-hud').click()")
        await page.wait_for_timeout(500)
        await page.click("#toggle-ads-btn")
        # Close Settings
        await page.evaluate("document.getElementById('overlay-close-btn').click()")
        await page.wait_for_timeout(500)
        # Close Game Over overlay from #4
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # Trigger Game Over #5 (Counter=5, No Ad)
        await page.evaluate("window.miniGameHub.showGameOver(100)")
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # Trigger Game Over #6 (Counter=6, Show Ad)
        print("Triggering Game Over #6 (Counter=6, Show Ad)...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")
        await page.wait_for_timeout(500)

        is_hidden_6 = await page.evaluate("document.getElementById('ad-overlay').classList.contains('hidden')")
        if not is_hidden_6:
            print("SUCCESS: Ad overlay is visible again.")

            # Check for random content (title)
            title = await page.inner_text("#ad-content-box h2")
            print(f"Ad Title Shown: {title}")

            # Take screenshot of the new ad
            await page.screenshot(path="verification/ads_toggle_verification.png")
            print("Screenshot saved to verification/ads_toggle_verification.png")
        else:
            print("FAILURE: Ad overlay did not reappear.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
