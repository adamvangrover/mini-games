import asyncio
from playwright.async_api import async_playwright

async def verify_gameover_fixed():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to Hub...")
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_selector("#menu-grid", state="attached")

        print("Triggering Game Over...")
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'clicker-game' })")
        await asyncio.sleep(1)

        for i in range(1, 4):
            print(f"  Game Over #{i}")
            # Ensure no overlays interfering
            await page.evaluate("document.getElementById('global-overlay').classList.add('hidden')")

            await page.evaluate("window.miniGameHub.showGameOver(100)")
            await asyncio.sleep(1)

            # Check for Ad
            ad_visible = await page.evaluate("!!document.getElementById('ad-overlay') && !document.getElementById('ad-overlay').classList.contains('hidden')")
            print(f"    Ad Visible: {ad_visible}")

            if ad_visible:
                 print("    Ad Detected! Waiting 6s for timer...")
                 await asyncio.sleep(6)
                 # Click close button
                 print("    Clicking Close Button...")
                 await page.evaluate("document.getElementById('ad-close-btn').click()")
                 await asyncio.sleep(1)

                 # Ad should be gone, verify callback ran (Game Over overlay should appear now)
                 overlay_visible = await page.evaluate("!document.getElementById('global-overlay').classList.contains('hidden')")
                 print(f"    Game Over Overlay Visible (after Ad): {overlay_visible}")
            else:
                 # Standard Game Over
                 overlay_visible = await page.evaluate("!document.getElementById('global-overlay').classList.contains('hidden')")
                 print(f"    Game Over Overlay Visible: {overlay_visible}")

            # Close Overlay to reset for next iteration
            await page.evaluate("document.getElementById('overlay-retry-btn').click()")
            await asyncio.sleep(1)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_gameover_fixed())
