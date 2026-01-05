import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # 1. Load game
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_load_state("networkidle")
        await page.click("body", force=True)
        await asyncio.sleep(2)

        # 2. Unlock
        await page.evaluate("""
            window.miniGameHub.saveSystem.unlockItem('os_legacy');
            window.miniGameHub.saveSystem.unlockItem('os_terminal');
            window.miniGameHub.saveSystem.save();
        """)

        # 3. Boss Mode - Modern
        await page.evaluate("window.BossMode.instance.toggle(true)")
        await asyncio.sleep(2)
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(2)
        await page.screenshot(path="verification/boss_mode_modern.png")
        print("Captured Modern Mode")

        # 4. Boss Mode - Legacy
        await page.evaluate("window.BossMode.instance.selectOS('legacy')")
        await asyncio.sleep(1)
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(2)
        await page.screenshot(path="verification/boss_mode_legacy.png")
        print("Captured Legacy Mode")

        # 5. Boss Mode - Hacker
        await page.evaluate("window.BossMode.instance.selectOS('hacker')")
        await asyncio.sleep(1)
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(1)
        await page.evaluate("window.BossMode.instance.runHackerCommand('matrix')")
        await asyncio.sleep(2) # Let matrix rain fall
        await page.screenshot(path="verification/boss_mode_hacker.png")
        print("Captured Hacker Mode")

        await browser.close()

asyncio.run(run())
