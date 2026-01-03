
import asyncio
from playwright.async_api import async_playwright

async def verify_math_blaster():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Load the game
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_selector("#app-loader", state="hidden")

        # Wait for initialization
        await asyncio.sleep(2)

        print("Launching Math Blaster...")
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'math-blaster' })")

        await page.wait_for_selector("#math-blaster canvas")
        print("Game canvas found.")

        # Wait for game to stabilize
        await asyncio.sleep(2)

        # Verify initial state (Trash Zapper)
        # We can check if the canvas context has drawn something specific, or just check console logs
        # But simpler, let's just verify no errors and that we are in the game

        # Check if game instance exists
        exists = await page.evaluate("!!window.miniGameHub.getCurrentGame()")
        assert exists, "Game instance not found"

        print("Game initialized successfully.")

        # Take screenshot
        await page.screenshot(path="verification/math_blaster_init.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_math_blaster())
