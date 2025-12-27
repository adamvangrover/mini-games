import asyncio
import os
from playwright.async_api import async_playwright

async def verify_games():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        page = await context.new_page()

        # Capture console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

        print("Navigating to Hub...")
        await page.goto("http://localhost:8000/index.html")

        # Wait for initialization
        try:
            await page.wait_for_selector("#menu-grid", state="attached", timeout=10000)
        except:
            print("Timeout waiting for menu grid. Checking logs...")
            for log in console_logs:
                print(log)
            return

        # Get list of games
        games = await page.evaluate("Object.keys(window.miniGameHub.gameRegistry || {})")
        print(f"Found {len(games)} games: {games}")

        results = {}

        for game_id in games:
            print(f"Testing {game_id}...")
            console_logs.clear() # Clear logs for this game run

            try:
                # Transition to game
                await page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for game to init
                await asyncio.sleep(2)

                # Check if game container is visible
                is_visible = await page.evaluate(f"document.getElementById('{game_id}') && !document.getElementById('{game_id}').classList.contains('hidden')")

                # Check for current game instance
                has_instance = await page.evaluate("!!window.miniGameHub.getCurrentGame()")

                # Screenshot
                os.makedirs("verification/screenshots", exist_ok=True)
                await page.screenshot(path=f"verification/screenshots/{game_id}.png")

                # Log errors
                errors = [log for log in console_logs if "[error]" in log.lower() or "[warning]" in log.lower()]

                status = "PASS"
                if not is_visible:
                    status = "FAIL (Not Visible)"
                elif not has_instance:
                    status = "FAIL (No Instance)"
                elif errors:
                     # Filter out benign warnings if any
                    real_errors = [e for e in errors if "AudioContext" not in e and "WebGL" not in e]
                    if real_errors:
                        status = f"WARN (Console Errors: {len(real_errors)})"

                results[game_id] = status
                print(f"  Result: {status}")
                if status != "PASS":
                     for e in errors:
                         print(f"    {e}")

                # Go back
                await page.evaluate("window.miniGameHub.goBack()")
                await asyncio.sleep(1)

            except Exception as e:
                print(f"  CRASH: {e}")
                results[game_id] = f"CRASH: {str(e)}"
                await page.evaluate("window.miniGameHub.goBack()") # Try to recover
                await asyncio.sleep(1)

        print("\n--- SUMMARY ---")
        for gid, res in results.items():
            print(f"{gid}: {res}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_games())
