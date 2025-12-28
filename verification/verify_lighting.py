import asyncio
from playwright.async_api import async_playwright

async def verify_lighting():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--use-gl=swiftshader'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})

        print("Loading Hub...")
        await page.goto("http://localhost:8000")

        # Wait for loader to disappear
        await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

        # Wait for 3D init
        await page.wait_for_timeout(3000)

        # Take screenshot of Hub
        print("Capturing Hub...")
        await page.screenshot(path="verification/hub_improved.png")

        # Go to Trophy Room
        print("Going to Trophy Room...")
        await page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")

        # Wait for Trophy Room init
        await page.wait_for_timeout(3000)

        # Take screenshot of Trophy Room
        print("Capturing Trophy Room...")
        await page.screenshot(path="verification/trophy_room_improved.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_lighting())
