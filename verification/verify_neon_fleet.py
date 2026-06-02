import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_neon_fleet():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8090"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8090")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating...")
            page.goto("http://localhost:8090/index.html")

            try:
                page.click("body", timeout=2000)
            except:
                pass

            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/neonFleet.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/neon_fleet.png")
            print("PASS: Screenshot saved")

            # Click a grid cell
            page.evaluate("""() => {
                const canvas = window.gameInstance.canvas;
                const rect = canvas.getBoundingClientRect();
                const w = canvas.width;
                const h = canvas.height;
                const boardSize = Math.min(w, h) * 0.8;
                const cellSize = boardSize / 10;
                const offsetX = (w - boardSize) / 2;
                const offsetY = (h - boardSize) / 2;

                const event = new MouseEvent('click', {
                    clientX: offsetX + cellSize/2 + rect.left,
                    clientY: offsetY + cellSize/2 + rect.top
                });
                canvas.dispatchEvent(event);
            }""")
            time.sleep(1)

            cell = page.evaluate("() => window.gameInstance.grid[0][0]")
            if cell not in [2, 3]: # miss or hit
                print(f"FAIL: Grid cell not updated. Value: {cell}")
                sys.exit(1)
            else:
                print("PASS: Grid interacted correctly")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_neon_fleet()
