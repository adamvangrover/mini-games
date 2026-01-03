
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_alpine():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        await page.goto("http://localhost:8000/index.html")

        # Wait for loader
        loader = page.locator("#app-loader")
        if await loader.is_visible():
            await loader.click()
            await expect(loader).not_to_be_visible()

        # Launch Alpine
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'alpine-game' })")

        # Wait for game container
        await expect(page.locator("#alpine-game")).to_be_visible()

        # Wait for HUD elements specific to the upgrade
        # The new HUD has #alp-temp and #alp-stamina in #alpine-hud
        await expect(page.locator("#alpine-hud")).to_be_visible(timeout=10000)
        await expect(page.locator("#alp-temp")).to_be_visible()

        print("Alpine Game initialized successfully.")

        # Take screenshot
        await page.screenshot(path="verification/verify_alpine_upgrade.png")
        print("Screenshot saved to verification/verify_alpine_upgrade.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_alpine())
