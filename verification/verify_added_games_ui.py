
import asyncio
import subprocess
import time
from playwright.async_api import async_playwright, expect
import re

async def run():
    # Start python server in background
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2) # Wait for server to start

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Navigate to the main menu
            await page.goto("http://localhost:8000/index.html")
            await page.wait_for_load_state("networkidle")

            # Wait for loader to disappear
            loader = page.locator("#app-loader")
            try:
                await expect(loader).to_have_class(re.compile(r"opacity-0"), timeout=10000)
            except:
                pass

            await page.wait_for_timeout(2000)

            # Toggle to Grid View if needed
            toggle_btn = page.locator("#view-toggle-btn")
            if await toggle_btn.is_visible():
                await toggle_btn.click(force=True)
                await page.wait_for_timeout(1000)

            # --- Verify Exiled Spark ---
            print("Verifying Exiled Spark...")
            exiled_card = page.get_by_text("Exiled Spark")
            if await exiled_card.count() > 0:
                await exiled_card.first.click(force=True)
                await page.wait_for_timeout(2000) # Wait for game to load

                # Check for Exiled Spark UI elements
                await expect(page.locator(".exiled-game")).to_be_visible()
                # Be more specific or use first
                await expect(page.locator(".exiled-game h1").first).to_contain_text("EXILED SPARK")

                await page.screenshot(path="verification/verify_exiled.png")
                print("Exiled Spark verified.")

                # Go back
                await page.evaluate("window.miniGameHub.goBack()")
                await page.wait_for_timeout(1000)
            else:
                print("Exiled Spark card not found!")

            # --- Verify Rage Quit 3D ---
            print("Verifying Rage Quit 3D...")
            # Rage Quit is in 3D Immersive category
            rage_card = page.get_by_text("Rage Quit 3D")
            if await rage_card.count() > 0:
                await rage_card.first.click(force=True)
                await page.wait_for_timeout(2000) # Wait for game to load

                # Check for Rage Quit UI elements
                await expect(page.locator("#rq-ui-layer")).to_be_visible()
                await expect(page.locator("#instructions h1").first).to_have_text("THE PROGRAM")

                await page.screenshot(path="verification/verify_rage_quit.png")
                print("Rage Quit 3D verified.")

                # Go back
                await page.evaluate("window.miniGameHub.goBack()")
                await page.wait_for_timeout(1000)

            else:
                print("Rage Quit 3D card not found!")


    finally:
        server.kill()

if __name__ == "__main__":
    asyncio.run(run())
