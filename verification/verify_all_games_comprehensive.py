
import asyncio
from playwright.async_api import async_playwright

async def verify_games():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Load the main page served by python server
        try:
            await page.goto("http://localhost:8000/index.html")
            # Wait for loader to disappear
            await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

            # The default view is 3D, so #menu-grid is hidden.
            # We can force grid view to make it visible
            await page.evaluate("document.getElementById('view-toggle-btn').click()")
            await page.wait_for_selector("#menu-grid", state="visible", timeout=5000)
            print("Main menu loaded successfully in Grid View.")

        except Exception as e:
            print(f"Failed to load main menu: {e}")
            await browser.close()
            return

        # Get all games from registry
        # We can extract the keys from the page context
        game_ids = await page.evaluate("Object.keys(window.miniGameHub.gameRegistry)")
        print(f"Found {len(game_ids)} games: {game_ids}")

        results = {}

        for game_id in game_ids:
            print(f"Testing {game_id}...")
            try:
                # Transition to game
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for container to be visible
                await page.wait_for_selector(f"#{game_id}", state="visible", timeout=10000)

                # Check for canvas or generic error text
                # Some games might take a moment to init
                await asyncio.sleep(1)

                # Verify no error text if it uses PlaceholderGame for errors
                content = await page.evaluate(f"document.getElementById('{game_id}').innerText")
                if "Failed to load" in content or "ERROR" in content:
                    print(f"❌ {game_id} failed to load.")
                    results[game_id] = False
                else:
                    print(f"✅ {game_id} loaded.")
                    results[game_id] = True

                # Go back to menu
                await page.evaluate("window.miniGameHub.goBack()")
                # Wait for menu grid again
                await page.wait_for_selector("#menu-grid", state="visible", timeout=5000)

            except Exception as e:
                print(f"❌ {game_id} crashed or timed out: {e}")
                results[game_id] = False
                # Try to recover to menu
                try:
                    await page.evaluate("window.miniGameHub.transitionToState('MENU')")
                    # Force grid view again if needed
                    await page.evaluate("if(document.getElementById('menu-grid').classList.contains('hidden')) document.getElementById('view-toggle-btn').click()")
                except:
                    await page.reload()
                    await page.wait_for_selector("#app-loader", state="hidden")
                    await page.evaluate("document.getElementById('view-toggle-btn').click()")

        print("\n--- Results ---")
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        print(f"Passed: {passed}/{total}")

        for gid, status in results.items():
            if not status:
                print(f"Failed: {gid}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_games())
