
import asyncio
from playwright.async_api import async_playwright

async def verify_hub_and_trophy():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:8000/index.html")
            await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

            # Screenshot of 3D Hub (Initial View)
            await asyncio.sleep(2) # Wait for three.js to render
            await page.screenshot(path="verification/hub_3d_v2.png")
            print("Captured 3D Hub screenshot.")

            # Switch to Grid View
            await page.evaluate("document.getElementById('view-toggle-btn').click()")
            await page.wait_for_selector("#menu-grid", state="visible", timeout=5000)
            await page.screenshot(path="verification/hub_grid_v2.png")
            print("Captured Grid View screenshot.")

            # Go to Trophy Room
            await page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")
            await page.wait_for_selector("#trophy-room", state="visible", timeout=10000)
            await asyncio.sleep(2) # Wait for render
            await page.screenshot(path="verification/trophy_room_v2.png")
            print("Captured Trophy Room screenshot.")

        except Exception as e:
            print(f"Failed: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_hub_and_trophy())
