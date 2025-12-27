import asyncio
import os
from playwright.async_api import async_playwright

async def verify_subset():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

        print("Navigating to Hub...")
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_selector("#menu-grid", state="attached")

        targets = ['life-sim-game', 'neon-city-game', 'trophy-room', 'neon-mines-game', 'store']

        for target in targets:
            print(f"Testing {target}...")
            console_logs.clear()

            if target == 'store':
                # Test store opening
                await page.evaluate("document.getElementById('shop-btn-menu').click()")
                await asyncio.sleep(1)
                visible = await page.evaluate("!document.getElementById('store-overlay').classList.contains('hidden')")
                print(f"  Store Visible: {visible}")
                await page.screenshot(path="verification/screenshots/store.png")
                await page.evaluate("document.getElementById('store-close-btn').click()")
                continue

            try:
                # Transition
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{target}' }})")
                await asyncio.sleep(3)

                # Screenshot
                os.makedirs("verification/screenshots", exist_ok=True)
                await page.screenshot(path=f"verification/screenshots/{target}.png")

                # Check errors
                errors = [log for log in console_logs if "[error]" in log.lower()]
                if errors:
                    print(f"  ERRORS in {target}:")
                    for e in errors: print(f"    {e}")
                else:
                    print(f"  {target}: OK")

                # Go back
                await page.evaluate("window.miniGameHub.goBack()")
                await asyncio.sleep(1)

            except Exception as e:
                print(f"  CRASH {target}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_subset())
