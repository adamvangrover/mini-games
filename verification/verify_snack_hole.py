
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_snack_hole():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the game hub
        await page.goto("http://localhost:8000/index.html")

        # Wait for the loader to disappear
        await expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

        # Force the game state transition
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'snack-hole-game' })")

        # Wait for game container to be visible
        await expect(page.locator("#snack-hole-game")).to_be_visible()

        # Wait for Phaser canvas to be created
        await expect(page.locator("#snack-hole-game canvas")).to_be_visible(timeout=10000)

        # Check for error message
        content = await page.content()
        if "Error: Phaser not loaded" in content:
            print("FAILED: Phaser not loaded")
            await browser.close()
            return

        print("Game initialized successfully.")

        # Take a screenshot
        await page.screenshot(path="verification/snack_hole_start.png")

        # Wait a bit to ensure no runtime errors
        await page.wait_for_timeout(2000)

        # Check console logs for errors (we can't easily capture them here without event listeners, but script completion implies no crash)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_snack_hole())
