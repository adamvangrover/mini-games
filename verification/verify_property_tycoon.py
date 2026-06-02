import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_property_tycoon():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8085"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8085")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8085/index.html")

            # Dismiss Loader
            try:
                page.click("body", timeout=2000)
            except:
                pass

            # Inject Game directly
            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/propertyTycoon.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)

            # Take screenshot
            page.screenshot(path="verification/property_tycoon.png")
            print("PASS: Screenshot saved to verification/property_tycoon.png")

            # Press space to roll
            page.keyboard.press("Space")
            time.sleep(2)

            # Check if player position changed
            pos = page.evaluate("() => window.gameInstance.playerPos")
            print(f"Player Position after roll: {pos}")
            if pos == 0:
                print("FAIL: Player position did not change after rolling.")
                sys.exit(1)

            page.screenshot(path="verification/property_tycoon_rolled.png")
            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_property_tycoon()
