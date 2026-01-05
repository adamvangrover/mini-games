
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_new_game():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Navigate to the main page (Grid View preferred for consistency)
        await page.goto("http://localhost:8000/index.html")

        # Wait for loader to disappear
        loader = page.locator("#app-loader")
        if await loader.is_visible():
            await loader.click()
            await expect(loader).not_to_be_visible()

        # Ensure we are in Grid View (toggle if necessary)
        # Note: Default is 3D view on desktop, so we might need to toggle
        # Or we can use the game transition API directly for reliability

        # Verify "All In Hole" exists in registry by injecting JS
        game_exists = await page.evaluate("!!window.miniGameHub.gameRegistry['all-in-hole-game']")
        if not game_exists:
            print("ERROR: 'all-in-hole-game' not found in registry.")
            await browser.close()
            return

        print("Game registered successfully.")

        # Launch the game directly
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'all-in-hole-game' })")

        # Wait for game container
        await expect(page.locator("#all-in-hole-game")).to_be_visible()

        # Wait for the overlay title "DELICIOUS!" or HUD to confirm load
        # The game init creates #aih-score-hud
        await expect(page.locator("#aih-score-hud")).to_be_visible(timeout=10000)

        print("Game initialized successfully.")

        # Take screenshot
        await page.screenshot(path="verification/verify_allinhole.png")
        print("Screenshot saved to verification/verify_allinhole.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_new_game())
