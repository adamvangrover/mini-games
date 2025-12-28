import asyncio
from playwright.async_api import async_playwright
import time

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("Loading app...")
        # Start a local server to serve the files
        server_process = await asyncio.create_subprocess_shell(
            "python3 -m http.server 8000",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            preexec_fn=None # Python 3.12+ usually handles this
        )

        try:
            # Wait for server to start
            await asyncio.sleep(2)

            await page.goto("http://localhost:8000")

            # Wait for loader to disappear
            await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)
            print("App loaded.")

            # Launch Tower Defense
            print("Launching Tower Defense...")
            # Use transitionToState as exposed in js/main.js
            await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'tower-defense-game' })")

            # Wait for canvas
            canvas = await page.wait_for_selector("#tower-defense-game canvas", timeout=10000)
            if not canvas:
                raise Exception("Game canvas not found")
            print("Game canvas found.")

            # Check HUD elements
            money_el = await page.wait_for_selector("#td-money", timeout=5000)
            initial_money = await money_el.inner_text()
            print(f"Initial money: {initial_money}")

            if int(initial_money) < 50:
                 raise Exception("Not enough money to test build")

            # Take start screenshot
            await page.screenshot(path="verification/tower_defense_start.png")
            print("Start screenshot taken.")

            # Select Basic Tower
            print("Selecting Basic Tower...")
            # The button has data-type="basic"
            await page.click("button[data-type='basic']")
            await asyncio.sleep(0.5)

            # Click on map to build (centerish)
            # TILE_SIZE is 64. Map is 12x10.
            # Click at 3,3 -> 192+32, 192+32
            print("Building tower at (3,3)...")
            bbox = await canvas.bounding_box()
            click_x = bbox['x'] + (3 * 64) + 32
            click_y = bbox['y'] + (3 * 64) + 32

            await page.mouse.click(click_x, click_y)
            await asyncio.sleep(0.5)

            # Check money decreased
            new_money = await page.eval_on_selector("#td-money", "el => el.innerText")
            print(f"Money after build: {new_money}")

            if int(new_money) >= int(initial_money):
                print("Warning: Money did not decrease. Build might have failed (e.g. invalid placement).")
            else:
                print("Tower built successfully (Money decreased).")

            # Click the tower to select it (show upgrade panel)
            print("Selecting built tower...")
            await page.mouse.click(click_x, click_y)
            await asyncio.sleep(0.5)

            # Check upgrade panel visibility
            panel = await page.wait_for_selector("#td-upgrade-panel", state="visible", timeout=2000)
            if panel:
                print("Upgrade panel visible.")
            else:
                print("Warning: Upgrade panel not visible.")

            # Take interaction screenshot
            await page.screenshot(path="verification/tower_defense_interact.png")
            print("End screenshot taken.")

        finally:
            try:
                server_process.terminate()
                await server_process.wait()
            except:
                pass
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
