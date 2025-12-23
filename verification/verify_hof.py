import asyncio
from playwright.async_api import async_playwright

async def verify_hall_of_fame():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})

        # Capture logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Loading Hub...")
        await page.goto("http://localhost:8000")
        await page.wait_for_timeout(2000)

        # Ensure Grid View to access Hall of Fame (if it's in the grid)
        # Or launch directly via console if needed, but better to use UI
        print("Switching to Grid View...")
        try:
             text = await page.inner_text("#view-toggle-text")
             if "Grid" in text:
                 await page.click("#view-toggle-btn", force=True)
                 await page.wait_for_timeout(1000)
        except:
            pass

        # Find Hall of Fame card
        # Hall of Fame logic in main.js: 'hall-of-fame': { ..., module: HallOfFame }
        # Click it
        print("Opening Hall of Fame...")

        # We can simulate click or state change
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'hall-of-fame' })")

        await page.wait_for_timeout(2000)

        await page.screenshot(path="verification/hall_of_fame_new.png")
        print("Screenshot saved.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_hall_of_fame())
