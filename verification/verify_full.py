import asyncio
from playwright.async_api import async_playwright

async def verify_everything():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Capture logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"ERROR: {err}"))

        print("Loading page...")
        await page.goto("http://localhost:8000")

        await page.wait_for_timeout(3000)

        # Force Grid View
        print("Ensuring Grid View...")
        try:
             text = await page.inner_text("#view-toggle-text")
             if "Grid" in text:
                 print("Switching to Grid View...")
                 await page.click("#view-toggle-btn", force=True)
                 await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"View toggle logic failed: {e}")

        # Shop Test
        print("Testing Store...")
        try:
            await page.click("#shop-btn-menu", force=True)
            await page.wait_for_selector("#store-overlay")
            # Try to buy first item if affordable (usually free theme?)
            # Or just close
            await page.click("#store-close-btn", force=True)
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
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game}' }})")
                await page.wait_for_timeout(3000)

                # Check visibility with more detail
                visible = False
                if game == 'trophy-room':
                     display = await page.evaluate("document.getElementById('trophy-room-container') ? document.getElementById('trophy-room-container').style.display : 'NULL'")
                     classes = await page.evaluate("document.getElementById('trophy-room-container') ? document.getElementById('trophy-room-container').className : 'NULL'")
                     print(f"TrophyRoom Display: {display}, Classes: {classes}")
                     visible = (display != 'none' and display != 'NULL')
                else:
                    visible = await page.evaluate(f"!!document.getElementById('{game}') && !document.getElementById('{game}').classList.contains('hidden')")

                if visible:
                    print(f"SUCCESS: {game} loaded.")
                else:
                    print(f"FAILURE: {game} container not visible.")

                await page.evaluate("window.miniGameHub.goBack()")
                await page.wait_for_timeout(2000)

            except Exception as e:
                print(f"FAILED {game}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_everything())
