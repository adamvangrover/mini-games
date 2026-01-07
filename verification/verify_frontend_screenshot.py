import asyncio
from playwright.async_api import async_playwright

async def verify_frontend():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        print("Navigating to app...")
        await page.goto("http://localhost:8000")

        # Dismiss Loader
        try:
            loader = await page.wait_for_selector("#app-loader", timeout=5000)
            if loader:
                await page.click("body", force=True)
                await page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except:
            pass

        await page.wait_for_timeout(2000)

        # Ensure Grid View for better screenshot
        try:
             text = await page.inner_text("#view-toggle-text")
             if "Grid" in text:
                 await page.click("#view-toggle-btn", force=True)
                 await page.wait_for_selector("#menu-grid", state="visible", timeout=2000)
        except:
            pass

        await page.screenshot(path="verification/final_verification.png")
        print("Screenshot taken.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_frontend())
