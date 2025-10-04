import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath("index.html")

        await page.goto(f"file://{file_path}")

        # Click the button to start the Eclipse game
        await page.get_by_role("button", name="☀️ Eclipse").click()

        # Wait for the game container to be visible
        game_container = page.locator("#eclipse-game")
        await expect(game_container).to_be_visible()

        # Test the hint button and message system
        await page.get_by_role("button", name="Hint").click()

        # Take a screenshot of the game with the hint applied
        screenshot_path = "jules-scratch/verification/final_verification.png"
        await page.screenshot(path=screenshot_path)

        await browser.close()
        print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    asyncio.run(main())