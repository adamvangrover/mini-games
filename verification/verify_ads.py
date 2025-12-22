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

        # Trigger Game Over #1 (Should NOT show ad)
        print("Triggering Game Over #1...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")

        # Check if ad overlay is hidden
        # The AdsManager creates the element on instantiation or on demand?
        # AdsManager.getInstance() is called in main.js, which calls _initContainer().
        # So #ad-overlay should exist.

        # Wait for overlay to exist
        await page.wait_for_selector("#ad-overlay", state="attached")

        is_hidden_1 = await page.evaluate("""
            document.getElementById('ad-overlay').classList.contains('hidden')
        """)

        if is_hidden_1:
            print("SUCCESS: Ad overlay is hidden on 1st Game Over.")
        else:
            print("FAILURE: Ad overlay is visible on 1st Game Over.")

        # Hide Game Over overlay to clean up view
        await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

        # Trigger Game Over #2 (Should SHOW ad)
        print("Triggering Game Over #2...")
        await page.evaluate("window.miniGameHub.showGameOver(100)")

        # Allow a brief moment for DOM update
        await page.wait_for_timeout(500)

        # Check if ad overlay is visible
        is_hidden_2 = await page.evaluate("""
            document.getElementById('ad-overlay').classList.contains('hidden')
        """)

        if not is_hidden_2:
            print("SUCCESS: Ad overlay is visible on 2nd Game Over.")
        else:
            print("FAILURE: Ad overlay is hidden on 2nd Game Over.")

        # Take a screenshot
        await page.screenshot(path="verification/ads_verification.png")
        print("Screenshot saved to verification/ads_verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
