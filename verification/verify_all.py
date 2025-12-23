
import asyncio
import os
import subprocess
import sys
import time
from playwright.async_api import async_playwright

def start_server():
    """Starts a local HTTP server."""
    # check if port 8000 is in use
    try:
        subprocess.check_output(["lsof", "-t", "-i", ":8000"])
        print("Port 8000 is in use. Killing process...")
        subprocess.call(["kill", "$(lsof -t -i :8000)"], shell=True)
        time.sleep(1)
    except subprocess.CalledProcessError:
        pass

    process = subprocess.Popen([sys.executable, "-m", "http.server", "8000"],
                               stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)
    time.sleep(2) # Wait for server to start
    return process

async def run_test():
    server_process = start_server()

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            page = await context.new_page()

            # Enable console logging
            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
            page.on("pageerror", lambda exc: print(f"ERROR: {exc}"))

            print("Loading Hub...")
            await page.goto("http://localhost:8000/index.html")
            await page.wait_for_load_state("networkidle")

            # 1. Verify Store
            print("Opening Store...")
            await page.click("#shop-btn-hud")
            await page.wait_for_selector("#store-overlay:not(.hidden)", timeout=2000)

            # Check for new items
            content = await page.content()
            if "Carbon Fiber" in content:
                print("SUCCESS: Found 'Carbon Fiber' in store.")
            else:
                print("FAILURE: 'Carbon Fiber' not found in store.")

            await page.click("#store-close-btn")
            await page.wait_for_selector("#store-overlay", state="hidden", timeout=2000)

            # 2. Verify Hall of Fame (via Menu Grid)
            print("Switching to Grid View...")
            # Force click the toggle if needed, sometimes 3D overlay blocks it?
            # Actually toggle is in #menu which is hidden in 3D view?
            # In 3D view, #menu is hidden, but #hub-hud is visible.
            # Wait, toggle is in #menu (which is hidden).
            # Oh, #view-toggle-btn is inside #menu (which is hidden).
            # So user must click on Hub HUD -> No, Hub HUD only has Shop and Settings.
            # How does one switch to Grid View?
            # "Hub HUD (Floating Buttons over 3D)"
            # It seems the "Grid View" button is ONLY in the #menu div, which is hidden when in 3D view.
            # But wait, index.html says:
            # <div id="menu" ... hidden> ... <button id="view-toggle-btn">...
            # If #menu is hidden, we can't click it.
            # However, ArcadeHub.js has logic: "CLICK A CABINET TO PLAY".
            # The prompt says: "The main Hub UI includes a toggle (#view-toggle-btn) to switch between the 3D Arcade view and a 2D Grid view."
            # BUT if #menu is hidden, how do we access it?
            # Ah, looking at `main.js`:
            # `if (is3DView) { document.getElementById("menu").classList.remove("hidden"); ... menuGrid.classList.add('hidden'); }`
            # So #menu IS visible, but the GRID inside it is hidden. The header and buttons ARE visible.
            # Let's verify this in index.html structure.
            # <div id="menu"> <header>... <div id="hub-stats">... buttons ...</div> <div id="menu-grid">...</div> </div>
            # Correct. The buttons are in #hub-stats which is inside #menu.

            await page.click("#view-toggle-btn")
            await page.wait_for_timeout(1000) # Wait for transition

            # Now verify Hall of Fame card exists
            print("Checking for Hall of Fame card...")
            # We need to find the card. The text should be "Hall of Fame".
            hf_card = page.locator("h3", has_text="Hall of Fame")
            if await hf_card.count() > 0:
                print("SUCCESS: Hall of Fame card found.")
                await hf_card.click()
                await page.wait_for_timeout(2000)
                await page.screenshot(path="verification/verify_hof_loaded.png")

                # Check for "HIGH_SCORE_DATABASE"
                content = await page.content()
                if "HIGH_SCORE_DATABASE" in content:
                    print("SUCCESS: Hall of Fame loaded UI.")
                else:
                    print("FAILURE: Hall of Fame UI missing.")

                # Exit HOF
                # HOF has a back button or exit button?
                # In HallOfFame.js (from my memory/trace) it has "EXIT SYSTEM".
                await page.evaluate("window.miniGameHub.goBack()")
                await page.wait_for_timeout(1000)
            else:
                print("FAILURE: Hall of Fame card not found.")

            # 3. Verify Trophy Room (via Teleport or Button)
            print("Testing Trophy Room Transition...")
            # We are in Grid View now.
            # Click Trophy Button in Menu
            await page.click("#trophy-btn-menu")
            await page.wait_for_timeout(3000) # Wait for 3D load

            # Check if TrophyRoom canvas is active?
            # TrophyRoom creates a new canvas or attaches to #trophy-room-container
            tr_container = await page.query_selector("#trophy-room-container")
            if tr_container:
                visible = await tr_container.is_visible()
                if visible:
                    print("SUCCESS: Trophy Room container is visible.")
                    await page.screenshot(path="verification/verify_trophy_room.png")
                else:
                    print("FAILURE: Trophy Room container found but not visible.")
            else:
                print("FAILURE: Trophy Room container not found.")

            # Exit Trophy Room
            # Trophy Room should have an exit mechanism (Exit Area or similar)
            # Or we can just go back via console for this test
            await page.evaluate("window.miniGameHub.goBack()")
            await page.wait_for_timeout(1000)

            print("All verifications complete.")

            await browser.close()
    finally:
        server_process.kill()

if __name__ == "__main__":
    asyncio.run(run_test())
