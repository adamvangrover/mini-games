import asyncio
from playwright.async_api import async_playwright

async def verify_everything():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a larger viewport to ensure UI elements are visible
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        # Capture logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"ERROR: {err}"))

        print("Loading page...")
        await page.goto("http://localhost:8000")

        # --- Wait for App Initialization ---
        print("Waiting for miniGameHub...")
        try:
             await page.wait_for_function("typeof window.miniGameHub !== 'undefined'", timeout=10000)
             print("miniGameHub is ready.")
        except Exception as e:
             print(f"FATAL: miniGameHub failed to load: {e}")
             await browser.close()
             return

        # --- Handle App Loader ---
        print("Handling App Loader...")
        try:
            # Wait for loader to be present (it might be fast, so optional)
            loader = await page.query_selector("#app-loader")
            if loader:
                print("Loader found. Clicking to dismiss...")
                # Click the body to trigger the 'once' listener
                await page.click("body", force=True)
                # Wait for loader to disappear
                await page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
                print("Loader dismissed.")
            else:
                print("Loader not found (maybe already gone?)")
        except Exception as e:
            print(f"Loader handling warning: {e}")

        # Wait a bit for initialization
        await page.wait_for_timeout(2000)

        # Force Grid View
        print("Ensuring Grid View...")
        try:
             # Check if we are in 3D view (default)
             view_btn = await page.wait_for_selector("#view-toggle-btn", timeout=5000)
             if view_btn:
                 text = await page.inner_text("#view-toggle-text")
                 if "Grid" in text:
                     print("Switching to Grid View...")
                     await page.click("#view-toggle-btn", force=True)
                     # Wait for grid to appear
                     await page.wait_for_selector("#menu-grid", state="visible", timeout=2000)
                 else:
                     print("Already in Grid View (or button says 3D View).")
        except Exception as e:
            print(f"View toggle logic failed: {e}")

        # Shop Test
        print("Testing Store...")
        try:
            # Wait for the button to be interactive
            await page.wait_for_selector("#shop-btn-menu", state="visible")
            await page.click("#shop-btn-menu", force=True)
            await page.wait_for_selector("#store-overlay", state="visible")
            print("Store overlay opened.")

            # Close it
            await page.click("#store-close-btn", force=True)
            await page.wait_for_selector("#store-overlay", state="hidden")
            print("Store overlay closed.")
        except Exception as e:
            print(f"Store verification failed: {e}")

        # Game Loop
        games_to_test = [
            "neon-jump",
            "snake-game",
            "avatar-station",
            "trophy-room",
            "neon-city-game"
        ]

        for game in games_to_test:
            print(f"Testing {game}...")
            try:
                # Use evaluate to transition safely
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game}' }})")

                # Check for success
                # Trophy Room uses a different container ID logic in main.js
                target_id = "trophy-room-container" if game == "trophy-room" else game

                # Wait for container to be visible
                try:
                    await page.wait_for_selector(f"#{target_id}", state="visible", timeout=5000)
                    print(f"SUCCESS: {game} loaded and visible.")
                except:
                    print(f"FAILURE: {game} container not visible after timeout.")

                # Go back
                await page.evaluate("window.miniGameHub.goBack()")

                # Wait for menu to return
                await page.wait_for_timeout(1000) # Simple wait is often safer than waiting for transition end events

            except Exception as e:
                print(f"FAILED {game}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_everything())
