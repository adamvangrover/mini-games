import asyncio
from playwright.async_api import async_playwright

async def verify_hub_visual():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--use-gl=swiftshader'])
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        print("Loading Hub...")
        await page.goto("http://localhost:8000")
        await page.wait_for_selector("#app-loader", state="hidden")
        await page.wait_for_timeout(3000) # Wait for Three.js init

        # Screenshot Hub
        print("Taking Hub screenshot...")
        await page.screenshot(path="verification/hub_improved.png")

        # Test Nav Marker
        print("Testing Nav Marker...")
        # Click somewhere on the canvas
        await page.mouse.click(640, 360)
        await page.wait_for_timeout(500)
        await page.screenshot(path="verification/hub_nav_marker.png")

        # Go to Trophy Room
        print("Going to Trophy Room...")
        await page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")
        await page.wait_for_timeout(3000)

        # Screenshot Trophy Room
        print("Taking Trophy Room screenshot...")
        await page.screenshot(path="verification/trophy_room_improved.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_hub_visual())
