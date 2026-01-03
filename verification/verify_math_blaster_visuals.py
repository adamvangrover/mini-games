
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_math_blaster_visuals():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"ERROR: {err}"))

        # Load the game
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_selector("#app-loader", state="hidden")

        # Force Grid View logic
        try:
             # Check if toggle is visible and click it
             if await page.is_visible("#view-toggle-btn"):
                 await page.click("#view-toggle-btn")
                 await page.wait_for_selector("#menu-grid", state="visible")
        except Exception as e:
             print(f"Toggle view error (ignoring): {e}")

        # Launch Math Blaster
        print("Launching Math Blaster...")
        await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'math-blaster' })")

        # Wait for canvas
        canvas = page.locator("#math-blaster canvas")
        await expect(canvas).to_be_visible()

        # Wait for initialization
        await asyncio.sleep(2)

        # Check instance
        instance_type = await page.evaluate("window.miniGameHub.getCurrentGame().constructor.name")
        print(f"Game Instance Type: {instance_type}")

        keys = await page.evaluate("Object.keys(window.miniGameHub.getCurrentGame())")
        print(f"Instance Keys: {keys}")

        # Take screenshot of Trash Zapper
        await page.screenshot(path="verification/math_blaster_trash_zapper.png")
        print("Screenshot of Trash Zapper taken.")

        # Transition to Number Recycler (Cheat)
        print("Switching to Number Recycler...")
        # Check if switchState exists
        has_switch = await page.evaluate("'switchState' in window.miniGameHub.getCurrentGame()")
        print(f"Has switchState: {has_switch}")

        if has_switch:
            await page.evaluate("window.miniGameHub.getCurrentGame().switchState('RECYCLER')")
            await asyncio.sleep(1)
            await page.screenshot(path="verification/math_blaster_number_recycler.png")
            print("Screenshot of Number Recycler taken.")

            # Transition to Boss (Cheat)
            print("Switching to Boss...")
            await page.evaluate("window.miniGameHub.getCurrentGame().switchState('BOSS')")
            await asyncio.sleep(1)
            await page.screenshot(path="verification/math_blaster_boss.png")
            print("Screenshot of Boss taken.")
        else:
            print("Cannot switch state, missing method.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_math_blaster_visuals())
