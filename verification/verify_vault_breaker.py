import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_vault_breaker():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8092"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8092")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating...")
            page.goto("http://localhost:8092/index.html")

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

                const module = await import('./js/games/vaultBreaker.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/vault_breaker.png")
            print("PASS: Screenshot saved")

            # Click a keypad button (e.g. '1' at top left)
            page.evaluate("""() => {
                const layout = window.gameInstance.getKeypadLayout();
                const btn1 = layout[0];
                const canvas = window.gameInstance.canvas;
                const rect = canvas.getBoundingClientRect();

                const event = new MouseEvent('click', {
                    clientX: btn1.x + btn1.w/2 + rect.left,
                    clientY: btn1.y + btn1.h/2 + rect.top
                });
                canvas.dispatchEvent(event);
            }""")
            time.sleep(1)

            guess_len = page.evaluate("() => window.gameInstance.currentGuess.length")
            if guess_len == 0:
                print("FAIL: Keypad click did not register.")
                sys.exit(1)
            else:
                print("PASS: Keypad click registered.")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_vault_breaker()
