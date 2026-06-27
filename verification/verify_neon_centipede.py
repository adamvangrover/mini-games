import asyncio
from playwright.async_api import async_playwright
import time
import subprocess
import os
import signal

async def verify_game():
    # Start the local server
    server_process = subprocess.Popen(['python3', '-m', 'http.server', '8000'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2) # Give it a moment to start

    success = False

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Catch console errors
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            print("Navigating to hub...")
            await page.goto("http://localhost:8000")

            # Simulate click to start app
            await page.mouse.click(10, 10)
            await page.wait_for_timeout(1000)

            print("Launching Neon Centipede...")
            await page.evaluate("window.miniGameHub.transitionToState('IN_GAME', {gameId: 'neon-centipede'})")
            await page.wait_for_timeout(2000) # Let it render

            if len(errors) > 0:
                print("Errors found during launch:")
                for e in errors:
                    print(e)
            else:
                # Check if canvas exists inside the container
                canvas = await page.query_selector("#neon-centipede canvas")
                if canvas:
                    print("Game canvas successfully rendered. No console errors.")
                    success = True
                else:
                    print("Error: Game canvas not found.")

            await browser.close()
    finally:
        # Kill the server
        server_process.terminate()
        server_process.wait()

    return success

if __name__ == "__main__":
    result = asyncio.run(verify_game())
    if result:
        print("VERIFICATION_SUCCESS")
        exit(0)
    else:
        print("VERIFICATION_FAILED")
        exit(1)
