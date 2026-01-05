import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # 1. Load the game
        print("Loading game...")
        # Use local file server URL - assuming it's running on 8000
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_load_state("networkidle")

        # Bypass start screen
        print("Bypassing start screen...")
        await page.click("body", force=True)
        await asyncio.sleep(2)

        # 2. Unlock OS items via Console
        print("Unlocking OS items...")
        await page.evaluate("""
            window.miniGameHub.saveSystem.unlockItem('os_legacy');
            window.miniGameHub.saveSystem.unlockItem('os_terminal');
            window.miniGameHub.saveSystem.save();
        """)

        # 3. Enter Boss Mode
        print("Entering Boss Mode...")
        # Toggle via Alt+B simulation or direct call
        await page.evaluate("window.BossMode.instance.toggle(true)")
        await asyncio.sleep(3) # Wait for boot

        # Login
        print("Logging in...")
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(1)

        # 4. Verify Desktop
        desktop_visible = await page.eval_on_selector("#os-desktop-layer", "el => !el.classList.contains('hidden')")
        print(f"Desktop Visible: {desktop_visible}")
        if not desktop_visible:
            print("ERROR: Desktop not visible")
            await browser.close()
            return

        # 5. Switch to Legacy
        print("Switching to Legacy OS...")
        await page.evaluate("window.BossMode.instance.selectOS('legacy')")
        await asyncio.sleep(1)
        # Manually trigger login because selectOS just shows login screen
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(2)

        # Check container visibility
        legacy_visible = await page.eval_on_selector("#os-legacy-container", "el => !el.classList.contains('hidden')")
        print(f"Legacy OS Visible: {legacy_visible}")

        # 6. Switch to Hacker
        print("Switching to Hacker OS...")
        await page.evaluate("window.BossMode.instance.selectOS('hacker')")
        await asyncio.sleep(1)
        await page.evaluate("window.BossMode.instance.login()")
        await asyncio.sleep(1)

        hacker_visible = await page.eval_on_selector("#os-hacker-container", "el => !el.classList.contains('hidden')")
        print(f"Hacker OS Visible: {hacker_visible}")

        # 7. Test BSOD in Hacker Mode
        print("Triggering BSOD from Hacker Mode...")
        await page.evaluate("window.BossMode.instance.runHackerCommand('bsod')")
        await asyncio.sleep(1)
        bsod_visible = await page.eval_on_selector("#boss-bsod-container", "el => !el.classList.contains('hidden')")
        print(f"BSOD Visible: {bsod_visible}")

        # 8. Wait for Reboot
        print("Waiting for reboot...")
        await asyncio.sleep(6)
        login_visible = await page.eval_on_selector("#os-login-layer", "el => !el.classList.contains('hidden')")
        print(f"Rebooted to Login: {login_visible}")

        await browser.close()

asyncio.run(run())
