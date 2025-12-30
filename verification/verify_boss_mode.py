import asyncio
from playwright.async_api import async_playwright
import os

async def verify_boss_mode():
    port = os.environ.get("PORT", "8000")
    print(f"Starting verification on port {port}...")

    # Start server
    proc = await asyncio.create_subprocess_shell(
        f"python3 -m http.server {port}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    # Wait for server to start
    await asyncio.sleep(2)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}")
        await page.goto(url)

        # Wait for loading
        await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

        # Check initial state
        boss_overlay = page.locator("#boss-mode-overlay")
        await expect_hidden(boss_overlay, "Boss overlay should be hidden initially")

        # Trigger Boss Mode (Alt+B)
        print("Triggering Boss Mode (Alt+B)...")
        await page.keyboard.down("Alt")
        await page.keyboard.press("b")
        await page.keyboard.up("Alt")

        # Check if visible
        await expect_visible(boss_overlay, "Boss overlay should be visible after Alt+B")

        # Take screenshot
        await page.screenshot(path="verification/boss_mode_active.png")
        print("Screenshot saved to verification/boss_mode_active.png")

        # Trigger again to hide
        print("Triggering Boss Mode again to hide...")
        await page.keyboard.down("Alt")
        await page.keyboard.press("b")
        await page.keyboard.up("Alt")

        # Check if hidden
        await expect_hidden(boss_overlay, "Boss overlay should be hidden after toggling off")

        print("Verification successful!")
        await browser.close()

    proc.terminate()

async def expect_visible(locator, message):
    if not await locator.is_visible():
        raise AssertionError(message)
    print(f"PASS: {message}")

async def expect_hidden(locator, message):
    if await locator.is_visible():
        raise AssertionError(message)
    print(f"PASS: {message}")

if __name__ == "__main__":
    asyncio.run(verify_boss_mode())
