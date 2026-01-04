import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # Assumes server running at 8000
            await page.goto("http://localhost:8000")
        except:
            print("Server not found.")
            return

        # Wait for loader
        try:
            await page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except:
            await page.click("body", force=True)

        # Go to Neon Hunter
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")

        # Wait for canvas
        await page.wait_for_selector("#neon-hunter canvas", timeout=10000)

        # Wait a bit for render
        await page.wait_for_timeout(2000)

        await page.screenshot(path="verification/neon_hunter.png")
        print("Screenshot saved to verification/neon_hunter.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
