import asyncio
import sys
from playwright.async_api import async_playwright

async def verify_all_games():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True, args=['--use-gl=swiftshader']) # Force software GL
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Capture console logs and errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Loading application...")
        try:
            # Assumes server is running on port 8000
            await page.goto("http://localhost:8000", timeout=60000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            await browser.close()
            return

        # Wait for initialization (loader to disappear)
        try:
            await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)
        except:
            print("Warning: Loader did not disappear, continuing anyway...")

        # Get list of games from registry
        print("Fetching game registry...")
        try:
            game_ids = await page.evaluate("Object.keys(window.miniGameHub.gameRegistry)")
            print(f"Found {len(game_ids)} games: {game_ids}")
        except Exception as e:
            print(f"Failed to fetch game registry: {e}")
            await browser.close()
            return

        results = {"success": [], "failed": []}

        for game_id in game_ids:
            print(f"\n----------------------------------------")
            print(f"Testing Game: {game_id}")

            try:
                # 1. Transition to Game
                print(f"Launching {game_id}...")
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # 2. Wait for game container to be visible
                await page.wait_for_timeout(2000) # Give it time to init/render

                # Check for visibility of the game container
                is_visible = await page.evaluate(f"""
                    (function() {{
                        const el = document.getElementById('{game_id}') || document.querySelector('.game-container:not(.hidden)');
                        if (!el) return false;
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                    }})()
                """)

                # Double check specific ID if generic check found something else
                if not is_visible:
                     # Check if maybe it's the trophy room special case or something else
                     is_visible = await page.evaluate(f"!!document.getElementById('{game_id}') && !document.getElementById('{game_id}').classList.contains('hidden')")

                if is_visible:
                    print(f"SUCCESS: {game_id} container is visible.")
                    results["success"].append(game_id)
                else:
                    print(f"FAILURE: {game_id} container NOT visible.")
                    results["failed"].append(game_id)

                # 3. Exit Game
                print("Exiting game...")
                await page.evaluate("window.miniGameHub.goBack()")
                await page.wait_for_timeout(1000)

            except Exception as e:
                print(f"EXCEPTION testing {game_id}: {e}")
                results["failed"].append(game_id)
                # Try to recover to menu
                try:
                    await page.evaluate("window.miniGameHub.goBack()")
                except:
                    pass

        print("\n========================================")
        print(f"VERIFICATION COMPLETE")
        print(f"Passed: {len(results['success'])}")
        print(f"Failed: {len(results['failed'])}")
        print("Failed Games:")
        for g in results["failed"]:
            print(f" - {g}")
        print("========================================")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_all_games())
