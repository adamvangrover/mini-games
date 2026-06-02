import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_neon_pulse():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8088"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8088")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8088/index.html")

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

                const module = await import('./js/games/neonPulse.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/neon_pulse.png")
            print("PASS: Screenshot saved")

            # Click to trigger input
            page.evaluate("""() => {
                const canvas = window.gameInstance.canvas;
                const rect = canvas.getBoundingClientRect();
                const x = rect.left + canvas.width / 2;
                const y = rect.top + canvas.height / 2;
                const event = new MouseEvent('mousedown', { clientX: x, clientY: y });
                canvas.dispatchEvent(event);
            }""")
            time.sleep(1)

            message = page.evaluate("() => window.gameInstance.message")
            if message not in ["PERFECT!", "MISS!"]:
                print(f"FAIL: Message not updated after click: {message}")
                sys.exit(1)
            else:
                print(f"PASS: Handled input correctly ({message})")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_neon_pulse()
