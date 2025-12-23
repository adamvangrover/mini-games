import asyncio
from playwright.async_api import async_playwright

async def screenshot_hub():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})
        await page.goto("http://localhost:8000")

        # Ensure grid view
        try:
             text = await page.inner_text("#view-toggle-text")
             if "Grid" in text:
                 print("Switching to Grid View...")
                 await page.click("#view-toggle-btn", force=True)
                 await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"Toggle error: {e}")

        await page.wait_for_selector("#menu-grid")
        await page.wait_for_timeout(2000) # Wait for animation/layout

        await page.screenshot(path="verification/hub_grid_final.png")
        print("Screenshot saved to verification/hub_grid_final.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(screenshot_hub())
