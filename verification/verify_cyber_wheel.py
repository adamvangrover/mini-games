import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_cyber_wheel():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8086"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8086")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8086/index.html")

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

                const module = await import('./js/games/cyberWheel.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/cyber_wheel.png")
            print("PASS: Screenshot saved to verification/cyber_wheel.png")

            page.click("button:has-text('SPIN WHEEL')")
            time.sleep(1)

            is_spinning = page.evaluate("() => window.gameInstance.isSpinning")
            if not is_spinning:
                print("FAIL: Wheel did not start spinning on click")
                sys.exit(1)
            else:
                print("PASS: Wheel spun")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_cyber_wheel()
